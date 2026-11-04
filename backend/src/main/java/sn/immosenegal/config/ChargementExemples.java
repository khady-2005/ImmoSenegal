package sn.immosenegal.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import sn.immosenegal.annonce.AnnoncesExemple;

/**
 * Charge les annonces d'exemple au démarrage, UNIQUEMENT si EXEMPLES_ACTIFS=true (désactivé par défaut).
 * Une erreur ici ne doit jamais empêcher le serveur de démarrer : elle est seulement journalisée.
 */
@Component
@ConditionalOnProperty(prefix = "app.exemples", name = "actif", havingValue = "true")
public class ChargementExemples implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ChargementExemples.class);

    private final AnnoncesExemple exemples;

    public ChargementExemples(AnnoncesExemple exemples) {
        this.exemples = exemples;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            exemples.creer();
        } catch (Exception e) {
            log.error("Impossible de créer les annonces d'exemple : {}", e.toString());
        }
    }
}
