package sn.immosenegal.messagerie;

import java.util.UUID;
import sn.immosenegal.reservation.Reservation;

public record ConversationResponse(UUID reservationId, UUID annonceId,
        String annonceTitre, String interlocuteurNom, String statut,
        String dernierMessage, java.time.Instant dernierMessageLe) {
    static ConversationResponse de(Reservation r, UUID acteurId, String nomInterlocuteur, MessageConversation dernier) {
        return new ConversationResponse(r.getId(), r.getAnnonce().getId(),
            r.getAnnonce().getTitre(), nomInterlocuteur, r.getStatut().name(),
            dernier == null ? null : dernier.getContenu(), dernier == null ? null : dernier.getEnvoyeLe());
    }
}
