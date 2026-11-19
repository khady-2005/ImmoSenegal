package sn.immosenegal.agence;
import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sn.immosenegal.security.AuthenticatedUser;
@RestController @RequestMapping("/api/agence/{agenceId}/ventes")
public class VenteAgenceController {
 private final VenteAgenceService service;
 public VenteAgenceController(VenteAgenceService s){service=s;}
 @GetMapping public List<VenteAgenceService.VenteResume> lister(@PathVariable UUID agenceId,@AuthenticationPrincipal AuthenticatedUser a){return service.lister(agenceId,a);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED)
 public VenteAgenceService.VenteResume creer(@PathVariable UUID agenceId,@Valid @RequestBody Request q,@AuthenticationPrincipal AuthenticatedUser a){
  return service.creer(agenceId,new VenteAgenceService.VenteRequest(q.annonceId(),q.agentMembreId(),q.acheteurNom(),q.acheteurTelephone(),q.prixVente(),q.tauxCommission(),q.partAgent(),q.dateVente()),a);
 }
 public record Request(@NotNull UUID annonceId,UUID agentMembreId,@NotBlank @Size(max=150) String acheteurNom,
  @Size(max=30) String acheteurTelephone,@NotNull @DecimalMin("1.00") BigDecimal prixVente,
  @NotNull @DecimalMin("0.00") @DecimalMax("20.00") BigDecimal tauxCommission,
  @NotNull @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal partAgent,@NotNull LocalDate dateVente){}
}