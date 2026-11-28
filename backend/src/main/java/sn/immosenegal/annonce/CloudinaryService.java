package sn.immosenegal.annonce;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import sn.immosenegal.common.ApiException;

@Service
public class CloudinaryService {

    public record UploadResult(String secureUrl, String publicId) {}

    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public CloudinaryService(
            @Value("${app.cloudinary.cloud-name:}") String cloudName,
            @Value("${app.cloudinary.api-key:}") String apiKey,
            @Value("${app.cloudinary.api-secret:}") String apiSecret,
            ObjectMapper mapper) {
        this.cloudName = cloudName == null ? "" : cloudName.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.apiSecret = apiSecret == null ? "" : apiSecret.trim();
        this.mapper = mapper;
    }

    public boolean estConfigure() {
        return !cloudName.isEmpty() && !apiKey.isEmpty() && !apiSecret.isEmpty();
    }

    public UploadResult televerser(byte[] octets, String typeMime, String nomFichier, String dossier) {
        if (!estConfigure()) {
            throw new IllegalStateException("Cloudinary n'est pas configuré.");
        }
        long timestamp = Instant.now().getEpochSecond();
        String signature = signer("folder=" + dossier + "&timestamp=" + timestamp);
        String boundary = "----ImmoSenegal" + UUID.randomUUID().toString().replace("-", "");

        byte[] corps = construireMultipart(boundary, dossier, timestamp, signature, octets, typeMime, nomFichier);
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create("https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload"))
            .timeout(Duration.ofSeconds(30))
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .POST(HttpRequest.BodyPublishers.ofByteArray(corps))
            .build();
        try {
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Échec de l'envoi de la photo vers Cloudinary.");
            }
            JsonNode root = mapper.readTree(resp.body());
            return new UploadResult(root.path("secure_url").asText(), root.path("public_id").asText());
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Impossible de joindre le service de stockage photo.");
        }
    }

    public void supprimer(String publicId) {
        if (!estConfigure() || publicId == null || publicId.isBlank()) {
            return;
        }
        long timestamp = Instant.now().getEpochSecond();
        String signature = signer("public_id=" + publicId + "&timestamp=" + timestamp);
        String body = "public_id=" + urlEncode(publicId)
            + "&timestamp=" + timestamp
            + "&api_key=" + urlEncode(apiKey)
            + "&signature=" + signature;
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create("https://api.cloudinary.com/v1_1/" + cloudName + "/image/destroy"))
            .timeout(Duration.ofSeconds(15))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
            .build();
        try {
            http.send(req, HttpResponse.BodyHandlers.discarding());
        } catch (Exception ignored) {
            // La suppression distante ne doit pas bloquer la suppression en base.
        }
    }

    private String signer(String paramsToSign) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] digest = md.digest((paramsToSign + apiSecret).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Erreur de signature Cloudinary", e);
        }
    }

    private byte[] construireMultipart(String boundary, String folder, long timestamp, String signature,
                                       byte[] fileBytes, String typeMime, String fileName) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ecrireChamp(out, boundary, "api_key", apiKey);
            ecrireChamp(out, boundary, "folder", folder);
            ecrireChamp(out, boundary, "timestamp", Long.toString(timestamp));
            ecrireChamp(out, boundary, "signature", signature);
            out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
            out.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + fileName + "\"\r\n").getBytes(StandardCharsets.UTF_8));
            out.write(("Content-Type: " + typeMime + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
            out.write(fileBytes);
            out.write("\r\n".getBytes(StandardCharsets.UTF_8));
            out.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void ecrireChamp(ByteArrayOutputStream out, String boundary, String nom, String valeur) throws IOException {
        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"" + nom + "\"\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write((valeur + "\r\n").getBytes(StandardCharsets.UTF_8));
    }

    private static String urlEncode(String s) {
        return java.net.URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
