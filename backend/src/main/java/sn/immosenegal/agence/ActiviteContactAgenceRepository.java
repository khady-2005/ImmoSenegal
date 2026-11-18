package sn.immosenegal.agence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActiviteContactAgenceRepository extends JpaRepository<ActiviteContactAgence, UUID> {
    List<ActiviteContactAgence> findAllByContactIdOrderByCreeLeDesc(UUID contactId);
}
