package sn.immosenegal.agence;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/agence/{agenceId}/ventes/{venteId}")
public class PaiementCommissionAgenceController {
    private final PaiementCommissionAgenceService service;

    public PaiementCommissionAgenceController(PaiementCommissionAgenceService service) {
        this.service = service;
    }

    @GetMapping("/paiements-commissions")
    public List<PaiementCommissionAgenceService.PaiementResume> lister(
            @PathVariable UUID agenceId, @PathVariable UUID venteId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.lister(agenceId, venteId, acteur);
    }

    @GetMapping("/solde-commissions")
    public PaiementCommissionAgenceService.SoldeResume solde(
            @PathVariable UUID agenceId, @PathVariable UUID venteId,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.solde(agenceId, venteId, acteur);
    }

    @PostMapping("/paiements-commissions")
    @ResponseStatus(HttpStatus.CREATED)
    public PaiementCommissionAgenceService.PaiementResume enregistrer(
            @PathVariable UUID agenceId, @PathVariable UUID venteId,
            @Valid @RequestBody Request q,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        return service.enregistrer(agenceId, venteId,
            new PaiementCommissionAgenceService.PaiementRequest(q.beneficiaire(), q.montant(),
                q.datePaiement(), q.modePaiement(), q.reference(), q.note()), acteur);
    }

    public record Request(@NotNull BeneficiaireCommission beneficiaire,
        @NotNull @DecimalMin(value = "0.01") BigDecimal montant,
        @NotNull LocalDate datePaiement, @NotBlank @Size(max = 30) String modePaiement,
        @Size(max = 150) String reference, @Size(max = 500) String note) {}
}
