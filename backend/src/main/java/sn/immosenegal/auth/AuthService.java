package sn.immosenegal.auth;

import java.time.Clock;
import java.time.Duration;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import sn.immosenegal.audit.AuditService;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.common.TropDeTentativesException;
import sn.immosenegal.security.JwtService;
import sn.immosenegal.security.LimiteurEchecs;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service
public class AuthService {

    private static final String MESSAGE_IDENTIFIANTS = "Email ou mot de passe incorrect.";

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuditService audit;
    /** Hash factice : permet de comparer quand même un mot de passe si l'email est inconnu (même durée de réponse). */
    private final String hashFactice;
    /** Limite par compte (email) : protège un compte contre la devinette de mot de passe. */
    private final LimiteurEchecs limiteParEmail;
    /** Limite par adresse IP, plus large : protège contre un attaquant qui essaie de nombreux comptes. */
    private final LimiteurEchecs limiteParIp;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt, AuditService audit, Clock horloge,
                       @Value("${app.security.login-max-failures:5}") int maxParEmail,
                       @Value("${app.security.login-ip-max-failures:20}") int maxParIp,
                       @Value("${app.security.login-window-minutes:15}") long fenetreMinutes) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.audit = audit;
        this.hashFactice = encoder.encode("mot-de-passe-factice-pour-temps-constant");
        Duration fenetre = Duration.ofMinutes(fenetreMinutes);
        this.limiteParEmail = new LimiteurEchecs(maxParEmail, fenetre, horloge);
        this.limiteParIp = new LimiteurEchecs(maxParIp, fenetre, horloge);
    }

    public UserResponse inscrire(RegisterRequest requete) {
        String email = normaliser(requete.email());
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Un compte existe déjà avec cet email.");
        }
        String telephone = requete.telephone() == null || requete.telephone().isBlank() ? null : requete.telephone().trim();
        // Une inscription publique crée un CLIENT ou un PROPRIETAIRE (jamais ADMIN ni rôle d'agence).
        Role role = Boolean.TRUE.equals(requete.estProprietaire()) ? Role.PROPRIETAIRE : Role.CLIENT;
        User utilisateur = new User(email, encoder.encode(requete.password()), requete.nomComplet().trim(), telephone, role);
        users.save(utilisateur);
        audit.enregistrer("INSCRIPTION", utilisateur.getId(), "Nouveau compte " + role.name());
        return UserResponse.de(utilisateur);
    }

    public AuthResponse connecter(LoginRequest requete, String adresseIp) {
        String email = normaliser(requete.email());
        String cleEmail = "email:" + email;
        String cleIp = "ip:" + adresseIp;

        // Le blocage est vérifié AVANT le mot de passe : un compte bloqué refuse même le bon mot de passe.
        long attente = Math.max(limiteParEmail.secondesRestantes(cleEmail), limiteParIp.secondesRestantes(cleIp));
        if (attente > 0) {
            audit.enregistrer("CONNEXION_BLOQUEE", null, "Trop d'échecs (limite atteinte)");
            throw new TropDeTentativesException(attente);
        }

        User utilisateur = users.findByEmail(email).orElse(null);

        String hash = utilisateur != null ? utilisateur.getPasswordHash() : hashFactice;
        boolean motDePasseValide = encoder.matches(requete.password(), hash);

        if (utilisateur == null || !utilisateur.isActif() || !motDePasseValide) {
            limiteParEmail.enregistrerEchec(cleEmail);
            limiteParIp.enregistrerEchec(cleIp);
            audit.enregistrer("CONNEXION_ECHEC", utilisateur != null ? utilisateur.getId() : null, "Identifiants refusés");
            // Même message dans tous les cas : on ne révèle pas si l'email existe.
            throw new ApiException(HttpStatus.UNAUTHORIZED, MESSAGE_IDENTIFIANTS);
        }

        limiteParEmail.reinitialiser(cleEmail);
        audit.enregistrer("CONNEXION_OK", utilisateur.getId(), null);
        return new AuthResponse(jwt.creer(utilisateur.getId()), "Bearer", jwt.dureeSecondes(), UserResponse.de(utilisateur));
    }


    public void changerMotDePasse(java.util.UUID utilisateurId, ChangerMotDePasseRequest requete) {
        User utilisateur = users.findById(utilisateurId)
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        if (!encoder.matches(requete.motDePasseActuel(), utilisateur.getPasswordHash())) {
            audit.enregistrer("CHANGEMENT_MOT_DE_PASSE_ECHEC", utilisateurId, "Ancien mot de passe incorrect");
            throw new ApiException(HttpStatus.BAD_REQUEST, "Le mot de passe actuel est incorrect.");
        }
        if (encoder.matches(requete.nouveauMotDePasse(), utilisateur.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choisissez un nouveau mot de passe différent de l'ancien.");
        }
        utilisateur.setPasswordHash(encoder.encode(requete.nouveauMotDePasse()));
        users.save(utilisateur);
        audit.enregistrer("CHANGEMENT_MOT_DE_PASSE", utilisateurId, "Mot de passe modifié depuis le profil");
    }

    private static String normaliser(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
