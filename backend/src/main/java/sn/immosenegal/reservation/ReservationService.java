package sn.immosenegal.reservation;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.annonce.AnnonceRepository;
import sn.immosenegal.annonce.StatutAnnonce;
import sn.immosenegal.audit.AuditService;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service
public class ReservationService {
    private final ReservationRepository reservations;
    private final AnnonceRepository annonces;
    private final UserRepository users;
    private final AuditService audit;
    private final NotificationService notifications;

    public ReservationService(ReservationRepository reservations, AnnonceRepository annonces,
            UserRepository users, AuditService audit, NotificationService notifications) {
        this.reservations = reservations;
        this.annonces = annonces;
        this.users = users;
        this.audit = audit;
        this.notifications = notifications;
    }

    @Transactional
    public ReservationResponse creer(UUID annonceId, CreerReservationRequest requete, AuthenticatedUser acteur) {
        exigerRole(acteur, Role.CLIENT);
        Annonce annonce = annonces.findById(annonceId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
        if (annonce.getStatut() != StatutAnnonce.PUBLIEE) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Cette annonce n'est pas disponible à la réservation.");
        }
        if (reservations.existsByAnnonceIdAndClientIdAndStatut(annonceId, acteur.id(), StatutReservation.EN_ATTENTE)
                || reservations.existsByAnnonceIdAndClientIdAndStatut(annonceId, acteur.id(), StatutReservation.ACCEPTEE)) {
            throw new ApiException(HttpStatus.CONFLICT, "Vous avez déjà une demande de réservation active pour ce logement.");
        }
        User client = users.findById(acteur.id())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        String message = requete.message() == null || requete.message().isBlank() ? null : requete.message().trim();
        Reservation reservation = reservations.save(new Reservation(annonce, client, message));
        notifications.creer(annonce.getProprietaire(), "RESERVATION_NOUVELLE", "Nouvelle demande de réservation",
            client.getNomComplet() + " souhaite réserver « " + annonce.getTitre() + " ».", "/reservations-recues");
        audit.enregistrer("RESERVATION_CREEE", acteur.id(), "Réservation " + reservation.getId() + " pour l'annonce " + annonceId);
        return ReservationResponse.de(reservation);
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> mesDemandes(AuthenticatedUser acteur) {
        exigerRole(acteur, Role.CLIENT);
        return reservations.findByClientIdOrderByCreeLeDesc(acteur.id()).stream().map(ReservationResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> demandesRecues(AuthenticatedUser acteur) {
        exigerRole(acteur, Role.PROPRIETAIRE, Role.ADMIN);
        return reservations.findByAnnonceProprietaireIdOrderByCreeLeDesc(acteur.id()).stream().map(ReservationResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> toutes(AuthenticatedUser acteur) {
        exigerRole(acteur, Role.ADMIN);
        return reservations.findAllByOrderByCreeLeDesc().stream().map(ReservationResponse::de).toList();
    }

    @Transactional
    public ReservationResponse decider(UUID id, DecisionReservation requete, AuthenticatedUser acteur) {
        exigerRole(acteur, Role.PROPRIETAIRE, Role.ADMIN);
        Reservation reservation = trouver(id);
        if (acteur.role() != Role.ADMIN && !reservation.getAnnonce().getProprietaire().getId().equals(acteur.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cette réservation ne concerne pas vos annonces.");
        }
        if (reservation.getStatut() != StatutReservation.EN_ATTENTE) {
            throw new ApiException(HttpStatus.CONFLICT, "Cette demande a déjà été traitée.");
        }
        String reponse = requete.reponse() == null || requete.reponse().isBlank() ? null : requete.reponse().trim();
        if (requete.action() == StatutReservation.ACCEPTEE) {
            reservation.accepter(reponse);
        } else if (requete.action() == StatutReservation.REFUSEE) {
            reservation.refuser(reponse);
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choisissez Accepter ou Refuser.");
        }
        String titre = requete.action() == StatutReservation.ACCEPTEE
            ? "Votre réservation a été acceptée" : "Votre demande de réservation a reçu une réponse";
        notifications.creer(reservation.getClient(), "RESERVATION_REPONSE", titre,
            "Le propriétaire a répondu pour « " + reservation.getAnnonce().getTitre() + " ».", "/mes-reservations");
        audit.enregistrer("RESERVATION_TRAITEE", acteur.id(), "Réservation " + id + " : " + requete.action());
        return ReservationResponse.de(reservation);
    }

    @Transactional
    public void annuler(UUID id, AuthenticatedUser acteur) {
        exigerRole(acteur, Role.CLIENT);
        Reservation reservation = trouver(id);
        if (!reservation.getClient().getId().equals(acteur.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cette réservation ne vous appartient pas.");
        }
        if (reservation.getStatut() != StatutReservation.EN_ATTENTE) {
            throw new ApiException(HttpStatus.CONFLICT, "Cette demande ne peut plus être annulée.");
        }
        reservation.annuler();
        notifications.creer(reservation.getAnnonce().getProprietaire(), "RESERVATION_ANNULEE", "Demande de réservation annulée",
            reservation.getClient().getNomComplet() + " a annulé sa demande pour « " + reservation.getAnnonce().getTitre() + " ».", "/reservations-recues");
        audit.enregistrer("RESERVATION_ANNULEE", acteur.id(), "Réservation " + id);
    }

    private Reservation trouver(UUID id) {
        return reservations.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Réservation introuvable."));
    }

    private void exigerRole(AuthenticatedUser a, Role... roles) {
        if (a == null || java.util.Arrays.stream(roles).noneMatch(r -> r == a.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Vous n'avez pas le droit d'effectuer cette action.");
        }
    }
}
