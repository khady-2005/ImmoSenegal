package sn.immosenegal.auth;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "utilisateur_id", nullable = false)
    private UUID utilisateurId;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expire_le", nullable = false)
    private Instant expireLe;

    @Column(name = "utilise", nullable = false)
    private boolean utilise = false;

    protected PasswordResetToken() {}

    public PasswordResetToken(UUID utilisateurId, String tokenHash, Instant expireLe) {
        this.utilisateurId = utilisateurId;
        this.tokenHash = tokenHash;
        this.expireLe = expireLe;
    }

    public UUID getUtilisateurId() { return utilisateurId; }
    public String getTokenHash() { return tokenHash; }
    public Instant getExpireLe() { return expireLe; }
    public boolean isUtilise() { return utilise; }
    public void marquerUtilise() { this.utilise = true; }
}
