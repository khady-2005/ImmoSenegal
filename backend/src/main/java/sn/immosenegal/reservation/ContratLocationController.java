package sn.immosenegal.reservation;
import java.util.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sn.immosenegal.security.AuthenticatedUser;
@RestController @RequestMapping("/api/locations")
public class ContratLocationController{
 private final ContratLocationService service;
 public ContratLocationController(ContratLocationService s){service=s;}
 @PostMapping("/reservations/{reservationId}/contrat") @ResponseStatus(HttpStatus.CREATED)
 public ContratLocationService.ContratResume creer(@PathVariable UUID reservationId,@Valid @RequestBody ContratRequest q,@AuthenticationPrincipal AuthenticatedUser a){return service.creer(reservationId,new ContratLocationService.CreationContrat(q.loyerMensuel(),q.depotGarantie(),q.dateDebut(),q.dateFin()),a);}
 @GetMapping("/mes-contrats") public List<ContratLocationService.ContratResume> mesContrats(@AuthenticationPrincipal AuthenticatedUser a){return service.mesContrats(a);}
 @GetMapping("/admin/supervision") public List<ContratLocationService.SupervisionContratResume> supervisionAdmin(@AuthenticationPrincipal AuthenticatedUser a){return service.supervisionAdmin(a);}
 @PostMapping("/{contratId}/paiements") @ResponseStatus(HttpStatus.CREATED)
 public ContratLocationService.PaiementResume paiement(@PathVariable UUID contratId,@Valid @RequestBody PaiementRequest q,@AuthenticationPrincipal AuthenticatedUser a){return service.enregistrerPaiement(contratId,new ContratLocationService.CreationPaiement(q.montant(),q.periode(),q.datePaiement(),q.reference()),a);}
 @GetMapping("/{contratId}/paiements") public List<ContratLocationService.PaiementResume> paiements(@PathVariable UUID contratId,@AuthenticationPrincipal AuthenticatedUser a){return service.paiements(contratId,a);}
 @PatchMapping("/{contratId}/resiliation-demande")
 public ContratLocationService.ContratResume demanderResiliation(@PathVariable UUID contratId,@AuthenticationPrincipal AuthenticatedUser a){return service.demanderResiliation(contratId,a);}
 @PatchMapping("/{contratId}/resiliation-decision")
 public ContratLocationService.ContratResume deciderResiliation(@PathVariable UUID contratId,@Valid @RequestBody DecisionResiliationRequest q,@AuthenticationPrincipal AuthenticatedUser a){return service.deciderResiliation(contratId,q.accepter(),a);}
 @PatchMapping("/{contratId}/resiliation-annulation")
 public ContratLocationService.ContratResume annulerDemandeResiliation(@PathVariable UUID contratId,@AuthenticationPrincipal AuthenticatedUser a){return service.annulerDemandeResiliation(contratId,a);}
 public record ContratRequest(@NotNull @DecimalMin("0.01") BigDecimal loyerMensuel,@NotNull @DecimalMin("0.00") BigDecimal depotGarantie,@NotNull LocalDate dateDebut,LocalDate dateFin){}
 public record DecisionResiliationRequest(@NotNull Boolean accepter){}
 public record PaiementRequest(@NotNull @DecimalMin("0.01") BigDecimal montant,@NotNull LocalDate periode,@NotNull LocalDate datePaiement,@Size(max=500) String reference){}
}
