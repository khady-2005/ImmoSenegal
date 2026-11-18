package sn.immosenegal.agence;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import sn.immosenegal.config.OpenApiConfig;
import sn.immosenegal.security.AuthenticatedUser;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/agence/{agenceId}/missions")
@Tag(name = "Missions des agences")
@SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER)
public class MissionAgenceController {
    private final MissionAgenceService service;

    public MissionAgenceController(MissionAgenceService service) { this.service = service; }

    @GetMapping
    public List<MissionAgenceService.MissionResume> lister(@PathVariable UUID agenceId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.lister(agenceId, acteur);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MissionAgenceService.MissionResume creer(@PathVariable UUID agenceId,
            @Valid @RequestBody CreationMissionRequest requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.creer(agenceId, new MissionAgenceService.CreationMission(
            requete.membreId(), requete.titre(), requete.description(), requete.dateEcheance()), acteur);
    }

    @PatchMapping("/{missionId}/statut")
    public MissionAgenceService.MissionResume changerStatut(@PathVariable UUID agenceId,
            @PathVariable UUID missionId, @Valid @RequestBody StatutMissionRequest requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.changerStatut(agenceId, missionId,
            new MissionAgenceService.ChangementStatut(requete.statut()), acteur);
    }

    public record CreationMissionRequest(@NotNull UUID membreId, @NotBlank @Size(max = 160) String titre,
            @Size(max = 2000) String description, java.time.LocalDate dateEcheance) {}
    public record StatutMissionRequest(@NotNull StatutMissionAgence statut) {}
}
