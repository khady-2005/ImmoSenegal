package sn.immosenegal.agence;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
public interface VenteAgenceRepository extends JpaRepository<VenteAgence, UUID> {
 List<VenteAgence> findAllByAgenceIdOrderByDateVenteDesc(UUID agenceId);
 List<VenteAgence> findAllByAgenceIdAndAgentIdOrderByDateVenteDesc(UUID agenceId, UUID agentId);
 boolean existsByAnnonceId(UUID annonceId);
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select v from VenteAgence v where v.id = :id")
 Optional<VenteAgence> trouverPourMiseAJour(@Param("id") UUID id);
}