package sn.immosenegal.avis;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/annonces/{annonceId}/avis")
public class AvisController {
    private final AvisService service;

    public AvisController(AvisService service) { this.service = service; }

    @GetMapping
    public List<AvisResponse> lister(@PathVariable UUID annonceId) {
        return service.lister(annonceId);
    }

    @PostMapping
    public ResponseEntity<AvisResponse> creer(@PathVariable UUID annonceId, @Valid @RequestBody AvisRequest requete,
                                               @AuthenticationPrincipal AuthenticatedUser acteur) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.creer(annonceId, requete, acteur));
    }
}
