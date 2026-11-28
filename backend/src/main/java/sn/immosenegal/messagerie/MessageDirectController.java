package sn.immosenegal.messagerie;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import sn.immosenegal.agence.MembreAgenceRepository;
import sn.immosenegal.agence.StatutMembreAgence;
import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.annonce.AnnonceRepository;
import sn.immosenegal.annonce.StatutAnnonce;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@RestController
@RequestMapping("/api/messagerie/annonce/{annonceId}")
@Transactional
public class MessageDirectController {

    private final MessageDirectRepository repo;
    private final AnnonceRepository annonces;
    private final UserRepository users;
    private final MembreAgenceRepository membres;
    private final NotificationService notifications;

    public MessageDirectController(MessageDirectRepository repo, AnnonceRepository annonces,
                                   UserRepository users, MembreAgenceRepository membres,
                                   NotificationService notifications) {
        this.repo = repo;
        this.annonces = annonces;
        this.users = users;
        this.membres = membres;
        this.notifications = notifications;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<MessageResume> lister(@PathVariable UUID annonceId,
                                      @AuthenticationPrincipal AuthenticatedUser acteur) {
        Annonce annonce = annonces.findById(annonceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
        boolean gestionnaire = estGestionnaire(annonce, acteur);
        return repo.findAllByAnnonceIdOrderByCreeLeAsc(annonceId).stream()
            .filter(m -> gestionnaire || m.getExpediteur().getId().equals(acteur.id()))
            .map(m -> new MessageResume(m.getId(), m.getExpediteur().getId(),
                m.getExpediteur().getNomComplet(), m.getContenu(), m.getCreeLe()))
            .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResume envoyer(@PathVariable UUID annonceId,
                                 @Valid @RequestBody EnvoiRequest req,
                                 @AuthenticationPrincipal AuthenticatedUser acteur) {
        Annonce annonce = annonces.findById(annonceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
        if (annonce.getStatut() != StatutAnnonce.PUBLIEE && !estGestionnaire(annonce, acteur)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Annonce introuvable.");
        }
        User expediteur = users.findById(acteur.id())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        MessageDirect m = repo.save(new MessageDirect(annonce, expediteur, req.contenu().trim()));
        if (!annonce.getProprietaire().getId().equals(acteur.id())) {
            notifications.creer(annonce.getProprietaire(), "NOUVEAU_MESSAGE_DIRECT",
                "Nouveau message sur votre annonce",
                expediteur.getNomComplet() + " vous a écrit concernant « " + annonce.getTitre() + " ».",
                "/annonces/" + annonceId);
        }
        return new MessageResume(m.getId(), expediteur.getId(), expediteur.getNomComplet(), m.getContenu(), m.getCreeLe());
    }

    private boolean estGestionnaire(Annonce annonce, AuthenticatedUser acteur) {
        if (acteur.role() == Role.ADMIN || annonce.getProprietaire().getId().equals(acteur.id())) {
            return true;
        }
        return annonce.getAgence() != null && membres.findByAgenceIdAndUtilisateurId(annonce.getAgence().getId(), acteur.id())
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .isPresent();
    }

    public record EnvoiRequest(@NotBlank @Size(max = 2000) String contenu) {}
    public record MessageResume(UUID id, UUID expediteurId, String expediteurNom, String contenu, Instant creeLe) {}
}
