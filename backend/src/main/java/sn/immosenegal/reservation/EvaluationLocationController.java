package sn.immosenegal.reservation;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/locations/{contratId}/evaluations")
public class EvaluationLocationController {
    private final EvaluationLocationService service;
    public EvaluationLocationController(EvaluationLocationService service){this.service=service;}
    @GetMapping public List<EvaluationLocationService.EvaluationResume> lister(@PathVariable UUID contratId,@AuthenticationPrincipal AuthenticatedUser acteur){return service.lister(contratId,acteur);}
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public EvaluationLocationService.EvaluationResume creer(@PathVariable UUID contratId,@Valid @RequestBody Requete q,@AuthenticationPrincipal AuthenticatedUser acteur){return service.creer(contratId,new EvaluationLocationService.CreationEvaluation(q.note(),q.commentaire()),acteur);}
    public record Requete(@Min(1) @Max(5) int note,@NotBlank @Size(max=1200) String commentaire){}
}
