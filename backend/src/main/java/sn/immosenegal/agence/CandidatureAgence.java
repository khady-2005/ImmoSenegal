package sn.immosenegal.agence;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;

import sn.immosenegal.user.User;

@Entity
@Table(name = "agence_candidatures")
public class CandidatureAgence {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agence_id", nullable = false)
    private Agence agence;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User utilisateur;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private FonctionAgence fonction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutCandidatureAgence statut = StatutCandidatureAgence.EN_ATTENTE;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "traitee_le")
    private Instant traiteeLe;

    @Column(length = 30)
    private String telephone;

    @Column(length = 120)
    private String zone;

    @Column(length = 2000)
    private String motivation;

    @Column(name = "cv_nom", length = 255)
    private String cvNom;

    @Column(name = "cv_type_mime", length = 80)
    private String cvTypeMime;

    @Column(name = "cv_contenu")
    private byte[] cvContenu;

    protected CandidatureAgence() {}

    public CandidatureAgence(Agence agence, User utilisateur, FonctionAgence fonction) {
        this.agence = agence;
        this.utilisateur = utilisateur;
        this.fonction = fonction;
    }

    public CandidatureAgence(Agence agence, User utilisateur, FonctionAgence fonction,
            String telephone, String zone, String motivation,
            String cvNom, String cvTypeMime, byte[] cvContenu) {
        this.agence = agence;
        this.utilisateur = utilisateur;
        this.fonction = fonction;
        this.telephone = telephone;
        this.zone = zone;
        this.motivation = motivation;
        this.cvNom = cvNom;
        this.cvTypeMime = cvTypeMime;
        this.cvContenu = cvContenu;
    }

    public UUID getId() { return id; }
    public Agence getAgence() { return agence; }
    public User getUtilisateur() { return utilisateur; }
    public FonctionAgence getFonction() { return fonction; }
    public StatutCandidatureAgence getStatut() { return statut; }
    public Instant getCreeLe() { return creeLe; }
    public Instant getTraiteeLe() { return traiteeLe; }
    public String getTelephone() { return telephone; }
    public String getZone() { return zone; }
    public String getMotivation() { return motivation; }
    public String getCvNom() { return cvNom; }
    public String getCvTypeMime() { return cvTypeMime; }
    public byte[] getCvContenu() { return cvContenu; }

    public void traiter(StatutCandidatureAgence statut) {
        this.statut = statut;
        this.traiteeLe = Instant.now();
    }
}
