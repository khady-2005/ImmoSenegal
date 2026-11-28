package sn.immosenegal.agence;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DossierAgenceRepository extends JpaRepository<DossierAgence, UUID> {
    List<DossierAgence> findAllByAgenceIdOrderByCreeLeDesc(UUID agenceId);
}
