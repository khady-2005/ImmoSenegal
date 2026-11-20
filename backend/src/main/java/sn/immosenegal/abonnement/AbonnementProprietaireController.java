package sn.immosenegal.abonnement;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/abonnements")
public class AbonnementProprietaireController {
    private final AbonnementProprietaireService service;

    public AbonnementProprietaireController(AbonnementProprietaireService service) {
        this.service = service;
    }

    @PostMapping("/demande")
    @ResponseStatus(HttpStatus.CREATED)
    public AbonnementProprietaireService.Resume demander(
            @Valid @RequestBody DemandeRequest q,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.demander(new AbonnementProprietaireService.Demande(q.forfait(), q.modePaiement(),
            q.referencePaiement(), q.note()), acteur);
    }

    @GetMapping("/historique")
    public List<AbonnementProprietaireService.Resume> historique(
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.historique(acteur);
    }

    @GetMapping("/admin/en-attente")
    public List<AbonnementProprietaireService.Resume> demandesAdmin(
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.demandesAdmin(acteur);
    }

    @PostMapping("/admin/{id}/decision")
    public AbonnementProprietaireService.Resume decider(@PathVariable UUID id,
            @Valid @RequestBody DecisionRequest q,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.decider(id, new AbonnementProprietaireService.Decision(q.accepter(), q.motif()), acteur);
    }

    public record DemandeRequest(@NotNull ForfaitAbonnement forfait,
        @jakarta.validation.constraints.NotBlank @Size(max = 30) String modePaiement,
        @Size(max = 150) String referencePaiement, @Size(max = 1000) String note) {}
    public record DecisionRequest(boolean accepter, @Size(max = 1000) String motif) {}
}
