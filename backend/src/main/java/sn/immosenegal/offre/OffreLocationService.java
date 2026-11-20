package sn.immosenegal.offre;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.immosenegal.annonce.*;
import sn.immosenegal.agence.*;
import sn.immosenegal.audit.AuditService;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.*;

@Service
public class OffreLocationService {
    private final OffreLocationRepository offres;
    private final AnnonceRepository annonces;
    private final UserRepository utilisateurs;
    private final MandatGestionRepository mandats;
    private final MembreAgenceRepository membres;
    private final NotificationService notifications;
    private final AuditService audit;

    public OffreLocationService(OffreLocationRepository offres, AnnonceRepository annonces,
            UserRepository utilisateurs, MandatGestionRepository mandats, MembreAgenceRepository membres,
            NotificationService notifications, AuditService audit) {
        this.offres = offres; this.annonces = annonces; this.utilisateurs = utilisateurs;
        this.mandats = mandats; this.membres = membres; this.notifications = notifications; this.audit = audit;
    }

    @Transactional
    public OffreLocationResponse creer(UUID annonceId, CreerOffreLocationRequest req, AuthenticatedUser acteur) {
        exiger(acteur, Role.CLIENT);
        Annonce annonce = annonces.findById(annonceId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
        if (annonce.isExemple() || annonce.getStatut() != StatutAnnonce.PUBLIEE
                || annonce.getTypeTransaction() != TypeTransaction.LOCATION) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Les propositions de loyer concernent uniquement les locations publiées.");
        }
        if (annonce.getProprietaire().getId().equals(acteur.id()))
            throw new ApiException(HttpStatus.FORBIDDEN, "Vous ne pouvez pas proposer un loyer pour votre propre bien.");
        if (offres.existsByAnnonceIdAndLocataireIdAndStatut(annonceId, acteur.id(), StatutOffre.EN_ATTENTE))
            throw new ApiException(HttpStatus.CONFLICT, "Vous avez déjà une proposition en attente pour ce logement.");
        User locataire = utilisateurs.findById(acteur.id())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        OffreLocation offre = offres.save(new OffreLocation(annonce, locataire, req.loyerPropose(),
            req.message() == null ? null : req.message().trim()));
        List<MandatGestion> actifs = mandats.findAllByAnnonceIdAndStatutOrderByCreeLeDesc(
            annonceId, StatutMandatGestion.ACCEPTE);
        if (actifs.isEmpty()) {
            notifications.creer(annonce.getProprietaire(), "PROPOSITION_LOYER",
                "Nouvelle proposition de loyer", locataire.getNomComplet() + " propose un loyer pour « "
                    + annonce.getTitre() + " ».", "/offres-recues");
        } else {
            for (MandatGestion mandat : actifs) {
                membres.findAllByAgenceIdAndStatut(mandat.getAgence().getId(), StatutMembreAgence.ACTIF)
                    .forEach(m -> notifications.creer(m.getUtilisateur(), "PROPOSITION_LOYER",
                        "Nouvelle proposition de loyer", locataire.getNomComplet()
                            + " propose un loyer pour « " + annonce.getTitre() + " ».", "/offres-recues"));
            }
        }
        audit.enregistrer("OFFRE_LOCATION_CREEE", acteur.id(), "Offre " + offre.getId() + " annonce " + annonceId);
        return OffreLocationResponse.de(offre);
    }

