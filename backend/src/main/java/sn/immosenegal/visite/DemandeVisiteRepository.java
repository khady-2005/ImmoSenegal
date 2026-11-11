package sn.immosenegal.visite;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DemandeVisiteRepository extends JpaRepository<DemandeVisite, UUID> {
    List<DemandeVisite> findByClientIdOrderByCreeLeDesc(UUID clientId);
    List<DemandeVisite> findByAnnonceProprietaireIdOrderByCreeLeDesc(UUID proprietaireId);
    List<DemandeVisite> findAllByOrderByCreeLeDesc();
}
