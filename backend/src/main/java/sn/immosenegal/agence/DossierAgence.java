package sn.immosenegal.agence;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "dossiers_agence")
public class DossierAgence {

    public enum CategorieDossier { PROPRIETAIRE, LOCATAIRE, BIEN, CONTRAT, AUTRE }
    public enum StatutDossier { A_COMPLETER, COMPLET, ARCHIVE }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "agence_id", nullable = false)
    private UUID agenceId;

    @Column(name = "cree_par", nullable = false)
    private UUID creePar;

    @Column(nullable = false, length = 150)
    private String titre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CategorieDossier categorie;

    @Column(name = "reference_client", length = 150)
    private String referenceClient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatutDossier statut = StatutDossier.A_COMPLETER;

    @Column(length = 2000)
    private String notes;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "modifie_le", nullable = false)
    private Instant modifieLe = Instant.now();

    protected DossierAgence() {}

    public DossierAgence(UUID agenceId, UUID creePar, String titre, CategorieDossier categorie,
                         String referenceClient, String notes) {
        this.agenceId = agenceId;
        this.creePar = creePar;
        this.titre = titre;
        this.categorie = categorie;
        this.referenceClient = referenceClient;
        this.notes = notes;
    }

    public UUID getId() { return id; }
    public UUID getAgenceId() { return agenceId; }
    public UUID getCreePar() { return creePar; }
    public String getTitre() { return titre; }
    public CategorieDossier getCategorie() { return categorie; }
    public String getReferenceClient() { return referenceClient; }
    public StatutDossier getStatut() { return statut; }
    public String getNotes() { return notes; }
    public Instant getCreeLe() { return creeLe; }
    public Instant getModifieLe() { return modifieLe; }

    public void setStatut(StatutDossier statut) {
        this.statut = statut;
        this.modifieLe = Instant.now();
    }

    public void setNotes(String notes) {
        this.notes = notes;
        this.modifieLe = Instant.now();
    }
}
