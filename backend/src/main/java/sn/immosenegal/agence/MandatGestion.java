package sn.immosenegal.agence;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;
import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.user.User;

@Entity
@Table(name = "mandats_gestion")
public class MandatGestion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agence_id", nullable = false)
    private Agence agence;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "annonce_id", nullable = false)
    private Annonce annonce;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proprietaire_id", nullable = false)
    private User proprietaire;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "propose_par", nullable = false)
    private User proposePar;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private OrigineMandatGestion origine;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutMandatGestion statut = StatutMandatGestion.EN_ATTENTE;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "decide_le")
    private Instant decideLe;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resiliation_demandee_par")
    private User resiliationDemandeePar;

    protected MandatGestion() {}

    public MandatGestion(Agence agence, Annonce annonce, User proprietaire, User proposePar,
            OrigineMandatGestion origine) {
        this.agence = agence;
        this.annonce = annonce;
        this.proprietaire = proprietaire;
        this.proposePar = proposePar;
        this.origine = origine;
    }

    public UUID getId() { return id; }
    public Agence getAgence() { return agence; }
    public Annonce getAnnonce() { return annonce; }
    public User getProprietaire() { return proprietaire; }
    public User getProposePar() { return proposePar; }
    public OrigineMandatGestion getOrigine() { return origine; }
    public StatutMandatGestion getStatut() { return statut; }
    public Instant getCreeLe() { return creeLe; }
    public Instant getDecideLe() { return decideLe; }
    public User getResiliationDemandeePar() { return resiliationDemandeePar; }

    public void demanderResiliation(User demandeur) {
        if (statut != StatutMandatGestion.ACCEPTE) throw new IllegalStateException("Seul un mandat accepté peut faire l'objet d'une demande de résiliation.");
        this.resiliationDemandeePar = demandeur;
        this.statut = StatutMandatGestion.RESILIATION_DEMANDEE;
    }

    public void deciderResiliation(boolean accepter) {
        if (statut != StatutMandatGestion.RESILIATION_DEMANDEE) throw new IllegalStateException("Aucune demande de résiliation en attente.");
        this.statut = accepter ? StatutMandatGestion.RESILIE : StatutMandatGestion.ACCEPTE;
        this.decideLe = Instant.now();
        this.resiliationDemandeePar = null;
    }

    public void decider(StatutMandatGestion decision) {
        if (decision != StatutMandatGestion.ACCEPTE && decision != StatutMandatGestion.REFUSE) {
            throw new IllegalArgumentException("Décision de mandat invalide.");
        }
        this.statut = decision;
        this.decideLe = Instant.now();
    }
}
