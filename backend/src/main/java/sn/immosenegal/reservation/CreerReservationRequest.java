package sn.immosenegal.reservation;

import jakarta.validation.constraints.Size;

public record CreerReservationRequest(
    @Size(max = 1000, message = "Le message ne peut pas dépasser 1000 caractères.")
    String message
) {}
