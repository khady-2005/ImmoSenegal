package sn.immosenegal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;

import sn.immosenegal.annonce.ExpirationPublicationGratuite;
import sn.immosenegal.user.Role;

/** Règles de publication immédiate, période gratuite de 30 jours et modération de sécurité. */
class ModerationTest extends AbstractApiTest {

    @Autowired private JdbcTemplate jdbc;
    @Autowired private ExpirationPublicationGratuite expiration;

    private Map<String, Object> annonce(String titre) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("titre", titre);
        m.put("description", "Description de test");
        m.put("typeBien", "APPARTEMENT");
        m.put("transaction", "LOCATION");
        m.put("prix", 100000);
        m.put("superficie", 60);
        m.put("pieces", 3);
        m.put("quartier", "Kandé-" + UUID.randomUUID().toString().substring(0, 8));
        m.put("ville", "Ziguinchor");
        return m;
    }

    private String creer(String jeton, Map<String, Object> corps) throws Exception {
        MvcResult r = mvc.perform(post("/api/annonces")
                .header(HttpHeaders.AUTHORIZATION, bearer(jeton))
                .contentType(MediaType.APPLICATION_JSON).content(corps(corps)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.statut").value("PUBLIEE"))
            .andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.id");
    }

    private void moderer(String admin, String id, String action, String motif, int statutAttendu) throws Exception {
        var requete = post("/api/admin/annonces/{id}/{action}", id, action)
            .header(HttpHeaders.AUTHORIZATION, bearer(admin));
        if (motif != null) requete.contentType(MediaType.APPLICATION_JSON).content(corps(Map.of("motif", motif)));
        mvc.perform(requete).andExpect(status().is(statutAttendu));
    }

    @Test
    void proprietairePublieSansValidationEtBeneficieDeTrenteJours() throws Exception {
        String proprio = utilisateurConnecte(Role.PROPRIETAIRE);
        String admin = utilisateurConnecte(Role.ADMIN);
        Map<String, Object> donnees = annonce("Villa publiée directement");
        String id = creer(proprio, donnees);

        mvc.perform(get("/api/annonces?ville=Ziguinchor"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.contenu[?(@.id == '" + id + "')].statut").value("PUBLIEE"));

        mvc.perform(get("/api/annonces/" + id).header(HttpHeaders.AUTHORIZATION, bearer(proprio)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.dateFinPublication").exists());

        // Une annonce déjà publiée ne passe pas par une validation administrative.
        moderer(admin, id, "valider", null, 409);
    }

    @Test
    void expirationAutomatiqueRetireDuCatalogueSansSupprimerDuCompte() throws Exception {
        String proprio = utilisateurConnecte(Role.PROPRIETAIRE);
        String admin = utilisateurConnecte(Role.ADMIN);
        String id = creer(proprio, annonce("Annonce dont la période est terminée"));

        jdbc.update("UPDATE annonces SET date_fin_publication = CURRENT_DATE - 1 WHERE id = ?", UUID.fromString(id));
        expiration.retirerAnnoncesExpirees();

        mvc.perform(get("/api/annonces/" + id).header(HttpHeaders.AUTHORIZATION, bearer(proprio)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.statut").value("EN_ATTENTE"));

        mvc.perform(get("/api/annonces/mes-annonces").header(HttpHeaders.AUTHORIZATION, bearer(proprio)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.contenu[0].id").value(id));

        moderer(admin, id, "valider", null, 409);
    }

    @Test
    void administrationPeutSuspendrePourUnMotifPuisRetablirPendantLaCouverture() throws Exception {
        String proprio = utilisateurConnecte(Role.PROPRIETAIRE);
        String admin = utilisateurConnecte(Role.ADMIN);
        String id = creer(proprio, annonce("Annonce contrôlée"));

        moderer(admin, id, "suspendre", "Signalement à vérifier", 200);
        mvc.perform(get("/api/annonces/" + id).header(HttpHeaders.AUTHORIZATION, bearer(proprio)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.statut").value("SUSPENDUE"));

        moderer(admin, id, "valider", null, 200);
        mvc.perform(get("/api/annonces/" + id).header(HttpHeaders.AUTHORIZATION, bearer(proprio)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.statut").value("PUBLIEE"));
    }

    @Test
    void proprietairePeutModifierLeContenuMaisPasLesStatutsDeModeration() throws Exception {
        String proprio = utilisateurConnecte(Role.PROPRIETAIRE);
        Map<String, Object> initiale = annonce("Titre initial");
        String id = creer(proprio, initiale);

        Map<String, Object> changementInterdit = annonce("Titre initial");
        changementInterdit.put("statut", "SUSPENDUE");
        mvc.perform(put("/api/annonces/" + id)
                .header(HttpHeaders.AUTHORIZATION, bearer(proprio))
                .contentType(MediaType.APPLICATION_JSON).content(corps(changementInterdit)))
            .andExpect(status().isConflict());

        Map<String, Object> modifiee = annonce("Titre modifié par le propriétaire");
        mvc.perform(put("/api/annonces/" + id)
                .header(HttpHeaders.AUTHORIZATION, bearer(proprio))
                .contentType(MediaType.APPLICATION_JSON).content(corps(modifiee)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.titre").value("Titre modifié par le propriétaire"))
            .andExpect(jsonPath("$.statut").value("PUBLIEE"));

        assertThat(id).isNotBlank();
    }
}
