package sn.immosenegal.visite;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import sn.immosenegal.config.OpenApiConfig;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/visites")
@Tag(name = "Demandes de visite")
@SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER)
public class DemandeVisiteController {
    private final DemandeVisiteService service;

    public DemandeVisiteController(DemandeVisiteService service) {
        this.service = service;
    }

    @PostMapping("/annonces/{annonceId}")
    @Operation(summary = "Un client connecté demande une visite d'une annonce publiée")
    public ResponseEntity<DemandeVisiteResponse> creer(@PathVariable UUID annonceId,
            @Valid @RequestBody CreerDemandeVisite requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.creer(annonceId, requete, acteur));
    }

    @GetMapping("/mes-demandes")
    public List<DemandeVisiteResponse> mesDemandes(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.mesDemandes(acteur);
    }

    @GetMapping("/recues")
    public List<DemandeVisiteResponse> demandesRecues(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.demandesRecues(acteur);
    }

    @GetMapping("/admin")
    public List<DemandeVisiteResponse> toutes(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.toutes(acteur);
    }

    @PostMapping("/{id}/decision")
    public DemandeVisiteResponse decider(@PathVariable UUID id, @Valid @RequestBody DecisionVisite requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.decider(id, requete, acteur);
    }

    @PostMapping("/{id}/confirmer")
    public DemandeVisiteResponse confirmer(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.confirmer(id, acteur);
    }

    @PostMapping("/{id}/annuler")
    public ResponseEntity<Void> annuler(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser acteur) {
        service.annuler(id, acteur);
        return ResponseEntity.noContent().build();
    }
}
