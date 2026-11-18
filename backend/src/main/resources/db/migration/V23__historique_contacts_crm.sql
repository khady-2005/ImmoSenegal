CREATE TABLE agence_contact_activites (
    id UUID PRIMARY KEY,
    contact_id UUID NOT NULL REFERENCES agence_contacts(id) ON DELETE CASCADE,
    auteur_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('NOTE', 'APPEL', 'EMAIL', 'VISITE', 'AUTRE')),
    contenu VARCHAR(2000) NOT NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_contact_activites_contact_date
    ON agence_contact_activites (contact_id, cree_le DESC);
