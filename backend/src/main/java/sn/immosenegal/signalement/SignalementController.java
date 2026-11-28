package sn.immosenegal.signalement;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@RestController
@Transactional
public class SignalementController {

    private final SignalementRepository repo;
    private final UserRepository users;
    private final NotificationService notifications;

    public SignalementController(SignalementRepository repo, UserRepository users, NotificationService notifications) {
        this.repo = repo;
        this.users = users;
        this.notifications = notifications;
    }

    @PostMapping("/api/signalements")
    @ResponseStatus(HttpStatus.CREATED)
    public SignalementResume creer(@Valid @RequestBody CreerSignalementRequest req,
                                     @AuthenticationPrincipal AuthenticatedUser acteur) {
        User auteur = users.findById(acteur.id())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        Signalement s = repo.save(new Signalement(
            auteur, req.annonceId(), req.type(), req.objet().trim(), req.description().trim()));
        return versResume(s);
    }

    @GetMapping("/api/signalements/mes-signalements")
    @Transactional(readOnly = true)
    public List<SignalementResume> mesSignalements(@AuthenticationPrincipal AuthenticatedUser acteur) {
        return repo.findAllByAuteurIdOrderByCreeLeDesc(acteur.id()).stream().map(this::versResume).toList();
    }

    @GetMapping("/api/admin/signalements")
    @Transactional(readOnly = true)
    public List<SignalementResume> listerAdmin(@AuthenticationPrincipal AuthenticatedUser admin) {
        if (admin.role() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé à l'administrateur.");
        }
        return repo.findAllByOrderByCreeLeDesc().stream().map(this::versResume).toList();
    }

    @PatchMapping("/api/admin/signalements/{id}")
    public SignalementResume traiterAdmin(@PathVariable UUID id,
                                          @Valid @RequestBody TraiterSignalementRequest req,
                                          @AuthenticationPrincipal AuthenticatedUser admin) {
        if (admin.role() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé à l'administrateur.");
        }
        Signalement s = repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Signalement introuvable."));
        String reponse = req.reponseAdmin() == null || req.reponseAdmin().isBlank() ? null : req.reponseAdmin().trim();
        s.traiter(req.statut(), reponse, admin.id());
        notifications.creer(s.getAuteur(), "RECLAMATION_TRAITEE",
            "Mise à jour de votre signalement / réclamation",
            "Votre dossier « " + s.getObjet() + " » est désormais au statut " + req.statut().name()
                + (reponse != null ? " : " + reponse : "."),
            "/mes-signalements");
        return versResume(s);
    }

    private SignalementResume versResume(Signalement s) {
        return new SignalementResume(s.getId(), s.getAuteur().getId(), s.getAuteur().getNomComplet(),
            s.getAnnonceId(), s.getType().name(), s.getObjet(), s.getDescription(),
            s.getStatut().name(), s.getReponseAdmin(), s.getTraiteLe(), s.getCreeLe());
    }

    public record CreerSignalementRequest(
        UUID annonceId,
        @NotNull Signalement.TypeSignalement type,
        @NotBlank @Size(max = 150) String objet,
        @NotBlank @Size(max = 2000) String description) {}

    public record TraiterSignalementRequest(
        @NotNull Signalement.StatutSignalement statut,
        @Size(max = 1000) String reponseAdmin) {}

    public record SignalementResume(
        UUID id, UUID auteurId, String auteurNom, UUID annonceId, String type,
        String objet, String description, String statut, String reponseAdmin,
        Instant traiteLe, Instant creeLe) {}
}
