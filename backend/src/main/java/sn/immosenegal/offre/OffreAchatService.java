package sn.immosenegal.offre;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.immosenegal.annonce.*;
import sn.immosenegal.audit.AuditService;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.*;
@Service
public class OffreAchatService {
 private final OffreAchatRepository offres; private final AnnonceRepository annonces; private final UserRepository users;
 private final NotificationService notifications; private final AuditService audit;
 public OffreAchatService(OffreAchatRepository o,AnnonceRepository a,UserRepository u,NotificationService n,AuditService audit){offres=o;annonces=a;users=u;notifications=n;this.audit=audit;}
 @Transactional public OffreAchatResponse creer(UUID annonceId,CreerOffreRequest req,AuthenticatedUser acteur){
  exiger(acteur,Role.CLIENT); Annonce a=annonces.findById(annonceId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Annonce introuvable."));
  if(a.getStatut()!=StatutAnnonce.PUBLIEE||a.getTypeTransaction()!=TypeTransaction.VENTE)throw new ApiException(HttpStatus.BAD_REQUEST,"Les offres concernent uniquement les biens à vendre publiés.");
  if(a.getProprietaire().getId().equals(acteur.id()))throw new ApiException(HttpStatus.FORBIDDEN,"Vous ne pouvez pas faire une offre sur votre propre bien.");
  if(offres.existsByAnnonceIdAndAcheteurIdAndStatut(annonceId,acteur.id(),StatutOffre.EN_ATTENTE))throw new ApiException(HttpStatus.CONFLICT,"Vous avez déjà une offre en attente pour ce bien.");
  User acheteur=users.findById(acteur.id()).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Session invalide."));
  OffreAchat o=offres.save(new OffreAchat(a,acheteur,req.montantPropose(),req.message()==null?null:req.message().trim()));
  notifications.creer(a.getProprietaire(),"OFFRE_ACHAT","Nouvelle offre d'achat",acheteur.getNomComplet()+" propose un prix pour « "+a.getTitre()+" ».","/offres-recues");
  audit.enregistrer("OFFRE_ACHAT_CREEE",acteur.id(),"Offre "+o.getId()+" annonce "+annonceId);return OffreAchatResponse.de(o);
 }
 @Transactional(readOnly=true) public List<OffreAchatResponse> envoyees(AuthenticatedUser a){exiger(a,Role.CLIENT);return offres.findByAcheteurIdOrderByCreeLeDesc(a.id()).stream().map(OffreAchatResponse::de).toList();}
 @Transactional(readOnly=true) public List<OffreAchatResponse> recues(AuthenticatedUser a){exiger(a,Role.PROPRIETAIRE);return offres.findByAnnonceProprietaireIdOrderByCreeLeDesc(a.id()).stream().map(OffreAchatResponse::de).toList();}
 @Transactional public OffreAchatResponse decider(UUID id,DecisionOffreRequest req,AuthenticatedUser a){
  exiger(a,Role.PROPRIETAIRE);OffreAchat o=trouver(id);
  if(!o.getAnnonce().getProprietaire().getId().equals(a.id()))throw new ApiException(HttpStatus.FORBIDDEN,"Cette offre ne concerne pas vos annonces.");
  if(o.getStatut()!=StatutOffre.EN_ATTENTE)throw new ApiException(HttpStatus.CONFLICT,"Cette offre a déjà été traitée.");
  String reponse=req.reponse()==null?null:req.reponse().trim();o.decider(req.accepter(),reponse);
  notifications.creer(o.getAcheteur(),"OFFRE_REPONSE",req.accepter()?"Votre offre a été acceptée":"Votre offre a été refusée","Le propriétaire a répondu à votre offre pour « "+o.getAnnonce().getTitre()+" ».","/mes-offres");
  audit.enregistrer("OFFRE_ACHAT_TRAITEE",a.id(),"Offre "+id+" : "+o.getStatut());return OffreAchatResponse.de(o);
 }
 @Transactional public void annuler(UUID id,AuthenticatedUser a){exiger(a,Role.CLIENT);OffreAchat o=trouver(id);if(!o.getAcheteur().getId().equals(a.id()))throw new ApiException(HttpStatus.FORBIDDEN,"Cette offre ne vous appartient pas.");if(o.getStatut()!=StatutOffre.EN_ATTENTE)throw new ApiException(HttpStatus.CONFLICT,"Cette offre ne peut plus être annulée.");o.annuler();}
 private OffreAchat trouver(UUID id){return offres.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Offre introuvable."));}
 private void exiger(AuthenticatedUser a,Role... roles){if(a==null||java.util.Arrays.stream(roles).noneMatch(r->r==a.role()))throw new ApiException(HttpStatus.FORBIDDEN,"Vous n'avez pas le droit d'effectuer cette action.");}
}