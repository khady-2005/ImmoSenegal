-- Statut distinct pour une résiliation acceptée dont la date d'effet est future.
ALTER TABLE contrats_location ALTER COLUMN etat TYPE VARCHAR(24);
ALTER TABLE contrats_location
    DROP CONSTRAINT IF EXISTS contrats_location_etat_check;

ALTER TABLE contrats_location
    ADD CONSTRAINT contrats_location_etat_check
    CHECK (etat IN ('ACTIF','TERMINE','RESILIE','RESILIATION_DEMANDEE','RESILIATION_PLANIFIEE'));
