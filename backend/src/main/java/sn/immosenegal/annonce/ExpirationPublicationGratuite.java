package sn.immosenegal.annonce;

import java.time.LocalDate;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Retire chaque jour du catalogue les annonces dont les 30 jours gratuits sont terminés. */
@Component
public class ExpirationPublicationGratuite {
    private final AnnonceRepository annonces;

    public ExpirationPublicationGratuite(AnnonceRepository annonces) {
        this.annonces = annonces;
    }

    @Scheduled(cron = "0 10 0 * * *", zone = "Africa/Dakar")
    @Transactional
    public void retirerAnnoncesExpirees() {
        annonces.findAllByStatutAndDateFinGratuiteLessThanEqual(StatutAnnonce.PUBLIEE, LocalDate.now())
            .forEach(a -> a.setStatut(StatutAnnonce.EN_ATTENTE));
    }
}
