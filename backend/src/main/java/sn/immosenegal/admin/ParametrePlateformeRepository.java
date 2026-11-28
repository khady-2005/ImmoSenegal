package sn.immosenegal.admin;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ParametrePlateformeRepository extends JpaRepository<ParametrePlateforme, String> {
    List<ParametrePlateforme> findAllByOrderByCleAsc();
}
