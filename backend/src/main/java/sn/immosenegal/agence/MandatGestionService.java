package sn.immosenegal.agence;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import sn.immosenegal.abonnement.AbonnementProprietaireRepository;
import sn.immosenegal.abonnement.StatutAbonnement;
import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.annonce.AnnonceRepository;
import sn.immosenegal.annonce.StatutAnnonce;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service
@Transactional
public class MandatGestionService {
    private final AgenceRepository agences;
    private final MembreAgenceRepository membres;
    private final AnnonceRepository annonces;
    private final MandatGestionRepository mandats;
    private final NotificationService notifications;
    private final UserRepository utilisateurs;
    private final AbonnementProprietaireRepository abonnements;

    public MandatGestionService(AgenceRepository agences, MembreAgenceRepository membres,
            AnnonceRepository annonces, MandatGestionRepository mandats,
            NotificationService notifications, UserRepository utilisateurs,
            AbonnementProprietaireRepository abonnements) {
        this.agences = agences;
        this.membres = membres;
        this.annonces = annonces;
        this.mandats = mandats;
        this.notifications = notifications;
        this.utilisateurs = utilisateurs;
        this.abonnements = abonnements;
    }

    /** L'agence propose de gérer un bien appartenant à un autre utilisateur. */
    public MandatResume proposer(UUID agenceId, UUID annonceId, AuthenticatedUser acteur) {
        verifierResponsable(agenceId, acteur);
        Agence agence = agenceActive(agenceId);
        Annonce annonce = annoncePubliee(annonceId);
        if (annonce.getProprietaire().getId().equals(acteur.id())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vous ne pouvez pas proposer un mandat sur votre propre annonce.");
        }
        verifierAbsenceMandat(agenceId, annonceId);
        User proposant = utilisateurActeur(acteur);
        MandatGestion mandat = mandats.save(new MandatGestion(agence, annonce,
            annonce.getProprietaire(), proposant, OrigineMandatGestion.INITIATIVE_AGENCE));
        notifications.creer(annonce.getProprietaire(), "PROPOSITION_MANDAT_GESTION",
            "Proposition de gestion immobilière",
            agence.getNom() + " souhaite prendre en charge votre bien : " + annonce.getTitre(),
            "/mes-annonces");
        return versResume(mandat);
    }

    /** Le propriétaire demande à une agence précise de prendre en charge son annonce. */
    public MandatResume demander(UUID agenceId, UUID annonceId, AuthenticatedUser acteur) {
        Agence agence = agenceActive(agenceId);
        Annonce annonce = annoncePourDemandeProprietaire(annonceId);
        if (!annonce.getProprietaire().getId().equals(acteur.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Vous ne pouvez demander la gestion que de votre propre bien.");
        }
        List<MembreAgence> responsables = membres.findAllByAgenceIdAndStatut(agenceId, StatutMembreAgence.ACTIF)
            .stream().filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE).toList();
        if (responsables.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette agence n'a pas encore de responsable actif.");
        }
        verifierAbsenceMandat(agenceId, annonceId);
        User proprietaire = utilisateurActeur(acteur);
        MandatGestion mandat = mandats.save(new MandatGestion(agence, annonce,
            proprietaire, proprietaire, OrigineMandatGestion.INITIATIVE_PROPRIETAIRE));
        for (MembreAgence responsable : responsables) {
            notifications.creer(responsable.getUtilisateur(), "DEMANDE_MANDAT_GESTION",
                "Nouvelle demande de gestion",
                proprietaire.getNomComplet() + " souhaite confier son bien à " + agence.getNom()
                    + " : " + annonce.getTitre(),
                "/mes-agences/" + agenceId);
        }
        return versResume(mandat);
    }

    @Transactional(readOnly = true)
    public List<MandatResume> mandatsAgence(UUID agenceId, AuthenticatedUser acteur) {
        verifierResponsable(agenceId, acteur);
        return mandats.findAllByAgenceIdOrderByCreeLeDesc(agenceId).stream().map(this::versResume).toList();
    }

