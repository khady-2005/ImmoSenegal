package sn.immosenegal.messagerie;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EnvoyerMessageRequest(
    @NotBlank @Size(max = 2000) String contenu
) {}