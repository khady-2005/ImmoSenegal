package sn.immosenegal.agence;

import java.time.Instant;
import java.time.LocalDate;
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

import sn.immosenegal.user.User;

@Entity
@Table(name = "agence_missions")
public class MissionAgence {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agence_id", nullable = false)
    private Agence agence;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "membre_id", nullable = false)
    private MembreAgence membre;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "createur_id", nullable = false)
    private User createur;

    @Column(nullable = false, length = 160)
    private String titre;

    @Column(length = 2000)
    private String description;

    @Column(name = "date_echeance")
    private LocalDate dateEcheance;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutMissionAgence statut = StatutMissionAgence.A_FAIRE;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "modifie_le", nullable = false)
    private Instant modifieLe = Instant.now();

    protected MissionAgence() {}

    public MissionAgence(Agence agence, MembreAgence membre, User createur, String titre,
                         String description, LocalDate dateEcheance) {
        this.agence = agence;
        this.membre = membre;
        this.createur = createur;
        this.titre = titre;
        this.description = description;
        this.dateEcheance = dateEcheance;
    }

    public UUID getId() { return id; }
    public Agence getAgence() { return agence; }
    public MembreAgence getMembre() { return membre; }
    public User getCreateur() { return createur; }
    public String getTitre() { return titre; }
    public String getDescription() { return description; }
    public LocalDate getDateEcheance() { return dateEcheance; }
    public StatutMissionAgence getStatut() { return statut; }
    public Instant getCreeLe() { return creeLe; }
    public Instant getModifieLe() { return modifieLe; }

    public void changerStatut(StatutMissionAgence statut) {
        this.statut = statut;
        this.modifieLe = Instant.now();
    }
}
