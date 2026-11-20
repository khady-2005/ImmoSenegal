package sn.immosenegal.annonce;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Vue d'une annonce. Le propriétaire n'est identifié que par son nom : aucun email ni téléphone
 * (le contact passera par la messagerie interne). {@code motifModeration} n'est rempli que pour le propriétaire
 * de l'annonce et les administrateurs (vue « gestion ») : jamais dans la vue publique.
 */
public record AnnonceResponse(
    UUID id, String titre, String description, TypeBien typeBien, TypeTransaction transaction,
    long prix, BigDecimal superficie, Integer pieces, String quartier, String ville, String adresse,
    BigDecimal latitude, BigDecimal longitude, List<String> equipements, StatutAnnonce statut,
    Proprietaire proprietaire, Instant creeLe, Instant modifieLe, java.time.LocalDate dateFinGratuite, List<UUID> photos, boolean exemple,
    String motifModeration) {

    public record Proprietaire(UUID id, String nomComplet) {
    }

    /** Vue publique : sans motif de modération. */
    public static AnnonceResponse de(Annonce a, List<UUID> photos) {
        return construire(a, photos, null);
    }

    /** Vue du propriétaire ou d'un administrateur : avec le motif de la dernière décision de modération. */
    public static AnnonceResponse pourGestion(Annonce a, List<UUID> photos) {
        return construire(a, photos, a.getMotifModeration());
    }

    private static AnnonceResponse construire(Annonce a, List<UUID> photos, String motif) {
        return new AnnonceResponse(a.getId(), a.getTitre(), a.getDescription(), a.getTypeBien(), a.getTypeTransaction(),
            a.getPrix(), a.getSuperficie(), a.getPieces(), a.getQuartier(), a.getVille(), a.getAdresse(),
            a.getLatitude(), a.getLongitude(), a.getEquipements().stream().sorted().toList(), a.getStatut(),
            new Proprietaire(a.getProprietaire().getId(), a.getProprietaire().getNomComplet()),
            a.getCreeLe(), a.getModifieLe(), a.getDateFinGratuite(), photos, a.isExemple(), motif);
    }
}
