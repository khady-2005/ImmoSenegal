package sn.immosenegal.abonnement;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;
import sn.immosenegal.notification.NotificationService;

@RestController
@RequestMapping("/api/abonnements")
public class PayDunyaAbonnementController {
    private final AbonnementProprietaireRepository abonnements;
    private final UserRepository users;
    private final PayDunyaService payDunya;
    private final NotificationService notifications;
    private final ObjectMapper json;

    public PayDunyaAbonnementController(AbonnementProprietaireRepository abonnements,
            UserRepository users, PayDunyaService payDunya, NotificationService notifications,
            ObjectMapper json) {
        this.abonnements = abonnements;
        this.users = users;
        this.payDunya = payDunya;
        this.notifications = notifications;
        this.json = json;
    }

    @PostMapping("/payer")
    public PaiementResponse payer(@RequestBody PaiementRequest request,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        exigerProprietaire(acteur);
        if (request == null || request.forfait() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choisissez un forfait.");

        verifierAucunAbonnementEnCours(acteur.id());
        User proprietaire = users.findById(acteur.id())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compte propriétaire introuvable."));
        if (proprietaire.getEmail() == null || proprietaire.getEmail().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Ajoutez une adresse e-mail à votre compte avant de payer en ligne.");

        var abonnement = abonnements.save(new AbonnementProprietaire(
            acteur.id(), request.forfait(), tarif(request.forfait()), "PAYDUNYA", null, null));
        try {
            var facture = payDunya.creerFacture(abonnement.getId(), abonnement.getMontant(),
                "Abonnement propriétaire ImmoSénégal - " + request.forfait(),
                proprietaire.getNomComplet(), proprietaire.getEmail());
            if (facture.url() == null || !facture.url().startsWith("https://") || facture.token().isBlank())
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "PayDunya a retourné un lien de paiement invalide.");
            abonnement.associerPaydunya(facture.token());
            abonnements.save(abonnement);
            return new PaiementResponse(facture.url(), facture.token(), abonnement.getMontant(), "XOF");
        } catch (RuntimeException e) {
            abonnements.delete(abonnement);
            throw e;
        }
    }

    /**
     * IPN PayDunya : le hash du fournisseur est contrôlé, puis le statut et le
     * montant sont relus directement auprès de PayDunya avant toute activation.
     */
    @PostMapping("/paydunya/callback")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, String> callback(@RequestParam Map<String, String> formulaire) {
        JsonNode notification = lireNotification(formulaire);
        String hash = notification.path("hash").asText("");
        String token = notification.path("token").asText(
            notification.path("invoice").path("token").asText(""));
        if (!payDunya.hashValide(hash))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Signature PayDunya invalide.");
        if (token.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Jeton de facture PayDunya manquant.");

        actualiserDepuisPayDunya(token);
        return Map.of("status", "ok");
    }

    /**
     * Le retour navigateur ne prouve jamais le paiement : le serveur vérifie
     * à nouveau la facture auprès de PayDunya avant de communiquer son état.
     */
    @GetMapping("/paydunya/retour")
    public Map<String, String> retour(@RequestParam("token") String token,
            @AuthenticationPrincipal AuthenticatedUser acteur) {
        exigerProprietaire(acteur);
        var abonnement = abonnements.findByPaydunyaToken(token)
            .filter(a -> acteur.id().equals(a.getProprietaireId()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paiement introuvable."));
        actualiserDepuisPayDunya(token);
        var actualise = abonnements.findById(abonnement.getId()).orElse(abonnement);
        String statut = switch (actualise.getStatut()) {
            case ACTIF -> "completed";
            case ANNULE, REFUSE, EXPIRE -> "cancelled";
            default -> "pending";
        };
        return Map.of("status", statut);
    }

    private void actualiserDepuisPayDunya(String token) {
        var abonnement = abonnements.findByPaydunyaToken(token)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Abonnement introuvable."));
        JsonNode facture = payDunya.verifierFacture(token);
        if (!payDunya.hashValide(facture.path("hash").asText("")))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Réponse PayDunya non authentifiée.");
        if (!"00".equals(facture.path("response_code").asText()))
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "PayDunya n'a pas confirmé la facture.");

        String statut = facture.path("status").asText("").toLowerCase(java.util.Locale.ROOT);
        if ("completed".equals(statut)) {
            BigDecimal montant;
            try {
                montant = new BigDecimal(facture.path("invoice").path("total_amount").asText());
            } catch (NumberFormatException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Montant PayDunya invalide.");
            }
            if (montant.compareTo(abonnement.getMontant()) != 0)
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Le montant PayDunya ne correspond pas au forfait.");
            boolean etaitEnAttente = abonnement.getStatut() == StatutAbonnement.EN_ATTENTE;
            abonnement.confirmerPaiement(token);
            abonnements.save(abonnement);
            if (etaitEnAttente && abonnement.getStatut() == StatutAbonnement.ACTIF) {
                users.findById(abonnement.getProprietaireId()).ifPresent(proprietaire ->
                    notifications.creer(proprietaire, "ABONNEMENT_ACTIVE", "Votre abonnement est activé",
                        "Votre abonnement " + abonnement.getForfait() + " est actif jusqu'au "
                            + abonnement.getDateFin() + ".", "/espace-proprietaire"));
            }
        } else if ("cancelled".equals(statut) || "canceled".equals(statut) || "failed".equals(statut)) {
            abonnement.annulerPaiement();
            abonnements.save(abonnement);
        }
        // PENDING : ne jamais activer avant une confirmation fournisseur.
    }

    private JsonNode lireNotification(Map<String, String> formulaire) {
        String data = formulaire.get("data");
        if (data != null && !data.isBlank()) {
            try {
                JsonNode parsed = json.readTree(data);
                if (parsed.has("data")) return parsed.path("data");
                return parsed;
            } catch (Exception ignored) {
                // Certains serveurs encodent les champs imbriqués sous forme data[...].
            }
        }
        ObjectNode root = json.createObjectNode();
        root.put("hash", premier(formulaire, "data[hash]", "data.hash", "hash"));
        root.put("status", premier(formulaire, "data[status]", "data.status", "status"));
        root.put("token", premier(formulaire, "data[token]", "data.token", "token"));
        ObjectNode invoice = root.putObject("invoice");
        invoice.put("token", premier(formulaire, "data[invoice][token]", "data.invoice.token"));
        invoice.put("total_amount", premier(formulaire,
            "data[invoice][total_amount]", "data.invoice.total_amount"));
        return root;
    }

    private String premier(Map<String, String> valeurs, String... cles) {
        for (String cle : cles) {
            String valeur = valeurs.get(cle);
            if (valeur != null && !valeur.isBlank()) return valeur;
        }
        return "";
    }

    private void verifierAucunAbonnementEnCours(UUID proprietaireId) {
        abonnements.findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(proprietaireId, StatutAbonnement.EN_ATTENTE)
            .ifPresent(a -> { throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Une demande est déjà en attente."); });
        abonnements.findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(proprietaireId, StatutAbonnement.ACTIF)
            .filter(a -> a.getDateFin() != null && !a.getDateFin().isBefore(java.time.LocalDate.now()))
            .ifPresent(a -> { throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Votre abonnement est déjà actif."); });
    }

    private void exigerProprietaire(AuthenticatedUser acteur) {
        if (acteur == null || acteur.role() != Role.PROPRIETAIRE)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Réservé aux propriétaires.");
    }

    private BigDecimal tarif(ForfaitAbonnement forfait) {
        return switch (forfait) {
            case MENSUEL -> new BigDecimal("5000");
            case TRIMESTRIEL -> new BigDecimal("13500");
            case ANNUEL -> new BigDecimal("50000");
        };
    }

    public record PaiementRequest(ForfaitAbonnement forfait) {}
    public record PaiementResponse(String url, String token, BigDecimal montant, String devise) {}
}
