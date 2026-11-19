package sn.immosenegal.annonce;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoRepository extends JpaRepository<VideoAnnonce, UUID> {
    Optional<VideoAnnonce> findByAnnonceId(UUID annonceId);
    @Modifying
    @Query("delete from VideoAnnonce v where v.annonceId = :annonceId")
    void deleteByAnnonceId(@Param("annonceId") UUID annonceId);
    boolean existsByAnnonceId(UUID annonceId);
}