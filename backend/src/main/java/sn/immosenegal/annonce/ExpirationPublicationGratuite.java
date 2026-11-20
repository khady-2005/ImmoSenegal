package sn.immosenegal.annonce;

import java.time.LocalDate;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import sn.immosenegal.abonnement.AbonnementProprietaireRepository;
import sn.immosenegal.abonnement.StatutAbonnement;
import sn.immosenegal.agence.MandatGestionRepository;
import sn.immosenegal.agence.StatutMandatGestion;
import sn.immosenegal.notification.NotificationRepository;
import sn.immosenegal.notification.NotificationService;

/** Rappels avant échéance et retrait des annonces dont la couverture gratuite ou payante est terminée. */
@Component
public class ExpirationPublicationGratuite {
    private static final String TYPE_RAPPEL = "FIN_GRATUITE_ANNONCE";
    private static final String TYPE_EXPIRATION = "ANNONCE_GRATUITE_EXPIREE";

    private final AnnonceRepository annonces;
    private final AbonnementProprietaireRepository abonnements;
    private final MandatGestionRepository mandats;
    private final NotificationRepository notifications;
    private final NotificationService serviceNotifications;

    public ExpirationPublicationGratuite(AnnonceRepository annonces,
            AbonnementProprietaireRepository abonnements,
            MandatGestionRepository mandats,
            NotificationRepository notifications,
            NotificationService serviceNotifications) {
        this.annonces = annonces;
        this.abonnements = abonnements;
        this.mandats = mandats;
        this.notifications = notifications;
        this.serviceNotifications = serviceNotifications;
    }

    /** Préviens le propriétaire cinq jours avant la fin de la période gratuite. */
    @Scheduled(cron = "0 0 9 * * *", zone = "Africa/Dakar")
    @Transactional
    public void rappelerFinGratuite() {
        LocalDate echeance = LocalDate.now().plusDays(5);
        annonces.findAllByStatutAndDateFinPublicationLessThanEqual(StatutAnnonce.PUBLIEE, echeance)
            .stream()
            .filter(a -> echeance.equals(a.getDateFinPublication()))
            .filter(a -> !couvertParAbonnementOuMandat(a))
            .filter(a -> !notifications.existsByDestinataireIdAndTypeAndLien(
                a.getProprietaire().getId(), TYPE_RAPPEL, lien(a)))
            .forEach(a -> serviceNotifications.creer(a.getProprietaire(), TYPE_RAPPEL,
                "Votre période gratuite se termine bientôt",
                "Il reste cinq jours pour votre annonce « " + a.getTitre()
                    + " ». Souscrivez un abonnement ou confiez votre bien à une agence pour maintenir sa publication.",
                lien(a)));
    }

    /** Les annonces non couvertes deviennent invisibles, sans être supprimées du compte propriétaire. */
    @Scheduled(cron = "0 10 0 * * *", zone = "Africa/Dakar")
    @Transactional
    public void retirerAnnoncesExpirees() {
        LocalDate aujourdHui = LocalDate.now();
        annonces.findAllByStatutAndDateFinPublicationLessThanEqual(StatutAnnonce.PUBLIEE, aujourdHui)
            .forEach(a -> {
                if (mandats.existsByAnnonceIdAndStatut(a.getId(), StatutMandatGestion.ACCEPTE)) {
                    a.setDateFinPublication(null);
                } else {
                    var abonnementActif = abonnements
                        .findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(
                            a.getProprietaire().getId(), StatutAbonnement.ACTIF)
                        .filter(ab -> ab.getDateFin() != null && !ab.getDateFin().isBefore(aujourdHui));
                    if (abonnementActif.isPresent()) {
                        a.setDateFinPublication(abonnementActif.get().getDateFin());
                        return;
                    }
                    a.setStatut(StatutAnnonce.EN_ATTENTE);
                    if (!notifications.existsByDestinataireIdAndTypeAndLien(
                            a.getProprietaire().getId(), TYPE_EXPIRATION, lien(a))) {
                        serviceNotifications.creer(a.getProprietaire(), TYPE_EXPIRATION,
                            "Période gratuite terminée",
                            "La période gratuite de votre annonce « " + a.getTitre()
                                + " » est terminée. Elle reste dans votre espace, mais n'est plus visible dans le catalogue. Souscrivez un abonnement ou acceptez un mandat d'agence pour la republier.",
                            lien(a));
                    }
                }
            });
    }

    private boolean couvertParAbonnementOuMandat(Annonce annonce) {
        boolean abonnementActif = abonnements
            .findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(
                annonce.getProprietaire().getId(), StatutAbonnement.ACTIF)
            .filter(a -> a.getDateFin() != null && !a.getDateFin().isBefore(LocalDate.now()))
            .isPresent();
        return abonnementActif || mandats.existsByAnnonceIdAndStatut(
            annonce.getId(), StatutMandatGestion.ACCEPTE);
    }

    private static String lien(Annonce annonce) {
        return "/mes-annonces/" + annonce.getId();
    }
}
