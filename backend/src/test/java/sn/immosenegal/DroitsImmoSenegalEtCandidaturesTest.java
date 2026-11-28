package sn.immosenegal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

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
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;

class DroitsImmoSenegalEtCandidaturesTest extends AbstractApiTest {

    @Autowired private AgenceRepository agences;
    @Autowired private MembreAgenceRepository membres;

    private User creerUtilisateur(Role role, String nom) {
        return users.save(new User(emailUnique(), encoder.encode(MOT_DE_PASSE), nom, null, role));
    }

    @Test
    void adminEtResponsableImmoSenegal_bugCreationSansProprio_isolationPartenaireEtParametres() throws Exception {
        Agence interne = agences.findFirstByTypeAndStatutOrderByCreeLeAsc(AgenceType.INTERNE, StatutAgence.ACTIVE)
            .orElseGet(() -> {
                Agence a = new Agence("ImmoSénégal", "immosenegal-test-" + UUID.randomUUID().toString().substring(0, 6), AgenceType.INTERNE);
                a.setStatut(StatutAgence.ACTIVE);
                return agences.save(a);
            });

        Agence partenaire = new Agence("Partenaire Test", "part-" + UUID.randomUUID().toString().substring(0, 6), AgenceType.PARTENAIRE);
        partenaire.setStatut(StatutAgence.ACTIVE);
        partenaire = agences.save(partenaire);

        User admin = creerUtilisateur(Role.ADMIN, "Admin Plateforme");
        User respInterne = creerUtilisateur(Role.RESPONSABLE, "Resp Interne");
        User agentInterne = creerUtilisateur(Role.AGENT, "Agent Interne");
        User respPartenaire = creerUtilisateur(Role.RESPONSABLE, "Resp Partenaire");
        User client = creerUtilisateur(Role.CLIENT, "Client Test");

        MembreAgence mResp = new MembreAgence(interne, respInterne, FonctionAgence.RESPONSABLE);
        mResp.setStatut(StatutMembreAgence.ACTIF);
        membres.save(mResp);

        MembreAgence mAgent = new MembreAgence(interne, agentInterne, FonctionAgence.AGENT);
        mAgent.setStatut(StatutMembreAgence.ACTIF);
        mAgent = membres.save(mAgent);

        MembreAgence mPart = new MembreAgence(partenaire, respPartenaire, FonctionAgence.RESPONSABLE);
        mPart.setStatut(StatutMembreAgence.ACTIF);
        membres.save(mPart);

        String tokenAdmin = connecter(admin.getEmail());
        String tokenResp = connecter(respInterne.getEmail());
        String tokenPart = connecter(respPartenaire.getEmail());
        String tokenClient = connecter(client.getEmail());

        // 1. Bug admin : Ajouter une annonce SANS proprietaireId -> 201 sur ImmoSénégal
        Map<String, Object> corpsAnnonce = new LinkedHashMap<>();
        corpsAnnonce.put("titre", "Appartement Agence Admin");
        corpsAnnonce.put("description", "Bien propre ImmoSénégal");
        corpsAnnonce.put("typeBien", "APPARTEMENT");
        corpsAnnonce.put("transaction", "LOCATION");
        corpsAnnonce.put("prix", 250000);
        corpsAnnonce.put("superficie", 110);
        corpsAnnonce.put("pieces", 4);
        corpsAnnonce.put("quartier", "Plateau-" + UUID.randomUUID().toString().substring(0, 6));
        corpsAnnonce.put("ville", "Dakar");

        MvcResult aRes = mvc.perform(post("/api/annonces")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(corpsAnnonce)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.publieeParAgence").value(true))
            .andReturn();
        String annonceId = JsonPath.read(aRes.getResponse().getContentAsString(), "$.id");

        // 2. Tableau de bord agence & attribution à un agent (ADMIN et RESPONSABLE)
        mvc.perform(get("/api/annonces/agence/" + interne.getId() + "/tableau")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id=='" + annonceId + "')]").exists());

        mvc.perform(patch("/api/annonces/agence/" + interne.getId() + "/" + annonceId + "/agent")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("membreId", mAgent.getId().toString()))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.agentMembreId").value(mAgent.getId().toString()));

        // 3. Isolation des agences partenaires : ADMIN interdit sur gestion interne partenaire (403)
        mvc.perform(post("/api/annonces?agenceId=" + partenaire.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(corpsAnnonce)))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/annonces/agence/" + partenaire.getId() + "/tableau")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/agence/" + partenaire.getId() + "/membres")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/agence/" + partenaire.getId() + "/membres")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenPart)))
            .andExpect(status().isOk());

