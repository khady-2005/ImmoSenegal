package sn.immosenegal.admin;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sn.immosenegal.audit.AuditService;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.config.OpenApiConfig;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

/** Gestion des comptes inscrits. Toutes les routes sont protégées par /api/admin/**. */
@RestController
@RequestMapping("/api/admin/users")
@Tag(name = "Administration", description = "Gestion des comptes")
@SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER)
public class AdminUsersController {
    private final UserRepository users;
    private final AuditService audit;

    public AdminUsersController(UserRepository users, AuditService audit) {
        this.users = users;
        this.audit = audit;
    }

    @GetMapping
    @Operation(summary = "Lister tous les comptes inscrits, y compris ceux qui ne se sont jamais reconnectés")
    public List<UtilisateurAdmin> lister() {
        return users.findAllByOrderByCreeLeDesc().stream().map(UtilisateurAdmin::de).toList();
    }

    @PatchMapping("/{id}/status")
    @Transactional
    @Operation(summary = "Activer ou suspendre un compte")
    public UtilisateurAdmin changerStatut(@PathVariable UUID id, @Valid @RequestBody ChangementStatut requete,
                                           @AuthenticationPrincipal AuthenticatedUser admin) {
        User cible = trouver(id);
        if (cible.getId().equals(admin.id())) {
            throw new ApiException(HttpStatus.CONFLICT, "Vous ne pouvez pas suspendre votre propre compte.");
        }
        if (!requete.actif() && cible.getRole() == Role.ADMIN
                && users.countByRoleAndActifTrue(Role.ADMIN) <= 1) {
            throw new ApiException(HttpStatus.CONFLICT, "Le dernier administrateur actif ne peut pas être suspendu.");
        }
        cible.setActif(requete.actif());
        users.save(cible);
        audit.enregistrer("STATUT_COMPTE", admin.id(),
            "Compte " + cible.getId() + " : " + (requete.actif() ? "activé" : "suspendu"));
        return UtilisateurAdmin.de(cible);
    }

    @PatchMapping("/{id}/role")
    @Transactional
    @Operation(summary = "Modifier le rôle d'un compte sans créer un nouvel administrateur")
    public UtilisateurAdmin changerRole(@PathVariable UUID id, @Valid @RequestBody ChangementRole requete,
                                         @AuthenticationPrincipal AuthenticatedUser admin) {
        User cible = trouver(id);
        if (cible.getRole() == Role.ADMIN || requete.role() == Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                "La gestion du rôle ADMIN doit être faite directement en base par un responsable technique.");
        }
        cible.setRole(requete.role());
        users.save(cible);
        audit.enregistrer("ROLE_COMPTE", admin.id(), "Compte " + cible.getId() + " : rôle " + requete.role());
        return UtilisateurAdmin.de(cible);
    }

    private User trouver(UUID id) {
        return users.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Compte introuvable."));
    }

    public record ChangementStatut(@NotNull Boolean actif) {}
    public record ChangementRole(@NotNull Role role) {}
    public record UtilisateurAdmin(UUID id, String email, String nomComplet, String telephone,
                                   Role role, boolean actif, Instant creeLe) {
        static UtilisateurAdmin de(User u) {
            return new UtilisateurAdmin(u.getId(), u.getEmail(), u.getNomComplet(), u.getTelephone(),
                u.getRole(), u.isActif(), u.getCreeLe());
        }
    }
}
