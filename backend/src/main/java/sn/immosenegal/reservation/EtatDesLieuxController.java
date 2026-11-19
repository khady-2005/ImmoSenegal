package sn.immosenegal.reservation;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/locations")
public class EtatDesLieuxController {
    private final EtatDesLieuxService service;
    public EtatDesLieuxController(EtatDesLieuxService service) { this.service = service; }

    @GetMapping("/{contratId}/etats-des-lieux")
    public List<EtatDesLieuxService.EtatDesLieuxResume> lister(@PathVariable UUID contratId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.lister(contratId, acteur);
    }

    @PostMapping("/{contratId}/etats-des-lieux")
    @ResponseStatus(HttpStatus.CREATED)
    public EtatDesLieuxService.EtatDesLieuxResume creer(@PathVariable UUID contratId,
            @RequestBody EtatDesLieuxService.CreationEtat q, @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.creer(contratId, q, acteur);
    }

    @PatchMapping("/etats-des-lieux/{etatId}/decision")
    public EtatDesLieuxService.EtatDesLieuxResume decider(@PathVariable UUID etatId,
            @RequestBody EtatDesLieuxService.DecisionEtat q, @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.decider(etatId, q, acteur);
    }
}
