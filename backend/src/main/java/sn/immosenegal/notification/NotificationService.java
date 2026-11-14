package sn.immosenegal.notification;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sn.immosenegal.common.ApiException;
import sn.immosenegal.security.AuthenticatedUser;

@Service
public class NotificationService {
    private final NotificationRepository notifications;

    public NotificationService(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    @Transactional
    public void creer(sn.immosenegal.user.User destinataire, String type, String titre, String message, String lien) {
        if (destinataire != null) {
            notifications.save(new Notification(destinataire, type, titre, message, lien));
        }
    }

    @Transactional(readOnly = true)
    public NotificationsResponse mesNotifications(AuthenticatedUser acteur) {
        List<NotificationResponse> liste = notifications
            .findTop30ByDestinataireIdOrderByCreeLeDesc(acteur.id())
            .stream().map(NotificationResponse::de).toList();
        return new NotificationsResponse(liste, notifications.countByDestinataireIdAndLueFalse(acteur.id()));
    }

    @Transactional
    public void marquerLue(UUID id, AuthenticatedUser acteur) {
        Notification notification = notifications.findByIdAndDestinataireId(id, acteur.id())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Notification introuvable."));
        notification.marquerLue();
    }

    @Transactional
    public void toutMarquerLu(AuthenticatedUser acteur) {
        notifications.findTop30ByDestinataireIdOrderByCreeLeDesc(acteur.id())
            .forEach(Notification::marquerLue);
    }
}
