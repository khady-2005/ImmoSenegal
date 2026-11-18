package sn.immosenegal.agence;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "agence_contacts")
public class ContactAgence {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agence_id", nullable = false)
    private Agence agence;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "createur_id", nullable = false)
    private sn.immosenegal.user.User createur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "membre_assigne_id")
    private MembreAgence membreAssigne;

    @Column(nullable = false, length = 120)
    private String nom;

    @Column(length = 254)
    private String email;

    @Column(length = 30)
    private String telephone;

    @Column(name = "type_besoin", nullable = false, length = 20)
    private String typeBesoin;

    @Column(length = 160)
    private String recherche;

    @Column(length = 100)
    private String ville;

    @Column(length = 2000)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private StatutContactCrm statut = StatutContactCrm.NOUVEAU;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "modifie_le", nullable = false)
    private Instant modifieLe = Instant.now();

    protected ContactAgence() {}

    public ContactAgence(Agence agence, sn.immosenegal.user.User createur, MembreAgence assigne,
                         String nom, String email, String telephone, String typeBesoin,
                         String recherche, String ville, String notes) {
        this.agence = agence;
        this.createur = createur;
        this.membreAssigne = assigne;
        this.nom = nom;
        this.email = email;
        this.telephone = telephone;
        this.typeBesoin = typeBesoin;
        this.recherche = recherche;
        this.ville = ville;
        this.notes = notes;
    }

    public UUID getId() { return id; }
    public Agence getAgence() { return agence; }
    public sn.immosenegal.user.User getCreateur() { return createur; }
    public MembreAgence getMembreAssigne() { return membreAssigne; }
    public String getNom() { return nom; }
    public String getEmail() { return email; }
    public String getTelephone() { return telephone; }
    public String getTypeBesoin() { return typeBesoin; }
    public String getRecherche() { return recherche; }
    public String getVille() { return ville; }
    public String getNotes() { return notes; }
    public StatutContactCrm getStatut() { return statut; }
    public Instant getCreeLe() { return creeLe; }
    public Instant getModifieLe() { return modifieLe; }

    public void modifier(StatutContactCrm statut, MembreAgence assigne, String notes) {
        if (statut != null) this.statut = statut;
        if (assigne != null) this.membreAssigne = assigne;
        this.notes = notes;
        this.modifieLe = Instant.now();
    }
}
