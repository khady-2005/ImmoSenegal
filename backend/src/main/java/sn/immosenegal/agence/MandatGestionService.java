package sn.immosenegal.agence;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.annonce.AnnonceRepository;
import sn.immosenegal.annonce.StatutAnnonce;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.User;

@Service
@Transactional
public class MandatGestionService {
    private final AgenceRepository agences;
    private final MembreAgenceRepository membres;
    private final AnnonceRepository annonces;
    private final MandatGestionRepository mandats;
    private final NotificationService notifications;

    public MandatGestionService(AgenceRepository agences, MembreAgenceRepository membres,
            AnnonceRepository annonces, MandatGestionRepository mandats, NotificationService notifications) {
        this.agences = agences;
        this.membres = membres;
        this.annonces = annonces;
        this.mandats = mandats;
        this.notifications = notifications;
    }

    public MandatResume proposer(UUID agenceId, UUID annonceId, AuthenticatedUser acteur) {
        verifierResponsable(agenceId, acteur);
        Agence agence = agences.findById(agenceId)
            .filter(a -> a.getStatut() == StatutAgence.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence introuvable ou inactive."));
        Annonce annonce = annonces.findById(annonceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
        if (annonce.isExemple()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Une annonce de démonstration ne peut pas faire l'objet d'un mandat.");
        }
        if (annonce.getStatut() != StatutAnnonce.PUBLIEE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Seules les annonces publiées peuvent faire l'objet d'une proposition.");
        }
        if (annonce.getProprietaire().getId().equals(acteur.id())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vous ne pouvez pas proposer un mandat sur votre propre annonce.");
        }
        if (mandats.existsByAgenceIdAndAnnonceId(agenceId, annonceId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette agence a déjà une proposition ou un mandat pour ce bien.");
        }
        User proprietaire = annonce.getProprietaire();
        MandatGestion mandat = mandats.save(new MandatGestion(agence, annonce, proprietaire,
            trouverUtilisateurActeur(acteur, annonce)));
        notifications.creer(proprietaire, "PROPOSITION_MANDAT_GESTION",
            "Proposition de gestion immobilière",
            agence.getNom() + " souhaite prendre en charge votre bien : " + annonce.getTitre(),
            "/mes-annonces");
        return versResume(mandat);
    }

    @Transactional(readOnly = true)
    public List<MandatResume> mandatsAgence(UUID agenceId, AuthenticatedUser acteur) {
        verifierResponsable(agenceId, acteur);
        return mandats.findAllByAgenceIdOrderByCreeLeDesc(agenceId).stream().map(this::versResume).toList();
    }

    @Transactional(readOnly = true)
    public List<MandatResume> mesPropositions(Auth
enticatedUser acteur) {
        return mandats.findAllByProprietaireIdOrderByCreeLeDesc(acteur.id()).stream().map(this::versResume).toList();
    }

    public MandatResume repondre(UUID mandatId, boolean accepter, AuthenticatedUser acteur) {
        MandatGestion mandat = mandats.findByIdAndProprietaireId(mandatId, acteur.id())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proposition introuvable."));
        if (mandat.getStatut() != StatutMandatGestion.EN_ATTENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette proposition a déjà reçu une réponse.");
        }
        mandat.decider(accepter ? StatutMandatGestion.ACCEPTE : StatutMandatGestion.REFUSE);
        String decision = accepter ? "acceptée" : "refusée";
        notifications.creer(mandat.getProposePar(), "REPONSE_MANDAT_GESTION",
            "Réponse à une proposition de gestion",
            "Le propriétaire a " + decision + " la proposition concernant : " + mandat.getAnnonce().getTitre(),
            "/mes-agences/" + mandat.getAgence().getId());
        return versResume(mandat);
    }

    private void verifierResponsable(UUID agenceId, AuthenticatedUser acteur) {
        boolean autorise = acteur.role().name().equals("ADMIN") ||
            membres.findByAgenceIdAndUtilisateurId(agenceId, acteur.id())
                .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
                .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE).isPresent();
        if (!autorise) throw new ResponseStatusException(HttpStatus.FORBIDDEN,
            "Seul le responsable de l'agence peut gérer les propositions de mandat.");
    }

    private User trouverUtilisateurActeur(AuthenticatedUser acteur, Annonce annonce) {
        // L'identifiant du proposant est conservé via le compte associé à l'annonce uniquement
        // si l'acteur est également propriétaire ; sinon il est résolu par le dépôt du compte.
        return utilisateursReference(acteur.id(), annonce);
    }

    private User utilisateursReference(UUID acteurId, Annonce annonce) {
        // Le proposant est enregistré par référence à l'utilisateur authentifié.
        // Le repository des annonces ne fournit pas de chargement par identifiant utilisateur.
        return userRepository.findById(acteurId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Compte utilisateur introuvable."));
    }

    private final sn.immosenegal.user.UserRepository userRepository =
        null;

    private MandatResume versResume(MandatGestion m) {
        return new MandatResume(m.getId(), m.getAgence().getId(), m.getAgence().getNom(),
            m.getAnnonce().getId(), m.getAnnonce().getTitre(), m.getAnnonce().getVille(),
            m.getProprietaire().getId(), m.getProprietaire().getNomComplet(),
            m.getStatut().name(), m.getCreeLe(), m.getDecideLe());
    }

    public record MandatResume(UUID id, UUID agenceId, String agenceNom, UUID annonceId,
            String annonceTitre, String ville, UUID proprietaireId, String proprietaireNom,
            String statut, java.time.Instant creeLe, java.time.Instant decideLe) {}
}
