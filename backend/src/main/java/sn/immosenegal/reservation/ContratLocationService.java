package sn.immosenegal.reservation;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import sn.immosenegal.annonce.TypeTransaction;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.agence.MandatGestionRepository;
import sn.immosenegal.agence.MembreAgenceRepository;
import sn.immosenegal.agence.StatutMandatGestion;
import sn.immosenegal.agence.StatutMembreAgence;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;
import sn.immosenegal.user.Role;

@Service @Transactional
public class ContratLocationService {
 private final ReservationRepository reservations; private final ContratLocationRepository contrats; private final PaiementLoyerRepository paiements; private final UserRepository users; private final NotificationService notifications; private final MandatGestionRepository mandats; private final MembreAgenceRepository membres;
 public ContratLocationService(ReservationRepository r,ContratLocationRepository c,PaiementLoyerRepository p,UserRepository u,NotificationService n,MandatGestionRepository g,MembreAgenceRepository m){reservations=r;contrats=c;paiements=p;users=u;notifications=n;mandats=g;membres=m;}
 public ContratResume creer(UUID reservationId,CreationContrat q,AuthenticatedUser a){
  Reservation r=reservations.findById(reservationId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Réservation introuvable."));
  if(!autoriseCreationContrat(r,a)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Seul le propriétaire ou un agent de l’agence mandatée peut préparer ce contrat.");
  if(r.getStatut()!=StatutReservation.ACCEPTEE) throw new ResponseStatusException(HttpStatus.CONFLICT,"La réservation doit être acceptée.");
  if(r.getAnnonce().getTypeTransaction()!=TypeTransaction.LOCATION) throw new ResponseStatusException(HttpStatus.CONFLICT,"Cette annonce n'est pas une location.");
  if(contrats.existsByReservationId(reservationId)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Un contrat existe déjà pour cette réservation.");
  if(q.loyerMensuel()==null||q.loyerMensuel().signum()<=0||q.depotGarantie()==null||q.depotGarantie().signum()<0||q.dateDebut()==null||(q.dateFin()!=null&&q.dateFin().isBefore(q.dateDebut()))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Vérifiez le loyer, le dépôt et les dates.");
  User owner=r.getAnnonce().getProprietaire();
  ContratLocation c=contrats.save(new ContratLocation(r.getAnnonce(),owner,r.getClient(),r,q.loyerMensuel(),q.depotGarantie(),q.dateDebut(),q.dateFin()));
  notifications.creer(r.getClient(),"CONTRAT_LOCATION_CREE","Contrat de location préparé","Un contrat de location a été préparé pour "+r.getAnnonce().getTitre()+". Consultez les conditions avec le propriétaire et l’agence gestionnaire si nécessaire.","/mes-reservations");
  if(!owner.getId().equals(a.id())) notifications.creer(owner,"CONTRAT_LOCATION_PREPARE","Contrat préparé par l’agence","Un agent mandaté a préparé le contrat pour "+r.getAnnonce().getTitre()+". Consultez-le avec le locataire.","/mes-contrats-location");
  return resume(c);
 }
 public List<ContratResume> mesContrats(AuthenticatedUser a){finaliserResiliationsEchues();List<ContratLocation> l=new ArrayList<>();l.addAll(contrats.findAllByProprietaireIdOrderByCreeLeDesc(a.id()));l.addAll(contrats.findAllByLocataireIdOrderByCreeLeDesc(a.id()));return l.stream().distinct().map(this::resume).toList();}
 public PaiementResume enregistrerPaiement(UUID id,CreationPaiement q,AuthenticatedUser a){
  finaliserResiliationsEchues();
  ContratLocation c=contrats.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Contrat introuvable."));
  if(!c.getProprietaire().getId().equals(a.id())&&!c.getLocataire().getId().equals(a.id())) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Vous ne participez pas à ce contrat.");
  if((c.getEtat()!=EtatContratLocation.ACTIF&&c.getEtat()!=EtatContratLocation.RESILIATION_PLANIFIEE)||q.montant()==null||q.montant().signum()<=0||q.periode()==null||q.datePaiement()==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Informations de paiement invalides ou contrat inactif.");
  User u=users.findById(a.id()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Session invalide."));
  PaiementLoyer p=paiements.save(new PaiementLoyer(c,u,q.montant(),q.periode(),q.datePaiement(),q.reference()==null?null:q.reference().trim()));
  User autre=c.getProprietaire().getId().equals(a.id())?c.getLocataire():c.getProprietaire();
  notifications.creer(autre,"PAIEMENT_LOYER_ENREGISTRE","Paiement de loyer enregistré","Un paiement de "+q.montant()+" FCFA pour la période "+q.periode()+" a été déclaré. Vérifiez-le avec l'autre partie.","/mes-contrats-location");
  return new PaiementResume(p.getId(),p.getMontant(),p.getPeriode(),p.getDatePaiement(),p.getReference(),p.getEnregistrePar().getNomComplet());
 }
 @Transactional(readOnly=true) public List<PaiementResume> paiements(UUID id,AuthenticatedUser a){ContratLocation c=contrats.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Contrat introuvable."));verifierParticipant(c,a);return paiements.findAllByContratIdOrderByPeriodeDesc(id).stream().map(p->new PaiementResume(p.getId(),p.getMontant(),p.getPeriode(),p.getDatePaiement(),p.getReference(),p.getEnregistrePar().getNomComplet())).toList();}
 public ContratResume demanderResiliation(UUID id, String motif, LocalDate dateSouhaitee, AuthenticatedUser a) {
  ContratLocation c=contrats.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Contrat introuvable."));
  verifierParticipant(c,a);
  if(c.getEtat()!=EtatContratLocation.ACTIF) throw new ResponseStatusException(HttpStatus.CONFLICT,"Seul un contrat actif peut faire l'objet d'une demande de résiliation.");
  User demandeur=users.findById(a.id()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Session invalide."));
  if(motif==null||motif.isBlank()||motif.trim().length()>1000||dateSouhaitee==null||dateSouhaitee.isBefore(LocalDate.now())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Indiquez un motif et une date de départ souhaitée valide.");
  c.demanderResiliation(demandeur,motif.trim(),dateSouhaitee);
  User autre=c.getProprietaire().getId().equals(a.id())?c.getLocataire():c.getProprietaire();
  notifications.creer(autre,"CONTRAT_RESILIATION_DEMANDEE","Demande de résiliation","L'autre partie demande la résiliation du contrat concernant "+c.getAnnonce().getTitre()+". Consultez le contrat pour accepter ou refuser cette demande.","/mes-contrats-location");
  return resume(c);
 }
 public ContratResume deciderResiliation(UUID id, boolean accepter, AuthenticatedUser a) {
  ContratLocation c=contrats.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Contrat introuvable."));
  verifierParticipant(c,a);
  if(c.getEtat()!=EtatContratLocation.RESILIATION_DEMANDEE||c.getResiliationDemandeePar()==null) throw new ResponseStatusException(HttpStatus.CONFLICT,"Aucune demande de résiliation n'est en attente.");
  if(c.getResiliationDemandeePar().getId().equals(a.id())) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Seule l'autre partie peut répondre à cette demande.");
  User demandeur=c.getResiliationDemandeePar();
  c.traiterResiliation(accepter);
  String message=accepter?(c.getEtat()==EtatContratLocation.RESILIATION_PLANIFIEE?"La résiliation du contrat concernant "+c.getAnnonce().getTitre()+" est acceptée et prendra effet le "+c.getDateFinSouhaitee()+".":"La résiliation du contrat concernant "+c.getAnnonce().getTitre()+" est effective."):"L'autre partie a refusé la demande de résiliation du contrat concernant "+c.getAnnonce().getTitre()+". Le contrat reste actif.";
  notifications.creer(demandeur,accepter?"CONTRAT_RESILIATION_ACCEPTEE":"CONTRAT_RESILIATION_REFUSEE",accepter?"Résiliation acceptée":"Résiliation refusée",message,"/mes-contrats-location");
  return resume(c);
 }
 public ContratResume annulerDemandeResiliation(UUID id, AuthenticatedUser a) {
  ContratLocation c=contrats.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Contrat introuvable."));
  verifierParticipant(c,a);
  if(c.getEtat()!=EtatContratLocation.RESILIATION_DEMANDEE||c.getResiliationDemandeePar()==null||!c.getResiliationDemandeePar().getId().equals(a.id())) throw new ResponseStatusException(HttpStatus.CONFLICT,"Vous ne pouvez annuler que votre propre demande en attente.");
  c.annulerDemandeResiliation();
  User autre=c.getProprietaire().getId().equals(a.id())?c.getLocataire():c.getProprietaire();
  notifications.creer(autre,"CONTRAT_RESILIATION_ANNULEE","Demande de résiliation annulée","La demande de résiliation du contrat concernant "+c.getAnnonce().getTitre()+" a été annulée. Le contrat reste actif.","/mes-contrats-location");
  return resume(c);
 }
 public List<SupervisionContratResume> supervisionAdmin(AuthenticatedUser a){
  if(a==null||a.role()!=Role.ADMIN) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Accès réservé à l'administrateur.");
  finaliserResiliationsEchues();
  return contrats.findAllByOrderByCreeLeDesc().stream().map(c->new SupervisionContratResume(
   resume(c),paiements.findAllByContratIdOrderByPeriodeDesc(c.getId()).stream()
    .map(p->new PaiementResume(p.getId(),p.getMontant(),p.getPeriode(),p.getDatePaiement(),p.getReference(),p.getEnregistrePar().getNomComplet())).toList()
  )).toList();
 }
 @Scheduled(fixedDelayString = "${app.locations.termination-check-delay-ms:60000}")
 public void finaliserResiliationsEchues(){LocalDate aujourdHui=LocalDate.now();contrats.findAllByOrderByCreeLeDesc().stream().filter(c->c.getEtat()==EtatContratLocation.RESILIATION_PLANIFIEE&&c.getDateFinSouhaitee()!=null&&!c.getDateFinSouhaitee().isAfter(aujourdHui)).forEach(ContratLocation::finaliserResiliation);}
 private boolean autoriseCreationContrat(Reservation r,AuthenticatedUser a){
  if(a==null)return false;
  if(r.getAnnonce().getProprietaire().getId().equals(a.id()))return true;
  if(a.role()!=Role.AGENT)return false;
  return membres.findAllByUtilisateurId(a.id()).stream()
   .filter(m->m.getStatut()==StatutMembreAgence.ACTIF)
   .anyMatch(m->mandats.existsByAgenceIdAndAnnonceIdAndStatut(m.getAgence().getId(),r.getAnnonce().getId(),StatutMandatGestion.ACCEPTE));
 }
 private void verifierParticipant(ContratLocation c,AuthenticatedUser a){if(!c.getProprietaire().getId().equals(a.id())&&!c.getLocataire().getId().equals(a.id()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Accès réservé aux parties du contrat.");}
 private ContratResume resume(ContratLocation c){return new ContratResume(c.getId(),c.getAnnonce().getId(),c.getAnnonce().getTitre(),c.getProprietaire().getNomComplet(),c.getLocataire().getNomComplet(),c.getLoyerMensuel(),c.getDepotGarantie(),c.getDateDebut(),c.getDateFin(),c.getEtat().name(),c.getResiliationDemandeePar()==null?null:c.getResiliationDemandeePar().getId(),c.getResiliationDemandeePar()==null?null:c.getResiliationDemandeePar().getNomComplet(),c.getResiliationDemandeeLe(),c.getResiliationMotif(),c.getDateFinSouhaitee());}
 public record CreationContrat(BigDecimal loyerMensuel,BigDecimal depotGarantie,LocalDate dateDebut,LocalDate dateFin){}
 public record CreationPaiement(BigDecimal montant,LocalDate periode,LocalDate datePaiement,String reference){}
 public record ContratResume(UUID id,UUID annonceId,String annonceTitre,String proprietaireNom,String locataireNom,BigDecimal loyerMensuel,BigDecimal depotGarantie,LocalDate dateDebut,LocalDate dateFin,String etat,UUID resiliationDemandeeParId,String resiliationDemandeeParNom,java.time.Instant resiliationDemandeeLe,String resiliationMotif,LocalDate dateFinSouhaitee){}
 public record PaiementResume(UUID id,BigDecimal montant,LocalDate periode,LocalDate datePaiement,String reference,String enregistrePar){}
 public record SupervisionContratResume(ContratResume contrat,List<PaiementResume> paiements){}
}
