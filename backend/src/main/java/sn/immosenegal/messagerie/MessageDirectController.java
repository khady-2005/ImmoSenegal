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
                                      @RequestParam(required = false) UUID interlocuteurId,
                                      @AuthenticationPrincipal AuthenticatedUser acteur) {
        Annonce annonce = annonces.findById(annonceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
        boolean gestionnaire = estGestionnaire(annonce, acteur);
        if (!gestionnaire) {
            if (interlocuteurId != null && !interlocuteurId.equals(acteur.id())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès interdit aux échanges d'un autre utilisateur.");
            }
            return repo.findAllByAnnonceIdAndInterlocuteurIdOrderByCreeLeAsc(annonceId, acteur.id()).stream()
                .map(this::versResume)
                .toList();
        }
        List<MessageDirect> liste = interlocuteurId != null
            ? repo.findAllByAnnonceIdAndInterlocuteurIdOrderByCreeLeAsc(annonceId, interlocuteurId)
            : repo.findAllByAnnonceIdOrderByCreeLeAsc(annonceId);
        return liste.stream().map(this::versResume).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResume envoyer(@PathVariable UUID annonceId,
                                 @Valid @RequestBody EnvoiRequest req,
                                 @AuthenticationPrincipal AuthenticatedUser acteur) {
        Annonce annonce = annonces.findById(annonceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
        boolean gestionnaire = estGestionnaire(annonce, acteur);
        if (annonce.getStatut() != StatutAnnonce.PUBLIEE && !gestionnaire) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Annonce introuvable.");
        }
        User expediteur = users.findById(acteur.id())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session invalide."));

        User interlocuteur;
        if (gestionnaire) {
            if (req.interlocuteurId() != null) {
                interlocuteur = users.findById(req.interlocuteurId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Interlocuteur introuvable."));
            } else {
                List<User> clients = repo.findAllByAnnonceIdOrderByCreeLeAsc(annonceId).stream()
                    .map(MessageDirect::getInterlocuteur)
                    .distinct()
                    .toList();
                if (clients.size() == 1) {
                    interlocuteur = clients.get(0);
                } else {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Précisez l'interlocuteur auquel vous souhaitez répondre.");
                }
            }
        } else {
            if (req.interlocuteurId() != null && !req.interlocuteurId().equals(acteur.id())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Vous ne pouvez pas écrire dans la conversation d'un autre utilisateur.");
            }
            interlocuteur = expediteur;
        }

        MessageDirect m = repo.save(new MessageDirect(annonce, expediteur, interlocuteur, req.contenu().trim()));
        if (gestionnaire) {
            if (!interlocuteur.getId().equals(acteur.id())) {
                notifications.creer(interlocuteur, "NOUVEAU_MESSAGE_DIRECT",
                    "Réponse à votre message",
                    expediteur.getNomComplet() + " vous a répondu concernant « " + annonce.getTitre() + " ».",
                    "/annonces/" + annonceId);
            }
        } else if (!annonce.getProprietaire().getId().equals(acteur.id())) {
            notifications.creer(annonce.getProprietaire(), "NOUVEAU_MESSAGE_DIRECT",
                "Nouveau message sur votre annonce",
                expediteur.getNomComplet() + " vous a écrit concernant « " + annonce.getTitre() + " ».",
                "/annonces/" + annonceId);
        }
        return versResume(m);
    }

    private MessageResume versResume(MessageDirect m) {
        return new MessageResume(m.getId(), m.getExpediteur().getId(), m.getExpediteur().getNomComplet(),
            m.getInterlocuteur().getId(), m.getInterlocuteur().getNomComplet(), m.getContenu(), m.getCreeLe());
    }

    private boolean estGestionnaire(Annonce annonce, AuthenticatedUser acteur) {
        if (acteur.role() == Role.ADMIN || annonce.getProprietaire().getId().equals(acteur.id())) {
            return true;
        }
        return annonce.getAgence() != null && membres.findByAgenceIdAndUtilisateurId(annonce.getAgence().getId(), acteur.id())
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .isPresent();
    }

    public record EnvoiRequest(@NotBlank @Size(max = 2000) String contenu, UUID interlocuteurId) {}
    public record MessageResume(UUID id, UUID expediteurId, String expediteurNom,
                                UUID interlocuteurId, String interlocuteurNom,
                                String contenu, Instant creeLe) {}
}
