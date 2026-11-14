package sn.immosenegal.avis;

import java.time.Instant;
import java.util.UUID;

public record AvisResponse(UUID id, UUID annonceId, String auteurNom, int note, String commentaire, Instant creeLe) {
    public static AvisResponse de(Avis avis) {
        return new AvisResponse(avis.getId(), avis.getAnnonce().getId(), avis.getAuteur().getNomComplet(),
            avis.getNote(), avis.getCommentaire(), avis.getCreeLe());
    }
}
