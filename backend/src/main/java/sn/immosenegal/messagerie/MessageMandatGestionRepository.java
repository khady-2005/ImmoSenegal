package sn.immosenegal.messagerie;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageMandatGestionRepository extends JpaRepository<MessageMandatGestion, UUID> {
    List<MessageMandatGestion> findAllByMandatIdOrderByEnvoyeLeAsc(UUID mandatId);
    java.util.Optional<MessageMandatGestion> findTopByMandatIdOrderByEnvoyeLeDesc(UUID mandatId);
}
