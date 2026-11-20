ALTER TABLE contrats_location
    ADD COLUMN proprietaire_confirme_le TIMESTAMP WITH TIME ZONE,
    ADD COLUMN locataire_confirme_le TIMESTAMP WITH TIME ZONE;
