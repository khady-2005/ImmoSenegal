package sn.immosenegal.favori;

import java.util.UUID;

import jakarta.persistence.*;

import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.user.User;

@Entity
@Table(name = "favoris", uniqueConstraints = @UniqueConstraint(name = "uk_favori_client_annonce", columnNames = {"client_id", "annonce_id"}))
public class Favori {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "annonce_id", nullable = false)
    private Annonce annonce;

    protected Favori() {}

    public Favori(User client, Annonce annonce) {
        this.client = client;
        this.annonce = annonce;
    }

    public UUID getId() { return id; }
    public User getClient() { return client; }
    public Annonce getAnnonce() { return annonce; }
}
