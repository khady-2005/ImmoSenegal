package sn.immosenegal.annonce;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "annonce_videos")
public class VideoAnnonce {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "annonce_id", nullable = false, unique = true)
    private UUID annonceId;

    @Column
    private byte[] contenu;

    @Column(name = "url_externe", length = 500)
    private String urlExterne;

    @Column(name = "cloudinary_public_id", length = 255)
    private String cloudinaryPublicId;

    @Column(name = "type_mime", nullable = false, length = 20)
    private String typeMime;

    @Column(name = "cree_le", nullable = false)
    private Instant creeLe = Instant.now();

    protected VideoAnnonce() {}

    public VideoAnnonce(UUID annonceId, byte[] contenu, String typeMime) {
        this.annonceId = annonceId;
        this.contenu = contenu;
        this.typeMime = typeMime;
    }

    public VideoAnnonce(UUID annonceId, String urlExterne, String cloudinaryPublicId, String typeMime) {
        this.annonceId = annonceId;
        this.urlExterne = urlExterne;
        this.cloudinaryPublicId = cloudinaryPublicId;
        this.typeMime = typeMime;
    }

    public UUID getId() { return id; }
    public byte[] getContenu() { return contenu; }
    public String getUrlExterne() { return urlExterne; }
    public String getCloudinaryPublicId() { return cloudinaryPublicId; }
    public String getTypeMime() { return typeMime; }

    public void setContenu(byte[] contenu) { this.contenu = contenu; }
    public void setUrlExterne(String urlExterne) { this.urlExterne = urlExterne; }
    public void setCloudinaryPublicId(String cloudinaryPublicId) { this.cloudinaryPublicId = cloudinaryPublicId; }
    public void setTypeMime(String typeMime) { this.typeMime = typeMime; }
}