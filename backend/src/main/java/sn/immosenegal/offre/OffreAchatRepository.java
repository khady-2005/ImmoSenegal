package sn.immosenegal.offre;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface OffreAchatRepository extends JpaRepository<OffreAchat, UUID> {
    List<OffreAchat> findByAcheteurIdOrderByCreeLeDesc(UUID acheteurId);
    List<OffreAchat> findByAnnonceProprietaireIdOrderByCreeLeDesc(UUID proprietaireId);
    boolean existsByAnnonceIdAndAcheteurIdAndStatut(UUID annonceId, UUID acheteurId, StatutOffre statut);
}