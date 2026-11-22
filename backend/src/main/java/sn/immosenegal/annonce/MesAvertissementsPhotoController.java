package sn.immosenegal.annonce;

import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/annonces/mes-avertissements-photos")
public class MesAvertissementsPhotoController {
    private final ModerationPhotoService service;

    public MesAvertissementsPhotoController(ModerationPhotoService service) {
        this.service = service;
    }

    @GetMapping
    public List<ModerationPhotoService.AvertissementResponse> lister(
            @AuthenticationPrincipal AuthenticatedUser proprietaire) {
        return service.mesAvertissementsToutesAnnonces(proprietaire);
    }
}
