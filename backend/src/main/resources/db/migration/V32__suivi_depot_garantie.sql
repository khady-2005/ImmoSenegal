CREATE TABLE suivis_depot_garantie (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrat_id UUID NOT NULL UNIQUE REFERENCES contrats_location(id) ON DELETE CASCADE,
    propose_par UUID NOT NULL REFERENCES users(id),
    montant_restitue NUMERIC(14,2) NOT NULL CHECK (montant_restitue >= 0),
    montant_retenu NUMERIC(14,2) NOT NULL CHECK (montant_retenu >= 0),
    motif_retenue VARCHAR(1500),
    statut VARCHAR(16) NOT NULL DEFAULT 'A_CONFIRMER'
        CHECK (statut IN ('A_CONFIRMER', 'CONFIRME', 'CONTESTE')),
    commentaire_locataire VARCHAR(1500),
    decide_le TIMESTAMPTZ,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
