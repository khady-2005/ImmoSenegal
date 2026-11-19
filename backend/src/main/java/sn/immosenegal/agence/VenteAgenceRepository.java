package sn.immosenegal.agence;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface VenteAgenceRepository extends JpaRepository<VenteAgence, UUID> {
 List<VenteAgence> findAllByAgenceIdOrderByDateVenteDesc(UUID agenceId);
 List<VenteAgence> findAllByAgenceIdAndAgentIdOrderByDateVenteDesc(UUID agenceId, UUID agentId);
 boolean existsByAnnonceId(UUID annonceId);
}