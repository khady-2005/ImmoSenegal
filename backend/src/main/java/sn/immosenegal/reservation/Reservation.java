package sn.immosenegal.reservation;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;
import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.user.User;

@Entity
@Table(name = "reservations")
public class Reservation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "annonce_id", nullable = false)
    private Annonce annonce;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutReservation statut = StatutReservation.EN_ATTENTE;

    @Column(length = 1000)
    private String message;

    @Column(name = "reponse_proprietaire", length = 1000)
    private String reponseProprietaire;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "modifie_le", nullable = false)
    private Instant modifieLe = Instant.now();

    protected Reservation() {}

    public Reservation(Annonce annonce, User client, String message) {
        this.annonce = annonce;
        this.client = client;
        this.message = message;
    }

    public UUID getId() { return id; }
    public Annonce getAnnonce() { return annonce; }
    public User getClient() { return client; }
    public StatutReservation getStatut() { return statut; }
    public String getMessage() { return message; }
    public String getReponseProprietaire() { return reponseProprietaire; }
    public Instant getCreeLe() { return creeLe; }
    public Instant getModifieLe() { return modifieLe; }

    public void accepter(String reponse) {
        this.statut = StatutReservation.ACCEPTEE;
        this.reponseProprietaire = reponse;
        this.modifieLe = Instant.now();
    }

    public void refuser(String reponse) {
        this.statut = StatutReservation.REFUSEE;
        this.reponseProprietaire = reponse;
        this.modifieLe = Instant.now();
    }

    public void annuler() {
        this.statut = StatutReservation.ANNULEE;
        this.modifieLe = Instant.now();
    }
}
