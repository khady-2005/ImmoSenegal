package sn.immosenegal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.List;

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
import sn.immosenegal.agence.MandatGestion;
import sn.immosenegal.agence.MandatGestionRepository;
import sn.immosenegal.agence.MembreAgence;
import sn.immosenegal.agence.MembreAgenceRepository;
import sn.immosenegal.agence.OrigineMandatGestion;
import sn.immosenegal.agence.StatutAgence;
import sn.immosenegal.agence.StatutMandatGestion;
import sn.immosenegal.agence.StatutMembreAgence;
import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.annonce.AnnonceRepository;
import sn.immosenegal.annonce.StatutAnnonce;
import sn.immosenegal.annonce.TypeBien;
import sn.immosenegal.annonce.TypeTransaction;
import sn.immosenegal.notification.NotificationRepository;
import sn.immosenegal.reservation.Reservation;
import sn.immosenegal.reservation.ReservationRepository;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;

class DroitsMediasEtAvertissementTest extends AbstractApiTest {

    @Autowired private AgenceRepository agences;
    @Autowired private MembreAgenceRepository membres;
    @Autowired private AnnonceRepository annonces;
    @Autowired private MandatGestionRepository mandats;
    @Autowired private NotificationRepository notifications;
    @Autowired private ReservationRepository reservations;
    @Autowired private sn.immosenegal.agence.DossierAgenceRepository dossiersAgence;

