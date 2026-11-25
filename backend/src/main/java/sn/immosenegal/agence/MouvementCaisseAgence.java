package sn.immosenegal.agence;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.persistence.*;
import sn.immosenegal.user.User;

@Entity
@Table(name = "agence_mouvements_caisse")
public class MouvementCaisseAgence {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "agence_id", nullable = false) private Agence agence;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "cree_par", nullable = false) private User creePar;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "traite_par") private User traitePar;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 12) private TypeMouvementCaisse type;
    @Column(nullable = false, length = 140) private String libelle;
    @Column(length = 1000) private String description;
    @Column(nullable = false, precision = 16, scale = 2) private BigDecimal montant;
    @Column(name = "date_mouvement", nullable = false) private LocalDate dateMouvement;
    @Column(name = "justificatif_url", length = 500) private String justificatifUrl;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 12) private StatutMouvementCaisse statut = StatutMouvementCaisse.EN_ATTENTE;
    @Column(name = "motif_refus", length = 500) private String motifRefus;
    @Column(name = "cree_le", nullable = false, updatable = false) private Instant creeLe = Instant.now();
    @Column(name = "traite_le") private Instant traiteLe;
    protected MouvementCaisseAgence() {}
    public MouvementCaisseAgence(Agence agence, User auteur, TypeMouvementCaisse type, String libelle, String description, BigDecimal montant, LocalDate date, String justificatif) {
        this.agence=agence; this.creePar=auteur; this.type=type; this.libelle=libelle; this.description=description; this.montant=montant; this.dateMouvement=date; this.justificatifUrl=justificatif;
    }
    public void traiter(User responsable, boolean valider, String motif) { this.traitePar=responsable; this.statut=valider?StatutMouvementCaisse.VALIDE:StatutMouvementCaisse.REFUSE; this.motifRefus=valider?null:motif; this.traiteLe=Instant.now(); }
    public UUID getId(){return id;} public Agence getAgence(){return agence;} public User getCreePar(){return creePar;} public User getTraitePar(){return traitePar;} public TypeMouvementCaisse getType(){return type;} public String getLibelle(){return libelle;} public String getDescription(){return description;} public BigDecimal getMontant(){return montant;} public LocalDate getDateMouvement(){return dateMouvement;} public String getJustificatifUrl(){return justificatifUrl;} public StatutMouvementCaisse getStatut(){return statut;} public String getMotifRefus(){return motifRefus;} public Instant getCreeLe(){return creeLe;} public Instant getTraiteLe(){return traiteLe;}
}
