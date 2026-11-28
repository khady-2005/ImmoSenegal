package sn.immosenegal.admin;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import sn.immosenegal.abonnement.AbonnementProprietaire;
import sn.immosenegal.abonnement.AbonnementProprietaireRepository;
import sn.immosenegal.abonnement.StatutAbonnement;
import sn.immosenegal.agence.AgenceRepository;
import sn.immosenegal.agence.StatutAgence;
import sn.immosenegal.annonce.AnnonceRepository;
import sn.immosenegal.annonce.StatutAnnonce;
import sn.immosenegal.audit.AuditService;
import sn.immosenegal.config.OpenApiConfig;
import sn.immosenegal.reservation.PaiementLoyer;
import sn.immosenegal.reservation.PaiementLoyerRepository;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.signalement.Signalement;
import sn.immosenegal.signalement.SignalementRepository;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.UserRepository;

/** Toutes les routes /api/admin/** exigent le rôle ADMIN (règle dans SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
@Tag(name = "Administration", description = "Réservé au rôle ADMIN")
@SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER)
public class AdminController {

    private final DemandeRoleService service;
    private final UserRepository users;
    private final AnnonceRepository annonces;
    private final AgenceRepository agences;
    private final AbonnementProprietaireRepository abonnements;
    private final SignalementRepository signalements;
    private final AuditService audit;
    private final ParametrePlateformeRepository parametres;
    private final PaiementLoyerRepository paiements;

    @Autowired
    public AdminController(DemandeRoleService service, UserRepository users,
                           AnnonceRepository annonces, AgenceRepository agences,
                           AbonnementProprietaireRepository abonnements,
                           SignalementRepository signalements, AuditService audit,
                           ParametrePlateformeRepository parametres,
                           PaiementLoyerRepository paiements) {
        this.service = service;
        this.users = users;
        this.annonces = annonces;
        this.agences = agences;
        this.abonnements = abonnements;
        this.signalements = signalements;
        this.audit = audit;
        this.parametres = parametres;
        this.paiements = paiements;
    }

    public AdminController(DemandeRoleService service, UserRepository users,
                           AnnonceRepository annonces, AgenceRepository agences,
                           AbonnementProprietaireRepository abonnements,
                           SignalementRepository signalements, AuditService audit) {
        this(service, users, annonces, agences, abonnements, signalements, audit, null, null);
    }

    public AdminController(DemandeRoleService service) {
        this(service, null, null, null, null, null, null, null, null);
    }

    @GetMapping("/audit")
    @Operation(summary = "Journal des activités importantes (administrateur)")
    public List<AuditService.AuditEvenement> auditRecents(@RequestParam(defaultValue = "100") int limite) {
        return audit == null ? List.of() : audit.listerRecents(limite);
    }

    @GetMapping("/statistiques")
    @Operation(summary = "Statistiques globales de la plateforme (administrateur)")
    public StatistiquesAdmin statistiques() {
        long totalUsers = users == null ? 0 : users.count();
        long clients = users == null ? 0 : users.countByRoleAndActifTrue(Role.CLIENT);
        long proprietaires = users == null ? 0 : users.countByRoleAndActifTrue(Role.PROPRIETAIRE);
        long totalAnnonces = annonces == null ? 0 : annonces.count();
        long annoncesPubliees = annonces == null ? 0 : annonces.findAll().stream()
            .filter(a -> a.getStatut() == StatutAnnonce.PUBLIEE).count();
        long agencesActives = agences == null ? 0 : agences.findAllByStatutOrderByNomAsc(StatutAgence.ACTIVE).size();
        long agencesEnAttente = agences == null ? 0 : agences.findAllByStatutOrderByNomAsc(StatutAgence.EN_ATTENTE).size();
        long abonnementsEnAttente = abonnements == null ? 0 : abonnements.findAllByStatutOrderByCreeLeAsc(StatutAbonnement.EN_ATTENTE).size();
        long demandesRoleEnAttente = service.lister(StatutDemande.EN_ATTENTE).size();
        long signalementsOuverts = signalements == null ? 0 : signalements.findAll().stream()
            .filter(s -> s.getStatut() == Signalement.StatutSignalement.OUVERT || s.getStatut() == Signalement.StatutSignalement.EN_COURS).count();
        return new StatistiquesAdmin(totalUsers, clients, proprietaires, totalAnnonces, annoncesPubliees,
            agencesActives, agencesEnAttente, abonnementsEnAttente, demandesRoleEnAttente, signalementsOuverts);
    }

    public record StatistiquesAdmin(
        long utilisateursTotal, long clientsActifs, long proprietairesActifs,
        long annoncesTotal, long annoncesPubliees,
        long agencesActives, long agencesEnAttente,
        long abonnementsEnAttente, long demandesRoleEnAttente, long signalementsOuverts) {}

    @GetMapping("/role-requests")
    @Operation(summary = "Lister les demandes de rôle (filtre optionnel par statut)")
    public List<DemandeRoleResponse> lister(@RequestParam(required = false) StatutDemande statut) {
        return service.lister(statut);
    }

    @PostMapping("/role-requests/{id}/approve")
    @Operation(summary = "Approuver une demande : l'utilisateur obtient le rôle demandé")
    public DemandeRoleResponse approuver(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.approuver(id, admin, null);
    }

    @PostMapping("/role-requests/{id}/reject")
    @Operation(summary = "Refuser une demande")
    public DemandeRoleResponse refuser(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser admin) {
        return service.refuser(id, admin, null);
    }

    @GetMapping("/parametres")
    @Operation(summary = "Lister les paramètres de la plateforme (administrateur)")
    public List<ParametrePlateforme> listerParametres() {
        return parametres == null ? List.of() : parametres.findAllByOrderByCleAsc();
    }

    public record MajParametre(String valeur) {}

    @PutMapping("/parametres/{cle}")
    @Operation(summary = "Modifier un paramètre de la plateforme (administrateur)")
    public ParametrePlateforme modifierParametre(@PathVariable String cle, @RequestBody MajParametre body,
                                                 @AuthenticationPrincipal AuthenticatedUser admin) {
        if (parametres == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Paramètres indisponibles.");
        }
        if (body == null || body.valeur() == null || body.valeur().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La valeur est obligatoire.");
        }
        ParametrePlateforme param = parametres.findById(cle)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paramètre introuvable."));
        param.setValeur(body.valeur().trim());
        ParametrePlateforme sauvegarde = parametres.save(param);
        if (audit != null) {
            audit.enregistrer("PARAMETRE_MODIFIE", admin.id(), cle + " = " + sauvegarde.getValeur());
        }
        return sauvegarde;
    }

    public record AbonnementAdminResume(
        UUID id, UUID proprietaireId, String proprietaireNom, String proprietaireEmail, String forfait,
        java.math.BigDecimal montant, String statut, String modePaiement, String referencePaiement,
        java.time.LocalDate dateDebut, java.time.LocalDate dateFin, java.time.Instant creeLe) {}

    @GetMapping("/abonnements")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @Operation(summary = "Lister tous les abonnements (administrateur)")
    public List<AbonnementAdminResume> listerAbonnements(@RequestParam(required = false) StatutAbonnement statut) {
        if (abonnements == null) return List.of();
        List<AbonnementProprietaire> liste = statut == null
            ? abonnements.findAll().stream().sorted((a, b) -> b.getCreeLe().compareTo(a.getCreeLe())).toList()
            : abonnements.findAllByStatutOrderByCreeLeAsc(statut);
        return liste.stream().map(a -> {
            var proprio = users == null ? null : users.findById(a.getProprietaireId()).orElse(null);
            return new AbonnementAdminResume(
                a.getId(), a.getProprietaireId(),
                proprio == null ? "—" : proprio.getNomComplet(),
                proprio == null ? "—" : proprio.getEmail(),
                a.getForfait().name(), a.getMontant(), a.getStatut().name(),
                a.getModePaiement(), a.getReferencePaiement(), a.getDateDebut(), a.getDateFin(), a.getCreeLe());
        }).toList();
    }

    public record PaiementAdminResume(
        UUID id, UUID contratId, String annonceTitre, String locataireNom,
        java.math.BigDecimal montant, java.time.LocalDate periode, java.time.LocalDate datePaiement,
        String modePaiement, String beneficiaireType, String beneficiaireNom,
        String statutConfirmation, String codeVerification) {}

    @GetMapping("/paiements")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @Operation(summary = "Superviser tous les paiements de loyers (administrateur)")
    public List<PaiementAdminResume> listerPaiements() {
        if (paiements == null) return List.of();
        return paiements.findAll().stream()
            .sorted((a, b) -> b.getDatePaiement().compareTo(a.getDatePaiement()))
            .limit(200)
            .map((PaiementLoyer p) -> new PaiementAdminResume(
                p.getId(), p.getContrat().getId(), p.getContrat().getAnnonce().getTitre(),
                p.getEnregistrePar().getNomComplet(), p.getMontant(), p.getPeriode(),
                p.getDatePaiement(), p.getModePaiement(), p.getBeneficiaireType(),
                p.getBeneficiaireNom(), p.getStatutConfirmation(), p.getCodeVerification()
            )).toList();
    }
}
