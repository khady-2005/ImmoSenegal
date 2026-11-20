package sn.immosenegal.assistant;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AssistantIAService {
    private final RestClient client;
    private final String apiKey;
    private final String model;

    public AssistantIAService(RestClient.Builder builder,
            @Value("\u0024{app.ia.api-key:}") String apiKey,
            @Value("\u0024{app.ia.model:gpt-4o-mini}") String model) {
        this.client = builder.baseUrl("https://api.openai.com/v1").build();
        this.apiKey = apiKey;
        this.model = model;
    }

    public String repondre(String question) {
        if (apiKey == null || apiKey.isBlank())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "L'assistant IA n'est pas encore configuré.");
        if (question == null || question.isBlank() || question.length() > 1000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Votre message doit contenir entre 1 et 1 000 caractères.");
        try {
            JsonNode result = client.post().uri("/chat/completions")
                .header("Authorization", "Bearer " + apiKey)
                .body(java.util.Map.of(
                    "model", model,
                    "temperature", 0.3,
                    "max_tokens", 450,
                    "messages", java.util.List.of(
                        java.util.Map.of("role", "system", "content", "Tu es l'assistant immobilier d'ImmoSénégal. Réponds en français simple, de façon concise et utile. Tu aides à comprendre les démarches de location et d'achat au Sénégal, les annonces, visites, contrats, abonnements, mandats, commissions et litiges. Ne prétends jamais avoir vérifié une annonce, un paiement, un contrat ou une règle juridique. Pour les questions juridiques ou financières précises, recommande de consulter un professionnel compétent. Ne demande jamais de mot de passe, code de connexion ou donnée bancaire."),
                        java.util.Map.of("role", "user", "content", question)
                    )
                ))
                .retrieve().body(JsonNode.class);
            String answer = result == null ? null : result.path("choices").path(0).path("message").path("content").asText("");
            if (answer == null || answer.isBlank()) throw new IllegalStateException("Réponse IA vide");
            return answer.trim();
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Le service IA est momentanément indisponible.");
        }
    }
}
