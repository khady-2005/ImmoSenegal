package sn.immosenegal.visite;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.annonce.AnnonceRepository;
import sn.immosenegal.annonce.StatutAnnonce;
import sn.immosenegal.audit.AuditService;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;
import sn.immosenegal.notification.NotificationService;

@Service
public class DemandeVisiteService {
    private final DemandeVisiteRepository demandes;
    private final AnnonceRepository annonces;
    private final UserRepository users;
    private final AuditService audit;
    private final NotificationService notifications;

    public DemandeVisiteService(DemandeVisiteRepository demandes, AnnonceRepository annonces,
                                UserRepository users, AuditService audit, NotificationService notifications) {
        this.demandes = demandes;
        this.annonces = annonces;
        this.users = users;
        this.audit = audit;
        this.notifications = notifications;
    }

    @Transactional
    public DemandeVisiteResponse creer(UUID annonceId, CreerDemandeVisite requete, AuthenticatedUser acteur) {
        exigerRole(acteur, Role.CLIENT);
        Annonce annonce = annonces.findById(annonceId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
        if (annonce.getStatut() != StatutAnnonce.PUBLIEE) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Cette annonce n'est pas disponible pour une visite.");
        }
        if (!requete.dateVisite().isAfter(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choisissez une date et une heure dans le futur.");
        }
        User client = users.findById(acteur.id())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        DemandeVisite demande = demandes.save(new DemandeVisite(annonce, client, requete.dateVisite(), propre(requete.message())));
        notifications.creer(annonce.getProprietaire(), "VISITE_NOUVELLE", "Nouvelle demande de visite",
            client.getNomComplet() + " souhaite visiter « " + annonce.getTitre() + " ».", "/visites-recues");
        audit.enregistrer("DEMANDE_VISITE_CREEE", acteur.id(), "Demande de visite " + demande.getId());
        return DemandeVisiteResponse.de(demande);
    }

    @Transactional(readOnly = true)
    public List<DemandeVisiteResponse> mesDemandes(AuthenticatedUser acteur) {
        exigerRole(acteur, Role.CLIENT);
        return demandes.findByClientIdOrderByCreeLeDesc(acteur.id()).stream().map(DemandeVisiteResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public List<DemandeVisiteResponse> demandesRecues(AuthenticatedUser acteur) {
        exigerRole(acteur, Role.PROPRIETAIRE, Role.ADMIN);
        return demandes.findByAnnonceProprietaireIdOrderByCreeLeDesc(acteur.id()).stream().map(DemandeVisiteResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public List<DemandeVisiteResponse> toutes(AuthenticatedUser acteur) {
        exigerRole(acteur, Role.ADMIN);
        return demandes.findAllByOrderByCreeLeDesc().stream().map(DemandeVisiteResponse::de).toList();
    }

    @Transactional
    public DemandeVisiteResponse decider(UUID id, DecisionVisite requete, AuthenticatedUser acteur) {
        exigerRole(acteur, Role.PROPRIETAIRE, Role.ADMIN);
        DemandeVisite demande = trouver(id);
        if (acteur.role() != Role.ADMIN && !demande.getAnnonce().getProprietaire().getId().equals(acteur.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cette demande ne concerne pas vos annonces.");
        }
        if (demande.getStatut() != StatutVisite.EN_ATTENTE) {
            throw new ApiException(HttpStatus.CONFLICT, "Cette demande a déjà été traitée.");
        }
        String reponse = propre(requete.reponse());
        switch (requete.action()) {
            case ACCEPTEE -> demande.accepter(reponse);
            case REFUSEE -> demande.refuser(reponse);
            case PROPOSEE -> {
                if (requete.nouvelleDate() == null || !requete.nouvelleDate().isAfter(LocalDateTime.now())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Proposez une date et une heure dans le futur.");
                }
                demande.proposer(requete.nouvelleDate(), reponse);
            }
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Action non autorisée pour le propriétaire.");
        }
        String titreNotification = switch (requete.action()) {
            case ACCEPTEE -> "Votre visite a été acceptée";
            case REFUSEE -> "Votre demande de visite a reçu une réponse";
            case PROPOSEE -> "Un nouveau créneau vous est proposé";
            default -> "Mise à jour de votre demande de visite";
        };
        notifications.creer(demande.getClient(), "VISITE_REPONSE", titreNotification,
            "Le propriétaire a répondu pour « " + demande.getAnnonce().getTitre() + " ».", "/mes-visites");
        audit.enregistrer("DEMANDE_VISITE_TRAITEE", acteur.id(), "Demande de visite " + id + " : " + requete.action());
        return DemandeVisiteResponse.de(demande);
    }

    @Transactional
    public DemandeVisiteResponse confirmer(UUID id, AuthenticatedUser acteur) {
        exigerRole(acteur, Role.CLIENT);
        DemandeVisite demande = trouver(id);
        verifierClient(demande, acteur);
        if (demande.getStatut() != StatutVisite.PROPOSEE) {
            throw new ApiException(HttpStatus.CONFLICT, "Aucune nouvelle date n'attend votre confirmation.");
        }
        if (!demande.getDateVisite().isAfter(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.CONFLICT, "La date proposée est passée. Contactez le propriétaire.");
        }
        demande.confirmer();
        notifications.creer(demande.getAnnonce().getProprietaire(), "VISITE_CONFIRMEE", "Créneau de visite confirmé",
            demande.getClient().getNomComplet() + " a confirmé le créneau proposé pour « " + demande.getAnnonce().getTitre() + " ».", "/visites-recues");
        return DemandeVisiteResponse.de(demande);
    }

    @Transactional
    public void annuler(UUID id, AuthenticatedUser acteur) {
        exigerRole(acteur, Role.CLIENT);
        DemandeVisite demande = trouver(id);
        verifierClient(demande, acteur);
        if (demande.getStatut() != StatutVisite.EN_ATTENTE && demande.getStatut() != StatutVisite.PROPOSEE) {
            throw new ApiException(HttpStatus.CONFLICT, "Cette demande ne peut plus être annulée.");
        }
        demande.annuler();
        notifications.creer(demande.getAnnonce().getProprietaire(), "VISITE_ANNULEE", "Demande de visite annulée",
            demande.getClient().getNomComplet() + " a annulé sa demande pour « " + demande.getAnnonce().getTitre() + " ».", "/visites-recues");
        audit.enregistrer("DEMANDE_VISITE_ANNULEE", acteur.id(), "Demande de visite " + id);
    }

    private DemandeVisite trouver(UUID id) {
        return demandes.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Demande de visite introuvable."));
    }

    private void verifierClient(DemandeVisite d, AuthenticatedUser a) {
        if (!d.getClient().getId().equals(a.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cette demande ne vous appartient pas.");
        }
    }

    private void exigerRole(AuthenticatedUser a, Role... roles) {
        if (a == null || java.util.Arrays.stream(roles).noneMatch(r -> r == a.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Vous n'avez pas le droit d'effectuer cette action.");
        }
    }

    private String propre(String valeur) {
        return valeur == null || valeur.isBlank() ? null : valeur.trim();
    }
}
