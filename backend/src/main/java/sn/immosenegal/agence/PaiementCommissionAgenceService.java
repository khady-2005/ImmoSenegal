package sn.immosenegal.agence;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import sn.immosenegal.security.AuthenticatedUser;

@Service
@Transactional
public class PaiementCommissionAgenceService {
    private final AgenceRepository agences;
    private final MembreAgenceRepository membres;
    private final VenteAgenceRepository ventes;
    private final PaiementCommissionAgenceRepository paiements;

    public PaiementCommissionAgenceService(AgenceRepository agences, MembreAgenceRepository membres,
            VenteAgenceRepository ventes, PaiementCommissionAgenceRepository paiements) {
        this.agences = agences;
        this.membres = membres;
        this.ventes = ventes;
        this.paiements = paiements;
    }

    @Transactional(readOnly = true)
    public List<PaiementResume> lister(UUID agenceId, UUID venteId, AuthenticatedUser acteur) {
        MembreAgence membre = verifierMembre(agenceId, acteur);
        VenteAgence vente = trouverVente(agenceId, venteId);
        verifierVisibiliteVente(membre, vente);
        return paiements.findAllByVenteIdOrderByDatePaiementDescCreeLeDesc(venteId)
            .stream().map(this::resume).toList();
    }

    public PaiementResume enregistrer(UUID agenceId, UUID venteId, PaiementRequest q,
            AuthenticatedUser acteur) {
        MembreAgence membre = verifierMembre(agenceId, acteur);
        if (membre.getFonction() != FonctionAgence.RESPONSABLE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Seul le responsable de l'agence peut enregistrer un paiement de commission.");
        }
        VenteAgence vente = trouverVente(agenceId, venteId);
        BigDecimal du = q.beneficiaire() == BeneficiaireCommission.AGENT
            ? vente.getCommissionAgent() : vente.getCommissionAgence();
        BigDecimal dejaVerse = paiements.totalVerse(venteId, q.beneficiaire());
        BigDecimal restant = du.subtract(dejaVerse);
        if (q.montant().compareTo(restant) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Le paiement dépasse le solde restant (" + restant.toPlainString() + ").");
        }
        PaiementCommissionAgence paiement = paiements.save(new PaiementCommissionAgence(
            vente, q.beneficiaire(), q.montant(), q.datePaiement(), q.modePaiement().trim(),
            nettoyer(q.reference()), nettoyer(q.note()), acteur.id()));
        return resume(paiement);
    }

    @Transactional(readOnly = true)
    public SoldeResume solde(UUID agenceId, UUID venteId, AuthenticatedUser acteur) {
        MembreAgence membre = verifierMembre(agenceId, acteur);
        VenteAgence vente = trouverVente(agenceId, venteId);
        verifierVisibiliteVente(membre, vente);
        BigDecimal verseAgence = paiements.totalVerse(venteId, BeneficiaireCommission.AGENCE);
        BigDecimal verseAgent = paiements.totalVerse(venteId, BeneficiaireCommission.AGENT);
        return new SoldeResume(
            vente.getCommissionAgence(), verseAgence, vente.getCommissionAgence().subtract(verseAgence),
            vente.getCommissionAgent(), verseAgent, vente.getCommissionAgent().subtract(verseAgent));
    }

    private MembreAgence verifierMembre(UUID agenceId, AuthenticatedUser acteur) {
        if (acteur == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        agences.findById(agenceId).filter(a -> a.getStatut() == StatutAgence.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence introuvable ou inactive."));
        return membres.findByAgenceIdAndUtilisateurId(agenceId, acteur.id())
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Vous n'êtes pas membre actif de cette agence."));
    }

    private VenteAgence trouverVente(UUID agenceId, UUID venteId) {
        VenteAgence vente = ventes.findById(venteId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vente introuvable."));
        if (!vente.getAgence().getId().equals(agenceId))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vente introuvable dans cette agence.");
        return vente;
    }

    private void verifierVisibiliteVente(MembreAgence membre, VenteAgence vente) {
        if (membre.getFonction() == FonctionAgence.AGENT
                && !vente.getAgent().getId().equals(membre.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette vente ne vous est pas attribuée.");
        if (membre.getFonction() == FonctionAgence.GESTIONNAIRE)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès réservé aux responsables et agents.");
    }

    private String nettoyer(String valeur) {
        return valeur == null || valeur.isBlank() ? null : valeur.trim();
    }

    private PaiementResume resume(PaiementCommissionAgence p) {
        return new PaiementResume(p.getId(), p.getVente().getId(), p.getBeneficiaire().name(),
            p.getMontant(), p.getDatePaiement(), p.getModePaiement(), p.getReference(), p.getNote(), p.getCreeLe());
    }

    public record PaiementRequest(BeneficiaireCommission beneficiaire, BigDecimal montant,
        LocalDate datePaiement, String modePaiement, String reference, String note) {}
    public record PaiementResume(UUID id, UUID venteId, String beneficiaire, BigDecimal montant,
        LocalDate datePaiement, String modePaiement, String reference, String note, java.time.Instant creeLe) {}
    public record SoldeResume(BigDecimal commissionAgenceDue, BigDecimal commissionAgenceVersee,
        BigDecimal commissionAgenceRestante, BigDecimal commissionAgentDue, BigDecimal commissionAgentVersee,
        BigDecimal commissionAgentRestante) {}
}
