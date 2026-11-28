-- 1. Stockage Cloudinary des photos d'annonces (les anciennes photos en BYTEA restent lisibles jusqu'au transfert).
ALTER TABLE annonce_photos
    ALTER COLUMN contenu DROP NOT NULL;

ALTER TABLE annonce_photos
    ADD COLUMN IF NOT EXISTS url_externe VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255);

-- 2. Justificatifs privés, traçabilité du décideur et verrouillage optimiste sur demandes_role.
ALTER TABLE demandes_role
    ADD COLUMN IF NOT EXISTS justificatif_nom VARCHAR(255),
    ADD COLUMN IF NOT EXISTS justificatif_type_mime VARCHAR(80),
    ADD COLUMN IF NOT EXISTS justificatif_contenu BYTEA,
    ADD COLUMN IF NOT EXISTS decide_par_nom VARCHAR(120),
    ADD COLUMN IF NOT EXISTS motif_decision VARCHAR(500),
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
