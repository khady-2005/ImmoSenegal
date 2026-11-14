package sn.immosenegal.favori;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.annonce.AnnonceRepository;
import sn.immosenegal.annonce.StatutAnnonce;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;

@Service
public class FavoriService {
    private final FavoriRepository favoris;
    private final AnnonceRepository annonces;
    private final UserRepository users;

    public FavoriService(FavoriRepository favoris, AnnonceRepository annonces, UserRepository users) {
        this.favoris = favoris;
        this.annonces = annonces;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<UUID> mesFavoris(AuthenticatedUser acteur) {
        exigerClient(acteur);
        return favoris.findByClientIdOrderByIdDesc(acteur.id()).stream()
            .map(f -> f.getAnnonce().getId()).toList();
    }

    @Transactional
    public void ajouter(UUID annonceId, AuthenticatedUser acteur) {
        exigerClient(acteur);
        Annonce annonce = annonces.findById(annonceId)
            .filter(a -> a.getStatut() == StatutAnnonce.PUBLIEE)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cette annonce n'est pas disponible."));
        if (favoris.findByClientIdAndAnnonceId(acteur.id(), annonceId).isPresent()) return;
        User client = users.findById(acteur.id())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        favoris.save(new Favori(client, annonce));
    }

    @Transactional
    public void retirer(UUID annonceId, AuthenticatedUser acteur) {
        exigerClient(acteur);
        favoris.findByClientIdAndAnnonceId(acteur.id(), annonceId).ifPresent(favoris::delete);
    }

    private void exigerClient(AuthenticatedUser acteur) {
        if (acteur == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Connectez-vous pour gérer vos favoris.");
        }
    }
}
