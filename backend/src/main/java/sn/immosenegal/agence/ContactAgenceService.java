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
public class ContactAgenceService {
    private final ContactAgenceRepository contacts;
    private final AgenceRepository agences;
    private final MembreAgenceRepository membres;
    private final UserRepository utilisateurs;
    private final NotificationService notifications;

    public ContactAgenceService(ContactAgenceRepository contacts, AgenceRepository agences,
            MembreAgenceRepository membres, UserRepository utilisateurs, NotificationService notifications) {
        this.contacts = contacts;
        this.agences = agences;
        this.membres = membres;
        this.utilisateurs = utilisateurs;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<ContactResume> lister(UUID agenceId, AuthenticatedUser acteur) {
        MembreAgence membre = verifierMembre(agenceId, acteur);
        List<ContactAgence> liste = membre.getFonction() == FonctionAgence.RESPONSABLE
                || acteur.role().name().equals("ADMIN")
            ? contacts.findAllByAgenceIdOrderByCreeLeDesc(agenceId)
            : contacts.findAllByAgenceIdAndMembreAssigneIdOrderByCreeLeDesc(agenceId, membre.getId());
        return liste.stream().map(this::resume).toList();
    }

    public ContactResume creer(UUID agenceId, CreationContact requete, AuthenticatedUser acteur) {
        MembreAgence auteur = verifierMembre(agenceId, acteur);
        String nom = propre(requete.nom());
        if (nom == null || nom.length() > 120)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le nom est obligatoire (120 caractères maximum).");
        String besoin = propre(requete.typeBesoin());
        if (!List.of("ACHAT", "LOCATION", "VENTE", "MISE_EN_LOCATION", "AUTRE").contains(besoin))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type de besoin invalide.");
        verifierLongueur(requete.email(), 254, "L'e-mail");
        verifierLongueur(requete.telephone(), 30, "Le téléphone");
        verifierLongueur(requete.recherche(), 160, "La recherche");
        verifierLongueur(requete.ville(), 100, "La ville");
        verifierLongueur(requete.notes(), 2000, "Les notes");

        MembreAgence assigne = auteur;
        if (requete.membreAssigneId() != null) {
            if (auteur.getFonction() != FonctionAgence.RESPONSABLE && !acteur.role().name().equals("ADMIN"))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul le responsable peut attribuer un contact à un autre collaborateur.");
            assigne = membreActif(agenceId, requete.membreAssigneId());
        }
        Agence agence = agences.findById(agenceId)
            .filter(a -> a.getStatut() == StatutAgence.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence introuvable ou inactive."));
        User createur = utilisateurs.findById(acteur.id())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        ContactAgence contact = contacts.save(new ContactAgence(agence, createur, assigne, nom,
            propre(requete.email()), propre(requete.telephone()), besoin, propre(requete.recherche()),
            propre(requete.ville()), propre(requete.notes())));
        if (!assigne.getUtilisateur().getId().equals(acteur.id())) {
            notifications.creer(assigne.getUtilisateur(), "CONTACT_CRM_ATTRIBUE", "Nouveau contact attribué",
                "Le contact " + nom + " vous a été attribué par " + createur.getNomComplet() + ".",
                "/mes-agences/" + agenceId + "/espace");
        }
        return resume(contact);
    }

    public ContactResume modifier(UUID agenceId, UUID contactId, ModificationContact requete, AuthenticatedUser acteur) {
        MembreAgence auteur = verifierMembre(agenceId, acteur);
        ContactAgence contact = contacts.findByIdAndAgenceId(contactId, agenceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contact introuvable."));
        boolean responsable = auteur.getFonction() == FonctionAgence.RESPONSABLE || acteur.role().name().equals("ADMIN");
        if (!responsable && (contact.getMembreAssigne() == null
                || !contact.getMembreAssigne().getId().equals(auteur.getId())))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce contact ne vous est pas attribué.");
        MembreAgence assigne = contact.getMembreAssigne();
        if (requete.membreAssigneId() != null) {
            if (!responsable)
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul le responsable peut réattribuer un contact.");
            assigne = membreActif(agenceId, requete.membreAssigneId());
            if (contact.getMembreAssigne() == null || !assigne.getId().equals(contact.getMembreAssigne().getId())) {
                notifications.creer(assigne.getUtilisateur(), "CONTACT_CRM_ATTRIBUE", "Nouveau contact attribué",
                    "Le contact " + contact.getNom() + " vous a été attribué.",
                    "/mes-agences/" + agenceId + "/espace");
            }
        }
        verifierLongueur(requete.notes(), 2000, "Les notes");
        contact.modifier(requete.statut(), assigne, propre(requete.notes()));
        return resume(contact);
    }

    private MembreAgence verifierMembre(UUID agenceId, AuthenticatedUser acteur) {
        agences.findById(agenceId).filter(a -> a.getStatut() == StatutAgence.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence introuvable ou inactive."));
        if (acteur.role().name().equals("ADMIN")) {
            return membres.findAllByAgenceIdAndStatut(agenceId, StatutMembreAgence.ACTIF).stream()
                .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Responsable introuvable."));
        }
        return membres.findByAgenceIdAndUtilisateurId(agenceId, acteur.id())
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Vous n'êtes pas membre actif de cette agence."));
    }

    private MembreAgence membreActif(UUID agenceId, UUID membreId) {
        return membres.findById(membreId)
            .filter(m -> m.getAgence().getId().equals(agenceId) && m.getStatut() == StatutMembreAgence.ACTIF)
            .filter(m -> m.getFonction() == FonctionAgence.AGENT || m.getFonction() == FonctionAgence.GESTIONNAIRE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Collaborateur actif introuvable dans cette agence."));
    }

    private ContactResume resume(ContactAgence c) {
        MembreAgence m = c.getMembreAssigne();
        return new ContactResume(c.getId(), c.getNom(), c.getEmail(), c.getTelephone(), c.getTypeBesoin(),
            c.getRecherche(), c.getVille(), c.getNotes(), c.getStatut().name(),
            m == null ? null : m.getId(), m == null ? null : m.getUtilisateur().getNomComplet(),
            c.getCreateur().getNomComplet(), c.getCreeLe(), c.getModifieLe());
    }

    private String propre(String v) { return v == null || v.isBlank() ? null : v.trim(); }
    private void verifierLongueur(String v, int max, String champ) {
        if (v != null && v.length() > max) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, champ + " dépasse la longueur autorisée.");
    }

    public record CreationContact(String nom, String email, String telephone, String typeBesoin,
        String recherche, String ville, String notes, UUID membreAssigneId) {}
    public record ModificationContact(StatutContactCrm statut, String notes, UUID membreAssigneId) {}
    public record ContactResume(UUID id, String nom, String email, String telephone, String typeBesoin,
        String recherche, String ville, String notes, String statut, UUID membreAssigneId,
        String membreAssigneNom, String createurNom, java.time.Instant creeLe, java.time.Instant modifieLe) {}
}
