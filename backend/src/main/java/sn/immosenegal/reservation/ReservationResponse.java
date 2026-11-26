package sn.immosenegal.reservation;

import java.time.Instant;
import java.util.UUID;

public record ReservationResponse(
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
    String message,
    StatutReservation statut,
    String reponseProprietaire,
    Instant creeLe,
    Instant modifieLe,
    String gestionType,
    String agenceNom
) {
    public static ReservationResponse de(Reservation r) {
        return new ReservationResponse(
            r.getId(), r.getAnnonce().getId(), r.getAnnonce().getTitre(),
            r.getAnnonce().getVille(), r.getAnnonce().getQuartier(),
            r.getClient().getId(), r.getClient().getNomComplet(),
            r.getClient().getEmail(), r.getClient().getTelephone(),
            r.getAnnonce().getProprietaire().getNomComplet(),
            r.getMessage(), r.getStatut(), r.getReponseProprietaire(),
            r.getCreeLe(), r.getModifieLe(), null, null
        );
    }
}
