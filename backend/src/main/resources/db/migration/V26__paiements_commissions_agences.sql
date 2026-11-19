CREATE TABLE agence_paiements_commissions (
 id UUID PRIMARY KEY,
 vente_id UUID NOT NULL REFERENCES agence_ventes(id) ON DELETE RESTRICT,
 beneficiaire VARCHAR(10) NOT NULL CHECK (beneficiaire IN ('AGENCE','AGENT')),
 montant NUMERIC(16,2) NOT NULL CHECK (montant > 0),
 date_paiement DATE NOT NULL,
 mode_paiement VARCHAR(30) NOT NULL,
 reference VARCHAR(150),
 note VARCHAR(500),
 enregistre_par UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_agence_paiements_vente_date
 ON agence_paiements_commissions(vente_id, date_paiement DESC);
CREATE INDEX ix_agence_paiements_beneficiaire
 ON agence_paiements_commissions(vente_id, beneficiaire);
