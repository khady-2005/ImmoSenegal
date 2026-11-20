package sn.immosenegal.reservation;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;
import sn.immosenegal.agence.Agence;
import sn.immosenegal.agence.MandatGestion;

@Entity
@Table(name = "commissions_locations_agence")
public class CommissionLocationAgence {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agence_id", nullable = false)
    private Agence agence;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mandat_id", nullable = false)
    private MandatGestion mandat;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contrat_id", nullable = false)
    private ContratLocation contrat;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "paiement_loyer_id", nullable = false, unique = true)
    private PaiementLoyer paiementLoyer;

    @Column(name = "taux_applique", nullable = false, precision = 5, scale = 2)
    private BigDecimal tauxApplique;

    @Column(name = "base_calcul", nullable = false, precision = 14, scale = 2)
    private BigDecimal baseCalcul;

    @Column(name = "montant_commission", nullable = false, precision = 14, scale = 2)
    private BigDecimal montantCommission;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    protected CommissionLocationAgence() {}

    public CommissionLocationAgence(Agence agence, MandatGestion mandat, ContratLocation contrat,
            PaiementLoyer paiementLoyer, BigDecimal taux, BigDecimal base, BigDecimal montant) {
        this.agence = agence;
        this.mandat = mandat;
        this.contrat = contrat;
        this.paiementLoyer = paiementLoyer;
        this.tauxApplique = taux;
        this.baseCalcul = base;
        this.montantCommission = montant;
    }

    public UUID getId() { return id; }
    public Agence getAgence() { return agence; }
    public MandatGestion getMandat() { return mandat; }
    public ContratLocation getContrat() { return contrat; }
    public PaiementLoyer getPaiementLoyer() { return paiementLoyer; }
    public BigDecimal getTauxApplique() { return tauxApplique; }
    public BigDecimal getBaseCalcul() { return baseCalcul; }
    public BigDecimal getMontantCommission() { return montantCommission; }
    public Instant getCreeLe() { return creeLe; }
}
