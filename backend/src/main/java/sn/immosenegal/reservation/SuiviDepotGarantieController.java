package sn.immosenegal.reservation;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/locations")
public class SuiviDepotGarantieController {
    private final SuiviDepotGarantieService service;
    public SuiviDepotGarantieController(SuiviDepotGarantieService service) { this.service = service; }

    @GetMapping("/{contratId}/depot-garantie")
    public SuiviDepotGarantieService.SuiviResume consulter(@PathVariable UUID contratId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.consulter(contratId, acteur);
    }

    @PostMapping("/{contratId}/depot-garantie")
    @ResponseStatus(HttpStatus.CREATED)
    public SuiviDepotGarantieService.SuiviResume proposer(@PathVariable UUID contratId,
            @RequestBody SuiviDepotGarantieService.Proposition q, @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.proposer(contratId, q, acteur);
    }

    @PatchMapping("/{contratId}/depot-garantie/decision")
    public SuiviDepotGarantieService.SuiviResume decider(@PathVariable UUID contratId,
            @RequestBody SuiviDepotGarantieService.Decision q, @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.decider(contratId, q, acteur);
    }
}
