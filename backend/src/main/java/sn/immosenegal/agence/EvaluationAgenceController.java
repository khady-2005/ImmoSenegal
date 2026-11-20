package sn.immosenegal.agence;

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
@RequestMapping("/api/agence")
public class EvaluationAgenceController{
 private final EvaluationAgenceService service;
 public EvaluationAgenceController(EvaluationAgenceService service){this.service=service;}
 @GetMapping("/{agenceId}/evaluations") public EvaluationAgenceService.ResumeAgence resume(@PathVariable UUID agenceId){return service.resumeAgence(agenceId);}
 @GetMapping("/mandats/{mandatId}/evaluation") public EvaluationAgenceService.EvaluationResume monAvis(@PathVariable UUID mandatId,@AuthenticationPrincipal AuthenticatedUser acteur){return service.monEvaluation(mandatId,acteur);}
 @PostMapping("/mandats/{mandatId}/evaluation") @ResponseStatus(HttpStatus.CREATED)
 public EvaluationAgenceService.EvaluationResume creer(@PathVariable UUID mandatId,@Valid @RequestBody Requete q,@AuthenticationPrincipal AuthenticatedUser acteur){return service.creer(mandatId,q.note(),q.commentaire(),acteur);}
 public record Requete(@Min(1) @Max(5) int note,@NotBlank @Size(max=1200) String commentaire){}
}
