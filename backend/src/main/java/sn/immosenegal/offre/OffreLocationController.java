package sn.immosenegal.offre;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/offres-location")
public class OffreLocationController {
    private final OffreLocationService service;
    public OffreLocationController(OffreLocationService service) { this.service = service; }

    @PostMapping("/annonces/{annonceId}")
    public ResponseEntity<OffreLocationResponse> creer(@PathVariable UUID annonceId,
            @Valid @RequestBody CreerOffreLocationRequest req,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.creer(annonceId, req, acteur));
    }
    @GetMapping("/envoyees")
    public List<OffreLocationResponse> envoyees(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.envoyees(acteur);
    }
    @GetMapping("/recues")
    public List<OffreLocationResponse> recues(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.recues(acteur);
    }
    @PostMapping("/{id}/decision")
    public OffreLocationResponse decider(@PathVariable UUID id, @RequestBody DecisionLocationRequest req,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.decider(id, req.accepter(), req.reponse(), acteur);
    }
    @PostMapping("/{id}/annuler")
    public ResponseEntity<Void> annuler(@PathVariable UUID id,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        service.annuler(id, acteur);
        return ResponseEntity.noContent().build();
    }

    public record DecisionLocationRequest(boolean accepter, @Size(max = 1000) String reponse) {}
}
