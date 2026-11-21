package sn.immosenegal.visite;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


public interface DemandeVisiteRepository extends JpaRepository<DemandeVisite, UUID> {
    List<DemandeVisite> findByClientIdOrderByCreeLeDesc(UUID clientId);
    List<DemandeVisite> findByAnnonceProprietaireIdOrderByCreeLeDesc(UUID proprietaireId);
    List<DemandeVisite> findAllByAnnonceIdInOrderByCreeLeDesc(List<UUID> annonceIds);
    List<DemandeVisite> findAllByOrderByCreeLeDesc();
    @Query("""
        select d from DemandeVisite d
        where exists (
            select m.id from MandatGestion m
            where m.annonce = d.annonce
              and m.agence.id = :agenceId
              and m.statut = sn.immosenegal.agence.StatutMandatGestion.ACCEPTE
        )
        order by d.creeLe desc
        """)
    List<DemandeVisite> findAllByAgenceMandatAccepte(@Param("agenceId") UUID agenceId);

    boolean existsByAnnonceIdAndClientIdAndStatut(UUID annonceId, UUID clientId, StatutVisite statut);

    boolean existsByAnnonceIdAndClientIdAndStatutAndDateVisiteBefore(UUID annonceId, UUID clientId, StatutVisite statut, java.time.LocalDateTime dateVisite);
}
