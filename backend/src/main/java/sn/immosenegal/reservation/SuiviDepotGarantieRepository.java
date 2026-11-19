package sn.immosenegal.reservation;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SuiviDepotGarantieRepository extends JpaRepository<SuiviDepotGarantie, UUID> {
    Optional<SuiviDepotGarantie> findByContratId(UUID contratId);
    List<SuiviDepotGarantie> findAllByStatut(StatutDepotGarantie statut);
}
