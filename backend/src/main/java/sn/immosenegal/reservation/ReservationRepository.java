package sn.immosenegal.reservation;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {
    List<Reservation> findByClientIdOrderByCreeLeDesc(UUID clientId);
    List<Reservation> findByAnnonceProprietaireIdOrderByCreeLeDesc(UUID proprietaireId);
    List<Reservation> findAllByOrderByCreeLeDesc();
    boolean existsByAnnonceIdAndClientIdAndStatut(UUID annonceId, UUID clientId, StatutReservation statut);
}
