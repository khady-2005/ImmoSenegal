ALTER TABLE contrats_location
    ADD COLUMN proprietaire_signature TEXT,
    ADD COLUMN locataire_signature TEXT,
    ADD COLUMN proprietaire_signe_le TIMESTAMPTZ,
    ADD COLUMN locataire_signe_le TIMESTAMPTZ;
