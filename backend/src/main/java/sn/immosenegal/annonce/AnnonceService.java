package sn.immosenegal.annonce;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sn.immosenegal.agence.Agence;
import sn.immosenegal.agence.AgenceRepository;
import sn.immosenegal.agence.FonctionAgence;
import sn.immosenegal.agence.MandatGestion;
import sn.immosenegal.agence.MandatGestionRepository;
import sn.immosenegal.agence.MembreAgence;
import sn.immosenegal.agence.MembreAgenceRepository;
import sn.immosenegal.agence.StatutAgence;
import sn.immosenegal.agence.StatutMandatGestion;
import sn.immosenegal.agence.StatutMembreAgence;
import sn.immosenegal.audit.AuditService;
import sn.immosenegal.abonnement.AbonnementProprietaireRepository;
import sn.immosenegal.abonnement.StatutAbonnement;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

/**
 * Règles des annonces.
 * <ul>
 *   <li>Tout propriétaire publie immédiatement ; sans abonnement actif, une période gratuite de 15 jours est appliquée. À son terme, l'annonce est suspendue jusqu'à un abonnement ou un mandat accepté.</li>
 *   <li>Le public ne voit que les annonces PUBLIEE (liste, fiche). Le propriétaire et les administrateurs voient les autres.</li>
 *   <li>Le propriétaire ne choisit lui-même que les statuts commerciaux (RESERVE, VENDU, LOUE, ou remettre PUBLIEE) d'une annonce déjà validée.</li>
 *   <li>Le propriétaire peut modifier le contenu et les photos sans repasser par une validation préalable ; les annonces refusées ou suspendues restent verrouillées.</li>
 * </ul>
 */
@Service
public class AnnonceService {

    private static final Set<Role> ROLES_PUBLICATION = Set.of(Role.PROPRIETAIRE, Role.ADMIN);
    private static final int TAILLE_MAX = 50;
    private static final int TAILLE_PAR_DEFAUT = 12;

    private final AnnonceRepository annonces;
    private final UserRepository users;
    private final AuditService audit;
    private final PhotoRepository photos;
    private final AbonnementProprietaireRepository abonnements;
    private final NotificationService notifications;
    private final AgenceRepository agences;
    private final MembreAgenceRepository membresAgence;
    private final MandatGestionRepository mandats;

    @Autowired(required = false)
    private sn.immosenegal.reservation.ReservationRepository reservationsRepo;

    @Autowired(required = false)
    private sn.immosenegal.reservation.ContratLocationRepository contratsRepo;

    @Autowired
    public AnnonceService(AnnonceRepository annonces, UserRepository users, AuditService audit, PhotoRepository photos,
            AbonnementProprietaireRepository abonnements, NotificationService notifications,
            AgenceRepository agences, MembreAgenceRepository membresAgence, MandatGestionRepository mandats) {
        this.annonces = annonces;
        this.users = users;
        this.audit = audit;
        this.photos = photos;
        this.abonnements = abonnements;
        this.notifications = notifications;
        this.agences = agences;
        this.membresAgence = membresAgence;
        this.mandats = mandats;
    }

    /** Constructeur conservé pour les tests unitaires historiques. */
    public AnnonceService(AnnonceRepository annonces, UserRepository users, AuditService audit, PhotoRepository photos,
            AbonnementProprietaireRepository abonnements) {
        this(annonces, users, audit, photos, abonnements, null, null, null, null);
    }

    @Transactional
    public AnnonceResponse creer(AuthenticatedUser auteur, AnnonceRequest requete) {
        return creer(auteur, requete, null, null);
    }

    @Transactional
    public AnnonceResponse creer(AuthenticatedUser auteur, AnnonceRequest requete, UUID proprietaireId) {
        return creer(auteur, requete, proprietaireId, null);
    }

