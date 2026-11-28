package sn.immosenegal.agence;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import sn.immosenegal.config.OpenApiConfig;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api")
@Tag(name = "Candidatures aux agences")
@SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER)
public class CandidatureAgenceController {
    private final CandidatureAgenceService service;

    public CandidatureAgenceController(CandidatureAgenceService service) {
        this.service = service;
    }

    @PostMapping(value = "/agence/{agenceId}/candidatures", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Envoyer une candidature pour rejoindre une agence (avec CV privé)")
    public CandidatureAgenceService.CandidatureResume postuler(@PathVariable UUID agenceId,
            @RequestParam FonctionAgence fonction,
            @RequestParam String telephone,
            @RequestParam String zone,
            @RequestParam String motivation,
            @RequestParam("cv") MultipartFile cv,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.postuler(agenceId, fonction, telephone, zone, motivation, cv, acteur);
    }

    @GetMapping("/agence/{agenceId}/candidatures/{candidatureId}/cv")
    @Operation(summary = "Télécharger le CV privé d'une candidature (candidat ou responsable autorisé)")
    public ResponseEntity<byte[]> telechargerCv(@PathVariable UUID agenceId, @PathVariable UUID candidatureId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        CandidatureAgence c = service.telechargerCv(agenceId, candidatureId, acteur);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(c.getCvTypeMime()))
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(c.getCvNom()).build().toString())
            .header("X-Content-Type-Options", "nosniff")
            .body(c.getCvContenu());
    }

    @GetMapping("/mes-candidatures-agence")
    @Operation(summary = "Consulter mes candidatures aux agences")
    public List<CandidatureAgenceService.CandidatureResume> mesCandidatures(
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.mesCandidatures(acteur);
    }

    @GetMapping("/agence/{agenceId}/candidatures")
    @Operation(summary = "Lister les candidatures reçues par une agence")
    public List<CandidatureAgenceService.CandidatureResume> candidaturesAgence(
            @PathVariable UUID agenceId, @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.candidaturesAgence(agenceId, acteur);
    }

    @PostMapping("/agence/{agenceId}/candidatures/{candidatureId}/decision")
    @Operation(summary = "Accepter ou refuser une candidature à une agence")
    public CandidatureAgenceService.CandidatureResume decider(@PathVariable UUID agenceId,
            @PathVariable UUID candidatureId, @Valid @RequestBody DecisionRequest requete,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.decider(agenceId, candidatureId, requete.accepter(), acteur);
    }

    public record CandidatureRequest(@NotNull FonctionAgence fonction) {}
    public record DecisionRequest(boolean accepter) {}
}
