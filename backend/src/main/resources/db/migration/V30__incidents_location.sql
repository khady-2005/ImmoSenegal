CREATE TABLE incidents_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrat_id UUID NOT NULL REFERENCES contrats_location(id) ON DELETE CASCADE,
    declare_par UUID NOT NULL REFERENCES users(id),
    categorie VARCHAR(80) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'OUVERT'
        CHECK (statut IN ('OUVERT', 'EN_COURS', 'RESOLU', 'CLOTURE')),
    commentaire_resolution VARCHAR(1500),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_incidents_location_contrat_date
    ON incidents_location (contrat_id, cree_le DESC);
