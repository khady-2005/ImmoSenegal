CREATE TABLE commissions_locations_agence (
    id UUID PRIMARY KEY,
    agence_id UUID NOT NULL REFERENCES agences(id) ON DELETE RESTRICT,
    mandat_id UUID NOT NULL REFERENCES mandats_gestion(id) ON DELETE RESTRICT,
    contrat_id UUID NOT NULL REFERENCES contrats_location(id) ON DELETE RESTRICT,
    paiement_loyer_id UUID NOT NULL UNIQUE REFERENCES paiements_loyer(id) ON DELETE RESTRICT,
    taux_applique NUMERIC(5,2) NOT NULL CHECK (taux_applique >= 0.01 AND taux_applique <= 100.00),
    base_calcul NUMERIC(14,2) NOT NULL CHECK (base_calcul > 0),
    montant_commission NUMERIC(14,2) NOT NULL CHECK (montant_commission >= 0),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_commissions_locations_agence_date
    ON commissions_locations_agence(agence_id, cree_le DESC);
CREATE INDEX ix_commissions_locations_contrat
    ON commissions_locations_agence(contrat_id);
