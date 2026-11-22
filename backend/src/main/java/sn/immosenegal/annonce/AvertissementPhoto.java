package sn.immosenegal.annonce;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;
import sn.immosenegal.user.User;

@Entity
@Table(name = "avertissements_photos")
public class AvertissementPhoto {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "annonce_id", nullable = false)
    private UUID annonceId;

    @Column(name = "photo_id", nullable = false)
    private UUID photoId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proprietaire_id", nullable = false)
    private User proprietaire;

    @Column(name = "admin_id", nullable = false)
    private UUID adminId;

    @Column(nullable = false, length = 500)
    private String motif;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "echeance_le", nullable = false)
    private Instant echeanceLe;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutAvertissementPhoto statut = StatutAvertissementPhoto.EN_ATTENTE;

    @Column(name = "reponse_proprietaire", length = 1000)
    private String reponseProprietaire;

    @Column(name = "repondu_le")
    private Instant reponduLe;

    @Column(name = "traite_le")
    private Instant traiteLe;

    protected AvertissementPhoto() {}

    public AvertissementPhoto(UUID annonceId, UUID photoId, User proprietaire, UUID adminId,
            String motif, Instant echeanceLe) {
        this.annonceId = annonceId;
        this.photoId = photoId;
        this.proprietaire = proprietaire;
        this.adminId = adminId;
        this.motif = motif;
        this.echeanceLe = echeanceLe;
    }

    public UUID getId() { return id; }
    public UUID getAnnonceId() { return annonceId; }
    public UUID getPhotoId() { return photoId; }
    public User getProprietaire() { return proprietaire; }
    public UUID getAdminId() { return adminId; }
    public String getMotif() { return motif; }
    public Instant getCreeLe() { return creeLe; }
    public Instant getEcheanceLe() { return echeanceLe; }
    public StatutAvertissementPhoto getStatut() { return statut; }
    public String getReponseProprietaire() { return reponseProprietaire; }
    public Instant getReponduLe() { return reponduLe; }
    public Instant getTraiteLe() { return traiteLe; }

    public void repondre(String reponse) {
        this.reponseProprietaire = reponse;
        this.reponduLe = Instant.now();
        this.statut = StatutAvertissementPhoto.REPONDU;
    }

    public void terminer(StatutAvertissementPhoto resultat) {
        this.statut = resultat;
        this.traiteLe = Instant.now();
    }
}
