package sn.immosenegal.reservation;

import java.math.BigDecimal;
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
public class SuiviDepotGarantieService {
    private final ContratLocationRepository contrats;
    private final SuiviDepotGarantieRepository suivis;
    private final UserRepository users;
    private final NotificationService notifications;

    public SuiviDepotGarantieService(ContratLocationRepository contrats, SuiviDepotGarantieRepository suivis,
                                    UserRepository users, NotificationService notifications) {
        this.contrats = contrats; this.suivis = suivis; this.users = users; this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public SuiviResume consulter(UUID contratId, AuthenticatedUser acteur) {
        ContratLocation contrat = contrat(contratId);
        if (acteur == null || (acteur.role() != Role.ADMIN
                && (!contrat.getProprietaire().getId().equals(acteur.id())
                    && !contrat.getLocataire().getId().equals(acteur.id())))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé aux parties du contrat ou à l'administration.");
        }
        return suivis.findByContratId(contratId).map(this::resume).orElse(null);
    }

    public SuiviResume proposer(UUID contratId, Proposition q, AuthenticatedUser acteur) {
        ContratLocation contrat = contrat(contratId);
        verifierParticipant(contrat, acteur);
        if (!contrat.getProprietaire().getId().equals(acteur.id()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul le propriétaire peut proposer le bilan du dépôt.");
        if (contrat.getEtat() != EtatContratLocation.RESILIE && contrat.getEtat() != EtatContratLocation.TERMINE)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Le contrat doit être terminé avant le bilan du dépôt.");
        if (q == null || q.montantRestitue() == null || q.montantRetenu() == null
                || q.montantRestitue().signum() < 0 || q.montantRetenu().signum() < 0
                || q.montantRestitue().add(q.montantRetenu()).compareTo(contrat.getDepotGarantie()) != 0
                || (q.montantRetenu().signum() > 0 && (q.motifRetenue() == null || q.motifRetenue().isBlank()))
                || (q.motifRetenue() != null && q.motifRetenue().length() > 1500))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La somme restituée et retenue doit correspondre exactement au dépôt. Toute retenue doit être expliquée.");
        User proprietaire = users.findById(acteur.id()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        String motif = q.motifRetenue() == null ? null : q.motifRetenue().trim();
        SuiviDepotGarantie suivi = suivis.findByContratId(contratId).orElse(null);
        boolean nouvelleProposition = suivi != null;
        if (suivi == null) {
            suivi = suivis.save(new SuiviDepotGarantie(contrat, proprietaire,
                    q.montantRestitue(), q.montantRetenu(), motif));
        } else {
            if (suivi.getStatut() != StatutDepotGarantie.CONTESTE)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Une proposition existe déjà et attend une réponse ou a été confirmée.");
            suivi.reproposer(q.montantRestitue(), q.montantRetenu(), motif);
        }
        notifications.creer(contrat.getLocataire(), "DEPOT_GARANTIE_PROPOSE",
                nouvelleProposition ? "Nouvelle proposition de dépôt de garantie" : "Bilan du dépôt de garantie",
                nouvelleProposition
                    ? "Après votre contestation, le propriétaire a transmis une nouvelle proposition pour " + contrat.getAnnonce().getTitre() + ". Vérifiez les montants et répondez."
                    : "Le propriétaire a proposé le bilan du dépôt de garantie pour " + contrat.getAnnonce().getTitre() + ". Vérifiez les montants et répondez.",
                "/depot-garantie");
        return resume(suivi);
    }

    public SuiviResume decider(UUID contratId, Decision q, AuthenticatedUser acteur) {
        ContratLocation contrat = contrat(contratId);
        verifierParticipant(contrat, acteur);
        if (!contrat.getLocataire().getId().equals(acteur.id()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul le locataire peut répondre à cette proposition.");
        SuiviDepotGarantie suivi = suivis.findByContratId(contratId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aucune proposition de dépôt à vérifier."));
        if (suivi.getStatut() != StatutDepotGarantie.A_CONFIRMER)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette proposition a déjà reçu une réponse.");
        if (q == null || q.accepter() == null || (!q.accepter() && (q.commentaire() == null || q.commentaire().isBlank())))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pour contester, expliquez votre désaccord.");
        String commentaire = q.commentaire() == null ? null : q.commentaire().trim();
        if (commentaire != null && commentaire.length() > 1500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le commentaire ne peut dépasser 1 500 caractères.");
        suivi.decider(q.accepter(), commentaire);
        notifications.creer(contrat.getProprietaire(), q.accepter() ? "DEPOT_GARANTIE_CONFIRME" : "DEPOT_GARANTIE_CONTESTE",
                q.accepter() ? "Bilan du dépôt confirmé" : "Bilan du dépôt contesté",
                q.accepter() ? "Le locataire a confirmé le bilan du dépôt de garantie." : "Le locataire conteste le bilan du dépôt : " + commentaire,
                "/depot-garantie");
        return resume(suivi);
    }

    private ContratLocation contrat(UUID id) {
        return contrats.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contrat introuvable."));
    }
    private void verifierParticipant(ContratLocation c, AuthenticatedUser a) {
        if (a == null || (!c.getProprietaire().getId().equals(a.id()) && !c.getLocataire().getId().equals(a.id())))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé aux parties du contrat.");
    }
    private SuiviResume resume(SuiviDepotGarantie s) {
        return new SuiviResume(s.getId(), s.getContrat().getId(), s.getContrat().getDepotGarantie(),
                s.getMontantRestitue(), s.getMontantRetenu(), s.getMotifRetenue(), s.getStatut().name(),
                s.getCommentaireLocataire(), s.getCreeLe(), s.getDecideLe());
    }
    public record Proposition(BigDecimal montantRestitue, BigDecimal montantRetenu, String motifRetenue) {}
    public record Decision(Boolean accepter, String commentaire) {}
    public record SuiviResume(UUID id, UUID contratId, BigDecimal depotInitial, BigDecimal montantRestitue,
            BigDecimal montantRetenu, String motifRetenue, String statut, String commentaireLocataire,
            java.time.Instant creeLe, java.time.Instant decideLe) {}
}
