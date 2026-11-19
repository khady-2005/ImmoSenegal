package sn.immosenegal.agence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MandatGestionRepository extends JpaRepository<MandatGestion, UUID> {
    List<MandatGestion> findAllByAgenceIdOrderByCreeLeDesc(UUID agenceId);
    List<MandatGestion> findAllByAgenceIdAndStatutOrderByCreeLeDesc(UUID agenceId, StatutMandatGestion statut);
    List<MandatGestion> findAllByProprietaireIdOrderByCreeLeDesc(UUID proprietaireId);
    Optional<MandatGestion> findByIdAndProprietaireId(UUID id, UUID proprietaireId);
    boolean existsByAgenceIdAndAnnonceId(UUID agenceId, UUID annonceId);
    boolean existsByAgenceIdAndAnnonceIdAndStatut(UUID agenceId, UUID annonceId, StatutMandatGestion statut);
}
