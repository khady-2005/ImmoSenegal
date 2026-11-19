package sn.immosenegal.offre;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OffreLocationRepository extends JpaRepository<OffreLocation, UUID> {
    List<OffreLocation> findByLocataireIdOrderByCreeLeDesc(UUID locataireId);
    List<OffreLocation> findByAnnonceProprietaireIdOrderByCreeLeDesc(UUID proprietaireId);
    List<OffreLocation> findByAnnonceIdInOrderByCreeLeDesc(List<UUID> annonceIds);
    boolean existsByAnnonceIdAndLocataireIdAndStatut(UUID annonceId, UUID locataireId, StatutOffre statut);
}
