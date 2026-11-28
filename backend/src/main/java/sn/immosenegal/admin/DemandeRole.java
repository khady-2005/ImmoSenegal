package sn.immosenegal.admin;

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
import jakarta.persistence.Version;

import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;

@Entity
@Table(name = "demandes_role")
public class DemandeRole {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_demande", nullable = false, length = 20)
    private Role roleDemande;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutDemande statut = StatutDemande.EN_ATTENTE;

    @Column(name = "cree_le", nullable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "decide_le")
    private Instant decideLe;

    @Column(name = "decide_par")
    private UUID decidePar;

    @Column(name = "decide_par_nom", length = 120)
    private String decideParNom;

    @Column(name = "motif_decision", length = 500)
    private String motifDecision;

    @Column(name = "justificatif_nom", length = 255)
    private String justificatifNom;

    @Column(name = "justificatif_type_mime", length = 80)
    private String justificatifTypeMime;

    @Column(name = "justificatif_contenu")
    private byte[] justificatifContenu;

    @Version
    private Long version = 0L;

    protected DemandeRole() {
        // requis par JPA
    }

    public DemandeRole(User user, Role roleDemande) {
        this.user = user;
        this.roleDemande = roleDemande;
    }

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public Role getRoleDemande() { return roleDemande; }
    public StatutDemande getStatut() { return statut; }
    public Instant getCreeLe() { return creeLe; }
    public Instant getDecideLe() { return decideLe; }
    public UUID getDecidePar() { return decidePar; }
    public String getDecideParNom() { return decideParNom; }
    public String getMotifDecision() { return motifDecision; }
    public String getJustificatifNom() { return justificatifNom; }
    public String getJustificatifTypeMime() { return justificatifTypeMime; }
    public byte[] getJustificatifContenu() { return justificatifContenu; }

    public void definirJustificatif(String nom, String typeMime, byte[] contenu) {
        this.justificatifNom = nom;
        this.justificatifTypeMime = typeMime;
        this.justificatifContenu = contenu;
    }

    public void decider(StatutDemande nouveauStatut, UUID decideurId, String decideurNom, String motif) {
        this.statut = nouveauStatut;
        this.decideLe = Instant.now();
        this.decidePar = decideurId;
        this.decideParNom = decideurNom;
        this.motifDecision = motif;
    }

    public void decider(StatutDemande nouveauStatut, UUID administrateur) {
        decider(nouveauStatut, administrateur, null, null);
    }
}
