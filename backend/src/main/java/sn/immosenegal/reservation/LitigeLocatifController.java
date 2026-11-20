package sn.immosenegal.reservation;

import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/admin/locations")
public class LitigeLocatifController {
    private final LitigeLocatifService service;
    public LitigeLocatifController(LitigeLocatifService service) { this.service = service; }

    @PatchMapping("/litiges/incidents/{incidentId}")
    public IncidentLocationService.IncidentResume traiterIncident(@PathVariable java.util.UUID incidentId,
            @RequestBody IncidentLocationService.MiseAJourIncident q,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.traiterParAdmin(incidentId, q, acteur);
    }

    @GetMapping("/litiges")
    public List<LitigeLocatifService.LitigeResume> supervision(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.supervision(acteur);
    }
}
