package sn.immosenegal.notification;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;
import sn.immosenegal.user.User;

@Entity
@Table(name = "notifications")
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "destinataire_id", nullable = false)
    private User destinataire;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false, length = 160)
    private String titre;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(length = 300)
    private String lien;

    @Column(nullable = false)
    private boolean lue = false;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    protected Notification() {}

    public Notification(User destinataire, String type, String titre, String message, String lien) {
        this.destinataire = destinataire;
        this.type = type;
        this.titre = titre;
        this.message = message;
        this.lien = lien;
    }

    public UUID getId() { return id; }
    public User getDestinataire() { return destinataire; }
    public String getType() { return type; }
    public String getTitre() { return titre; }
    public String getMessage() { return message; }
    public String getLien() { return lien; }
    public boolean isLue() { return lue; }
    public Instant getCreeLe() { return creeLe; }
    public void marquerLue() { this.lue = true; }
}
