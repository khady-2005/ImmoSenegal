package sn.immosenegal.annonce;

import java.math.BigDecimal;
import java.util.List;

/**
 * Critères de recherche, tous facultatifs et combinables.
 * {@code exemple} : true = seulement les annonces d'exemple, false = seulement les vraies, null = toutes.
 * {@code statut} n'est jamais fourni par le public : le service impose PUBLIEE pour le catalogue.
 */
public record CriteresRecherche(
    TypeTransaction transaction, TypeBien type, Long prixMin, Long prixMax,
    BigDecimal superficieMin, BigDecimal superficieMax, String quartier, String ville,
    Integer piecesMin, List<String> equipements, StatutAnnonce statut, Boolean exemple) {

    /** Mêmes critères, avec le statut imposé par le serveur. */
    public CriteresRecherche avecStatut(StatutAnnonce impose) {
        return new CriteresRecherche(transaction, type, prixMin, prixMax, superficieMin, superficieMax, quartier, ville,
            piecesMin, equipements, impose, exemple);
    }
}
