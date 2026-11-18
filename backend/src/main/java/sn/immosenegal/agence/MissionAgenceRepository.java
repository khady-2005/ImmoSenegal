package sn.immosenegal.agence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MissionAgenceRepository extends JpaRepository<MissionAgence, UUID> {
    List<MissionAgence> findAllByAgenceIdOrderByCreeLeDesc(UUID agenceId);
    List<MissionAgence> findAllByAgenceIdAndMembreIdOrderByCreeLeDesc(UUID agenceId, UUID membreId);
    Optional<MissionAgence> findByIdAndAgenceId(UUID id, UUID agenceId);
}
