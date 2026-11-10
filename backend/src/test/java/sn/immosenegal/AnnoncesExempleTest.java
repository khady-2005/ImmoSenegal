package sn.immosenegal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
import org.springframework.test.web.servlet.MvcResult;

import sn.immosenegal.annonce.AnnoncesExemple;
import sn.immosenegal.user.Role;

/** Les annonces d'exemple sont toujours reconnaissables, et aucun utilisateur ne peut en fabriquer. */
class AnnoncesExempleTest extends AbstractApiTest {

    @Autowired
    private AnnoncesExemple exemples;

    @Test
    void lesExemplesSontMarques_ontDesPhotos_etLeurProprietaireNePeutPasSeConnecter() throws Exception {
        exemples.creer();
        assertThat(exemples.creer()).as("un deuxième appel ne crée rien de plus").isZero();

        MvcResult resultat = mvc.perform(get("/api/annonces?quartier=Almadies&exemple=true"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1))
            .andExpect(jsonPath("$.contenu[0].titre").value("Villa avec vue sur la mer"))
            .andExpect(jsonPath("$.contenu[0].exemple").value(true))
            .andExpect(jsonPath("$.contenu[0].description").value(startsWith("Grande villa lumineuse")))
            .andExpect(jsonPath("$.contenu[0].photos.length()").value(3))
            .andReturn();

        // La première photo est une vraie image JPEG servie par l'API publique.
        String corps = resultat.getResponse().getContentAsString();
        String annonceId = JsonPath.read(corps, "$.contenu[0].id");
        String photoId = JsonPath.read(corps, "$.contenu[0].photos[0]");
        mvc.perform(get("/api/annonces/{a}/photos/{p}", annonceId, photoId))
            .andExpect(status().isOk())
            .andExpect(content().contentType("image/jpeg"));

        // Le filtre réservé aux annonces non démonstratives les exclut.
        mvc.perform(get("/api/annonces?quartier=Almadies&exemple=false"))
            .andExpect(jsonPath("$.totalElements").value(0));

        // Le compte « propriétaire » des exemples est désactivé : personne ne peut s'y connecter.
        assertThat(users.findByEmail(AnnoncesExemple.EMAIL_PROPRIETAIRE).orElseThrow().isActif()).isFalse();
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(corps(Map.of("email", AnnoncesExemple.EMAIL_PROPRIETAIRE, "password", MOT_DE_PASSE))))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void unProprietaireNePeutPasCreerUneAnnonceMarqueeExemple() throws Exception {
        String jeton = utilisateurConnecte(Role.PROPRIETAIRE);
        Map<String, Object> annonce = new LinkedHashMap<>();
        annonce.put("titre", "Annonce qui tente de se faire passer pour un exemple");
        annonce.put("typeBien", "APPARTEMENT");
        annonce.put("transaction", "LOCATION");
        annonce.put("prix", 100000);
        annonce.put("superficie", 60);
        annonce.put("pieces", 3);
        annonce.put("quartier", "Test-" + UUID.randomUUID());
        annonce.put("ville", "Ziguinchor");
        annonce.put("exemple", true);

        mvc.perform(post("/api/annonces").header(HttpHeaders.AUTHORIZATION, bearer(jeton))
                .contentType(MediaType.APPLICATION_JSON).content(corps(annonce)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.exemple").value(false));
    }
}
