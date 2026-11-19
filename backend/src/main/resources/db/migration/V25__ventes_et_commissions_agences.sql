CREATE TABLE agence_ventes (
 id UUID PRIMARY KEY,
 agence_id UUID NOT NULL REFERENCES agences(id) ON DELETE RESTRICT,
 annonce_id UUID NOT NULL UNIQUE REFERENCES annonces(id) ON DELETE RESTRICT,
 agent_membre_id UUID NOT NULL REFERENCES agence_membres(id) ON DELETE RESTRICT,
 acheteur_nom VARCHAR(150) NOT NULL,
 acheteur_telephone VARCHAR(30),
 prix_vente NUMERIC(16,2) NOT NULL CHECK (prix_vente > 0),
 taux_commission NUMERIC(5,2) NOT NULL CHECK (taux_commission >= 0 AND taux_commission <= 20),
 part_agent NUMERIC(5,2) NOT NULL CHECK (part_agent >= 0 AND part_agent <= 100),
 date_vente DATE NOT NULL,
 statut VARCHAR(20) NOT NULL DEFAULT 'ENREGISTREE',
 cree_par UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_agence_ventes_agence_date ON agence_ventes(agence_id,date_vente DESC);
CREATE INDEX ix_agence_ventes_agent ON agence_ventes(agent_membre_id,date_vente DESC);