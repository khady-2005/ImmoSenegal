package sn.immosenegal.messagerie;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.immosenegal.agence.*;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service
public class MessagerieMandatService {
    private final MandatGestionRepository mandats;
    private final MembreAgenceRepository membres;
    private final MessageMandatGestionRepository messages;
    private final UserRepository utilisateurs;
    private final NotificationService notifications;

    public MessagerieMandatService(MandatGestionRepository mandats, MembreAgenceRepository membres,
            MessageMandatGestionRepository messages, UserRepository utilisateurs, NotificationService notifications) {
        this.mandats = mandats; this.membres = membres; this.messages = messages;
        this.utilisateurs = utilisateurs; this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<ConversationMandatResponse> conversations(AuthenticatedUser acteur) {
        List<MandatGestion> liste = new ArrayList<>();
        mandats.findAllByProprietaireIdOrderByCreeLeDesc(acteur.id()).stream()
            .filter(m -> m.getStatut() == StatutMandatGestion.ACCEPTE).forEach(liste::add);
        for (MembreAgence membre : membres.findAllByUtilisateurId(acteur.id())) {
            if (membre.getStatut() == StatutMembreAgence.ACTIF) {
                mandats.findAllByAgenceIdAndStatutOrderByCreeLeDesc(
                    membre.getAgence().getId(), StatutMandatGestion.ACCEPTE).forEach(liste::add);
            }
        }
        return liste.stream().collect(java.util.stream.Collectors.toMap(
            MandatGestion::getId, m -> m, (a,b) -> a, LinkedHashMap::new))
            .values().stream().map(m -> ConversationMandatResponse.de(m, acteur.id())).toList();
    }

    @Transactional(readOnly = true)
    public List<MessageMandatGestionResponse> messages(UUID mandatId, AuthenticatedUser acteur) {
        verifierAcces(mandatId, acteur);
        return messages.findAllByMandatIdOrderByEnvoyeLeAsc(mandatId)
            .stream().map(MessageMandatGestionResponse::de).toList();
    }

    @Transactional
    public MessageMandatGestionResponse envoyer(UUID mandatId, String contenu, AuthenticatedUser acteur) {
        MandatGestion mandat = verifierAcces(mandatId, acteur);
        if (contenu == null || contenu.isBlank() || contenu.length() > 2000)
            throw new ApiException(HttpStatus.BAD_REQUEST, "Le message doit contenir entre 1 et 2000 caractères.");
        User expediteur = utilisateurs.findById(acteur.id())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Compte utilisateur introuvable."));
        MessageMandatGestion nouveau = messages.save(new MessageMandatGestion(mandat, expediteur, contenu.trim()));
        boolean proprietaire = mandat.getProprietaire().getId().equals(acteur.id());
        if (proprietaire) {
            membres.findAllByAgenceIdAndStatut(mandat.getAgence().getId(), StatutMembreAgence.ACTIF)
                .stream()
                .forEach(m -> notifications.creer(m.getUtilisateur(), "MESSAGE_MANDAT",
                    "Message du propriétaire", expediteur.getNomComplet() + " vous a écrit au sujet de "
                        + mandat.getAnnonce().getTitre(), "/messagerie"));
        } else {
            notifications.creer(mandat.getProprietaire(), "MESSAGE_MANDAT",
                "Message de votre agence", mandat.getAgence().getNom() + " vous a écrit au sujet de "
                    + mandat.getAnnonce().getTitre(), "/messagerie");
        }
        return MessageMandatGestionResponse.de(nouveau);
    }

    private MandatGestion verifierAcces(UUID mandatId, AuthenticatedUser acteur) {
        MandatGestion mandat = mandats.findById(mandatId)
            .filter(m -> m.getStatut() == StatutMandatGestion.ACCEPTE)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Mandat actif introuvable."));
        boolean proprietaire = mandat.getProprietaire().getId().equals(acteur.id());
        boolean membreActif = membres.findByAgenceIdAndUtilisateurId(mandat.getAgence().getId(), acteur.id())
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF).isPresent();
        if (!proprietaire && !membreActif)
            throw new ApiException(HttpStatus.FORBIDDEN, "Vous ne participez pas à cette conversation.");
        return mandat;
    }
}
