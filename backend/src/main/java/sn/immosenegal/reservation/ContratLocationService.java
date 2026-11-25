package sn.immosenegal.reservation;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Instant;
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
 private final ReservationRepository reservations; private final ContratLocationRepository contrats; private final PaiementLoyerRepository paiements; private final UserRepository users; private final NotificationService notifications; private final MandatGestionRepository mandats; private final MembreAgenceRepository membres; private final CommissionLocationAgenceRepository commissions;
 public ContratLocationService(ReservationRepository r,ContratLocationRepository c,PaiementLoyerRepository p,UserRepository u,NotificationService n,MandatGestionRepository g,MembreAgenceRepository m,CommissionLocationAgenceRepository commissions){reservations=r;contrats=c;paiements=p;users=u;notifications=n;mandats=g;membres=m;this.commissions=commissions;}
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
  if(!c.getLocataire().getId().equals(a.id())) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Seul le locataire peut déclarer le paiement de son loyer.");
  if((c.getEtat()!=EtatContratLocation.ACTIF&&c.getEtat()!=EtatContratLocation.RESILIATION_PLANIFIEE)||q.montant()==null||q.montant().signum()<=0||q.periode()==null||q.datePaiement()==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Informations de paiement invalides ou contrat inactif.");
  User u=users.findById(a.id()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Session invalide."));
  var mandat=mandats.findFirstByAnnonceIdAndStatutOrderByDecideLeDesc(c.getAnnonce().getId(),StatutMandatGestion.ACCEPTE);
  String type="PROPRIETAIRE"; UUID beneficiaireId=c.getProprietaire().getId(); String beneficiaireNom=c.getProprietaire().getNomComplet();
  if(mandat.isPresent()){type="AGENCE";beneficiaireId=mandat.get().getAgence().getId();beneficiaireNom=mandat.get().getAgence().getNom();}
  PaiementLoyer p=paiements.save(new PaiementLoyer(c,u,q.montant(),q.periode(),q.datePaiement(),q.reference()==null?null:q.reference().trim(),type,beneficiaireId,beneficiaireNom));
  mandat.filter(m->m.getTauxCommissionMensuel()!=null).ifPresent(m->{
   BigDecimal commission=q.montant().multiply(m.getTauxCommissionMensuel()).divide(new BigDecimal("100"),2,RoundingMode.HALF_UP);
   commissions.save(new CommissionLocationAgence(m.getAgence(),m,c,p,m.getTauxCommissionMensuel(),q.montant(),commission));
  });
  if(type.equals("PROPRIETAIRE")) notifications.creer(c.getProprietaire(),"PAIEMENT_LOYER_A_CONFIRMER","Paiement à confirmer","Le locataire a déclaré un paiement de "+q.montant()+" FCFA pour "+c.getAnnonce().getTitre()+". Confirmez sa réception dans les contrats de location.","/mes-contrats-location");
  else membres.findAllByAgenceIdAndStatut(beneficiaireId,StatutMembreAgence.ACTIF).stream()
    .filter(m->m.getFonction()==sn.immosenegal.agence.FonctionAgence.RESPONSABLE).findFirst()
    .ifPresent(m->notifications.creer(m.getUtilisateur(),"PAIEMENT_LOYER_A_CONFIRMER","Paiement à confirmer","Un locataire a déclaré un paiement de "+q.montant()+" FCFA pour "+c.getAnnonce().getTitre()+". Confirmez sa réception.","/mes-contrats-location"));
  return versPaiementResume(p);
 }
 public PaiementResume confirmerPaiement(UUID contratId,UUID paiementId,boolean accepte,AuthenticatedUser a){
  ContratLocation c=contrats.findById(contratId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Contrat introuvable."));
  PaiementLoyer p=paiements.findById(paiementId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Paiement introuvable."));
  if(!p.getBeneficiaireId().equals(a.id())){
   boolean membreAutorise=p.getBeneficiaireType().equals("AGENCE")&&membres.findByAgenceIdAndUtilisateurId(p.getBeneficiaireId(),a.id()).filter(m->m.getStatut()==StatutMembreAgence.ACTIF).isPresent();
   if(!membreAutorise) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Seul le bénéficiaire du paiement ou un membre actif de son agence peut confirmer sa réception.");
  }
  if(!p.getStatutConfirmation().equals("EN_ATTENTE")) throw new ResponseStatusException(HttpStatus.CONFLICT,"Ce paiement a déjà été traité.");
  if(!p.getId().equals(paiementId)||!c.getId().equals(p.getContrat().getId())) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Paiement introuvable pour ce contrat.");
  p.confirmer(accepte);
  notifications.creer(p.getEnregistrePar(),accepte?"PAIEMENT_LOYER_CONFIRME":"PAIEMENT_LOYER_REFUSE",accepte?"Paiement confirmé":"Paiement refusé",accepte?"Le bénéficiaire a confirmé la réception de votre paiement de "+p.getMontant()+" FCFA.":"Le bénéficiaire n'a pas confirmé la réception de votre paiement de "+p.getMontant()+" FCFA. Contactez-le pour vérifier la situation.","/mes-contrats-location");
  return versPaiementResume(p);
 }
 @Transactional(readOnly=true) public List<PaiementResume> paiements(UUID id,AuthenticatedUser a){ContratLocation c=contrats.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Contrat introuvable."));verifierParticipant(c,a);return paiements.findAllByContratIdOrderByPeriodeDesc(id).stream().map(this::versPaiementResume).toList();}
 public ContratResume confirmerLecture(UUID id, AuthenticatedUser a) {
  ContratLocation c=contrats.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Contrat introuvable."));
  verifierParticipant(c,a);
  User participant=users.findById(a.id()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Session invalide."));
  c.confirmerLecture(participant);
  User autre=c.getProprietaire().getId().equals(a.id())?c.getLocataire():c.getProprietaire();
  notifications.creer(autre,"CONTRAT_LECTURE_CONFIRME","Contrat consulté","L'autre partie a confirmé avoir pris connaissance du récapitulatif du contrat concernant "+c.getAnnonce().getTitre()+".","/mes-contrats-location");
  return resume(c);
 }
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
 @Transactional(readOnly=true)
 public List<CommissionLocationResume> commissionsAgence(UUID agenceId, AuthenticatedUser a) {
  if(a==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Session invalide.");
  if(a.role()!=Role.ADMIN && membres.findByAgenceIdAndUtilisateurId(agenceId,a.id())
      .filter(m->m.getStatut()==StatutMembreAgence.ACTIF)
      .filter(m->m.getFonction()==sn.immosenegal.agence.FonctionAgence.RESPONSABLE).isEmpty()) {
   throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Accès réservé au responsable de l'agence.");
  }
  return commissions.findAllByAgenceIdOrderByCreeLeDesc(agenceId).stream()
   .map(x->new CommissionLocationResume(x.getId(),x.getAgence().getId(),x.getAgence().getNom(),
    x.getContrat().getId(),x.getContrat().getAnnonce().getTitre(),x.getPaiementLoyer().getPeriode(),
    x.getTauxApplique(),x.getBaseCalcul(),x.getMontantCommission(),x.getCreeLe())).toList();
 }
 private PaiementResume versPaiementResume(PaiementLoyer p) {
  CommissionLocationAgence commission=commissions.findByPaiementLoyerId(p.getId()).orElse(null);
  return new PaiementResume(p.getId(),p.getMontant(),p.getPeriode(),p.getDatePaiement(),
   p.getReference(),p.getEnregistrePar().getNomComplet(),
   commission==null?null:commission.getTauxApplique(),
   commission==null?null:commission.getMontantCommission(),p.getBeneficiaireType(),p.getBeneficiaireId(),
   p.getBeneficiaireNom(),p.getStatutConfirmation(),p.getConfirmeLe());
 }
 public List<SupervisionContratResume> supervisionAdmin(AuthenticatedUser a){
  if(a==null||a.role()!=Role.ADMIN) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Accès réservé à l'administrateur.");
  finaliserResiliationsEchues();
  return contrats.findAllByOrderByCreeLeDesc().stream().map(c->new SupervisionContratResume(
   resume(c),paiements.findAllByContratIdOrderByPeriodeDesc(c.getId()).stream()
    .map(this::versPaiementResume).toList()
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
 private ContratResume resume(ContratLocation c){return new ContratResume(c.getId(),c.getAnnonce().getId(),c.getAnnonce().getTitre(),c.getProprietaire().getNomComplet(),c.getLocataire().getNomComplet(),c.getLoyerMensuel(),c.getDepotGarantie(),c.getDateDebut(),c.getDateFin(),c.getEtat().name(),c.getResiliationDemandeePar()==null?null:c.getResiliationDemandeePar().getId(),c.getResiliationDemandeePar()==null?null:c.getResiliationDemandeePar().getNomComplet(),c.getResiliationDemandeeLe(),c.getResiliationMotif(),c.getDateFinSouhaitee(),c.getProprietaireConfirmeLe(),c.getLocataireConfirmeLe());}
 public record CreationContrat(BigDecimal loyerMensuel,BigDecimal depotGarantie,LocalDate dateDebut,LocalDate dateFin){}
 public record CreationPaiement(BigDecimal montant,LocalDate periode,LocalDate datePaiement,String reference){}
 public record ContratResume(UUID id,UUID annonceId,String annonceTitre,String proprietaireNom,String locataireNom,BigDecimal loyerMensuel,BigDecimal depotGarantie,LocalDate dateDebut,LocalDate dateFin,String etat,UUID resiliationDemandeeParId,String resiliationDemandeeParNom,java.time.Instant resiliationDemandeeLe,String resiliationMotif,LocalDate dateFinSouhaitee,Instant proprietaireConfirmeLe,Instant locataireConfirmeLe){}
 public record PaiementResume(UUID id,BigDecimal montant,LocalDate periode,LocalDate datePaiement,String reference,String enregistrePar,BigDecimal tauxCommissionAgence,BigDecimal commissionAgence,String beneficiaireType,UUID beneficiaireId,String beneficiaireNom,String statutConfirmation,Instant confirmeLe){}
 public record CommissionLocationResume(UUID id,UUID agenceId,String agenceNom,UUID contratId,String annonceTitre,LocalDate periode,BigDecimal tauxApplique,BigDecimal baseCalcul,BigDecimal montantCommission,Instant creeLe){}
 public record SupervisionContratResume(ContratResume contrat,List<PaiementResume> paiements){}
}
