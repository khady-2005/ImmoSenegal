package sn.immosenegal.admin;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DemandeRoleRepository extends JpaRepository<DemandeRole, UUID> {

    boolean existsByUserIdAndStatut(UUID userId, StatutDemande statut);

    Optional<DemandeRole> findFirstByUserIdOrderByCreeLeDesc(UUID userId);

    List<DemandeRole> findByStatutOrderByCreeLeAsc(StatutDemande statut);

    List<DemandeRole> findAllByOrderByCreeLeDesc();
}
