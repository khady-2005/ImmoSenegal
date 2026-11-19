package sn.immosenegal.messagerie;

import java.util.UUID;
import sn.immosenegal.reservation.Reservation;

public record ConversationResponse(UUID reservationId, UUID annonceId,
        String annonceTitre, String interlocuteurNom, String statut) {
    static ConversationResponse de(Reservation r, UUID acteurId) {
        boolean client = r.getClient().getId().equals(acteurId);
        return new ConversationResponse(r.getId(), r.getAnnonce().getId(),
            r.getAnnonce().getTitre(),
            client ? r.getAnnonce().getProprietaire().getNomComplet() : r.getClient().getNomComplet(),
            r.getStatut().name());
    }
}