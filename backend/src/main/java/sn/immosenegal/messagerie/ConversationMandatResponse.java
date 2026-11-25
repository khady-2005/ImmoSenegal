package sn.immosenegal.messagerie;

import java.time.Instant;
import java.util.UUID;
import sn.immosenegal.agence.MandatGestion;

public record ConversationMandatResponse(UUID mandatId, UUID annonceId, String annonceTitre,
        String agenceNom, String proprietaireNom, String interlocuteurNom, Instant creeLe,
        String dernierMessage, Instant dernierMessageLe) {
    static ConversationMandatResponse de(MandatGestion m, UUID acteurId, MessageMandatGestion dernier) {
        boolean proprietaire = m.getProprietaire().getId().equals(acteurId);
        return new ConversationMandatResponse(m.getId(), m.getAnnonce().getId(),
            m.getAnnonce().getTitre(), m.getAgence().getNom(), m.getProprietaire().getNomComplet(),
            proprietaire ? m.getAgence().getNom() : m.getProprietaire().getNomComplet(), m.getCreeLe(),
            dernier == null ? null : dernier.getContenu(), dernier == null ? null : dernier.getEnvoyeLe());
    }
}
