package sn.immosenegal.messagerie;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.user.User;

@Entity
@Table(name = "messages_directs")
public class MessageDirect {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "annonce_id", nullable = false)
    private Annonce annonce;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expediteur_id", nullable = false)
    private User expediteur;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "interlocuteur_id", nullable = false)
    private User interlocuteur;

    @Column(nullable = false, length = 2000)
    private String contenu;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    protected MessageDirect() {}

    public MessageDirect(Annonce annonce, User expediteur, User interlocuteur, String contenu) {
        this.annonce = annonce;
        this.expediteur = expediteur;
        this.interlocuteur = interlocuteur;
        this.contenu = contenu;
    }

    public UUID getId() { return id; }
    public Annonce getAnnonce() { return annonce; }
    public User getExpediteur() { return expediteur; }
    public User getInterlocuteur() { return interlocuteur; }
    public String getContenu() { return contenu; }
    public Instant getCreeLe() { return creeLe; }
}
