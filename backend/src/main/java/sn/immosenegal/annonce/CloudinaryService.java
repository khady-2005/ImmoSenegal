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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import sn.immosenegal.common.ApiException;

@Service
public class CloudinaryService {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryService.class);
    private static final String DEFAULT_BASE_URL = "https://api.cloudinary.com/v1_1";

    public record UploadResult(String secureUrl, String publicId) {}

    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;
    private final String baseUrl;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    @Autowired
    public CloudinaryService(
            @Value("${app.cloudinary.cloud-name:}") String cloudName,
            @Value("${app.cloudinary.api-key:}") String apiKey,
            @Value("${app.cloudinary.api-secret:}") String apiSecret,
            ObjectMapper mapper) {
        this(cloudName, apiKey, apiSecret, mapper, DEFAULT_BASE_URL);
    }

    CloudinaryService(String cloudName, String apiKey, String apiSecret, ObjectMapper mapper, String baseUrl) {
        this.cloudName = nettoyerVariable(cloudName);
        this.apiKey = nettoyerVariable(apiKey);
        this.apiSecret = nettoyerVariable(apiSecret);
        this.baseUrl = (baseUrl == null || baseUrl.isBlank()) ? DEFAULT_BASE_URL : baseUrl.strip().replaceAll("/+$", "");
        this.mapper = mapper;
    }

    static String nettoyerVariable(String valeur) {
        if (valeur == null) {
            return "";
        }
        String propre = supprimerEspacesBords(valeur);
        if (propre.length() >= 2
                && ((propre.startsWith("\"") && propre.endsWith("\""))
                    || (propre.startsWith("'") && propre.endsWith("'")))) {
            propre = supprimerEspacesBords(propre.substring(1, propre.length() - 1));
        }
        return propre;
    }

    private static String supprimerEspacesBords(String s) {
        int debut = 0;
        int fin = s.length();
        while (debut < fin && estEspace(s.charAt(debut))) {
            debut++;
        }
        while (fin > debut && estEspace(s.charAt(fin - 1))) {
            fin--;
        }
        return s.substring(debut, fin);
    }

    private static boolean estEspace(char c) {
        return Character.isWhitespace(c) || Character.isSpaceChar(c) || c == '\uFEFF';
    }

    public boolean estConfigure() {
        return !cloudName.isEmpty() && !apiKey.isEmpty() && !apiSecret.isEmpty();
    }

    String getCloudName() {
        return cloudName;
    }

    String getApiKey() {
        return apiKey;
    }

    public UploadResult televerser(byte[] octets, String typeMime, String nomFichier, String dossier) {
        return envoyerUpload("image", octets, typeMime, nomFichier, dossier);
    }

    public UploadResult televerserVideo(byte[] octets, String typeMime, String nomFichier, String dossier) {
        return envoyerUpload("video", octets, typeMime, nomFichier, dossier);
    }

    public void supprimer(String publicId) {
        envoyerDestroy("image", publicId);
    }

    public void supprimerVideo(String publicId) {
        envoyerDestroy("video", publicId);
    }

    private UploadResult envoyerUpload(String resourceType, byte[] octets, String typeMime, String nomFichier, String dossier) {
        if (!estConfigure()) {
            throw new IllegalStateException("Cloudinary n'est pas configuré.");
        }
        long timestamp = Instant.now().getEpochSecond();
        String dossierPropre = dossier == null ? "" : dossier.strip();
        String paramsASigner = dossierPropre.isEmpty()
            ? "timestamp=" + timestamp
            : "folder=" + dossierPropre + "&timestamp=" + timestamp;
        String signature = signer(paramsASigner);
        String boundary = "----ImmoSenegal" + UUID.randomUUID().toString().replace("-", "");

        byte[] corps = construireMultipart(boundary, dossierPropre, timestamp, signature, octets, typeMime, nomFichier);
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/" + cloudName + "/" + resourceType + "/upload"))
            .timeout(Duration.ofSeconds("video".equals(resourceType) ? 120 : 30))
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .POST(HttpRequest.BodyPublishers.ofByteArray(corps))
            .build();
        try {
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                log.warn("Échec upload Cloudinary ({}) : code={}, message={}",
                    resourceType, resp.statusCode(), extraireMessageErreur(resp.body(), signature));
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Échec de l'envoi vers Cloudinary.");
            }
            JsonNode root = mapper.readTree(resp.body());
            String secureUrl = root.path("secure_url").asText("");
            String publicId = root.path("public_id").asText("");
            if (secureUrl.isBlank() || publicId.isBlank()) {
                log.warn("Réponse Cloudinary incomplète ({}) : code={}", resourceType, resp.statusCode());
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Échec de l'envoi vers Cloudinary.");
            }
            return new UploadResult(secureUrl, publicId);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Impossible de joindre Cloudinary ({}) : type={}, detail={}",
                resourceType, e.getClass().getSimpleName(), assainirMessage(e.getMessage(), signature));
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Impossible de joindre le service de stockage.");
        }
    }

    private void envoyerDestroy(String resourceType, String publicId) {
        if (!estConfigure() || publicId == null || publicId.isBlank()) {
            return;
        }
        long timestamp = Instant.now().getEpochSecond();
        String idPropre = publicId.strip();
        String signature = signer("public_id=" + idPropre + "&timestamp=" + timestamp);
        String body = "public_id=" + urlEncode(idPropre)
            + "&timestamp=" + timestamp
            + "&api_key=" + urlEncode(apiKey)
            + "&signature=" + signature;
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/" + cloudName + "/" + resourceType + "/destroy"))
            .timeout(Duration.ofSeconds(15))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
            .build();
        try {
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                log.warn("Échec suppression Cloudinary ({}) : code={}, message={}",
                    resourceType, resp.statusCode(), extraireMessageErreur(resp.body(), signature));
            }
        } catch (Exception e) {
            log.warn("Erreur réseau suppression Cloudinary ({}) : {}", resourceType, e.getClass().getSimpleName());
        }
    }

    String signer(String paramsToSign) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] digest = md.digest((paramsToSign + apiSecret).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Erreur de signature Cloudinary", e);
        }
    }

    private String extraireMessageErreur(String body, String signature) {
        String raw = body;
        if (body != null && !body.isBlank()) {
            try {
                JsonNode err = mapper.readTree(body).path("error").path("message");
                if (!err.isMissingNode() && !err.asText("").isBlank()) {
                    raw = err.asText();
                }
            } catch (Exception ignored) {
                // Corps non JSON : on journalise un extrait assaini.
            }
        }
        return assainirMessage(raw, signature);
    }

    private String assainirMessage(String message, String signature) {
        if (message == null || message.isBlank()) {
            return "(aucun message)";
        }
        String propre = message.replace('\r', ' ').replace('\n', ' ').strip();
        if (!apiSecret.isEmpty()) {
            propre = propre.replace(apiSecret, "***");
        }
        if (!apiKey.isEmpty()) {
            propre = propre.replace(apiKey, "***");
        }
        if (signature != null && !signature.isEmpty()) {
            propre = propre.replace(signature, "***");
        }
        return propre.length() > 400 ? propre.substring(0, 400) + "…" : propre;
    }

    private byte[] construireMultipart(String boundary, String folder, long timestamp, String signature,
                                       byte[] fileBytes, String typeMime, String fileName) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ecrireChamp(out, boundary, "api_key", apiKey);
            if (!folder.isEmpty()) {
                ecrireChamp(out, boundary, "folder", folder);
            }
            ecrireChamp(out, boundary, "timestamp", Long.toString(timestamp));
            ecrireChamp(out, boundary, "signature", signature);
            String safeName = fileName == null ? "photo" : fileName.replace("\"", "").replace("\r", "").replace("\n", "");
            out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
            out.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + safeName + "\"\r\n").getBytes(StandardCharsets.UTF_8));
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
