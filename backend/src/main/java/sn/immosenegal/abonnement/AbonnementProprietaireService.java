package sn.immosenegal.abonnement;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service
@Transactional
public class AbonnementProprietaireService {
    private final AbonnementProprietaireRepository abonnements;
    private final UserRepository utilisateurs;
    private final NotificationService notifications;

    public AbonnementProprietaireService(AbonnementProprietaireRepository abonnements, UserRepository utilisateurs,
            NotificationService notifications) {
        this.abonnements = abonnements;
        this.utilisateurs = utilisateurs;
        this.notifications = notifications;
    }

    public Resume demander(Demande q, AuthenticatedUser acteur) {
        exigerRole(acteur, Role.PROPRIETAIRE);
        abonnements.findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(acteur.id(), StatutAbonnement.EN_ATTENTE)
            .ifPresent(a -> { throw new ResponseStatusException(HttpStatus.CONFLICT, "Une demande d'abonnement est déjà en attente."); });
        abonnements.findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(acteur.id(), StatutAbonnement.ACTIF)
            .filter(a -> a.getDateFin() != null && !a.getDateFin().isBefore(LocalDate.now()))
            .ifPresent(a -> { throw new ResponseStatusException(HttpStatus.CONFLICT, "Votre abonnement est déjà actif."); });

        String mode = q.modePaiement().trim().toUpperCase();
        if ("PAYDUNYA".equals(mode) || "PAYTECH".equals(mode))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Les paiements en ligne doivent être initiés depuis le bouton « Payer en ligne ».");
        if (!List.of("WAVE", "ORANGE_MONEY", "VIREMENT", "ESPECES").contains(mode))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mode de paiement non pris en charge.");

        BigDecimal montant = tarif(q.forfait());
        var a = abonnements.save(new AbonnementProprietaire(acteur.id(), q.forfait(), montant,
            mode, nettoyer(q.referencePaiement()), nettoyer(q.note())));
        return resume(a);
    }

    @Transactional(readOnly = true)
    public List<Resume> historique(AuthenticatedUser acteur) {
        exigerRole(acteur, Role.PROPRIETAIRE);
        return abonnements.findAllByProprietaireIdOrderByCreeLeDesc(acteur.id()).stream().map(this::resume).toList();
    }

    @Transactional
    public List<Resume> demandesAdmin(AuthenticatedUser acteur) {
        exigerRole(acteur, Role.ADMIN);
        return abonnements.findAllByStatutOrderByCreeLeAsc(StatutAbonnement.EN_ATTENTE).stream().map(this::resume).toList();
    }

    public Resume decider(UUID id, Decision q, AuthenticatedUser acteur) {
        exigerRole(acteur, Role.ADMIN);
        var a = abonnements.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable."));
        if (a.getStatut() != StatutAbonnement.EN_ATTENTE)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette demande a déjà été traitée.");
        if ("PAYDUNYA".equalsIgnoreCase(a.getModePaiement()) || "PAYTECH".equalsIgnoreCase(a.getModePaiement()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Un paiement en ligne ne peut être activé que par confirmation automatique du fournisseur.");
        if (q.accepter()) {
            a.activer(acteur.id(), LocalDate.now());
        } else {
            a.refuser(acteur.id(), q.motif());
        }
        AbonnementProprietaire traite = abonnements.save(a);
        utilisateurs.findById(traite.getProprietaireId()).ifPresent(proprietaire ->
            notifications.creer(proprietaire, q.accepter() ? "ABONNEMENT_ACTIVE" : "ABONNEMENT_REFUSE",
                q.accepter() ? "Votre abonnement est activé" : "Votre demande d'abonnement a été refusée",
                q.accepter()
                    ? "Votre abonnement " + traite.getForfait() + " est actif jusqu'au " + traite.getDateFin() + "."
                    : "Votre demande d'abonnement n'a pas été acceptée. Consultez votre espace propriétaire pour les précisions.",
                "/espace-proprietaire"));
        return resume(traite);
    }

    private BigDecimal tarif(ForfaitAbonnement f) {
        return switch (f) {
            case MENSUEL -> new BigDecimal("5000");
            case TRIMESTRIEL -> new BigDecimal("13500");
            case ANNUEL -> new BigDecimal("50000");
        };
    }

    private void exigerRole(AuthenticatedUser a, Role role) {
        if (a == null || a.role() != role)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès non autorisé.");
    }

    private String nettoyer(String s) { return s == null || s.isBlank() ? null : s.trim(); }

    private Resume resume(AbonnementProprietaire a) {
        User proprietaire = utilisateurs.findById(a.getProprietaireId()).orElse(null);
        return new Resume(a.getId(), a.getForfait(), a.getMontant(), a.getDateDebut(), a.getDateFin(),
            a.getStatut(), a.getModePaiement(), a.getReferencePaiement(), a.getNote(), a.getCreeLe(),
            proprietaire == null ? "Compte propriétaire introuvable" : proprietaire.getNomComplet(),
            proprietaire == null ? null : proprietaire.getEmail(),
            proprietaire == null ? null : proprietaire.getTelephone());
    }

    public record Demande(ForfaitAbonnement forfait, String modePaiement, String referencePaiement, String note) {
        public Demande {
            if (forfait == null || modePaiement == null || modePaiement.isBlank() || modePaiement.length() > 30)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Forfait et mode de paiement obligatoires.");
            if (referencePaiement != null && referencePaiement.length() > 150)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Référence trop longue.");
            if (note != null && note.length() > 1000)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Note trop longue.");
        }
    }
    public record Decision(boolean accepter, String motif) {}
    public record Resume(UUID id, ForfaitAbonnement forfait, BigDecimal montant, LocalDate dateDebut,
        LocalDate dateFin, StatutAbonnement statut, String modePaiement, String referencePaiement,
        String note, java.time.Instant creeLe, String proprietaireNom, String proprietaireEmail,
        String proprietaireTelephone) {}
}