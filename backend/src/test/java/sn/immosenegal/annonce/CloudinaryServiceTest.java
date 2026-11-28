package sn.immosenegal.annonce;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import sn.immosenegal.common.ApiException;

class CloudinaryServiceTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private HttpServer server;

    @AfterEach
    void arreterServeur() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void nettoieEspacesEtGuillemetsDesVariablesEtCalculeSignatureSha1() throws Exception {
        CloudinaryService service = new CloudinaryService(
            "  \"mon-cloud\" \r\n",
            " 'cle-123' \t",
            "  secret-xyz \u00A0",
            mapper,
            "http://localhost:9999/"
        );

        assertThat(service.estConfigure()).isTrue();
        assertThat(service.getCloudName()).isEqualTo("mon-cloud");
        assertThat(service.getApiKey()).isEqualTo("cle-123");

        String params = "folder=immosenegal/annonces/abc&timestamp=1700000000";
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        String attendu = HexFormat.of().formatHex(md.digest((params + "secret-xyz").getBytes(StandardCharsets.UTF_8)));
        assertThat(service.signer(params)).isEqualTo(attendu);
    }

    @Test
    void televerserJpgPngEtWebpEnvoieMultipartEtSignatureValides() throws Exception {
        AtomicReference<String> dernierCorps = new AtomicReference<>();
        AtomicReference<String> dernierContentType = new AtomicReference<>();
        AtomicReference<String> dernierChemin = new AtomicReference<>();

        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/mon-cloud/image/upload", exchange -> {
            dernierChemin.set(exchange.getRequestURI().getPath());
            dernierContentType.set(exchange.getRequestHeaders().getFirst("Content-Type"));
            byte[] body = exchange.getRequestBody().readAllBytes();
            dernierCorps.set(new String(body, StandardCharsets.ISO_8859_1));
            byte[] resp = "{\"secure_url\":\"https://res.cloudinary.com/mon-cloud/image/upload/v1/ok.webp\",\"public_id\":\"immosenegal/ok\"}"
                .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, resp.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(resp);
            }
        });
        server.start();

        String baseUrl = "http://localhost:" + server.getAddress().getPort();
        CloudinaryService service = new CloudinaryService(" mon-cloud ", " cle-pub ", " secret-prive ", mapper, baseUrl);

        List<String[]> formats = List.of(
            new String[] { "image/jpeg", "photo.jpg" },
            new String[] { "image/png", "photo.png" },
            new String[] { "image/webp", "photo.webp" }
        );

        for (String[] fmt : formats) {
            String mime = fmt[0];
            String nom = fmt[1];
            CloudinaryService.UploadResult res = service.televerser(
                "DATA-IMAGE".getBytes(StandardCharsets.UTF_8), mime, nom, "immosenegal/annonces/1");

            assertThat(res.secureUrl()).isEqualTo("https://res.cloudinary.com/mon-cloud/image/upload/v1/ok.webp");
            assertThat(res.publicId()).isEqualTo("immosenegal/ok");
            assertThat(dernierChemin.get()).isEqualTo("/mon-cloud/image/upload");
            assertThat(dernierContentType.get()).startsWith("multipart/form-data; boundary=----ImmoSenegal");
            assertThat(dernierCorps.get())
                .contains("name=\"api_key\"\r\n\r\ncle-pub\r\n")
                .contains("name=\"folder\"\r\n\r\nimmosenegal/annonces/1\r\n")
                .contains("name=\"timestamp\"\r\n\r\n")
                .contains("name=\"signature\"\r\n\r\n")
                .contains("name=\"file\"; filename=\"" + nom + "\"")
                .contains("Content-Type: " + mime)
                .contains("DATA-IMAGE");
        }
    }

    @Test
    void erreurCloudinaryJournaliseCodeEtMessageSansExposerCleSecretOuSignature() throws IOException {
        String apiKey = "CLE_SECRETE_12345";
        String apiSecret = "SECRET_PRIVE_67890";

        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/mon-cloud/image/upload", exchange -> {
            exchange.getRequestBody().readAllBytes();
            String jsonErr = "{\"error\":{\"message\":\"Invalid Signature abc (api_key=" + apiKey + ", secret=" + apiSecret + ")\"}}";
            byte[] resp = jsonErr.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(401, resp.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(resp);
            }
        });
        server.start();

        Logger logger = (Logger) LoggerFactory.getLogger(CloudinaryService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        try {
            String baseUrl = "http://localhost:" + server.getAddress().getPort();
            CloudinaryService service = new CloudinaryService("mon-cloud", apiKey, apiSecret, mapper, baseUrl);

            assertThatThrownBy(() -> service.televerser(new byte[] { 1, 2, 3 }, "image/webp", "photo.webp", "immosenegal/annonces/1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_GATEWAY));

            assertThat(appender.list).isNotEmpty();
            String logMsg = appender.list.get(0).getFormattedMessage();
            assertThat(logMsg)
                .contains("code=401")
                .contains("Invalid Signature")
                .doesNotContain(apiKey)
                .doesNotContain(apiSecret);
        } finally {
            logger.detachAppender(appender);
        }
    }
}
