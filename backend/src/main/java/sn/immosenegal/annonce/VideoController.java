package sn.immosenegal.annonce;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import sn.immosenegal.config.OpenApiConfig;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/annonces/{annonceId}/video")
public class VideoController {
    private final VideoService service;

    public VideoController(VideoService service) {
        this.service = service;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Ajouter ou remplacer la vidéo d'une annonce (MP4 ou WebM, 1150 Mo max)",
        security = @SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER))
    public ResponseEntity<Map<String, UUID>> ajouter(@PathVariable UUID annonceId,
            @RequestParam("fichier") MultipartFile fichier,
            @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", service.ajouter(annonceId, utilisateur, fichier)));
    }

    @GetMapping("/info")
    public ResponseEntity<Map<String, Boolean>> info(@PathVariable UUID annonceId) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)).cachePublic())
            .body(Map.of("disponible", service.existe(annonceId)));
    }

    @GetMapping
    @Operation(summary = "Lire la vidéo d'une annonce")
    public ResponseEntity<byte[]> lire(@PathVariable UUID annonceId) {
        VideoAnnonce video = service.lire(annonceId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(video.getTypeMime()))
            .cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic())
            .header("X-Content-Type-Options", "nosniff")
            .body(video.getContenu());
    }

    @DeleteMapping
    @Operation(summary = "Supprimer la vidéo d'une annonce", security = @SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER))
    public ResponseEntity<Void> supprimer(@PathVariable UUID annonceId,
            @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        service.supprimer(annonceId, utilisateur);
        return ResponseEntity.noContent().build();
    }
}