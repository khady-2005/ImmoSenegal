package sn.immosenegal.annonce;

import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/annonces/{annonceId}/photos/{photoId}/avertissement")
public class PhotoOwnerModerationController {
    private final ModerationPhotoService service;

    public PhotoOwnerModerationController(ModerationPhotoService service) {
        this.service = service;
    }

    @PostMapping("/repondre")
    public ModerationPhotoService.AvertissementResponse repondre(@PathVariable UUID annonceId,
            @PathVariable UUID photoId, @Valid @RequestBody ReponseAvertissement requete,
            @AuthenticationPrincipal AuthenticatedUser proprietaire) {
        return service.repondre(annonceId, photoId, requete.reponse(), proprietaire);
    }

    public record ReponseAvertissement(@NotBlank @Size(max = 1000) String reponse) {}
}
