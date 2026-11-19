package sn.immosenegal.messagerie;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/messagerie")
public class MessagerieController {
    private final MessagerieService service;
    public MessagerieController(MessagerieService service) { this.service = service; }

    @GetMapping
    public List<ConversationResponse> conversations(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.conversations(acteur);
    }

    @GetMapping("/{reservationId}")
    public List<MessageResponse> messages(@PathVariable UUID reservationId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.messages(reservationId, acteur);
    }

    @PostMapping("/{reservationId}")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse envoyer(@PathVariable UUID reservationId,
            @Valid @RequestBody EnvoyerMessageRequest requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.envoyer(reservationId, requete.contenu(), acteur);
    }
}