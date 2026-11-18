CREATE TABLE agence_candidatures (
    id UUID PRIMARY KEY,
    agence_id UUID NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fonction VARCHAR(25) NOT NULL CHECK (fonction IN ('GESTIONNAIRE', 'AGENT')),
    statut VARCHAR(20) NOT NULL CHECK (statut IN ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE')),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    traitee_le TIMESTAMPTZ
);

CREATE INDEX ix_agence_candidatures_agence_statut
    ON agence_candidatures (agence_id, statut, cree_le DESC);

CREATE INDEX ix_agence_candidatures_user
    ON agence_candidatures (user_id, cree_le DESC);

CREATE UNIQUE INDEX uq_agence_candidature_en_attente
    ON agence_candidatures (agence_id, user_id)
    WHERE statut = 'EN_ATTENTE';
