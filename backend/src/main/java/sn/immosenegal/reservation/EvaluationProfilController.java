package sn.immosenegal.reservation;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/locations/evaluations")
public class EvaluationProfilController {
    private final EvaluationLocationService service;
    public EvaluationProfilController(EvaluationLocationService service){this.service=service;}
    @GetMapping("/mon-resume")
    public EvaluationLocationService.ResumeProfil monResume(@AuthenticationPrincipal AuthenticatedUser acteur){return service.monResume(acteur);}
}
