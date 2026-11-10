package sn.immosenegal.annonce;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sn.immosenegal.audit.AuditService;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

/**
 * Annonces de démonstration persistées dans PostgreSQL pour présenter et tester le catalogue.
 *
 * Garde-fous :
 * - jamais créées par un formulaire public : seulement au démarrage, si EXEMPLES_ACTIFS=true ;
 * - marquées {@code exemple = true} en base pour distinguer les données de présentation ;
 * - les caractéristiques, prix et photos doivent être remplacés par des informations vérifiées avant toute publication réelle ;
 * - le « propriétaire » est un compte désactivé, au mot de passe aléatoire que personne ne connaît : on ne peut pas s'y connecter ;
 * - les photos sont des images illustratives, ré-encodées comme toute photo envoyée.
 *
 * Pour tout retirer : DELETE FROM users WHERE email = 'exemples@immosenegal.invalid' (les annonces et photos partent avec).
 */
@Service
public class AnnoncesExemple {

    /** Adresse réservée (.invalid) : elle ne peut appartenir à aucune vraie personne. */
    public static final String EMAIL_PROPRIETAIRE = "exemples@immosenegal.invalid";

    private static final Logger log = LoggerFactory.getLogger(AnnoncesExemple.class);
    private static final String AVERTISSEMENT = "";

    private record Exemple(String titre, String texte, TypeBien type, TypeTransaction transaction, long prix,
                           String superficie, Integer pieces, String quartier, String ville,
                           String latitude, String longitude, StatutAnnonce statut,
                           Set<String> equipements, List<String> photos) {
    }

    private static final List<Exemple> EXEMPLES = List.of(
        new Exemple("Villa avec vue sur la mer",
            "Grande villa lumineuse avec terrasse, piscine et jardin fleuri, pensée pour recevoir. Séjour ouvert sur la mer.",
            TypeBien.VILLA, TypeTransaction.LOCATION, 1_500_000, "280", 6, "Almadies", "Dakar",
            "14.744600", "-17.525300", StatutAnnonce.PUBLIEE,
            Set.of("piscine", "climatisation", "gardien", "parking", "vue mer"),
            List.of("villa-1", "villa-2", "villa-3")),
        new Exemple("Appartement lumineux 3 pièces",
            "Salon spacieux avec grande baie vitrée, décoration chaleureuse, cuisine équipée. Proche des commerces.",
            TypeBien.APPARTEMENT, TypeTransaction.LOCATION, 450_000, "110", 3, "Mermoz", "Dakar",
            "14.704100", "-17.474100", StatutAnnonce.PUBLIEE,
            Set.of("climatisation", "balcon", "ascenseur", "parking"),
            List.of("appart-1", "appart-2", "appart-3")),
        new Exemple("Maison de plage avec piscine",
            "Située à Saly Portudal, cette maison de plage développe une superficie de 350 m². Elle comprend cinq pièces et offre un cadre de séjour tourné vers l’extérieur, avec une piscine, un jardin aménagé et un espace de détente couvert. La climatisation et la présence d’un gardien complètent les équipements indiqués. Une présentation détaillée de chaque espace et des photos récentes permettront de confirmer l’agencement exact du bien.",
            TypeBien.MAISON, TypeTransaction.VENTE, 185_000_000, "350", 5, "Saly Portudal", "Saly",
            "14.447000", "-17.013000", StatutAnnonce.PUBLIEE,
            Set.of("piscine", "jardin", "gardien", "climatisation"),
            List.of("plage-1", "plage-3", "plage-2")),
        new Exemple("Studio meublé près du campus",
            "Studio meublé et calme, idéal pour un étudiant : lit, coin cuisine, connexion internet, à quelques minutes à pied du campus.",
            TypeBien.STUDIO, TypeTransaction.LOCATION, 55_000, "22", 1, "Boucotte", "Ziguinchor",
            "12.574000", "-16.270000", StatutAnnonce.PUBLIEE,
            Set.of("meublé", "wifi", "eau courante"),
            List.of("appart-2")),
        new Exemple("Appartement neuf avec vue sur l'océan",
            "Appartement récent au dernier étage, vue dégagée sur l'océan depuis le séjour et le balcon.",
            TypeBien.APPARTEMENT, TypeTransaction.VENTE, 75_000_000, "85", 3, "Ouakam", "Dakar",
            "14.723600", "-17.490300", StatutAnnonce.PUBLIEE,
            Set.of("ascenseur", "balcon", "parking", "vue mer"),
            List.of("appart-3", "appart-1")),
        new Exemple("Maison familiale avec cour",
            "Maison de plain-pied avec une grande cour fleurie et un coin ombragé. Quartier calme, proche de l'école.",
            TypeBien.MAISON, TypeTransaction.VENTE, 28_000_000, "180", 5, "Néma", "Ziguinchor",
            "12.565000", "-16.268000", StatutAnnonce.PUBLIEE,
            Set.of("cour", "eau courante", "groupe électrogène"),
            List.of("villa-2")),
        new Exemple("Villa familiale à Saint-Louis",
            "Villa confortable à quelques minutes du fleuve, grand séjour, quatre chambres et terrasse.",
            TypeBien.VILLA, TypeTransaction.LOCATION, 300_000, "220", 4, "Sor", "Saint-Louis",
            "16.028000", "-16.493000", StatutAnnonce.PUBLIEE,
            Set.of("jardin", "parking", "gardien"),
            List.of("villa-3", "villa-1")),
        new Exemple("Terrain de 300 m² près de la plage",
            "Terrain plat, bien situé, à proximité de la plage. Idéal pour construire une maison de vacances.",
            TypeBien.TERRAIN, TypeTransaction.VENTE, 15_000_000, "300", null, "Warang", "Mbour",
            "14.400000", "-16.970000", StatutAnnonce.PUBLIEE,
            Set.of("eau courante", "électricité"),
            List.of("plage-2")));

