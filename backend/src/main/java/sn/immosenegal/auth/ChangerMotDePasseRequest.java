package sn.immosenegal.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangerMotDePasseRequest(
    @NotBlank @Size(max = 72) @Schema(accessMode = Schema.AccessMode.WRITE_ONLY) String motDePasseActuel,
    @NotBlank @Size(min = 8, max = 72, message = "Le nouveau mot de passe doit contenir entre 8 et 72 caractères.")
    @Schema(accessMode = Schema.AccessMode.WRITE_ONLY) String nouveauMotDePasse
) {}
