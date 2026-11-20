package sn.immosenegal.abonnement;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AbonnementProprietaireRepository extends JpaRepository<AbonnementProprietaire, UUID> {
    List<AbonnementProprietaire> findAllByProprietaireIdOrderByCreeLeDesc(UUID proprietaireId);
    Optional<AbonnementProprietaire> findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(UUID proprietaireId, StatutAbonnement statut);
    List<AbonnementProprietaire> findAllByStatutOrderByCreeLeAsc(StatutAbonnement statut);
    List<AbonnementProprietaire> findAllByStatutAndDateFinBefore(StatutAbonnement statut, LocalDate date);
    Optional<AbonnementProprietaire> findByPaydunyaToken(String paydunyaToken);
    Optional<AbonnementProprietaire> findByPaytechRefCommand(String paytechRefCommand);
}