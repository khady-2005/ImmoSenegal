package sn.immosenegal.offre;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.user.User;

@Entity
@Table(name = "offres_location")
public class OffreLocation {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "annonce_id", nullable = false) private Annonce annonce;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "locataire_id", nullable = false) private User locataire;
    @Column(name = "loyer_propose", nullable = false, precision = 14, scale = 2) private BigDecimal loyerPropose;
    @Column(length = 1000) private String message;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private StatutOffre statut = StatutOffre.EN_ATTENTE;
    @Column(name = "reponse_decideur", length = 1000) private String reponseDecideur;
    @Column(name = "decideur_id") private UUID decideurId;
    @Column(name = "cree_le", nullable = false, updatable = false) private Instant creeLe = Instant.now();
    @Column(name = "modifie_le", nullable = false) private Instant modifieLe = Instant.now();

    protected OffreLocation() {}
    public OffreLocation(Annonce annonce, User locataire, BigDecimal loyerPropose, String message) {
        this.annonce = annonce; this.locataire = locataire; this.loyerPropose = loyerPropose; this.message = message;
    }
    public UUID getId() { return id; }
    public Annonce getAnnonce() { return annonce; }
    public User getLocataire() { return locataire; }
    public BigDecimal getLoyerPropose() { return loyerPropose; }
    public String getMessage() { return message; }
    public StatutOffre getStatut() { return statut; }
    public String getReponseDecideur() { return reponseDecideur; }
    public UUID getDecideurId() { return decideurId; }
    public Instant getCreeLe() { return creeLe; }
    public Instant getModifieLe() { return modifieLe; }
    public void decider(boolean accepter, String reponse, UUID decideurId) {
        this.statut = accepter ? StatutOffre.ACCEPTEE : StatutOffre.REFUSEE;
        this.reponseDecideur = reponse; this.decideurId = decideurId; this.modifieLe = Instant.now();
    }
    public void annuler() { this.statut = StatutOffre.ANNULEE; this.modifieLe = Instant.now(); }
}
