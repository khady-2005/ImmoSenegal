package sn.immosenegal.agence;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sn.immosenegal.config.OpenApiConfig;
import sn.immosenegal.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
@RestController @RequestMapping("/api/agence/{agenceId}/caisse") @Tag(name="Caisse des agences") @SecurityRequirement(name=OpenApiConfig.SCHEMA_BEARER)
public class MouvementCaisseAgenceController {
 private final MouvementCaisseAgenceService service;
 public MouvementCaisseAgenceController(MouvementCaisseAgenceService s){service=s;}
 @GetMapping public List<MouvementCaisseAgenceService.MouvementResume> lister(@PathVariable UUID agenceId,@AuthenticationPrincipal AuthenticatedUser a){return service.lister(agenceId,a);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public MouvementCaisseAgenceService.MouvementResume creer(@PathVariable UUID agenceId,@Valid @RequestBody CreationRequest q,@AuthenticationPrincipal AuthenticatedUser a){return service.creer(agenceId,new MouvementCaisseAgenceService.CreationMouvement(q.type(),q.libelle(),q.description(),q.montant(),q.dateMouvement(),q.justificatifUrl()),a);}
 @PatchMapping("/{mouvementId}/decision") public MouvementCaisseAgenceService.MouvementResume traiter(@PathVariable UUID agenceId,@PathVariable UUID mouvementId,@Valid @RequestBody DecisionRequest q,@AuthenticationPrincipal AuthenticatedUser a){return service.traiter(agenceId,mouvementId,new MouvementCaisseAgenceService.DecisionMouvement(q.valider(),q.motif()),a);}
 public record CreationRequest(@NotNull TypeMouvementCaisse type,@NotBlank @Size(max=140) String libelle,@Size(max=1000) String description,@NotNull @DecimalMin("0.01") @Digits(integer=14,fraction=2) java.math.BigDecimal montant,@NotNull java.time.LocalDate dateMouvement,@Size(max=500) String justificatifUrl){}
 public record DecisionRequest(boolean valider,@Size(max=500) String motif){}
}
