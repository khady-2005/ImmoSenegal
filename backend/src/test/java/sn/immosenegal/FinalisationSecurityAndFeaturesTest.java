package sn.immosenegal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.jayway.jsonpath.JsonPath;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
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
import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.annonce.AnnonceRepository;
import sn.immosenegal.reservation.ContratLocation;
import sn.immosenegal.reservation.ContratLocationRepository;
import sn.immosenegal.reservation.PaiementLoyer;
import sn.immosenegal.reservation.PaiementLoyerRepository;
import sn.immosenegal.reservation.Reservation;
import sn.immosenegal.reservation.ReservationRepository;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;

class FinalisationSecurityAndFeaturesTest extends AbstractApiTest {

    @Autowired private AnnonceRepository annonces;
    @Autowired private ReservationRepository reservations;
    @Autowired private ContratLocationRepository contrats;
    @Autowired private PaiementLoyerRepository paiements;
    @Autowired private AgenceRepository agences;
    @Autowired private MembreAgenceRepository membres;

    private User creerUtilisateur(Role role, String nom) {
        return users.save(new User(emailUnique(), encoder.encode(MOT_DE_PASSE), nom, null, role));
    }

    private UUID publierAnnonceAvecGps(String tokenProprio, String quartier) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("titre", "Villa Test " + quartier);
        body.put("description", "Villa complète pour test");
        body.put("typeBien", "VILLA");
        body.put("transaction", "LOCATION");
        body.put("prix", 250000);
        body.put("superficie", 150);
        body.put("pieces", 5);
        body.put("chambres", 3);
        body.put("sallesDeBain", 2);
        body.put("quartier", quartier);
        body.put("ville", "Dakar");
        body.put("adresse", "Rue 42, Villa 7");
        body.put("latitude", new BigDecimal("14.716677"));
        body.put("longitude", new BigDecimal("-17.467686"));

