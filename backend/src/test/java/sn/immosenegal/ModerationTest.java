package sn.immosenegal;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import javax.imageio.ImageIO;

import com.jayway.jsonpath.JsonPath;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import sn.immosenegal.user.Role;

/**
 * Modération des annonces : une annonce neuve est EN_ATTENTE et invisible du public ; seul un administrateur la publie,
 * la refuse, la suspend ou demande une correction ; le propriétaire ne peut pas contourner ces règles.
 */
class ModerationTest extends AbstractApiTest {

    @Autowired
    private JdbcTemplate jdbc;

    // ---------- Aides ----------

    private Map<String, Object> annonce(String quartier) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("titre", "Annonce à modérer");
        m.put("description", "Description de test");
        m.put("typeBien", "APPARTEMENT");
        m.put("transaction", "LOCATION");
        m.put("prix", 100000);
        m.put("superficie", 60);
        m.put("pieces", 3);
        m.put("quartier", quartier);
        m.put("ville", "Ziguinchor");
        return m;
    }

    private String quartierUnique() {
        return "Quartier" + UUID.randomUUID().toString().substring(0, 8);
    }

    private String creer(String jeton, Map<String, Object> corps) throws Exception {
        MvcResult r = mvc.perform(post("/api/annonces").header(HttpHeaders.AUTHORIZATION, bearer(jeton))
                .contentType(MediaType.APPLICATION_JSON).content(corps(corps)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.statut").value("EN_ATTENTE"))
            .andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.id");
    }

    private ResultActions lire(String id, String jeton) throws Exception {
        var requete = get("/api/annonces/" + id);
        if (jeton != null) {
            requete.header(HttpHeaders.AUTHORIZATION, bearer(jeton));
        }
        return mvc.perform(requete);
    }

    private ResultActions decider(String admin, String id, String action, String motif) throws Exception {
        var requete = post("/api/admin/annonces/{id}/{action}", id, action);
        if (admin != null) {
            requete.header(HttpHeaders.AUTHORIZATION, bearer(admin));
        }
        if (motif != null) {
            requete.contentType(MediaType.APPLICATION_JSON).content(corps(Map.of("motif", motif)));
        }
        return mvc.perform(requete);
    }

    private ResultActions modifier(String jeton, String id, Map<String, Object> corps) throws Exception {
        return mvc.perform(put("/api/annonces/" + id).header(HttpHeaders.AUTHORIZATION, bearer(jeton))
            .contentType(MediaType.APPLICATION_JSON).content(corps(corps)));
    }

    /** Nombre d'annonces du catalogue public dans ce quartier (isole le test des autres). */
    private ResultActions catalogue(String quartier) throws Exception {
        return mvc.perform(get("/api/annonces?quartier=" + quartier));
    }

    // ---------- Visibilité ----------

    @Test
    void uneAnnonceNeuveEstInvisibleDuPublic_etVisibleDeSonProprietaireEtDesAdmins() throws Exception {
        String proprio = utilisateurConnecte(Role.PROPRIETAIRE);
        String autre = utilisateurConnecte(Role.PROPRIETAIRE);
        String admin = utilisateurConnecte(Role.ADMIN);
        String quartier = quartierUnique();
        String id = creer(proprio, annonce(quartier));

        catalogue(quartier).andExpect(jsonPath("$.totalElements").value(0));
        lire(id, null).andExpect(status().isNotFound());
        lire(id, autre).andExpect(status().isNotFound());
        lire(id, proprio).andExpect(status().isOk()).andExpect(jsonPath("$.statut").value("EN_ATTENTE"));
        lire(id, admin).andExpect(status().isOk());

        decider(admin, id, "valider", null).andExpect(status().isOk()).andExpect(jsonPath("$.statut").value("PUBLIEE"));

        catalogue(quartier).andExpect(jsonPath("$.totalElements").value(1));
        lire(id, null).andExpect(status().isOk())
            .andExpect(jsonPath("$.statut").value("PUBLIEE"))
            .andExpect(jsonPath("$.motifModeration").doesNotExist());
    }

    // ---------- Qui peut modérer ----------

    @Test
    void seulUnAdminModere_etChaqueDecisionEstJournalisee() throws Exception {
        String proprio = utilisateurConnecte(Role.PROPRIETAIRE);
        String agent = utilisateurConnecte(Role.AGENT);
        String client = utilisateurConnecte(Role.CLIENT);
        String admin = utilisateurConnecte(Role.ADMIN);
        String id = creer(proprio, annonce(quartierUnique()));

        // Sans session : 401. Avec une session sans le rôle ADMIN : 403, pour la liste comme pour chaque décision.
        decider(null, id, "valider", null).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/annonces")).andExpect(status().isUnauthorized());
        for (String jeton : new String[] {proprio, agent, client}) {
            decider(jeton, id, "valider", null).andExpect(status().isForbidden());
            decider(jeton, id, "refuser", "motif").andExpect(status().isForbidden());
            decider(jeton, id, "suspendre", "motif").andExpect(status().isForbidden());
            decider(jeton, id, "demander-correction", "motif").andExpect(status().isForbidden());
            mvc.perform(get("/api/admin/annonces").header(HttpHeaders.AUTHORIZATION, bearer(jeton)))
                .andExpect(status().isForbidden());
        }
        lire(id, proprio).andExpect(jsonPath("$.statut").value("EN_ATTENTE"));

        decider(admin, id, "valider", null).andExpect(status().isOk());
        Integer evenements = jdbc.queryForObject(
            "SELECT count(*) FROM audit_events WHERE type = 'ANNONCE_VALIDEE' AND details LIKE ?", Integer.class, "%" + id + "%");
        assertThat(evenements).isEqualTo(1);
    }

    @Test
    void laFileDeModerationListeLesAnnoncesEnAttente() throws Exception {
        String proprio = utilisateurConnecte(Role.PROPRIETAIRE);
        String admin = utilisateurConnecte(Role.ADMIN);
        String id = creer(proprio, annonce(quartierUnique()));

        assertThat(apparaitDansLaFile(admin, null, id)).as("EN_ATTENTE par défaut").isTrue();
        assertThat(apparaitDansLaFile(admin, "PUBLIEE", id)).isFalse();

        decider(admin, id, "valider", null).andExpect(status().isOk());
        assertThat(apparaitDansLaFile(admin, null, id)).isFalse();
        assertThat(apparaitDansLaFile(admin, "PUBLIEE", id)).isTrue();
    }

    private boolean apparaitDansLaFile(String admin, String statut, String id) throws Exception {
        int page = 0;
        int pages;
        do {
            String url = "/api/admin/annonces?taille=50&page=" + page + (statut == null ? "" : "&statut=" + statut);
            String corps = mvc.perform(get(url).header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            java.util.List<String> ids = JsonPath.read(corps, "$.contenu[*].id");
            if (ids.contains(id)) {
                return true;
            }
            pages = JsonPath.read(corps, "$.totalPages");
            page++;
        } while (page < pages);
        return false;
    }

    // ---------- Décisions ----------

    @Test
    void refuserExigeUnMotif_etUneAnnonceRefuseeNeSeModifiePlus() throws Exception {
        String proprio = utilisateurConnecte(Role.PROPRIETAIRE);
        String admin = utilisateurConnecte(Role.ADMIN);
        String quartier = quartierUnique();
        String id = creer(proprio, annonce(quartier));

        decider(admin, id, "refuser", null).andExpect(status().isBadRequest());
        mvc.perform(post("/api/admin/annonces/{id}/refuser", id).header(HttpHeaders.AUTHORIZATION, bearer(admin))
                .contentType(MediaType.APPLICATION_JSON).content(corps(Map.of("motif", "   "))))
            .andExpect(status().isBadRequest());

        decider(admin, id, "refuser", "Photos non conformes").andExpect(status().isOk())
            .andExpect(jsonPath("$.statut").value("REFUSEE"))
            .andExpect(jsonPath("$.motifModeration").value("Photos non conformes"));

        // Le propriétaire voit le motif ; le public ne voit rien.
        mvc.perform(get("/api/annonces/mes-annonces").header(HttpHeaders.AUTHORIZATION, bearer(proprio)))
            .andExpect(jsonPath("$.contenu[0].statut").value("REFUSEE"))
            .andExpect(jsonPath("$.contenu[0].motifModeration").value("Photos non conformes"));
        catalogue(quartier).andExpect(jsonPath("$.totalElements").value(0));
        lire(id, null).andExpect(status().isNotFound());

        // Refusée : plus de modification, plus de changement de statut, plus de validation.
        modifier(proprio, id, annonce(quartier)).andExpect(status().isOk()); // contenu identique : rien ne change
        Map<String, Object> change = annonce(quartier);
        change.put("prix", 1);
        modifier(proprio, id, change).andExpect(status().isConflict());
        Map<String, Object> voudraitPublier = annonce(quartier);
        voudraitPublier.put("statut", "PUBLIEE");
        modifier(proprio, id, voudraitPublier).andExpect(status().isConflict());
        decider(admin, id, "valider", null).andExpect(status().isConflict());
        lire(id, proprio).andExpect(jsonPath("$.statut").value("REFUSEE"));
    }

    @Test
    void demanderUneCorrection_leProprietaireCorrigeEtRenvoieEnAttente() throws Exception {
        String proprio = utilisateurConnecte(Role.PROPRIETAIRE);
        String admin = utilisateurConnecte(Role.ADMIN);
        String quartier = quartierUnique();
        String id = creer(proprio, annonce(quartier));

        decider(admin, id, "demander-correction", "Précisez le prix").andExpect(status().isOk())
            .andExpect(jsonPath("$.statut").value("A_CORRIGER"));
        catalogue(quartier).andExpect(jsonPath("$.totalElements").value(0));

        Map<String, Object> corrigee = annonce(quartier);
        corrigee.put("prix", 120000);
        modifier(proprio, id, corrigee).andExpect(status().isOk()).andExpect(jsonPath("$.statut").value("EN_ATTENTE"));

        decider(admin, id, "valider", null).andExpect(status().isOk());
        catalogue(quartier).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.contenu[0].prix").value(120000));
    }

    @Test
    void suspendreRetireDuCatalogue_etValiderLaRemet() throws Exception {
        String proprio = utilisateurConnecte(Role.PROPRIETAIRE);
        String admin = utilisateurConnecte(Role.ADMIN);
        String quartier = quartierUnique();
        String id = creer(proprio, annonce(quartier));

        // On ne suspend que ce qui est publié ; on ne valide pas deux fois.
        decider(admin, id, "suspendre", "Signalement").andExpect(status().isConflict());
        decider(admin, id, "valider", null).andExpect(status().isOk());
        decider(admin, id, "valider", null).andExpect(status().isConflict());
        catalogue(quartier).andExpect(jsonPath("$.totalElements").value(1));

        decider(admin, id, "suspendre", null).andExpect(status().isBadRequest());
        decider(admin, id, "suspendre", "Signalement d'un visiteur").andExpect(status().isOk())
            .andExpect(jsonPath("$.statut").value("SUSPENDUE"));
        catalogue(quartier).andExpect(jsonPath("$.totalElements").value(0));
        lire(id, null).andExpect(status().isNotFound());
        Map<String, Object> autreTitre = annonce(quartier);
        autreTitre.put("titre", "Autre titre");
        modifier(proprio, id, autreTitre).andExpect(status().isConflict());

        decider(admin, id, "valider", null).andExpect(status().isOk());
        catalogue(quartier).andExpect(jsonPath("$.totalElements").value(1));
    }

    // ---------- Le propriétaire ne peut pas contourner la modération ----------

    @Test
    void leProprietaireNePeutPasSePublierLuiMeme() throws Exception {
        String proprio = utilisateurConnecte(Role.PROPRIETAIRE);
        String quartier = quartierUnique();
        String id = creer(proprio, annonce(quartier));

        for (String voulu : new String[] {"PUBLIEE", "RESERVE", "VENDU", "LOUE", "A_CORRIGER", "REFUSEE", "SUSPENDUE"}) {
            Map<String, Object> corps = annonce(quartier);
            corps.put("statut", voulu);
            modifier(proprio, id, corps).andExpect(status().isConflict());
        }
        lire(id, proprio).andExpect(jsonPath("$.statut").value("EN_ATTENTE"));
        catalogue(quartier).andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void leProprietaireChoisitSeulementLesStatutsCommerciauxDUneAnnonceValidee() throws Exception {
        String proprio = utilisateurConnecte(Role.PROPRIETAIRE);
        String admin = utilisateurConnecte(Role.ADMIN);
        String quartier = quartierUnique();
        String id = creer(proprio, annonce(quartier));
        decider(admin, id, "valider", null).andExpect(status().isOk());

        // Réservé, vendu ou loué : l'annonce n'est plus présentée comme disponible, donc elle quitte le catalogue.
        for (String statut : new String[] {"RESERVE", "VENDU", "LOUE"}) {
            Map<String, Object> corps = annonce(quartier);
            corps.put("statut", statut);
            modifier(proprio, id, corps).andExpect(status().isOk()).andExpect(jsonPath("$.statut").value(statut));
            catalogue(quartier).andExpect(jsonPath("$.totalElements").value(0));
            lire(id, null).andExpect(status().isNotFound());
        }

        // Remise en vente : de nouveau PUBLIEE, de nouveau visible (le contenu n'a pas changé, pas de nouvelle validation).
        Map<String, Object> remise = annonce(quartier);
        remise.put("statut", "PUBLIEE");
        modifier(proprio, id, remise).andExpect(status().isOk()).andExpect(jsonPath("$.statut").value("PUBLIEE"));
        catalogue(quartier).andExpect(jsonPath("$.totalElements").value(1));

        // Un statut de modération ne se choisit pas soi-même, et on ne change pas contenu et statut en même temps.
        Map<String, Object> interdit = annonce(quartier);
        interdit.put("statut", "SUSPENDUE");
        modifier(proprio, id, interdit).andExpect(status().isConflict());
        Map<String, Object> melange = annonce(quartier);
        melange.put("prix", 999);
        melange.put("statut", "VENDU");
        modifier(proprio, id, melange).andExpect(status().isBadRequest());
        lire(id, proprio).andExpect(jsonPath("$.statut").value("PUBLIEE")).andExpect(jsonPath("$.prix").value(100000));
    }

    @Test
    void modifierLeContenuOuAjouterUnePhotoRenvoieUneAnnonceValideeEnModeration() throws Exception {
        String proprio = utilisateurConnecte(Role.PROPRIETAIRE);
        String admin = utilisateurConnecte(Role.ADMIN);
        String quartier = quartierUnique();
        String id = creer(proprio, annonce(quartier));
        decider(admin, id, "valider", null).andExpect(status().isOk());

        // Une modification qui ne change rien ne déclenche rien.
        modifier(proprio, id, annonce(quartier)).andExpect(status().isOk()).andExpect(jsonPath("$.statut").value("PUBLIEE"));
        catalogue(quartier).andExpect(jsonPath("$.totalElements").value(1));

        // Une photo ajoutée = du contenu non validé : l'annonce sort du catalogue jusqu'à nouvelle validation.
        BufferedImage image = new BufferedImage(40, 30, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(image, "png", png);
        mvc.perform(multipart("/api/annonces/{id}/photos", id)
                .file(new MockMultipartFile("fichier", "p.png", "image/png", png.toByteArray()))
                .header(HttpHeaders.AUTHORIZATION, bearer(proprio)))
            .andExpect(status().isCreated());
        lire(id, proprio).andExpect(jsonPath("$.statut").value("EN_ATTENTE"));
        catalogue(quartier).andExpect(jsonPath("$.totalElements").value(0));

        decider(admin, id, "valider", null).andExpect(status().isOk());
        catalogue(quartier).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.contenu[0].photos", hasSize(1)));

        // Idem pour une modification de contenu (ici le prix).
        Map<String, Object> nouveauPrix = annonce(quartier);
        nouveauPrix.put("prix", 150000);
        modifier(proprio, id, nouveauPrix).andExpect(status().isOk()).andExpect(jsonPath("$.statut").value("EN_ATTENTE"));
        catalogue(quartier).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/annonces/mes-annonces").header(HttpHeaders.AUTHORIZATION, bearer(proprio)))
            .andExpect(jsonPath("$.contenu[*].id", hasItem(id)));
    }

    @Test
    void lAdminCorrigeUneAnnonceSansLaRenvoyerEnModeration() throws Exception {
        String proprio = utilisateurConnecte(Role.PROPRIETAIRE);
        String admin = utilisateurConnecte(Role.ADMIN);
        String quartier = quartierUnique();
        String id = creer(proprio, annonce(quartier));
        decider(admin, id, "valider", null).andExpect(status().isOk());

        Map<String, Object> correction = annonce(quartier);
        correction.put("titre", "Titre corrigé par l'administration");
        modifier(admin, id, correction).andExpect(status().isOk()).andExpect(jsonPath("$.statut").value("PUBLIEE"));
        catalogue(quartier).andExpect(jsonPath("$.contenu[0].titre").value("Titre corrigé par l'administration"));
    }
}
