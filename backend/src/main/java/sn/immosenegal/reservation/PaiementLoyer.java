package sn.immosenegal.reservation;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.persistence.*;
import sn.immosenegal.user.User;

@Entity
@Table(name="paiements_loyer")
public class PaiementLoyer {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="contrat_id",nullable=false) private ContratLocation contrat;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="enregistre_par",nullable=false) private User enregistrePar;
 @Column(nullable=false,precision=14,scale=2) private BigDecimal montant;
 @Column(name="periode",nullable=false) private LocalDate periode;
 @Column(name="date_paiement",nullable=false) private LocalDate datePaiement;
 @Column(length=500) private String reference;
 @Column(name="beneficiaire_type",nullable=false,length=20) private String beneficiaireType;
 @Column(name="beneficiaire_id",nullable=false) private UUID beneficiaireId;
 @Column(name="beneficiaire_nom",nullable=false,length=160) private String beneficiaireNom;
 @Column(name="statut_confirmation",nullable=false,length=20) private String statutConfirmation="EN_ATTENTE";
 @Column(name="confirme_le") private Instant confirmeLe;
 @Column(name="cree_le",nullable=false,updatable=false) private Instant creeLe=Instant.now();
 protected PaiementLoyer(){}
 public PaiementLoyer(ContratLocation c,User u,BigDecimal m,LocalDate p,LocalDate d,String r,String type,UUID id,String nom){
  contrat=c;enregistrePar=u;montant=m;periode=p;datePaiement=d;reference=r;beneficiaireType=type;beneficiaireId=id;beneficiaireNom=nom;
 }
 public void confirmer(boolean accepte){statutConfirmation=accepte?"CONFIRME":"REFUSE";confirmeLe=Instant.now();}
 public UUID getId(){return id;} public BigDecimal getMontant(){return montant;} public LocalDate getPeriode(){return periode;} public LocalDate getDatePaiement(){return datePaiement;} public String getReference(){return reference;} public Instant getCreeLe(){return creeLe;} public User getEnregistrePar(){return enregistrePar;}
 public String getBeneficiaireType(){return beneficiaireType;} public UUID getBeneficiaireId(){return beneficiaireId;} public String getBeneficiaireNom(){return beneficiaireNom;} public String getStatutConfirmation(){return statutConfirmation;} public Instant getConfirmeLe(){return confirmeLe;}
}