    /** Portefeuille visible par tout membre actif de l'agence ; seuls les mandats acceptés sont exposés. */
    @Transactional(readOnly = true)
    public List<MandatResume> portefeuilleAgence(UUID agenceId, AuthenticatedUser acteur) {
        agenceActive(agenceId);
        boolean autorise = acteur != null && (acteur.role().name().equals("ADMIN")
            || membres.findByAgenceIdAndUtilisateurId(agenceId, acteur.id())
                .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF).isPresent());
        if (!autorise) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Vous devez être membre actif de cette agence pour consulter son portefeuille.");
        }
        return mandats.findAllByAgenceIdAndStatutOrderByCreeLeDesc(
            agenceId, StatutMandatGestion.ACCEPTE).stream().map(this::versResume).toList();
    }

    @Transactional(readOnly = true)
    public List<MandatResume> mesPropositions(AuthenticatedUser acteur) {
        return mandats.findAllByProprietaireIdOrderByCreeLeDesc(acteur.id()).stream().map(this::versResume).toList();
    }

    /** La partie qui reçoit la demande est seule autorisée à répondre. */
    public MandatResume repondre(UUID mandatId, boolean accepter, AuthenticatedUser acteur) {
        MandatGestion mandat = mandats.findById(mandatId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proposition introuvable."));
        boolean destinataireAutorise;
        if (mandat.getOrigine() == OrigineMandatGestion.INITIATIVE_AGENCE) {
            destinataireAutorise = mandat.getProprietaire().getId().equals(acteur.id());
        } else {
            destinataireAutorise = acteur.role().name().equals("ADMIN") ||
                membres.findByAgenceIdAndUtilisateurId(mandat.getAgence().getId(), acteur.id())
                    .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
                    .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE).isPresent();
        }
        if (!destinataireAutorise) throw new ResponseStatusException(HttpStatus.FORBIDDEN,
            "Vous n'êtes pas autorisé à répondre à cette demande.");
        if (mandat.getStatut() != StatutMandatGestion.EN_ATTENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette demande a déjà reçu une réponse.");
        }

        if (accepter && (mandats.existsByAnnonceIdAndStatutAndIdNot(
                mandat.getAnnonce().getId(), StatutMandatGestion.ACCEPTE, mandat.getId())
                || mandats.existsByAnnonceIdAndStatutAndIdNot(
                mandat.getAnnonce().getId(), StatutMandatGestion.RESILIATION_DEMANDEE, mandat.getId()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Ce bien est déjà confié à une autre agence. Le mandat existant doit être terminé avant d'en accepter un nouveau.");
        }
        mandat.decider(accepter ? StatutMandatGestion.ACCEPTE : StatutMandatGestion.REFUSE);
        // Un bien enregistré sans abonnement reste invisible jusqu'à l'accord de l'agence.
        // L'acceptation du mandat autorise alors sa publication sans abonnement propriétaire.
        if (accepter && mandat.getAnnonce().getStatut() == StatutAnnonce.EN_ATTENTE) {
            mandat.getAnnonce().setStatut(StatutAnnonce.PUBLIEE);
        }
        String decision = accepter ? "acceptée" : "refusée";
        User destinataire = mandat.getProposePar();
        String titre = mandat.getOrigine() == OrigineMandatGestion.INITIATIVE_AGENCE
            ? "Réponse à votre proposition de gestion"
            : "Réponse de l'agence à votre demande";
        String message = mandat.getOrigine() == OrigineMandatGestion.INITIATIVE_AGENCE
            ? "Le propriétaire a " + decision + " la proposition concernant : " + mandat.getAnnonce().getTitre()
            : mandat.getAgence().getNom() + " a " + decision + " votre demande concernant : " + mandat.getAnnonce().getTitre();
        notifications.creer(destinataire, "REPONSE_MANDAT_GESTION", titre, message,
            mandat.getOrigine() == OrigineMandatGestion.INITIATIVE_AGENCE
                ? "/mes-agences/" + mandat.getAgence().getId() : "/mes-annonces");
        return versResume(mandat);
    }


    /** Une des deux parties peut demander la fin du mandat ; l'autre doit confirmer. */
    public MandatResume demanderResiliation(UUID mandatId, AuthenticatedUser acteur) {
        MandatGestion mandat = mandats.findById(mandatId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mandat introuvable."));
        boolean proprietaire = mandat.getProprietaire().getId().equals(acteur.id());
        boolean responsable = membres.findByAgenceIdAndUtilisateurId(mandat.getAgence().getId(), acteur.id())
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE).isPresent();
        if (!proprietaire && !responsable) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul le propriétaire ou le responsable de l'agence peut demander la résiliation.");
        }
        User demandeur = utilisateurActeur(acteur);
        try { mandat.demanderResiliation(demandeur); }
        catch (IllegalStateException e) { throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage()); }
        User autrePartie;
        if (proprietaire) {
            autrePartie = membres.findAllByAgenceIdAndStatut(mandat.getAgence().getId(), StatutMembreAgence.ACTIF)
                .stream().filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE)
                .map(MembreAgence::getUtilisateur).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Aucun responsable actif dans cette agence."));
        } else {
            autrePartie = mandat.getProprietaire();
        }
        notifications.creer(autrePartie, "DEMANDE_RESILIATION_MANDAT",
            "Demande de résiliation du mandat",
            demandeur.getNomComplet() + " demande la fin du mandat concernant : " + mandat.getAnnonce().getTitre(),
            "/mes-annonces");
        return versResume(mandat);
    }

    /** Seule l'autre partie peut confirmer ou refuser la résiliation demandée. */
    public MandatResume repondreResiliation(UUID mandatId, boolean accepter, AuthenticatedUser acteur) {
        MandatGestion mandat = mandats.findById(mandatId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mandat introuvable."));
        UUID demandeurId = mandat.getResiliationDemandeePar() == null ? null : mandat.getResiliationDemandeePar().getId();
        if (demandeurId == null || demandeurId.equals(acteur.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seule l'autre partie peut répondre à cette demande.");
        }
        boolean proprietaire = mandat.getProprietaire().getId().equals(acteur.id());
        boolean responsable = membres.findByAgenceIdAndUtilisateurId(mandat.getAgence().getId(), acteur.id())
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE).isPresent();
        if (!proprietaire && !responsable) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Vous n'êtes pas autorisé à répondre.");
        }
        User demandeur = mandat.getResiliationDemandeePar();
        try { mandat.deciderResiliation(accepter); }
        catch (IllegalStateException e) { throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage()); }
        // À la fin du mandat, le bien ne peut rester publié sans abonnement direct actif.
        // Le propriétaire pourra le republier après souscription ou signer un nouveau mandat.
        if (accepter && mandat.getAnnonce().getStatut() == StatutAnnonce.PUBLIEE) {
            boolean abonnementActif = abonnements
                .findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(
                    mandat.getProprietaire().getId(), StatutAbonnement.ACTIF)
                .filter(a -> a.getDateFin() != null
                    && !a.getDateFin().isBefore(java.time.LocalDate.now()))
                .isPresent();
            if (!abonnementActif) {
                mandat.getAnnonce().setStatut(StatutAnnonce.EN_ATTENTE);
            }
        }
        if (demandeur != null) notifications.creer(demandeur, "REPONSE_RESILIATION_MANDAT",
            accepter ? "Résiliation confirmée" : "Résiliation refusée",
            accepter ? "Le mandat concernant " + mandat.getAnnonce().getTitre() + " est terminé."
                : "La demande de résiliation du mandat concernant " + mandat.getAnnonce().getTitre() + " a été refusée.",
            "/mes-annonces");
        return versResume(mandat);
    }

    private Agence agenceActive(UUID agenceId) {
        return agences.findById(agenceId)
            .filter(a -> a.getStatut() == StatutAgence.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence introuvable ou inactive."));
    }

    private Annonce annoncePubliee(UUID annonceId) {
        Annonce annonce = annonces.findById(annonceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
        if (annonce.isExemple() || annonce.getStatut() != StatutAnnonce.PUBLIEE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Seules les annonces publiées peuvent faire l'objet d'une proposition d'agence.");
        }
        return annonce;
    }

    /** Le propriétaire peut confier un bien publié ou encore en attente d'abonnement. */
    private Annonce annoncePourDemandeProprietaire(UUID annonceId) {
        Annonce annonce = annonces.findById(annonceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
        if (annonce.isExemple() || (annonce.getStatut() != StatutAnnonce.PUBLIEE
                && annonce.getStatut() != StatutAnnonce.EN_ATTENTE)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Seules vos annonces publiées ou en attente d'abonnement peuvent être confiées à une agence.");
        }
        return annonce;
    }

    private void verifierAbsenceMandat(UUID agenceId, UUID annonceId) {
        boolean bloquant = mandats.existsByAgenceIdAndAnnonceIdAndStatut(agenceId, annonceId, StatutMandatGestion.EN_ATTENTE)
            || mandats.existsByAgenceIdAndAnnonceIdAndStatut(agenceId, annonceId, StatutMandatGestion.ACCEPTE)
            || mandats.existsByAgenceIdAndAnnonceIdAndStatut(agenceId, annonceId, StatutMandatGestion.RESILIATION_DEMANDEE);
        if (bloquant) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Une demande ou un mandat actif existe déjà pour ce bien auprès de cette agence.");
        }
    }

    private User utilisateurActeur(AuthenticatedUser acteur) {
        return utilisateurs.findById(acteur.id())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Compte utilisateur introuvable."));
    }

    private void verifierResponsable(UUID agenceId, AuthenticatedUser acteur) {
        boolean autorise = acteur.role().name().equals("ADMIN") ||
            membres.findByAgenceIdAndUtilisateurId(agenceId, acteur.id())
                .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
                .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE).isPresent();
        if (!autorise) throw new ResponseStatusException(HttpStatus.FORBIDDEN,
            "Seul le responsable de l'agence peut consulter ses mandats.");
    }

    private MandatResume versResume(MandatGestion m) {
        return new MandatResume(m.getId(), m.getAgence().getId(), m.getAgence().getNom(),
            m.getAnnonce().getId(), m.getAnnonce().getTitre(), m.getAnnonce().getVille(),
            m.getProprietaire().getId(), m.getProprietaire().getNomComplet(),
            m.getOrigine().name(), m.getStatut().name(), m.getCreeLe(), m.getDecideLe(),
            m.getResiliationDemandeePar() == null ? null : m.getResiliationDemandeePar().getId());
    }

    public record MandatResume(UUID id, UUID agenceId, String agenceNom, UUID annonceId,
            String annonceTitre, String ville, UUID proprietaireId, String proprietaireNom,
            String origine, String statut, java.time.Instant creeLe, java.time.Instant decideLe, UUID resiliationDemandeeParId) {}
}