    @Transactional
    public AnnonceResponse creer(AuthenticatedUser auteur, AnnonceRequest requete, UUID proprietaireId, UUID agenceId) {
        if (agenceId != null) {
            return creerPourAgence(auteur, requete, proprietaireId, agenceId);
        }
        if (!ROLES_PUBLICATION.contains(auteur.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Seuls les propriétaires et les administrateurs peuvent publier une annonce.");
        }
        User proprietaire;
        if (auteur.role() == Role.ADMIN) {
            if (proprietaireId == null) {
                if (agences != null) {
                    var interne = agences.findFirstByTypeAndStatutOrderByCreeLeAsc(
                        sn.immosenegal.agence.AgenceType.INTERNE, StatutAgence.ACTIVE);
                    if (interne.isPresent()) {
                        return creerPourAgence(auteur, requete, null, interne.get().getId());
                    }
                }
                throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Choisissez un propriétaire ou activez l'agence ImmoSénégal pour publier en son nom.");
            }
            proprietaire = users.findById(proprietaireId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Compte propriétaire introuvable."));
            if (proprietaire.getRole() != Role.PROPRIETAIRE || !proprietaire.isActif()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Le compte choisi doit être un propriétaire actif.");
            }
        } else {
            if (proprietaireId != null && !proprietaireId.equals(auteur.id())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Vous ne pouvez pas publier au nom d'un autre propriétaire.");
            }
            proprietaire = users.findById(auteur.id())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        }
        Annonce annonce = new Annonce(proprietaire);
        appliquer(annonce, requete);
        var abonnementActif = abonnements
            .findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(proprietaire.getId(), StatutAbonnement.ACTIF)
            .filter(a -> a.getDateFin() != null && !a.getDateFin().isBefore(java.time.LocalDate.now()));
        annonce.setStatut(StatutAnnonce.PUBLIEE);
        // La date sert de limite de couverture : 15 jours gratuits, ou date de fin du forfait actif.
        annonce.setDateFinPublication(abonnementActif
            .map(a -> a.getDateFin())
            .orElseGet(() -> java.time.LocalDate.now().plusDays(15)));
        annonces.save(annonce);
        audit.enregistrer("ANNONCE_CREEE", auteur.id(), annonce.getDateFinPublication() == null
            ? "Annonce " + annonce.getId() + " publiée avec un abonnement ou par administration"
            : "Annonce " + annonce.getId() + " couverte jusqu'au " + annonce.getDateFinPublication());
        return AnnonceResponse.pourGestion(annonce, List.of());
    }

    private AnnonceResponse creerPourAgence(AuthenticatedUser auteur, AnnonceRequest requete, UUID proprietaireId, UUID agenceId) {
        if (agences == null || membresAgence == null) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Service agence indisponible.");
        }
        Agence agence = agences.findById(agenceId)
            .filter(a -> a.getStatut() == StatutAgence.ACTIVE)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Agence introuvable ou inactive."));
        boolean adminInterne = auteur.role() == Role.ADMIN
            && agence.getType() == sn.immosenegal.agence.AgenceType.INTERNE;
        if (auteur.role() == Role.ADMIN && agence.getType() != sn.immosenegal.agence.AgenceType.INTERNE) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                "Les agences partenaires gèrent leurs propres biens de manière autonome.");
        }
        boolean autorise = adminInterne || (agence.getType() == sn.immosenegal.agence.AgenceType.INTERNE
            ? membresAgence.findByAgenceIdAndUtilisateurId(agenceId, auteur.id())
                .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
                .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE)
                .isPresent()
            : estMembrePublicationAgence(agenceId, auteur.id()));
        if (!autorise) {
            throw new ApiException(HttpStatus.FORBIDDEN, agence.getType() == sn.immosenegal.agence.AgenceType.INTERNE
                ? "Seul le responsable d'agence ou l'administrateur peut publier les biens d'ImmoSénégal."
                : "Seul un collaborateur actif de cette agence peut publier un bien en son nom.");
        }
        User proprietaire;
        if (proprietaireId != null) {
            proprietaire = users.findById(proprietaireId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Compte propriétaire introuvable."));
            if (!proprietaire.isActif()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Le compte choisi doit être actif.");
            }
        } else {
            proprietaire = users.findById(auteur.id())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        }
        Annonce annonce = new Annonce(proprietaire);
        appliquer(annonce, requete);
        annonce.setAgence(agence);
        annonce.setPublieeParAgence(true);
        annonce.setStatut(StatutAnnonce.PUBLIEE);
        annonce.setDateFinPublication(null);
        annonces.save(annonce);
        if (proprietaireId != null && !proprietaire.getId().equals(auteur.id()) && notifications != null) {
            notifications.creer(proprietaire, "ANNONCE_AGENCE_CREEE",
                "Annonce enregistrée pour votre bien",
                "L'agence " + agence.getNom() + " a enregistré l'annonce « " + annonce.getTitre() + " ».",
                "/mes-annonces");
        }
        audit.enregistrer("ANNONCE_AGENCE_CREEE", auteur.id(),
            "Annonce " + annonce.getId() + " publiée par l'agence " + agence.getNom());
        return AnnonceResponse.pourGestion(annonce, List.of(), null);
    }

    @Transactional
    public AnnonceResponse reattribuerProprietaire(UUID id, UUID proprietaireId, AuthenticatedUser admin) {
        exigerAdmin(admin);
        Annonce annonce = trouver(id);
        User proprietaire = users.findById(proprietaireId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Compte propriétaire introuvable."));
        if (proprietaire.getRole() != Role.PROPRIETAIRE || !proprietaire.isActif()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Le compte choisi doit être un propriétaire actif.");
        }
        UUID ancien = annonce.getProprietaire().getId();
        annonce.setProprietaire(proprietaire);
        audit.enregistrer("ANNONCE_PROPRIETAIRE_MODIFIE", admin.id(),
            "Annonce " + id + " réattribuée de " + ancien + " à " + proprietaireId);
        return AnnonceResponse.pourGestion(annonce, photosDe(List.of(id)).getOrDefault(id, List.of()));
    }

    @Transactional
    public AnnonceResponse definirPublicationAgence(UUID id, boolean publieeParAgence, AuthenticatedUser admin) {
        exigerAdmin(admin);
        Annonce annonce = trouver(id);
        annonce.setPublieeParAgence(publieeParAgence);
        annonce.setModifieLe(Instant.now());
        audit.enregistrer("ANNONCE_ORIGINE_PUBLICATION_MODIFIEE", admin.id(),
            "Annonce " + id + " : publieeParAgence=" + publieeParAgence);
        return AnnonceResponse.pourGestion(annonce, photosDe(List.of(id)).getOrDefault(id, List.of()));
    }

    /** Met à jour la version de l'annonce pour forcer le rafraîchissement des photos dans le catalogue. */
    @Transactional
    public void marquerPhotosModifiees(UUID id) {
        trouver(id).setModifieLe(Instant.now());
    }

    boolean estBienImmoSenegal(Annonce annonce) {
        if (annonce.getAgence() != null) {
            return annonce.getAgence().getType() == sn.immosenegal.agence.AgenceType.INTERNE;
        }
        return annonce.isPublieeParAgence();
    }

    java.util.Optional<sn.immosenegal.agence.MandatGestion> mandatActif(UUID annonceId) {
        if (mandats == null) {
            return java.util.Optional.empty();
        }
        return mandats.findFirstByAnnonceIdAndStatutOrderByDecideLeDesc(annonceId, StatutMandatGestion.ACCEPTE);
    }

    /** Vérifie les droits de gestion des photos et vidéos (propriétaire, ImmoSénégal, mandat actif ou avertissement requis). */
    void verifierGestionMedia(UUID annonceId, AuthenticatedUser utilisateur) {
        if (utilisateur == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Connexion requise.");
        }
        Annonce annonce = trouver(annonceId);
        if (annonce.getProprietaire().getId().equals(utilisateur.id())) {
            return;
        }
        if (estBienImmoSenegal(annonce)) {
            boolean responsableInterne = false;
            if (membresAgence != null) {
                UUID agenceId = annonce.getAgence() != null
                    ? annonce.getAgence().getId()
                    : (agences == null ? null : agences.findFirstByTypeAndStatutOrderByCreeLeAsc(
                            sn.immosenegal.agence.AgenceType.INTERNE, StatutAgence.ACTIVE)
                        .map(Agence::getId).orElse(null));
                if (agenceId != null) {
                    responsableInterne = membresAgence.findByAgenceIdAndUtilisateurId(agenceId, utilisateur.id())
                        .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
                        .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE)
                        .isPresent();
                }
            }
            if (utilisateur.role() == Role.ADMIN || responsableInterne) {
                return;
            }
            throw new ApiException(HttpStatus.FORBIDDEN,
                "Seul le responsable d'agence ou l'administrateur peut gérer les médias d'ImmoSénégal.");
        }
        var mandat = mandatActif(annonceId);
        if (mandat.isPresent()) {
            var m = mandat.get();
            boolean responsableMandat = membresAgence != null
                && membresAgence.findByAgenceIdAndUtilisateurId(m.getAgence().getId(), utilisateur.id())
                    .filter(membre -> membre.getStatut() == StatutMembreAgence.ACTIF)
                    .filter(membre -> membre.getFonction() == FonctionAgence.RESPONSABLE)
                    .isPresent();
            if (m.getAgence().getType() == sn.immosenegal.agence.AgenceType.INTERNE) {
                if (utilisateur.role() == Role.ADMIN || responsableMandat) {
                    return;
                }
            } else {
                if (utilisateur.role() == Role.ADMIN) {
                    throw new ApiException(HttpStatus.FORBIDDEN,
                        "Les agences partenaires gèrent leurs biens confiés de manière autonome.");
                }
                if (responsableMandat) {
                    return;
                }
            }
            throw new ApiException(HttpStatus.FORBIDDEN,
                "Seul le propriétaire du bien ou le responsable mandaté peut modifier les médias.");
        }
        if (annonce.getAgence() != null && annonce.getAgence().getType() == sn.immosenegal.agence.AgenceType.PARTENAIRE) {
            if (utilisateur.role() == Role.ADMIN) {
                throw new ApiException(HttpStatus.FORBIDDEN,
                    "Les agences partenaires gèrent leurs propres biens de manière autonome.");
            }
            boolean responsablePartenaire = membresAgence != null
                && membresAgence.findByAgenceIdAndUtilisateurId(annonce.getAgence().getId(), utilisateur.id())
                    .filter(membre -> membre.getStatut() == StatutMembreAgence.ACTIF)
                    .filter(membre -> membre.getFonction() == FonctionAgence.RESPONSABLE)
                    .isPresent();
            if (responsablePartenaire) {
                return;
            }
            throw new ApiException(HttpStatus.FORBIDDEN,
                "Seul le responsable de l'agence partenaire peut modifier ces médias.");
        }
        if (utilisateur.role() == Role.ADMIN) {
            throw new ApiException(HttpStatus.CONFLICT,
                "Cette annonce appartient à un propriétaire. Un avertissement doit être envoyé avant toute suppression ou modification de photo.");
        }
        throw new ApiException(HttpStatus.FORBIDDEN,
            "Seul le propriétaire du bien ou le responsable autorisé peut modifier les photos.");
    }

    /** Notifie le propriétaire lorsqu'un bien confié sous mandat actif voit ses médias modifiés par l'agence. */
    void notifierProprietaireSiBienConfie(UUID annonceId, AuthenticatedUser auteur, String action) {
        if (auteur == null || notifications == null) {
            return;
        }
        Annonce annonce = trouver(annonceId);
        if (annonce.getProprietaire().getId().equals(auteur.id()) || estBienImmoSenegal(annonce)) {
            return;
        }
        if (mandatActif(annonceId).isPresent()) {
            notifications.creer(annonce.getProprietaire(), "MEDIA_BIEN_CONFIE_MODIFIE",
                "Médias de votre bien confié mis à jour",
                action + " (« " + annonce.getTitre() + " »).",
                "/mes-annonces");
        }
    }

    /** Les opérations photo directes de l'administrateur sont autorisées sur les biens d'ImmoSénégal (propres ou confiés). */
    void verifierGestionPhotoAdmin(UUID annonceId, AuthenticatedUser utilisateur) {
        verifierGestionMedia(annonceId, utilisateur);
    }

    /** Seul le propriétaire du bien, le responsable autorisé (propre ou confié) ou un ADMIN (sur ImmoSénégal) peut modifier les photos. */
    void verifierModificationPhoto(UUID annonceId, AuthenticatedUser utilisateur) {
        verifierGestionMedia(annonceId, utilisateur);
    }

    @Transactional
    public AnnonceResponse modifier(UUID id, AuthenticatedUser auteur, AnnonceRequest requete) {
        Annonce annonce = trouver(id);
        verifierDroits(annonce, auteur);
        boolean admin = auteur.role() == Role.ADMIN;
        if (admin && !annonce.isPublieeParAgence()
                && !annonce.getProprietaire().getId().equals(auteur.id())) {
            throw new ApiException(HttpStatus.CONFLICT,
                "Pour intervenir sur l'annonce d'un propriétaire, utilisez l'action administrative avec un motif obligatoire.");
        }
        StatutAnnonce avant = annonce.getStatut();
        StatutAnnonce demande = requete.statut();
        boolean changeLeStatut = demande != null && demande != avant;
        boolean changeLeContenu = contenuDifferent(annonce, requete);

        if (changeLeStatut) {
            // Seuls les statuts commerciaux se choisissent ici ; EN_ATTENTE, PUBLIEE, A_CORRIGER,
            // REFUSEE et SUSPENDUE relèvent de la modération (endpoints /api/admin/annonces/...).
            if (!avant.estCommercial() || !demande.estCommercial()) {
                throw new ApiException(HttpStatus.CONFLICT, "Le statut de cette annonce est géré par la modération.");
            }
            if (changeLeContenu) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Modifiez le contenu et le statut en deux enregistrements séparés.");
            }
        }
        if (changeLeContenu && !admin) {
            verifierContenuModifiable(avant);
        }

        appliquer(annonce, requete);
        if (changeLeStatut) {
            annonce.setStatut(demande);
            audit.enregistrer("ANNONCE_STATUT_MODIFIE", auteur.id(), "Annonce " + id + " : " + avant + " -> " + demande);
        } else if (changeLeContenu && !admin) {
            audit.enregistrer("ANNONCE_CONTENU_MODIFIE_PAR_PROPRIETAIRE", auteur.id(), "Annonce " + id + " : contenu mis à jour sans blocage de publication");
        }
        audit.enregistrer("ANNONCE_MODIFIEE", auteur.id(), "Annonce " + id);
        return AnnonceResponse.pourGestion(annonce, photosDe(List.of(id)).getOrDefault(id, List.of()));
    }

    @Transactional
    public AnnonceResponse publierAvecAbonnement(UUID id, AuthenticatedUser auteur) {
        Annonce annonce = trouver(id);
        verifierDroits(annonce, auteur);
        if (auteur.role() != Role.PROPRIETAIRE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cette action est réservée au propriétaire du bien.");
        }
        if (annonce.getStatut() != StatutAnnonce.EN_ATTENTE) {
            throw new ApiException(HttpStatus.CONFLICT, "Seule une annonce en attente peut être publiée ainsi.");
        }
        boolean abonnementActif = abonnements
            .findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(auteur.id(), StatutAbonnement.ACTIF)
            .filter(a -> a.getDateFin() != null && !a.getDateFin().isBefore(java.time.LocalDate.now()))
            .isPresent();
        if (!abonnementActif) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Un abonnement actif est nécessaire pour publier directement ce bien. Vous pouvez aussi le confier à une agence.");
        }
        java.time.LocalDate finForfait = abonnements
            .findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(auteur.id(), StatutAbonnement.ACTIF)
            .filter(a -> a.getDateFin() != null && !a.getDateFin().isBefore(java.time.LocalDate.now()))
            .map(a -> a.getDateFin())
            .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Votre abonnement n'est plus actif."));
        annonce.setDateFinPublication(finForfait);
        annonce.setStatut(StatutAnnonce.PUBLIEE);
        audit.enregistrer("ANNONCE_PUBLIEE_AVEC_ABONNEMENT", auteur.id(), "Annonce " + id + " publiée avec un abonnement actif");
        return AnnonceResponse.pourGestion(annonce, photosDe(List.of(id)).getOrDefault(id, List.of()));
    }

    @Transactional
    public void supprimer(UUID id, AuthenticatedUser auteur) {
        Annonce annonce = trouver(id);
        verifierDroits(annonce, auteur);
        if (auteur.role() == Role.ADMIN && annonce.getAgence() != null
                && annonce.getAgence().getType() == sn.immosenegal.agence.AgenceType.PARTENAIRE) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                "Les agences partenaires gèrent leurs propres biens de manière autonome.");
        }
        if (auteur.role() == Role.ADMIN && !estBienImmoSenegal(annonce)
                && !annonce.getProprietaire().getId().equals(auteur.id())) {
            throw new ApiException(HttpStatus.CONFLICT,
                "Une annonce de propriétaire ne peut pas être supprimée directement. Utilisez l'archivage administratif avec un motif.");
        }
        boolean reservationEnCours = reservationsRepo != null && reservationsRepo.existsByAnnonceIdAndStatutIn(
            id, List.of(sn.immosenegal.reservation.StatutReservation.EN_ATTENTE, sn.immosenegal.reservation.StatutReservation.ACCEPTEE));
        boolean contratEnCours = contratsRepo != null && contratsRepo.existsByAnnonceIdAndEtatIn(
            id, List.of(sn.immosenegal.reservation.EtatContratLocation.ACTIF,
                sn.immosenegal.reservation.EtatContratLocation.RESILIATION_DEMANDEE,
                sn.immosenegal.reservation.EtatContratLocation.RESILIATION_PLANIFIEE));
        if (reservationEnCours || contratEnCours) {
            throw new ApiException(HttpStatus.CONFLICT,
                "Cette annonce a une réservation ou un contrat en cours : suppression définitive impossible, vous pouvez seulement la retirer.");
        }
        annonces.delete(annonce);
        boolean parAdminSurAutrui = !annonce.getProprietaire().getId().equals(auteur.id());
        audit.enregistrer(parAdminSurAutrui ? "ANNONCE_SUPPRIMEE_PAR_ADMIN" : "ANNONCE_SUPPRIMEE", auteur.id(), "Annonce " + id);
    }

    public record AnnonceARattacher(UUID id, String titre, String ville, String quartier, StatutAnnonce statut,
            UUID proprietaireId, String proprietaireNom, String proprietaireEmail, Role proprietaireRole,
            boolean publieeParAgence, boolean exemple, int nombrePhotos) {}

    /** Liste en lecture seule les annonces existantes susceptibles d'appartenir à l'agence ImmoSénégal avant toute migration. */
    @Transactional(readOnly = true)
    public List<AnnonceARattacher> listerAnnoncesARattacherAgence(AuthenticatedUser admin) {
        exigerAdmin(admin);
        List<Annonce> candidates = annonces.findAll().stream()
            .filter(a -> !estBienImmoSenegal(a))
            .filter(a -> a.getAgence() == null)
            .filter(a -> a.isExemple()
                || a.getProprietaire().getRole() != Role.PROPRIETAIRE
                || a.getProprietaire().getEmail().equalsIgnoreCase(AnnoncesExemple.EMAIL_PROPRIETAIRE)
                || a.getProprietaire().getNomComplet().toLowerCase(Locale.ROOT).contains("immosénégal"))
            .toList();
        Map<UUID, List<UUID>> photosParAnnonce = photosDe(candidates.stream().map(Annonce::getId).toList());
        return candidates.stream().map(a -> new AnnonceARattacher(
            a.getId(), a.getTitre(), a.getVille(), a.getQuartier(), a.getStatut(),
            a.getProprietaire().getId(), a.getProprietaire().getNomComplet(), a.getProprietaire().getEmail(),
            a.getProprietaire().getRole(), a.isPublieeParAgence(), a.isExemple(),
            photosParAnnonce.getOrDefault(a.getId(), List.of()).size()
        )).toList();
    }

    /**
     * Détail d'une annonce. Une annonce qui n'est pas PUBLIEE n'existe pas pour le public (404) :
     * seuls son propriétaire et les administrateurs peuvent la lire.
     */
    @Transactional
    public AnnonceResponse obtenir(UUID id, AuthenticatedUser lecteur) {
        Annonce annonce = trouver(id);
        boolean gestionnaire = lecteur != null
            && (lecteur.role() == Role.ADMIN
                || annonce.getProprietaire().getId().equals(lecteur.id())
                || estMembrePublicationAnnonce(annonce, lecteur.id()));
        if (annonce.getStatut() != StatutAnnonce.PUBLIEE && !gestionnaire) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Annonce introuvable.");
        }
        if (annonce.getStatut() == StatutAnnonce.PUBLIEE && !gestionnaire) {
            annonce.incrementerVues();
        }
        List<UUID> photosAnnonce = photosDe(List.of(id)).getOrDefault(id, List.of());
        AnnonceResponse.GestionnaireInfo gestionnaireInfo = gestionnairesDe(List.of(id)).get(id);
        if (gestionnaire) {
            return AnnonceResponse.pourGestion(annonce, photosAnnonce, gestionnaireInfo);
        }
        return lecteur == null
            ? AnnonceResponse.pourVisiteur(annonce, photosAnnonce, gestionnaireInfo)
            : AnnonceResponse.de(annonce, photosAnnonce, gestionnaireInfo);
    }

    /** Catalogue : uniquement les annonces PUBLIEE, quels que soient les critères reçus. */
    @Transactional(readOnly = true)
    public PageResponse<AnnonceResponse> rechercher(CriteresRecherche criteres, Integer page, Integer taille, String tri) {
        return rechercher(criteres, page, taille, tri, null);
    }

    /** Catalogue : masque adresse et GPS aux visiteurs non connectés. */
    @Transactional(readOnly = true)
    public PageResponse<AnnonceResponse> rechercher(CriteresRecherche criteres, Integer page, Integer taille, String tri,
                                                    AuthenticatedUser lecteur) {
        CriteresRecherche publics = criteres.avecStatut(StatutAnnonce.PUBLIEE);
        return enPage(annonces.findAll(AnnonceSpecifications.depuis(publics), pageable(page, taille, trier(tri))),
            false, lecteur == null);
    }

    @Transactional(readOnly = true)
    public PageResponse<AnnonceResponse> mesAnnonces(AuthenticatedUser utilisateur, Integer page, Integer taille) {
        return enPage(annonces.findByProprietaireId(utilisateur.id(), pageable(page, taille, trier("recent"))), true);
    }

    @Transactional(readOnly = true)
    public PageResponse<AnnonceResponse> annoncesAgence(UUID agenceId, AuthenticatedUser utilisateur, Integer page, Integer taille) {
        if (agences == null || membresAgence == null) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Service agence indisponible.");
        }
        Agence agence = agences.findById(agenceId)
            .filter(a -> a.getStatut() == StatutAgence.ACTIVE)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Agence introuvable ou inactive."));
        boolean adminInterne = utilisateur.role() == Role.ADMIN
            && agence.getType() == sn.immosenegal.agence.AgenceType.INTERNE;
        if (!adminInterne) {
            boolean membreActif = membresAgence.findByAgenceIdAndUtilisateurId(agenceId, utilisateur.id())
                .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
                .isPresent();
            if (!membreActif) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Accès réservé aux membres actifs de cette agence.");
            }
        }
        return enPage(annonces.findByAgenceId(agenceId, pageable(page, taille, trier("recent"))), true);
    }

    public record AnnonceAgenceResume(
        UUID id, String titre, TypeBien typeBien, TypeTransaction transaction, long prix,
        String ville, String quartier, StatutAnnonce statut, boolean confie,
        String proprietaireNom, UUID photoPrincipaleId, UUID agentMembreId, String agentNom, Instant creeLe) {}

    /** Liste complète des biens d'une agence (propres + confiés sous mandat accepté) avec recherche et filtres. */
    @Transactional(readOnly = true)
    public List<AnnonceAgenceResume> annoncesCompletesAgence(
            UUID agenceId, AuthenticatedUser utilisateur, String q, String statut, String origine) {
        if (agences == null || membresAgence == null) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Service agence indisponible.");
        }
        Agence agence = agences.findById(agenceId)
            .filter(a -> a.getStatut() == StatutAgence.ACTIVE)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Agence introuvable ou inactive."));
        boolean adminInterne = utilisateur.role() == Role.ADMIN
            && agence.getType() == sn.immosenegal.agence.AgenceType.INTERNE;
        if (!adminInterne) {
            boolean membreActif = membresAgence.findByAgenceIdAndUtilisateurId(agenceId, utilisateur.id())
                .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
                .isPresent();
            if (!membreActif) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Accès réservé aux membres actifs de cette agence.");
            }
        }
        java.util.LinkedHashMap<UUID, Annonce> uniques = new java.util.LinkedHashMap<>();
        java.util.Set<UUID> confiesIds = new java.util.HashSet<>();
        annonces.findAllByAgenceIdOrderByCreeLeDesc(agenceId).forEach(a -> uniques.put(a.getId(), a));
        if (mandats != null) {
            mandats.findAllByAgenceIdAndStatutOrderByCreeLeDesc(agenceId, StatutMandatGestion.ACCEPTE)
                .forEach(m -> {
                    uniques.putIfAbsent(m.getAnnonce().getId(), m.getAnnonce());
                    confiesIds.add(m.getAnnonce().getId());
                });
        }
        List<UUID> ids = List.copyOf(uniques.keySet());
        Map<UUID, List<UUID>> parAnnonce = photosDe(ids);
        Map<UUID, String> nomsMembres = membresAgence.findAllByAgenceIdAndStatut(agenceId, StatutMembreAgence.ACTIF)
            .stream().collect(Collectors.toMap(MembreAgence::getId, m -> m.getUtilisateur().getNomComplet(), (a, b) -> a));

        String recherche = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        String filtreStatut = statut == null ? "" : statut.trim().toUpperCase(Locale.ROOT);
        String filtreOrigine = origine == null ? "" : origine.trim().toUpperCase(Locale.ROOT);

        return uniques.values().stream()
            .filter(a -> recherche.isEmpty()
                || a.getTitre().toLowerCase(Locale.ROOT).contains(recherche)
                || a.getQuartier().toLowerCase(Locale.ROOT).contains(recherche)
                || a.getVille().toLowerCase(Locale.ROOT).contains(recherche))
            .filter(a -> filtreStatut.isEmpty() || "TOUS".equals(filtreStatut) || a.getStatut().name().equals(filtreStatut))
            .filter(a -> {
                boolean estConfie = confiesIds.contains(a.getId());
                if ("PROPRE".equals(filtreOrigine)) return !estConfie;
                if ("CONFIE".equals(filtreOrigine)) return estConfie;
                return true;
            })
            .map(a -> {
                List<UUID> ph = parAnnonce.getOrDefault(a.getId(), List.of());
                UUID photoPrincipale = ph.isEmpty() ? null : ph.get(0);
                UUID agentId = a.getAgentMembreId();
                return new AnnonceAgenceResume(
                    a.getId(), a.getTitre(), a.getTypeBien(), a.getTypeTransaction(), a.getPrix(),
                    a.getVille(), a.getQuartier(), a.getStatut(), confiesIds.contains(a.getId()),
                    a.getProprietaire().getNomComplet(), photoPrincipale,
                    agentId, agentId == null ? null : nomsMembres.get(agentId), a.getCreeLe());
            })
            .toList();
    }

    /** Attribue un bien de l'agence (propre ou confié) à un agent ou gestionnaire actif. */
    @Transactional
    public AnnonceAgenceResume attribuerAgentAnnonce(UUID agenceId, UUID annonceId, UUID membreId, AuthenticatedUser acteur) {
        if (agences == null || membresAgence == null) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Service agence indisponible.");
        }
        Agence agence = agences.findById(agenceId)
            .filter(a -> a.getStatut() == StatutAgence.ACTIVE)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Agence introuvable ou inactive."));
        boolean adminInterne = acteur.role() == Role.ADMIN
            && agence.getType() == sn.immosenegal.agence.AgenceType.INTERNE;
        boolean responsable = membresAgence.findByAgenceIdAndUtilisateurId(agenceId, acteur.id())
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE)
            .isPresent();
        if (!adminInterne && !responsable) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Seul le responsable de l'agence peut attribuer un bien.");
        }
        Annonce annonce = trouver(annonceId);
        boolean appartientAgence = (annonce.getAgence() != null && annonce.getAgence().getId().equals(agenceId))
            || (mandats != null && mandats.existsByAgenceIdAndAnnonceIdAndStatut(agenceId, annonceId, StatutMandatGestion.ACCEPTE));
        if (!appartientAgence) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Ce bien n'appartient pas au portefeuille de cette agence.");
        }
        MembreAgence collaborateur = null;
        if (membreId != null) {
            collaborateur = membresAgence.findById(membreId)
                .filter(m -> m.getAgence().getId().equals(agenceId))
                .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
                .filter(m -> m.getFonction() == FonctionAgence.AGENT
                    || m.getFonction() == FonctionAgence.GESTIONNAIRE
                    || m.getFonction() == FonctionAgence.CAISSIER
                    || m.getFonction() == FonctionAgence.ASSISTANT_ADMINISTRATIF)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
                    "Choisissez un collaborateur actif (agent, gestionnaire, caissier ou assistant) de cette agence."));
        }
        annonce.setAgentMembreId(collaborateur == null ? null : collaborateur.getId());
        if (collaborateur != null && notifications != null) {
            notifications.creer(collaborateur.getUtilisateur(), "BIEN_ATTRIBUE_AGENCE",
                "Nouveau bien attribué",
                "Le bien « " + annonce.getTitre() + " » vous a été attribué.",
                "/mes-agences/" + agenceId + "/espace");
        }
        List<UUID> ph = photosDe(List.of(annonceId)).getOrDefault(annonceId, List.of());
        boolean confie = mandats != null && mandats.existsByAgenceIdAndAnnonceIdAndStatut(agenceId, annonceId, StatutMandatGestion.ACCEPTE);
        return new AnnonceAgenceResume(
            annonce.getId(), annonce.getTitre(), annonce.getTypeBien(), annonce.getTypeTransaction(), annonce.getPrix(),
            annonce.getVille(), annonce.getQuartier(), annonce.getStatut(), confie,
            annonce.getProprietaire().getNomComplet(), ph.isEmpty() ? null : ph.get(0),
            collaborateur == null ? null : collaborateur.getId(),
            collaborateur == null ? null : collaborateur.getUtilisateur().getNomComplet(),
            annonce.getCreeLe());
    }

    /** Annonces publiques d'une agence (biens propres publiés + biens confiés sous mandat accepté). */
    @Transactional(readOnly = true)
    public List<AnnonceResponse> annoncesPubliquesAgence(UUID agenceId) {
        java.util.LinkedHashMap<UUID, Annonce> uniques = new java.util.LinkedHashMap<>();
        annonces.findAllByAgenceIdAndStatutOrderByCreeLeDesc(agenceId, StatutAnnonce.PUBLIEE)
            .forEach(a -> uniques.put(a.getId(), a));
        if (mandats != null) {
            mandats.findAllByAgenceIdAndStatutOrderByCreeLeDesc(agenceId, StatutMandatGestion.ACCEPTE).stream()
                .map(MandatGestion::getAnnonce)
                .filter(a -> a.getStatut() == StatutAnnonce.PUBLIEE)
                .forEach(a -> uniques.putIfAbsent(a.getId(), a));
        }
        List<Annonce> liste = List.copyOf(uniques.values());
        List<UUID> ids = liste.stream().map(Annonce::getId).toList();
        Map<UUID, List<UUID>> parAnnonce = photosDe(ids);
        Map<UUID, AnnonceResponse.GestionnaireInfo> gestionnairesParAnnonce = gestionnairesDe(ids);
        return liste.stream()
            .map(a -> AnnonceResponse.pourVisiteur(a, parAnnonce.getOrDefault(a.getId(), List.of()), gestionnairesParAnnonce.get(a.getId())))
            .toList();
    }

    // ---------- Modération (administrateurs) ----------

    /** File de modération : par défaut les annonces EN_ATTENTE, les plus anciennes d'abord. */
    @Transactional(readOnly = true)
    public PageResponse<AnnonceResponse> listerPourModeration(AuthenticatedUser admin, StatutAnnonce statut,
                                                              Integer page, Integer taille) {
        exigerAdmin(admin);
        CriteresRecherche criteres = new CriteresRecherche(null, null, null, null, null, null, null, null, null, null,
            statut == null ? StatutAnnonce.EN_ATTENTE : statut, null);
        Sort plusAnciennesDabord = Sort.by(Sort.Direction.ASC, "creeLe").and(Sort.by("id"));
        return enPage(annonces.findAll(AnnonceSpecifications.depuis(criteres), pageable(page, taille, plusAnciennesDabord)), true);
    }

    /** Applique une décision de modération (validation, refus, suspension, demande de correction). */
    @Transactional
    public AnnonceResponse modifierParAdmin(UUID id, AnnonceRequest requete, String motif, AuthenticatedUser admin) {
        exigerAdmin(admin);
        String motifPropre = motif == null ? "" : motif.trim();
        if (motifPropre.isEmpty() || motifPropre.length() > 500) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Un motif de 1 à 500 caractères est obligatoire.");
        }
        Annonce annonce = trouver(id);
        appliquer(annonce, requete);
        audit.enregistrer("ANNONCE_MODIFIEE_PAR_ADMIN", admin.id(),
            "Annonce " + id + " ; motif : " + motifPropre);
        if (notifications != null) {
            notifications.creer(annonce.getProprietaire(), "ANNONCE_MODIFIEE_PAR_ADMIN",
                "Votre annonce a été modifiée par l'administration",
                "L'administration a modifié « " + annonce.getTitre() + " ». Motif : " + motifPropre,
                "/mes-annonces");
        }
        return AnnonceResponse.pourGestion(annonce, photosDe(List.of(id)).getOrDefault(id, List.of()));
    }

    /** Archivage réversible : l'annonce est suspendue, jamais effacée physiquement. */
    @Transactional
    public AnnonceResponse archiverParAdmin(UUID id, String motif, AuthenticatedUser admin) {
        exigerAdmin(admin);
        String motifPropre = motif == null ? "" : motif.trim();
        if (motifPropre.isEmpty() || motifPropre.length() > 500) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Un motif de 1 à 500 caractères est obligatoire.");
        }
        Annonce annonce = trouver(id);
        StatutAnnonce avant = annonce.getStatut();
        annonce.moderer(StatutAnnonce.SUSPENDUE, admin.id(), motifPropre);
        audit.enregistrer("ANNONCE_ARCHIVEE_PAR_ADMIN", admin.id(),
            "Annonce " + id + " ; statut précédent : " + avant + " ; motif : " + motifPropre);
        if (notifications != null) {
            notifications.creer(annonce.getProprietaire(), "ANNONCE_ARCHIVEE_PAR_ADMIN",
                "Votre annonce a été suspendue par l'administration",
                "L'annonce « " + annonce.getTitre() + " » a été retirée du catalogue. Motif : " + motifPropre
                    + ". Vous pouvez contacter l'administration pour demander son rétablissement.",
                "/mes-annonces");
        }
        return AnnonceResponse.pourGestion(annonce, photosDe(List.of(id)).getOrDefault(id, List.of()));
    }

    @Transactional
    public AnnonceResponse moderer(UUID id, AuthenticatedUser admin, ActionModeration action, String motif) {
        exigerAdmin(admin);
        Annonce annonce = trouver(id);
        if (!action.depuis().contains(annonce.getStatut())) {
            throw new ApiException(HttpStatus.CONFLICT,
                "Action impossible : l'annonce est actuellement au statut " + annonce.getStatut() + ".");
        }
        if (action == ActionModeration.VALIDER && annonce.getDateFinPublication() != null
                && annonce.getDateFinPublication().isBefore(java.time.LocalDate.now())) {
            boolean abonnementActif = abonnements
                .findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(
                    annonce.getProprietaire().getId(), StatutAbonnement.ACTIF)
                .filter(a -> a.getDateFin() != null && !a.getDateFin().isBefore(java.time.LocalDate.now()))
                .isPresent();
            if (!abonnementActif) {
                throw new ApiException(HttpStatus.CONFLICT,
                    "La période de publication est terminée. Le propriétaire doit souscrire un abonnement ou faire accepter un mandat d'agence.");
            }
        }
        String motifPropre = motif == null || motif.isBlank() ? null : motif.trim();
        if (action.motifObligatoire() && motifPropre == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Un motif est obligatoire pour cette décision.");
        }
        StatutAnnonce avant = annonce.getStatut();
        annonce.moderer(action.vers(), admin.id(), motifPropre);
        audit.enregistrer(action.evenement(), admin.id(), "Annonce " + id + " : " + avant + " -> " + action.vers());
        if (notifications != null) {
            String motifNotification = motifPropre == null ? "" : " Motif : " + motifPropre;
            notifications.creer(annonce.getProprietaire(), action.evenement(),
                "Mise à jour administrative de votre annonce",
                "Le statut de « " + annonce.getTitre() + " » est passé de " + avant + " à " + action.vers() + "."
                    + motifNotification,
                "/mes-annonces");
        }
        return AnnonceResponse.pourGestion(annonce, photosDe(List.of(id)).getOrDefault(id, List.of()));
    }

    // ---------- Règles internes ----------

    /** Vérifie que l'utilisateur peut modifier cette annonce (propriétaire ou ADMIN) et la retourne. */
    Annonce annonceModifiable(UUID id, AuthenticatedUser utilisateur) {
        Annonce annonce = trouver(id);
        verifierDroits(annonce, utilisateur);
        return annonce;
    }

    /** Ajout de contenu : le propriétaire garde la main, sauf sur les annonces refusées ou suspendues. */
    Annonce annonceAvecAjoutDeContenu(UUID id, AuthenticatedUser utilisateur) {
        Annonce annonce = annonceModifiable(id, utilisateur);
        if (utilisateur.role() != Role.ADMIN) {
            verifierContenuModifiable(annonce.getStatut());
        }
        return annonce;
    }

    private void verifierContenuModifiable(StatutAnnonce statut) {
        if (statut == StatutAnnonce.REFUSEE) {
            throw new ApiException(HttpStatus.CONFLICT, "Une annonce refusée ne peut plus être modifiée : créez une nouvelle annonce.");
        }
        if (statut == StatutAnnonce.SUSPENDUE) {
            throw new ApiException(HttpStatus.CONFLICT, "Une annonce suspendue ne peut pas être modifiée : contactez l'administration.");
        }
    }

    private void exigerAdmin(AuthenticatedUser utilisateur) {
        if (utilisateur == null || utilisateur.role() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Réservé aux administrateurs.");
        }
    }

    private PageResponse<AnnonceResponse> enPage(Page<Annonce> page, boolean vueGestion) {
        return enPage(page, vueGestion, false);
    }

    private PageResponse<AnnonceResponse> enPage(Page<Annonce> page, boolean vueGestion, boolean visiteur) {
        List<UUID> ids = page.getContent().stream().map(Annonce::getId).toList();
        Map<UUID, List<UUID>> parAnnonce = photosDe(ids);
        Map<UUID, AnnonceResponse.GestionnaireInfo> gestionnairesParAnnonce = gestionnairesDe(ids);
        return PageResponse.de(page.map(a -> {
            List<UUID> ph = parAnnonce.getOrDefault(a.getId(), List.of());
            AnnonceResponse.GestionnaireInfo gi = gestionnairesParAnnonce.get(a.getId());
            if (vueGestion) return AnnonceResponse.pourGestion(a, ph, gi);
            return visiteur ? AnnonceResponse.pourVisiteur(a, ph, gi) : AnnonceResponse.de(a, ph, gi);
        }));
    }

    private Map<UUID, AnnonceResponse.GestionnaireInfo> gestionnairesDe(Collection<UUID> ids) {
        if (mandats == null || ids.isEmpty()) {
            return Map.of();
        }
        return mandats.findAllByAnnonceIdInAndStatutOrderByDecideLeDesc(ids, StatutMandatGestion.ACCEPTE).stream()
            .collect(Collectors.toMap(
                m -> m.getAnnonce().getId(),
                m -> new AnnonceResponse.GestionnaireInfo(
                    m.getAgence().getId(), m.getAgence().getNom(), m.getAgence().getSlug()),
                (premier, ignorer) -> premier));
    }

    /** Identifiants de photos par annonce, en une seule requête (sans charger les images). */
    private Map<UUID, List<UUID>> photosDe(Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return photos.referencesPour(ids).stream().collect(
            Collectors.groupingBy(PhotoRepository.Reference::getAnnonceId,
                Collectors.mapping(PhotoRepository.Reference::getId, Collectors.toList())));
    }

    private Annonce trouver(UUID id) {
        return annonces.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
    }

    /** Seul le propriétaire de l'annonce, un collaborateur actif de son agence diffuseuse, le responsable mandaté ou un ADMIN peut la modifier. */
    private void verifierDroits(Annonce annonce, AuthenticatedUser utilisateur) {
        boolean proprietaire = annonce.getProprietaire().getId().equals(utilisateur.id());
        if (!proprietaire && utilisateur.role() != Role.ADMIN
                && !estMembrePublicationAnnonce(annonce, utilisateur.id())
                && !estResponsableMandate(annonce.getId(), utilisateur.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cette annonce ne vous appartient pas.");
        }
    }

    private boolean estResponsableMandate(UUID annonceId, UUID utilisateurId) {
        return mandats != null && membresAgence != null
            && mandats.findFirstByAnnonceIdAndStatutOrderByDecideLeDesc(annonceId, StatutMandatGestion.ACCEPTE)
                .flatMap(m -> membresAgence.findByAgenceIdAndUtilisateurId(m.getAgence().getId(), utilisateurId))
                .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
                .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE)
                .isPresent();
    }

    private boolean estMembrePublicationAnnonce(Annonce annonce, UUID utilisateurId) {
        return annonce.getAgence() != null && estMembrePublicationAgence(annonce.getAgence().getId(), utilisateurId);
    }

    private boolean estMembrePublicationAgence(UUID agenceId, UUID utilisateurId) {
        if (membresAgence == null) return false;
        return membresAgence.findByAgenceIdAndUtilisateurId(agenceId, utilisateurId)
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .filter(m -> m.getFonction() == FonctionAgence.RESPONSABLE
                || m.getFonction() == FonctionAgence.GESTIONNAIRE
                || m.getFonction() == FonctionAgence.AGENT)
            .isPresent();
    }

    /** Vrai si la requête change au moins un champ de contenu (le statut n'en fait pas partie). */
    private static boolean contenuDifferent(Annonce a, AnnonceRequest r) {
        String description = r.description() == null || r.description().isBlank() ? null : r.description().trim();
        String adresse = r.adresse() == null || r.adresse().isBlank() ? null : r.adresse().trim();
        Integer pieces = r.typeBien() == TypeBien.TERRAIN ? null : r.pieces();
        return !Objects.equals(a.getTitre(), r.titre().trim())
            || !Objects.equals(a.getDescription(), description)
            || a.getTypeBien() != r.typeBien()
            || a.getTypeTransaction() != r.transaction()
            || a.getPrix() != r.prix().longValue()
            || !memeNombre(a.getSuperficie(), r.superficie())
            || !Objects.equals(a.getPieces(), pieces)
            || !Objects.equals(a.getQuartier(), r.quartier().trim())
            || !Objects.equals(a.getVille(), r.ville().trim())
            || !Objects.equals(a.getAdresse(), adresse)
            || !memeNombre(a.getLatitude(), r.latitude())
            || !memeNombre(a.getLongitude(), r.longitude())
            || !new HashSet<>(a.getEquipements()).equals(normaliser(r.equipements()));
    }

    private static boolean memeNombre(BigDecimal a, BigDecimal b) {
        return a == null ? b == null : b != null && a.compareTo(b) == 0;
    }

    private void appliquer(Annonce annonce, AnnonceRequest r) {
        if ((r.latitude() == null) != (r.longitude() == null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La latitude et la longitude doivent être renseignées ensemble.");
        }
        annonce.setTitre(r.titre().trim());
        annonce.setDescription(r.description() == null || r.description().isBlank() ? null : r.description().trim());
        annonce.setTypeBien(r.typeBien());
        annonce.setTypeTransaction(r.transaction());
        annonce.setPrix(r.prix());
        annonce.setSuperficie(r.superficie());
        // Un terrain n'a pas de pièces.
        annonce.setPieces(r.typeBien() == TypeBien.TERRAIN ? null : r.pieces());
        annonce.setChambres(r.typeBien() == TypeBien.TERRAIN ? null : r.chambres());
        annonce.setSallesDeBain(r.typeBien() == TypeBien.TERRAIN ? null : r.sallesDeBain());
        annonce.setQuartier(r.quartier().trim());
        annonce.setVille(r.ville().trim());
        annonce.setAdresse(r.adresse() == null || r.adresse().isBlank() ? null : r.adresse().trim());
        annonce.setLatitude(r.latitude());
        annonce.setLongitude(r.longitude());
        annonce.remplacerEquipements(normaliser(r.equipements()));
        annonce.setModifieLe(Instant.now());
    }

    private static Set<String> normaliser(Set<String> equipements) {
        Set<String> resultat = new HashSet<>();
        if (equipements != null) {
            for (String e : equipements) {
                String propre = e.trim().toLowerCase(Locale.ROOT);
                if (!propre.isEmpty()) {
                    resultat.add(propre);
                }
            }
        }
        return resultat;
    }

    private static Pageable pageable(Integer page, Integer taille, Sort tri) {
        int p = page == null ? 0 : Math.max(0, page);
        int t = taille == null ? TAILLE_PAR_DEFAUT : Math.min(TAILLE_MAX, Math.max(1, taille));
        return PageRequest.of(p, t, tri);
    }

    /** Tri en liste blanche (jamais un nom de colonne fourni par l'utilisateur). Le tri par id rend la pagination stable. */
    private static Sort trier(String tri) {
        Sort base = switch (tri == null || tri.isBlank() ? "recent" : tri) {
            case "recent" -> Sort.by(Sort.Direction.DESC, "creeLe");
            case "prix_asc" -> Sort.by(Sort.Direction.ASC, "prix");
            case "prix_desc" -> Sort.by(Sort.Direction.DESC, "prix");
            case "superficie_desc" -> Sort.by(Sort.Direction.DESC, "superficie");
            default -> throw new ApiException(HttpStatus.BAD_REQUEST,
                "Tri inconnu. Valeurs possibles : recent, prix_asc, prix_desc, superficie_desc.");
        };
        return base.and(Sort.by("id"));
    }
}
