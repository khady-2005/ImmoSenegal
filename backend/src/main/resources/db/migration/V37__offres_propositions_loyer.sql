CREATE TABLE offres_location (
    id UUID PRIMARY KEY,
    annonce_id UUID NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
    locataire_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    loyer_propose NUMERIC(14,2) NOT NULL CHECK (loyer_propose > 0),
    message VARCHAR(1000),
    statut VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE',
    reponse_decideur VARCHAR(1000),
    decideur_id UUID REFERENCES users(id) ON DELETE SET NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_offres_location_locataire_date ON offres_location(locataire_id, cree_le DESC);
CREATE INDEX ix_offres_location_annonce_date ON offres_location(annonce_id, cree_le DESC);
CREATE INDEX ix_offres_location_attente ON offres_location(annonce_id, locataire_id) WHERE statut = 'EN_ATTENTE';
