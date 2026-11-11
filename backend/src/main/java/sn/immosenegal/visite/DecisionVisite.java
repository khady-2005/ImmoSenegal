package sn.immosenegal.visite;

import java.time.LocalDateTime;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DecisionVisite(
    @NotNull StatutVisite action,
    @Future LocalDateTime nouvelleDate,
    @Size(max = 1000) String reponse
) {}
