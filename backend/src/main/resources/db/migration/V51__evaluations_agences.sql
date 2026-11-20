CREATE TABLE evaluations_agence (
    id UUID PRIMARY KEY,
    mandat_id UUID NOT NULL UNIQUE REFERENCES mandats_gestion(id) ON DELETE CASCADE,
    auteur_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    note INTEGER NOT NULL CHECK (note BETWEEN 1 AND 5),
    commentaire VARCHAR(1200) NOT NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_evaluations_agence_mandat ON evaluations_agence(mandat_id);
