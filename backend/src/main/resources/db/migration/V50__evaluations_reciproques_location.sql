CREATE TABLE evaluations_location (
    id UUID PRIMARY KEY,
    contrat_id UUID NOT NULL REFERENCES contrats_location(id) ON DELETE CASCADE,
    auteur_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    evalue_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    note INTEGER NOT NULL CHECK (note BETWEEN 1 AND 5),
    commentaire VARCHAR(1200) NOT NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_evaluation_autrui CHECK (auteur_id <> evalue_id),
    CONSTRAINT uk_evaluation_contrat_auteur UNIQUE (contrat_id, auteur_id)
);
CREATE INDEX ix_evaluations_location_evalue ON evaluations_location(evalue_id, cree_le DESC);
