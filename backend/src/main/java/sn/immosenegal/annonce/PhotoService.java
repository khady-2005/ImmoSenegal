package sn.immosenegal.annonce;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import sn.immosenegal.audit.AuditService;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.security.AuthenticatedUser;

/**
 * Photos d'annonces. Règles : seul le propriétaire du bien ou le responsable autorisé ajoute/supprime/réordonne ;
 * le type réel du fichier est reconnu par son contenu (JPEG, PNG ou WebP), 5 Mo et 15 photos au maximum.
 * En production (Cloudinary configuré), les photos sont envoyées vers Cloudinary ; sinon stockées en base.
 */
@Service
public class PhotoService {

    static final int TAILLE_MAX_OCTETS = 5 * 1024 * 1024;
    static final int PHOTOS_MAX = 15;

    private final PhotoRepository photos;
    private final AnnonceService annonces;
    private final AuditService audit;
    private final CloudinaryService cloudinary;

    @Autowired
    public PhotoService(PhotoRepository photos, AnnonceService annonces, AuditService audit, CloudinaryService cloudinary) {
        this.photos = photos;
        this.annonces = annonces;
        this.audit = audit;
        this.cloudinary = cloudinary;
    }

    public PhotoService(PhotoRepository photos, AnnonceService annonces, AuditService audit) {
        this(photos, annonces, audit, null);
    }

    @Transactional
    public UUID ajouter(UUID annonceId, AuthenticatedUser auteur, MultipartFile fichier) {
        return ajouter(annonceId, auteur, fichier, "AUTRE");
    }

