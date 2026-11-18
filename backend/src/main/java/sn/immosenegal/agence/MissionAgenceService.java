package sn.immosenegal.agence;

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
public class MissionAgenceService {
    private final MissionAgenceRepository missions;
    private final AgenceRepository agences;
    private final MembreAgenceRepository membres;
    private final UserRepository utilisateurs;
    private final NotificationService notifications;

    public MissionAgenceService(MissionAgenceRepository missions, AgenceRepository agences,
            MembreAgenceRepository membres, UserRepository utilisateurs, NotificationService notifications) {
        this.missions = missions;
        this.agences = agences;
        this.membres = membres;
        this.utilisateurs = utilisateurs;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<MissionResume> lister(UUID agenceId, AuthenticatedUser acteur) {
        MembreAgence membre = verifierMembreActif(agenceId, acteur);
        List<MissionAgence> liste = membre.getFonction() == FonctionAgence.RESPONSABLE
                || acteur.role().name().equals("ADMIN")
            ? missions.findAllByAgenceIdOrderByCreeLeDesc(agenceId)
            : missions.findAllByAgenceIdAndMembreIdOrderByCreeLeDesc(agenceId, membre.getId());
        return liste.stream().map(this::resume).toList();
    }

    public MissionResume creer(UUID agenceId, CreationMission requete, AuthenticatedUser acteur) {
        MembreAgence responsable = verifierResponsable(agenceId, acteur);
        MembreAgence assigne = membres.findById(requete.membreId())
            .filter(m -> m.getAgence().getId().equals(agenceId))
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .filter(m -> m.getFonction() == FonctionAgence.AGENT || m.getFonction() == FonctionAgence.GESTIONNAIRE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Le destinataire doit être un agent ou un gestionnaire actif de cette agence."));
        String titre = requete.titre() == null ? "" : requete.titre().trim();
        if (titre.isBlank() || titre.length() > 160) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le titre est obligatoire (160 caractères maximum). ");
        }
        if (requete.description() != null && requete.description().length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La description ne peut pas dépasser 2 000 caractères.");
        }
        Agence agence = agences.findById(agenceId).orElseThrow();
        User createur = utilisateurs.findById(acteur.id())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        MissionAgence mission = missions.save(new MissionAgence(agence, assigne, createur,
            titre, propre(requete.description()), requete.dateEcheance()));
        notifications.creer(assigne.getUtilisateur(), "MISSION_AGENCE", "Nouvelle mission",
            "Une mission vous a été attribuée par " + createur.getNomComplet() + " : " + titre,
            "/mes-agences/" + agenceId + "/espace");
        return resume(mission);
    }

    public MissionResume changerStatut(UUID agenceId, UUID missionId, ChangementStatut requete,
                                       AuthenticatedUser acteur) {
        MembreAgence membre = verifierMembreActif(agenceId, acteur);
        MissionAgence mission = missions.findByIdAndAgenceId(missionId, agenceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mission introuvable dans cette agence."));
        boolean responsable = membre.getFonction() == FonctionAgence.RESPONSABLE || acteur.role().name().equals("ADMIN");
        if (!responsable && !mission.getMembre().getId().equals(membre.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette mission ne vous est pas attribuée.");
        }
        if (!responsable && mission.getStatut() == StatutMissionAgence.TERMINEE
                && requete.statut() != StatutMissionAgence.TERMINEE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Seul le responsable peut rouvrir une mission terminée.");
        }
        StatutMissionAgence ancienStatut = mission.getStatut();
        mission.changerStatut(requete.statut());
        if (ancienStatut != requete.statut()) {
            String libelle = switch (requete.statut()) {
                case A_FAIRE -> "à faire";
                case EN_COURS -> "en cours";
                case TERMINEE -> "terminée";
            };
            User auteur = utilisateurs.findById(acteur.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session invalide."));
            if (responsable) {
                notifications.creer(mission.getMembre().getUtilisateur(), "MISSION_AGENCE_AVANCEMENT",
                    "Avancement d’une mission modifié",
                    "Le responsable a modifié la mission « " + mission.getTitre() + " » : " + libelle + ".",
                    "/mes-agences/" + agenceId + "/espace");
            } else {
                membres.findAllByAgenceIdAndStatut(agenceId, StatutMembreAgence.ACTIF).stream()
                    .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE)
                    .forEach(r -> notifications.creer(r.getUtilisateur(), "MISSION_AGENCE_AVANCEMENT",
                        "Avancement d’une mission",
                        auteur.getNomComplet() + " a mis à jour « " + mission.getTitre() + " » : " + libelle + ".",
                        "/mes-agences/" + agenceId));
            }
        }
        return resume(mission);
    }

    private MembreAgence verifierMembreActif(UUID agenceId, AuthenticatedUser acteur) {
        Agence agence = agences.findById(agenceId)
            .filter(a -> a.getStatut() == StatutAgence.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence introuvable ou inactive."));
        if (acteur.role().name().equals("ADMIN")) {
            return membres.findAllByAgenceIdAndStatut(agenceId, StatutMembreAgence.ACTIF).stream()
                .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Responsable de l'agence introuvable."));
        }
        return membres.findByAgenceIdAndUtilisateurId(agenceId, acteur.id())
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Vous n'êtes pas membre actif de cette agence."));
    }

    private MembreAgence verifierResponsable(UUID agenceId, AuthenticatedUser acteur) {
        MembreAgence membre = verifierMembreActif(agenceId, acteur);
        if (!acteur.role().name().equals("ADMIN") && membre.getFonction() != FonctionAgence.RESPONSABLE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul le responsable de l'agence peut créer une mission.");
        }
        return membre;
    }

    private MissionResume resume(MissionAgence m) {
        return new MissionResume(m.getId(), m.getAgence().getId(), m.getMembre().getId(),
            m.getMembre().getUtilisateur().getNomComplet(), m.getMembre().getFonction().name(),
            m.getTitre(), m.getDescription(), m.getDateEcheance(), m.getStatut().name(),
            m.getCreateur().getNomComplet(), m.getCreeLe(), m.getModifieLe());
    }

    private String propre(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    public record CreationMission(UUID membreId, String titre, String description, LocalDate dateEcheance) {}
    public record ChangementStatut(StatutMissionAgence statut) {}
    public record MissionResume(UUID id, UUID agenceId, UUID membreId, String membreNom,
        String fonction, String titre, String description, LocalDate dateEcheance, String statut,
        String createurNom, java.time.Instant creeLe, java.time.Instant modifieLe) {}
}
