CREATE TABLE contrats_location (
 id UUID PRIMARY KEY,
 annonce_id UUID NOT NULL REFERENCES annonces(id) ON DELETE RESTRICT,
 proprietaire_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 locataire_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 reservation_id UUID NOT NULL UNIQUE REFERENCES reservations(id) ON DELETE RESTRICT,
 loyer_mensuel NUMERIC(14,2) NOT NULL CHECK (loyer_mensuel > 0),
 depot_garantie NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (depot_garantie >= 0),
 date_debut DATE NOT NULL,
 date_fin DATE,
 etat VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (etat IN ('ACTIF','TERMINE','RESILIE')),
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (date_fin IS NULL OR date_fin >= date_debut)
);
CREATE INDEX ix_contrats_location_proprietaire ON contrats_location(proprietaire_id,cree_le DESC);
CREATE INDEX ix_contrats_location_locataire ON contrats_location(locataire_id,cree_le DESC);
CREATE TABLE paiements_loyer (
 id UUID PRIMARY KEY,
 contrat_id UUID NOT NULL REFERENCES contrats_location(id) ON DELETE RESTRICT,
 enregistre_par UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 montant NUMERIC(14,2) NOT NULL CHECK (montant > 0),
 periode DATE NOT NULL,
 date_paiement DATE NOT NULL,
 reference VARCHAR(500),
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_paiements_loyer_contrat_periode ON paiements_loyer(contrat_id,periode DESC);
