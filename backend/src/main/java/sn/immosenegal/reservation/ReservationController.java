package sn.immosenegal.reservation;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {
    private final ReservationService service;

    public ReservationController(ReservationService service) {
        this.service = service;
    }

    @PostMapping("/annonces/{annonceId}")
    public ResponseEntity<ReservationResponse> creer(@PathVariable UUID annonceId,
            @Valid @RequestBody CreerReservationRequest requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.creer(annonceId, requete, acteur));
    }

    @GetMapping("/mes-demandes")
    public List<ReservationResponse> mesDemandes(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.mesDemandes(acteur);
    }

    @GetMapping("/recues")
    public List<ReservationResponse> demandesRecues(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.demandesRecues(acteur);
    }

    @GetMapping("/admin")
    public List<ReservationResponse> toutes(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.toutes(acteur);
    }

    @PostMapping("/{id}/decision")
    public ReservationResponse decider(@PathVariable UUID id, @Valid @RequestBody DecisionReservation requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.decider(id, requete, acteur);
    }

    @PostMapping("/{id}/annuler")
    public ResponseEntity<Void> annuler(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser acteur) {
        service.annuler(id, acteur);
        return ResponseEntity.noContent().build();
    }
}
