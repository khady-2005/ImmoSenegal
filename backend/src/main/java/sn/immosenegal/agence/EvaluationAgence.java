package sn.immosenegal.agence;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
import sn.immosenegal.user.User;

@Entity
@Table(name="evaluations_agence", uniqueConstraints=@UniqueConstraint(name="uk_evaluation_agence_mandat",columnNames="mandat_id"))
public class EvaluationAgence {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="mandat_id",nullable=false) private MandatGestion mandat;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="auteur_id",nullable=false) private User auteur;
    @Column(nullable=false) private int note;
    @Column(nullable=false,length=1200) private String commentaire;
    @Column(name="cree_le",nullable=false,updatable=false) private Instant creeLe=Instant.now();
    protected EvaluationAgence(){}
    public EvaluationAgence(MandatGestion mandat,User auteur,int note,String commentaire){this.mandat=mandat;this.auteur=auteur;this.note=note;this.commentaire=commentaire;}
    public UUID getId(){return id;} public MandatGestion getMandat(){return mandat;} public User getAuteur(){return auteur;}
    public int getNote(){return note;} public String getCommentaire(){return commentaire;} public Instant getCreeLe(){return creeLe;}
}
