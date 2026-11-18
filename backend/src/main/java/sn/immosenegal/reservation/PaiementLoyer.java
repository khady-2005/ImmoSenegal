package sn.immosenegal.reservation;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.persistence.*;
import sn.immosenegal.user.User;
@Entity @Table(name="paiements_loyer")
public class PaiementLoyer {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="contrat_id",nullable=false) private ContratLocation contrat;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="enregistre_par",nullable=false) private User enregistrePar;
 @Column(nullable=false,precision=14,scale=2) private BigDecimal montant;
 @Column(name="periode",nullable=false) private LocalDate periode;
 @Column(name="date_paiement",nullable=false) private LocalDate datePaiement;
 @Column(length=500) private String reference;
 @Column(name="cree_le",nullable=false,updatable=false) private Instant creeLe=Instant.now();
 protected PaiementLoyer(){}
 public PaiementLoyer(ContratLocation c,User u,BigDecimal m,LocalDate p,LocalDate d,String r){contrat=c;enregistrePar=u;montant=m;periode=p;datePaiement=d;reference=r;}
 public UUID getId(){return id;} public BigDecimal getMontant(){return montant;} public LocalDate getPeriode(){return periode;} public LocalDate getDatePaiement(){return datePaiement;} public String getReference(){return reference;} public Instant getCreeLe(){return creeLe;} public User getEnregistrePar(){return enregistrePar;}
}
