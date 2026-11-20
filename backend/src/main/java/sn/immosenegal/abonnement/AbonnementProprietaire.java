package sn.immosenegal.abonnement;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "abonnements_proprietaires")
public class AbonnementProprietaire {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "proprietaire_id", nullable = false)
    private UUID proprietaireId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ForfaitAbonnement forfait;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal montant;

    @Column(name = "date_debut")
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutAbonnement statut;

    @Column(name = "mode_paiement", nullable = false, length = 30)
    private String modePaiement;

    @Column(name = "reference_paiement", length = 150)
    private String referencePaiement;

    @Column(name = "paydunya_token", length = 120, unique = true)
    private String paydunyaToken;

    @Column(name = "paytech_ref_command", length = 80, unique = true)
    private String paytechRefCommand;

    @Column(name = "reference_fournisseur", length = 150)
    private String referenceFournisseur;

    @Column(name = "paiement_confirme_le")
    private Instant paiementConfirmeLe;

    @Column(columnDefinition = "text")
    private String note;

    @Column(name = "valide_par")
    private UUID validePar;

    @Column(name = "cree_le", nullable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "modifie_le", nullable = false)
    private Instant modifieLe = Instant.now();

    protected AbonnementProprietaire() {}

    public AbonnementProprietaire(UUID proprietaireId, ForfaitAbonnement forfait, BigDecimal montant,
            String modePaiement, String referencePaiement, String note) {
        this.proprietaireId = proprietaireId;
        this.forfait = forfait;
        this.montant = montant;
        this.modePaiement = modePaiement;
        this.referencePaiement = referencePaiement;
        this.note = note;
        this.statut = StatutAbonnement.EN_ATTENTE;
    }

    public UUID getId() { return id; }
    public UUID getProprietaireId() { return proprietaireId; }
    public ForfaitAbonnement getForfait() { return forfait; }
    public BigDecimal getMontant() { return montant; }
    public LocalDate getDateDebut() { return dateDebut; }
    public LocalDate getDateFin() { return dateFin; }
    public StatutAbonnement getStatut() { return statut; }
    public String getModePaiement() { return modePaiement; }
    public String getReferencePaiement() { return referencePaiement; }
    public String getNote() { return note; }
    public UUID getValidePar() { return validePar; }
    public String getPaydunyaToken() { return paydunyaToken; }
    public String getPaytechRefCommand() { return paytechRefCommand; }
    public String getReferenceFournisseur() { return referenceFournisseur; }
    public Instant getPaiementConfirmeLe() { return paiementConfirmeLe; }

    public void associerPaydunya(String invoiceToken) {
        this.paydunyaToken = invoiceToken;
        this.modifieLe = Instant.now();
    }

    public void associerPaytech(String reference) {
        this.paytechRefCommand = reference;
        this.modifieLe = Instant.now();
    }

    public void confirmerPaiement(String reference) {
        if (this.statut == StatutAbonnement.EN_ATTENTE) {
            this.referenceFournisseur = reference;
            this.paiementConfirmeLe = Instant.now();
            this.statut = StatutAbonnement.ACTIF;
            LocalDate debut = LocalDate.now();
            this.dateDebut = debut;
            this.dateFin = switch (forfait) {
                case MENSUEL -> debut.plusMonths(1).minusDays(1);
                case TRIMESTRIEL -> debut.plusMonths(3).minusDays(1);
                case ANNUEL -> debut.plusYears(1).minusDays(1);
            };
            this.modifieLe = Instant.now();
        }
    }

    public Instant getCreeLe() { return creeLe; }

    public void activer(UUID admin, LocalDate debut) {
        this.statut = StatutAbonnement.ACTIF;
        this.dateDebut = debut;
        this.dateFin = switch (forfait) {
            case MENSUEL -> debut.plusMonths(1).minusDays(1);
            case TRIMESTRIEL -> debut.plusMonths(3).minusDays(1);
            case ANNUEL -> debut.plusYears(1).minusDays(1);
        };
        this.validePar = admin;
        this.modifieLe = Instant.now();
    }

    public void refuser(UUID admin, String motif) {
        this.statut = StatutAbonnement.REFUSE;
        this.validePar = admin;
        this.note = motif == null || motif.isBlank() ? this.note : motif.trim();
        this.modifieLe = Instant.now();
    }

    public void annulerPaiement() {
        if (this.statut == StatutAbonnement.EN_ATTENTE
                && (this.paydunyaToken != null || this.paytechRefCommand != null)) {
            this.statut = StatutAbonnement.ANNULE;
            this.modifieLe = Instant.now();
        }
    }

    public void expirer() {
        this.statut = StatutAbonnement.EXPIRE;
        this.modifieLe = Instant.now();
    }
}