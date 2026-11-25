package sn.immosenegal.agence;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service
@Transactional
public class AgenceEspaceService {

    private final AgenceRepository agences;
    private final MembreAgenceRepository membres;
    private final UserRepository utilisateurs;
    private final NotificationService notifications;

    public AgenceEspaceService(AgenceRepository agences, MembreAgenceRepository membres,
                               UserRepository utilisateurs, NotificationService notifications) {
        this.agences = agences;
        this.membres = membres;
        this.utilisateurs = utilisateurs;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<AgencePubliqueResume> annuaire() {
        return agences.findAllByStatutOrderByNomAsc(StatutAgence.ACTIVE).stream()
            .map(a -> new AgencePubliqueResume(a.getId(), a.getNom(), a.getSlug(),
                a.getDescription(), a.getAdresse(), a.getLogoUrl()))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<AgenceResume> mesAgences(AuthenticatedUser acteur) {
        return membres.findAllByUtilisateurId(acteur.id()).stream()
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .map(m -> new AgenceResume(m.getAgence().getId(), m.getAgence().getNom(),
                m.getAgence().getSlug(), m.getFonction().name()))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<InvitationResume> mesInvitations(AuthenticatedUser acteur) {
        return membres.findAllByUtilisateurId(acteur.id()).stream()
            .filter(m -> m.getStatut() == StatutMembreAgence.INVITATION_EN_ATTENTE)
            .map(m -> new InvitationResume(m.getId(), m.getAgence().getId(),
                m.getAgence().getNom(), m.getFonction().name(), m.getCreeLe()))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<MembreResume> listerMembres(UUID agenceId, AuthenticatedUser acteur) {
        verifierAccesGestion(agenceId, acteur);
        return membres.findAllByAgenceId(agenceId).stream()
            .filter(m -> m.getStatut() != StatutMembreAgence.INVITATION_EN_ATTENTE)
            .map(this::versResume)
            .toList();
    }

    public InvitationResume inviter(UUID agenceId, String email, FonctionAgence fonction,
                                    AuthenticatedUser acteur) {
        verifierAccesGestion(agenceId, acteur);
        if (fonction == FonctionAgence.RESPONSABLE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Le rôle RESPONSABLE ne peut être attribué que par un administrateur.");
        }

        Agence agence = trouverAgenceActive(agenceId);
        String emailNormalise = email == null ? "" : email.trim().toLowerCase();
        User utilisateur = utilisateurs.findByEmail(emailNormalise)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Aucun compte n'est associé à cette adresse e-mail. La personne doit d'abord créer son compte."));
        if (!utilisateur.isActif()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce compte utilisateur est désactivé.");
        }
        if (membres.existsByAgenceIdAndUtilisateurId(agenceId, utilisateur.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Cette personne est déjà membre ou possède une invitation pour cette agence.");
        }

        MembreAgence membre = membres.save(new MembreAgence(agence, utilisateur, fonction));
        notifications.creer(utilisateur, "INVITATION_AGENCE", "Invitation à rejoindre une agence",
            "L’agence " + agence.getNom() + " vous invite à rejoindre son équipe comme "
                + (fonction == FonctionAgence.AGENT ? "agent immobilier" : "gestionnaire immobilier") + ".",
            "/mes-agences");
        return new InvitationResume(membre.getId(), agence.getId(), agence.getNom(),
            fonction.name(), membre.getCreeLe());
    }

    public void accepterInvitation(UUID agenceId, UUID invitationId, AuthenticatedUser acteur) {
        MembreAgence membre = membres.findById(invitationId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation introuvable."));
        if (!membre.getAgence().getId().equals(agenceId)
                || !membre.getUtilisateur().getId().equals(acteur.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette invitation ne vous est pas destinée.");
        }
        if (membre.getStatut() != StatutMembreAgence.INVITATION_EN_ATTENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette invitation n'est plus en attente.");
        }
        Agence agence = trouverAgenceActive(agenceId);
        membre.setStatut(StatutMembreAgence.ACTIF);
        if (membre.getUtilisateur().getRole() == sn.immosenegal.user.Role.CLIENT) {
            membre.getUtilisateur().setRole(sn.immosenegal.user.Role.valueOf(membre.getFonction().name()));
        }
        membres.findAllByAgenceIdAndStatut(agenceId, StatutMembreAgence.ACTIF).stream()
            .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE)
            .forEach(responsable -> notifications.creer(responsable.getUtilisateur(),
                "INVITATION_AGENCE_ACCEPTEE", "Invitation acceptée",
                membre.getUtilisateur().getNomComplet() + " a accepté votre invitation à rejoindre "
                    + agence.getNom() + " comme " + membre.getFonction().name().toLowerCase() + ".",
                "/mes-agences/" + agenceId));
    }

    public MembreResume modifierFonction(UUID agenceId, UUID membreId, FonctionAgence fonction,
                                         AuthenticatedUser acteur) {
        verifierAccesGestion(agenceId, acteur);
        if (fonction == FonctionAgence.RESPONSABLE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Seul un administrateur peut attribuer la fonction RESPONSABLE.");
        }
        MembreAgence membre = trouverMembre(agenceId, membreId);
        if (membre.getFonction() == FonctionAgence.RESPONSABLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "La fonction du responsable doit être modifiée par un administrateur.");
        }
        FonctionAgence ancienneFonction = membre.getFonction();
        membre.setFonction(fonction);
        notifications.creer(membre.getUtilisateur(), "FONCTION_AGENCE_MODIFIEE",
            "Votre fonction dans l’agence a changé",
            "Votre fonction au sein de " + membre.getAgence().getNom() + " est passée de "
                + ancienneFonction.name().toLowerCase() + " à " + fonction.name().toLowerCase() + ".",
            "/mes-agences");
        return versResume(membre);
    }

    public MembreResume modifierStatut(UUID agenceId, UUID membreId, StatutMembreAgence statut,
                                       AuthenticatedUser acteur) {
        verifierAccesGestion(agenceId, acteur);
        if (statut == StatutMembreAgence.INVITATION_EN_ATTENTE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Un membre actif ou suspendu ne peut pas être replacé en attente.");
        }
        MembreAgence membre = trouverMembre(agenceId, membreId);
        if (membre.getFonction() == FonctionAgence.RESPONSABLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Le responsable ne peut pas être suspendu depuis cet espace.");
        }
        membre.setStatut(statut);
        notifications.creer(membre.getUtilisateur(), "ACCES_AGENCE_MODIFIE",
            statut == StatutMembreAgence.ACTIF ? "Votre accès à l’agence est réactivé" : "Votre accès à l’agence est suspendu",
            statut == StatutMembreAgence.ACTIF
                ? "Votre accès à l’espace de " + membre.getAgence().getNom() + " est de nouveau actif."
                : "Votre accès à l’espace de " + membre.getAgence().getNom() + " a été suspendu par le responsable.",
            "/mes-agences");
        return versResume(membre);
    }

    public MembreResume definirResponsable(UUID agenceId, String email, AuthenticatedUser admin) {
        verifierAdmin(admin);
        Agence agence = trouverAgenceActive(agenceId);
        User utilisateur = utilisateurs.findByEmail(email.trim().toLowerCase())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable."));
        if (!utilisateur.isActif()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce compte utilisateur est désactivé.");
        }
        MembreAgence membre = membres.findByAgenceIdAndUtilisateurId(agenceId, utilisateur.getId())
            .orElseGet(() -> new MembreAgence(agence, utilisateur, FonctionAgence.RESPONSABLE));
        membre.setFonction(FonctionAgence.RESPONSABLE);
        membre.setStatut(StatutMembreAgence.ACTIF);
        if (utilisateur.getRole() == sn.immosenegal.user.Role.CLIENT) {
            utilisateur.setRole(sn.immosenegal.user.Role.RESPONSABLE);
        }
        return versResume(membres.save(membre));
    }

    @Transactional(readOnly = true)
    public List<MembreResume> listerMembresAdmin(UUID agenceId, AuthenticatedUser admin) {
        verifierAdmin(admin);
        if (!agences.existsById(agenceId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence introuvable.");
        }
        return membres.findAllByAgenceIdAndStatut(agenceId, StatutMembreAgence.ACTIF).stream()
            .map(this::versResume).toList();
    }

    @Transactional(readOnly = true)
    public List<AgenceAdminResume> listerAgencesAdmin(AuthenticatedUser admin) {
        verifierAdmin(admin);
        return agences.findAll().stream()
            .sorted(java.util.Comparator.comparing(Agence::getNom, String.CASE_INSENSITIVE_ORDER))
            .map(a -> new AgenceAdminResume(a.getId(), a.getNom(), a.getSlug(),
                a.getType().name(), a.getStatut().name(), a.getAdresse(), a.getEmailContact(),
                a.getTelephoneContact(), a.getCreeLe(),
                membres.findAllByAgenceId(a.getId()).stream()
                    .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF).count()))
            .toList();
    }

    public AgenceAdminResume modifierStatutAgence(UUID agenceId, StatutAgence statut,
                                                   AuthenticatedUser admin) {
        verifierAdmin(admin);
        if (statut == StatutAgence.EN_ATTENTE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Une agence ne peut pas être replacée en attente après sa décision.");
        }
        Agence agence = agences.findById(agenceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence introuvable."));
        agence.setStatut(statut);
        agence.setModifieLe(java.time.Instant.now());
        membres.findAllByAgenceId(agenceId).stream()
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .forEach(m -> notifications.creer(m.getUtilisateur(), "STATUT_AGENCE_MODIFIE",
                statut == StatutAgence.ACTIVE ? "Agence réactivée" : "Agence suspendue",
                statut == StatutAgence.ACTIVE
                    ? "L’agence " + agence.getNom() + " est de nouveau active."
                    : "L’agence " + agence.getNom() + " a été suspendue par l’administration.",
                "/mes-agences"));
        return new AgenceAdminResume(agence.getId(), agence.getNom(), agence.getSlug(),
            agence.getType().name(), agence.getStatut().name(), agence.getAdresse(),
            agence.getEmailContact(), agence.getTelephoneContact(), agence.getCreeLe(),
            membres.findAllByAgenceId(agenceId).stream()
                .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF).count());
    }

    private void verifierAccesGestion(UUID agenceId, AuthenticatedUser acteur) {
        trouverAgenceActive(agenceId);
        if (acteur.role().name().equals("ADMIN")) return;
        boolean responsable = membres.findByAgenceIdAndUtilisateurId(agenceId, acteur.id())
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE)
            .isPresent();
        if (!responsable) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Seul le responsable de cette agence ou un administrateur peut gérer ses membres.");
        }
    }

    private void verifierAdmin(AuthenticatedUser acteur) {
        if (!acteur.role().name().equals("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé à l'administrateur.");
        }
    }

    private Agence trouverAgenceActive(UUID agenceId) {
        return agences.findById(agenceId)
            .filter(a -> a.getStatut() == StatutAgence.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Agence introuvable ou inactive."));
    }

    private MembreAgence trouverMembre(UUID agenceId, UUID membreId) {
        MembreAgence membre = membres.findById(membreId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membre introuvable."));
        if (!membre.getAgence().getId().equals(agenceId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Membre introuvable dans cette agence.");
        }
        return membre;
    }

    private MembreResume versResume(MembreAgence membre) {
        return new MembreResume(membre.getId(), membre.getUtilisateur().getId(),
            membre.getUtilisateur().getNomComplet(), membre.getUtilisateur().getEmail(),
            membre.getFonction().name(), membre.getStatut().name(), membre.getCreeLe());
    }

    public record AgencePubliqueResume(UUID id, String nom, String slug, String description, String adresse, String logoUrl) {}
    public record AgenceAdminResume(UUID id, String nom, String slug, String type, String statut,
            String adresse, String emailContact, String telephoneContact, java.time.Instant creeLe,
            long membresActifs) {}
    public record AgenceResume(UUID id, String nom, String slug, String fonction) {}
    public record InvitationResume(UUID id, UUID agenceId, String agenceNom, String fonction,
                                   java.time.Instant creeLe) {}
    public record MembreResume(UUID id, UUID utilisateurId, String nom, String email,
                               String fonction, String statut, java.time.Instant creeLe) {}
}
