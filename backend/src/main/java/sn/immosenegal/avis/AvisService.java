package sn.immosenegal.avis;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sn.immosenegal.annonce.Annonce;
import sn.immosenegal.annonce.AnnonceRepository;
import sn.immosenegal.annonce.StatutAnnonce;
import sn.immosenegal.audit.AuditService;
import sn.immosenegal.common.ApiException;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.user.User;
import sn.immosenegal.user.UserRepository;
import sn.immosenegal.visite.DemandeVisiteRepository;
import sn.immosenegal.visite.StatutVisite;

@Service
public class AvisService {
    private final AvisRepository avis;
    private final AnnonceRepository annonces;
    private final UserRepository users;
    private final DemandeVisiteRepository visites;
    private final AuditService audit;

    public AvisService(AvisRepository avis, AnnonceRepository annonces, UserRepository users,
                       DemandeVisiteRepository visites, AuditService audit) {
        this.avis = avis;
        this.annonces = annonces;
        this.users = users;
        this.visites = visites;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<AvisResponse> lister(UUID annonceId) {
        if (!annonces.existsById(annonceId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Annonce introuvable.");
        }
        return avis.findByAnnonceIdOrderByCreeLeDesc(annonceId).stream().map(AvisResponse::de).toList();
    }

    @Transactional
    public AvisResponse creer(UUID annonceId, AvisRequest requete, AuthenticatedUser acteur) {
        if (acteur == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "Connectez-vous pour laisser un avis.");
        if (acteur.role() != Role.CLIENT) throw new ApiException(HttpStatus.FORBIDDEN, "Seuls les clients peuvent laisser un avis.");
        Annonce annonce = annonces.findById(annonceId)
            .filter(a -> a.getStatut() == StatutAnnonce.PUBLIEE)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cette annonce n'est pas disponible."));
        if (!visites.existsByAnnonceIdAndClientIdAndStatutAndDateVisiteBefore(
                annonceId, acteur.id(), StatutVisite.ACCEPTEE, LocalDateTime.now())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Un avis est possible après une visite acceptée et passée.");
        }
        if (avis.existsByAnnonceIdAndAuteurId(annonceId, acteur.id())) {
            throw new ApiException(HttpStatus.CONFLICT, "Vous avez déjà laissé un avis pour cette annonce.");
        }
        User auteur = users.findById(acteur.id())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session invalide."));
        String commentaire = requete.commentaire().trim();
        if (commentaire.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "Écrivez un commentaire avant d'envoyer votre avis.");
        Avis nouvelAvis = avis.save(new Avis(annonce, auteur, requete.note(), commentaire));
        audit.enregistrer("AVIS_CREE", acteur.id(), "Avis pour l'annonce " + annonceId);
        return AvisResponse.de(nouvelAvis);
    }
}
