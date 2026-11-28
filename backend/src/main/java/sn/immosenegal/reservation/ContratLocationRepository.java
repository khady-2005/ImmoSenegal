package sn.immosenegal.reservation;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ContratLocationRepository extends JpaRepository<ContratLocation,UUID>{
 List<ContratLocation> findAllByProprietaireIdOrderByCreeLeDesc(UUID id);
 List<ContratLocation> findAllByLocataireIdOrderByCreeLeDesc(UUID id);
 List<ContratLocation> findAllByAnnonceIdInOrderByCreeLeDesc(Collection<UUID> annonceIds);
 boolean existsByReservationId(UUID id);
 boolean existsByAnnonceIdAndEtatIn(UUID annonceId, Collection<EtatContratLocation> etats);
 List<ContratLocation> findAllByOrderByCreeLeDesc();
}
