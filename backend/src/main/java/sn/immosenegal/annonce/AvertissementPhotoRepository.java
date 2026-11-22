package sn.immosenegal.annonce;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AvertissementPhotoRepository extends JpaRepository<AvertissementPhoto, UUID> {
    List<AvertissementPhoto> findAllByOrderByCreeLeDesc();
    List<AvertissementPhoto> findAllByStatutAndEcheanceLeLessThanEqual(StatutAvertissementPhoto statut, Instant date);
    boolean existsByPhotoIdAndStatut(UUID photoId, StatutAvertissementPhoto statut);
    List<AvertissementPhoto> findAllByAnnonceIdAndProprietaireIdOrderByCreeLeDesc(UUID annonceId, UUID proprietaireId);
}
