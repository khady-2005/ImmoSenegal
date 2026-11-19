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

    @GetMapping("/litiges")
    public List<LitigeLocatifService.LitigeResume> supervision(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.supervision(acteur);
    }
}
