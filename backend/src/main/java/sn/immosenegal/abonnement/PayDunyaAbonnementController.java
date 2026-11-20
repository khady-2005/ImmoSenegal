package sn.immosenegal.abonnement;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.UserRepository;

@RestController
@RequestMapping("/api/abonnements")
public class PayDunyaAbonnementController {
    private final AbonnementProprietaireRepository abonnements;
    private final UserRepository users;
    private final PayDunyaService payDunya;
    private final ObjectMapper json;

    public PayDunyaAbonnementController(AbonnementProprietaireRepository abonnements,
            UserRepository users, PayDunyaService payDunya, ObjectMapper json) {
        this.abonnements = abonnements;
        this.users = users;
        this.payDunya = payDunya;
        this.json = json;
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

        var user = users.findById(acteur.id())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compte introuvable."));
        BigDecimal montant = switch (request.forfait()) {
            case MENSUEL -> new BigDecimal("5000");
            case TRIMESTRIEL -> new BigDecimal("13500");
            case ANNUEL -> new BigDecimal("50000");
        };
        var abonnement = abonnements.save(new AbonnementProprietaire(
            acteur.id(), request.forfait(), montant, "PAYDUNYA", null, null));
        try {
            var facture = payDunya.creerFacture(abonnement.getId(), montant,
                "Abonnement propriétaire ImmoSénégal - " + request.forfait(),
                user.getNomComplet(), user.getEmail());
            abonnement.associerPaydunya(facture.token());
            abonnements.save(abonnement);
            return new PaiementResponse(facture.url(), facture.token(), montant, "XOF");
        } catch (RuntimeException e) {
            abonnements.delete(abonnement);
            throw e;
        }
    }

    @PostMapping(value = "/paydunya/callback", consumes = "application/x-www-form-urlencoded")
    @ResponseStatus(HttpStatus.OK)
    public Map<String,String> callback(@RequestParam("data") String data) {
        try {
            JsonNode notification = json.readTree(data);
            if (!payDunya.hashValide(notification.path("hash").asText()))
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Signature PayDunya invalide.");
            String token = notification.path("invoice").path("token").asText();
            if (token.isBlank()) token = notification.path("token").asText();
            if (token.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token de facture absent.");

            JsonNode confirmation = payDunya.verifierFacture(token);
            if (!"00".equals(confirmation.path("response_code").asText()))
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Vérification PayDunya impossible.");
            if (!"completed".equalsIgnoreCase(confirmation.path("status").asText()))
                return Map.of("status", "pending");

            var abonnement = abonnements.findByPaydunyaToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Abonnement introuvable."));
            BigDecimal montantConfirme = confirmation.path("invoice").path("total_amount").decimalValue();
            if (montantConfirme.compareTo(abonnement.getMontant()) != 0)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Le montant confirmé ne correspond pas au forfait.");
            String reference = confirmation.path("transaction_id").asText("");
            abonnement.confirmerPaiement(reference.isBlank() ? token : reference);
            abonnements.save(abonnement);
            return Map.of("status", "completed");
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Notification PayDunya invalide.");
        }
    }

    public record PaiementRequest(ForfaitAbonnement forfait) {}
    public record PaiementResponse(String url, String token, BigDecimal montant, String devise) {}
}
