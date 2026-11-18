CREATE TABLE mandats_gestion (
    id UUID PRIMARY KEY,
    agence_id UUID NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
    annonce_id UUID NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
    proprietaire_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    propose_par UUID NOT NULL REFERENCES users(id),
    statut VARCHAR(20) NOT NULL CHECK (statut IN ('EN_ATTENTE', 'ACCEPTE', 'REFUSE')),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    decide_le TIMESTAMPTZ,
    CONSTRAINT uq_mandat_agence_annonce UNIQUE (agence_id, annonce_id)
);
CREATE INDEX ix_mandats_proprietaire_statut ON mandats_gestion(proprietaire_id, statut);
CREATE INDEX ix_mandats_agence_statut ON mandats_gestion(agence_id, statut);
