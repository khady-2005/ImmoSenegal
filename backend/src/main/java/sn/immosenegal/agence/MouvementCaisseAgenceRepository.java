package sn.immosenegal.agence;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface MouvementCaisseAgenceRepository extends JpaRepository<MouvementCaisseAgence, UUID> {
 List<MouvementCaisseAgence> findAllByAgenceIdOrderByDateMouvementDescCreeLeDesc(UUID agenceId);
 Optional<MouvementCaisseAgence> findByIdAndAgenceId(UUID id, UUID agenceId);
}
