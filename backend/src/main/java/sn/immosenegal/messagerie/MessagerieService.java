package sn.immosenegal.messagerie;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.reservation.Reservation;
import sn.immosenegal.reservation.ReservationRepository;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;

@Service
public class MessagerieService {
    private final ReservationRepository reservations;
    private final MessageConversationRepository messages;
    private final NotificationService notifications;
    public MessagerieService(ReservationRepository reservations, MessageConversationRepository messages, NotificationService notifications) {
        this.reservations = reservations; this.messages = messages; this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<ConversationResponse> conversations(AuthenticatedUser acteur) {
        List<Reservation> liste;
        if (acteur.role() == Role.CLIENT) liste = reservations.findByClientIdOrderByCreeLeDesc(acteur.id());
        else if (acteur.role() == Role.PROPRIETAIRE) liste = reservations.findByAnnonceProprietaireIdOrderByCreeLeDesc(acteur.id());
        else throw new ApiException(HttpStatus.FORBIDDEN, "La messagerie est réservée aux clients et propriétaires.");
        return liste.stream().map(r -> ConversationResponse.de(r, acteur.id())).toList();
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
        User expediteur = reservation.getClient().getId().equals(acteur.id())
            ? reservation.getClient() : reservation.getAnnonce().getProprietaire();
        MessageConversation nouveau = messages.save(new MessageConversation(reservation, expediteur, contenu.trim()));
        User destinataire = expediteur.getId().equals(reservation.getClient().getId())
            ? reservation.getAnnonce().getProprietaire() : reservation.getClient();
        notifications.creer(destinataire, "NOUVEAU_MESSAGE", "Nouveau message",
            expediteur.getNomComplet() + " vous a envoyé un message au sujet de « " + reservation.getAnnonce().getTitre() + " ».",
            "/messagerie");
        return MessageResponse.de(nouveau);
    }

    private Reservation verifierParticipant(UUID reservationId, AuthenticatedUser acteur) {
        Reservation r = reservations.findById(reservationId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Conversation introuvable."));
        boolean client = r.getClient().getId().equals(acteur.id());
        boolean proprietaire = r.getAnnonce().getProprietaire().getId().equals(acteur.id());
        if (!client && !proprietaire)
            throw new ApiException(HttpStatus.FORBIDDEN, "Vous ne participez pas à cette conversation.");
        return r;
    }
}