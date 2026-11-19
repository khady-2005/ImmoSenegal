package sn.immosenegal.messagerie;

import java.time.Instant;
import java.util.UUID;
import sn.immosenegal.agence.MandatGestion;

public record ConversationMandatResponse(UUID mandatId, UUID annonceId, String annonceTitre,
        String agenceNom, String proprietaireNom, String interlocuteurNom, Instant creeLe) {
    static ConversationMandatResponse de(MandatGestion m, UUID acteurId) {
        boolean proprietaire = m.getProprietaire().getId().equals(acteurId);
        return new ConversationMandatResponse(m.getId(), m.getAnnonce().getId(),
            m.getAnnonce().getTitre(), m.getAgence().getNom(), m.getProprietaire().getNomComplet(),
            proprietaire ? m.getAgence().getNom() : m.getProprietaire().getNomComplet(), m.getCreeLe());
    }
}
