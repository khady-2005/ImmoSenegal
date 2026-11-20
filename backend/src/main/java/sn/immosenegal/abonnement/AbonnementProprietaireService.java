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
import sn.immosenegal.user.Role;

@Service
@Transactional
public class AbonnementProprietaireService {
    private final AbonnementProprietaireRepository abonnements;

    public AbonnementProprietaireService(AbonnementProprietaireRepository abonnements) {
        this.abonnements = abonnements;
    }

    public Resume demander(Demande q, AuthenticatedUser acteur) {
        exigerRole(acteur, Role.PROPRIETAIRE);
        abonnements.findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(acteur.id(), StatutAbonnement.EN_ATTENTE)
            .ifPresent(a -> { throw new ResponseStatusException(HttpStatus.CONFLICT, "Une demande d'abonnement est déjà en attente."); });
        abonnements.findFirstByProprietaireIdAndStatutOrderByCreeLeDesc(acteur.id(), StatutAbonnement.ACTIF)
            .filter(a -> a.getDateFin() != null && !a.getDateFin().isBefore(LocalDate.now()))
            .ifPresent(a -> { throw new ResponseStatusException(HttpStatus.CONFLICT, "Votre abonnement est déjà actif."); });

        BigDecimal montant = tarif(q.forfait());
        var a = abonnements.save(new AbonnementProprietaire(acteur.id(), q.forfait(), montant,
            q.modePaiement().trim(), nettoyer(q.referencePaiement()), nettoyer(q.note())));
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
        if (q.accepter()) a.activer(acteur.id(), LocalDate.now());
        else a.refuser(acteur.id(), q.motif());
        return resume(abonnements.save(a));
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
        return new Resume(a.getId(), a.getForfait(), a.getMontant(), a.getDateDebut(), a.getDateFin(),
            a.getStatut(), a.getModePaiement(), a.getReferencePaiement(), a.getNote(), a.getCreeLe());
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
        String note, java.time.Instant creeLe) {}
}
