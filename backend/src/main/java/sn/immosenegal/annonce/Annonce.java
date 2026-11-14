package sn.immosenegal.annonce;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
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

import org.hibernate.annotations.BatchSize;

import sn.immosenegal.user.User;

@Entity
@Table(name = "annonces")
public class Annonce {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proprietaire_id", nullable = false)
    private User proprietaire;

    @Column(nullable = false, length = 150)
    private String titre;

    @Column(length = 5000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_bien", nullable = false, length = 20)
    private TypeBien typeBien;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_transaction", nullable = false, length = 20)
    private TypeTransaction typeTransaction;

    @Column(nullable = false)
    private long prix;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal superficie;

    private Integer pieces;

    @Column(nullable = false, length = 100)
    private String quartier;

    @Column(nullable = false, length = 100)
    private String ville;

    @Column(length = 255)
    private String adresse;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 6)
    private BigDecimal longitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutAnnonce statut = StatutAnnonce.EN_ATTENTE;

    /** Motif de la dernière décision de modération (refus, suspension, correction demandée). Visible du propriétaire et des administrateurs seulement. */
    @Column(name = "motif_moderation", length = 500)
    private String motifModeration;

    /** Administrateur auteur de la dernière décision (simple identifiant : pas de dépendance vers la table des comptes). */
    @Column(name = "modere_par")
    private UUID moderePar;

    @Column(name = "modere_le")
    private Instant modereLe;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "annonce_equipements", joinColumns = @JoinColumn(name = "annonce_id"))
    @Column(name = "equipement", nullable = false, length = 50)
    @BatchSize(size = 50)
    private Set<String> equipements = new HashSet<>();

    /** Vrai pour une annonce de démonstration (créée par le serveur, affichée comme « Exemple »). Jamais modifiable par l'API. */
    @Column(nullable = false, updatable = false)
    private boolean exemple;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "modifie_le", nullable = false)
    private Instant modifieLe = Instant.now();

    protected Annonce() {
        // requis par JPA
    }

    public Annonce(User proprietaire) {
        this.proprietaire = proprietaire;
    }

    public UUID getId() { return id; }
    public User getProprietaire() { return proprietaire; }
    public String getTitre() { return titre; }
    public String getDescription() { return description; }
    public TypeBien getTypeBien() { return typeBien; }
    public TypeTransaction getTypeTransaction() { return typeTransaction; }
    public long getPrix() { return prix; }
    public BigDecimal getSuperficie() { return superficie; }
    public Integer getPieces() { return pieces; }
    public String getQuartier() { return quartier; }
    public String getVille() { return ville; }
    public String getAdresse() { return adresse; }
    public BigDecimal getLatitude() { return latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public StatutAnnonce getStatut() { return statut; }
    public String getMotifModeration() { return motifModeration; }
    public UUID getModerePar() { return moderePar; }
    public Instant getModereLe() { return modereLe; }
    public Set<String> getEquipements() { return equipements; }
    public boolean isExemple() { return exemple; }
    public Instant getCreeLe() { return creeLe; }
    public Instant getModifieLe() { return modifieLe; }

    public void setProprietaire(User proprietaire) { this.proprietaire = proprietaire; }
    public void setTitre(String titre) { this.titre = titre; }
    public void setDescription(String description) { this.description = description; }
    public void setTypeBien(TypeBien typeBien) { this.typeBien = typeBien; }
    public void setTypeTransaction(TypeTransaction typeTransaction) { this.typeTransaction = typeTransaction; }
    public void setPrix(long prix) { this.prix = prix; }
    public void setSuperficie(BigDecimal superficie) { this.superficie = superficie; }
    public void setPieces(Integer pieces) { this.pieces = pieces; }
    public void setQuartier(String quartier) { this.quartier = quartier; }
    public void setVille(String ville) { this.ville = ville; }
    public void setAdresse(String adresse) { this.adresse = adresse; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }
    public void setStatut(StatutAnnonce statut) { this.statut = statut; }
    public void setModifieLe(Instant modifieLe) { this.modifieLe = modifieLe; }

    /** Enregistre une décision de modération (statut, motif, auteur, date). */
    void moderer(StatutAnnonce vers, UUID par, String motif) {
        Instant maintenant = Instant.now();
        this.statut = vers;
        this.motifModeration = motif;
        this.moderePar = par;
        this.modereLe = maintenant;
        this.modifieLe = maintenant;
    }

    /** Réservé au chargement des annonces d'exemple (même paquet) : aucune requête de l'API ne peut l'appeler. */
    void marquerCommeExemple() {
        this.exemple = true;
    }

    public void remplacerEquipements(Set<String> nouveaux) {
        this.equipements.clear();
        this.equipements.addAll(nouveaux);
    }
}
