package sn.immosenegal.avis;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;
import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.user.User;

@Entity
@Table(name = "avis", uniqueConstraints = @UniqueConstraint(name = "uk_avis_annonce_auteur", columnNames = {"annonce_id", "auteur_id"}))
public class Avis {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "annonce_id", nullable = false)
    private Annonce annonce;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "auteur_id", nullable = false)
    private User auteur;

    @Column(nullable = false)
    private int note;

    @Column(nullable = false, length = 1200)
    private String commentaire;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    protected Avis() {}

    public Avis(Annonce annonce, User auteur, int note, String commentaire) {
        this.annonce = annonce;
        this.auteur = auteur;
        this.note = note;
        this.commentaire = commentaire;
    }

    public UUID getId() { return id; }
    public Annonce getAnnonce() { return annonce; }
    public User getAuteur() { return auteur; }
    public int getNote() { return note; }
    public String getCommentaire() { return commentaire; }
    public Instant getCreeLe() { return creeLe; }
}
