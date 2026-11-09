package sn.immosenegal.annonce;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Corps d'un refus, d'une suspension ou d'une demande de correction : le motif est montré au propriétaire. */
public record ModerationRequest(@NotBlank @Size(max = 500) String motif) {
}
