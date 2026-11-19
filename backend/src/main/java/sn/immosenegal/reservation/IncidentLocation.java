package sn.immosenegal.reservation;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
import sn.immosenegal.user.User;

@Entity
@Table(name = "incidents_location")
public class IncidentLocation {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contrat_id", nullable = false)
    private ContratLocation contrat;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "declare_par", nullable = false)
    private User declarePar;
    @Column(nullable = false, length = 80)
    private String categorie;
    @Column(nullable = false, length = 2000)
    private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private StatutIncidentLocation statut = StatutIncidentLocation.OUVERT;
    @Column(name = "commentaire_resolution", length = 1500)
    private String commentaireResolution;
    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();
    @Column(name = "modifie_le", nullable = false)
    private Instant modifieLe = Instant.now();

    protected IncidentLocation() {}
    public IncidentLocation(ContratLocation contrat, User declarePar, String categorie, String description) {
        this.contrat = contrat; this.declarePar = declarePar;
        this.categorie = categorie; this.description = description;
    }
    public UUID getId() { return id; }
    public ContratLocation getContrat() { return contrat; }
    public User getDeclarePar() { return declarePar; }
    public String getCategorie() { return categorie; }
    public String getDescription() { return description; }
    public StatutIncidentLocation getStatut() { return statut; }
    public String getCommentaireResolution() { return commentaireResolution; }
    public Instant getCreeLe() { return creeLe; }
    public Instant getModifieLe() { return modifieLe; }
    public void actualiser(StatutIncidentLocation statut, String commentaire) {
        this.statut = statut;
        this.commentaireResolution = commentaire;
        this.modifieLe = Instant.now();
    }
}
