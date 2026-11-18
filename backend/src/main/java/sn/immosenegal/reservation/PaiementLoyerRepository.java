package sn.immosenegal.reservation;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PaiementLoyerRepository extends JpaRepository<PaiementLoyer,UUID>{
 List<PaiementLoyer> findAllByContratIdOrderByPeriodeDesc(UUID id);
}
