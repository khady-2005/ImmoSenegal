package sn.immosenegal.annonce;

import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import sn.immosenegal.config.OpenApiConfig;
import sn.immosenegal.security.AuthenticatedUser;

/**
 * Modération des annonces. Toutes les routes /api/admin/** exigent le rôle ADMIN (règle dans SecurityConfig) ;
 * le service le vérifie aussi, pour que la règle tienne même si la configuration de sécurité changeait.
 */
@RestController
@RequestMapping("/api/admin/annonces")
@Tag(name = "Modération des annonces", description = "Réservé au rôle ADMIN : valider, refuser, suspendre ou demander une correction")
@SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER)
public class AdminAnnonceController {

    private final AnnonceService service;

    public AdminAnnonceController(AnnonceService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "File de modération : annonces d'un statut (EN_ATTENTE par défaut), les plus anciennes d'abord")
    public PageResponse<AnnonceResponse> lister(@RequestParam(required = false) StatutAnnonce statut,
                                                @RequestParam(required = false) Integer page,
                                                @RequestParam(required = false) Integer taille,
                                                @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.listerPourModeration(admin, statut, page, taille);
    }


    @PatchMapping("/{id}/publication-agence")
    @Operation(summary = "Marquer une annonce comme publiée par ImmoSénégal ou par un propriétaire (ADMIN uniquement)")
    public AnnonceResponse definirPublicationAgence(@PathVariable UUID id,
            @Valid @RequestBody OriginePublication requete,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.definirPublicationAgence(id, requete.publieeParAgence(), admin);
    }

    public record OriginePublication(@jakarta.validation.constraints.NotNull Boolean publieeParAgence) {}

    @PostMapping("/{id}/valider")
    @Operation(summary = "Réactiver une annonce suspendue ; les annonces expirées nécessitent un abonnement ou un mandat accepté")
    public AnnonceResponse valider(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.moderer(id, admin, ActionModeration.VALIDER, null);
    }

    @PostMapping("/{id}/refuser")
    @Operation(summary = "Refuser une annonce EN_ATTENTE (motif obligatoire, montré au propriétaire)")
    public AnnonceResponse refuser(@PathVariable UUID id, @Valid @RequestBody ModerationRequest requete,
                                   @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.moderer(id, admin, ActionModeration.REFUSER, requete.motif());
    }

    @PostMapping("/{id}/suspendre")
    @Operation(summary = "Suspendre une annonce PUBLIEE ou RESERVE (motif obligatoire) : elle disparaît du catalogue")
    public AnnonceResponse suspendre(@PathVariable UUID id, @Valid @RequestBody ModerationRequest requete,
                                     @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.moderer(id, admin, ActionModeration.SUSPENDRE, requete.motif());
    }

    @PostMapping("/{id}/demander-correction")
    @Operation(summary = "Demander une correction sur une annonce EN_ATTENTE (motif obligatoire) : le propriétaire la corrige puis la renvoie")
    public AnnonceResponse demanderCorrection(@PathVariable UUID id, @Valid @RequestBody ModerationRequest requete,
                                              @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.moderer(id, admin, ActionModeration.DEMANDER_CORRECTION, requete.motif());
    }
}
