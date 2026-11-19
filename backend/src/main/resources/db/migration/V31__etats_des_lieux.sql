CREATE TABLE etats_des_lieux (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrat_id UUID NOT NULL REFERENCES contrats_location(id) ON DELETE CASCADE,
    cree_par UUID NOT NULL REFERENCES users(id),
    type VARCHAR(12) NOT NULL CHECK (type IN ('ENTREE', 'SORTIE')),
    date_constat DATE NOT NULL,
    observations VARCHAR(5000) NOT NULL,
    statut VARCHAR(16) NOT NULL DEFAULT 'EN_ATTENTE'
        CHECK (statut IN ('EN_ATTENTE', 'ACCEPTE', 'CONTESTE')),
    commentaire_decision VARCHAR(1500),
    decide_par UUID REFERENCES users(id),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_etats_des_lieux_contrat_date
    ON etats_des_lieux (contrat_id, cree_le DESC);
CREATE UNIQUE INDEX uq_etat_des_lieux_type_contrat
    ON etats_des_lieux (contrat_id, type);
