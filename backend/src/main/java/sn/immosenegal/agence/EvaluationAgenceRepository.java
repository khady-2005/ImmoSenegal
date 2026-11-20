package sn.immosenegal.agence;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface EvaluationAgenceRepository extends JpaRepository<EvaluationAgence,UUID>{
 List<EvaluationAgence> findAllByMandatAgenceIdOrderByCreeLeDesc(UUID agenceId);
 boolean existsByMandatId(UUID mandatId);
 java.util.Optional<EvaluationAgence> findByMandatId(UUID mandatId);
}
