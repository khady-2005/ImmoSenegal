package sn.immosenegal.reservation;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
import sn.immosenegal.user.User;

@Entity
@Table(name = "evaluations_location", uniqueConstraints = @UniqueConstraint(name = "uk_evaluation_contrat_auteur", columnNames = {"contrat_id", "auteur_id"}))
public class EvaluationLocation {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "contrat_id", nullable = false) private ContratLocation contrat;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "auteur_id", nullable = false) private User auteur;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "evalue_id", nullable = false) private User evalue;
    @Column(nullable = false) private int note;
    @Column(nullable = false, length = 1200) private String commentaire;
    @Column(name = "cree_le", nullable = false, updatable = false) private Instant creeLe = Instant.now();
    protected EvaluationLocation() {}
    public EvaluationLocation(ContratLocation contrat, User auteur, User evalue, int note, String commentaire) {
        this.contrat=contrat; this.auteur=auteur; this.evalue=evalue; this.note=note; this.commentaire=commentaire;
    }
    public UUID getId(){return id;} public ContratLocation getContrat(){return contrat;} public User getAuteur(){return auteur;}
    public User getEvalue(){return evalue;} public int getNote(){return note;} public String getCommentaire(){return commentaire;} public Instant getCreeLe(){return creeLe;}
}
