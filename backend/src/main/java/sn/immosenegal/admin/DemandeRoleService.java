package sn.immosenegal.admin;

import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import sn.immosenegal.agence.AgenceType;
import sn.immosenegal.agence.FonctionAgence;
import sn.immosenegal.agence.MembreAgenceRepository;
import sn.immosenegal.agence.StatutAgence;
import sn.immosenegal.agence.StatutMembreAgence;
import sn.immosenegal.audit.AuditService;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service
public class DemandeRoleService {

    /** Seuls ces rôles peuvent être demandés. ADMIN n'est JAMAIS demandable : il se crée uniquement par le serveur. */
    private static final Set<Role> ROLES_DEMANDABLES = Set.of(Role.PROPRIETAIRE, Role.AGENT);
    private static final int JUSTIFICATIF_MAX_OCTETS = 5 * 1024 * 1024;

    private final DemandeRoleRepository demandes;
    private final UserRepository users;
    private final AuditService audit;
    private final MembreAgenceRepository membres;
    private final NotificationService notifications;

    @Autowired
    public DemandeRoleService(DemandeRoleRepository demandes, UserRepository users, AuditService audit,
                              MembreAgenceRepository membres, NotificationService notifications) {
        this.demandes = demandes;
        this.users = users;
        this.audit = audit;
        this.membres = membres;
        this.notifications = notifications;
    }

    public DemandeRoleService(DemandeRoleRepository demandes, UserRepository users, AuditService audit) {
        this(demandes, users, audit, null, null);
    }

    @Transactional
    public DemandeRoleResponse demander(UUID userId, Role roleDemande) {
        return demander(userId, roleDemande, null);
    }

    @Transactional
    public DemandeRoleResponse demander(UUID userId, Role roleDemande, MultipartFile justificatif) {
        if (!ROLES_DEMANDABLES.contains(roleDemande)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ce rôle ne peut pas être demandé.");
        }
        User utilisateur = users.findById(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        if (utilisateur.getRole() != Role.CLIENT) {
            throw new ApiException(HttpStatus.CONFLICT, "Votre compte a déjà un rôle supplémentaire.");
        }
        if (demandes.existsByUserIdAndStatut(userId, StatutDemande.EN_ATTENTE)) {
            throw new ApiException(HttpStatus.CONFLICT, "Une demande est déjà en attente de validation.");
        }
        if (roleDemande == Role.PROPRIETAIRE && (justificatif == null || justificatif.isEmpty())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Un justificatif (PDF, JPG, PNG ou WebP) est obligatoire pour devenir propriétaire.");
        }

        DemandeRole demande = new DemandeRole(utilisateur, roleDemande);
        if (justificatif != null && !justificatif.isEmpty()) {
            if (justificatif.getSize() > JUSTIFICATIF_MAX_OCTETS) {
                throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "Le justificatif dépasse 5 Mo.");
            }
            byte[] octets;
            try {
                octets = justificatif.getBytes();
            } catch (IOException e) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Justificatif illisible.");
            }
            String typeMime = reconnaitreTypeJustificatif(octets);
            if (typeMime == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Format refusé : seuls les PDF, JPG, PNG et WebP sont acceptés.");
            }
            String nom = justificatif.getOriginalFilename() == null || justificatif.getOriginalFilename().isBlank()
                ? "justificatif" : justificatif.getOriginalFilename().trim();
            if (nom.length() > 255) {
                nom = nom.substring(0, 255);
            }
            demande.definirJustificatif(nom, typeMime, octets);
        }

