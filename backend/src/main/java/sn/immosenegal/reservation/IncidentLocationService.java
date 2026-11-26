package sn.immosenegal.reservation;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.audit.AuditService;
import sn.immosenegal.user.Role;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service
@Transactional
public class IncidentLocationService {
    private final ContratLocationRepository contrats;
    private final IncidentLocationRepository incidents;
    private final UserRepository users;
    private final NotificationService notifications;
    private final AuditService audit;

    public IncidentLocationService(ContratLocationRepository contrats, IncidentLocationRepository incidents,
                                   UserRepository users, NotificationService notifications, AuditService audit) {
        this.contrats = contrats; this.incidents = incidents; this.users = users;
        this.notifications = notifications; this.audit = audit;
    }

    public List<IncidentResume> lister(UUID contratId, AuthenticatedUser acteur) {
        ContratLocation contrat = contrat(contratId);
        if (acteur == null || (acteur.role() != Role.ADMIN
                && (!contrat.getProprietaire().getId().equals(acteur.id())
                    && !contrat.getLocataire().getId().equals(acteur.id())))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé aux parties du contrat ou à l'administration.");
        }
        return incidents.findAllByContratIdOrderByCreeLeDesc(contratId).stream().map(this::resume).toList();
    }

    public IncidentResume declarer(UUID contratId, CreationIncident q, AuthenticatedUser acteur) {
        ContratLocation contrat = contrat(contratId);
        verifierParticipant(contrat, acteur);
        if (contrat.getEtat() != EtatContratLocation.ACTIF && contrat.getEtat() != EtatContratLocation.RESILIATION_PLANIFIEE)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un incident ne peut être déclaré que pendant une location en cours.");
        if (q == null || q.categorie() == null || q.categorie().isBlank() || q.categorie().length() > 80
                || q.description() == null || q.description().isBlank() || q.description().trim().length() > 2000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indiquez une catégorie et une description (2 000 caractères maximum).");
        User auteur = users.findById(acteur.id()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        IncidentLocation incident = incidents.save(new IncidentLocation(contrat, auteur, q.categorie().trim(), q.description().trim()));
        User autre = contrat.getProprietaire().getId().equals(acteur.id()) ? contrat.getLocataire() : contrat.getProprietaire();
        notifications.creer(autre, "INCIDENT_LOCATION_DECLARE", "Nouvel incident locatif",
                auteur.getNomComplet() + " a déclaré un incident pour " + contrat.getAnnonce().getTitre() + ".",
                "/mes-contrats-location");
        return resume(incident);
    }

    public IncidentResume actualiser(UUID incidentId, MiseAJourIncident q, AuthenticatedUser acteur) {
        IncidentLocation incident = incidents.findById(incidentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Incident introuvable."));
        ContratLocation contrat = incident.getContrat();
        verifierParticipant(contrat, acteur);
        if (q == null || q.statut() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Statut invalide.");
        boolean proprietaire = contrat.getProprietaire().getId().equals(acteur.id());
        boolean declarant = incident.getDeclarePar().getId().equals(acteur.id());
        if (q.statut() == StatutIncidentLocation.CLOTURE) {
            if (!declarant || incident.getStatut() != StatutIncidentLocation.RESOLU)
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul l'auteur peut clôturer un incident déjà résolu.");
        } else if (!proprietaire || (q.statut() != StatutIncidentLocation.EN_COURS && q.statut() != StatutIncidentLocation.RESOLU)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul le propriétaire peut faire avancer le traitement de l'incident.");
        }
        String commentaire = q.commentaire() == null ? null : q.commentaire().trim();
        if (commentaire != null && commentaire.length() > 1500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le commentaire ne peut dépasser 1 500 caractères.");
        incident.actualiser(q.statut(), commentaire);
        User autre = declarant ? contrat.getProprietaire() : incident.getDeclarePar();
        notifications.creer(autre, "INCIDENT_LOCATION_MAJ", "Mise à jour d'un incident",
                "L'incident concernant " + contrat.getAnnonce().getTitre() + " est maintenant au statut " + q.statut().name() + ".",
                "/mes-contrats-location");
        return resume(incident);
    }

    /** L'administration peut faciliter le suivi d'un incident, sans imposer une décision juridique. */
    public IncidentResume traiterParAdmin(UUID incidentId, MiseAJourIncident q, AuthenticatedUser acteur) {
        if (acteur == null || acteur.role() != Role.ADMIN)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé à l'administrateur.");
        IncidentLocation incident = incidents.findById(incidentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Incident introuvable."));
        if (q == null || (q.statut() != StatutIncidentLocation.EN_COURS && q.statut() != StatutIncidentLocation.RESOLU))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "L'administration peut mettre le dossier en cours ou proposer sa résolution.");
        String commentaire = q.commentaire() == null ? "" : q.commentaire().trim();
        if (commentaire.isBlank() || commentaire.length() > 1500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ajoutez une note de suivi (1 500 caractères maximum).");
        incident.actualiser(q.statut(), "Suivi administratif : " + commentaire);
        ContratLocation contrat = incident.getContrat();
        String message = "L'administration a mis à jour le suivi de l'incident concernant "
                + contrat.getAnnonce().getTitre() + " : " + commentaire;
        notifications.creer(contrat.getProprietaire(), "INCIDENT_SUIVI_ADMIN", "Suivi administratif d'un incident", message, "/incidents-location");
        notifications.creer(contrat.getLocataire(), "INCIDENT_SUIVI_ADMIN", "Suivi administratif d'un incident", message, "/incidents-location");
        audit.enregistrer("INCIDENT_SUIVI_ADMIN", acteur.id(), "Incident " + incidentId + " : " + q.statut().name());
        return resume(incident);
    }

    private ContratLocation contrat(UUID id) {
        return contrats.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contrat introuvable."));
    }
    private void verifierParticipant(ContratLocation c, AuthenticatedUser a) {
        if (a == null || (!c.getProprietaire().getId().equals(a.id()) && !c.getLocataire().getId().equals(a.id())))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé aux parties du contrat.");
    }
    private IncidentResume resume(IncidentLocation i) {
        return new IncidentResume(i.getId(), i.getContrat().getId(), i.getContrat().getAnnonce().getTitre(),
                i.getDeclarePar().getId(), i.getDeclarePar().getNomComplet(), i.getCategorie(), i.getDescription(),
                i.getStatut().name(), i.getCommentaireResolution(), i.getCreeLe(), i.getModifieLe());
    }
    public record CreationIncident(String categorie, String description) {}
    public record MiseAJourIncident(StatutIncidentLocation statut, String commentaire) {}
    public record IncidentResume(UUID id, UUID contratId, String annonceTitre, UUID declareParId, String declareParNom,
                                 String categorie, String description, String statut, String commentaireResolution,
                                 java.time.Instant creeLe, java.time.Instant modifieLe) {}
}
