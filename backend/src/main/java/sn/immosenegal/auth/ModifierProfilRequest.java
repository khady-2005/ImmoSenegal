package sn.immosenegal.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ModifierProfilRequest(
    @NotBlank @Size(min = 2, max = 120) String nomComplet,
    @Size(max = 20) @Pattern(regexp = "^$|^[+0-9().\\s-]{7,20}$", message = "Le numéro de téléphone est invalide.") String telephone
) {}