    @Transactional(readOnly = true)
    public List<OffreLocationResponse> envoyees(AuthenticatedUser acteur) {
        exiger(acteur, Role.CLIENT);
        return offres.findByLocataireIdOrderByCreeLeDesc(acteur.id()).stream()
            .map(OffreLocationResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public List<OffreLocationResponse> recues(AuthenticatedUser acteur) {
        if (acteur == null || (acteur.role() != Role.PROPRIETAIRE && acteur.role() != Role.AGENT))
            throw new ApiException(HttpStatus.FORBIDDEN, "Accès réservé aux propriétaires et agents mandatés.");
        Map<UUID, OffreLocation> uniques = new LinkedHashMap<>();
        if (acteur.role() == Role.PROPRIETAIRE) {
            offres.findByAnnonceProprietaireIdOrderByCreeLeDesc(acteur.id())
                .forEach(o -> uniques.put(o.getId(), o));
        } else {
            List<UUID> annoncesGerees = membres.findAllByUtilisateurId(acteur.id()).stream()
                .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
                .flatMap(m -> mandats.findAllByAgenceIdAndStatutOrderByCreeLeDesc(
                    m.getAgence().getId(), StatutMandatGestion.ACCEPTE).stream())
                .map(m -> m.getAnnonce().getId()).distinct().toList();
            if (!annoncesGerees.isEmpty()) {
                offres.findByAnnonceIdInOrderByCreeLeDesc(annoncesGerees)
                    .forEach(o -> uniques.put(o.getId(), o));
            }
        }
        return uniques.values().stream().map(OffreLocationResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public List<OffreLocationResponse> toutes(AuthenticatedUser acteur) {
        exiger(acteur, Role.ADMIN);
        return offres.findAllByOrderByCreeLeDesc().stream()
            .map(OffreLocationResponse::de).toList();
    }

    @Transactional
    public OffreLocationResponse decider(UUID id, boolean accepter, String reponse, AuthenticatedUser acteur) {
        if (acteur == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "Connexion requise.");
        OffreLocation offre = trouver(id);
        UUID annonceId = offre.getAnnonce().getId();
        boolean proprietaire = offre.getAnnonce().getProprietaire().getId().equals(acteur.id());
        boolean agentAutorise = acteur != null && acteur.role() == Role.AGENT
            && membres.findAllByUtilisateurId(acteur.id()).stream()
                .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
                .anyMatch(m -> mandats.findAllByAnnonceIdAndStatutOrderByCreeLeDesc(
                    annonceId, StatutMandatGestion.ACCEPTE).stream()
                    .anyMatch(g -> g.getAgence().getId().equals(m.getAgence().getId())));
        if (!proprietaire && !agentAutorise)
            throw new ApiException(HttpStatus.FORBIDDEN, "Vous ne pouvez pas répondre à cette proposition.");
        if (offre.getStatut() != StatutOffre.EN_ATTENTE)
            throw new ApiException(HttpStatus.CONFLICT, "Cette proposition a déjà été traitée.");
        User decideur = utilisateurs.findById(acteur.id())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        offre.decider(accepter, reponse == null ? null : reponse.trim(), acteur.id());
        String nom = decideur.getNomComplet();
        notifications.creer(offre.getLocataire(), "REPONSE_PROPOSITION_LOYER",
            accepter ? "Votre proposition de loyer est acceptée" : "Votre proposition de loyer est refusée",
            nom + " a répondu à votre proposition pour « " + offre.getAnnonce().getTitre() + " ».",
            "/mes-offres");
        audit.enregistrer("OFFRE_LOCATION_TRAITEE", acteur.id(), "Offre " + id + " : " + offre.getStatut());
        return OffreLocationResponse.de(offre);
    }

    @Transactional
    public void annuler(UUID id, AuthenticatedUser acteur) {
        exiger(acteur, Role.CLIENT);
        OffreLocation offre = trouver(id);
        if (!offre.getLocataire().getId().equals(acteur.id()))
            throw new ApiException(HttpStatus.FORBIDDEN, "Cette proposition ne vous appartient pas.");
        if (offre.getStatut() != StatutOffre.EN_ATTENTE)
            throw new ApiException(HttpStatus.CONFLICT, "Cette proposition ne peut plus être annulée.");
        offre.annuler();
        String message = offre.getLocataire().getNomComplet() + " a annulé sa proposition de loyer pour « "
            + offre.getAnnonce().getTitre() + " ». ";
        List<MandatGestion> actifs = mandats.findAllByAnnonceIdAndStatutOrderByCreeLeDesc(
            offre.getAnnonce().getId(), StatutMandatGestion.ACCEPTE);
        if (actifs.isEmpty()) {
            notifications.creer(offre.getAnnonce().getProprietaire(), "PROPOSITION_LOYER_ANNULEE",
                "Proposition de loyer annulée", message, "/offres-recues");
        } else {
            for (MandatGestion mandat : actifs) {
                membres.findAllByAgenceIdAndStatut(mandat.getAgence().getId(), StatutMembreAgence.ACTIF)
                    .forEach(m -> notifications.creer(m.getUtilisateur(), "PROPOSITION_LOYER_ANNULEE",
                        "Proposition de loyer annulée", message, "/offres-recues"));
            }
        }
        audit.enregistrer("OFFRE_LOCATION_ANNULEE", acteur.id(), "Offre " + id);
    }

    private OffreLocation trouver(UUID id) {
        return offres.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Proposition introuvable."));
    }
    private void exiger(AuthenticatedUser acteur, Role role) {
        if (acteur == null || acteur.role() != role)
            throw new ApiException(HttpStatus.FORBIDDEN, "Vous n'avez pas le droit d'effectuer cette action.");
    }
}