        demande = demandes.save(demande);
        audit.enregistrer("DEMANDE_ROLE", userId, "Rôle demandé : " + roleDemande);
        return DemandeRoleResponse.de(demande);
    }

    @Transactional(readOnly = true)
    public DemandeRoleResponse maDemande(UUID userId) {
        return demandes.findFirstByUserIdOrderByCreeLeDesc(userId)
            .map(DemandeRoleResponse::de)
            .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<DemandeRoleResponse> lister(StatutDemande statut) {
        List<DemandeRole> liste = statut == null ? demandes.findAllByOrderByCreeLeDesc()
            : demandes.findByStatutOrderByCreeLeAsc(statut);
        return liste.stream().map(DemandeRoleResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public List<DemandeRoleResponse> listerPourDecision(StatutDemande statut, AuthenticatedUser acteur) {
        verifierDroitDecision(acteur);
        return lister(statut);
    }

    @Transactional
    public DemandeRoleResponse approuver(UUID demandeId, UUID decideurId) {
        return approuver(demandeId, decideurId, null);
    }

    @Transactional
    public DemandeRoleResponse approuver(UUID demandeId, AuthenticatedUser decideur, String motif) {
        verifierDroitDecision(decideur);
        return approuver(demandeId, decideur.id(), motif);
    }

    private DemandeRoleResponse approuver(UUID demandeId, UUID decideurId, String motif) {
        DemandeRole demande = demandeEnAttente(demandeId);
        String decideurNom = users.findById(decideurId).map(User::getNomComplet).orElse(null);
        demande.getUser().setRole(demande.getRoleDemande());
        demande.decider(StatutDemande.APPROUVEE, decideurId, decideurNom, nettoyerMotif(motif));
        audit.enregistrer("ROLE_APPROUVE", decideurId,
            "Utilisateur " + demande.getUser().getId() + " devient " + demande.getRoleDemande());
        if (notifications != null) {
            notifications.creer(demande.getUser(), "DEMANDE_ROLE_APPROUVEE",
                "Votre demande est approuvée",
                "Vous disposez désormais du statut " + demande.getRoleDemande().name() + ". Rechargez votre espace pour y accéder.",
                "/tableau-de-bord");
        }
        return DemandeRoleResponse.de(demande);
    }

    @Transactional
    public DemandeRoleResponse refuser(UUID demandeId, UUID decideurId) {
        return refuser(demandeId, decideurId, null);
    }

    @Transactional
    public DemandeRoleResponse refuser(UUID demandeId, AuthenticatedUser decideur, String motif) {
        verifierDroitDecision(decideur);
        return refuser(demandeId, decideur.id(), motif);
    }

    private DemandeRoleResponse refuser(UUID demandeId, UUID decideurId, String motif) {
        DemandeRole demande = demandeEnAttente(demandeId);
        String decideurNom = users.findById(decideurId).map(User::getNomComplet).orElse(null);
        String motifPropre = nettoyerMotif(motif);
        demande.decider(StatutDemande.REFUSEE, decideurId, decideurNom, motifPropre);
        audit.enregistrer("ROLE_REFUSE", decideurId, "Demande " + demande.getId() + " refusée");
        if (notifications != null) {
            notifications.creer(demande.getUser(), "DEMANDE_ROLE_REFUSEE",
                "Votre demande a été refusée",
                "Votre demande pour devenir " + demande.getRoleDemande().name() + " a été refusée"
                    + (motifPropre != null ? " : " + motifPropre : "."),
                "/tableau-de-bord");
        }
        return DemandeRoleResponse.de(demande);
    }

    public record JustificatifFichier(String nom, String typeMime, byte[] contenu) {}

    @Transactional(readOnly = true)
    public JustificatifFichier lireJustificatif(UUID demandeId, AuthenticatedUser acteur) {
        if (acteur == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Connexion requise.");
        }
        DemandeRole demande = demandes.findById(demandeId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Demande introuvable."));
        boolean demandeur = demande.getUser().getId().equals(acteur.id());
        if (!demandeur && acteur.role() != Role.ADMIN && !estResponsableImmoSenegal(acteur.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                "Seul le demandeur, l'administrateur ou le responsable d'ImmoSénégal peut consulter ce justificatif.");
        }
        if (demande.getJustificatifContenu() == null || demande.getJustificatifContenu().length == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Aucun justificatif joint à cette demande.");
        }
        return new JustificatifFichier(demande.getJustificatifNom(), demande.getJustificatifTypeMime(),
            demande.getJustificatifContenu());
    }

    public boolean estResponsableImmoSenegal(UUID userId) {
        if (membres == null || userId == null) {
            return false;
        }
        return membres.findAllByUtilisateurId(userId).stream()
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE)
            .anyMatch(m -> m.getAgence().getType() == AgenceType.INTERNE
                && m.getAgence().getStatut() == StatutAgence.ACTIVE);
    }

    private void verifierDroitDecision(AuthenticatedUser acteur) {
        if (acteur == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Connexion requise.");
        }
        if (acteur.role() != Role.ADMIN && !estResponsableImmoSenegal(acteur.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                "Seul l'administrateur ou le responsable de l'agence ImmoSénégal peut traiter cette demande.");
        }
    }

    private DemandeRole demandeEnAttente(UUID id) {
        DemandeRole demande = demandes.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Demande introuvable."));
        if (demande.getStatut() != StatutDemande.EN_ATTENTE) {
            throw new ApiException(HttpStatus.CONFLICT, "Cette demande a déjà été traitée.");
        }
        return demande;
    }

    private static String nettoyerMotif(String motif) {
        if (motif == null || motif.isBlank()) return null;
        String propre = motif.trim();
        return propre.length() > 500 ? propre.substring(0, 500) : propre;
    }

    private static String reconnaitreTypeJustificatif(byte[] c) {
        if (c.length >= 4 && c[0] == '%' && c[1] == 'P' && c[2] == 'D' && c[3] == 'F') {
            return "application/pdf";
        }
        if (c.length >= 3 && (c[0] & 0xFF) == 0xFF && (c[1] & 0xFF) == 0xD8 && (c[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (c.length >= 8 && (c[0] & 0xFF) == 0x89 && c[1] == 'P' && c[2] == 'N' && c[3] == 'G'
            && c[4] == 0x0D && c[5] == 0x0A && c[6] == 0x1A && c[7] == 0x0A) {
            return "image/png";
        }
        if (c.length >= 12 && c[0] == 'R' && c[1] == 'I' && c[2] == 'F' && c[3] == 'F'
            && c[8] == 'W' && c[9] == 'E' && c[10] == 'B' && c[11] == 'P') {
            return "image/webp";
        }
        return null;
    }
}
