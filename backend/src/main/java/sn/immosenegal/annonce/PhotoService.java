package sn.immosenegal.annonce;

import java.io.IOException;
import java.util.UUID;
import java.util.List;
import java.util.HashSet;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import sn.immosenegal.audit.AuditService;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.security.AuthenticatedUser;

/**
 * Photos d'annonces. Règles : seul le propriétaire de l'annonce (ou un ADMIN) ajoute/supprime ; le type réel du fichier
 * est reconnu par son contenu (jamais par son nom ni par l'en-tête envoyé), l'image est ré-encodée (métadonnées supprimées) ;
 * 5 Mo et 8 photos au maximum.
 */
@Service
public class PhotoService {

    static final int TAILLE_MAX_OCTETS = 5 * 1024 * 1024;
    static final int PHOTOS_MAX = 8;

    private final PhotoRepository photos;
    private final AnnonceService annonces;
    private final AuditService audit;

    public PhotoService(PhotoRepository photos, AnnonceService annonces, AuditService audit) {
        this.photos = photos;
        this.annonces = annonces;
        this.audit = audit;
    }

    @Transactional
    public UUID ajouter(UUID annonceId, AuthenticatedUser auteur, MultipartFile fichier) {
        return ajouter(annonceId, auteur, fichier, "AUTRE");
    }

