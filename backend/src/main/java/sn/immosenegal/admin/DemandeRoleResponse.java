package sn.immosenegal.admin;

import java.time.Instant;
import java.util.UUID;

import sn.immosenegal.user.Role;

public record DemandeRoleResponse(
    UUID id,
    UUID userId,
    String email,
    String nomComplet,
    Role roleDemande,
    StatutDemande statut,
    Instant creeLe,
    Instant decideLe,
    UUID decidePar,
    String decideParNom,
    String motifDecision,
    boolean aJustificatif,
    String justificatifNom) {

    public static DemandeRoleResponse de(DemandeRole d) {
        return new DemandeRoleResponse(
            d.getId(),
            d.getUser().getId(),
            d.getUser().getEmail(),
            d.getUser().getNomComplet(),
            d.getRoleDemande(),
            d.getStatut(),
            d.getCreeLe(),
            d.getDecideLe(),
            d.getDecidePar(),
            d.getDecideParNom(),
            d.getMotifDecision(),
            d.getJustificatifContenu() != null && d.getJustificatifContenu().length > 0,
            d.getJustificatifNom());
    }
}
