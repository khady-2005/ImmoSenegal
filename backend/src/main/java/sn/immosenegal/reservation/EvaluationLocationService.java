package sn.immosenegal.reservation;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import sn.immosenegal.audit.AuditService;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service
@Transactional
public class EvaluationLocationService {
    private final ContratLocationRepository contrats;
    private final EvaluationLocationRepository evaluations;
    private final UserRepository users;
    private final AuditService audit;
    public EvaluationLocationService(ContratLocationRepository contrats, EvaluationLocationRepository evaluations,
                                     UserRepository users, AuditService audit) {
        this.contrats=contrats; this.evaluations=evaluations; this.users=users; this.audit=audit;
    }
    @Transactional(readOnly = true)
    public List<EvaluationResume> lister(UUID contratId, AuthenticatedUser acteur) {
        ContratLocation contrat=contrat(contratId); verifierParticipant(contrat,acteur);
        return evaluations.findAllByContratIdOrderByCreeLeDesc(contratId).stream().map(this::resume).toList();
    }
    @Transactional(readOnly = true)
    public ResumeProfil monResume(AuthenticatedUser acteur) {
        if (acteur == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session invalide.");
        List<EvaluationLocation> recues = evaluations.findAllByEvalueIdOrderByCreeLeDesc(acteur.id());
        double moyenne = recues.stream().mapToInt(EvaluationLocation::getNote).average().orElse(0.0);
        return new ResumeProfil(java.math.BigDecimal.valueOf(moyenne).setScale(1, java.math.RoundingMode.HALF_UP), recues.size());
    }
    public EvaluationResume creer(UUID contratId, CreationEvaluation q, AuthenticatedUser acteur) {
        ContratLocation contrat=contrat(contratId); verifierParticipant(contrat,acteur);
        if (contrat.getEtat()!=EtatContratLocation.TERMINE && contrat.getEtat()!=EtatContratLocation.RESILIE)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Une évaluation est possible après la fin du contrat.");
        if (q==null || q.note()<1 || q.note()>5 || q.commentaire()==null || q.commentaire().isBlank() || q.commentaire().trim().length()>1200)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Donnez une note de 1 à 5 et un commentaire de 1 200 caractères maximum.");
        if (evaluations.existsByContratIdAndAuteurId(contratId,acteur.id()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Vous avez déjà évalué cette location.");
        User auteur=users.findById(acteur.id()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Session invalide."));
        User evalue=contrat.getProprietaire().getId().equals(acteur.id())?contrat.getLocataire():contrat.getProprietaire();
        EvaluationLocation evaluation=evaluations.save(new EvaluationLocation(contrat,auteur,evalue,q.note(),q.commentaire().trim()));
        audit.enregistrer("EVALUATION_LOCATION_CREEE",acteur.id(),"Évaluation du contrat "+contratId);
        return resume(evaluation);
    }
    private ContratLocation contrat(UUID id){return contrats.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Contrat introuvable."));}
    private void verifierParticipant(ContratLocation c,AuthenticatedUser a){if(a==null||(!c.getProprietaire().getId().equals(a.id())&&!c.getLocataire().getId().equals(a.id())))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Accès réservé aux parties du contrat.");}
    private EvaluationResume resume(EvaluationLocation e){return new EvaluationResume(e.getId(),e.getContrat().getId(),e.getAuteur().getNomComplet(),e.getEvalue().getNomComplet(),e.getNote(),e.getCommentaire(),e.getCreeLe());}
    public record ResumeProfil(java.math.BigDecimal moyenne, long nombreAvis){}\n    public record CreationEvaluation(int note,String commentaire){}
    public record EvaluationResume(UUID id,UUID contratId,String auteurNom,String evalueNom,int note,String commentaire,java.time.Instant creeLe){}
}
