package sn.immosenegal.agence;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service
@Transactional
public class CandidatureAgenceService {
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

    public CandidatureResume postuler(UUID agenceId, FonctionAgence fonction, AuthenticatedUser acteur) {
        // Les candidats peuvent demander l'une des fonctions opérationnelles.
        // Seul le rôle RESPONSABLE est attribué directement par la direction de l'agence.
        if (fonction == null || fonction == FonctionAgence.RESPONSABLE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Choisissez Agent, Gestionnaire, Caissier ou Assistant administratif.");
        }
        Agence agence = agenceActive(agenceId);
        User utilisateur = utilisateurs.findById(acteur.id())
            .filter(User::isActif)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Compte utilisateur inactif."));
        if (membres.existsByAgenceIdAndUtilisateurId(agenceId, acteur.id())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Vous êtes déjà membre de cette agence ou une invitation est déjà en attente.");
        }
        if (candidatures.existsByAgenceIdAndUtilisateurIdAndStatut(
                agenceId, acteur.id(), StatutCandidatureAgence.EN_ATTENTE)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Une candidature est déjà en attente.");
        }
        CandidatureAgence candidature = candidatures.save(new CandidatureAgence(agence, utilisateur, fonction));
        return resume(candidature);
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
        agenceActive(agenceId);
        if ("ADMIN".equals(acteur.role().name())) return;
        boolean responsable = membres.findByAgenceIdAndUtilisateurId(agenceId, acteur.id())
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE)
            .isPresent();
        if (!responsable) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Seul le responsable de cette agence ou un administrateur peut traiter les candidatures.");
        }
    }

    private Agence agenceActive(UUID agenceId) {
        return agences.findById(agenceId).filter(a -> a.getStatut() == StatutAgence.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence introuvable ou inactive."));
    }

    private CandidatureResume resume(CandidatureAgence c) {
        return new CandidatureResume(c.getId(), c.getAgence().getId(), c.getAgence().getNom(),
            c.getUtilisateur().getId(), c.getUtilisateur().getNomComplet(), c.getUtilisateur().getEmail(),
            c.getFonction().name(), c.getStatut().name(), c.getCreeLe(), c.getTraiteeLe());
    }

    public record CandidatureResume(UUID id, UUID agenceId, String agenceNom, UUID utilisateurId,
            String nom, String email, String fonction, String statut,
            java.time.Instant creeLe, java.time.Instant traiteeLe) {}
}
