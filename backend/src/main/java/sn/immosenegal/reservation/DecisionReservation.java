package sn.immosenegal.reservation;

import jakarta.validation.constraints.Size;

public record DecisionReservation(
    StatutReservation action,
    @Size(max = 1000, message = "La réponse ne peut pas dépasser 1000 caractères.")
    String reponse
) {}
