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
    Proprietaire proprietaire, Instant creeLe, Instant modifieLe, java.time.LocalDate dateFinPublication, List<UUID> photos, boolean exemple,
    String motifModeration, boolean publieeParAgence,
    DiffuseurInfo diffuseur, GestionnaireInfo gestionnaire,
    Integer chambres, Integer sallesDeBain, long vues) {

    public record Proprietaire(UUID id, String nomComplet) {
    }

    public record DiffuseurInfo(UUID agenceId, String agenceNom, String agenceSlug, String type) {
    }

    public record GestionnaireInfo(UUID agenceId, String agenceNom, String agenceSlug) {
    }

    /** Vue publique : sans motif de modération. */
    public static AnnonceResponse de(Annonce a, List<UUID> photos) {
        return construire(a, photos, null, null, false);
    }

    /** Vue publique enrichie avec le gestionnaire actif éventuel. */
    public static AnnonceResponse de(Annonce a, List<UUID> photos, GestionnaireInfo gestionnaire) {
        return construire(a, photos, null, gestionnaire, false);
    }

    /** Vue visiteur non connecté : masque l'adresse exacte et les coordonnées GPS. */
    public static AnnonceResponse pourVisiteur(Annonce a, List<UUID> photos, GestionnaireInfo gestionnaire) {
        return construire(a, photos, null, gestionnaire, true);
    }

    /** Vue du propriétaire ou d'un administrateur : avec le motif de la dernière décision de modération. */
    public static AnnonceResponse pourGestion(Annonce a, List<UUID> photos) {
        return construire(a, photos, a.getMotifModeration(), null, false);
    }

    /** Vue gestion enrichie avec le gestionnaire actif éventuel. */
    public static AnnonceResponse pourGestion(Annonce a, List<UUID> photos, GestionnaireInfo gestionnaire) {
        return construire(a, photos, a.getMotifModeration(), gestionnaire, false);
    }

    private static AnnonceResponse construire(Annonce a, List<UUID> photos, String motif,
                                              GestionnaireInfo gestionnaire, boolean masquerLocalisation) {
        DiffuseurInfo diffuseur = a.getAgence() == null ? null : new DiffuseurInfo(
            a.getAgence().getId(), a.getAgence().getNom(), a.getAgence().getSlug(), a.getAgence().getType().name());
        return new AnnonceResponse(a.getId(), a.getTitre(), a.getDescription(), a.getTypeBien(), a.getTypeTransaction(),
            a.getPrix(), a.getSuperficie(), a.getPieces(), a.getQuartier(), a.getVille(),
            masquerLocalisation ? null : a.getAdresse(),
            masquerLocalisation ? null : a.getLatitude(),
            masquerLocalisation ? null : a.getLongitude(),
            a.getEquipements().stream().sorted().toList(), a.getStatut(),
            new Proprietaire(a.getProprietaire().getId(), a.getProprietaire().getNomComplet()),
            a.getCreeLe(), a.getModifieLe(), a.getDateFinPublication(), photos, a.isExemple(), motif, a.isPublieeParAgence(),
            diffuseur, gestionnaire, a.getChambres(), a.getSallesDeBain(), a.getVues());
    }
}
