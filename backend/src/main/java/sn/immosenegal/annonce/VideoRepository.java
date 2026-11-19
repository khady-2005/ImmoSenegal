package sn.immosenegal.annonce;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoRepository extends JpaRepository<VideoAnnonce, UUID> {
    Optional<VideoAnnonce> findByAnnonceId(UUID annonceId);
    void deleteByAnnonceId(UUID annonceId);
}