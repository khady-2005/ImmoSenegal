package sn.immosenegal.annonce;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import sn.immosenegal.config.OpenApiConfig;
import sn.immosenegal.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/annonces")
@Tag(name = "Annonces", description = "Publication immédiate avec 30 jours gratuits ; ensuite abonnement ou mandat d’agence")
public class AnnonceController {

    private final AnnonceService service;

    public AnnonceController(AnnonceService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Rechercher dans le catalogue : seules les annonces PUBLIEE sont renvoyées ; filtres combinables, pagination, tri",
        description = "tri = recent (défaut), prix_asc, prix_desc, superficie_desc. taille max : 50. "
            + "equipements : liste séparée par des virgules, tous doivent être présents.")
    public PageResponse<AnnonceResponse> rechercher(
            @RequestParam(required = false) TypeTransaction transaction,
            @RequestParam(required = false) TypeBien type,
            @RequestParam(required = false) Long prixMin,
            @RequestParam(required = false) Long prixMax,
            @RequestParam(required = false) BigDecimal superficieMin,
            @RequestParam(required = false) BigDecimal superficieMax,
            @RequestParam(required = false) String quartier,
            @RequestParam(required = false) String ville,
            @RequestParam(required = false) Integer piecesMin,
            @RequestParam(required = false) List<String> equipements,
            @RequestParam(required = false) Boolean exemple,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer taille,
            @RequestParam(required = false) String tri,
            @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        CriteresRecherche criteres = new CriteresRecherche(transaction, type, prixMin, prixMax, superficieMin,
            superficieMax, quartier, ville, piecesMin, equipements, null, exemple);
        return service.rechercher(criteres, page, taille, tri, utilisateur);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détail d'une annonce PUBLIEE (son propriétaire et les administrateurs peuvent lire les autres statuts)")
    public AnnonceResponse obtenir(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        return service.obtenir(id, utilisateur);
    }

    @GetMapping("/mes-annonces")
    @Operation(summary = "Mes annonces (tous statuts, avec le motif de modération)", security = @SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER))
    public PageResponse<AnnonceResponse> mesAnnonces(@AuthenticationPrincipal AuthenticatedUser utilisateur,
                                                     @RequestParam(required = false) Integer page,
                                                     @RequestParam(required = false) Integer taille) {
        return service.mesAnnonces(utilisateur, page, taille);
    }

    @GetMapping("/agence/{agenceId}")
    @Operation(summary = "Annonces propres d'une agence (réservé aux membres actifs de l'agence ou ADMIN)",
        security = @SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER))
    public PageResponse<AnnonceResponse> annoncesAgence(@PathVariable UUID agenceId,
                                                         @AuthenticationPrincipal AuthenticatedUser utilisateur,
                                                         @RequestParam(required = false) Integer page,
                                                         @RequestParam(required = false) Integer taille) {
        return service.annoncesAgence(agenceId, utilisateur, page, taille);
    }

    @GetMapping("/agence/{agenceId}/tableau")
    @Operation(summary = "Biens propres et confiés de l'agence avec photo principale, statut et filtres",
        security = @SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER))
    public List<AnnonceService.AnnonceAgenceResume> annoncesTableauAgence(
            @PathVariable UUID agenceId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String origine,
            @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        return service.annoncesCompletesAgence(agenceId, utilisateur, q, statut, origine);
    }

    @org.springframework.web.bind.annotation.PatchMapping("/agence/{agenceId}/{annonceId}/agent")
    @Operation(summary = "Attribuer un bien de l'agence à un agent ou gestionnaire actif",
        security = @SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER))
    public AnnonceService.AnnonceAgenceResume attribuerAgent(
            @PathVariable UUID agenceId,
            @PathVariable UUID annonceId,
            @RequestBody AttributionAgent requete,
            @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        return service.attribuerAgentAnnonce(agenceId, annonceId, requete.membreId(), utilisateur);
    }

    public record AttributionAgent(UUID membreId) {}

    @PostMapping
    @Operation(summary = "Créer une annonce (PROPRIETAIRE, membre actif d'agence ou ADMIN)",
        security = @SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER))
    public ResponseEntity<AnnonceResponse> creer(@Valid @RequestBody AnnonceRequest requete,
                                                 @RequestParam(required = false) UUID proprietaireId,
                                                 @RequestParam(required = false) UUID agenceId,
                                                 @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.creer(utilisateur, requete, proprietaireId, agenceId));
    }

    @org.springframework.web.bind.annotation.PatchMapping("/{id}/proprietaire")
    @Operation(summary = "Réattribuer une annonce à un compte propriétaire (ADMIN uniquement)",
        security = @SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER))
    public AnnonceResponse reattribuerProprietaire(@PathVariable UUID id,
            @Valid @RequestBody ReattributionProprietaire requete,
            @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        return service.reattribuerProprietaire(id, requete.proprietaireId(), utilisateur);
    }

    public record ReattributionProprietaire(@jakarta.validation.constraints.NotNull UUID proprietaireId) {}

    @PostMapping("/{id}/publier")
    @Operation(summary = "Réactiver une annonce expirée avec un abonnement propriétaire actif",
        security = @SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER))
    public AnnonceResponse publierAvecAbonnement(@PathVariable UUID id,
            @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        return service.publierAvecAbonnement(id, utilisateur);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier une annonce (son propriétaire ou un ADMIN) ; statut : seulement RESERVE, VENDU, LOUE ou PUBLIEE",
        description = "Le propriétaire peut modifier le contenu sans validation préalable. Le contenu et le statut commercial se modifient en deux enregistrements séparés.",
        security = @SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER))
    public AnnonceResponse modifier(@PathVariable UUID id, @Valid @RequestBody AnnonceRequest requete,
                                    @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        return service.modifier(id, utilisateur, requete);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une annonce (son propriétaire ou un ADMIN)",
        security = @SecurityRequirement(name = OpenApiConfig.SCHEMA_BEARER))
    public ResponseEntity<Void> supprimer(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser utilisateur) {
        service.supprimer(id, utilisateur);
        return ResponseEntity.noContent().build();
    }
}
