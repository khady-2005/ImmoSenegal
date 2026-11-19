package sn.immosenegal.offre;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.user.User;

@Entity
@Table(name = "offres_achat")
public class OffreAchat {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "annonce_id", nullable = false) private Annonce annonce;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "acheteur_id", nullable = false) private User acheteur;
    @Column(name = "montant_propose", nullable = false, precision = 14, scale = 2) private BigDecimal montantPropose;
    @Column(length = 1000) private String message;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private StatutOffre statut = StatutOffre.EN_ATTENTE;
    @Column(name = "reponse_proprietaire", length = 1000) private String reponseProprietaire;
    @Column(name = "cree_le", nullable = false, updatable = false) private Instant creeLe = Instant.now();
    @Column(name = "modifie_le", nullable = false) private Instant modifieLe = Instant.now();
    protected OffreAchat() {}
    public OffreAchat(Annonce annonce, User acheteur, BigDecimal montant, String message) {
        this.annonce=annonce; this.acheteur=acheteur; this.montantPropose=montant; this.message=message;
    }
    public UUID getId(){return id;} public Annonce getAnnonce(){return annonce;} public User getAcheteur(){return acheteur;}
    public BigDecimal getMontantPropose(){return montantPropose;} public String getMessage(){return message;}
    public StatutOffre getStatut(){return statut;} public String getReponseProprietaire(){return reponseProprietaire;}
    public Instant getCreeLe(){return creeLe;} public Instant getModifieLe(){return modifieLe;}
    public void decider(boolean accepter,String reponse){statut=accepter?StatutOffre.ACCEPTEE:StatutOffre.REFUSEE;reponseProprietaire=reponse;modifieLe=Instant.now();}
    public void annuler(){statut=StatutOffre.ANNULEE;modifieLe=Instant.now();}
}