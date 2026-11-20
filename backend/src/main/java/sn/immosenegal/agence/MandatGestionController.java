package sn.immosenegal.agence;

import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
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
    @Operation(summary = "L'agence propose la gestion d'une annonce à son propriétaire")
    public MandatGestionService.MandatResume proposer(@PathVariable UUID agenceId,
            @Valid @RequestBody PropositionRequest request,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.proposer(agenceId, request.annonceId(), acteur);
    }

    @PostMapping("/agence/{agenceId}/mandats/demandes")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Le propriétaire demande à une agence de gérer son annonce")
    public MandatGestionService.MandatResume demander(@PathVariable UUID agenceId,
            @Valid @RequestBody PropositionRequest request,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.demander(agenceId, request.annonceId(), acteur);
    }

    @GetMapping("/agence/{agenceId}/mandats")
    public List<MandatGestionService.MandatResume> mandatsAgence(@PathVariable UUID agenceId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.mandatsAgence(agenceId, acteur);
    }

    @GetMapping("/agence/{agenceId}/portefeuille")
    public List<MandatGestionService.MandatResume> portefeuilleAgence(@PathVariable UUID agenceId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.portefeuilleAgence(agenceId, acteur);
    }

    @GetMapping("/mandats/mes-propositions")
    public List<MandatGestionService.MandatResume> mesPropositions(
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.mesPropositions(acteur);
    }

    @PatchMapping("/mandats/{mandatId}/commission")
    @Operation(summary = "Proposer le taux de commission mensuel du mandat")
    public MandatGestionService.MandatResume definirTauxCommission(@PathVariable UUID mandatId,
            @Valid @RequestBody CommissionRequest request,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.definirTauxCommission(mandatId, request.tauxCommissionMensuel(), acteur);
    }

    @PostMapping("/mandats/{mandatId}/reponse")
    public MandatGestionService.MandatResume repondre(@PathVariable UUID mandatId,
            @Valid @RequestBody ReponseRequest request,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.repondre(mandatId, request.accepter(), acteur);
    }

    @PostMapping("/mandats/{mandatId}/resiliation")
    @Operation(summary = "Demander la résiliation concertée d'un mandat")
    public MandatGestionService.MandatResume demanderResiliation(@PathVariable UUID mandatId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.demanderResiliation(mandatId, acteur);
    }

    @PostMapping("/mandats/{mandatId}/resiliation/reponse")
    @Operation(summary = "Accepter ou refuser une demande de résiliation")
    public MandatGestionService.MandatResume repondreResiliation(@PathVariable UUID mandatId,
            @Valid @RequestBody ReponseRequest request,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.repondreResiliation(mandatId, request.accepter(), acteur);
    }

    public record PropositionRequest(@NotNull UUID annonceId) {}
    public record ReponseRequest(@NotNull Boolean accepter) {}
    public record CommissionRequest(@NotNull @DecimalMin("0.01") @DecimalMax("100.00") BigDecimal tauxCommissionMensuel) {}
}
