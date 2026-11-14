package sn.immosenegal.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReinitialiserMotDePasseRequest(
    @NotBlank String token,
    @NotBlank @Size(min = 8, max = 72, message = "Le mot de passe doit contenir entre 8 et 72 caractères.")
    String nouveauMotDePasse
) {}
