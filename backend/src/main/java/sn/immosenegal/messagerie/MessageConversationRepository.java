package sn.immosenegal.messagerie;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageConversationRepository extends JpaRepository<MessageConversation, UUID> {
    List<MessageConversation> findByReservationIdOrderByEnvoyeLeAsc(UUID reservationId);
    java.util.Optional<MessageConversation> findTopByReservationIdOrderByEnvoyeLeDesc(UUID reservationId);
}