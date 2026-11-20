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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sn.immosenegal.audit.AuditService;
import sn.immosenegal.abonnement.AbonnementProprietaireRepository;
import sn.immosenegal.abonnement.StatutAbonnement;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

/**
 * Règles des annonces.
 * <ul>
 *   <li>Tout propriétaire publie immédiatement ; sans abonnement actif, une période gratuite de 30 jours est appliquée. À son terme, l'annonce est suspendue jusqu'à un abonnement ou un mandat accepté.</li>
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

    public AnnonceService(AnnonceRepository annonces, UserRepository users, AuditService audit, PhotoRepository photos,
            AbonnementProprietaireRepository abonnements) {
        this.annonces = annonces;
        this.users = users;
        this.audit = audit;
        this.photos = photos;
        this.abonnements = abonnements;
    }

    @Transactional
    public AnnonceResponse creer(AuthenticatedUser auteur, AnnonceRequest requete) {
        return creer(auteur, requete, null);
    }

    @Transactional
    public AnnonceResponse creer(AuthenticatedUser auteur, AnnonceRequest requete, UUID proprietaireId) {
        if (!ROLES_PUBLICATION.contains(auteur.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Seuls les propriétaires et les administrateurs peuvent publier une annonce.");
        }
        User proprietaire;
        if (auteur.role() == Role.ADMIN) {
            if (proprietaireId == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Choisissez le propriétaire auquel rattacher cette annonce.");
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
        // La date sert de limite de couverture : 30 jours gratuits, ou date de fin du forfait actif.
        annonce.setDateFinPublication(abonnementActif
            .map(a -> a.getDateFin())
            .orElseGet(() -> java.time.LocalDate.now().plusDays(30)));
        annonces.save(annonce);
        audit.enregistrer("ANNONCE_CREEE", auteur.id(), annonce.getDateFinPublication() == null
            ? "Annonce " + annonce.getId() + " publiée avec un abonnement ou par administration"
            : "Annonce " + annonce.getId() + " couverte jusqu'au " + annonce.getDateFinPublication());
        return AnnonceResponse.pourGestion(annonce, List.of());
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
    public AnnonceResponse modifier(UUID id, AuthenticatedUser auteur, AnnonceRequest requete) {
        Annonce annonce = trouver(id);
        verifierDroits(annonce, auteur);
        boolean admin = auteur.role() == Role.ADMIN;
        StatutAnnonce avant = annonce.getStatut();
        StatutAnnonce demande = requete.statut();
        boolean changeLeStatut = demande != null && demande != avant;
        boolean changeLeContenu = contenuDifferent(annonce, requete);

        if (changeLeStatut) {
            // Seuls les statuts commerciaux se choisissent ici ; EN_ATTENTE, PUBLIEE (après validation), A_CORRIGER,
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
        annonces.delete(annonce);
        boolean parAdminSurAutrui = !annonce.getProprietaire().getId().equals(auteur.id());
        audit.enregistrer(parAdminSurAutrui ? "ANNONCE_SUPPRIMEE_PAR_ADMIN" : "ANNONCE_SUPPRIMEE", auteur.id(), "Annonce " + id);
    }

    /**
     * Détail d'une annonce. Une annonce qui n'est pas PUBLIEE n'existe pas pour le public (404) :
     * seuls son propriétaire et les administrateurs peuvent la lire.
     */
    @Transactional(readOnly = true)
    public AnnonceResponse obtenir(UUID id, AuthenticatedUser lecteur) {
        Annonce annonce = trouver(id);
        boolean gestionnaire = lecteur != null
            && (lecteur.role() == Role.ADMIN || annonce.getProprietaire().getId().equals(lecteur.id()));
        if (annonce.getStatut() != StatutAnnonce.PUBLIEE && !gestionnaire) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Annonce introuvable.");
        }
        List<UUID> photosAnnonce = photosDe(List.of(id)).getOrDefault(id, List.of());
        return gestionnaire ? AnnonceResponse.pourGestion(annonce, photosAnnonce) : AnnonceResponse.de(annonce, photosAnnonce);
    }

    /** Catalogue : uniquement les annonces PUBLIEE, quels que soient les critères reçus. */
    @Transactional(readOnly = true)
    public PageResponse<AnnonceResponse> rechercher(CriteresRecherche criteres, Integer page, Integer taille, String tri) {
        CriteresRecherche publics = criteres.avecStatut(StatutAnnonce.PUBLIEE);
        return enPage(annonces.findAll(AnnonceSpecifications.depuis(publics), pageable(page, taille, trier(tri))), false);
    }

    @Transactional(readOnly = true)
    public PageResponse<AnnonceResponse> mesAnnonces(AuthenticatedUser utilisateur, Integer page, Integer taille) {
        return enPage(annonces.findByProprietaireId(utilisateur.id(), pageable(page, taille, trier("recent"))), true);
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
        Map<UUID, List<UUID>> parAnnonce = photosDe(page.getContent().stream().map(Annonce::getId).toList());
        return PageResponse.de(page.map(a -> vueGestion
            ? AnnonceResponse.pourGestion(a, parAnnonce.getOrDefault(a.getId(), List.of()))
            : AnnonceResponse.de(a, parAnnonce.getOrDefault(a.getId(), List.of()))));
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

    /** Seul le propriétaire de l'annonce, ou un ADMIN (modération), peut la modifier ou la supprimer. */
    private void verifierDroits(Annonce annonce, AuthenticatedUser utilisateur) {
        boolean proprietaire = annonce.getProprietaire().getId().equals(utilisateur.id());
        if (!proprietaire && utilisateur.role() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cette annonce ne vous appartient pas.");
        }
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
