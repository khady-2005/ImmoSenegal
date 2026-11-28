package sn.immosenegal.agence;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service
@Transactional
public class CandidatureAgenceService {
    private static final int CV_MAX_OCTETS = 5 * 1024 * 1024;

    private final AgenceRepository agences;
    private final MembreAgenceRepository membres;
    private final CandidatureAgenceRepository candidatures;
    private final UserRepository utilisateurs;

    public CandidatureAgenceService(AgenceRepository agences, MembreAgenceRepository membres,
            CandidatureAgenceRepository candidatures, UserRepository utilisateurs) {
        this.agences = agences;
        this.membres = membres;
        this.candidatures = candidatures;
        this.utilisateurs = utilisateurs;
    }

    public CandidatureResume postuler(UUID agenceId, FonctionAgence fonction, String telephone, String zone,
            String motivation, MultipartFile cv, AuthenticatedUser acteur) {
        if (fonction == null || fonction == FonctionAgence.RESPONSABLE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Choisissez Agent, Gestionnaire, Caissier ou Assistant administratif.");
        }
        String telPropre = nettoyerChamp(telephone, "Le téléphone est obligatoire.", 30);
        String zonePropre = nettoyerChamp(zone, "La zone d'intervention est obligatoire.", 120);
        String motivationPropre = nettoyerChamp(motivation, "La motivation est obligatoire.", 2000);
        if (cv == null || cv.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le CV est obligatoire (PDF, JPG, PNG ou WebP).");
        }
        if (cv.getSize() > CV_MAX_OCTETS) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Le CV dépasse 5 Mo.");
        }
        byte[] cvContenu;
        try {
            cvContenu = cv.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CV illisible.");
        }
        String cvMime = reconnaitreTypeCv(cvContenu);
        if (cvMime == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format de CV refusé (PDF, JPG, PNG ou WebP uniquement).");
        }
        String cvNom = cv.getOriginalFilename() == null || cv.getOriginalFilename().isBlank()
            ? "cv" : cv.getOriginalFilename().trim();
        if (cvNom.length() > 250) cvNom = cvNom.substring(0, 250);

