package sn.immosenegal.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DemandeReinitialisationRequest(
    @NotBlank @Email @Size(max = 254) String email
) {}
