package sn.immosenegal.agence;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import sn.immosenegal.user.User;

@Entity
@Table(name = "agence_membres", uniqueConstraints = {
    @UniqueConstraint(name = "uq_agence_membre", columnNames = {"agence_id", "user_id"})
})
public class MembreAgence {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agence_id", nullable = false)
    private Agence agence;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User utilisateur;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private FonctionAgence fonction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private StatutMembreAgence statut = StatutMembreAgence.INVITATION_EN_ATTENTE;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    protected MembreAgence() {
        // requis par JPA
    }

    public MembreAgence(Agence agence, User utilisateur, FonctionAgence fonction) {
        this.agence = agence;
        this.utilisateur = utilisateur;
        this.fonction = fonction;
    }

    public UUID getId() { return id; }
    public Agence getAgence() { return agence; }
    public User getUtilisateur() { return utilisateur; }
    public FonctionAgence getFonction() { return fonction; }
    public StatutMembreAgence getStatut() { return statut; }
    public Instant getCreeLe() { return creeLe; }

    public void setFonction(FonctionAgence fonction) { this.fonction = fonction; }
    public void setStatut(StatutMembreAgence statut) { this.statut = statut; }
}
