package sn.immosenegal.abonnement;

import java.time.LocalDate;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AbonnementExpirationScheduler {
    private final AbonnementProprietaireRepository abonnements;

    public AbonnementExpirationScheduler(AbonnementProprietaireRepository abonnements) {
        this.abonnements = abonnements;
    }

    /**
     * Désactive chaque jour les abonnements dont la date de fin est dépassée.
     * La date de fin reste incluse : l'abonnement expire le lendemain.
     */
    @Scheduled(cron = "0 5 0 * * *", zone = "Africa/Dakar")
    @Transactional
    public void expirerAbonnementsTermines() {
        var termines = abonnements.findAllByStatutAndDateFinBefore(
            StatutAbonnement.ACTIF, LocalDate.now());
        if (termines.isEmpty()) return;

        termines.forEach(AbonnementProprietaire::expirer);
        abonnements.saveAll(termines);
    }
}
