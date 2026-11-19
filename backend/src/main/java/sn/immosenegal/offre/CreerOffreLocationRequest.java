package sn.immosenegal.offre;

import java.math.BigDecimal;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreerOffreLocationRequest(
    @NotNull @DecimalMin(value = "1.00") BigDecimal loyerPropose,
    @Size(max = 1000) String message
) {}
