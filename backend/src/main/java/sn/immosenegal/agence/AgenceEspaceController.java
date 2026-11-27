package sn.immosenegal.agence;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import sn.immosenegal.annonce.AnnonceResponse;
import sn.immosenegal.annonce.AnnonceService;
import sn.immosenegal.config.OpenApiConfig;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@Tag(name = "Espaces des agences")
@SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER)
public class AgenceEspaceController {

    private final AgenceEspaceService service;
    private final AnnonceService annonces;

    public AgenceEspaceController(AgenceEspaceService service, AnnonceService annonces) {
        this.service = service;
        this.annonces = annonces;
    }

    @GetMapping("/api/agence/profil/{slug}")
    @Operation(summary = "Consulter le profil public d'une agence active et ses annonces publiées")
    public AgenceProfilPublicResponse profilPublic(@PathVariable String slug) {
        AgenceEspaceService.AgenceProfilPublicInfo info = service.profilPublic(slug);
        return new AgenceProfilPublicResponse(info.id(), info.nom(), info.slug(), info.type(),
            info.description(), info.emailContact(), info.telephoneContact(), info.adresse(),
            info.logoUrl(), info.creeLe(), annonces.annoncesPubliquesAgence(info.id()));
    }

    @PostMapping("/api/agence/inscription")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Inscrire une nouvelle agence partenaire (en attente de validation administrative)")
    public AgenceEspaceService.AgenceAdminResume inscrireAgence(
            @Valid @RequestBody InscriptionAgenceRequest requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.creerAgencePartenaire(requete.nom(), requete.description(),
            requete.emailContact(), requete.telephoneContact(), requete.adresse(), acteur);
    }

    @GetMapping("/api/agence/annuaire")
    @Operation(summary = "Lister les agences actives pouvant recevoir une demande de gestion")
    public List<AgenceEspaceService.AgencePubliqueResume> annuaire() {
        return service.annuaire();
    }

    @GetMapping("/api/agence/mes-espaces")
    @Operation(summary = "Lister les espaces des agences dont je suis membre")
    public List<AgenceEspaceService.AgenceResume> mesEspaces(
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.mesAgences(acteur);
    }

    @GetMapping("/api/agence/mes-invitations")
    @Operation(summary = "Consulter mes invitations d'agence en attente")
    public List<AgenceEspaceService.InvitationResume> mesInvitations(
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.mesInvitations(acteur);
    }

    @PostMapping("/api/agence/{agenceId}/invitations/{invitationId}/accepter")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Accepter une invitation personnelle dans une agence")
    public void accepter(@PathVariable UUID agenceId, @PathVariable UUID invitationId,
                         @AuthenticationPrincipal AuthenticatedUser acteur) {
        service.accepterInvitation(agenceId, invitationId, acteur);
    }

    @GetMapping("/api/agence/{agenceId}/membres")
    @Operation(summary = "Lister les membres actifs de mon agence (responsable ou administrateur)")
    public List<AgenceEspaceService.MembreResume> membres(@PathVariable UUID agenceId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.listerMembres(agenceId, acteur);
    }

    @PostMapping("/api/agence/{agenceId}/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Inviter un compte existant comme gestionnaire ou agent")
    public AgenceEspaceService.InvitationResume inviter(@PathVariable UUID agenceId,
            @Valid @RequestBody InvitationRequest requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.inviter(agenceId, requete.email(), requete.fonction(), acteur);
    }

    @PatchMapping("/api/agence/{agenceId}/membres/{membreId}/fonction")
    @Operation(summary = "Modifier la fonction d'un collaborateur")
    public AgenceEspaceService.MembreResume modifierFonction(@PathVariable UUID agenceId,
            @PathVariable UUID membreId, @Valid @RequestBody FonctionRequest requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.modifierFonction(agenceId, membreId, requete.fonction(), acteur);
    }

    @PatchMapping("/api/agence/{agenceId}/membres/{membreId}/statut")
    @Operation(summary = "Activer ou suspendre un collaborateur")
    public AgenceEspaceService.MembreResume modifierStatut(@PathVariable UUID agenceId,
            @PathVariable UUID membreId, @Valid @RequestBody StatutRequest requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.modifierStatut(agenceId, membreId, requete.statut(), acteur);
    }

    @GetMapping("/api/admin/agences/{agenceId}/membres")
    @Operation(summary = "Superviser les membres d'une agence (administrateur)")
    public List<AgenceEspaceService.MembreResume> membresAdmin(@PathVariable UUID agenceId,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.listerMembresAdmin(agenceId, admin);
    }

    @PatchMapping("/api/admin/agences/{agenceId}/membres/{membreId}/statut")
    @Operation(summary = "Activer ou suspendre un membre d'agence (administrateur)")
    public AgenceEspaceService.MembreResume modifierStatutMembreAdmin(
            @PathVariable UUID agenceId, @PathVariable UUID membreId,
            @Valid @RequestBody StatutRequest requete,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.modifierStatutMembreAdmin(agenceId, membreId, requete.statut(), admin);
    }

    @PostMapping("/api/admin/agences/{agenceId}/responsable")
    @Operation(summary = "Désigner le responsable d'une agence (administrateur)")
    public AgenceEspaceService.MembreResume definirResponsable(@PathVariable UUID agenceId,
            @Valid @RequestBody ResponsableRequest requete,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.definirResponsable(agenceId, requete.email(), admin);
    }

    @GetMapping("/api/admin/agences")
    @Operation(summary = "Lister toutes les agences pour la supervision administrative")
    public List<AgenceEspaceService.AgenceAdminResume> agencesAdmin(
            @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.listerAgencesAdmin(admin);
    }

    @PatchMapping("/api/admin/agences/{agenceId}/statut")
    @Operation(summary = "Activer ou suspendre une agence")
    public AgenceEspaceService.AgenceAdminResume modifierStatutAgence(
            @PathVariable UUID agenceId, @Valid @RequestBody StatutAgenceRequest requete,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.modifierStatutAgence(agenceId, requete.statut(), admin);
    }

    public record InscriptionAgenceRequest(
        @NotBlank @jakarta.validation.constraints.Size(min = 2, max = 150) String nom,
        @jakarta.validation.constraints.Size(max = 2000) String description,
        @NotBlank @Email @jakarta.validation.constraints.Size(max = 254) String emailContact,
        @NotBlank @jakarta.validation.constraints.Size(max = 30) String telephoneContact,
        @NotBlank @jakarta.validation.constraints.Size(max = 255) String adresse) {}
    public record InvitationRequest(@NotBlank @Email String email, @NotNull FonctionAgence fonction) {}
    public record FonctionRequest(@NotNull FonctionAgence fonction) {}
    public record StatutRequest(@NotNull StatutMembreAgence statut) {}
    public record ResponsableRequest(@NotBlank @Email String email) {}
    public record StatutAgenceRequest(@NotNull StatutAgence statut) {}
    public record AgenceProfilPublicResponse(UUID id, String nom, String slug, String type, String description,
        String emailContact, String telephoneContact, String adresse, String logoUrl,
        java.time.Instant creeLe, List<AnnonceResponse> annonces) {}
}
