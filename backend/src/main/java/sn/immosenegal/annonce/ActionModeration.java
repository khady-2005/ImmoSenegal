package sn.immosenegal.annonce;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;

/** Décisions possibles d'un administrateur, avec les statuts de départ autorisés pour chacune. */
public enum ActionModeration {

    VALIDER(StatutAnnonce.PUBLIEE, false, "ANNONCE_VALIDEE", StatutAnnonce.EN_ATTENTE, StatutAnnonce.SUSPENDUE),
    REFUSER(StatutAnnonce.REFUSEE, true, "ANNONCE_REFUSEE", StatutAnnonce.EN_ATTENTE),
    SUSPENDRE(StatutAnnonce.SUSPENDUE, true, "ANNONCE_SUSPENDUE", StatutAnnonce.PUBLIEE, StatutAnnonce.RESERVE),
    DEMANDER_CORRECTION(StatutAnnonce.A_CORRIGER, true, "ANNONCE_CORRECTION_DEMANDEE", StatutAnnonce.EN_ATTENTE);

    private final StatutAnnonce vers;
    private final boolean motifObligatoire;
    private final String evenement;
    private final Set<StatutAnnonce> depuis;

    ActionModeration(StatutAnnonce vers, boolean motifObligatoire, String evenement, StatutAnnonce... depuis) {
        this.vers = vers;
        this.motifObligatoire = motifObligatoire;
        this.evenement = evenement;
        this.depuis = EnumSet.copyOf(Arrays.asList(depuis));
    }

    public StatutAnnonce vers() {
        return vers;
    }

    public boolean motifObligatoire() {
        return motifObligatoire;
    }

    /** Nom de l'événement écrit dans le journal d'audit. */
    public String evenement() {
        return evenement;
    }

    public Set<StatutAnnonce> depuis() {
        return depuis;
    }
}
