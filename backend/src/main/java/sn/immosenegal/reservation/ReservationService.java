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
import sn.immosenegal.agence.MandatGestion;
import sn.immosenegal.agence.MandatGestionRepository;
import sn.immosenegal.agence.MembreAgenceRepository;
import sn.immosenegal.agence.StatutMandatGestion;
import sn.immosenegal.agence.StatutMembreAgence;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.visite.DemandeVisiteRepository;
import sn.immosenegal.visite.StatutVisite;
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
    private final MandatGestionRepository mandats;
    private final MembreAgenceRepository membres;
    private final DemandeVisiteRepository visites;

    public ReservationService(ReservationRepository reservations, AnnonceRepository annonces,
            UserRepository users, AuditService audit, NotificationService notifications,
            MandatGestionRepository mandats, MembreAgenceRepository membres, DemandeVisiteRepository visites) {
        this.reservations = reservations;
        this.annonces = annonces;
        this.users = users;
        this.audit = audit;
        this.notifications = notifications;
        this.mandats = mandats;
        this.membres = membres;
        this.visites = visites;
    }

    @Transactional
    public ReservationResponse creer(UUID annonceId, CreerReservationRequest requete, AuthenticatedUser acteur) {
        exigerRole(acteur, Role.CLIENT);
        Annonce annonce = annonces.findById(annonceId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
        if (annonce.getStatut() != StatutAnnonce.PUBLIEE) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Cette annonce n'est pas disponible à la réservation.");
        }
        boolean visiteAcceptee = visites.existsByAnnonceIdAndClientIdAndStatut(
            annonceId, acteur.id(), StatutVisite.ACCEPTEE);
        boolean visiteEffectuee = visites.existsByAnnonceIdAndClientIdAndStatut(
            annonceId, acteur.id(), StatutVisite.VISITEE);
        if (!visiteAcceptee && !visiteEffectuee) {
            throw new ApiException(HttpStatus.CONFLICT,
                "La réservation est possible uniquement après l'acceptation de votre demande de visite.");
        }
        if (reservations.existsByAnnonceIdAndClientIdAndStatut(annonceId, acteur.id(), StatutReservation.EN_ATTENTE)
                || reservations.existsByAnnonceIdAndClientIdAndStatut(annonceId, acteur.id(), StatutReservation.ACCEPTEE)) {
            throw new ApiException(HttpStatus.CONFLICT, "Vous avez déjà une demande de réservation active pour ce logement.");
        }
        User client = users.findById(acteur.id())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        String message = requete.message() == null || requete.message().isBlank() ? null : requete.message().trim();
        Reservation reservation = reservations.save(new Reservation(annonce, client, message));
        notifierInterlocuteurs(annonce, "RESERVATION_NOUVELLE", "Nouvelle demande de réservation",
            client.getNomComplet() + " souhaite réserver « " + annonce.getTitre() + " ».");
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
        exigerRole(acteur, Role.PROPRIETAIRE, Role.AGENT, Role.RESPONSABLE, Role.ADMIN);
        if (acteur.role() == Role.ADMIN) return toutes(acteur);
        java.util.Set<UUID> annoncesGerees = new java.util.LinkedHashSet<>();
        if (acteur.role() == Role.PROPRIETAIRE) {
            reservations.findByAnnonceProprietaireIdOrderByCreeLeDesc(acteur.id())
                .forEach(r -> annoncesGerees.add(r.getAnnonce().getId()));
        }
        membres.findAllByUtilisateurId(acteur.id()).stream()
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .forEach(m -> {
                mandats.findAllByAgenceIdAndStatutOrderByCreeLeDesc(
                        m.getAgence().getId(), StatutMandatGestion.ACCEPTE)
                    .forEach(g -> annoncesGerees.add(g.getAnnonce().getId()));
                annonces.findAllByAgenceIdOrderByCreeLeDesc(m.getAgence().getId())
                    .forEach(a -> annoncesGerees.add(a.getId()));
            });
        return annoncesGerees.isEmpty() ? java.util.List.of()
            : reservations.findAllByAnnonceIdInOrderByCreeLeDesc(java.util.List.copyOf(annoncesGerees))
                .stream().map(ReservationResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> toutes(AuthenticatedUser acteur) {
        exigerRole(acteur, Role.ADMIN);
        return reservations.findAllByOrderByCreeLeDesc().stream().map(reservation -> {
            ReservationResponse r = ReservationResponse.de(reservation);
            var mandat = mandats.findFirstByAnnonceIdAndStatutOrderByDecideLeDesc(
                reservation.getAnnonce().getId(), StatutMandatGestion.ACCEPTE);
            return new ReservationResponse(r.id(), r.annonceId(), r.annonceTitre(), r.ville(), r.quartier(),
                r.clientId(), r.clientNom(), r.clientEmail(), r.clientTelephone(), r.proprietaireNom(),
                r.message(), r.statut(), r.reponseProprietaire(), r.creeLe(), r.modifieLe(),
                mandat.isPresent() ? "AGENCE" : "PROPRIETAIRE",
                mandat.map(m -> m.getAgence().getNom()).orElse(null));
        }).toList();
    }

    @Transactional
    public ReservationResponse decider(UUID id, DecisionReservation requete, AuthenticatedUser acteur) {
        exigerRole(acteur, Role.PROPRIETAIRE, Role.AGENT, Role.RESPONSABLE, Role.ADMIN);
        Reservation reservation = trouver(id);
        if (acteur.role() != Role.ADMIN && !estInterlocuteurAutorise(reservation.getAnnonce(), acteur)) {
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
            "Le gestionnaire du logement a répondu pour « " + reservation.getAnnonce().getTitre() + " ».", "/mes-reservations");
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
        notifierInterlocuteurs(reservation.getAnnonce(), "RESERVATION_ANNULEE", "Demande de réservation annulée",
            reservation.getClient().getNomComplet() + " a annulé sa demande pour « " + reservation.getAnnonce().getTitre() + " ».");
        audit.enregistrer("RESERVATION_ANNULEE", acteur.id(), "Réservation " + id);
    }

    private boolean estInterlocuteurAutorise(Annonce annonce, AuthenticatedUser acteur) {
        if (annonce.getProprietaire().getId().equals(acteur.id())) return true;
        if (acteur.role() != Role.AGENT && acteur.role() != Role.RESPONSABLE) return false;
        return membres.findAllByUtilisateurId(acteur.id()).stream()
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .anyMatch(m -> (annonce.getAgence() != null && annonce.getAgence().getId().equals(m.getAgence().getId()))
                || mandats.existsByAgenceIdAndAnnonceIdAndStatut(
                    m.getAgence().getId(), annonce.getId(), StatutMandatGestion.ACCEPTE));
    }

    private void notifierInterlocuteurs(Annonce annonce, String type, String titre, String message) {
        java.util.List<MandatGestion> actifs = mandats.findAllByAnnonceIdAndStatutOrderByCreeLeDesc(
            annonce.getId(), StatutMandatGestion.ACCEPTE);
        // Le propriétaire conserve toujours une visibilité sur les demandes, même lorsqu'il délègue la gestion.
        java.util.Set<UUID> dejaNotifies = new java.util.HashSet<>();
        User proprietaire = annonce.getProprietaire();
        if (proprietaire != null && dejaNotifies.add(proprietaire.getId())) {
            notifications.creer(proprietaire, type, titre, message, "/reservations-recues");
        }
        for (MandatGestion mandat : actifs) {
            membres.findAllByAgenceIdAndStatut(mandat.getAgence().getId(), StatutMembreAgence.ACTIF)
                .forEach(m -> {
                    if (dejaNotifies.add(m.getUtilisateur().getId()))
                        notifications.creer(m.getUtilisateur(), type, titre, message, "/reservations-recues");
                });
        }
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
