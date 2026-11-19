-- Informations explicites pour réduire les malentendus lors d'une demande de résiliation.
ALTER TABLE contrats_location
    ADD COLUMN resiliation_motif VARCHAR(1000),
    ADD COLUMN date_fin_souhaitee DATE;
