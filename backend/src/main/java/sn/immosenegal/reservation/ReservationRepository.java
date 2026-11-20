package sn.immosenegal.reservation;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {
    List<Reservation> findByClientIdOrderByCreeLeDesc(UUID clientId);
    List<Reservation> findByAnnonceProprietaireIdOrderByCreeLeDesc(UUID proprietaireId);
    List<Reservation> findAllByAnnonceIdInOrderByCreeLeDesc(List<UUID> annonceIds);
    List<Reservation> findAllByOrderByCreeLeDesc();
    @Query("""
        select r from Reservation r
        where exists (
            select m.id from MandatGestion m
            where m.annonce = r.annonce
              and m.agence.id = :agenceId
              and m.statut = sn.immosenegal.agence.StatutMandatGestion.ACCEPTE
        )
        order by r.creeLe desc
        """)
    List<Reservation> findAllByAgenceMandatAccepte(@Param("agenceId") UUID agenceId);
    boolean existsByAnnonceIdAndClientIdAndStatut(UUID annonceId, UUID clientId, StatutReservation statut);
}
