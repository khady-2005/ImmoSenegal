package sn.immosenegal.agence;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
public class EvaluationAgenceService {
 private final MandatGestionRepository mandats; private final EvaluationAgenceRepository evaluations;
 private final UserRepository utilisateurs; private final AgenceRepository agences; private final AuditService audit;
 public EvaluationAgenceService(MandatGestionRepository mandats,EvaluationAgenceRepository evaluations,UserRepository utilisateurs,AgenceRepository agences,AuditService audit){this.mandats=mandats;this.evaluations=evaluations;this.utilisateurs=utilisateurs;this.agences=agences;this.audit=audit;}
 @Transactional(readOnly=true) public EvaluationResume monEvaluation(UUID mandatId,AuthenticatedUser acteur){
  MandatGestion m=mandats.findById(mandatId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Mandat introuvable."));
  if(acteur==null||!m.getProprietaire().getId().equals(acteur.id()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Accès réservé au propriétaire du bien.");
  return evaluations.findByMandatId(mandatId).map(this::resume).orElse(null);
 }
 public EvaluationResume creer(UUID mandatId,int note,String commentaire,AuthenticatedUser acteur){
  MandatGestion m=mandats.findById(mandatId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Mandat introuvable."));
  if(acteur==null||!m.getProprietaire().getId().equals(acteur.id()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Seul le propriétaire du bien peut évaluer l'agence.");
  if(m.getStatut()!=StatutMandatGestion.RESILIE)throw new ResponseStatusException(HttpStatus.CONFLICT,"L'évaluation est possible après la fin du mandat.");
  if(note<1||note>5||commentaire==null||commentaire.isBlank()||commentaire.trim().length()>1200)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Donnez une note de 1 à 5 et un commentaire de 1 200 caractères maximum.");
  if(evaluations.existsByMandatId(mandatId))throw new ResponseStatusException(HttpStatus.CONFLICT,"Ce mandat a déjà été évalué.");
  User auteur=utilisateurs.findById(acteur.id()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Session invalide."));
  EvaluationAgence e=evaluations.save(new EvaluationAgence(m,auteur,note,commentaire.trim()));audit.enregistrer("EVALUATION_AGENCE_CREEE",acteur.id(),"Évaluation du mandat "+mandatId);return resume(e);
 }
 @Transactional(readOnly=true) public ResumeAgence resumeAgence(UUID agenceId){
  agences.findById(agenceId).filter(a->a.getStatut()==StatutAgence.ACTIVE).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Agence introuvable ou inactive."));
  List<EvaluationAgence> avis=evaluations.findAllByMandatAgenceIdOrderByCreeLeDesc(agenceId);
  BigDecimal moyenne=BigDecimal.valueOf(avis.stream().mapToInt(EvaluationAgence::getNote).average().orElse(0)).setScale(1,RoundingMode.HALF_UP);
  return new ResumeAgence(moyenne,avis.size(),avis.stream().map(this::resume).toList());
 }
 private EvaluationResume resume(EvaluationAgence e){return new EvaluationResume(e.getId(),e.getMandat().getAgence().getId(),e.getAuteur().getNomComplet(),e.getNote(),e.getCommentaire(),e.getCreeLe());}
 public record EvaluationResume(UUID id,UUID agenceId,String auteurNom,int note,String commentaire,java.time.Instant creeLe){}
 public record ResumeAgence(BigDecimal moyenne,long nombreAvis,List<EvaluationResume> avis){}
}
