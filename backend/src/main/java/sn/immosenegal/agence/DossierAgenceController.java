package sn.immosenegal.agence;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;

@RestController
@RequestMapping("/api/agence/{agenceId}/dossiers")
@Transactional
public class DossierAgenceController {

    private final DossierAgenceRepository repo;
    private final MembreAgenceRepository membres;

    public DossierAgenceController(DossierAgenceRepository repo, MembreAgenceRepository membres) {
        this.repo = repo;
        this.membres = membres;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<DossierResume> lister(@PathVariable UUID agenceId,
                                      @AuthenticationPrincipal AuthenticatedUser acteur) {
        verifierAcces(agenceId, acteur);
        return repo.findAllByAgenceIdOrderByCreeLeDesc(agenceId).stream().map(this::versResume).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DossierResume creer(@PathVariable UUID agenceId,
                               @Valid @RequestBody CreerDossierRequest req,
                               @AuthenticationPrincipal AuthenticatedUser acteur) {
        verifierAcces(agenceId, acteur);
        DossierAgence d = repo.save(new DossierAgence(
            agenceId, acteur.id(), req.titre().trim(), req.categorie(),
            req.referenceClient() == null || req.referenceClient().isBlank() ? null : req.referenceClient().trim(),
            req.notes() == null || req.notes().isBlank() ? null : req.notes().trim()));
        return versResume(d);
    }

    @PatchMapping("/{dossierId}")
    public DossierResume maj(@PathVariable UUID agenceId, @PathVariable UUID dossierId,
                             @Valid @RequestBody MajDossierRequest req,
                             @AuthenticationPrincipal AuthenticatedUser acteur) {
        verifierAcces(agenceId, acteur);
        DossierAgence d = repo.findById(dossierId)
            .filter(item -> item.getAgenceId().equals(agenceId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier introuvable."));
        if (req.statut() != null) d.setStatut(req.statut());
        if (req.notes() != null) d.setNotes(req.notes().trim());
        return versResume(d);
    }

    private void verifierAcces(UUID agenceId, AuthenticatedUser acteur) {
        if (acteur.role() == Role.ADMIN) return;
        boolean autorise = membres.findByAgenceIdAndUtilisateurId(agenceId, acteur.id())
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE
                || m.getFonction() == FonctionAgence.ASSISTANT_ADMINISTRATIF
                || m.getFonction() == FonctionAgence.GESTIONNAIRE)
            .isPresent();
        if (!autorise) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Accès réservé à l'assistant administratif, au gestionnaire ou au responsable de cette agence.");
        }
    }

    private DossierResume versResume(DossierAgence d) {
        return new DossierResume(d.getId(), d.getAgenceId(), d.getTitre(),
            d.getCategorie().name(), d.getReferenceClient(), d.getStatut().name(),
            d.getNotes(), d.getCreeLe(), d.getModifieLe());
    }

    public record CreerDossierRequest(
        @NotBlank @Size(max = 150) String titre,
        @NotNull DossierAgence.CategorieDossier categorie,
        @Size(max = 150) String referenceClient,
        @Size(max = 2000) String notes) {}

    public record MajDossierRequest(
        DossierAgence.StatutDossier statut,
        @Size(max = 2000) String notes) {}

    public record DossierResume(
        UUID id, UUID agenceId, String titre, String categorie,
        String referenceClient, String statut, String notes,
        Instant creeLe, Instant modifieLe) {}
}
