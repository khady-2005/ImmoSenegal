package sn.immosenegal.messagerie;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
import sn.immosenegal.agence.MandatGestion;
import sn.immosenegal.user.User;

@Entity
@Table(name = "messages_mandats_gestion")
public class MessageMandatGestion {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mandat_id", nullable = false)
    private MandatGestion mandat;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expediteur_id", nullable = false)
    private User expediteur;
    @Column(nullable = false, length = 2000)
    private String contenu;
    @Column(name = "envoye_le", nullable = false, updatable = false)
    private Instant envoyeLe = Instant.now();

    protected MessageMandatGestion() {}
    public MessageMandatGestion(MandatGestion mandat, User expediteur, String contenu) {
        this.mandat = mandat; this.expediteur = expediteur; this.contenu = contenu;
    }
    public UUID getId() { return id; }
    public MandatGestion getMandat() { return mandat; }
    public User getExpediteur() { return expediteur; }
    public String getContenu() { return contenu; }
    public Instant getEnvoyeLe() { return envoyeLe; }
}
