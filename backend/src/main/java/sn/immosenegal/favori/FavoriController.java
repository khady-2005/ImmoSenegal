package sn.immosenegal.favori;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import sn.immosenegal.config.OpenApiConfig;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/favoris")
@Tag(name = "Favoris")
@SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER)
public class FavoriController {
    private final FavoriService service;

    public FavoriController(FavoriService service) {
        this.service = service;
    }

    @GetMapping
    public List<UUID> mesFavoris(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.mesFavoris(acteur);
    }

    @PostMapping("/{annonceId}")
    public ResponseEntity<Void> ajouter(@PathVariable UUID annonceId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        service.ajouter(annonceId, acteur);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{annonceId}")
    public ResponseEntity<Void> retirer(@PathVariable UUID annonceId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        service.retirer(annonceId, acteur);
        return ResponseEntity.noContent().build();
    }
}
