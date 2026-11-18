package sn.immosenegal.agence;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import sn.immosenegal.config.OpenApiConfig;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api")
@Tag(name = "Mandats de gestion immobilière")
@SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER)
public class MandatGestionController {
    private final MandatGestionService service;

    public MandatGestionController(MandatGestionService service) {
        this.service = service;
    }

    @PostMapping("/agence/{agenceId}/mandats/propositions")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Proposer la gestion d'une annonce à son propriétaire")
    public MandatGestionService.MandatResume proposer(@PathVariable UUID agenceId,
            @Valid @RequestBody PropositionRequest request,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.proposer(agenceId, request.annonceId(), acteur);
    }

    @GetMapping("/agence/{agenceId}/mandats")
    public List<MandatGestionService.MandatResume> mandatsAgence(@PathVariable UUID agenceId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.mandatsAgence(agenceId, acteur);
    }

    @GetMapping("/mandats/mes-propositions")
    public List<MandatGestionService.MandatResume> mesPropositions(
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.mesPropositions(acteur);
    }

    @PostMapping("/mandats/{mandatId}/reponse")
    public MandatGestionService.MandatResume repondre(@PathVariable UUID mandatId,
            @Valid @RequestBody ReponseRequest request,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.repondre(mandatId, request.accepter(), acteur);
    }

    public record PropositionRequest(@NotNull UUID annonceId) {}
    public record ReponseRequest(@NotNull Boolean accepter) {}
}
