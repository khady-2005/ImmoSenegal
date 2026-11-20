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
    public Map<String,String> callback(@RequestParam Map<String,String> formulaire) {
        try {
            JsonNode notification;
            String donnees = formulaire.get("data");
            if (donnees != null && !donnees.isBlank()) {
                notification = json.readTree(donnees);
            } else {
                // Certains encodeurs de formulaires transmettent le tableau PHP sous forme de clés imbriquées.
                var objet = json.createObjectNode();
                String hash = formulaire.getOrDefault("data[hash]", "");
                String tokenForm = formulaire.getOrDefault("data[token]", "");
                String tokenFacture = formulaire.getOrDefault("data[invoice][token]", "");
                objet.put("hash", hash);
                objet.put("token", tokenForm);
                if (!tokenFacture.isBlank()) objet.putObject("invoice").put("token", tokenFacture);
                notification = objet;
            }
            if (!payDunya.hashValide(notification.path("hash").asText()))
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Signature PayDunya invalide.");
            String token = notification.path("invoice").path("token").asText();
            if (token.isBlank()) token = notification.path("token").asText();
            if (token.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token de facture absent.");
            return synchroniser(token, null);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Notification PayDunya invalide.");
        }
    }

    /**
     * Retour navigateur : le token n'est jamais considéré comme une preuve de paiement.
     * Le serveur vérifie la facture directement auprès de PayDunya et contrôle son propriétaire.
     */
    @GetMapping("/paydunya/retour")
    public Map<String,String> retour(@RequestParam("token") String token,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        if (acteur == null || acteur.role() != Role.PROPRIETAIRE)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Réservé aux propriétaires.");
        return synchroniser(token, acteur.id());
    }

    private Map<String,String> synchroniser(String token, UUID proprietaireId) {
        var abonnement = abonnements.findByPaydunyaToken(token)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Facture introuvable."));
        if (proprietaireId != null && !proprietaireId.equals(abonnement.getProprietaireId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Facture introuvable.");

        JsonNode confirmation = payDunya.verifierFacture(token);
        if (!"00".equals(confirmation.path("response_code").asText()))
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Vérification PayDunya impossible.");
        if (!payDunya.hashValide(confirmation.path("hash").asText()))
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Signature de confirmation PayDunya invalide.");

        String statut = confirmation.path("status").asText("").toLowerCase(java.util.Locale.ROOT);
        if ("completed".equals(statut)) {
            JsonNode montantNode = confirmation.path("invoice").path("total_amount");
            if (montantNode.isMissingNode() || montantNode.isNull())
                montantNode = confirmation.path("total_amount");
            if (montantNode.isMissingNode() || montantNode.isNull() || montantNode.asText().isBlank())
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Montant de facture absent de la confirmation PayDunya.");
            BigDecimal montantConfirme = montantNode.decimalValue();
            if (montantConfirme.compareTo(abonnement.getMontant()) != 0)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Le montant confirmé ne correspond pas au forfait.");
            String reference = confirmation.path("transaction_id").asText("");
            abonnement.confirmerPaiement(reference.isBlank() ? token : reference);
            abonnements.save(abonnement);
            return Map.of("status", "completed");
        }
        if ("cancelled".equals(statut) || "canceled".equals(statut) || "failed".equals(statut)) {
            abonnement.annulerPaiement();
            abonnements.save(abonnement);
            return Map.of("status", "cancelled");
        }
        return Map.of("status", "pending");
    }

    public record PaiementRequest(ForfaitAbonnement forfait) {}
    public record PaiementResponse(String url, String token, BigDecimal montant, String devise) {}
}
