package sn.immosenegal.favori;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriRepository extends JpaRepository<Favori, UUID> {
    List<Favori> findByClientIdOrderByIdDesc(UUID clientId);
    Optional<Favori> findByClientIdAndAnnonceId(UUID clientId, UUID annonceId);
}
