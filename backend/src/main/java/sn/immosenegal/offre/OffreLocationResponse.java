package sn.immosenegal.offre;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record OffreLocationResponse(
    UUID id, UUID annonceId, String annonceTitre, String ville, String quartier,
    UUID locataireId, String locataireNom, String proprietaireNom,
    BigDecimal loyerAffiche, BigDecimal loyerPropose, String message,
    StatutOffre statut, String reponseDecideur, Instant creeLe, Instant modifieLe
) {
    static OffreLocationResponse de(OffreLocation o) {
        return new OffreLocationResponse(o.getId(), o.getAnnonce().getId(),
            o.getAnnonce().getTitre(), o.getAnnonce().getVille(), o.getAnnonce().getQuartier(),
            o.getLocataire().getId(), o.getLocataire().getNomComplet(),
            o.getAnnonce().getProprietaire().getNomComplet(),
            BigDecimal.valueOf(o.getAnnonce().getPrix()), o.getLoyerPropose(),
            o.getMessage(), o.getStatut(), o.getReponseDecideur(), o.getCreeLe(), o.getModifieLe());
    }
}
