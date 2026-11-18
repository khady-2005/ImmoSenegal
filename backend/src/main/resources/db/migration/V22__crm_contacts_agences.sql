CREATE TABLE agence_contacts (
    id UUID PRIMARY KEY,
    agence_id UUID NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
    createur_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    membre_assigne_id UUID REFERENCES agence_membres(id) ON DELETE SET NULL,
    nom VARCHAR(120) NOT NULL,
    email VARCHAR(254),
    telephone VARCHAR(30),
    type_besoin VARCHAR(20) NOT NULL CHECK (type_besoin IN ('ACHAT', 'LOCATION', 'VENTE', 'MISE_EN_LOCATION', 'AUTRE')),
    recherche VARCHAR(160),
    ville VARCHAR(100),
    notes VARCHAR(2000),
    statut VARCHAR(25) NOT NULL DEFAULT 'NOUVEAU'
        CHECK (statut IN ('NOUVEAU', 'A_CONTACTER', 'EN_NEGOCIATION', 'CLIENT', 'PERDU')),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_agence_contacts_agence_date ON agence_contacts (agence_id, cree_le DESC);
CREATE INDEX ix_agence_contacts_assigne_statut ON agence_contacts (membre_assigne_id, statut, cree_le DESC);
