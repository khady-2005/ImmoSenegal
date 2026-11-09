package sn.immosenegal.annonce;

/**
 * Cycle de vie d'une annonce.
 * <ul>
 *   <li>EN_ATTENTE : créée, ou modifiée après validation ; en attente d'un administrateur. Invisible du public.</li>
 *   <li>PUBLIEE : validée ; seul statut visible dans le catalogue public.</li>
 *   <li>A_CORRIGER / REFUSEE / SUSPENDUE : décisions de l'administrateur (avec motif). Invisibles du public.</li>
 *   <li>RESERVE / VENDU / LOUE : statuts commerciaux choisis par le propriétaire sur une annonce déjà validée. Invisibles du public.</li>
 * </ul>
 */
public enum StatutAnnonce {
    EN_ATTENTE, PUBLIEE, A_CORRIGER, REFUSEE, SUSPENDUE, RESERVE, VENDU, LOUE;

    /** Statuts que le propriétaire peut choisir lui-même, d'un seul statut commercial vers un autre. */
    public boolean estCommercial() {
        return this == PUBLIEE || this == RESERVE || this == VENDU || this == LOUE;
    }
}
