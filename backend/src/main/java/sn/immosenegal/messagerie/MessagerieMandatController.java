package sn.immosenegal.messagerie;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/messagerie/mandats")
public class MessagerieMandatController {
    private final MessagerieMandatService service;
    public MessagerieMandatController(MessagerieMandatService service) { this.service = service; }

    @GetMapping
    public List<ConversationMandatResponse> conversations(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.conversations(acteur);
    }
    @GetMapping("/{mandatId}")
    public List<MessageMandatGestionResponse> messages(@PathVariable UUID mandatId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.messages(mandatId, acteur);
    }
    @PostMapping("/{mandatId}")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageMandatGestionResponse envoyer(@PathVariable UUID mandatId,
            @Valid @RequestBody EnvoyerMessageRequest requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.envoyer(mandatId, requete.contenu(), acteur);
    }
}
