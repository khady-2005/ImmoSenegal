package sn.immosenegal.visite;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.annonce.AnnonceRepository;
import sn.immosenegal.annonce.StatutAnnonce;
import sn.immosenegal.agence.AgenceRepository;
import sn.immosenegal.agence.AgenceType;
import sn.immosenegal.agence.MandatGestion;
import sn.immosenegal.agence.MandatGestionRepository;
import sn.immosenegal.agence.MembreAgenceRepository;
import sn.immosenegal.agence.StatutAgence;
import sn.immosenegal.agence.StatutMandatGestion;
import sn.immosenegal.agence.StatutMembreAgence;
import sn.immosenegal.audit.AuditService;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;
import sn.immosenegal.notification.NotificationService;

@Service
public class DemandeVisiteService {
    private final DemandeVisiteRepository demandes;
    private final AnnonceRepository annonces;
    private final UserRepository users;
    private final AuditService audit;
    private final NotificationService notifications;
    private final MandatGestionRepository mandats;
    private final MembreAgenceRepository membres;

    @Autowired(required = false)
    private AgenceRepository agences;

    public DemandeVisiteService(DemandeVisiteRepository demandes, AnnonceRepository annonces,
                                UserRepository users, AuditService audit, NotificationService notifications,
                                MandatGestionRepository mandats, MembreAgenceRepository membres) {
        this.demandes = demandes;
        this.annonces = annonces;
        this.users = users;
        this.audit = audit;
        this.notifications = notifications;
        this.mandats = mandats;
        this.membres = membres;
    }

