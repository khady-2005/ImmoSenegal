package sn.immosenegal.annonce;

import java.io.IOException;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import sn.immosenegal.audit.AuditService;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.security.AuthenticatedUser;

@Service
public class VideoService {
    static final int TAILLE_MAX_OCTETS = 150 * 1024 * 1024;

    private final VideoRepository videos;
    private final AnnonceService annonces;
    private final AuditService audit;
    private final CloudinaryService cloudinary;

    @Autowired
    public VideoService(VideoRepository videos, AnnonceService annonces, AuditService audit, CloudinaryService cloudinary) {
        this.videos = videos;
        this.annonces = annonces;
        this.audit = audit;
        this.cloudinary = cloudinary;
    }

    public VideoService(VideoRepository videos, AnnonceService annonces, AuditService audit) {
        this(videos, annonces, audit, null);
    }

    @Transactional
    public UUID ajouter(UUID annonceId, AuthenticatedUser auteur, MultipartFile fichier) {
        annonces.verifierGestionMedia(annonceId, auteur);
        annonces.annonceAvecAjoutDeContenu(annonceId, auteur);
        if (fichier == null || fichier.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Aucune vidéo reçue.");
        }
        if (fichier.getSize() > TAILLE_MAX_OCTETS) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "La vidéo dépasse 150 Mo.");
        }
        byte[] contenu;
        try {
            contenu = fichier.getBytes();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vidéo illisible.");
        }
        String type = reconnaitreType(contenu);
        if (type == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Format refusé : utilisez une vidéo MP4 ou WebM.");
        }
        VideoAnnonce existante = videos.findByAnnonceId(annonceId).orElse(null);
        String ancienPublicId = existante == null ? null : existante.getCloudinaryPublicId();
        VideoAnnonce video;
        if (cloudinary != null && cloudinary.estConfigure()) {
            String nomFichier = "video/webm".equals(type) ? "video.webm" : "video.mp4";
            CloudinaryService.UploadResult upload = cloudinary.televerserVideo(
                contenu, type, nomFichier, "immosenegal/videos/" + annonceId);
            if (existante != null) {
                existante.setUrlExterne(upload.secureUrl());
                existante.setCloudinaryPublicId(upload.publicId());
                existante.setContenu(null);
                existante.setTypeMime(type);
                video = videos.save(existante);
            } else {
                video = videos.save(new VideoAnnonce(annonceId, upload.secureUrl(), upload.publicId(), type));
            }
            if (ancienPublicId != null && !ancienPublicId.equals(upload.publicId())) {
                cloudinary.supprimerVideo(ancienPublicId);
            }
        } else {
            if (existante != null) {
                existante.setContenu(contenu);
                existante.setUrlExterne(null);
                existante.setCloudinaryPublicId(null);
                existante.setTypeMime(type);
                video = videos.save(existante);
            } else {
                video = videos.save(new VideoAnnonce(annonceId, contenu, type));
            }
        }
        annonces.notifierProprietaireSiBienConfie(annonceId, auteur,
            existante != null ? "La vidéo de votre bien confié a été remplacée" : "Une vidéo a été ajoutée à votre bien confié");
        audit.enregistrer("VIDEO_ANNONCE_AJOUTEE", auteur.id(), "Annonce " + annonceId);
        return video.getId();
    }

    @Transactional(readOnly = true)
    public VideoAnnonce lire(UUID annonceId) {
        return videos.findByAnnonceId(annonceId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Aucune vidéo pour cette annonce."));
    }

    @Transactional(readOnly = true)
    public boolean existe(UUID annonceId) {
        return videos.findByAnnonceId(annonceId).isPresent();
    }

    @Transactional
    public void supprimer(UUID annonceId, AuthenticatedUser auteur) {
        annonces.verifierGestionMedia(annonceId, auteur);
        annonces.annonceModifiable(annonceId, auteur);
        VideoAnnonce video = videos.findByAnnonceId(annonceId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Aucune vidéo pour cette annonce."));
        String publicId = video.getCloudinaryPublicId();
        videos.delete(video);
        if (cloudinary != null && publicId != null) {
            cloudinary.supprimerVideo(publicId);
        }
        annonces.notifierProprietaireSiBienConfie(annonceId, auteur, "La vidéo de votre bien confié a été supprimée");
        audit.enregistrer("VIDEO_ANNONCE_SUPPRIMEE", auteur.id(), "Annonce " + annonceId);
    }

    /** MP4 : signature ftyp ; WebM : signature EBML. Le nom et le type déclarés par le navigateur ne sont pas fiables. */
    static String reconnaitreType(byte[] c) {
        if (c.length >= 12 && c[4] == 'f' && c[5] == 't' && c[6] == 'y' && c[7] == 'p') return "video/mp4";
        if (c.length >= 4 && (c[0] & 0xFF) == 0x1A && (c[1] & 0xFF) == 0x45
            && (c[2] & 0xFF) == 0xDF && (c[3] & 0xFF) == 0xA3) return "video/webm";
        return null;
    }
}