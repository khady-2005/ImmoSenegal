package sn.immosenegal.reservation;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface EvaluationLocationRepository extends JpaRepository<EvaluationLocation, UUID> {
    List<EvaluationLocation> findAllByContratIdOrderByCreeLeDesc(UUID contratId);
    boolean existsByContratIdAndAuteurId(UUID contratId, UUID auteurId);
}
