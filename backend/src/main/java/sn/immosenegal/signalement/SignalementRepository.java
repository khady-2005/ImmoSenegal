package sn.immosenegal.signalement;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SignalementRepository extends JpaRepository<Signalement, UUID> {
    List<Signalement> findAllByAuteurIdOrderByCreeLeDesc(UUID auteurId);
    List<Signalement> findAllByOrderByCreeLeDesc();
}
