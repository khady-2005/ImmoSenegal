package sn.immosenegal.agence;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service @Transactional
public class MouvementCaisseAgenceService {
 private final AgenceRepository agences; private final MembreAgenceRepository membres; private final MouvementCaisseAgenceRepository mouvements; private final UserRepository utilisateurs;
 public MouvementCaisseAgenceService(AgenceRepository a,MembreAgenceRepository m,MouvementCaisseAgenceRepository r,UserRepository u){agences=a;membres=m;mouvements=r;utilisateurs=u;}
 @Transactional(readOnly=true) public List<MouvementResume> lister(UUID agenceId,AuthenticatedUser acteur){verifierAcces(agenceId,acteur);return mouvements.findAllByAgenceIdOrderByDateMouvementDescCreeLeDesc(agenceId).stream().map(this::resume).toList();}
 public MouvementResume creer(UUID agenceId,CreationMouvement q,AuthenticatedUser acteur){MembreAgence membre=verifierAcces(agenceId,acteur);if(membre.getFonction()!=FonctionAgence.CAISSIER&&membre.getFonction()!=FonctionAgence.RESPONSABLE)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Accès réservé au caissier et au responsable.");if(q.type()==null||q.montant()==null||q.montant().compareTo(BigDecimal.ZERO)<=0||q.montant().scale()>2||q.dateMouvement()==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Type, montant positif et date sont obligatoires.");String libelle=propre(q.libelle());if(libelle==null||libelle.length()>140)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Le libellé est obligatoire (140 caractères maximum).");String description=propre(q.description());String justificatif=propre(q.justificatifUrl());if(description!=null&&description.length()>1000||justificatif!=null&&justificatif.length()>500)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Description ou justificatif trop long.");Agence agence=agences.findById(agenceId).orElseThrow();User auteur=utilisateurs.findById(acteur.id()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Session invalide."));return resume(mouvements.save(new MouvementCaisseAgence(agence,auteur,q.type(),libelle,description,q.montant(),q.dateMouvement(),justificatif)));}
 public MouvementResume traiter(UUID agenceId,UUID mouvementId,DecisionMouvement q,AuthenticatedUser acteur){MembreAgence membre=verifierAcces(agenceId,acteur);if(membre.getFonction()!=FonctionAgence.RESPONSABLE)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Seul le responsable peut valider ou refuser un mouvement.");MouvementCaisseAgence m=mouvements.findByIdAndAgenceId(mouvementId,agenceId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Mouvement introuvable."));if(m.getStatut()!=StatutMouvementCaisse.EN_ATTENTE)throw new ResponseStatusException(HttpStatus.CONFLICT,"Ce mouvement a déjà été traité.");String motif=propre(q.motif());if(!q.valider()&&(motif==null||motif.length()>500))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Un motif de refus est obligatoire (500 caractères maximum).");User responsable=utilisateurs.findById(acteur.id()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Session invalide."));m.traiter(responsable,q.valider(),motif);return resume(m);}
 private MembreAgence verifierAcces(UUID agenceId,AuthenticatedUser a){if(a==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);agences.findById(agenceId).filter(x->x.getStatut()==StatutAgence.ACTIVE).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Agence introuvable ou inactive."));return membres.findByAgenceIdAndUtilisateurId(agenceId,a.id()).filter(m->m.getStatut()==StatutMembreAgence.ACTIF).filter(m->m.getFonction()==FonctionAgence.RESPONSABLE||m.getFonction()==FonctionAgence.CAISSIER).orElseThrow(()->new ResponseStatusException(HttpStatus.FORBIDDEN,"Accès réservé au caissier ou au responsable de cette agence."));}
 private String propre(String s){return s==null||s.isBlank()?null:s.trim();}
 private MouvementResume resume(MouvementCaisseAgence m){return new MouvementResume(m.getId(),m.getAgence().getId(),m.getType().name(),m.getLibelle(),m.getDescription(),m.getMontant(),m.getDateMouvement(),m.getJustificatifUrl(),m.getStatut().name(),m.getMotifRefus(),m.getCreePar().getNomComplet(),m.getTraitePar()==null?null:m.getTraitePar().getNomComplet(),m.getCreeLe(),m.getTraiteLe());}
 public record CreationMouvement(TypeMouvementCaisse type,String libelle,String description,BigDecimal montant,LocalDate dateMouvement,String justificatifUrl){}
 public record DecisionMouvement(boolean valider,String motif){}
 public record MouvementResume(UUID id,UUID agenceId,String type,String libelle,String description,BigDecimal montant,LocalDate dateMouvement,String justificatifUrl,String statut,String motifRefus,String creePar,String traitePar,java.time.Instant creeLe,java.time.Instant traiteLe){}
}
