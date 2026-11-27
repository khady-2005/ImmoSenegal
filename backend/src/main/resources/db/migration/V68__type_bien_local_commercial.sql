-- Ajout du type de bien LOCAL_COMMERCIAL sur la table annonces.
ALTER TABLE annonces DROP CONSTRAINT IF EXISTS annonces_type_bien_check;
ALTER TABLE annonces ADD CONSTRAINT annonces_type_bien_check
    CHECK (type_bien IN ('MAISON', 'APPARTEMENT', 'STUDIO', 'VILLA', 'TERRAIN', 'LOCAL_COMMERCIAL'));
