package sn.immosenegal.annonce;

import java.io.IOException;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import sn.immosenegal.audit.AuditService;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.security.AuthenticatedUser;

@Service
public class VideoService {
    static final int TAILLE_MAX_OCTETS = 50 * 1024 * 1024;

    private final VideoRepository videos;
    private final AnnonceService annonces;
    private final AuditService audit;

    public VideoService(VideoRepository videos, AnnonceService annonces, AuditService audit) {
        this.videos = videos;
        this.annonces = annonces;
        this.audit = audit;
    }

    @Transactional
    public UUID ajouter(UUID annonceId, AuthenticatedUser auteur, MultipartFile fichier) {
        annonces.annonceAvecAjoutDeContenu(annonceId, auteur);
        if (fichier == null || fichier.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Aucune vidéo reçue.");
        }
        if (fichier.getSize() > TAILLE_MAX_OCTETS) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "La vidéo dépasse 50 Mo.");
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
        videos.deleteByAnnonceId(annonceId);
        VideoAnnonce video = videos.save(new VideoAnnonce(annonceId, contenu, type));
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
        annonces.annonceModifiable(annonceId, auteur);
        if (!videos.existsByAnnonceId(annonceId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Aucune vidéo pour cette annonce.");
        }
        videos.deleteByAnnonceId(annonceId);
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