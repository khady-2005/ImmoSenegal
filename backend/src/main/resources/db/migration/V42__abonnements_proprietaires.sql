CREATE TABLE abonnements_proprietaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proprietaire_id UUID NOT NULL REFERENCES users(id),
    forfait VARCHAR(20) NOT NULL CHECK (forfait IN ('MENSUEL', 'TRIMESTRIEL', 'ANNUEL')),
    montant NUMERIC(12,2) NOT NULL CHECK (montant > 0),
    date_debut DATE,
    date_fin DATE,
    statut VARCHAR(20) NOT NULL CHECK (statut IN ('EN_ATTENTE', 'ACTIF', 'REFUSE', 'EXPIRE')),
    mode_paiement VARCHAR(30) NOT NULL,
    reference_paiement VARCHAR(150),
    note TEXT,
    valide_par UUID REFERENCES users(id),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_abonnements_proprietaire ON abonnements_proprietaires(proprietaire_id, cree_le DESC);
CREATE INDEX idx_abonnements_statut ON abonnements_proprietaires(statut);
