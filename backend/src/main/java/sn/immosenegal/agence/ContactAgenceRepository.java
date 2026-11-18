package sn.immosenegal.agence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactAgenceRepository extends JpaRepository<ContactAgence, UUID> {
    List<ContactAgence> findAllByAgenceIdOrderByCreeLeDesc(UUID agenceId);
    List<ContactAgence> findAllByAgenceIdAndMembreAssigneIdOrderByCreeLeDesc(UUID agenceId, UUID membreId);
    Optional<ContactAgence> findByIdAndAgenceId(UUID id, UUID agenceId);
}
