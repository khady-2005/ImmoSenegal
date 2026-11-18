CREATE TABLE agence_missions (
    id UUID PRIMARY KEY,
    agence_id UUID NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
    membre_id UUID NOT NULL REFERENCES agence_membres(id) ON DELETE CASCADE,
    createur_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    titre VARCHAR(160) NOT NULL,
    description VARCHAR(2000),
    date_echeance DATE,
    statut VARCHAR(20) NOT NULL DEFAULT 'A_FAIRE'
        CHECK (statut IN ('A_FAIRE', 'EN_COURS', 'TERMINEE')),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_agence_missions_agence_date ON agence_missions (agence_id, cree_le DESC);
CREATE INDEX ix_agence_missions_membre_statut ON agence_missions (membre_id, statut, cree_le DESC);
