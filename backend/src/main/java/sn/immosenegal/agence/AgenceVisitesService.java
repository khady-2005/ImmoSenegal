package sn.immosenegal.agence;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import sn.immosenegal.security.AuthenticatedUser;
import sn.immosenegal.user.Role;
import sn.immosenegal.visite.DemandeVisiteRepository;
import sn.immosenegal.visite.DemandeVisiteResponse;

@Service
@Transactional(readOnly = true)
public class AgenceVisitesService {
    private final MembreAgenceRepository membres;
    private final AgenceRepository agences;
    private final DemandeVisiteRepository visites;

    public AgenceVisitesService(MembreAgenceRepository membres, AgenceRepository agences,
                                DemandeVisiteRepository visites) {
        this.membres = membres;
        this.agences = agences;
        this.visites = visites;
    }

    public List<DemandeVisiteResponse> lister(UUID agenceId, AuthenticatedUser acteur) {
        agences.findById(agenceId)
            .filter(a -> a.getStatut() == StatutAgence.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agence introuvable ou inactive."));

        boolean admin = acteur != null && acteur.role() == Role.ADMIN;
        boolean membreActif = acteur != null && membres.findByAgenceIdAndUtilisateurId(agenceId, acteur.id())
            .filter(m -> m.getStatut() == StatutMembreAgence.ACTIF)
            .isPresent();
        if (!admin && !membreActif) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Vous devez être membre actif de cette agence pour consulter ses visites.");
        }

        return visites.findAllByAgenceMandatAccepte(agenceId).stream()
            .map(DemandeVisiteResponse::de)
            .toList();
    }
}
