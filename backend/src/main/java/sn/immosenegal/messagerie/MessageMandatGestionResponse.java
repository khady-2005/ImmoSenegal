package sn.immosenegal.messagerie;

import java.time.Instant;
import java.util.UUID;

public record MessageMandatGestionResponse(UUID id, UUID mandatId, UUID expediteurId,
        String expediteurNom, String contenu, Instant envoyeLe) {
    static MessageMandatGestionResponse de(MessageMandatGestion m) {
        return new MessageMandatGestionResponse(m.getId(), m.getMandat().getId(),
            m.getExpediteur().getId(), m.getExpediteur().getNomComplet(),
            m.getContenu(), m.getEnvoyeLe());
    }
}
