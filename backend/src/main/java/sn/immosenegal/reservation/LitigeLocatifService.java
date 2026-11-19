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

@Service
@Transactional(readOnly = true)
public class LitigeLocatifService {
    private final IncidentLocationRepository incidents;
    private final EtatDesLieuxRepository etats;
    private final SuiviDepotGarantieRepository depots;

    public LitigeLocatifService(IncidentLocationRepository incidents, EtatDesLieuxRepository etats,
                                SuiviDepotGarantieRepository depots) {
        this.incidents = incidents; this.etats = etats; this.depots = depots;
    }

    public List<LitigeResume> supervision(AuthenticatedUser acteur) {
        if (acteur == null || acteur.role() != Role.ADMIN)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé à l'administrateur.");
        List<LitigeResume> resultats = new ArrayList<>();
        incidents.findAllByStatutInOrderByCreeLeDesc(List.of(StatutIncidentLocation.OUVERT, StatutIncidentLocation.EN_COURS))
            .forEach(i -> resultats.add(new LitigeResume("INCIDENT", i.getId(), i.getContrat().getId(),
                i.getContrat().getAnnonce().getTitre(), i.getContrat().getProprietaire().getNomComplet(),
                i.getContrat().getLocataire().getNomComplet(), i.getCategorie(), i.getDescription(),
                i.getStatut().name(), null, i.getCreeLe())));
        etats.findAllByStatut(StatutEtatDesLieux.CONTESTE)
            .forEach(e -> resultats.add(new LitigeResume("ETAT_DES_LIEUX", e.getId(), e.getContrat().getId(),
                e.getContrat().getAnnonce().getTitre(), e.getContrat().getProprietaire().getNomComplet(),
                e.getContrat().getLocataire().getNomComplet(), "État des lieux " + e.getType().name(),
                e.getObservations(), e.getStatut().name(), e.getCommentaireDecision(), e.getModifieLe())));
        depots.findAllByStatut(StatutDepotGarantie.CONTESTE)
            .forEach(d -> resultats.add(new LitigeResume("DEPOT_GARANTIE", d.getId(), d.getContrat().getId(),
                d.getContrat().getAnnonce().getTitre(), d.getContrat().getProprietaire().getNomComplet(),
                d.getContrat().getLocataire().getNomComplet(), "Dépôt de garantie",
                "Restitution proposée : " + d.getMontantRestitue() + " FCFA ; retenue : " + d.getMontantRetenu()
                    + " FCFA. Motif : " + (d.getMotifRetenue() == null ? "Non précisé" : d.getMotifRetenue()),
                d.getStatut().name(), d.getCommentaireLocataire(), d.getDecideLe() == null ? d.getCreeLe() : d.getDecideLe())));
        resultats.sort(Comparator.comparing(LitigeResume::dateSignalement, Comparator.nullsLast(Comparator.reverseOrder())));
        return resultats;
    }

    public record LitigeResume(String type, java.util.UUID id, java.util.UUID contratId, String annonceTitre,
            String proprietaireNom, String locataireNom, String sujet, String details, String statut,
            String commentaire, Instant dateSignalement) {}
}