    @Transactional
    public UUID ajouter(UUID annonceId, AuthenticatedUser auteur, MultipartFile fichier, String piece) {
        // Le propriétaire peut compléter une annonce publiée sans validation préalable.
        annonces.verifierGestionPhotoAdmin(annonceId, auteur);
        annonces.annonceAvecAjoutDeContenu(annonceId, auteur);
        if (fichier == null || fichier.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Aucun fichier reçu.");
        }
        if (fichier.getSize() > TAILLE_MAX_OCTETS) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "La photo dépasse 5 Mo.");
        }
        byte[] contenu;
        try {
            contenu = fichier.getBytes();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Fichier illisible.");
        }
        String type = reconnaitreType(contenu);
        if (type == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Format refusé : seuls les JPEG et PNG sont acceptés.");
        }
        if (photos.countByAnnonceId(annonceId) >= PHOTOS_MAX) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Une annonce ne peut pas avoir plus de " + PHOTOS_MAX + " photos.");
        }
        TraitementImage.Resultat propre;
        try {
            // Ré-encodage : vraie image obligatoire, métadonnées (GPS...) supprimées, taille réduite.
            propre = TraitementImage.nettoyer(contenu, type);
        } catch (TraitementImage.ImageRefusee e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        PhotoAnnonce photo = new PhotoAnnonce(annonceId, propre.octets(), propre.typeMime(), photos.ordreMax(annonceId) + 1);
        photo.setPiece(normaliserPiece(piece));
        photo = photos.save(photo);
        annonces.marquerPhotosModifiees(annonceId);
        audit.enregistrer("PHOTO_AJOUTEE", auteur.id(), "Annonce " + annonceId);
        return photo.getId();
    }

    public record PhotoMetadata(UUID id, String piece, int ordre) {}

    @Transactional(readOnly = true)
    public List<PhotoMetadata> metadata(UUID annonceId) {
        return photos.findAllByAnnonceIdOrderByOrdreAscCreeLeAsc(annonceId).stream()
            .map(p -> new PhotoMetadata(p.getId(), p.getPiece(), p.getOrdre())).toList();
    }

    @Transactional
    public void classer(UUID annonceId, UUID photoId, AuthenticatedUser auteur, String piece) {
        annonces.verifierGestionPhotoAdmin(annonceId, auteur);
        annonces.annonceModifiable(annonceId, auteur);
        PhotoAnnonce photo = lire(annonceId, photoId);
        photo.setPiece(normaliserPiece(piece));
        audit.enregistrer("PHOTO_CLASSEE", auteur.id(), "Photo " + photoId + " classée dans " + photo.getPiece());
    }

    private static String normaliserPiece(String piece) {
        String valeur = piece == null ? "AUTRE" : piece.trim().toUpperCase(java.util.Locale.ROOT);
        if (!java.util.Set.of("FACADE", "SALON", "CHAMBRE", "CUISINE", "SALLE_DE_BAIN", "TOILETTES",
                "BALCON_TERRASSE", "JARDIN_COUR", "PISCINE", "AUTRE").contains(valeur)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Catégorie de pièce invalide.");
        }
        return valeur;
    }

    @Transactional
    public void reordonner(UUID annonceId, AuthenticatedUser auteur, List<UUID> ordre) {
        annonces.verifierGestionPhotoAdmin(annonceId, auteur);
        annonces.annonceModifiable(annonceId, auteur);
        if (ordre == null || ordre.size() != photos.countByAnnonceId(annonceId)
                || ordre.size() > PHOTOS_MAX || new HashSet<>(ordre).size() != ordre.size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La liste des photos est invalide.");
        }
        List<PhotoAnnonce> existantes = photos.findAllByAnnonceIdOrderByOrdreAscCreeLeAsc(annonceId);
        var parId = existantes.stream().collect(java.util.stream.Collectors.toMap(PhotoAnnonce::getId, p -> p));
        if (!parId.keySet().equals(new HashSet<>(ordre))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La liste doit contenir exactement les photos de cette annonce.");
        }
        for (int i = 0; i < ordre.size(); i++) {
            parId.get(ordre.get(i)).setOrdre(i + 1);
        }
        photos.saveAll(existantes);
        audit.enregistrer("PHOTOS_REORDONNEES", auteur.id(), "Ordre des photos modifié pour l’annonce " + annonceId);
    }

    @Transactional(readOnly = true)
    public PhotoAnnonce lire(UUID annonceId, UUID photoId) {
        return photos.findByIdAndAnnonceId(photoId, annonceId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Photo introuvable."));
    }

    @Transactional
    public void remplacer(UUID annonceId, UUID photoId, AuthenticatedUser auteur, MultipartFile fichier) {
        annonces.verifierGestionPhotoAdmin(annonceId, auteur);
        annonces.annonceAvecAjoutDeContenu(annonceId, auteur);
        if (fichier == null || fichier.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Aucun fichier reçu.");
        }
        if (fichier.getSize() > TAILLE_MAX_OCTETS) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "La photo dépasse 5 Mo.");
        }
        byte[] contenu;
        try {
            contenu = fichier.getBytes();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Fichier illisible.");
        }
        String type = reconnaitreType(contenu);
        if (type == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Format refusé : seuls les JPEG et PNG sont acceptés.");
        }
        TraitementImage.Resultat propre;
        try {
            propre = TraitementImage.nettoyer(contenu, type);
        } catch (TraitementImage.ImageRefusee e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        PhotoAnnonce photo = lire(annonceId, photoId);
        photo.setContenu(propre.octets());
        photo.setTypeMime(propre.typeMime());
        annonces.marquerPhotosModifiees(annonceId);
        audit.enregistrer("PHOTO_REMPLACEE", auteur.id(), "Photo " + photoId + " de l'annonce " + annonceId);
    }

    @Transactional
    public void supprimer(UUID annonceId, UUID photoId, AuthenticatedUser auteur) {
        annonces.verifierGestionPhotoAdmin(annonceId, auteur);
        annonces.annonceModifiable(annonceId, auteur);
        PhotoAnnonce photo = lire(annonceId, photoId);
        photos.delete(photo);
        audit.enregistrer("PHOTO_SUPPRIMEE", auteur.id(), "Annonce " + annonceId);
    }

    /** Reconnaît JPEG ou PNG d'après les premiers octets. Tout le reste (dont SVG, WebP, HTML, PDF) est refusé. */
    static String reconnaitreType(byte[] c) {
        if (c.length >= 3 && (c[0] & 0xFF) == 0xFF && (c[1] & 0xFF) == 0xD8 && (c[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (c.length >= 8 && (c[0] & 0xFF) == 0x89 && c[1] == 'P' && c[2] == 'N' && c[3] == 'G'
            && c[4] == 0x0D && c[5] == 0x0A && c[6] == 0x1A && c[7] == 0x0A) {
            return "image/png";
        }
        return null;
    }
}