        MvcResult res = mvc.perform(post("/api/annonces")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(body)))
            .andExpect(status().isCreated())
            .andReturn();
        return UUID.fromString(JsonPath.read(res.getResponse().getContentAsString(), "$.id"));
    }

    @Test
    void visiteurNeVoitNiAdresseNiGps_dansLaListeEtDansLaFiche() throws Exception {
        User proprio = creerUtilisateur(Role.PROPRIETAIRE, "Proprio Localisation");
        String tokenProprio = connecter(proprio.getEmail());
        String quartier = "Q-" + UUID.randomUUID().toString().substring(0, 8);
        UUID id = publierAnnonceAvecGps(tokenProprio, quartier);

        // Visiteur non connecté sur le catalogue (liste)
        mvc.perform(get("/api/annonces?quartier=" + quartier))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.contenu[0].titre").value("Villa Test " + quartier))
            .andExpect(jsonPath("$.contenu[0].adresse").doesNotExist())
            .andExpect(jsonPath("$.contenu[0].latitude").doesNotExist())
            .andExpect(jsonPath("$.contenu[0].longitude").doesNotExist());

        // Visiteur non connecté sur la fiche
        mvc.perform(get("/api/annonces/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.adresse").doesNotExist())
            .andExpect(jsonPath("$.latitude").doesNotExist())
            .andExpect(jsonPath("$.longitude").doesNotExist());

        // Utilisateur connecté : adresse et GPS visibles
        String tokenClient = utilisateurConnecte(Role.CLIENT);
        mvc.perform(get("/api/annonces?quartier=" + quartier)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.contenu[0].adresse").value("Rue 42, Villa 7"))
            .andExpect(jsonPath("$.contenu[0].latitude").value(14.716677))
            .andExpect(jsonPath("$.contenu[0].longitude").value(-17.467686));

        mvc.perform(get("/api/annonces/" + id)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.adresse").value("Rue 42, Villa 7"))
            .andExpect(jsonPath("$.latitude").value(14.716677))
            .andExpect(jsonPath("$.longitude").value(-17.467686));
    }

    @Test
    void messagerieDirecte_clientVoitReponses_etTiersInterdit() throws Exception {
        User proprio = creerUtilisateur(Role.PROPRIETAIRE, "Proprio Messagerie");
        User clientA = creerUtilisateur(Role.CLIENT, "Client Alpha");
        User clientB = creerUtilisateur(Role.CLIENT, "Client Beta");
        String tokenProprio = connecter(proprio.getEmail());
        String tokenClientA = connecter(clientA.getEmail());
        String tokenClientB = connecter(clientB.getEmail());

        UUID annonceId = publierAnnonceAvecGps(tokenProprio, "M-" + UUID.randomUUID().toString().substring(0, 8));

        // Client A écrit au propriétaire
        mvc.perform(post("/api/messagerie/annonce/" + annonceId)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClientA))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("contenu", "Bonjour, est-ce disponible ?"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.interlocuteurId").value(clientA.getId().toString()));

        // Propriétaire répond à Client A
        mvc.perform(post("/api/messagerie/annonce/" + annonceId)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenProprio))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("contenu", "Oui, disponible dès lundi.", "interlocuteurId", clientA.getId().toString()))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.interlocuteurId").value(clientA.getId().toString()));

        // Client A voit son message ET la réponse du propriétaire
        mvc.perform(get("/api/messagerie/annonce/" + annonceId)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClientA)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].contenu").value("Bonjour, est-ce disponible ?"))
            .andExpect(jsonPath("$[1].contenu").value("Oui, disponible dès lundi."));

        // Client B ne voit rien et reçoit 403 s'il tente d'accéder au fil de Client A
        mvc.perform(get("/api/messagerie/annonce/" + annonceId)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClientB)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));

        mvc.perform(get("/api/messagerie/annonce/" + annonceId + "?interlocuteurId=" + clientA.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClientB)))
            .andExpect(status().isForbidden());

        mvc.perform(post("/api/messagerie/annonce/" + annonceId)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClientB))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("contenu", "Intrusion", "interlocuteurId", clientA.getId().toString()))))
            .andExpect(status().isForbidden());
    }

    @Test
    void loyerSimule_empecheDoublePaiementEnBase_generePdfSimulation_etVerificationMinimale() throws Exception {
        User proprio = creerUtilisateur(Role.PROPRIETAIRE, "Proprio Loyer");
        User locataire = creerUtilisateur(Role.CLIENT, "Moussa Locataire Secret");
        User tiers = creerUtilisateur(Role.CLIENT, "Tiers Curieux");
        String tokenProprio = connecter(proprio.getEmail());
        String tokenLocataire = connecter(locataire.getEmail());
        String tokenTiers = connecter(tiers.getEmail());

        UUID annonceId = publierAnnonceAvecGps(tokenProprio, "L-" + UUID.randomUUID().toString().substring(0, 8));
        Annonce annonce = annonces.findById(annonceId).orElseThrow();
        Reservation res = new Reservation(annonce, locataire, "Je réserve");
        res.accepter("Acceptée");
        res = reservations.save(res);
        ContratLocation contrat = contrats.save(new ContratLocation(
            annonce, proprio, locataire, res,
            new BigDecimal("250000"), new BigDecimal("500000"),
            LocalDate.now().withDayOfMonth(1), null));

        LocalDate periode = LocalDate.now().withDayOfMonth(1);

        // Un tiers ne peut pas payer le loyer d'un autre locataire
        mvc.perform(post("/api/locations/" + contrat.getId() + "/paiements/simuler")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenTiers))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("periode", periode.toString(), "modePaiement", "WAVE_SIMULATION"))))
            .andExpect(status().isForbidden());

        // Premier paiement simulé accepté
        MvcResult payRes = mvc.perform(post("/api/locations/" + contrat.getId() + "/paiements/simuler")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenLocataire))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("periode", periode.toString(), "modePaiement", "WAVE_SIMULATION"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.montant").value(250000))
            .andExpect(jsonPath("$.modePaiement").value("WAVE_SIMULATION"))
            .andExpect(jsonPath("$.codeVerification").exists())
            .andReturn();

        UUID paiementId = UUID.fromString(JsonPath.read(payRes.getResponse().getContentAsString(), "$.id"));
        String code = JsonPath.read(payRes.getResponse().getContentAsString(), "$.codeVerification");

        // Double paiement bloqué par l'API (409)
        mvc.perform(post("/api/locations/" + contrat.getId() + "/paiements/simuler")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenLocataire))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("periode", periode.toString(), "modePaiement", "ORANGE_MONEY_SIMULATION"))))
            .andExpect(status().isConflict());

        // Double paiement bloqué aussi par la contrainte unique PostgreSQL (V73)
        PaiementLoyer doublon = new PaiementLoyer(
            contrat, locataire, new BigDecimal("250000"), periode, LocalDate.now(), "DOUBLON");
        assertThatThrownBy(() -> paiements.saveAndFlush(doublon))
            .isInstanceOf(DataIntegrityViolationException.class);

        // Reçu PDF marqué SIMULATION (et interdit aux tiers)
        mvc.perform(get("/api/locations/" + contrat.getId() + "/paiements/" + paiementId + "/recu.pdf")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenTiers)))
            .andExpect(status().isForbidden());

        byte[] pdfBytes = mvc.perform(get("/api/locations/" + contrat.getId() + "/paiements/" + paiementId + "/recu.pdf")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenLocataire)))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_PDF))
            .andReturn().getResponse().getContentAsByteArray();

        try (PdfReader reader = new PdfReader(pdfBytes)) {
            String texte = new PdfTextExtractor(reader).getTextFromPage(1);
            assertThat(texte).contains("SIMULATION");
            assertThat(texte).contains(code);
        }

        // Vérification publique minimale : pas de nom complet exposé
        mvc.perform(get("/api/locations/recus/verifier/" + code))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valide").value(true))
            .andExpect(jsonPath("$.simulation").value(true))
            .andExpect(jsonPath("$.codeVerification").value(code))
            .andExpect(jsonPath("$.montant").value(250000))
            .andExpect(jsonPath("$.locataireNom").doesNotExist())
            .andExpect(jsonPath("$.beneficiaireNom").doesNotExist())
            .andExpect(jsonPath("$.nomComplet").doesNotExist());
    }

    @Test
    void signalements_creationSuiviEtAccesInterditAdmin() throws Exception {
        String tokenClient = utilisateurConnecte(Role.CLIENT);
        String tokenAdmin = nouvelAdminConnecte();

        MvcResult created = mvc.perform(post("/api/signalements")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of(
                    "type", "RECLAMATION",
                    "objet", "Retard de réponse",
                    "description", "Aucune nouvelle depuis 5 jours."))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.statut").value("OUVERT"))
            .andReturn();
        String sigId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/signalements/mes-signalements")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(sigId));

        // Accès interdit pour un non-admin
        mvc.perform(get("/api/admin/signalements")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isForbidden());

        mvc.perform(patch("/api/admin/signalements/" + sigId)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("statut", "RESOLU", "reponseAdmin", "Tentative illégale"))))
            .andExpect(status().isForbidden());

        // Traitement par l'administrateur
        mvc.perform(get("/api/admin/signalements")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
            .andExpect(status().isOk());

        mvc.perform(patch("/api/admin/signalements/" + sigId)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("statut", "RESOLU", "reponseAdmin", "Dossier pris en charge."))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.statut").value("RESOLU"))
            .andExpect(jsonPath("$.reponseAdmin").value("Dossier pris en charge."));
    }

    @Test
    void dossiersAgence_assistantAutoriseEtTiersInterdit() throws Exception {
        Agence agence = new Agence("Agence Dossiers", "agence-dossiers-" + UUID.randomUUID().toString().substring(0, 6), AgenceType.INTERNE);
        agence.setStatut(StatutAgence.ACTIVE);
        agence = agences.save(agence);

        User assistant = creerUtilisateur(Role.PROPRIETAIRE, "Assistant Admin");
        MembreAgence membre = new MembreAgence(agence, assistant, FonctionAgence.ASSISTANT_ADMINISTRATIF);
        membre.setStatut(StatutMembreAgence.ACTIF);
        membres.save(membre);

        String tokenAssistant = connecter(assistant.getEmail());
        String tokenClient = utilisateurConnecte(Role.CLIENT);

        // Client externe : 403 sur lecture et création
        mvc.perform(get("/api/agence/" + agence.getId() + "/dossiers")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient)))
            .andExpect(status().isForbidden());

        mvc.perform(post("/api/agence/" + agence.getId() + "/dossiers")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenClient))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("titre", "Intrusion", "categorie", "LOCATAIRE"))))
            .andExpect(status().isForbidden());

        // Assistant administratif : création, lecture et archivage autorisés
        MvcResult created = mvc.perform(post("/api/agence/" + agence.getId() + "/dossiers")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAssistant))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("titre", "Dossier Bail 2026", "categorie", "CONTRAT", "referenceClient", "REF-01"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.statut").value("OUVERT"))
            .andReturn();
        String dossierId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/agence/" + agence.getId() + "/dossiers")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAssistant)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(dossierId));

        mvc.perform(patch("/api/agence/" + agence.getId() + "/dossiers/" + dossierId)
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAssistant))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("statut", "ARCHIVE", "notes", "Classé."))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.statut").value("ARCHIVE"));
    }
}
