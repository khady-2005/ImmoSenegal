-- Ajout des catégories manquantes (CHAMBRE, IMMEUBLE, BUREAU, AUTRE) et des champs chambres, salles_de_bain, vues.
ALTER TABLE annonces DROP CONSTRAINT IF EXISTS annonces_type_bien_check;
ALTER TABLE annonces ADD CONSTRAINT annonces_type_bien_check
    CHECK (type_bien IN ('MAISON', 'APPARTEMENT', 'STUDIO', 'VILLA', 'TERRAIN', 'LOCAL_COMMERCIAL', 'CHAMBRE', 'IMMEUBLE', 'BUREAU', 'AUTRE'));

ALTER TABLE annonces
    ADD COLUMN IF NOT EXISTS chambres INTEGER CHECK (chambres >= 0),
    ADD COLUMN IF NOT EXISTS salles_de_bain INTEGER CHECK (salles_de_bain >= 0),
    ADD COLUMN IF NOT EXISTS vues BIGINT NOT NULL DEFAULT 0;
