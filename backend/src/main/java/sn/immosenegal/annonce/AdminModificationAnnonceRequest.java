package sn.immosenegal.annonce;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Modification administrative d'une annonce avec justification obligatoire. */
public record AdminModificationAnnonceRequest(
    @NotNull @Valid AnnonceRequest annonce,
    @NotBlank @Size(max = 500) String motif
) {}
