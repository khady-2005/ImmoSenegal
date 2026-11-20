package sn.immosenegal.reservation;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommissionLocationAgenceRepository extends JpaRepository<CommissionLocationAgence, UUID> {
    Optional<CommissionLocationAgence> findByPaiementLoyerId(UUID paiementLoyerId);
    List<CommissionLocationAgence> findAllByAgenceIdOrderByCreeLeDesc(UUID agenceId);
}
