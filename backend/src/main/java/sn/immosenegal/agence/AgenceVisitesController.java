package sn.immosenegal.agence;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import sn.immosenegal.config.OpenApiConfig;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.visite.DemandeVisiteResponse;

@RestController
@RequestMapping("/api/agence/{agenceId}/visites")
@Tag(name = "Visites des agences")
@SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER)
public class AgenceVisitesController {
    private final AgenceVisitesService service;

    public AgenceVisitesController(AgenceVisitesService service) {
        this.service = service;
    }

    @GetMapping
    public List<DemandeVisiteResponse> lister(@PathVariable UUID agenceId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.lister(agenceId, acteur);
    }
}
