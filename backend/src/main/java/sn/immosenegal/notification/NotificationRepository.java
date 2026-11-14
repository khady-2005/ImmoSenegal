package sn.immosenegal.notification;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findTop30ByDestinataireIdOrderByCreeLeDesc(UUID destinataireId);
    long countByDestinataireIdAndLueFalse(UUID destinataireId);
    Optional<Notification> findByIdAndDestinataireId(UUID id, UUID destinataireId);
}
