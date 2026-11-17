package sn.immosenegal.agence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MembreAgenceRepository extends JpaRepository<MembreAgence, UUID> {
    List<MembreAgence> findAllByUtilisateurId(UUID utilisateurId);
    List<MembreAgence> findAllByAgenceIdAndStatut(UUID agenceId, StatutMembreAgence statut);
    Optional<MembreAgence> findByAgenceIdAndUtilisateurId(UUID agenceId, UUID utilisateurId);
    boolean existsByAgenceIdAndUtilisateurId(UUID agenceId, UUID utilisateurId);
}