    private static byte[] pngValide() throws Exception {
        BufferedImage img = new BufferedImage(10, 10, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return out.toByteArray();
    }

    private static byte[] mp4Valide() {
        return new byte[] { 0x00, 0x00, 0x00, 0x18, 'f', 't', 'y', 'p', 'm', 'p', '4', '2', 0, 0, 0, 0 };
    }

    private MockMultipartFile fichierPng(String nom) throws Exception {
        return new MockMultipartFile("fichier", nom, "image/png", pngValide());
    }

    private MockMultipartFile fichierMp4() {
        return new MockMultipartFile("fichier", "visite.mp4", "video/mp4", mp4Valide());
    }

    private User creerUtilisateur(Role role, String nom) {
        return users.save(new User(emailUnique(), encoder.encode(MOT_DE_PASSE), nom, null, role));
    }

    private Agence creerAgence(String nom, String slug, AgenceType type, User responsable) {
        Agence a = new Agence(nom, slug, type);
        a.setStatut(StatutAgence.ACTIVE);
        agences.save(a);
        MembreAgence m = new MembreAgence(a, responsable, FonctionAgence.RESPONSABLE);
        m.setStatut(StatutMembreAgence.ACTIF);
        membres.save(m);
        return a;
    }

    @Test
    void cas1_bienImmoSenegal_adminEtResponsableGerentMediasEtSuppressionSansAvertissement() throws Exception {
        User admin = creerUtilisateur(Role.ADMIN, "Admin");
        User resp = creerUtilisateur(Role.RESPONSABLE, "Responsable");
        User client = creerUtilisateur(Role.CLIENT, "Client");
        Agence interne = creerAgence("ImmoSénégal", "immosenegal-media-test", AgenceType.INTERNE, resp);

        Annonce bien = new Annonce(admin);
        bien.setTitre("Villa ImmoSénégal Test");
        bien.setTypeBien(TypeBien.VILLA);
        bien.setTypeTransaction(TypeTransaction.LOCATION);
        bien.setPrix(500_000L);
        bien.setSuperficie(new BigDecimal("200"));
        bien.setQuartier("Sacré-Cœur");
        bien.setVille("Dakar");
        bien.setAgence(interne);
        bien.setPublieeParAgence(true);
        bien.setStatut(StatutAnnonce.PUBLIEE);
        annonces.save(bien);

        String jwtAdmin = bearer(connecter(admin.getEmail()));
        String jwtResp = bearer(connecter(resp.getEmail()));
        String jwtClient = bearer(connecter(client.getEmail()));

        // Affichage "Agence ImmoSénégal"
        mvc.perform(get("/api/annonces/" + bien.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.proprietaire.nomComplet").value("Agence ImmoSénégal"));

        // Admin et Responsable ajoutent, remplacent, réordonnent (photo principale), ajoutent/suppriment vidéo
        MvcResult r1 = mvc.perform(multipart("/api/annonces/" + bien.getId() + "/photos")
                .file(fichierPng("p1.png")).header(HttpHeaders.AUTHORIZATION, jwtAdmin))
            .andExpect(status().isCreated()).andReturn();
        String p1 = JsonPath.read(r1.getResponse().getContentAsString(), "$.id");

        MvcResult r2 = mvc.perform(multipart("/api/annonces/" + bien.getId() + "/photos")
                .file(fichierPng("p2.png")).header(HttpHeaders.AUTHORIZATION, jwtResp))
            .andExpect(status().isCreated()).andReturn();
        String p2 = JsonPath.read(r2.getResponse().getContentAsString(), "$.id");

        mvc.perform(multipart("/api/annonces/" + bien.getId() + "/photos/" + p1)
                .file(fichierPng("remplace.png")).with(req -> { req.setMethod("PUT"); return req; })
                .header(HttpHeaders.AUTHORIZATION, jwtResp))
            .andExpect(status().isNoContent());

        mvc.perform(put("/api/annonces/" + bien.getId() + "/photos/ordre")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(List.of(p2, p1)))
                .header(HttpHeaders.AUTHORIZATION, jwtAdmin))
            .andExpect(status().isNoContent());

        mvc.perform(multipart("/api/annonces/" + bien.getId() + "/video")
                .file(fichierMp4()).header(HttpHeaders.AUTHORIZATION, jwtResp))
            .andExpect(status().isCreated());

        mvc.perform(delete("/api/annonces/" + bien.getId() + "/video")
                .header(HttpHeaders.AUTHORIZATION, jwtAdmin))
            .andExpect(status().isNoContent());

        // Accès interdit pour un client
        mvc.perform(multipart("/api/annonces/" + bien.getId() + "/photos")
                .file(fichierPng("intrus.png")).header(HttpHeaders.AUTHORIZATION, jwtClient))
            .andExpect(status().isForbidden());

        // Suppression impossible s'il y a une réservation en cours
        reservations.save(new Reservation(bien, client, "TEST"));
        mvc.perform(delete("/api/annonces/" + bien.getId())
                .header(HttpHeaders.AUTHORIZATION, jwtAdmin))
            .andExpect(status().isConflict());

        // Suppression réussie sur un bien ImmoSénégal sans réservation ni contrat
        Annonce sansResa = new Annonce(admin);
        sansResa.setTitre("Studio ImmoSénégal Libre");
        sansResa.setTypeBien(TypeBien.STUDIO);
        sansResa.setTypeTransaction(TypeTransaction.LOCATION);
        sansResa.setPrix(150_000L);
        sansResa.setSuperficie(new BigDecimal("40"));
        sansResa.setQuartier("Plateau");
        sansResa.setVille("Dakar");
        sansResa.setAgence(interne);
        sansResa.setPublieeParAgence(true);
        sansResa.setStatut(StatutAnnonce.PUBLIEE);
        annonces.save(sansResa);

        mvc.perform(delete("/api/annonces/" + sansResa.getId())
                .header(HttpHeaders.AUTHORIZATION, jwtResp))
            .andExpect(status().isNoContent());
    }

    @Test
    void cas2_bienConfieAvecMandatActif_conserveProprietaireEtLeNotifie() throws Exception {
        User admin = creerUtilisateur(Role.ADMIN, "Admin");
        User resp = creerUtilisateur(Role.RESPONSABLE, "Responsable");
        User proprio = creerUtilisateur(Role.PROPRIETAIRE, "Fatou Diop");
        Agence interne = creerAgence("ImmoSénégal", "immosenegal-mandat-test", AgenceType.INTERNE, resp);

        Annonce bienConfie = new Annonce(proprio);
        bienConfie.setTitre("Appartement Confié");
        bienConfie.setTypeBien(TypeBien.APPARTEMENT);
        bienConfie.setTypeTransaction(TypeTransaction.LOCATION);
        bienConfie.setPrix(300_000L);
        bienConfie.setSuperficie(new BigDecimal("110"));
        bienConfie.setQuartier("Mermoz");
        bienConfie.setVille("Dakar");
        bienConfie.setStatut(StatutAnnonce.PUBLIEE);
        annonces.save(bienConfie);

        MandatGestion mandat = new MandatGestion(interne, bienConfie, proprio, resp, OrigineMandatGestion.INITIATIVE_AGENCE);
        mandat.definirTauxCommissionMensuel(new BigDecimal("10.00"));
        mandat.decider(StatutMandatGestion.ACCEPTE);
        mandats.save(mandat);

        String jwtAdmin = bearer(connecter(admin.getEmail()));
        String jwtResp = bearer(connecter(resp.getEmail()));

        // Le vrai propriétaire est conservé
        mvc.perform(get("/api/annonces/" + bienConfie.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.proprietaire.nomComplet").value("Fatou Diop"));

        // Admin et Responsable peuvent gérer photos et vidéo sans avertissement
        MvcResult r1 = mvc.perform(multipart("/api/annonces/" + bienConfie.getId() + "/photos")
                .file(fichierPng("confie1.png")).header(HttpHeaders.AUTHORIZATION, jwtAdmin))
            .andExpect(status().isCreated()).andReturn();
        String p1 = JsonPath.read(r1.getResponse().getContentAsString(), "$.id");

        mvc.perform(multipart("/api/annonces/" + bienConfie.getId() + "/video")
                .file(fichierMp4()).header(HttpHeaders.AUTHORIZATION, jwtResp))
            .andExpect(status().isCreated());

        mvc.perform(delete("/api/annonces/" + bienConfie.getId() + "/photos/" + p1)
                .header(HttpHeaders.AUTHORIZATION, jwtResp))
            .andExpect(status().isNoContent());

        // Le propriétaire a été notifié des modifications
        var notifs = notifications.findTop30ByDestinataireIdOrderByCreeLeDesc(proprio.getId());
        assertThat(notifs).isNotEmpty();
        assertThat(notifs.get(0).getType()).isEqualTo("MEDIA_BIEN_CONFIE_MODIFIE");
    }

    @Test
    void cas3_autreBienProprietaire_protectionsConserveesEtAvertissementAutorise() throws Exception {
        User admin = creerUtilisateur(Role.ADMIN, "Admin");
        User resp = creerUtilisateur(Role.RESPONSABLE, "Responsable");
        User proprio = creerUtilisateur(Role.PROPRIETAIRE, "Moussa Ndiaye");
        creerAgence("ImmoSénégal", "immosenegal-autre-test", AgenceType.INTERNE, resp);

        Annonce bienProprio = new Annonce(proprio);
        bienProprio.setTitre("Maison Particulier");
        bienProprio.setTypeBien(TypeBien.MAISON);
        bienProprio.setTypeTransaction(TypeTransaction.VENTE);
        bienProprio.setPrix(45_000_000L);
        bienProprio.setSuperficie(new BigDecimal("250"));
        bienProprio.setQuartier("Liberté 6");
        bienProprio.setVille("Dakar");
        bienProprio.setStatut(StatutAnnonce.PUBLIEE);
        annonces.save(bienProprio);

        String jwtProprio = bearer(connecter(proprio.getEmail()));
        String jwtAdmin = bearer(connecter(admin.getEmail()));
        String jwtResp = bearer(connecter(resp.getEmail()));

        // Le propriétaire ajoute sa photo
        MvcResult r1 = mvc.perform(multipart("/api/annonces/" + bienProprio.getId() + "/photos")
                .file(fichierPng("perso.png")).header(HttpHeaders.AUTHORIZATION, jwtProprio))
            .andExpect(status().isCreated()).andReturn();
        String p1 = JsonPath.read(r1.getResponse().getContentAsString(), "$.id");

        // Admin bloqué sans avertissement (409) pour photo et vidéo
        mvc.perform(multipart("/api/annonces/" + bienProprio.getId() + "/photos")
                .file(fichierPng("intrus.png")).header(HttpHeaders.AUTHORIZATION, jwtAdmin))
            .andExpect(status().isConflict());

        mvc.perform(delete("/api/annonces/" + bienProprio.getId() + "/photos/" + p1)
                .header(HttpHeaders.AUTHORIZATION, jwtAdmin))
            .andExpect(status().isConflict());

        mvc.perform(multipart("/api/annonces/" + bienProprio.getId() + "/video")
                .file(fichierMp4()).header(HttpHeaders.AUTHORIZATION, jwtAdmin))
            .andExpect(status().isConflict());

        // Responsable interdit (403)
        mvc.perform(delete("/api/annonces/" + bienProprio.getId() + "/photos/" + p1)
                .header(HttpHeaders.AUTHORIZATION, jwtResp))
            .andExpect(status().isForbidden());

        // Admin envoie un avertissement avec succès
        mvc.perform(post("/api/admin/photos/" + bienProprio.getId() + "/" + p1 + "/avertir")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"motif\":\"Photo floue à remplacer\"}")
                .header(HttpHeaders.AUTHORIZATION, jwtAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.statut").value("EN_ATTENTE"));
    }

    @Test
    void visiteAgence_responsableRecoitNotifEtPeutAccepterOuRefuser() throws Exception {
        User admin = creerUtilisateur(Role.ADMIN, "Admin Visite");
        User resp = creerUtilisateur(Role.RESPONSABLE, "Resp Visite");
        User client = creerUtilisateur(Role.CLIENT, "Client Visite");
        User respPartenaire = creerUtilisateur(Role.RESPONSABLE, "Resp Partenaire");
        Agence interne = creerAgence("ImmoSénégal", "immosenegal-visite-test", AgenceType.INTERNE, resp);
        creerAgence("Partenaire", "partenaire-visite-test", AgenceType.PARTENAIRE, respPartenaire);

        Annonce bienAgence = new Annonce(admin);
        bienAgence.setTitre("Appartement Agence Visite");
        bienAgence.setTypeBien(TypeBien.APPARTEMENT);
        bienAgence.setTypeTransaction(TypeTransaction.LOCATION);
        bienAgence.setPrix(250_000L);
        bienAgence.setSuperficie(new BigDecimal("95"));
        bienAgence.setQuartier("Point E");
        bienAgence.setVille("Dakar");
        bienAgence.setAgence(interne);
        bienAgence.setPublieeParAgence(true);
        bienAgence.setStatut(StatutAnnonce.PUBLIEE);
        annonces.save(bienAgence);

        String jwtClient = bearer(connecter(client.getEmail()));
        String jwtResp = bearer(connecter(resp.getEmail()));
        String jwtPartenaire = bearer(connecter(respPartenaire.getEmail()));

        String dateFuture = java.time.LocalDateTime.now().plusDays(3).withNano(0).toString();
        MvcResult visiteRes = mvc.perform(post("/api/visites/annonces/" + bienAgence.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"dateVisite\":\"" + dateFuture + "\",\"message\":\"Visite TEST\"}")
                .header(HttpHeaders.AUTHORIZATION, jwtClient))
            .andExpect(status().isCreated()).andReturn();
        String visiteId = JsonPath.read(visiteRes.getResponse().getContentAsString(), "$.id");

        // Le responsable d'ImmoSénégal reçoit la notification et voit la visite dans /recues et /agence/{id}/visites
        assertThat(notifications.findTop30ByDestinataireIdOrderByCreeLeDesc(resp.getId())).isNotEmpty();

        mvc.perform(get("/api/visites/recues").header(HttpHeaders.AUTHORIZATION, jwtResp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == '" + visiteId + "')]").isNotEmpty());

        mvc.perform(get("/api/agence/" + interne.getId() + "/visites").header(HttpHeaders.AUTHORIZATION, jwtResp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == '" + visiteId + "')]").isNotEmpty());

        // Un responsable d'une agence partenaire est interdit (isolation)
        mvc.perform(get("/api/agence/" + interne.getId() + "/visites").header(HttpHeaders.AUTHORIZATION, jwtPartenaire))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/visites/" + visiteId + "/decision")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"action\":\"ACCEPTEE\",\"reponse\":\"OK\"}")
                .header(HttpHeaders.AUTHORIZATION, jwtPartenaire))
            .andExpect(status().isForbidden());

        // Le responsable d'ImmoSénégal accepte la visite
        mvc.perform(post("/api/visites/" + visiteId + "/decision")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"action\":\"ACCEPTEE\",\"reponse\":\"Rendez-vous confirmé\"}")
                .header(HttpHeaders.AUTHORIZATION, jwtResp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.statut").value("ACCEPTEE"));
    }

    @Test
    void missionsTousCollaborateurs_etSuspensionCompteAdmin() throws Exception {
        User admin = creerUtilisateur(Role.ADMIN, "Admin Suspend");
        User resp = creerUtilisateur(Role.RESPONSABLE, "Resp Missions");
        User caissier = creerUtilisateur(Role.CAISSIER, "Caissier Test");
        User assistant = creerUtilisateur(Role.ASSISTANT_ADMINISTRATIF, "Assistant Test");
        Agence interne = creerAgence("ImmoSénégal", "immosenegal-missions-test", AgenceType.INTERNE, resp);

        MembreAgence mCaissier = new MembreAgence(interne, caissier, FonctionAgence.CAISSIER);
        mCaissier.setStatut(StatutMembreAgence.ACTIF);
        membres.save(mCaissier);

        MembreAgence mAssistant = new MembreAgence(interne, assistant, FonctionAgence.ASSISTANT_ADMINISTRATIF);
        mAssistant.setStatut(StatutMembreAgence.ACTIF);
        membres.save(mAssistant);

        String jwtResp = bearer(connecter(resp.getEmail()));
        String jwtAdmin = bearer(connecter(admin.getEmail()));

        // Responsable attribue une mission au Caissier et à l'Assistant
        mvc.perform(post("/api/agence/" + interne.getId() + "/missions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"membreId\":\"" + mCaissier.getId() + "\",\"titre\":\"Clôturer la caisse du jour\"}")
                .header(HttpHeaders.AUTHORIZATION, jwtResp))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.fonction").value("CAISSIER"));

        mvc.perform(post("/api/agence/" + interne.getId() + "/missions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"membreId\":\"" + mAssistant.getId() + "\",\"titre\":\"Classer le dossier location\"}")
                .header(HttpHeaders.AUTHORIZATION, jwtResp))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.fonction").value("ASSISTANT_ADMINISTRATIF"));

        // Chaque collaborateur retrouve ses missions directement sur son compte (/api/agence/mes-missions)
        String jwtCaissier = bearer(connecter(caissier.getEmail()));
        String jwtAssistant = bearer(connecter(assistant.getEmail()));
        mvc.perform(get("/api/agence/mes-missions").header(HttpHeaders.AUTHORIZATION, jwtCaissier))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].titre").value("Clôturer la caisse du jour"));
        mvc.perform(get("/api/agence/mes-missions").header(HttpHeaders.AUTHORIZATION, jwtAssistant))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].titre").value("Classer le dossier location"));

        // Admin suspend le compte du caissier et la suspension persiste en base
        mvc.perform(patch("/api/admin/users/" + caissier.getId() + "/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"actif\":false}")
                .header(HttpHeaders.AUTHORIZATION, jwtAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.actif").value(false));

        assertThat(users.findById(caissier.getId()).orElseThrow().isActif()).isFalse();
    }

    @Test
    void bienAttribueAGestionnaire_recoitVisiteReservationContratEtCreeDossier() throws Exception {
        User admin = creerUtilisateur(Role.ADMIN, "Admin Flux");
        User resp = creerUtilisateur(Role.RESPONSABLE, "Resp Flux");
        User gest = creerUtilisateur(Role.GESTIONNAIRE, "Gest Flux");
        User client = creerUtilisateur(Role.CLIENT, "Client Flux");
        Agence interne = creerAgence("ImmoSénégal", "immosenegal-flux-test", AgenceType.INTERNE, resp);

        MembreAgence mGest = new MembreAgence(interne, gest, FonctionAgence.GESTIONNAIRE);
        mGest.setStatut(StatutMembreAgence.ACTIF);
        membres.save(mGest);

        Annonce bien = new Annonce(admin);
        bien.setTitre("Appartement Attribué Flux");
        bien.setTypeBien(TypeBien.APPARTEMENT);
        bien.setTypeTransaction(TypeTransaction.LOCATION);
        bien.setPrix(200_000L);
        bien.setSuperficie(new BigDecimal("85"));
        bien.setQuartier("Fann");
        bien.setVille("Dakar");
        bien.setAgence(interne);
        bien.setPublieeParAgence(true);
        bien.setStatut(StatutAnnonce.PUBLIEE);
        bien.setAgentMembreId(mGest.getId());
        annonces.save(bien);

        String jwtClient = bearer(connecter(client.getEmail()));
        String jwtGest = bearer(connecter(gest.getEmail()));

        // Client demande une visite -> Gestionnaire reçoit notif + accepte
        String dateFuture = java.time.LocalDateTime.now().plusDays(2).withNano(0).toString();
        MvcResult vRes = mvc.perform(post("/api/visites/annonces/" + bien.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"dateVisite\":\"" + dateFuture + "\",\"message\":\"Visite\"}")
                .header(HttpHeaders.AUTHORIZATION, jwtClient))
            .andExpect(status().isCreated()).andReturn();
        String visiteId = JsonPath.read(vRes.getResponse().getContentAsString(), "$.id");
        assertThat(notifications.findTop30ByDestinataireIdOrderByCreeLeDesc(gest.getId())).isNotEmpty();

        mvc.perform(post("/api/visites/" + visiteId + "/decision")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"action\":\"ACCEPTEE\",\"reponse\":\"OK\"}")
                .header(HttpHeaders.AUTHORIZATION, jwtGest))
            .andExpect(status().isOk());

        // Client réserve -> Gestionnaire reçoit notif + accepte + crée contrat -> DossierAgence CONTRAT créé
        MvcResult rRes = mvc.perform(post("/api/reservations/annonces/" + bien.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"message\":\"Réservation TEST\"}")
                .header(HttpHeaders.AUTHORIZATION, jwtClient))
            .andExpect(status().isCreated()).andReturn();
        String resId = JsonPath.read(rRes.getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/reservations/recues").header(HttpHeaders.AUTHORIZATION, jwtGest))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == '" + resId + "')]").isNotEmpty());

        mvc.perform(post("/api/reservations/" + resId + "/decision")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"action\":\"ACCEPTEE\",\"reponse\":\"Bienvenue\"}")
                .header(HttpHeaders.AUTHORIZATION, jwtGest))
            .andExpect(status().isOk());

        mvc.perform(post("/api/locations/reservations/" + resId + "/contrat")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"loyerMensuel\":200000,\"depotGarantie\":200000,\"dateDebut\":\"2026-12-01\"}")
                .header(HttpHeaders.AUTHORIZATION, jwtGest))
            .andExpect(status().isCreated());

        var dossiers = dossiersAgence.findAllByAgenceIdOrderByCreeLeDesc(interne.getId());
        assertThat(dossiers).anyMatch(d -> d.getCategorie() == sn.immosenegal.agence.DossierAgence.CategorieDossier.CONTRAT);
    }
}
