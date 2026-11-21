package sn.immosenegal.visite;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.user.User;

@Entity
@Table(name = "demandes_visite")
public class DemandeVisite {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "annonce_id", nullable = false)
    private Annonce annonce;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @Column(name = "date_visite", nullable = false)
    private LocalDateTime dateVisite;

    @Column(length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutVisite statut = StatutVisite.EN_ATTENTE;

    @Column(name = "reponse_proprietaire", length = 1000)
    private String reponseProprietaire;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "modifie_le", nullable = false)
    private Instant modifieLe = Instant.now();

    protected DemandeVisite() {}

    public DemandeVisite(Annonce annonce, User client, LocalDateTime dateVisite, String message) {
        this.annonce = annonce;
        this.client = client;
        this.dateVisite = dateVisite;
        this.message = message;
    }

    public UUID getId() { return id; }
    public Annonce getAnnonce() { return annonce; }
    public User getClient() { return client; }
    public LocalDateTime getDateVisite() { return dateVisite; }
    public String getMessage() { return message; }
    public StatutVisite getStatut() { return statut; }
    public String getReponseProprietaire() { return reponseProprietaire; }
    public Instant getCreeLe() { return creeLe; }
    public Instant getModifieLe() { return modifieLe; }

    public void accepter(String reponse) {
        this.statut = StatutVisite.ACCEPTEE;
        this.reponseProprietaire = reponse;
        this.modifieLe = Instant.now();
    }

    public void refuser(String reponse) {
        this.statut = StatutVisite.REFUSEE;
        this.reponseProprietaire = reponse;
        this.modifieLe = Instant.now();
    }

    public void proposer(LocalDateTime nouvelleDate, String reponse) {
        this.dateVisite = nouvelleDate;
        this.statut = StatutVisite.PROPOSEE;
        this.reponseProprietaire = reponse;
        this.modifieLe = Instant.now();
    }

    public void confirmer() {
        this.statut = StatutVisite.ACCEPTEE;
        this.modifieLe = Instant.now();
    }

    public void marquerEffectuee() {
        this.statut = StatutVisite.VISITEE;
        this.modifieLe = Instant.now();
    }

    public void annuler() {
        this.statut = StatutVisite.ANNULEE;
        this.modifieLe = Instant.now();
    }
}
