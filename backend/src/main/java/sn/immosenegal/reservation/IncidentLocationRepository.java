package sn.immosenegal.reservation;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncidentLocationRepository extends JpaRepository<IncidentLocation, UUID> {
    List<IncidentLocation> findAllByContratIdOrderByCreeLeDesc(UUID contratId);
}
