CREATE TABLE agence_mouvements_caisse (
    id UUID PRIMARY KEY,
    agence_id UUID NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
    cree_par UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    traite_par UUID REFERENCES users(id) ON DELETE RESTRICT,
    type VARCHAR(12) NOT NULL CHECK (type IN ('RECETTE', 'DEPENSE')),
    libelle VARCHAR(140) NOT NULL,
    description VARCHAR(1000),
    montant NUMERIC(16,2) NOT NULL CHECK (montant > 0),
    date_mouvement DATE NOT NULL,
    justificatif_url VARCHAR(500),
    statut VARCHAR(12) NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'VALIDE', 'REFUSE')),
    motif_refus VARCHAR(500),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    traite_le TIMESTAMPTZ
);
CREATE INDEX ix_agence_caisse_historique ON agence_mouvements_caisse(agence_id, date_mouvement DESC, cree_le DESC);
