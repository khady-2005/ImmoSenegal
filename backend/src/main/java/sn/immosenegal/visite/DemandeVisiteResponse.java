package sn.immosenegal.visite;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

public record DemandeVisiteResponse(
    UUID id,
    UUID annonceId,
    String annonceTitre,
    String ville,
    String quartier,
    UUID clientId,
    String clientNom,
    String clientEmail,
    String clientTelephone,
    String proprietaireNom,
    LocalDateTime dateVisite,
    String message,
    StatutVisite statut,
    String reponseProprietaire,
    Instant creeLe,
    Instant modifieLe,
    String gestionType,
    String agenceNom
) {
    public static DemandeVisiteResponse de(DemandeVisite d) {
        return new DemandeVisiteResponse(
            d.getId(), d.getAnnonce().getId(), d.getAnnonce().getTitre(),
            d.getAnnonce().getVille(), d.getAnnonce().getQuartier(),
            d.getClient().getId(), d.getClient().getNomComplet(),
            d.getClient().getEmail(), d.getClient().getTelephone(),
            d.getAnnonce().getProprietaire().getNomComplet(),
            d.getDateVisite(), d.getMessage(), d.getStatut(),
            d.getReponseProprietaire(), d.getCreeLe(), d.getModifieLe(), null, null
        );
    }
}
