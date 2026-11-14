package sn.immosenegal.avis;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AvisRepository extends JpaRepository<Avis, UUID> {
    List<Avis> findByAnnonceIdOrderByCreeLeDesc(UUID annonceId);
    boolean existsByAnnonceIdAndAuteurId(UUID annonceId, UUID auteurId);
}