    private final AnnonceRepository annonces;
    private final PhotoRepository photos;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    public AnnoncesExemple(AnnonceRepository annonces, PhotoRepository photos, UserRepository users,
                           PasswordEncoder encoder, AuditService audit) {
        this.annonces = annonces;
        this.photos = photos;
        this.users = users;
        this.encoder = encoder;
        this.audit = audit;
    }

    /** Crée les annonces d'exemple si aucune n'existe encore (sans effet au 2e appel). Retourne le nombre créé. */
    @Transactional
    public int creer() {
        if (annonces.existsByExempleTrue()) {
            log.info("Les annonces d'exemple existent déjà : rien à créer.");
            return 0;
        }
        User proprietaire = users.findByEmail(EMAIL_PROPRIETAIRE).orElseGet(this::creerProprietaire);
        for (Exemple e : EXEMPLES) {
            Annonce a = new Annonce(proprietaire);
            a.setTitre(e.titre());
            a.setDescription(AVERTISSEMENT + e.texte());
            a.setTypeBien(e.type());
            a.setTypeTransaction(e.transaction());
            a.setPrix(e.prix());
            a.setSuperficie(new BigDecimal(e.superficie()));
            a.setPieces(e.pieces());
            a.setQuartier(e.quartier());
            a.setVille(e.ville());
            a.setLatitude(new BigDecimal(e.latitude()));
            a.setLongitude(new BigDecimal(e.longitude()));
            a.setStatut(e.statut());
            a.remplacerEquipements(e.equipements());
            a.marquerCommeExemple();
            annonces.save(a);
            int ordre = 1;
            for (String nom : e.photos()) {
                photos.save(nettoyer(a, nom, ordre++));
            }
        }
        audit.enregistrer("ANNONCES_EXEMPLE_CREEES", proprietaire.getId(), EXEMPLES.size() + " annonces d'exemple créées");
        log.warn("{} annonces d'exemple créées (données de démonstration, marquées « Exemple »).", EXEMPLES.size());
        return EXEMPLES.size();
    }

    /** Compte désactivé + mot de passe aléatoire jamais affiché ni enregistré ailleurs : impossible de s'y connecter. */
    private User creerProprietaire() {
        byte[] hasard = new byte[48];
        new SecureRandom().nextBytes(hasard);
        String secret = Base64.getUrlEncoder().withoutPadding().encodeToString(hasard);
        User compte = new User(EMAIL_PROPRIETAIRE, encoder.encode(secret), "Équipe ImmoSénégal", null, Role.PROPRIETAIRE);
        compte.setActif(false);
        return users.save(compte);
    }

    private PhotoAnnonce nettoyer(Annonce annonce, String nom, int ordre) {
        byte[] brut;
        try (InputStream flux = new ClassPathResource("exemples/photos/" + nom + ".jpg").getInputStream()) {
            brut = flux.readAllBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Photo d'exemple introuvable : " + nom, e);
        }
        try {
            // Même traitement que les photos envoyées par les utilisateurs (ré-encodage, sans métadonnées).
            TraitementImage.Resultat propre = TraitementImage.nettoyer(brut, "image/jpeg");
            return new PhotoAnnonce(annonce.getId(), propre.octets(), propre.typeMime(), ordre);
        } catch (TraitementImage.ImageRefusee e) {
            throw new IllegalStateException("Photo d'exemple refusée : " + nom, e);
        }
    }
}
