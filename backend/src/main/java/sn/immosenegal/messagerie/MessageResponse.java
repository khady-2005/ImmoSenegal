package sn.immosenegal.messagerie;

import java.time.Instant;
import java.util.UUID;

public record MessageResponse(UUID id, UUID reservationId, UUID expediteurId,
        String expediteurNom, String contenu, Instant envoyeLe) {
    static MessageResponse de(MessageConversation m) {
        return new MessageResponse(m.getId(), m.getReservation().getId(),
            m.getExpediteur().getId(), m.getExpediteur().getNomComplet(),
            m.getContenu(), m.getEnvoyeLe());
    }
}