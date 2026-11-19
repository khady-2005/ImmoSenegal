-- Une résiliation doit être demandée puis acceptée par l'autre partie.
ALTER TABLE contrats_location
    DROP CONSTRAINT IF EXISTS contrats_location_etat_check;

ALTER TABLE contrats_location
    ADD CONSTRAINT contrats_location_etat_check
    CHECK (etat IN ('ACTIF','TERMINE','RESILIE','RESILIATION_DEMANDEE'));

ALTER TABLE contrats_location
    ADD COLUMN resiliation_demandee_par UUID NULL REFERENCES users(id) ON DELETE RESTRICT,
    ADD COLUMN resiliation_demandee_le TIMESTAMPTZ NULL;