        // 4. Réservations : RESPONSABLE autorisé à consulter et décider, ADMIN aussi, CLIENT interdit
        mvc.perform(post("/api/reservations")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("annonceId", annonceId, "message", "Je souhaite louer"))))
            .andExpect(status().isCreated());

        mvc.perform(get("/api/reservations/recues")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].annonceId").value(annonceId));

        // 5. Paramètres, abonnements, paiements ADMIN + accès interdit non-admin
        mvc.perform(get("/api/admin/parametres").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/parametres").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].cle").exists());
        mvc.perform(put("/api/admin/parametres/duree_gratuite_jours")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("valeur", "20"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valeur").value("20"));
        mvc.perform(get("/api/admin/abonnements").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/admin/paiements").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk());

        // 6. Vidéo : remplacement échoué conserve l'ancienne vidéo
        byte[] mp4Valide = new byte[] { 0, 0, 0, 24, 'f', 't', 'y', 'p', 'm', 'p', '4', '2', 0, 0, 0, 0 };
        MockMultipartFile videoOk = new MockMultipartFile("fichier", "visite.mp4", "video/mp4", mp4Valide);
        MockMultipartFile videoInvalide = new MockMultipartFile("fichier", "faux.mp4", "video/mp4", "pas-une-video".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/annonces/" + annonceId + "/video")
                .file(videoOk)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isCreated());

        mvc.perform(multipart("/api/annonces/" + annonceId + "/video")
                .file(videoInvalide)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isBadRequest());

        mvc.perform(get("/api/annonces/" + annonceId + "/video/info"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.disponible").value(true));
    }

    @Test
    void rejoindreAgence_cvPrive_uneSeuleDemandeEnAttente_etAccordPartenaire() throws Exception {
        Agence partenaire = new Agence("Partenaire Recrut", "recrut-" + UUID.randomUUID().toString().substring(0, 6), AgenceType.PARTENAIRE);
        partenaire.setStatut(StatutAgence.ACTIVE);
        partenaire = agences.save(partenaire);

        Agence autre = new Agence("Autre Agence", "autre-" + UUID.randomUUID().toString().substring(0, 6), AgenceType.PARTENAIRE);
        autre.setStatut(StatutAgence.ACTIVE);
        autre = agences.save(autre);

        User respPart = creerUtilisateur(Role.RESPONSABLE, "Resp Part");
        MembreAgence mResp = new MembreAgence(partenaire, respPart, FonctionAgence.RESPONSABLE);
        mResp.setStatut(StatutMembreAgence.ACTIF);
        membres.save(mResp);

        User candidat = creerUtilisateur(Role.CLIENT, "Candidat Dakar");
        User intrus = creerUtilisateur(Role.CLIENT, "Intrus");
        User admin = creerUtilisateur(Role.ADMIN, "Admin");

        String tokenCand = connecter(candidat.getEmail());
        String tokenResp = connecter(respPart.getEmail());
        String tokenIntrus = connecter(intrus.getEmail());
        String tokenAdmin = connecter(admin.getEmail());

        MockMultipartFile cvPdf = new MockMultipartFile("cv", "mon-cv.pdf", "application/pdf",
            "%PDF-1.4\n1 0 obj\n".getBytes(StandardCharsets.US_ASCII));

        // 1. Candidature valide avec téléphone, zone, motivation et CV privé -> 201
        MvcResult cRes = mvc.perform(multipart("/api/agence/" + partenaire.getId() + "/candidatures")
                .file(cvPdf)
                .param("fonction", "AGENT")
                .param("telephone", "771234567")
                .param("zone", "Almadies / Ngor")
                .param("motivation", "5 ans en transaction immobilière")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenCand)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.aCv").value(true))
            .andExpect(jsonPath("$.telephone").value("771234567"))
            .andReturn();
        String candId = JsonPath.read(cRes.getResponse().getContentAsString(), "$.id");

        // 2. Une seule demande en attente autorisée (même vers une autre agence) -> 409
        mvc.perform(multipart("/api/agence/" + autre.getId() + "/candidatures")
                .file(cvPdf)
                .param("fonction", "AGENT")
                .param("telephone", "771234567")
                .param("zone", "Plateau")
                .param("motivation", "Autre demande")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenCand)))
            .andExpect(status().isConflict());

        // 3. Aucun accès collaborateur avant acceptation -> 403
        mvc.perform(get("/api/agence/" + partenaire.getId() + "/membres")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenCand)))
            .andExpect(status().isForbidden());

        // 4. CV privé : candidat et responsable partenaire -> 200 ; intrus et admin (partenaire isolé) -> 403
        mvc.perform(get("/api/agence/" + partenaire.getId() + "/candidatures/" + candId + "/cv")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenCand)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/agence/" + partenaire.getId() + "/candidatures/" + candId + "/cv")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/agence/" + partenaire.getId() + "/candidatures/" + candId + "/cv")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenIntrus)))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/agence/" + partenaire.getId() + "/candidatures/" + candId + "/cv")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isForbidden());

        // 5. Responsable partenaire accepte -> le candidat devient membre actif
        mvc.perform(post("/api/agence/" + partenaire.getId() + "/candidatures/" + candId + "/decision")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("accepter", true))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.statut").value("ACCEPTEE"));

        mvc.perform(get("/api/agence/" + partenaire.getId() + "/membres")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenCand)))
            .andExpect(status().isOk());
    }
}
