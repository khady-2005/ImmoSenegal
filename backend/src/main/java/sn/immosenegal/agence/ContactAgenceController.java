package sn.immosenegal.agence;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import sn.immosenegal.config.OpenApiConfig;
import sn.immosenegal.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/agence/{agenceId}/crm/contacts")
@Tag(name = "CRM des agences")
@SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER)
public class ContactAgenceController {
    private final ContactAgenceService service;

    public ContactAgenceController(ContactAgenceService service) { this.service = service; }

    @GetMapping
    public List<ContactAgenceService.ContactResume> lister(@PathVariable UUID agenceId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.lister(agenceId, acteur);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContactAgenceService.ContactResume creer(@PathVariable UUID agenceId,
            @Valid @RequestBody CreationContactRequest requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.creer(agenceId, new ContactAgenceService.CreationContact(
            requete.nom(), requete.email(), requete.telephone(), requete.typeBesoin(),
            requete.recherche(), requete.ville(), requete.notes(), requete.membreAssigneId()), acteur);
    }

    @PatchMapping("/{contactId}")
    public ContactAgenceService.ContactResume modifier(@PathVariable UUID agenceId,
            @PathVariable UUID contactId, @RequestBody ModificationContactRequest requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.modifier(agenceId, contactId, new ContactAgenceService.ModificationContact(
            requete.statut(), requete.notes(), requete.membreAssigneId()), acteur);
    }

    @GetMapping("/{contactId}/activites")
    public List<ContactAgenceService.ActiviteResume> listerActivites(@PathVariable UUID agenceId,
            @PathVariable UUID contactId, @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.listerActivites(agenceId, contactId, acteur);
    }

    @PostMapping("/{contactId}/activites")
    @ResponseStatus(HttpStatus.CREATED)
    public ContactAgenceService.ActiviteResume ajouterActivite(@PathVariable UUID agenceId,
            @PathVariable UUID contactId, @Valid @RequestBody ActiviteRequest requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.ajouterActivite(agenceId, contactId,
            new ContactAgenceService.NouvelleActivite(requete.type(), requete.contenu()), acteur);
    }

    public record CreationContactRequest(@NotBlank @Size(max = 120) String nom,
        @Size(max = 254) String email, @Size(max = 30) String telephone,
        @NotBlank @Size(max = 20) String typeBesoin, @Size(max = 160) String recherche,
        @Size(max = 100) String ville, @Size(max = 2000) String notes, UUID membreAssigneId) {}
    public record ActiviteRequest(@NotBlank @Size(max = 20) String type,
        @NotBlank @Size(max = 2000) String contenu) {}
    public record ModificationContactRequest(StatutContactCrm statut,
        @Size(max = 2000) String notes, UUID membreAssigneId) {}
}
