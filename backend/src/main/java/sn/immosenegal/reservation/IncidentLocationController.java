package sn.immosenegal.reservation;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/locations")
public class IncidentLocationController {
    private final IncidentLocationService service;
    public IncidentLocationController(IncidentLocationService service) { this.service = service; }

    @GetMapping("/{contratId}/incidents")
    public List<IncidentLocationService.IncidentResume> lister(@PathVariable UUID contratId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.lister(contratId, acteur);
    }

    @PostMapping("/{contratId}/incidents")
    @ResponseStatus(HttpStatus.CREATED)
    public IncidentLocationService.IncidentResume declarer(@PathVariable UUID contratId,
            @RequestBody IncidentLocationService.CreationIncident q,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.declarer(contratId, q, acteur);
    }

    @PatchMapping("/incidents/{incidentId}")
    public IncidentLocationService.IncidentResume actualiser(@PathVariable UUID incidentId,
            @RequestBody IncidentLocationService.MiseAJourIncident q,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.actualiser(incidentId, q, acteur);
    }
}
