package sn.immosenegal.messagerie;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.immosenegal.agence.*;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.reservation.Reservation;
import sn.immosenegal.reservation.ReservationRepository;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service
public class MessagerieService {
    private final ReservationRepository reservations;
    private final MessageConversationRepository messages;
    private final NotificationService notifications;
    private final MandatGestionRepository mandats;
    private final MembreAgenceRepository membres;
    private final UserRepository users;

    public MessagerieService(ReservationRepository reservations, MessageConversationRepository messages,
            NotificationService notifications, MandatGestionRepository mandats, MembreAgenceRepository membres, UserRepository users) {
        this.reservations = reservations; this.messages = messages; this.notifications = notifications;
        this.mandats = mandats; this.membres = membres; this.users = users;
    }

    @Transactional(readOnly = true)
    public List<ConversationResponse> conversations(AuthenticatedUser acteur) {
        List<Reservation> liste;
        if (acteur.role() == Role.CLIENT) {
            liste = reservations.findByClientIdOrderByCreeLeDesc(acteur.id());
        } else if (acteur.role() == Role.PROPRIETAIRE) {
            liste = reservations.findByAnnonceProprietaireIdOrderByCreeLeDesc(acteur.id());
        } else if (acteur.role() == Role.ADMIN) {
            liste = reservations.findAllByOrderByCreeLeDesc();
        } else if (acteur.role() == Role.AGENT) {
            List<UUID> annoncesGerees = membres.findAllByUtilisateurId(acteur.id()).stream()
                .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
                .flatMap(m -> mandats.findAllByAgenceIdAndStatutOrderByCreeLeDesc(
                    m.getAgence().getId(), StatutMandatGestion.ACCEPTE).stream())
                .map(m -> m.getAnnonce().getId()).distinct().toList();
            liste = annoncesGerees.isEmpty() ? List.of()
                : reservations.findAllByAnnonceIdInOrderByCreeLeDesc(annoncesGerees);
        } else {
            throw new ApiException(HttpStatus.FORBIDDEN, "La messagerie est réservée aux clients, propriétaires et agents concernés.");
        }
        return liste.stream().map(r -> {
            String interlocuteur;
            if (acteur.role() == Role.ADMIN) {
                interlocuteur = "Client : " + r.getClient().getNomComplet() + " · Propriétaire : " + r.getAnnonce().getProprietaire().getNomComplet();
            } else if (acteur.role() == Role.CLIENT) {
                List<MandatGestion> actifs = mandats.findAllByAnnonceIdAndStatutOrderByCreeLeDesc(
                    r.getAnnonce().getId(), StatutMandatGestion.ACCEPTE);
                interlocuteur = actifs.isEmpty() ? r.getAnnonce().getProprietaire().getNomComplet()
                    : actifs.get(0).getAgence().getNom();
            } else {
                interlocuteur = r.getClient().getNomComplet();
            }
            return ConversationResponse.de(r, acteur.id(), interlocuteur,
                messages.findTopByReservationIdOrderByEnvoyeLeDesc(r.getId()).orElse(null));
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> messages(UUID reservationId, AuthenticatedUser acteur) {
        verifierParticipant(reservationId, acteur);
        return messages.findByReservationIdOrderByEnvoyeLeAsc(reservationId)
            .stream().map(MessageResponse::de).toList();
    }

    @Transactional
    public MessageResponse envoyer(UUID reservationId, String contenu, AuthenticatedUser acteur) {
        Reservation reservation = verifierParticipant(reservationId, acteur);
        if (contenu == null || contenu.isBlank() || contenu.length() > 2000)
            throw new ApiException(HttpStatus.BAD_REQUEST, "Le message doit contenir entre 1 et 2000 caractères.");
        User expediteur;
        if (acteur.role() == Role.ADMIN) expediteur = users.findById(acteur.id())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Compte administrateur introuvable."));
        else if (reservation.getClient().getId().equals(acteur.id())) expediteur = reservation.getClient();
        else if (reservation.getAnnonce().getProprietaire().getId().equals(acteur.id())) expediteur = reservation.getAnnonce().getProprietaire();
        else expediteur = membres.findAllByUtilisateurId(acteur.id()).stream()
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .filter(m -> mandats.findAllByAnnonceIdAndStatutOrderByCreeLeDesc(
                reservation.getAnnonce().getId(), StatutMandatGestion.ACCEPTE).stream()
                .anyMatch(g -> g.getAgence().getId().equals(m.getAgence().getId())))
            .map(MembreAgence::getUtilisateur).findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Vous ne participez pas à cette conversation."));
        MessageConversation nouveau = messages.save(new MessageConversation(reservation, expediteur, contenu.trim()));

        List<MandatGestion> actifs = mandats.findAllByAnnonceIdAndStatutOrderByCreeLeDesc(
            reservation.getAnnonce().getId(), StatutMandatGestion.ACCEPTE);
        boolean client = reservation.getClient().getId().equals(acteur.id());
        if (acteur.role() == Role.ADMIN) {
            notifications.creer(reservation.getClient(), "NOUVEAU_MESSAGE", "Message de l’administration",
                "L’administration vous a écrit au sujet de « " + reservation.getAnnonce().getTitre() + " ».", "/messagerie");
            notifications.creer(reservation.getAnnonce().getProprietaire(), "NOUVEAU_MESSAGE", "Message de l’administration",
                "L’administration vous a écrit au sujet de « " + reservation.getAnnonce().getTitre() + " ».", "/messagerie");
        } else if (client && !actifs.isEmpty()) {
            for (MandatGestion mandat : actifs) {
                membres.findAllByAgenceIdAndStatut(mandat.getAgence().getId(), StatutMembreAgence.ACTIF)
                    .forEach(m -> notifications.creer(m.getUtilisateur(), "NOUVEAU_MESSAGE",
                        "Message concernant un bien géré", expediteur.getNomComplet()
                            + " vous a écrit au sujet de « " + reservation.getAnnonce().getTitre() + " ».",
                        "/messagerie"));
            }
        } else {
            User destinataire = client ? reservation.getAnnonce().getProprietaire() : reservation.getClient();
            notifications.creer(destinataire, "NOUVEAU_MESSAGE", "Nouveau message",
                expediteur.getNomComplet() + " vous a envoyé un message au sujet de « "
                    + reservation.getAnnonce().getTitre() + " ».", "/messagerie");
        }
        return MessageResponse.de(nouveau);
    }

    private Reservation verifierParticipant(UUID reservationId, AuthenticatedUser acteur) {
        Reservation r = reservations.findById(reservationId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Conversation introuvable."));
        boolean client = r.getClient().getId().equals(acteur.id());
        boolean proprietaire = r.getAnnonce().getProprietaire().getId().equals(acteur.id());
        boolean agent = acteur.role() == Role.AGENT && membres.findAllByUtilisateurId(acteur.id()).stream()
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .anyMatch(m -> mandats.findAllByAnnonceIdAndStatutOrderByCreeLeDesc(
                r.getAnnonce().getId(), StatutMandatGestion.ACCEPTE).stream()
                .anyMatch(g -> g.getAgence().getId().equals(m.getAgence().getId())));
        boolean admin = acteur.role() == Role.ADMIN;
        if (!admin && !client && !proprietaire && !agent)
            throw new ApiException(HttpStatus.FORBIDDEN, "Vous ne participez pas à cette conversation.");
        return r;
    }
}
