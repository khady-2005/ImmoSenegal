package sn.immosenegal.reservation;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
import sn.immosenegal.user.User;

@Entity
@Table(name = "suivis_depot_garantie")
public class SuiviDepotGarantie {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contrat_id", nullable = false, unique = true)
    private ContratLocation contrat;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "propose_par", nullable = false)
    private User proposePar;
    @Column(name = "montant_restitue", nullable = false, precision = 14, scale = 2)
    private BigDecimal montantRestitue;
    @Column(name = "montant_retenu", nullable = false, precision = 14, scale = 2)
    private BigDecimal montantRetenu;
    @Column(name = "motif_retenue", length = 1500)
    private String motifRetenue;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private StatutDepotGarantie statut = StatutDepotGarantie.A_CONFIRMER;
    @Column(name = "commentaire_locataire", length = 1500)
    private String commentaireLocataire;
    @Column(name = "decide_le")
    private Instant decideLe;
    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    protected SuiviDepotGarantie() {}
    public SuiviDepotGarantie(ContratLocation contrat, User proprietaire, BigDecimal restitue,
                              BigDecimal retenu, String motif) {
        this.contrat = contrat; this.proposePar = proprietaire;
        this.montantRestitue = restitue; this.montantRetenu = retenu; this.motifRetenue = motif;
    }
    public UUID getId() { return id; }
    public ContratLocation getContrat() { return contrat; }
    public User getProposePar() { return proposePar; }
    public BigDecimal getMontantRestitue() { return montantRestitue; }
    public BigDecimal getMontantRetenu() { return montantRetenu; }
    public String getMotifRetenue() { return motifRetenue; }
    public StatutDepotGarantie getStatut() { return statut; }
    public String getCommentaireLocataire() { return commentaireLocataire; }
    public Instant getDecideLe() { return decideLe; }
    public Instant getCreeLe() { return creeLe; }
    public void reproposer(BigDecimal restitue, BigDecimal retenu, String motif) {
        this.montantRestitue = restitue;
        this.montantRetenu = retenu;
        this.motifRetenue = motif;
        this.statut = StatutDepotGarantie.A_CONFIRMER;
        this.decideLe = null;
    }
    public void decider(boolean accepter, String commentaire) {
        statut = accepter ? StatutDepotGarantie.CONFIRME : StatutDepotGarantie.CONTESTE;
        commentaireLocataire = commentaire;
        decideLe = Instant.now();
    }
}
