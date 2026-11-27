-- Rattachement explicite d'une annonce à son agence diffuseuse (ImmoSénégal ou agence partenaire).
ALTER TABLE annonces
    ADD COLUMN IF NOT EXISTS agence_id UUID REFERENCES agences(id);

CREATE INDEX IF NOT EXISTS idx_annonces_agence ON annonces(agence_id);

UPDATE annonces
SET agence_id = '8cfd2d31-36b0-4c0a-8a1f-5c6a7b9d1101'
WHERE publiee_par_agence = TRUE AND agence_id IS NULL;
