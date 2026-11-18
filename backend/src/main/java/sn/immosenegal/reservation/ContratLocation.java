package sn.immosenegal.reservation;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.persistence.*;
import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.user.User;

@Entity
@Table(name="contrats_location")
public class ContratLocation {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="annonce_id",nullable=false) private Annonce annonce;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="proprietaire_id",nullable=false) private User proprietaire;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="locataire_id",nullable=false) private User locataire;
 @OneToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="reservation_id",nullable=false,unique=true) private Reservation reservation;
 @Column(name="loyer_mensuel",nullable=false,precision=14,scale=2) private BigDecimal loyerMensuel;
 @Column(name="depot_garantie",nullable=false,precision=14,scale=2) private BigDecimal depotGarantie;
 @Column(name="date_debut",nullable=false) private LocalDate dateDebut;
 @Column(name="date_fin") private LocalDate dateFin;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private EtatContratLocation etat=EtatContratLocation.ACTIF;
 @Column(name="cree_le",nullable=false,updatable=false) private Instant creeLe=Instant.now();
 protected ContratLocation(){}
 public ContratLocation(Annonce a,User p,User l,Reservation r,BigDecimal loyer,BigDecimal depot,LocalDate debut,LocalDate fin){annonce=a;proprietaire=p;locataire=l;reservation=r;loyerMensuel=loyer;depotGarantie=depot;dateDebut=debut;dateFin=fin;}
 public UUID getId(){return id;} public Annonce getAnnonce(){return annonce;} public User getProprietaire(){return proprietaire;} public User getLocataire(){return locataire;} public Reservation getReservation(){return reservation;} public BigDecimal getLoyerMensuel(){return loyerMensuel;} public BigDecimal getDepotGarantie(){return depotGarantie;} public LocalDate getDateDebut(){return dateDebut;} public LocalDate getDateFin(){return dateFin;} public EtatContratLocation getEtat(){return etat;} public Instant getCreeLe(){return creeLe;}
 public void resilier(){etat=EtatContratLocation.RESILIE;}
}
