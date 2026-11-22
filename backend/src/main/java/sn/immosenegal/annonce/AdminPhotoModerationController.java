package sn.immosenegal.annonce;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/admin/photos")
public class AdminPhotoModerationController {
    private final ModerationPhotoService service;

    public AdminPhotoModerationController(ModerationPhotoService service) {
        this.service = service;
    }

    @GetMapping("/avertissements")
    public List<ModerationPhotoService.AvertissementResponse> lister(
            @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.lister(admin);
    }

    @PostMapping("/{annonceId}/{photoId}/avertir")
    public ModerationPhotoService.AvertissementResponse avertir(@PathVariable UUID annonceId,
            @PathVariable UUID photoId, @Valid @RequestBody DemandeAvertissement requete,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.avertir(annonceId, photoId, requete.motif(), admin);
    }

    @PostMapping("/avertissements/{id}/decision")
    public ModerationPhotoService.AvertissementResponse decider(@PathVariable UUID id,
            @Valid @RequestBody DecisionAvertissement requete,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.decider(id, requete.retirer(), admin);
    }

    public record DemandeAvertissement(@NotBlank @Size(max = 500) String motif) {}
    public record DecisionAvertissement(boolean retirer) {}
}
