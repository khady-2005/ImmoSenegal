package sn.immosenegal.notification;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(UUID id, String type, String titre, String message,
                                   String lien, boolean lue, Instant creeLe) {
    public static NotificationResponse de(Notification n) {
        return new NotificationResponse(n.getId(), n.getType(), n.getTitre(), n.getMessage(),
            n.getLien(), n.isLue(), n.getCreeLe());
    }
}
