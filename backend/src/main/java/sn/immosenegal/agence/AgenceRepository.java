package sn.immosenegal.agence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AgenceRepository extends JpaRepository<Agence, UUID> {
    Optional<Agence> findBySlug(String slug);
    List<Agence> findAllByStatutOrderByNomAsc(StatutAgence statut);
    Optional<Agence> findFirstByTypeAndStatutOrderByCreeLeAsc(AgenceType type, StatutAgence statut);
    boolean existsBySlug(String slug);
}
