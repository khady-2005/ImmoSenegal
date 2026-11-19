package sn.immosenegal.offre;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
public record OffreAchatResponse(UUID id, UUID annonceId, String annonceTitre, String ville, String quartier,
 UUID acheteurId, String acheteurNom, String proprietaireNom, BigDecimal prixAnnonce, BigDecimal montantPropose,
 String message, StatutOffre statut, String reponseProprietaire, Instant creeLe, Instant modifieLe) {
 static OffreAchatResponse de(OffreAchat o){return new OffreAchatResponse(o.getId(),o.getAnnonce().getId(),
 o.getAnnonce().getTitre(),o.getAnnonce().getVille(),o.getAnnonce().getQuartier(),o.getAcheteur().getId(),
 o.getAcheteur().getNomComplet(),o.getAnnonce().getProprietaire().getNomComplet(),
 BigDecimal.valueOf(o.getAnnonce().getPrix()),o.getMontantPropose(),o.getMessage(),o.getStatut(),
 o.getReponseProprietaire(),o.getCreeLe(),o.getModifieLe());}
}