package sn.immosenegal.messagerie;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
import sn.immosenegal.reservation.Reservation;
import sn.immosenegal.user.User;

@Entity
@Table(name = "messages_conversation")
public class MessageConversation {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expediteur_id", nullable = false)
    private User expediteur;
    @Column(nullable = false, length = 2000)
    private String contenu;
    @Column(name = "envoye_le", nullable = false, updatable = false)
    private Instant envoyeLe = Instant.now();
    protected MessageConversation() {}
    public MessageConversation(Reservation reservation, User expediteur, String contenu) {
        this.reservation = reservation; this.expediteur = expediteur; this.contenu = contenu;
    }
    public UUID getId() { return id; }
    public Reservation getReservation() { return reservation; }
    public User getExpediteur() { return expediteur; }
    public String getContenu() { return contenu; }
    public Instant getEnvoyeLe() { return envoyeLe; }
}