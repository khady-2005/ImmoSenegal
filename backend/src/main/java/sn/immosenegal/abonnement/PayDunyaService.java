package sn.immosenegal.abonnement;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class PayDunyaService {
    private final RestClient http = RestClient.create();
    private final ObjectMapper json;
    private final String masterKey;
    private final String privateKey;
    private final String publicKey;
    private final String token;
    private final boolean testMode;
    private final String callbackUrl;
    private final String frontendUrl;

    public PayDunyaService(ObjectMapper json,
            @Value("${app.paydunya.master-key:}") String masterKey,
            @Value("${app.paydunya.private-key:}") String privateKey,
            @Value("${app.paydunya.public-key:}") String publicKey,
            @Value("${app.paydunya.token:}") String token,
            @Value("${app.paydunya.mode:test}") String mode,
            @Value("${app.paydunya.callback-url:}") String callbackUrl,
            @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.json = json;
        this.masterKey = masterKey;
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        this.token = token;
        this.testMode = !"live".equalsIgnoreCase(mode);
        this.callbackUrl = callbackUrl;
        this.frontendUrl = frontendUrl;
    }

    public boolean estConfigure() {
        return !masterKey.isBlank() && !privateKey.isBlank() && !publicKey.isBlank() && !token.isBlank()
            && !callbackUrl.isBlank();
    }

    public Facture creerFacture(UUID abonnementId, BigDecimal montant, String description, String nom, String email) {
        verifierConfiguration();
        String base = testMode ? "https://app.paydunya.com/sandbox-api/v1" : "https://app.paydunya.com/api/v1";
        Map<String,Object> invoice = new LinkedHashMap<>();
        invoice.put("total_amount", montant.intValueExact());
        invoice.put("description", description);
        invoice.put("customer", Map.of("name", nom, "email", email));
        Map<String,Object> actions = Map.of(
            "callback_url", callbackUrl,
            // PayDunya ajoute lui-même ?token=... : ne pas mettre de query string ici.
            "return_url", frontendUrl + "/espace-proprietaire",
            "cancel_url", frontendUrl + "/espace-proprietaire"
        );
        Map<String,Object> payload = Map.of(
            "invoice", invoice,
            "store", Map.of("name", "ImmoSénégal", "tagline", "Abonnements propriétaires", "website_url", frontendUrl),
            "actions", actions
        );
        JsonNode response = envoyerCreation(base + "/checkout-invoice/create", payload);
        if (!"00".equals(response.path("response_code").asText()) || response.path("token").asText().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "PayDunya n'a pas pu créer la facture.");
        return new Facture(response.path("token").asText(), response.path("response_text").asText());
    }

    public JsonNode verifierFacture(String invoiceToken) {
        verifierConfiguration();
        String base = testMode ? "https://app.paydunya.com/sandbox-api/v1" : "https://app.paydunya.com/api/v1";
        try {
            String body = http.get().uri(base + "/checkout-invoice/confirm/" + invoiceToken)
                .headers(h -> entetes(h)).retrieve().body(String.class);
            return json.readTree(body);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Impossible de vérifier le paiement auprès de PayDunya.");
        }
    }

    public boolean hashValide(String hash) {
        if (hash == null || hash.isBlank() || masterKey.isBlank()) return false;
        try {
            byte[] digest = java.security.MessageDigest.getInstance("SHA-512")
                .digest(masterKey.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder attendu = new StringBuilder();
            for (byte b : digest) attendu.append(String.format("%02x", b));
            return java.security.MessageDigest.isEqual(
                attendu.toString().getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                hash.trim().toLowerCase().getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        } catch (Exception e) { return false; }
    }

    private JsonNode envoyerCreation(String url, Map<String,Object> payload) {
        try {
            String body = http.post().uri(url).contentType(MediaType.APPLICATION_JSON)
                .headers(h -> entetes(h)).body(payload).retrieve().body(String.class);
            return json.readTree(body);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "La création du paiement PayDunya a échoué.");
        }
    }

    private void entetes(org.springframework.http.HttpHeaders h) {
        h.setContentType(MediaType.APPLICATION_JSON);
        h.set("PAYDUNYA-MASTER-KEY", masterKey);
        h.set("PAYDUNYA-PRIVATE-KEY", privateKey);
        h.set("PAYDUNYA-PUBLIC-KEY", publicKey);
        h.set("PAYDUNYA-TOKEN", token);
    }

    private void verifierConfiguration() {
        if (!estConfigure())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Le paiement en ligne n'est pas encore configuré sur le serveur.");
    }

    public record Facture(String token, String url) {}
}
