package sn.immosenegal.reservation;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.audit.AuditService;
import sn.immosenegal.notification.NotificationService;

@Service
@Transactional(readOnly = true)
public class LitigeLocatifService {
    private final IncidentLocationRepository incidents;
    private final EtatDesLieuxRepository etats;
    private final SuiviDepotGarantieRepository depots;
    private final AuditService audit;
    private final NotificationService notifications;

    public LitigeLocatifService(IncidentLocationRepository incidents, EtatDesLieuxRepository etats,
                                SuiviDepotGarantieRepository depots, AuditService audit,
                                NotificationService notifications) {
        this.incidents = incidents; this.etats = etats; this.depots = depots;
        this.audit = audit; this.notifications = notifications;
    }

    public List<LitigeResume> supervision(AuthenticatedUser acteur) {
        if (acteur == null || acteur.role() != Role.ADMIN)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé à l'administrateur.");
        List<LitigeResume> resultats = new ArrayList<>();
        incidents.findAllByStatutInOrderByCreeLeDesc(List.of(StatutIncidentLocation.OUVERT, StatutIncidentLocation.EN_COURS, StatutIncidentLocation.RESOLU))
            .forEach(i -> resultats.add(new LitigeResume("INCIDENT", i.getId(), i.getContrat().getId(),
                i.getContrat().getAnnonce().getTitre(), i.getContrat().getProprietaire().getNomComplet(),
                i.getContrat().getLocataire().getNomComplet(), i.getCategorie(), i.getDescription(),
                i.getStatut().name(), null, i.getCreeLe())));
        etats.findAllByStatut(StatutEtatDesLieux.CONTESTE)
            .forEach(e -> resultats.add(new LitigeResume("ETAT_DES_LIEUX", e.getId(), e.getContrat().getId(),
                e.getContrat().getAnnonce().getTitre(), e.getContrat().getProprietaire().getNomComplet(),
                e.getContrat().getLocataire().getNomComplet(), "État des lieux " + e.getType().name(),
                e.getObservations(), e.getStatut().name(), e.getCommentaireAdmin() != null ? e.getCommentaireAdmin() : e.getCommentaireDecision(), e.getModifieLe())));
        depots.findAllByStatut(StatutDepotGarantie.CONTESTE)
            .forEach(d -> resultats.add(new LitigeResume("DEPOT_GARANTIE", d.getId(), d.getContrat().getId(),
                d.getContrat().getAnnonce().getTitre(), d.getContrat().getProprietaire().getNomComplet(),
                d.getContrat().getLocataire().getNomComplet(), "Dépôt de garantie",
                "Restitution proposée : " + d.getMontantRestitue() + " FCFA ; retenue : " + d.getMontantRetenu()
                    + " FCFA. Motif : " + (d.getMotifRetenue() == null ? "Non précisé" : d.getMotifRetenue()),
                d.getStatut().name(), d.getCommentaireAdmin() != null ? d.getCommentaireAdmin() : d.getCommentaireLocataire(), d.getDecideLe() == null ? d.getCreeLe() : d.getDecideLe())));
        resultats.sort((a, b) -> b.dateSignalement().compareTo(a.dateSignalement()));
        return resultats;
    }

    @Transactional
    public LitigeResume ajouterNoteAdministrative(String type, java.util.UUID id, String note, AuthenticatedUser acteur) {
        if (acteur == null || acteur.role() != Role.ADMIN)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé à l'administrateur.");
        if (note == null || note.isBlank() || note.trim().length() > 1500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La note est obligatoire (1 500 caractères maximum).");
        String texte = "Suivi administratif : " + note.trim();
        java.util.UUID contratId;
        String annonce;
        sn.immosenegal.user.User proprietaire;
        sn.immosenegal.user.User locataire;
        LitigeResume resultat;
        if ("ETAT_DES_LIEUX".equals(type)) {
            EtatDesLieux e = etats.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "État des lieux introuvable."));
            e.ajouterNoteAdmin(texte); contratId=e.getContrat().getId(); annonce=e.getContrat().getAnnonce().getTitre();
            proprietaire=e.getContrat().getProprietaire(); locataire=e.getContrat().getLocataire();
            resultat = new LitigeResume(type,id,contratId,annonce,proprietaire.getNomComplet(),locataire.getNomComplet(),
                    "État des lieux " + e.getType().name(),e.getObservations(),e.getStatut().name(),texte,e.getModifieLe());
        } else if ("DEPOT_GARANTIE".equals(type)) {
            SuiviDepotGarantie d = depots.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier de dépôt introuvable."));
            d.ajouterNoteAdmin(texte); contratId=d.getContrat().getId(); annonce=d.getContrat().getAnnonce().getTitre();
            proprietaire=d.getContrat().getProprietaire(); locataire=d.getContrat().getLocataire();
            resultat = new LitigeResume(type,id,contratId,annonce,proprietaire.getNomComplet(),locataire.getNomComplet(),
                    "Dépôt de garantie","Restitution proposée : " + d.getMontantRestitue() + " FCFA ; retenue : " + d.getMontantRetenu()
                    + " FCFA. Motif : " + (d.getMotifRetenue()==null ? "Non précisé" : d.getMotifRetenue()),d.getStatut().name(),texte,
                    d.getDecideLe()==null ? d.getCreeLe() : d.getDecideLe());
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type de dossier non pris en charge par cette action.");
        }
        String message = texte + " (dossier concernant " + annonce + ").";
        notifications.creer(proprietaire,"LITIGE_NOTE_ADMIN","Suivi administratif d'un dossier",message,"/admin/litiges-locatifs");
        notifications.creer(locataire,"LITIGE_NOTE_ADMIN","Suivi administratif d'un dossier",message,"/admin/litiges-locatifs");
        audit.enregistrer("LITIGE_NOTE_ADMIN",acteur.id(),type + " " + id + " : " + note.trim());
        return resultat;
    }

    public record LitigeResume(String type, java.util.UUID id, java.util.UUID contratId, String annonceTitre,
            String proprietaireNom, String locataireNom, String sujet, String details, String statut,
            String commentaire, Instant dateSignalement) {}
}
