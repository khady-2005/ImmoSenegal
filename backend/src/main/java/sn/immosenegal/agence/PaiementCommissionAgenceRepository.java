package sn.immosenegal.agence;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaiementCommissionAgenceRepository extends JpaRepository<PaiementCommissionAgence, UUID> {
    List<PaiementCommissionAgence> findAllByVenteIdOrderByDatePaiementDescCreeLeDesc(UUID venteId);

    @Query("select coalesce(sum(p.montant), 0) from PaiementCommissionAgence p where p.vente.id = :venteId and p.beneficiaire = :beneficiaire")
    BigDecimal totalVerse(@Param("venteId") UUID venteId,
                          @Param("beneficiaire") BeneficiaireCommission beneficiaire);
}
