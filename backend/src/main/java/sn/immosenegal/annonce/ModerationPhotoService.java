package sn.immosenegal.annonce;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sn.immosenegal.common.ApiException;
import sn.immosenegal.notification.NotificationService;
import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;

@Service
public class ModerationPhotoService {
    private final AvertissementPhotoRepository avertissements;
    private final AnnonceRepository annonces;
    private final PhotoRepository photos;
    private final NotificationService notifications;

    public ModerationPhotoService(AvertissementPhotoRepository avertissements, AnnonceRepository annonces,
            PhotoRepository photos, NotificationService notifications) {
        this.avertissements = avertissements;
        this.annonces = annonces;
        this.photos = photos;
        this.notifications = notifications;
    }

    public record AvertissementResponse(UUID id, UUID annonceId, UUID photoId, String titreAnnonce,
            String nomProprietaire, String motif, Instant creeLe, Instant echeanceLe,
            StatutAvertissementPhoto statut, String reponseProprietaire, Instant reponduLe) {}

    @Transactional
    public AvertissementResponse avertir(UUID annonceId, UUID photoId, String motif, AuthenticatedUser admin) {
        exigerAdmin(admin);
        Annonce annonce = annonces.findById(annonceId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
        if ((annonce.getAgence() != null && annonce.getAgence().getType() == sn.immosenegal.agence.AgenceType.INTERNE)
                || (annonce.isPublieeParAgence() && annonce.getAgence() == null)) {
            throw new ApiException(HttpStatus.CONFLICT, "Les photos d'une annonce ImmoSénégal se gèrent directement, sans avertissement.");
        }
        if (motif == null || motif.isBlank() || motif.trim().length() > 500) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Un motif de 1 à 500 caractères est obligatoire.");
        }
        PhotoAnnonce photo = photos.findByIdAndAnnonceId(photoId, annonceId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Photo introuvable."));
        if (avertissements.existsByPhotoIdAndStatut(photoId, StatutAvertissementPhoto.EN_ATTENTE)) {
            throw new ApiException(HttpStatus.CONFLICT, "Un avertissement est déjà en cours pour cette photo.");
        }
        Instant maintenant = Instant.now();
        AvertissementPhoto avertissement = avertissements.save(new AvertissementPhoto(
            annonceId, photo.getId(), annonce.getProprietaire(), admin.id(), motif.trim(),
            maintenant.plus(48, ChronoUnit.HOURS)));
        String motifCourt = motif.trim().length() > 280 ? motif.trim().substring(0, 280) : motif.trim();
        notifications.creer(annonce.getProprietaire(), "AVERTISSEMENT_PHOTO",
            "Photo à corriger sous 48 heures",
            "Photo signalée sur « " + annonce.getTitre() + " » : " + motifCourt
                + ". Corrigez-la ou répondez sous 48 heures.",
            "/mes-annonces");
        return convertir(avertissement, annonce.getTitre());
    }

    @Transactional(readOnly = true)
    public List<AvertissementResponse> lister(AuthenticatedUser admin) {
        exigerAdmin(admin);
        return avertissements.findAllByOrderByCreeLeDesc().stream().map(a -> {
            String titre = annonces.findById(a.getAnnonceId()).map(Annonce::getTitre).orElse("Annonce supprimée");
            return convertir(a, titre);
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<AvertissementResponse> mesAvertissements(UUID annonceId, AuthenticatedUser proprietaire) {
        if (proprietaire == null || proprietaire.role() != Role.PROPRIETAIRE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Réservé au propriétaire de l'annonce.");
        }
        Annonce annonce = annonces.findById(annonceId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
        if (!annonce.getProprietaire().getId().equals(proprietaire.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cette annonce ne vous appartient pas.");
        }
        return avertissements.findAllByAnnonceIdAndProprietaireIdOrderByCreeLeDesc(annonceId, proprietaire.id())
            .stream().map(a -> convertir(a, annonce.getTitre())).toList();
    }

    @Transactional(readOnly = true)
    public List<AvertissementResponse> mesAvertissementsToutesAnnonces(AuthenticatedUser proprietaire) {
        if (proprietaire == null || proprietaire.role() != Role.PROPRIETAIRE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Réservé au propriétaire.");
        }
        return avertissements.findAllByProprietaireIdOrderByCreeLeDesc(proprietaire.id()).stream()
            .map(a -> {
                String titre = annonces.findById(a.getAnnonceId())
                    .map(Annonce::getTitre).orElse("Annonce supprimée");
                return convertir(a, titre);
            })
            .toList();
    }

    @Transactional
    public AvertissementResponse repondre(UUID annonceId, UUID photoId, String reponse, AuthenticatedUser acteur) {
        if (acteur == null || acteur.role() != Role.PROPRIETAIRE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Seul le propriétaire peut répondre à cet avertissement.");
        }
        Annonce annonce = annonces.findById(annonceId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Annonce introuvable."));
        if (!annonce.getProprietaire().getId().equals(acteur.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cette annonce ne vous appartient pas.");
        }
        if (reponse == null || reponse.isBlank() || reponse.trim().length() > 1000) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La réponse doit contenir entre 1 et 1 000 caractères.");
        }
        AvertissementPhoto a = avertissements.findAllByOrderByCreeLeDesc().stream()
            .filter(x -> x.getAnnonceId().equals(annonceId) && x.getPhotoId().equals(photoId)
                && x.getStatut() == StatutAvertissementPhoto.EN_ATTENTE)
            .findFirst().orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Aucun avertissement en attente pour cette photo."));
        if (Instant.now().isAfter(a.getEcheanceLe())) {
            throw new ApiException(HttpStatus.GONE, "Le délai de réponse de 48 heures est dépassé.");
        }
        a.repondre(reponse.trim());
        return convertir(a, annonce.getTitre());
    }

    @Transactional
    public AvertissementResponse decider(UUID avertissementId, boolean retirer, AuthenticatedUser admin) {
        exigerAdmin(admin);
        AvertissementPhoto a = avertissements.findById(avertissementId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Avertissement introuvable."));
        if (a.getStatut() != StatutAvertissementPhoto.REPONDU) {
            throw new ApiException(HttpStatus.CONFLICT, "Seul un avertissement ayant reçu une réponse peut être traité ici.");
        }
        String titre = annonces.findById(a.getAnnonceId()).map(Annonce::getTitre).orElse("votre annonce");
        if (retirer) {
            photos.findByIdAndAnnonceId(a.getPhotoId(), a.getAnnonceId()).ifPresent(photos::delete);
            a.terminer(StatutAvertissementPhoto.RETIRE);
            notifications.creer(a.getProprietaire(), "PHOTO_RETIRE_MODERATION",
                "Photo retirée après examen",
                "Après examen de votre réponse, l'administration a décidé de retirer la photo de « " + titre + " ».",
                "/mes-annonces");
        } else {
            a.terminer(StatutAvertissementPhoto.CORRIGE);
            notifications.creer(a.getProprietaire(), "AVERTISSEMENT_PHOTO_CLOTURE",
                "Avertissement photo clôturé",
                "L'administration a examiné votre réponse et a clôturé l'avertissement concernant « " + titre + " ».",
                "/mes-annonces");
        }
        return convertir(a, titre);
    }

    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void traiterEcheances() {
        Instant maintenant = Instant.now();
        List<AvertissementPhoto> echus = avertissements.findAllByStatutAndEcheanceLeLessThanEqual(
            StatutAvertissementPhoto.EN_ATTENTE, maintenant);
        for (AvertissementPhoto a : echus) {
            var photo = photos.findByIdAndAnnonceId(a.getPhotoId(), a.getAnnonceId());
            if (photo.isPresent()) {
                photos.delete(photo.get());
                a.terminer(StatutAvertissementPhoto.RETIRE);
                notifications.creer(a.getProprietaire(), "PHOTO_RETIRE_MODERATION",
                    "Photo retirée du catalogue",
                    "La photo signalée de votre annonce a été retirée, car aucune réponse n'a été reçue dans le délai de 48 heures.",
                    "/mes-annonces");
            } else {
                a.terminer(StatutAvertissementPhoto.CORRIGE);
            }
        }
    }

    private AvertissementResponse convertir(AvertissementPhoto a, String titre) {
        return new AvertissementResponse(a.getId(), a.getAnnonceId(), a.getPhotoId(), titre,
            a.getProprietaire().getNomComplet(), a.getMotif(), a.getCreeLe(), a.getEcheanceLe(),
            a.getStatut(), a.getReponseProprietaire(), a.getReponduLe());
    }

    private void exigerAdmin(AuthenticatedUser admin) {
        if (admin == null || admin.role() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Réservé aux administrateurs.");
        }
    }
}
