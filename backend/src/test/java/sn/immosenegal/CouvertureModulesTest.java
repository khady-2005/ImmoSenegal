package sn.immosenegal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
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

class CouvertureModulesTest extends AbstractApiTest {

    @Autowired private AgenceRepository agences;
    @Autowired private MembreAgenceRepository membres;

    private static final String SIGNATURE_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    private User creerUtilisateur(Role role, String nom) {
        return users.save(new User(emailUnique(), encoder.encode(MOT_DE_PASSE), nom, null, role));
    }

    private UUID publierAnnonce(String tokenProprio, String quartier) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("titre", "Appartement " + quartier);
        body.put("description", "Bel appartement pour tests");
        body.put("typeBien", "APPARTEMENT");
        body.put("transaction", "LOCATION");
        body.put("prix", 180000);
        body.put("superficie", 95);
        body.put("pieces", 4);
        body.put("chambres", 2);
        body.put("sallesDeBain", 2);
        body.put("quartier", quartier);
        body.put("ville", "Dakar");
        body.put("adresse", "Avenue Bourguiba");
        MvcResult res = mvc.perform(post("/api/annonces")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(body)))
            .andExpect(status().isCreated())
            .andReturn();
        return UUID.fromString(JsonPath.read(res.getResponse().getContentAsString(), "$.id"));
    }

    @Test
    void parcoursComplet_visitesReservationsContratsSignaturesResiliationSupervision() throws Exception {
        User proprio = creerUtilisateur(Role.PROPRIETAIRE, "Proprio Parcours");
        User client = creerUtilisateur(Role.CLIENT, "Client Parcours");
        User tiers = creerUtilisateur(Role.CLIENT, "Tiers Externe");
        String tokenProprio = connecter(proprio.getEmail());
        String tokenClient = connecter(client.getEmail());
        String tokenTiers = connecter(tiers.getEmail());
        String tokenAdmin = nouvelAdminConnecte();

        UUID annonceId = publierAnnonce(tokenProprio, "P-" + UUID.randomUUID().toString().substring(0, 8));

        // 1. Visite : création -> consultation -> décision -> confirmation -> effectuée -> admin
        MvcResult visiteRes = mvc.perform(post("/api/visites/annonces/" + annonceId)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("dateVisite", LocalDateTime.now().plusDays(3).toString(), "message", "Disponible ?"))))
            .andExpect(status().isCreated())
            .andReturn();
        String visiteId = JsonPath.read(visiteRes.getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/visites/mes-demandes").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/visites/recues").header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/visites/admin").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/visites/admin").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk());

        mvc.perform(post("/api/visites/" + visiteId + "/decision")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("action", "ACCEPTEE", "reponse", "D'accord"))))
            .andExpect(status().isOk());
        mvc.perform(post("/api/visites/" + visiteId + "/effectuee")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio)))
            .andExpect(status().isConflict());

        // 2. Réservation : création -> listes -> décision -> admin
        MvcResult resRes = mvc.perform(post("/api/reservations/annonces/" + annonceId)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("message", "Je réserve ce logement"))))
            .andExpect(status().isCreated())
            .andReturn();
        String reservationId = JsonPath.read(resRes.getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/reservations/mes-demandes").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/reservations/recues").header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/reservations/admin").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk());

        mvc.perform(post("/api/reservations/" + reservationId + "/decision")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("action", "ACCEPTEE", "reponse", "Bienvenue"))))
            .andExpect(status().isOk());

        // 3. Contrat de location : création -> lecture -> signatures -> paiement -> résiliation -> supervision
        MvcResult contratRes = mvc.perform(post("/api/locations/reservations/" + reservationId + "/contrat")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of(
                    "loyerMensuel", new BigDecimal("180000"),
                    "depotGarantie", new BigDecimal("360000"),
                    "dateDebut", LocalDate.now().toString()))))
            .andExpect(status().isCreated())
            .andReturn();
        String contratId = JsonPath.read(contratRes.getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/locations/mes-contrats").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isOk());
        mvc.perform(patch("/api/locations/" + contratId + "/confirmation-lecture")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isOk());
        mvc.perform(post("/api/locations/" + contratId + "/signature")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("signature", SIGNATURE_PNG))))
            .andExpect(status().isOk());
        mvc.perform(post("/api/locations/" + contratId + "/signature")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("signature", SIGNATURE_PNG))))
            .andExpect(status().isOk());
        mvc.perform(post("/api/locations/" + contratId + "/signature")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenTiers))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("signature", SIGNATURE_PNG))))
            .andExpect(status().isForbidden());

        // Paiement manuel déclaré par locataire et confirmé par propriétaire
        MvcResult payManRes = mvc.perform(post("/api/locations/" + contratId + "/paiements")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of(
                    "montant", new BigDecimal("180000"),
                    "periode", LocalDate.now().withDayOfMonth(1).toString(),
                    "datePaiement", LocalDate.now().toString(),
                    "reference", "VIR-2026"))))
            .andExpect(status().isCreated())
            .andReturn();
        String paiementId = JsonPath.read(payManRes.getResponse().getContentAsString(), "$.id");

        mvc.perform(patch("/api/locations/" + contratId + "/paiements/" + paiementId + "/confirmation")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("accepte", true))))
            .andExpect(status().isOk());
        mvc.perform(get("/api/locations/" + contratId + "/paiements").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isOk());

        // Résiliation demandée puis annulée
        mvc.perform(patch("/api/locations/" + contratId + "/resiliation-demande")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("motif", "Déménagement", "dateFinSouhaitee", LocalDate.now().plusMonths(1).toString()))))
            .andExpect(status().isOk());
        mvc.perform(patch("/api/locations/" + contratId + "/resiliation-annulation")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isOk());

        // États des lieux, incidents, dépôt de garantie, supervision & litiges
        mvc.perform(get("/api/locations/" + contratId + "/etats-des-lieux").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/locations/" + contratId + "/incidents").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/locations/" + contratId + "/depot-garantie").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isNoContent());
        mvc.perform(get("/api/locations/admin/supervision").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/admin/locations/litiges").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk());
    }

    @Test
    void parcoursComplet_abonnementsAdminEtNotifications() throws Exception {
        User proprio = creerUtilisateur(Role.PROPRIETAIRE, "Proprio Abonnement");
        User client = creerUtilisateur(Role.CLIENT, "Client Notification");
        String tokenProprio = connecter(proprio.getEmail());
        String tokenClient = connecter(client.getEmail());
        String tokenAdmin = nouvelAdminConnecte();

        // Client interdit sur abonnements et admin
        mvc.perform(post("/api/abonnements/simuler")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("forfait", "MENSUEL"))))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/abonnements/admin/en-attente").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/statistiques").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/audit").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isForbidden());

        // Propriétaire simule un abonnement
        mvc.perform(post("/api/abonnements/simuler")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("forfait", "MENSUEL"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.statut").value("ACTIF"));
        mvc.perform(get("/api/abonnements/historique").header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio)))
            .andExpect(status().isOk());

        // Admin consulte stats, audit, utilisateurs, agences
        mvc.perform(get("/api/admin/statistiques").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.utilisateursTotal").exists());
        mvc.perform(get("/api/admin/audit").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/admin/users").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/admin/agences").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/abonnements/admin/en-attente").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk());

        // Notifications
        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio)))
            .andExpect(status().isOk());
        mvc.perform(post("/api/notifications/tout-lire").header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio)))
            .andExpect(status().isNoContent());
    }

    @Test
    void parcoursComplet_agenceCaisseEtReglesPublication() throws Exception {
        String tokenAdmin = nouvelAdminConnecte();
        User respUser = creerUtilisateur(Role.PROPRIETAIRE, "Responsable Interne");
        User agentUser = creerUtilisateur(Role.AGENT, "Agent Interne");
        User caissierUser = creerUtilisateur(Role.PROPRIETAIRE, "Caissier Interne");
        String tokenResp = connecter(respUser.getEmail());
        String tokenAgent = connecter(agentUser.getEmail());
        String tokenCaissier = connecter(caissierUser.getEmail());
        String tokenClient = utilisateurConnecte(Role.CLIENT);

        // Agence interne ImmoSénégal
        Agence interne = new Agence("ImmoSénégal Test", "immosenegal-test-" + UUID.randomUUID().toString().substring(0, 6), AgenceType.INTERNE);
        interne.setStatut(StatutAgence.ACTIVE);
        interne = agences.save(interne);

        MembreAgence mResp = new MembreAgence(interne, respUser, FonctionAgence.RESPONSABLE);
        mResp.setStatut(StatutMembreAgence.ACTIF);
        membres.save(mResp);

        MembreAgence mAgent = new MembreAgence(interne, agentUser, FonctionAgence.AGENT);
        mAgent.setStatut(StatutMembreAgence.ACTIF);
        membres.save(mAgent);

        MembreAgence mCaissier = new MembreAgence(interne, caissierUser, FonctionAgence.CAISSIER);
        mCaissier.setStatut(StatutMembreAgence.ACTIF);
        membres.save(mCaissier);

        // Règles de publication sur l'agence interne : ADMIN et AGENT bloqués (403), RESPONSABLE autorisé (201)
        Map<String, Object> annonceBody = new LinkedHashMap<>();
        annonceBody.put("titre", "Bien Agence Interne");
        annonceBody.put("description", "Publié par le responsable");
        annonceBody.put("typeBien", "VILLA");
        annonceBody.put("transaction", "VENTE");
        annonceBody.put("prix", 45000000);
        annonceBody.put("superficie", 250);
        annonceBody.put("pieces", 6);
        annonceBody.put("quartier", "Mermoz-" + UUID.randomUUID().toString().substring(0, 6));
        annonceBody.put("ville", "Dakar");

        mvc.perform(post("/api/annonces?agenceId=" + interne.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(annonceBody)))
            .andExpect(status().isForbidden());

        mvc.perform(post("/api/annonces?agenceId=" + interne.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAgent))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(annonceBody)))
            .andExpect(status().isForbidden());

        mvc.perform(post("/api/annonces?agenceId=" + interne.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(annonceBody)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.publieeParAgence").value(true));

        // Profil public, annuaire, espaces, membres
        mvc.perform(get("/api/agence/annuaire").header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/agence/profil/" + interne.getSlug())).andExpect(status().isOk());
        mvc.perform(get("/api/agence/mes-espaces").header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/agence/" + interne.getId() + "/membres").header(HttpHeaders.AUTHORIZATION, bearer(tokenResp)))
            .andExpect(status().isOk());

        // Caisse : caissier enregistre, responsable valide, client interdit (403)
        mvc.perform(get("/api/agence/" + interne.getId() + "/caisse").header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isForbidden());

        MvcResult mvtRes = mvc.perform(post("/api/agence/" + interne.getId() + "/caisse")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenCaissier))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of(
                    "type", "RECETTE",
                    "libelle", "Frais de dossier",
                    "montant", new BigDecimal("25000"),
                    "dateMouvement", LocalDate.now().toString()))))
            .andExpect(status().isCreated())
            .andReturn();
        String mvtId = JsonPath.read(mvtRes.getResponse().getContentAsString(), "$.id");

        mvc.perform(patch("/api/agence/" + interne.getId() + "/caisse/" + mvtId + "/decision")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenResp))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("valider", true, "motif", "Conforme"))))
            .andExpect(status().isOk());
    }
}
