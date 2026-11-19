package sn.immosenegal.agence;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "agence_paiements_commissions")
public class PaiementCommissionAgence {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vente_id", nullable = false)
    private VenteAgence vente;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private BeneficiaireCommission beneficiaire;

    @Column(nullable = false, precision = 16, scale = 2)
    private BigDecimal montant;

    @Column(name = "date_paiement", nullable = false)
    private LocalDate datePaiement;

    @Column(name = "mode_paiement", nullable = false, length = 30)
    private String modePaiement;

    @Column(length = 150)
    private String reference;

    @Column(length = 500)
    private String note;

    @Column(name = "enregistre_par", nullable = false)
    private UUID enregistrePar;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    protected PaiementCommissionAgence() {}

    public PaiementCommissionAgence(VenteAgence vente, BeneficiaireCommission beneficiaire,
            BigDecimal montant, LocalDate datePaiement, String modePaiement,
            String reference, String note, UUID enregistrePar) {
        this.vente = vente;
        this.beneficiaire = beneficiaire;
        this.montant = montant;
        this.datePaiement = datePaiement;
        this.modePaiement = modePaiement;
        this.reference = reference;
        this.note = note;
        this.enregistrePar = enregistrePar;
    }

    public UUID getId() { return id; }
    public VenteAgence getVente() { return vente; }
    public BeneficiaireCommission getBeneficiaire() { return beneficiaire; }
    public BigDecimal getMontant() { return montant; }
    public LocalDate getDatePaiement() { return datePaiement; }
    public String getModePaiement() { return modePaiement; }
    public String getReference() { return reference; }
    public String getNote() { return note; }
    public Instant getCreeLe() { return creeLe; }
}
