package sn.immosenegal.agence;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
import sn.immosenegal.annonce.Annonce;

@Entity
@Table(name = "agence_ventes")
public class VenteAgence {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "agence_id", nullable = false) private Agence agence;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "annonce_id", nullable = false) private Annonce annonce;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "agent_membre_id", nullable = false) private MembreAgence agent;
    @Column(name = "acheteur_nom", nullable = false, length = 150) private String acheteurNom;
    @Column(name = "acheteur_telephone", length = 30) private String acheteurTelephone;
    @Column(name = "prix_vente", nullable = false, precision = 16, scale = 2) private BigDecimal prixVente;
    @Column(name = "taux_commission", nullable = false, precision = 5, scale = 2) private BigDecimal tauxCommission;
    @Column(name = "part_agent", nullable = false, precision = 5, scale = 2) private BigDecimal partAgent;
    @Column(name = "date_vente", nullable = false) private java.time.LocalDate dateVente;
    @Column(nullable = false, length = 20) private String statut = "ENREGISTREE";
    @Column(name = "cree_par", nullable = false) private UUID creePar;
    @Column(name = "cree_le", nullable = false, updatable = false) private Instant creeLe = Instant.now();

    protected VenteAgence() {}
    public VenteAgence(Agence agence, Annonce annonce, MembreAgence agent, String acheteurNom, String acheteurTelephone,
            BigDecimal prixVente, BigDecimal tauxCommission, BigDecimal partAgent, java.time.LocalDate dateVente, UUID creePar) {
        this.agence=agence; this.annonce=annonce; this.agent=agent; this.acheteurNom=acheteurNom;
        this.acheteurTelephone=acheteurTelephone; this.prixVente=prixVente; this.tauxCommission=tauxCommission;
        this.partAgent=partAgent; this.dateVente=dateVente; this.creePar=creePar;
    }
    public UUID getId(){return id;} public Agence getAgence(){return agence;} public Annonce getAnnonce(){return annonce;}
    public MembreAgence getAgent(){return agent;} public String getAcheteurNom(){return acheteurNom;}
    public String getAcheteurTelephone(){return acheteurTelephone;} public BigDecimal getPrixVente(){return prixVente;}
    public BigDecimal getTauxCommission(){return tauxCommission;} public BigDecimal getPartAgent(){return partAgent;}
    public java.time.LocalDate getDateVente(){return dateVente;} public String getStatut(){return statut;} public Instant getCreeLe(){return creeLe;}
    public BigDecimal getCommissionTotale(){return prixVente.multiply(tauxCommission).divide(new BigDecimal("100"));}
    public BigDecimal getCommissionAgent(){return getCommissionTotale().multiply(partAgent).divide(new BigDecimal("100"));}
    public BigDecimal getCommissionAgence(){return getCommissionTotale().subtract(getCommissionAgent());}
    public void definirStatut(String statut){this.statut=statut;}
}