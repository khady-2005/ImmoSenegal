package sn.immosenegal.reservation;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service
@Transactional
public class EtatDesLieuxService {
    private final ContratLocationRepository contrats;
    private final EtatDesLieuxRepository etats;
    private final UserRepository users;
    private final NotificationService notifications;

    public EtatDesLieuxService(ContratLocationRepository contrats, EtatDesLieuxRepository etats,
                              UserRepository users, NotificationService notifications) {
        this.contrats = contrats; this.etats = etats; this.users = users; this.notifications = notifications;
    }

    public List<EtatDesLieuxResume> lister(UUID contratId, AuthenticatedUser acteur) {
        verifierParticipant(contrat(contratId), acteur);
        return etats.findAllByContratIdOrderByCreeLeDesc(contratId).stream().map(this::resume).toList();
    }

    public EtatDesLieuxResume creer(UUID contratId, CreationEtat q, AuthenticatedUser acteur) {
        ContratLocation contrat = contrat(contratId);
        verifierParticipant(contrat, acteur);
        if (contrat.getEtat() != EtatContratLocation.ACTIF && contrat.getEtat() != EtatContratLocation.RESILIATION_PLANIFIEE)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Le contrat doit être en cours pour créer un état des lieux.");
        if (q == null || q.type() == null || q.dateConstat() == null || q.dateConstat().isAfter(LocalDate.now())
                || q.observations() == null || q.observations().isBlank() || q.observations().trim().length() > 5000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vérifiez le type, la date et les observations (5 000 caractères maximum).");
        if (etats.existsByContratIdAndType(contratId, q.type()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un état des lieux de ce type existe déjà pour ce contrat.");
        if (q.type() == TypeEtatDesLieux.SORTIE) {
            boolean entreeValidee = etats.findAllByContratIdOrderByCreeLeDesc(contratId).stream()
                    .anyMatch(e -> e.getType() == TypeEtatDesLieux.ENTREE && e.getStatut() == StatutEtatDesLieux.ACCEPTE);
            if (!entreeValidee)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "L'état des lieux d'entrée doit d'abord être accepté.");
        }
        User auteur = users.findById(acteur.id()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        EtatDesLieux etat = etats.save(new EtatDesLieux(contrat, auteur, q.type(), q.dateConstat(), q.observations().trim()));
        User autre = autrePartie(contrat, acteur.id());
        notifications.creer(autre, "ETAT_DES_LIEUX_A_VALIDER", "État des lieux à vérifier",
                auteur.getNomComplet() + " a partagé un état des lieux (" + q.type().name() + ") pour " + contrat.getAnnonce().getTitre() + ".",
                "/etats-des-lieux");
        return resume(etat);
    }

    public EtatDesLieuxResume decider(UUID id, DecisionEtat q, AuthenticatedUser acteur) {
        EtatDesLieux etat = etats.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "État des lieux introuvable."));
        ContratLocation contrat = etat.getContrat();
        verifierParticipant(contrat, acteur);
        if (etat.getStatut() != StatutEtatDesLieux.EN_ATTENTE)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cet état des lieux a déjà reçu une réponse.");
        if (etat.getCreePar().getId().equals(acteur.id()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "L'auteur ne peut pas valider son propre état des lieux.");
        if (q == null || q.accepter() == null || (!q.accepter() && (q.commentaire() == null || q.commentaire().isBlank())))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pour contester, indiquez le motif de votre désaccord.");
        String commentaire = q.commentaire() == null ? null : q.commentaire().trim();
        if (commentaire != null && commentaire.length() > 1500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le commentaire ne peut dépasser 1 500 caractères.");
        etat.decider(acteur.id(), q.accepter(), commentaire);
        notifications.creer(etat.getCreePar(), q.accepter() ? "ETAT_DES_LIEUX_ACCEPTE" : "ETAT_DES_LIEUX_CONTESTE",
                q.accepter() ? "État des lieux accepté" : "État des lieux contesté",
                q.accepter() ? "L'autre partie a accepté l'état des lieux." : "L'autre partie a contesté l'état des lieux : " + commentaire,
                "/etats-des-lieux");
        return resume(etat);
    }

    private ContratLocation contrat(UUID id) {
        return contrats.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contrat introuvable."));
    }
    private User autrePartie(ContratLocation c, UUID id) {
        return c.getProprietaire().getId().equals(id) ? c.getLocataire() : c.getProprietaire();
    }
    private void verifierParticipant(ContratLocation c, AuthenticatedUser a) {
        if (a == null || (!c.getProprietaire().getId().equals(a.id()) && !c.getLocataire().getId().equals(a.id())))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé aux parties du contrat.");
    }
    private EtatDesLieuxResume resume(EtatDesLieux e) {
        return new EtatDesLieuxResume(e.getId(), e.getContrat().getId(), e.getContrat().getAnnonce().getTitre(),
                e.getCreePar().getId(), e.getCreePar().getNomComplet(), e.getType().name(), e.getDateConstat(),
                e.getObservations(), e.getStatut().name(), e.getCommentaireDecision(), e.getDecidePar(), e.getCreeLe(), e.getModifieLe());
    }
    public record CreationEtat(TypeEtatDesLieux type, LocalDate dateConstat, String observations) {}
    public record DecisionEtat(Boolean accepter, String commentaire) {}
    public record EtatDesLieuxResume(UUID id, UUID contratId, String annonceTitre, UUID creeParId, String creeParNom,
            String type, LocalDate dateConstat, String observations, String statut, String commentaireDecision,
            UUID decidePar, java.time.Instant creeLe, java.time.Instant modifieLe) {}
}
