package sn.immosenegal.reservation;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import sn.immosenegal.annonce.TypeTransaction;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service @Transactional
public class ContratLocationService {
 private final ReservationRepository reservations; private final ContratLocationRepository contrats; private final PaiementLoyerRepository paiements; private final UserRepository users; private final NotificationService notifications;
 public ContratLocationService(ReservationRepository r,ContratLocationRepository c,PaiementLoyerRepository p,UserRepository u,NotificationService n){reservations=r;contrats=c;paiements=p;users=u;notifications=n;}
 public ContratResume creer(UUID reservationId,CreationContrat q,AuthenticatedUser a){
  Reservation r=reservations.findById(reservationId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Réservation introuvable."));
  if(!r.getAnnonce().getProprietaire().getId().equals(a.id())) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Seul le propriétaire peut créer le contrat.");
  if(r.getStatut()!=StatutReservation.ACCEPTEE) throw new ResponseStatusException(HttpStatus.CONFLICT,"La réservation doit être acceptée.");
  if(r.getAnnonce().getTypeTransaction()!=TypeTransaction.LOCATION) throw new ResponseStatusException(HttpStatus.CONFLICT,"Cette annonce n'est pas une location.");
  if(contrats.existsByReservationId(reservationId)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Un contrat existe déjà pour cette réservation.");
  if(q.loyerMensuel()==null||q.loyerMensuel().signum()<=0||q.depotGarantie()==null||q.depotGarantie().signum()<0||q.dateDebut()==null||(q.dateFin()!=null&&q.dateFin().isBefore(q.dateDebut()))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Vérifiez le loyer, le dépôt et les dates.");
  User owner=users.findById(a.id()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Session invalide."));
  ContratLocation c=contrats.save(new ContratLocation(r.getAnnonce(),owner,r.getClient(),r,q.loyerMensuel(),q.depotGarantie(),q.dateDebut(),q.dateFin()));
  notifications.creer(r.getClient(),"CONTRAT_LOCATION_CREE","Contrat de location créé","Un contrat de location a été préparé pour "+r.getAnnonce().getTitre()+". Consultez les conditions convenues avec le propriétaire.","/mes-reservations");
  return resume(c);
 }
 @Transactional(readOnly=true) public List<ContratResume> mesContrats(AuthenticatedUser a){List<ContratLocation> l=new ArrayList<>();l.addAll(contrats.findAllByProprietaireIdOrderByCreeLeDesc(a.id()));l.addAll(contrats.findAllByLocataireIdOrderByCreeLeDesc(a.id()));return l.stream().distinct().map(this::resume).toList();}
 public PaiementResume enregistrerPaiement(UUID id,CreationPaiement q,AuthenticatedUser a){
  ContratLocation c=contrats.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Contrat introuvable."));
  if(!c.getProprietaire().getId().equals(a.id())&&!c.getLocataire().getId().equals(a.id())) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Vous ne participez pas à ce contrat.");
  if(c.getEtat()!=EtatContratLocation.ACTIF||q.montant()==null||q.montant().signum()<=0||q.periode()==null||q.datePaiement()==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Informations de paiement invalides ou contrat inactif.");
  User u=users.findById(a.id()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Session invalide."));
  PaiementLoyer p=paiements.save(new PaiementLoyer(c,u,q.montant(),q.periode(),q.datePaiement(),q.reference()==null?null:q.reference().trim()));
  User autre=c.getProprietaire().getId().equals(a.id())?c.getLocataire():c.getProprietaire();
  notifications.creer(autre,"PAIEMENT_LOYER_ENREGISTRE","Paiement de loyer enregistré","Un paiement de "+q.montant()+" FCFA pour la période "+q.periode()+" a été déclaré. Vérifiez-le avec l'autre partie.","/mes-contrats-location");
  return new PaiementResume(p.getId(),p.getMontant(),p.getPeriode(),p.getDatePaiement(),p.getReference(),p.getEnregistrePar().getNomComplet());
 }
 @Transactional(readOnly=true) public List<PaiementResume> paiements(UUID id,AuthenticatedUser a){ContratLocation c=contrats.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Contrat introuvable."));verifierParticipant(c,a);return paiements.findAllByContratIdOrderByPeriodeDesc(id).stream().map(p->new PaiementResume(p.getId(),p.getMontant(),p.getPeriode(),p.getDatePaiement(),p.getReference(),p.getEnregistrePar().getNomComplet())).toList();}
 public ContratResume resilier(UUID id, AuthenticatedUser a) {
  ContratLocation c=contrats.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Contrat introuvable."));
  verifierParticipant(c,a);
  if(c.getEtat()!=EtatContratLocation.ACTIF) throw new ResponseStatusException(HttpStatus.CONFLICT,"Seul un contrat actif peut être résilié.");
  c.resilier();
  User autre=c.getProprietaire().getId().equals(a.id())?c.getLocataire():c.getProprietaire();
  notifications.creer(autre,"CONTRAT_LOCATION_RESILIE","Contrat de location résilié","L'autre partie a déclaré la résiliation du contrat concernant "+c.getAnnonce().getTitre()+". Prenez contact pour confirmer les modalités de départ et de restitution du dépôt.","/mes-contrats-location");
  return resume(c);
 }
 private void verifierParticipant(ContratLocation c,AuthenticatedUser a){if(!c.getProprietaire().getId().equals(a.id())&&!c.getLocataire().getId().equals(a.id()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Accès réservé aux parties du contrat.");}
 private ContratResume resume(ContratLocation c){return new ContratResume(c.getId(),c.getAnnonce().getId(),c.getAnnonce().getTitre(),c.getProprietaire().getNomComplet(),c.getLocataire().getNomComplet(),c.getLoyerMensuel(),c.getDepotGarantie(),c.getDateDebut(),c.getDateFin(),c.getEtat().name());}
 public record CreationContrat(BigDecimal loyerMensuel,BigDecimal depotGarantie,LocalDate dateDebut,LocalDate dateFin){}
 public record CreationPaiement(BigDecimal montant,LocalDate periode,LocalDate datePaiement,String reference){}
 public record ContratResume(UUID id,UUID annonceId,String annonceTitre,String proprietaireNom,String locataireNom,BigDecimal loyerMensuel,BigDecimal depotGarantie,LocalDate dateDebut,LocalDate dateFin,String etat){}
 public record PaiementResume(UUID id,BigDecimal montant,LocalDate periode,LocalDate datePaiement,String reference,String enregistrePar){}
}
