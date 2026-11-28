package sn.immosenegal.admin;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import sn.immosenegal.config.OpenApiConfig;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;

@RestController
@RequestMapping("/api/auth/role-requests")
@Tag(name = "Authentification")
@SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER)
public class RoleRequestController {

    private final DemandeRoleService service;

    public RoleRequestController(DemandeRoleService service) {
        this.service = service;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Demander le rôle PROPRIETAIRE (justificatif obligatoire) ou AGENT")
    public ResponseEntity<DemandeRoleResponse> demanderAvecJustificatif(
            @RequestParam("role") Role role,
            @RequestParam(value = "justificatif", required = false) MultipartFile justificatif,
            @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(service.demander(utilisateur.id(), role, justificatif));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Demander le rôle AGENT (PROPRIETAIRE requiert un justificatif en multipart)")
    public ResponseEntity<DemandeRoleResponse> demanderJson(
            @Valid @RequestBody DemandeRoleRequest requete,
            @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(service.demander(utilisateur.id(), requete.role()));
    }

    @GetMapping("/ma-demande")
    @Operation(summary = "Consulter sa dernière demande de rôle")
    public ResponseEntity<DemandeRoleResponse> maDemande(@AuthenticationPrincipal AuthenticatedUser utilisateur) {
        DemandeRoleResponse r = service.maDemande(utilisateur.id());
        return r == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(r);
    }

    @GetMapping("/a-traiter")
    @Operation(summary = "Lister les demandes de rôle (ADMIN ou responsable de l'agence ImmoSénégal)")
    public List<DemandeRoleResponse> aTraiter(
            @RequestParam(required = false) StatutDemande statut,
            @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        return service.listerPourDecision(statut, utilisateur);
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Approuver une demande (ADMIN ou responsable de l'agence ImmoSénégal)")
    public DemandeRoleResponse approuver(
            @PathVariable UUID id,
            @RequestBody(required = false) DecisionMotifRequest body,
            @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        return service.approuver(id, utilisateur, body == null ? null : body.motif());
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Refuser une demande (ADMIN ou responsable de l'agence ImmoSénégal)")
    public DemandeRoleResponse refuser(
            @PathVariable UUID id,
            @RequestBody(required = false) DecisionMotifRequest body,
            @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        return service.refuser(id, utilisateur, body == null ? null : body.motif());
    }

    @GetMapping("/{id}/justificatif")
    @Operation(summary = "Télécharger le justificatif privé (demandeur, ADMIN ou responsable ImmoSénégal uniquement)")
    public ResponseEntity<byte[]> justificatif(
            @PathVariable UUID id,
            @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        DemandeRoleService.JustificatifFichier f = service.lireJustificatif(id, utilisateur);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(f.typeMime()))
            .header(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.inline().filename(f.nom()).build().toString())
            .header("Content-Security-Policy", "default-src 'none'; sandbox")
            .body(f.contenu());
    }

    public record DecisionMotifRequest(String motif) {}
}
