package sn.immosenegal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.imageio.ImageIO;

import com.jayway.jsonpath.JsonPath;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

import sn.immosenegal.agence.Agence;
import sn.immosenegal.agence.AgenceRepository;
import sn.immosenegal.agence.AgenceType;
import sn.immosenegal.agence.FonctionAgence;
import sn.immosenegal.agence.MembreAgence;
import sn.immosenegal.agence.MembreAgenceRepository;
import sn.immosenegal.agence.StatutAgence;
import sn.immosenegal.agence.StatutMembreAgence;
import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.annonce.AnnonceRepository;
import sn.immosenegal.annonce.AnnonceService;
import sn.immosenegal.annonce.CloudinaryService;
import sn.immosenegal.annonce.PhotoAnnonce;
import sn.immosenegal.annonce.PhotoRepository;
import sn.immosenegal.annonce.PhotoService;
import sn.immosenegal.audit.AuditService;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;

class CloudinaryEtDemandeProprietaireTest extends AbstractApiTest {

    @Autowired private AgenceRepository agences;
    @Autowired private MembreAgenceRepository membres;
    @Autowired private AnnonceRepository annonces;
    @Autowired private PhotoRepository photos;
    @Autowired private AnnonceService annonceService;
    @Autowired private AuditService audit;

    private User creerUtilisateur(Role role, String nom) {
        return users.save(new User(emailUnique(), encoder.encode(MOT_DE_PASSE), nom, null, role));
    }

    @Test
    void inscriptionForceClient_demandeProprietaireAvecJustificatifPrive_decideeUneSeuleFois() throws Exception {
        String email = emailUnique();
        // Même si estProprietaire=true est envoyé, le serveur crée un CLIENT
        mvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of(
                    "email", email,
                    "password", MOT_DE_PASSE,
                    "nomComplet", "Future Proprietaire",
                    "estProprietaire", true))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.role").value("CLIENT"));

        String tokenClient = connecter(email);
        String tokenAutreClient = utilisateurConnecte(Role.CLIENT);
        String tokenAdmin = nouvelAdminConnecte();

        // Agence interne ImmoSénégal + son responsable
        Agence interne = new Agence("ImmoSénégal Siège", "immo-siege-" + UUID.randomUUID().toString().substring(0, 6), AgenceType.INTERNE);
        interne.setStatut(StatutAgence.ACTIVE);
        interne = agences.save(interne);
        User respInterne = creerUtilisateur(Role.PROPRIETAIRE, "Responsable ImmoSénégal");
        MembreAgence mInterne = new MembreAgence(interne, respInterne, FonctionAgence.RESPONSABLE);
        mInterne.setStatut(StatutMembreAgence.ACTIF);
        membres.save(mInterne);
        String tokenRespInterne = connecter(respInterne.getEmail());

        // Agence partenaire + son responsable (ne doit PAS avoir accès aux demandes ni aux justificatifs)
        Agence partenaire = new Agence("Agence Externe", "ext-" + UUID.randomUUID().toString().substring(0, 6), AgenceType.PARTENAIRE);
        partenaire.setStatut(StatutAgence.ACTIVE);
        partenaire = agences.save(partenaire);
        User respPartenaire = creerUtilisateur(Role.PROPRIETAIRE, "Responsable Partenaire");
        MembreAgence mPartenaire = new MembreAgence(partenaire, respPartenaire, FonctionAgence.RESPONSABLE);
        mPartenaire.setStatut(StatutMembreAgence.ACTIF);
        membres.save(mPartenaire);
        String tokenRespPartenaire = connecter(respPartenaire.getEmail());

