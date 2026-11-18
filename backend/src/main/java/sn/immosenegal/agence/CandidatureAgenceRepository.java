package sn.immosenegal.agence;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidatureAgenceRepository extends JpaRepository<CandidatureAgence, UUID> {
    List<CandidatureAgence> findAllByAgenceIdAndStatutOrderByCreeLeDesc(UUID agenceId, StatutCandidatureAgence statut);
    List<CandidatureAgence> findAllByUtilisateurIdOrderByCreeLeDesc(UUID utilisateurId);
    boolean existsByAgenceIdAndUtilisateurIdAndStatut(UUID agenceId, UUID utilisateurId, StatutCandidatureAgence statut);
}