    @Transactional
    public UUID ajouter(UUID annonceId, AuthenticatedUser auteur, MultipartFile fichier, String piece) {
        annonces.verifierGestionPhotoAdmin(annonceId, auteur);
        annonces.verifierModificationPhoto(annonceId, auteur);
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
            throw new ApiException(HttpStatus.BAD_REQUEST, "Format refusé : seuls les JPEG, PNG et WebP sont acceptés.");
        }
        if (photos.countByAnnonceId(annonceId) >= PHOTOS_MAX) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Une annonce ne peut pas avoir plus de " + PHOTOS_MAX + " photos.");
        }

        TraitementImage.Resultat propre = nettoyerSiPossible(contenu, type);
        int ordre = photos.ordreMax(annonceId) + 1;
        PhotoAnnonce photo;
        if (cloudinary != null && cloudinary.estConfigure()) {
            CloudinaryService.UploadResult upload = cloudinary.televerser(
                propre.octets(), propre.typeMime(), nomPropre(propre.typeMime()), "immosenegal/annonces/" + annonceId);
            photo = new PhotoAnnonce(annonceId, upload.secureUrl(), upload.publicId(), propre.typeMime(), ordre);
        } else {
            photo = new PhotoAnnonce(annonceId, propre.octets(), propre.typeMime(), ordre);
        }
        photo.setPiece(normaliserPiece(piece));
        photo = photos.save(photo);
        annonces.marquerPhotosModifiees(annonceId);
        audit.enregistrer("PHOTO_AJOUTEE", auteur.id(), "Annonce " + annonceId);
        return photo.getId();
    }

    public record PhotoMetadata(UUID id, String piece, int ordre, String url) {}

    @Transactional(readOnly = true)
    public List<PhotoMetadata> metadata(UUID annonceId) {
        return photos.findAllByAnnonceIdOrderByOrdreAscCreeLeAsc(annonceId).stream()
            .map(p -> new PhotoMetadata(p.getId(), p.getPiece(), p.getOrdre(), p.getUrlExterne())).toList();
    }

    @Transactional
    public void classer(UUID annonceId, UUID photoId, AuthenticatedUser auteur, String piece) {
        annonces.verifierGestionPhotoAdmin(annonceId, auteur);
        annonces.verifierModificationPhoto(annonceId, auteur);
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
        annonces.verifierModificationPhoto(annonceId, auteur);
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
        annonces.verifierModificationPhoto(annonceId, auteur);
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
            throw new ApiException(HttpStatus.BAD_REQUEST, "Format refusé : seuls les JPEG, PNG et WebP sont acceptés.");
        }
        TraitementImage.Resultat propre = nettoyerSiPossible(contenu, type);
        PhotoAnnonce photo = lire(annonceId, photoId);
        if (cloudinary != null && cloudinary.estConfigure()) {
            String ancienPublicId = photo.getCloudinaryPublicId();
            CloudinaryService.UploadResult upload = cloudinary.televerser(
                propre.octets(), propre.typeMime(), nomPropre(propre.typeMime()), "immosenegal/annonces/" + annonceId);
            photo.setUrlExterne(upload.secureUrl());
            photo.setCloudinaryPublicId(upload.publicId());
            photo.setContenu(null);
            if (ancienPublicId != null) {
                cloudinary.supprimer(ancienPublicId);
            }
        } else {
            photo.setContenu(propre.octets());
        }
        photo.setTypeMime(propre.typeMime());
        annonces.marquerPhotosModifiees(annonceId);
        audit.enregistrer("PHOTO_REMPLACEE", auteur.id(), "Photo " + photoId + " de l'annonce " + annonceId);
    }

    @Transactional
    public void supprimer(UUID annonceId, UUID photoId, AuthenticatedUser auteur) {
        annonces.verifierGestionPhotoAdmin(annonceId, auteur);
        annonces.verifierModificationPhoto(annonceId, auteur);
        annonces.annonceModifiable(annonceId, auteur);
        PhotoAnnonce photo = lire(annonceId, photoId);
        String publicId = photo.getCloudinaryPublicId();
        photos.delete(photo);
        if (cloudinary != null && publicId != null) {
            cloudinary.supprimer(publicId);
        }
        audit.enregistrer("PHOTO_SUPPRIMEE", auteur.id(), "Annonce " + annonceId);
    }

    /** Transfère les anciennes photos stockées en base vers Cloudinary sans en perdre aucune. */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public int migrerAnciennesPhotosVersCloudinary() {
        if (cloudinary == null || !cloudinary.estConfigure()) {
            return 0;
        }
        int transferees = 0;
        for (PhotoAnnonce photo : photos.findAllByUrlExterneIsNullAndContenuIsNotNull()) {
            try {
                CloudinaryService.UploadResult upload = cloudinary.televerser(
                    photo.getContenu(), photo.getTypeMime(), nomPropre(photo.getTypeMime()),
                    "immosenegal/annonces/" + photo.getAnnonceId());
                photo.setUrlExterne(upload.secureUrl());
                photo.setCloudinaryPublicId(upload.publicId());
                photo.setContenu(null);
                photos.save(photo);
                transferees++;
            } catch (Exception ignored) {
                // On conserve photo.getContenu() en base pour ne perdre aucune ancienne photo.
            }
        }
        return transferees;
    }

    private static TraitementImage.Resultat nettoyerSiPossible(byte[] contenu, String type) {
        if ("image/webp".equals(type)) {
            return new TraitementImage.Resultat(contenu, "image/webp");
        }
        try {
            return TraitementImage.nettoyer(contenu, type);
        } catch (TraitementImage.ImageRefusee e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    private static String nomPropre(String typeMime) {
        return switch (typeMime) {
            case "image/png" -> "photo.png";
            case "image/webp" -> "photo.webp";
            default -> "photo.jpg";
        };
    }

    /** Reconnaît JPEG, PNG ou WebP d'après les premiers octets. Tout le reste (SVG, HTML, PDF...) est refusé. */
    static String reconnaitreType(byte[] c) {
        if (c.length >= 3 && (c[0] & 0xFF) == 0xFF && (c[1] & 0xFF) == 0xD8 && (c[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (c.length >= 8 && (c[0] & 0xFF) == 0x89 && c[1] == 'P' && c[2] == 'N' && c[3] == 'G'
            && c[4] == 0x0D && c[5] == 0x0A && c[6] == 0x1A && c[7] == 0x0A) {
            return "image/png";
        }
        if (c.length >= 12 && c[0] == 'R' && c[1] == 'I' && c[2] == 'F' && c[3] == 'F'
            && c[8] == 'W' && c[9] == 'E' && c[10] == 'B' && c[11] == 'P') {
            return "image/webp";
        }
        return null;
    }
}