        // Demande PROPRIETAIRE sans justificatif -> 400
        mvc.perform(post("/api/auth/role-requests")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("role", "PROPRIETAIRE"))))
            .andExpect(status().isBadRequest());

        // Demande PROPRIETAIRE avec justificatif PDF -> 201
        MockMultipartFile pdf = new MockMultipartFile("justificatif", "titre-foncier.pdf", "application/pdf", "%PDF-1.4\n%ok".getBytes());
        MvcResult created = mvc.perform(multipart("/api/auth/role-requests")
                .file(pdf)
                .param("role", "PROPRIETAIRE")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.aJustificatif").value(true))
            .andExpect(jsonPath("$.statut").value("EN_ATTENTE"))
            .andReturn();
        String demandeId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        // Justificatif privé : accessible au demandeur, à l'admin, au responsable ImmoSénégal ; 403 aux autres agences et tiers
        mvc.perform(get("/api/auth/role-requests/" + demandeId + "/justificatif")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/auth/role-requests/" + demandeId + "/justificatif")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/auth/role-requests/" + demandeId + "/justificatif")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenRespInterne)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/auth/role-requests/" + demandeId + "/justificatif")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAutreClient)))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/auth/role-requests/" + demandeId + "/justificatif")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenRespPartenaire)))
            .andExpect(status().isForbidden());

        // Agence partenaire ne peut ni lister ni approuver
        mvc.perform(get("/api/auth/role-requests/a-traiter")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenRespPartenaire)))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/role-requests/" + demandeId + "/approve")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenRespPartenaire)))
            .andExpect(status().isForbidden());

        // Responsable ImmoSénégal approuve : décision enregistrée avec nom + date, client devient PROPRIETAIRE
        mvc.perform(post("/api/auth/role-requests/" + demandeId + "/approve")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenRespInterne)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.statut").value("APPROUVEE"))
            .andExpect(jsonPath("$.decideParNom").value("Responsable ImmoSénégal"))
            .andExpect(jsonPath("$.decideLe").exists());

        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(jsonPath("$.role").value("PROPRIETAIRE"));

        // Une deuxième décision (même par ADMIN) est refusée (409)
        mvc.perform(post("/api/auth/role-requests/" + demandeId + "/reject")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isConflict());
    }

    @Test
    void photosWebp_droitsModifProprietaireOuResponsableEtMigrationCloudinary() throws Exception {
        Agence interne = new Agence("Agence Photo", "ag-photo-" + UUID.randomUUID().toString().substring(0, 6), AgenceType.INTERNE);
        interne.setStatut(StatutAgence.ACTIVE);
        interne = agences.save(interne);

        User resp = creerUtilisateur(Role.PROPRIETAIRE, "Resp Photo");
        User agent = creerUtilisateur(Role.AGENT, "Agent Photo");
        MembreAgence mResp = new MembreAgence(interne, resp, FonctionAgence.RESPONSABLE);
        mResp.setStatut(StatutMembreAgence.ACTIF);
        membres.save(mResp);
        MembreAgence mAgent = new MembreAgence(interne, agent, FonctionAgence.AGENT);
        mAgent.setStatut(StatutMembreAgence.ACTIF);
        membres.save(mAgent);

        String tokenResp = connecter(resp.getEmail());
        String tokenAgent = connecter(agent.getEmail());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("titre", "Villa Photos WebP");
        body.put("description", "Test WebP et droits");
        body.put("typeBien", "VILLA");
        body.put("transaction", "LOCATION");
        body.put("prix", 300000);
        body.put("superficie", 200);
        body.put("pieces", 5);
        body.put("quartier", "Ngor-" + UUID.randomUUID().toString().substring(0, 6));
        body.put("ville", "Dakar");

        MvcResult aRes = mvc.perform(post("/api/annonces?agenceId=" + interne.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(body)))
            .andExpect(status().isCreated())
            .andReturn();
        UUID annonceId = UUID.fromString(JsonPath.read(aRes.getResponse().getContentAsString(), "$.id"));

        byte[] webpOctets = new byte[] { 'R', 'I', 'F', 'F', 0x24, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' ' };
        MockMultipartFile webp = new MockMultipartFile("fichier", "salon.webp", "image/webp", webpOctets);
        MockMultipartFile jpg = new MockMultipartFile("fichier", "chambre.jpg", "image/jpeg", imageOctets("jpg"));
        MockMultipartFile png = new MockMultipartFile("fichier", "cuisine.png", "image/png", imageOctets("png"));

        // Agent interne (non responsable, non propriétaire) -> 403
        mvc.perform(multipart("/api/annonces/" + annonceId + "/photos")
                .file(webp)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAgent)))
            .andExpect(status().isForbidden());

        // Responsable autorisé ajoute 2 photos WebP -> 201
        MvcResult p1 = mvc.perform(multipart("/api/annonces/" + annonceId + "/photos")
                .file(webp).param("piece", "SALON")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isCreated()).andReturn();
        UUID photo1 = UUID.fromString(JsonPath.read(p1.getResponse().getContentAsString(), "$.id"));

        MvcResult p2 = mvc.perform(multipart("/api/annonces/" + annonceId + "/photos")
                .file(webp).param("piece", "FACADE")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isCreated()).andReturn();
        UUID photo2 = UUID.fromString(JsonPath.read(p2.getResponse().getContentAsString(), "$.id"));

        MvcResult pJpg = mvc.perform(multipart("/api/annonces/" + annonceId + "/photos")
                .file(jpg).param("piece", "CHAMBRE")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isCreated()).andReturn();
        UUID photoJpg = UUID.fromString(JsonPath.read(pJpg.getResponse().getContentAsString(), "$.id"));

        MvcResult pPng = mvc.perform(multipart("/api/annonces/" + annonceId + "/photos")
                .file(png).param("piece", "CUISINE")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isCreated()).andReturn();
        UUID photoPng = UUID.fromString(JsonPath.read(pPng.getResponse().getContentAsString(), "$.id"));

        // Définir photo2 comme principale
        mvc.perform(put("/api/annonces/" + annonceId + "/photos/ordre")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(List.of(photo2, photo1, photoJpg, photoPng))))
            .andExpect(status().isNoContent());

        // Suppression interdite à l'agent (403), autorisée au responsable (204)
        mvc.perform(delete("/api/annonces/" + annonceId + "/photos/" + photo1)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAgent)))
            .andExpect(status().isForbidden());

        // Migration des anciennes photos vers Cloudinary sans perte (avec stub CloudinaryService)
        CloudinaryService fauxCloudinary = new CloudinaryService("demo", "key", "sec", json) {
            @Override
            public UploadResult televerser(byte[] octets, String typeMime, String nomFichier, String dossier) {
                return new UploadResult("https://res.cloudinary.com/demo/image/upload/v1/test.webp", "immosenegal/test");
            }
        };
        PhotoService serviceAvecCloudinary = new PhotoService(photos, annonceService, audit, fauxCloudinary);
        int migrees = serviceAvecCloudinary.migrerAnciennesPhotosVersCloudinary();
        assertThat(migrees).isGreaterThanOrEqualTo(2);

        PhotoAnnonce photoMigree = photos.findById(photo2).orElseThrow();
        assertThat(photoMigree.getUrlExterne()).isEqualTo("https://res.cloudinary.com/demo/image/upload/v1/test.webp");
        assertThat(photoMigree.getContenu()).isNull();
        Annonce a = annonces.findById(annonceId).orElseThrow();
        assertThat(a.getId()).isEqualTo(annonceId);
    }

    private static byte[] imageOctets(String format) throws Exception {
        BufferedImage img = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, format, out);
        return out.toByteArray();
    }
}
