package sn.immosenegal.reservation;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EtatDesLieuxRepository extends JpaRepository<EtatDesLieux, UUID> {
    List<EtatDesLieux> findAllByContratIdOrderByCreeLeDesc(UUID contratId);
    boolean existsByContratIdAndType(UUID contratId, TypeEtatDesLieux type);
}
