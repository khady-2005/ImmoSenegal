package sn.immosenegal.admin;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import sn.immosenegal.abonnement.AbonnementProprietaireRepository;
import sn.immosenegal.abonnement.StatutAbonnement;
import sn.immosenegal.agence.AgenceRepository;
import sn.immosenegal.agence.StatutAgence;
import sn.immosenegal.annonce.AnnonceRepository;
import sn.immosenegal.annonce.StatutAnnonce;
import sn.immosenegal.audit.AuditService;
import sn.immosenegal.config.OpenApiConfig;
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

    @Autowired
    public AdminController(DemandeRoleService service, UserRepository users,
                           AnnonceRepository annonces, AgenceRepository agences,
                           AbonnementProprietaireRepository abonnements,
                           SignalementRepository signalements, AuditService audit) {
        this.service = service;
        this.users = users;
        this.annonces = annonces;
        this.agences = agences;
        this.abonnements = abonnements;
        this.signalements = signalements;
        this.audit = audit;
    }

    public AdminController(DemandeRoleService service) {
        this(service, null, null, null, null, null, null);
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
}
