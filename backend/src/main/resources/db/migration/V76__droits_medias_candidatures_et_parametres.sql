-- 1. Attribution d'un agent/gestionnaire sur les annonces d'agence
ALTER TABLE annonces
    ADD COLUMN IF NOT EXISTS agent_membre_id UUID REFERENCES agence_membres(id) ON DELETE SET NULL;

-- 2. Stockage Cloudinary des vidéos d'annonces (anciennes vidéos en BYTEA conservées)
ALTER TABLE annonce_videos
    ALTER COLUMN contenu DROP NOT NULL;

ALTER TABLE annonce_videos
    ADD COLUMN IF NOT EXISTS url_externe VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255);

-- 3. Détails complets et CV privé sur les candidatures aux agences
ALTER TABLE agence_candidatures
    ADD COLUMN IF NOT EXISTS telephone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS zone VARCHAR(120),
    ADD COLUMN IF NOT EXISTS motivation VARCHAR(2000),
    ADD COLUMN IF NOT EXISTS cv_nom VARCHAR(255),
    ADD COLUMN IF NOT EXISTS cv_type_mime VARCHAR(80),
    ADD COLUMN IF NOT EXISTS cv_contenu BYTEA;

-- 4. Paramètres configurables de la plateforme
CREATE TABLE IF NOT EXISTS parametres_plateforme (
    cle        VARCHAR(80) PRIMARY KEY,
    valeur     VARCHAR(255) NOT NULL,
    libelle    VARCHAR(200) NOT NULL,
    modifie_le TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO parametres_plateforme (cle, valeur, libelle) VALUES
    ('duree_gratuite_jours', '15', 'Durée gratuite initiale (jours)'),
    ('forfait_mensuel_fcfa', '5000', 'Forfait mensuel propriétaire (FCFA)'),
    ('forfait_trimestriel_fcfa', '13500', 'Forfait trimestriel propriétaire (FCFA)'),
    ('forfait_annuel_fcfa', '50000', 'Forfait annuel propriétaire (FCFA)'),
    ('photos_max_par_annonce', '15', 'Nombre maximum de photos par annonce')
ON CONFLICT (cle) DO NOTHING;
