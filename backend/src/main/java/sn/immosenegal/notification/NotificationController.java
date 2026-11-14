package sn.immosenegal.notification;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public NotificationsResponse mesNotifications(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.mesNotifications(acteur);
    }

    @PostMapping("/{id}/lue")
    public ResponseEntity<Void> marquerLue(@PathVariable UUID id,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        service.marquerLue(id, acteur);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/tout-lire")
    public ResponseEntity<Void> toutMarquerLu(@AuthenticationPrincipal AuthenticatedUser acteur) {
        service.toutMarquerLu(acteur);
        return ResponseEntity.noContent().build();
    }
}
