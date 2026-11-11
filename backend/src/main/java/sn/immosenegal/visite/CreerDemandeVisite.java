package sn.immosenegal.visite;

import java.time.LocalDateTime;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreerDemandeVisite(
    @NotNull @Future LocalDateTime dateVisite,
    @Size(max = 1000) String message
) {}
