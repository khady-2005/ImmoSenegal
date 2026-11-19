package sn.immosenegal.reservation;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ContratLocationRepository extends JpaRepository<ContratLocation,UUID>{
 List<ContratLocation> findAllByProprietaireIdOrderByCreeLeDesc(UUID id);
 List<ContratLocation> findAllByLocataireIdOrderByCreeLeDesc(UUID id);
 boolean existsByReservationId(UUID id);
 List<ContratLocation> findAllByOrderByCreeLeDesc();
}
