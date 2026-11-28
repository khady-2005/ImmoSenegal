package sn.immosenegal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.jayway.jsonpath.JsonPath;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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

class CouvertureSecondaireTest extends AbstractApiTest {

    @Autowired private AgenceRepository agences;
    @Autowired private MembreAgenceRepository membres;

    private User creerUtilisateur(Role role, String nom) {
        return users.save(new User(emailUnique(), encoder.encode(MOT_DE_PASSE), nom, null, role));
    }

    private UUID publierAnnonce(String tokenProprio, String quartier) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("titre", "Bien " + quartier);
        body.put("description", "Description complète");
        body.put("typeBien", "MAISON");
        body.put("transaction", "LOCATION");
        body.put("prix", 150000);
        body.put("superficie", 110);
        body.put("pieces", 4);
        body.put("quartier", quartier);
        body.put("ville", "Dakar");
        MvcResult res = mvc.perform(post("/api/annonces")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(body)))
            .andExpect(status().isCreated())
            .andReturn();
        return UUID.fromString(JsonPath.read(res.getResponse().getContentAsString(), "$.id"));
    }

    @Test
    void assistantIaAvisFavorisOffresEtAdminUsers() throws Exception {
        User proprio = creerUtilisateur(Role.PROPRIETAIRE, "Proprio Sec");
        User client = creerUtilisateur(Role.CLIENT, "Client Sec");
        User cible = creerUtilisateur(Role.CLIENT, "Utilisateur Cible");
        String tokenProprio = connecter(proprio.getEmail());
        String tokenClient = connecter(client.getEmail());
        String tokenAdmin = nouvelAdminConnecte();

        UUID annonceId = publierAnnonce(tokenProprio, "S-" + UUID.randomUUID().toString().substring(0, 8));

        // Assistant IA (200 si clé configurée, 503 en environnement CI sans clé)
        mvc.perform(post("/api/assistant/conversation")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("message", "Comment louer un appartement à Dakar ?"))))
            .andExpect(status().is(org.hamcrest.Matchers.anyOf(org.hamcrest.Matchers.is(200), org.hamcrest.Matchers.is(503))));

        // Avis (liste publique + refus 403 si pas de visite effectuée)
        mvc.perform(get("/api/annonces/" + annonceId + "/avis")).andExpect(status().isOk());
        mvc.perform(post("/api/annonces/" + annonceId + "/avis")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("note", 5, "commentaire", "Super"))))
            .andExpect(status().isForbidden());

        // Favoris
        mvc.perform(post("/api/favoris/" + annonceId).header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().is2xxSuccessful());
        mvc.perform(get("/api/favoris").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isOk());
        mvc.perform(delete("/api/favoris/" + annonceId).header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().is2xxSuccessful());

        // Offres (listes)
        mvc.perform(get("/api/offres/envoyees").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/offres/recues").header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/offres/toutes").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/offres-location/envoyees").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/offres-location/recues").header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/offres-location/toutes").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk());

        // Admin Users : suspendre puis réactiver, changer rôle
        mvc.perform(patch("/api/admin/users/" + cible.getId() + "/status")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("actif", false))))
            .andExpect(status().isOk());
        mvc.perform(patch("/api/admin/users/" + cible.getId() + "/role")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("role", "PROPRIETAIRE"))))
            .andExpect(status().isOk());

        // Abonnement manuel + décision admin
        MvcResult aboDemRes = mvc.perform(post("/api/abonnements/demande")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("forfait", "TRIMESTRIEL", "modePaiement", "WAVE", "referencePaiement", "WAV-99"))))
            .andExpect(status().isCreated())
            .andReturn();
        String aboId = JsonPath.read(aboDemRes.getResponse().getContentAsString(), "$.id");
        mvc.perform(post("/api/abonnements/admin/" + aboId + "/decision")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("accepter", true, "motif", "Paiement vérifié"))))
            .andExpect(status().isOk());
    }

    @Test
    void agenceMissionsCrmMandatsCandidaturesEtInscription() throws Exception {
        String tokenAdmin = nouvelAdminConnecte();
        User proprio = creerUtilisateur(Role.PROPRIETAIRE, "Proprio Mandat");
        User resp = creerUtilisateur(Role.PROPRIETAIRE, "Resp Partenaire");
        User agent = creerUtilisateur(Role.AGENT, "Agent Collaborateur");
        User candidat = creerUtilisateur(Role.CLIENT, "Candidat Agent");
        String tokenProprio = connecter(proprio.getEmail());
        String tokenResp = connecter(resp.getEmail());
        String tokenAgent = connecter(agent.getEmail());
        String tokenCandidat = connecter(candidat.getEmail());

        // Inscription agence partenaire + validation admin
        MvcResult agRes = mvc.perform(post("/api/agence/inscription")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of(
                    "nom", "Partenaire " + UUID.randomUUID().toString().substring(0, 6),
                    "description", "Agence partenaire test",
                    "emailContact", "contact@partenaire.sn",
                    "telephoneContact", "+221770000000",
                    "adresse", "Plateau, Dakar"))))
            .andExpect(status().isCreated())
            .andReturn();
        UUID agenceId = UUID.fromString(JsonPath.read(agRes.getResponse().getContentAsString(), "$.id"));

        mvc.perform(patch("/api/admin/agences/" + agenceId + "/statut")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("statut", "ACTIVE"))))
            .andExpect(status().isOk());

        Agence ag = agences.findById(agenceId).orElseThrow();
        MembreAgence mAgent = new MembreAgence(ag, agent, FonctionAgence.AGENT);
        mAgent.setStatut(StatutMembreAgence.ACTIF);
        mAgent = membres.save(mAgent);

        // Missions
        MvcResult misRes = mvc.perform(post("/api/agence/" + agenceId + "/missions")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of(
                    "membreId", mAgent.getId().toString(),
                    "titre", "Visiter le bien",
                    "description", "Préparer la fiche",
                    "dateEcheance", LocalDate.now().plusDays(5).toString()))))
            .andExpect(status().isCreated())
            .andReturn();
        String missionId = JsonPath.read(misRes.getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/agence/" + agenceId + "/missions").header(HttpHeaders.AUTHORIZATION, bearer(tokenAgent)))
            .andExpect(status().isOk());
        mvc.perform(patch("/api/agence/" + agenceId + "/missions/" + missionId + "/statut")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAgent))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("statut", "EN_COURS"))))
            .andExpect(status().isOk());
        mvc.perform(patch("/api/agence/" + agenceId + "/missions/" + missionId + "/rapport")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAgent))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("rapport", "Visite effectuée avec succès."))))
            .andExpect(status().isOk());

        // CRM Contacts & Activités
        MvcResult crmRes = mvc.perform(post("/api/agence/" + agenceId + "/crm/contacts")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAgent))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("nom", "Mamadou Diallo", "telephone", "771234567", "typeBesoin", "LOCATION", "recherche", "Villa 4 pièces"))))
            .andExpect(status().isCreated())
            .andReturn();
        String contactId = JsonPath.read(crmRes.getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/agence/" + agenceId + "/crm/contacts").header(HttpHeaders.AUTHORIZATION, bearer(tokenAgent)))
            .andExpect(status().isOk());
        mvc.perform(post("/api/agence/" + agenceId + "/crm/contacts/" + contactId + "/activites")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAgent))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("type", "APPEL", "contenu", "Premier appel"))))
            .andExpect(status().isCreated());
        mvc.perform(get("/api/agence/" + agenceId + "/crm/contacts/" + contactId + "/activites")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAgent)))
            .andExpect(status().isOk());

        // Mandats de gestion
        UUID annonceId = publierAnnonce(tokenProprio, "MD-" + UUID.randomUUID().toString().substring(0, 8));
        MvcResult manRes = mvc.perform(post("/api/agence/" + agenceId + "/mandats/demandes")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("annonceId", annonceId.toString()))))
            .andExpect(status().isCreated())
            .andReturn();
        String mandatId = JsonPath.read(manRes.getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/agence/" + agenceId + "/mandats").header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/mandats/mes-propositions").header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio)))
            .andExpect(status().isOk());
        mvc.perform(patch("/api/mandats/" + mandatId + "/commission")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("tauxCommissionMensuel", 10.0))))
            .andExpect(status().isOk());
        mvc.perform(post("/api/mandats/" + mandatId + "/reponse")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("accepter", true))))
            .andExpect(status().isOk());
        mvc.perform(get("/api/agence/" + agenceId + "/portefeuille").header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isOk());

        // Candidature
        MvcResult candRes = mvc.perform(post("/api/agence/" + agenceId + "/candidatures")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenCandidat))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("fonction", "AGENT"))))
            .andExpect(status().isCreated())
            .andReturn();
        String candId = JsonPath.read(candRes.getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/mes-candidatures-agence").header(HttpHeaders.AUTHORIZATION, bearer(tokenCandidat)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/agence/" + agenceId + "/candidatures").header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isOk());
        mvc.perform(post("/api/agence/" + agenceId + "/candidatures/" + candId + "/decision")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("accepter", true))))
            .andExpect(status().isOk());

        // Vente sans mandat -> 403 ; vente avec mandat accepté sur un bien VENTE -> 201
        Map<String, Object> venteAnnonce = new LinkedHashMap<>();
        venteAnnonce.put("titre", "Villa Vente Mandat");
        venteAnnonce.put("description", "Belle villa à vendre");
        venteAnnonce.put("typeBien", "VILLA");
        venteAnnonce.put("transaction", "VENTE");
        venteAnnonce.put("prix", 50000000);
        venteAnnonce.put("superficie", 300);
        venteAnnonce.put("pieces", 6);
        venteAnnonce.put("quartier", "V-" + UUID.randomUUID().toString().substring(0, 8));
        venteAnnonce.put("ville", "Dakar");
        MvcResult vaRes = mvc.perform(post("/api/annonces")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(venteAnnonce)))
            .andExpect(status().isCreated())
            .andReturn();
        String vaId = JsonPath.read(vaRes.getResponse().getContentAsString(), "$.id");

        mvc.perform(post("/api/agence/" + agenceId + "/ventes")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of(
                    "annonceId", vaId,
                    "agentMembreId", mAgent.getId().toString(),
                    "acheteurNom", "Ibrahima Fall",
                    "acheteurTelephone", "771112233",
                    "prixVente", 50000000,
                    "tauxCommission", 5.0,
                    "partAgent", 40.0,
                    "dateVente", LocalDate.now().toString()))))
            .andExpect(status().isForbidden());

        MvcResult manVenteRes = mvc.perform(post("/api/agence/" + agenceId + "/mandats/demandes")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("annonceId", vaId))))
            .andExpect(status().isCreated())
            .andReturn();
        String mandatVenteId = JsonPath.read(manVenteRes.getResponse().getContentAsString(), "$.id");
        mvc.perform(patch("/api/mandats/" + mandatVenteId + "/commission")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("tauxCommissionMensuel", 5.0))))
            .andExpect(status().isOk());
        mvc.perform(post("/api/mandats/" + mandatVenteId + "/reponse")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("accepter", true))))
            .andExpect(status().isOk());

        MvcResult venteRes = mvc.perform(post("/api/agence/" + agenceId + "/ventes")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of(
                    "annonceId", vaId,
                    "agentMembreId", mAgent.getId().toString(),
                    "acheteurNom", "Ibrahima Fall",
                    "acheteurTelephone", "771112233",
                    "prixVente", 50000000,
                    "tauxCommission", 5.0,
                    "partAgent", 40.0,
                    "dateVente", LocalDate.now().toString()))))
            .andExpect(status().isCreated())
            .andReturn();
        String venteId = JsonPath.read(venteRes.getResponse().getContentAsString(), "$.id");
        mvc.perform(get("/api/agence/" + agenceId + "/ventes").header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/agence/" + agenceId + "/ventes/" + venteId + "/solde-commissions").header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/agence/" + agenceId + "/ventes/" + venteId + "/paiements-commissions").header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isOk());
        mvc.perform(post("/api/agence/" + agenceId + "/ventes/" + venteId + "/paiements-commissions")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of(
                    "beneficiaire", "AGENCE",
                    "montant", 500000,
                    "datePaiement", LocalDate.now().toString(),
                    "modePaiement", "VIREMENT",
                    "reference", "COM-2026"))))
            .andExpect(status().isCreated());
        mvc.perform(get("/api/agence/" + agenceId + "/evaluations")).andExpect(status().isOk());
        mvc.perform(get("/api/agence/" + agenceId + "/visites").header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/locations/evaluations/mon-resume").header(HttpHeaders.AUTHORIZATION, bearer(tokenCandidat)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/admin/role-requests").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk());
    }
}
