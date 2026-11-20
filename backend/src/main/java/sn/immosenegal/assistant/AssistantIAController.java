package sn.immosenegal.assistant;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assistant")
public class AssistantIAController {
    private final AssistantIAService service;
    public AssistantIAController(AssistantIAService service) { this.service = service; }
    @PostMapping("/conversation")
    public Reponse repondre(@Valid @RequestBody Question question) {
        return new Reponse(service.repondre(question.message()));
    }
    public record Question(@NotBlank @Size(max = 1000) String message) {}
    public record Reponse(String reponse) {}
}
