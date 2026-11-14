package sn.immosenegal.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sn.immosenegal.audit.AuditService;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.notification.EmailNotificationService;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service
public class ReinitialisationMotDePasseService {
    private static final String MESSAGE_INVALIDE = "Ce lien est invalide ou a expiré. Demandez un nouveau lien.";
    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final EmailNotificationService emails;
    private final RefreshTokenRepository sessions;
    private final AuditService audit;
    private final Clock horloge;
    private final String urlFrontend;
    private final SecureRandom aleatoire = new SecureRandom();

    public ReinitialisationMotDePasseService(UserRepository users, PasswordResetTokenRepository tokens,
            PasswordEncoder encoder, EmailNotificationService emails, RefreshTokenRepository sessions,
            AuditService audit, Clock horloge,
            @Value("${app.frontend-url:http://localhost:5173}") String urlFrontend) {
        this.users = users;
        this.tokens = tokens;
        this.encoder = encoder;
        this.emails = emails;
        this.sessions = sessions;
        this.audit = audit;
        this.horloge = horloge;
        this.urlFrontend = urlFrontend.replaceAll("/+$", "");
    }

    @Transactional
    public void demander(String email) {
        String normalise = email.trim().toLowerCase(Locale.ROOT);
        users.findByEmail(normalise).filter(User::isActif).ifPresent(user -> {
            tokens.deleteAllByUtilisateurId(user.getId());
            byte[] octets = new byte[32];
            aleatoire.nextBytes(octets);
            String brut = Base64.getUrlEncoder().withoutPadding().encodeToString(octets);
            tokens.save(new PasswordResetToken(user.getId(), empreinte(brut), horloge.instant().plus(Duration.ofMinutes(30))));
            String lien = urlFrontend + "/reinitialiser-mot-de-passe?token=" + brut;
            emails.envoyer(user, "Réinitialisation du mot de passe",
                "Vous avez demandé à modifier votre mot de passe. Ouvrez ce lien dans les 30 minutes :\n\n"
                + lien + "\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.");
        });
    }

    @Transactional
    public void reinitialiser(String brut, String nouveauMotDePasse) {
        if (brut == null || brut.isBlank()) throw lienInvalide();
        PasswordResetToken jeton = tokens.findByTokenHashAndUtiliseFalse(empreinte(brut))
            .orElseThrow(ReinitialisationMotDePasseService::lienInvalide);
        Instant maintenant = horloge.instant();
        if (!jeton.getExpireLe().isAfter(maintenant)) throw lienInvalide();

        User user = users.findById(jeton.getUtilisateurId()).filter(User::isActif)
            .orElseThrow(ReinitialisationMotDePasseService::lienInvalide);
        user.setPasswordHash(encoder.encode(nouveauMotDePasse));
        jeton.marquerUtilise();
        tokens.save(jeton);
        tokens.deleteAllByUtilisateurId(user.getId());
        sessions.revoquerTous(user.getId(), maintenant);
        audit.enregistrer("MOT_DE_PASSE_REINITIALISE", user.getId(), "Mot de passe modifié via lien temporaire");
    }

    private static ApiException lienInvalide() {
        return new ApiException(HttpStatus.BAD_REQUEST, MESSAGE_INVALIDE);
    }

    private static String empreinte(String valeur) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(valeur.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
