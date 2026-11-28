package sn.immosenegal.signalement;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import sn.immosenegal.user.User;

@Entity
@Table(name = "signalements")
public class Signalement {

    public enum TypeSignalement { ANNONCE, COMPORTEMENT, RECLAMATION }
    public enum StatutSignalement { OUVERT, EN_COURS, TRAITE, REJETE }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "auteur_id", nullable = false)
    private User auteur;

    @Column(name = "annonce_id")
    private UUID annonceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TypeSignalement type;

    @Column(nullable = false, length = 150)
    private String objet;

    @Column(nullable = false, length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private StatutSignalement statut = StatutSignalement.OUVERT;

    @Column(name = "reponse_admin", length = 1000)
    private String reponseAdmin;

    @Column(name = "traite_par")
    private UUID traitePar;

    @Column(name = "traite_le")
    private Instant traiteLe;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    protected Signalement() {}

    public Signalement(User auteur, UUID annonceId, TypeSignalement type, String objet, String description) {
        this.auteur = auteur;
        this.annonceId = annonceId;
        this.type = type;
        this.objet = objet;
        this.description = description;
    }

    public UUID getId() { return id; }
    public User getAuteur() { return auteur; }
    public UUID getAnnonceId() { return annonceId; }
    public TypeSignalement getType() { return type; }
    public String getObjet() { return objet; }
    public String getDescription() { return description; }
    public StatutSignalement getStatut() { return statut; }
    public String getReponseAdmin() { return reponseAdmin; }
    public UUID getTraitePar() { return traitePar; }
    public Instant getTraiteLe() { return traiteLe; }
    public Instant getCreeLe() { return creeLe; }

    public void traiter(StatutSignalement nouveauStatut, String reponseAdmin, UUID adminId) {
        this.statut = nouveauStatut;
        this.reponseAdmin = reponseAdmin;
        this.traitePar = adminId;
        this.traiteLe = Instant.now();
    }
}
