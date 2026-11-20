package sn.immosenegal.abonnement;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PayTechService {
    private final RestClient http = RestClient.create();
    private final ObjectMapper json;
    private final String apiKey;
    private final String apiSecret;
    private final String ipnUrl;
    private final String frontendUrl;
    private final String environment;

    public PayTechService(ObjectMapper json,
            @Value("${app.paytech.api-key:}") String apiKey,
            @Value("${app.paytech.api-secret:}") String apiSecret,
            @Value("${app.paytech.ipn-url:}") String ipnUrl,
            @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl,
            @Value("${app.paytech.environment:test}") String environment) {
        this.json = json;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.ipnUrl = ipnUrl;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
        this.environment = "prod".equalsIgnoreCase(environment) ? "prod" : "test";
    }

    public boolean estConfigure() {
        return !apiKey.isBlank() && !apiSecret.isBlank() && !ipnUrl.isBlank()
            && ipnUrl.startsWith("https://") && frontendUrl.startsWith("https://");
    }

    public Paiement creerPaiement(UUID abonnementId, BigDecimal montant, String forfait) {
        verifierConfiguration();
        String reference = "IMMO-" + UUID.randomUUID().toString().replace("-", "");
        String retour = frontendUrl + "/espace-proprietaire?paytech_ref=" + reference;

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("item_name", "Abonnement propriétaire ImmoSénégal");
        payload.put("item_price", montant.intValueExact());
        payload.put("currency", "XOF");
        payload.put("ref_command", reference);
        payload.put("command_name", "Abonnement propriétaire " + forfait);
        payload.put("target_payment", "Orange Money, Wave");
        payload.put("env", environment);
        payload.put("ipn_url", ipnUrl);
        payload.put("success_url", retour);
        payload.put("cancel_url", frontendUrl + "/espace-proprietaire?paytech_cancel=" + reference);
        try {
            payload.put("custom_field", json.writeValueAsString(Map.of(
                "abonnement_id", abonnementId.toString(),
                "forfait", forfait
            )));
            String body = http.post()
                .uri("https://paytech.sn/api/payment/request-payment")
                .contentType(MediaType.APPLICATION_JSON)
                .header("API_KEY", apiKey)
                .header("API_SECRET", apiSecret)
                .body(payload)
                .retrieve()
                .body(String.class);
            JsonNode response = json.readTree(body);
            String url = response.path("redirect_url").asText(response.path("redirectUrl").asText(""));
            if (response.path("success").asInt(0) != 1 || !url.startsWith("https://")) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "PayTech n'a pas pu créer le lien de paiement.");
            }
            return new Paiement(reference, url);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Impossible de joindre PayTech pour créer le paiement.");
        }
    }

    public boolean verifierNotification(Map<String, String> donnees) {
        String reference = donnees.getOrDefault("ref_command", "");
        String montant = donnees.getOrDefault("final_item_price", "");
        if (montant.isBlank()) montant = donnees.getOrDefault("item_price", "");
        String signature = donnees.getOrDefault("hmac_compute", "");
        if (reference.isBlank() || montant.isBlank() || signature.isBlank()
                || apiKey.isBlank() || apiSecret.isBlank()) return false;
        try {
            String message = montant + "|" + reference + "|" + apiKey;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(apiSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] attendu = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : attendu) hex.append(String.format("%02x", b));
            return java.security.MessageDigest.isEqual(
                hex.toString().getBytes(StandardCharsets.US_ASCII),
                signature.trim().toLowerCase(java.util.Locale.ROOT).getBytes(StandardCharsets.US_ASCII));
        } catch (Exception e) {
            return false;
        }
    }

    private void verifierConfiguration() {
        if (!estConfigure()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Le paiement PayTech n'est pas encore configuré sur le serveur.");
        }
    }

    public record Paiement(String reference, String url) {}
}