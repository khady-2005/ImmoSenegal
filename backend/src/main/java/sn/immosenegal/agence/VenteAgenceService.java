package sn.immosenegal.agence;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import sn.immosenegal.annonce.*;
import sn.immosenegal.security.AuthenticatedUser;

@Service
@Transactional
public class VenteAgenceService {
 private final AgenceRepository agences; private final MembreAgenceRepository membres;
 private final AnnonceRepository annonces; private final VenteAgenceRepository ventes; private final MandatGestionRepository mandats;
 public VenteAgenceService(AgenceRepository a,MembreAgenceRepository m,AnnonceRepository n,VenteAgenceRepository v,MandatGestionRepository mandats){agences=a;membres=m;annonces=n;ventes=v;this.mandats=mandats;}

 public VenteResume creer(UUID agenceId, VenteRequest q, AuthenticatedUser acteur){
  MembreAgence membre=verifierMembre(agenceId,acteur);
  if(membre.getFonction()==FonctionAgence.GESTIONNAIRE) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Seuls le responsable et les agents peuvent enregistrer une vente.");
  Annonce annonce=annonces.findById(q.annonceId()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Annonce introuvable."));
  if(annonce.getTypeTransaction()!=TypeTransaction.VENTE) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Cette annonce n'est pas une annonce de vente.");
  if(annonce.isExemple()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Une annonce de démonstration ne peut pas être enregistrée comme vente.");
  if(annonce.getStatut()!=StatutAnnonce.PUBLIEE) throw new ResponseStatusException(HttpStatus.CONFLICT,"Seule une annonce publiée peut être enregistrée comme vente.");
  if(!mandats.existsByAgenceIdAndAnnonceIdAndStatut(agenceId,annonce.getId(),StatutMandatGestion.ACCEPTE)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Cette agence doit disposer d’un mandat de gestion accepté pour ce bien.");
  if(ventes.existsByAnnonceId(annonce.getId())) throw new ResponseStatusException(HttpStatus.CONFLICT,"Une vente est déjà enregistrée pour ce bien.");
  if(q.agentMembreId()!=null && membre.getFonction()==FonctionAgence.RESPONSABLE){
   membre=membres.findById(q.agentMembreId()).filter(x->x.getAgence().getId().equals(agenceId)&&x.getStatut()==StatutMembreAgence.ACTIF&&x.getFonction()==FonctionAgence.AGENT)
     .orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST,"Agent actif introuvable dans cette agence."));
  }
  VenteAgence v=ventes.save(new VenteAgence(membre.getAgence(),annonce,membre,q.acheteurNom().trim(),q.acheteurTelephone(),
    q.prixVente(),q.tauxCommission(),q.partAgent(),q.dateVente(),acteur.id()));
  return resume(v);
 }
 @Transactional(readOnly=true) public List<VenteResume> lister(UUID agenceId,AuthenticatedUser acteur){
  MembreAgence m=verifierMembre(agenceId,acteur);
  List<VenteAgence> liste=m.getFonction()==FonctionAgence.RESPONSABLE
    ? ventes.findAllByAgenceIdOrderByDateVenteDesc(agenceId)
    : ventes.findAllByAgenceIdAndAgentIdOrderByDateVenteDesc(agenceId,m.getId());
  return liste.stream().map(this::resume).toList();
 }
 private MembreAgence verifierMembre(UUID agenceId,AuthenticatedUser a){
  if(a==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
  agences.findById(agenceId).filter(x->x.getStatut()==StatutAgence.ACTIVE)
   .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Agence introuvable ou inactive."));
  return membres.findByAgenceIdAndUtilisateurId(agenceId,a.id())
   .filter(x->x.getStatut()==StatutMembreAgence.ACTIF)
   .orElseThrow(()->new ResponseStatusException(HttpStatus.FORBIDDEN,"Vous n'êtes pas membre actif de cette agence."));
 }
 private VenteResume resume(VenteAgence v){return new VenteResume(v.getId(),v.getAnnonce().getId(),v.getAnnonce().getTitre(),
  v.getAgent().getId(),v.getAgent().getUtilisateur().getNomComplet(),v.getAcheteurNom(),v.getAcheteurTelephone(),
  v.getPrixVente(),v.getTauxCommission(),v.getPartAgent(),v.getCommissionTotale(),v.getCommissionAgent(),
  v.getCommissionAgence(),v.getDateVente(),v.getStatut(),v.getCreeLe());}
 public record VenteRequest(UUID annonceId,UUID agentMembreId,String acheteurNom,String acheteurTelephone,
  BigDecimal prixVente,BigDecimal tauxCommission,BigDecimal partAgent,LocalDate dateVente){}
 public record VenteResume(UUID id,UUID annonceId,String annonceTitre,UUID agentMembreId,String agentNom,
  String acheteurNom,String acheteurTelephone,BigDecimal prixVente,BigDecimal tauxCommission,BigDecimal partAgent,
  BigDecimal commissionTotale,BigDecimal commissionAgent,BigDecimal commissionAgence,LocalDate dateVente,String statut,java.time.Instant creeLe){}
}