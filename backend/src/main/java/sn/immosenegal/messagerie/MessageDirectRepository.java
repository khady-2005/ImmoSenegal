package sn.immosenegal.messagerie;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageDirectRepository extends JpaRepository<MessageDirect, UUID> {
    List<MessageDirect> findAllByAnnonceIdOrderByCreeLeAsc(UUID annonceId);
    List<MessageDirect> findAllByAnnonceIdAndInterlocuteurIdOrderByCreeLeAsc(UUID annonceId, UUID interlocuteurId);
}
