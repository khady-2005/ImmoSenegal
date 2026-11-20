package sn.immosenegal.abonnement;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.UserRepository;
import sn.immosenegal.notification.NotificationService;

@RestController
@RequestMapping("/api/abonnements")
public class PayDunyaAbonnementController {
    private final AbonnementProprietaireRepository abonnements;
    private final UserRepository users;
    private final PayTechService payTech;
    private final NotificationService notifications;

    public PayDunyaAbonnementController(AbonnementProprietaireRepository abonnements,
            UserRepository users, PayTechService payTech, NotificationService notifications) {
        this.abonnements = abonnements;
        this.users = users;
        this.payTech = payTech;
        this.notifications = notifications;
    }

    @PostMapping("/payer")
    public PaiementResponse payer(@RequestBody PaiementRequest request,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        if (acteur == null || acteur.role() != Role.PROPRIETAIRE)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Réservé aux propriétaires.");
        if (request.forfait() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choisissez un forfait.");
        abonnements.findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(acteur.id(), StatutAbonnement.EN_ATTENTE)
            .ifPresent(a -> { throw new ResponseStatusException(HttpStatus.CONFLICT, "Une demande est déjà en attente."); });
        abonnements.findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(acteur.id(), StatutAbonnement.ACTIF)
            .filter(a -> a.getDateFin() != null && !a.getDateFin().isBefore(java.time.LocalDate.now()))
            .ifPresent(a -> { throw new ResponseStatusException(HttpStatus.CONFLICT, "Votre abonnement est déjà actif."); });

        var abonnement = abonnements.save(new AbonnementProprietaire(
            acteur.id(), request.forfait(), tarif(request.forfait()), "PAYTECH", null, null));
        try {
            var paiement = payTech.creerPaiement(abonnement.getId(), abonnement.getMontant(),
                request.forfait().name());
            abonnement.associerPaytech(paiement.reference());
            abonnements.save(abonnement);
            return new PaiementResponse(paiement.url(), paiement.reference(), abonnement.getMontant(), "XOF");
        } catch (RuntimeException e) {
            abonnements.delete(abonnement);
            throw e;
        }
    }

    /**
     * IPN PayTech : seule une notification authentifiée et dont le montant correspond
     * au forfait peut activer l'abonnement. Les notifications répétées sont sans effet.
     */
    @PostMapping("/paytech/callback")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, String> callback(@RequestParam Map<String, String> formulaire) {
        if (!payTech.verifierNotification(formulaire))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Signature PayTech invalide.");

        String reference = formulaire.getOrDefault("ref_command", "");
        var abonnement = abonnements.findByPaytechRefCommand(reference)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Abonnement introuvable."));
        String evenement = formulaire.getOrDefault("type_event", "");
        if ("sale_complete".equals(evenement)) {
            String montantTexte = formulaire.getOrDefault("final_item_price", "");
            if (montantTexte.isBlank()) montantTexte = formulaire.getOrDefault("item_price", "");
            BigDecimal montant;
            try {
                montant = new BigDecimal(montantTexte);
            } catch (NumberFormatException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Montant PayTech invalide.");
            }
            if (montant.compareTo(abonnement.getMontant()) != 0)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Le montant PayTech ne correspond pas au forfait.");

            boolean etaitEnAttente = abonnement.getStatut() == StatutAbonnement.EN_ATTENTE;
            String referenceTransaction = formulaire.getOrDefault("token", reference);
            abonnement.confirmerPaiement(referenceTransaction.isBlank() ? reference : referenceTransaction);
            abonnements.save(abonnement);
            if (etaitEnAttente && abonnement.getStatut() == StatutAbonnement.ACTIF) {
                users.findById(abonnement.getProprietaireId()).ifPresent(proprietaire ->
                    notifications.creer(proprietaire, "ABONNEMENT_ACTIVE", "Votre abonnement est activé",
                        "Votre abonnement " + abonnement.getForfait() + " est actif jusqu'au " + abonnement.getDateFin() + ".",
                        "/espace-proprietaire"));
            }
            return Map.of("status", "ok");
        }
        if ("sale_canceled".equals(evenement)) {
            abonnement.annulerPaiement();
            abonnements.save(abonnement);
            return Map.of("status", "ok");
        }
        // Les autres événements (remboursement, transfert) ne doivent pas activer l'abonnement.
        return Map.of("status", "ignored");
    }

    /**
     * Le retour navigateur n'est jamais une preuve de paiement.
     * Il ne fait que lire l'état enregistré après validation de l'IPN.
     */
    @GetMapping("/paytech/retour")
    public Map<String, String> retour(@RequestParam("ref") String reference,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        if (acteur == null || acteur.role() != Role.PROPRIETAIRE)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Réservé aux propriétaires.");
        var abonnement = abonnements.findByPaytechRefCommand(reference)
            .filter(a -> acteur.id().equals(a.getProprietaireId()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paiement introuvable."));
        String statut = switch (abonnement.getStatut()) {
            case ACTIF -> "completed";
            case ANNULE, REFUSE, EXPIRE -> "cancelled";
            default -> "pending";
        };
        return Map.of("status", statut);
    }

    private BigDecimal tarif(ForfaitAbonnement forfait) {
        return switch (forfait) {
            case MENSUEL -> new BigDecimal("5000");
            case TRIMESTRIEL -> new BigDecimal("13500");
            case ANNUEL -> new BigDecimal("50000");
        };
    }

    public record PaiementRequest(ForfaitAbonnement forfait) {}
    public record PaiementResponse(String url, String reference, BigDecimal montant, String devise) {}
}