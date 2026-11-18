package sn.immosenegal.agence;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;

import sn.immosenegal.user.User;

@Entity
@Table(name = "agence_candidatures")
public class CandidatureAgence {
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
    @Column(nullable = false, length = 20)
    private StatutCandidatureAgence statut = StatutCandidatureAgence.EN_ATTENTE;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "traitee_le")
    private Instant traiteeLe;

    protected CandidatureAgence() {}

    public CandidatureAgence(Agence agence, User utilisateur, FonctionAgence fonction) {
        this.agence = agence;
        this.utilisateur = utilisateur;
        this.fonction = fonction;
    }

    public UUID getId() { return id; }
    public Agence getAgence() { return agence; }
    public User getUtilisateur() { return utilisateur; }
    public FonctionAgence getFonction() { return fonction; }
    public StatutCandidatureAgence getStatut() { return statut; }
    public Instant getCreeLe() { return creeLe; }
    public Instant getTraiteeLe() { return traiteeLe; }

    public void traiter(StatutCandidatureAgence statut) {
        this.statut = statut;
        this.traiteeLe = Instant.now();
    }
}
