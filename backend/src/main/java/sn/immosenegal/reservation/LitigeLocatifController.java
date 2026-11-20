package sn.immosenegal.reservation;

import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/admin/locations")
public class LitigeLocatifController {
    private final LitigeLocatifService service;
    private final IncidentLocationService incidents;
    public LitigeLocatifController(LitigeLocatifService service, IncidentLocationService incidents) {
        this.service = service; this.incidents = incidents;
    }

    @PatchMapping("/litiges/incidents/{incidentId}")
    public IncidentLocationService.IncidentResume traiterIncident(@PathVariable java.util.UUID incidentId,
            @RequestBody IncidentLocationService.MiseAJourIncident q,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return incidents.traiterParAdmin(incidentId, q, acteur);
    }

    @PatchMapping("/litiges/{type}/{id}/note")
    public LitigeLocatifService.LitigeResume ajouterNote(@PathVariable String type, @PathVariable java.util.UUID id,
            @RequestBody NoteAdministrative q, @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.ajouterNoteAdministrative(type, id, q == null ? null : q.note(), acteur);
    }

    public record NoteAdministrative(String note) {}

    @GetMapping("/litiges")
    public List<LitigeLocatifService.LitigeResume> supervision(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.supervision(acteur);
    }
}