    @Transactional
    public DemandeVisiteResponse creer(UUID annonceId, CreerDemandeVisite requete, AuthenticatedUser acteur) {
        exigerRole(acteur, Role.CLIENT);
        Annonce annonce = annonces.findById(annonceId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
        if (annonce.getStatut() != StatutAnnonce.PUBLIEE) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Cette annonce n'est pas disponible pour une visite.");
        }
        if (!requete.dateVisite().isAfter(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choisissez une date et une heure dans le futur.");
        }
        User client = users.findById(acteur.id())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        DemandeVisite demande = demandes.save(new DemandeVisite(annonce, client, requete.dateVisite(), propre(requete.message())));
        notifierInterlocuteurs(annonce, "VISITE_NOUVELLE", "Nouvelle demande de visite",
            client.getNomComplet() + " souhaite visiter « " + annonce.getTitre() + " ».");
        audit.enregistrer("DEMANDE_VISITE_CREEE", acteur.id(), "Demande de visite " + demande.getId());
        return DemandeVisiteResponse.de(demande);
    }

    @Transactional(readOnly = true)
    public List<DemandeVisiteResponse> mesDemandes(AuthenticatedUser acteur) {
        exigerRole(acteur, Role.CLIENT);
        return demandes.findByClientIdOrderByCreeLeDesc(acteur.id()).stream().map(DemandeVisiteResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public List<DemandeVisiteResponse> demandesRecues(AuthenticatedUser acteur) {
        if (acteur == null) throw new ApiException(HttpStatus.FORBIDDEN, "Connexion requise.");
        if (acteur.role() == Role.ADMIN) return toutes(acteur);
        if (acteur.role() == Role.PROPRIETAIRE)
            return demandes.findByAnnonceProprietaireIdOrderByCreeLeDesc(acteur.id()).stream().map(DemandeVisiteResponse::de).toList();
        java.util.Set<UUID> annoncesGerees = new java.util.LinkedHashSet<>();
        membres.findAllByUtilisateurId(acteur.id()).stream()
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .forEach(m -> {
                mandats.findAllByAgenceIdAndStatutOrderByCreeLeDesc(
                        m.getAgence().getId(), StatutMandatGestion.ACCEPTE)
                    .forEach(g -> annoncesGerees.add(g.getAnnonce().getId()));
                annonces.findAllByAgenceIdOrderByCreeLeDesc(m.getAgence().getId())
                    .forEach(a -> annoncesGerees.add(a.getId()));
                if (m.getAgence().getType() == AgenceType.INTERNE) {
                    annonces.findAllByPublieeParAgenceTrueAndAgenceIsNull()
                        .forEach(a -> annoncesGerees.add(a.getId()));
                }
            });
        if (annoncesGerees.isEmpty()) return List.of();
        return demandes.findAllByAnnonceIdInOrderByCreeLeDesc(List.copyOf(annoncesGerees))
            .stream().map(DemandeVisiteResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public List<DemandeVisiteResponse> toutes(AuthenticatedUser acteur) {
        exigerRole(acteur, Role.ADMIN);
        return demandes.findAllByOrderByCreeLeDesc().stream().map(d -> {
            DemandeVisiteResponse r = DemandeVisiteResponse.de(d);
            var mandat = mandats.findFirstByAnnonceIdAndStatutOrderByDecideLeDesc(
                d.getAnnonce().getId(), StatutMandatGestion.ACCEPTE);
            return new DemandeVisiteResponse(r.id(), r.annonceId(), r.annonceTitre(), r.ville(), r.quartier(),
                r.clientId(), r.clientNom(), r.clientEmail(), r.clientTelephone(), r.proprietaireNom(),
                r.dateVisite(), r.message(), r.statut(), r.reponseProprietaire(), r.creeLe(), r.modifieLe(),
                mandat.isPresent() ? "AGENCE" : "PROPRIETAIRE",
                mandat.map(m -> m.getAgence().getNom()).orElse(null));
        }).toList();
    }

    @Transactional
    public DemandeVisiteResponse decider(UUID id, DecisionVisite requete, AuthenticatedUser acteur) {
        if (acteur == null) throw new ApiException(HttpStatus.FORBIDDEN, "Connexion requise.");
        DemandeVisite demande = trouver(id);
        if (acteur.role() != Role.ADMIN && !estInterlocuteurAutorise(demande.getAnnonce(), acteur)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cette demande ne concerne pas vos annonces.");
        }
        if (demande.getStatut() != StatutVisite.EN_ATTENTE) {
            throw new ApiException(HttpStatus.CONFLICT, "Cette demande a déjà été traitée.");
        }
        String reponse = propre(requete.reponse());
        switch (requete.action()) {
            case ACCEPTEE -> demande.accepter(reponse);
            case REFUSEE -> demande.refuser(reponse);
            case PROPOSEE -> {
                if (requete.nouvelleDate() == null || !requete.nouvelleDate().isAfter(LocalDateTime.now())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Proposez une date et une heure dans le futur.");
                }
                demande.proposer(requete.nouvelleDate(), reponse);
            }
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Action non autorisée pour le propriétaire.");
        }
        String titreNotification = switch (requete.action()) {
            case ACCEPTEE -> "Votre visite a été acceptée";
            case REFUSEE -> "Votre demande de visite a reçu une réponse";
            case PROPOSEE -> "Un nouveau créneau vous est proposé";
            default -> "Mise à jour de votre demande de visite";
        };
        notifications.creer(demande.getClient(), "VISITE_REPONSE", titreNotification,
            "Le gestionnaire du logement a répondu pour « " + demande.getAnnonce().getTitre() + " ».", "/mes-visites");
        audit.enregistrer("DEMANDE_VISITE_TRAITEE", acteur.id(), "Demande de visite " + id + " : " + requete.action());
        return DemandeVisiteResponse.de(demande);
    }

    @Transactional
    public DemandeVisiteResponse marquerEffectuee(UUID id, AuthenticatedUser acteur) {
        if (acteur == null) throw new ApiException(HttpStatus.FORBIDDEN, "Connexion requise.");
        DemandeVisite demande = trouver(id);
        if (acteur.role() != Role.ADMIN && !estInterlocuteurAutorise(demande.getAnnonce(), acteur)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cette visite ne concerne pas vos annonces.");
        }
        if (demande.getStatut() != StatutVisite.ACCEPTEE) {
            throw new ApiException(HttpStatus.CONFLICT, "Seule une visite acceptée peut être marquée comme effectuée.");
        }
        if (demande.getDateVisite().isAfter(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.CONFLICT, "La date prévue de la visite n'est pas encore passée.");
        }
        demande.marquerEffectuee();
        notifications.creer(demande.getClient(), "VISITE_EFFECTUEE", "Visite confirmée comme effectuée",
            "La visite de « " + demande.getAnnonce().getTitre() + " » a été marquée comme effectuée. Vous pouvez maintenant demander une réservation.",
            "/mes-visites");
        audit.enregistrer("VISITE_MARQUEE_EFFECTUEE", acteur.id(), "Demande de visite " + id);
        return DemandeVisiteResponse.de(demande);
    }

    @Transactional
    public DemandeVisiteResponse confirmer(UUID id, AuthenticatedUser acteur) {
        exigerRole(acteur, Role.CLIENT);
        DemandeVisite demande = trouver(id);
        verifierClient(demande, acteur);
        if (demande.getStatut() != StatutVisite.PROPOSEE) {
            throw new ApiException(HttpStatus.CONFLICT, "Aucune nouvelle date n'attend votre confirmation.");
        }
        if (!demande.getDateVisite().isAfter(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.CONFLICT, "La date proposée est passée. Contactez le propriétaire.");
        }
        demande.confirmer();
        notifierInterlocuteurs(demande.getAnnonce(), "VISITE_CONFIRMEE", "Créneau de visite confirmé",
            demande.getClient().getNomComplet() + " a confirmé le créneau proposé pour « " + demande.getAnnonce().getTitre() + " ».");
        return DemandeVisiteResponse.de(demande);
    }

    @Transactional
    public void annuler(UUID id, AuthenticatedUser acteur) {
        exigerRole(acteur, Role.CLIENT);
        DemandeVisite demande = trouver(id);
        verifierClient(demande, acteur);
        if (demande.getStatut() != StatutVisite.EN_ATTENTE && demande.getStatut() != StatutVisite.PROPOSEE) {
            throw new ApiException(HttpStatus.CONFLICT, "Cette demande ne peut plus être annulée.");
        }
        demande.annuler();
        notifierInterlocuteurs(demande.getAnnonce(), "VISITE_ANNULEE", "Demande de visite annulée",
            demande.getClient().getNomComplet() + " a annulé sa demande pour « " + demande.getAnnonce().getTitre() + " ».");
        audit.enregistrer("DEMANDE_VISITE_ANNULEE", acteur.id(), "Demande de visite " + id);
    }

    private boolean estInterlocuteurAutorise(Annonce annonce, AuthenticatedUser acteur) {
        if (annonce.getProprietaire() != null && annonce.getProprietaire().getId().equals(acteur.id())) return true;
        return membres.findAllByUtilisateurId(acteur.id()).stream()
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .anyMatch(m -> (annonce.getAgence() != null && annonce.getAgence().getId().equals(m.getAgence().getId()))
                || (annonce.getAgence() == null && annonce.isPublieeParAgence() && m.getAgence().getType() == AgenceType.INTERNE)
                || mandats.existsByAgenceIdAndAnnonceIdAndStatut(
                    m.getAgence().getId(), annonce.getId(), StatutMandatGestion.ACCEPTE));
    }

    private void notifierInterlocuteurs(Annonce annonce, String type, String titre, String message) {
        java.util.List<MandatGestion> actifs = mandats.findAllByAnnonceIdAndStatutOrderByCreeLeDesc(
            annonce.getId(), StatutMandatGestion.ACCEPTE);
        // Le propriétaire et les membres actifs de l'agence (propre ou mandatée) reçoivent la notification.
        java.util.Set<UUID> dejaNotifies = new java.util.HashSet<>();
        User proprietaire = annonce.getProprietaire();
        if (proprietaire != null && dejaNotifies.add(proprietaire.getId())) {
            notifications.creer(proprietaire, type, titre, message, "/visites-recues");
        }
        if (annonce.getAgence() != null) {
            membres.findAllByAgenceIdAndStatut(annonce.getAgence().getId(), StatutMembreAgence.ACTIF)
                .forEach(m -> {
                    if (dejaNotifies.add(m.getUtilisateur().getId()))
                        notifications.creer(m.getUtilisateur(), type, titre, message, "/visites-recues");
                });
        } else if (annonce.isPublieeParAgence() && agences != null) {
            agences.findFirstByTypeAndStatutOrderByCreeLeAsc(AgenceType.INTERNE, StatutAgence.ACTIVE)
                .ifPresent(interne -> membres.findAllByAgenceIdAndStatut(interne.getId(), StatutMembreAgence.ACTIF)
                    .forEach(m -> {
                        if (dejaNotifies.add(m.getUtilisateur().getId()))
                            notifications.creer(m.getUtilisateur(), type, titre, message, "/visites-recues");
                    }));
        }
        for (MandatGestion mandat : actifs) {
            membres.findAllByAgenceIdAndStatut(mandat.getAgence().getId(), StatutMembreAgence.ACTIF)
                .forEach(m -> {
                    if (dejaNotifies.add(m.getUtilisateur().getId()))
                        notifications.creer(m.getUtilisateur(), type, titre, message, "/visites-recues");
                });
        }
    }

    private DemandeVisite trouver(UUID id) {
        return demandes.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Demande de visite introuvable."));
    }

    private void verifierClient(DemandeVisite d, AuthenticatedUser a) {
        if (!d.getClient().getId().equals(a.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cette demande ne vous appartient pas.");
        }
    }

    private void exigerRole(AuthenticatedUser a, Role... roles) {
        if (a == null || java.util.Arrays.stream(roles).noneMatch(r -> r == a.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Vous n'avez pas le droit d'effectuer cette action.");
        }
    }

    private String propre(String valeur) {
        return valeur == null || valeur.isBlank() ? null : valeur.trim();
    }
}
