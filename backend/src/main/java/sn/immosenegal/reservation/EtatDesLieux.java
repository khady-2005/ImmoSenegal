package sn.immosenegal.reservation;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.persistence.*;
import sn.immosenegal.user.User;

@Entity
@Table(name = "etats_des_lieux")
public class EtatDesLieux {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contrat_id", nullable = false)
    private ContratLocation contrat;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cree_par", nullable = false)
    private User creePar;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 12)
    private TypeEtatDesLieux type;
    @Column(nullable = false)
    private LocalDate dateConstat;
    @Column(nullable = false, length = 5000)
    private String observations;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private StatutEtatDesLieux statut = StatutEtatDesLieux.EN_ATTENTE;
    @Column(length = 1500)
    private String commentaireDecision;
    @Column(name = "decide_par")
    private UUID decidePar;
    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();
    @Column(name = "modifie_le", nullable = false)
    private Instant modifieLe = Instant.now();

    protected EtatDesLieux() {}
    public EtatDesLieux(ContratLocation contrat, User auteur, TypeEtatDesLieux type,
                        LocalDate dateConstat, String observations) {
        this.contrat = contrat; this.creePar = auteur; this.type = type;
        this.dateConstat = dateConstat; this.observations = observations;
    }
    public UUID getId() { return id; }
    public ContratLocation getContrat() { return contrat; }
    public User getCreePar() { return creePar; }
    public TypeEtatDesLieux getType() { return type; }
    public LocalDate getDateConstat() { return dateConstat; }
    public String getObservations() { return observations; }
    public StatutEtatDesLieux getStatut() { return statut; }
    public String getCommentaireDecision() { return commentaireDecision; }
    public UUID getDecidePar() { return decidePar; }
    public Instant getCreeLe() { return creeLe; }
    public Instant getModifieLe() { return modifieLe; }
    public void decider(UUID auteur, boolean accepte, String commentaire) {
        this.decidePar = auteur;
        this.statut = accepte ? StatutEtatDesLieux.ACCEPTE : StatutEtatDesLieux.CONTESTE;
        this.commentaireDecision = commentaire;
        this.modifieLe = Instant.now();
    }
}
