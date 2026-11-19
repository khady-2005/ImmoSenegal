package sn.immosenegal.offre;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sn.immosenegal.security.AuthenticatedUser;
@RestController @RequestMapping("/api/offres")
public class OffreAchatController {
 private final OffreAchatService service; public OffreAchatController(OffreAchatService s){service=s;}
 @PostMapping("/annonces/{annonceId}") public ResponseEntity<OffreAchatResponse> creer(@PathVariable UUID annonceId,@Valid @RequestBody CreerOffreRequest r,@AuthenticationPrincipal AuthenticatedUser a){return ResponseEntity.status(HttpStatus.CREATED).body(service.creer(annonceId,r,a));}
 @GetMapping("/envoyees") public List<OffreAchatResponse> envoyees(@AuthenticationPrincipal AuthenticatedUser a){return service.envoyees(a);}
 @GetMapping("/recues") public List<OffreAchatResponse> recues(@AuthenticationPrincipal AuthenticatedUser a){return service.recues(a);}
 @PostMapping("/{id}/decision") public OffreAchatResponse decider(@PathVariable UUID id,@Valid @RequestBody DecisionOffreRequest r,@AuthenticationPrincipal AuthenticatedUser a){return service.decider(id,r,a);}
 @PostMapping("/{id}/annuler") public ResponseEntity<Void> annuler(@PathVariable UUID id,@AuthenticationPrincipal AuthenticatedUser a){service.annuler(id,a);return ResponseEntity.noContent().build();}
}