        Agence agence = agenceActive(agenceId);
        User utilisateur = utilisateurs.findById(acteur.id())
            .filter(User::isActif)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Compte utilisateur inactif."));
        if (membres.existsByAgenceIdAndUtilisateurId(agenceId, acteur.id())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Vous êtes déjà membre de cette agence ou une invitation est déjà en attente.");
        }
        if (candidatures.existsByUtilisateurIdAndStatut(acteur.id(), StatutCandidatureAgence.EN_ATTENTE)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Une candidature est déjà en attente de décision.");
        }
        CandidatureAgence candidature = candidatures.save(new CandidatureAgence(
            agence, utilisateur, fonction, telPropre, zonePropre, motivationPropre, cvNom, cvMime, cvContenu));
        return resume(candidature);
    }

    @Transactional(readOnly = true)
    public CandidatureAgence telechargerCv(UUID agenceId, UUID candidatureId, AuthenticatedUser acteur) {
        CandidatureAgence candidature = candidatures.findById(candidatureId)
            .filter(c -> c.getAgence().getId().equals(agenceId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Candidature introuvable."));
        boolean demandeur = candidature.getUtilisateur().getId().equals(acteur.id());
        if (!demandeur) {
            verifierResponsable(agenceId, acteur);
        }
        if (candidature.getCvContenu() == null || candidature.getCvContenu().length == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Aucun CV joint à cette candidature.");
        }
        return candidature;
    }

    @Transactional(readOnly = true)
    public List<CandidatureResume> mesCandidatures(AuthenticatedUser acteur) {
        return candidatures.findAllByUtilisateurIdOrderByCreeLeDesc(acteur.id())
            .stream().map(this::resume).toList();
    }

    @Transactional(readOnly = true)
    public List<CandidatureResume> candidaturesAgence(UUID agenceId, AuthenticatedUser acteur) {
        verifierResponsable(agenceId, acteur);
        return candidatures.findAllByAgenceIdAndStatutOrderByCreeLeDesc(
            agenceId, StatutCandidatureAgence.EN_ATTENTE).stream().map(this::resume).toList();
    }

    public CandidatureResume decider(UUID agenceId, UUID candidatureId, boolean accepter,
            AuthenticatedUser acteur) {
        verifierResponsable(agenceId, acteur);
        CandidatureAgence candidature = candidatures.findById(candidatureId)
            .filter(c -> c.getAgence().getId().equals(agenceId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Candidature introuvable."));
        if (candidature.getStatut() != StatutCandidatureAgence.EN_ATTENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette candidature a déjà été traitée.");
        }
        if (accepter) {
            User utilisateur = candidature.getUtilisateur();
            if (!utilisateur.isActif()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Le compte du candidat est désactivé.");
            }
            if (membres.existsByAgenceIdAndUtilisateurId(agenceId, utilisateur.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ce candidat est déjà membre ou possède une invitation dans cette agence.");
            }
            MembreAgence membre = new MembreAgence(candidature.getAgence(), utilisateur, candidature.getFonction());
            membre.setStatut(StatutMembreAgence.ACTIF);
            membres.save(membre);
            // Le rôle global évolue après acceptation, sans écraser un rôle déjà acquis.
            if (utilisateur.getRole() == sn.immosenegal.user.Role.CLIENT) {
                utilisateur.setRole(sn.immosenegal.user.Role.valueOf(candidature.getFonction().name()));
            }
            candidature.traiter(StatutCandidatureAgence.ACCEPTEE);
        } else {
            candidature.traiter(StatutCandidatureAgence.REFUSEE);
        }
        return resume(candidature);
    }

    private void verifierResponsable(UUID agenceId, AuthenticatedUser acteur) {
        Agence agence = agenceActive(agenceId);
        if ("ADMIN".equals(acteur.role().name()) && agence.getType() == AgenceType.INTERNE) return;
        boolean responsable = membres.findByAgenceIdAndUtilisateurId(agenceId, acteur.id())
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE)
            .isPresent();
        if (!responsable) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Seul le responsable de cette agence peut consulter ou traiter les candidatures.");
        }
    }

    private Agence agenceActive(UUID agenceId) {
        return agences.findById(agenceId).filter(a -> a.getStatut() == StatutAgence.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence introuvable ou inactive."));
    }

    private CandidatureResume resume(CandidatureAgence c) {
        boolean aCv = c.getCvContenu() != null && c.getCvContenu().length > 0;
        return new CandidatureResume(c.getId(), c.getAgence().getId(), c.getAgence().getNom(),
            c.getUtilisateur().getId(), c.getUtilisateur().getNomComplet(), c.getUtilisateur().getEmail(),
            c.getFonction().name(), c.getStatut().name(), c.getTelephone(), c.getZone(), c.getMotivation(),
            c.getCvNom(), aCv, c.getCreeLe(), c.getTraiteeLe());
    }

    private static String nettoyerChamp(String valeur, String erreur, int max) {
        if (valeur == null || valeur.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, erreur);
        }
        String propre = valeur.trim();
        return propre.length() > max ? propre.substring(0, max) : propre;
    }

    private static String reconnaitreTypeCv(byte[] c) {
        if (c.length >= 4 && c[0] == '%' && c[1] == 'P' && c[2] == 'D' && c[3] == 'F') return "application/pdf";
        if (c.length >= 3 && (c[0] & 0xFF) == 0xFF && (c[1] & 0xFF) == 0xD8 && (c[2] & 0xFF) == 0xFF) return "image/jpeg";
        if (c.length >= 8 && (c[0] & 0xFF) == 0x89 && c[1] == 'P' && c[2] == 'N' && c[3] == 'G') return "image/png";
        if (c.length >= 12 && c[0] == 'R' && c[1] == 'I' && c[2] == 'F' && c[3] == 'F'
            && c[8] == 'W' && c[9] == 'E' && c[10] == 'B' && c[11] == 'P') return "image/webp";
        return null;
    }

    public record CandidatureResume(UUID id, UUID agenceId, String agenceNom, UUID utilisateurId,
            String nom, String email, String fonction, String statut,
            String telephone, String zone, String motivation, String cvNom, boolean aCv,
            java.time.Instant creeLe, java.time.Instant traiteeLe) {}
}
