-- Une vidéo facultative par annonce. Taille limitée à 30 Mo par l'application.
CREATE TABLE annonce_videos (
    id         UUID         PRIMARY KEY,
    annonce_id UUID         NOT NULL UNIQUE REFERENCES annonces (id) ON DELETE CASCADE,
    contenu    BYTEA        NOT NULL,
    type_mime  VARCHAR(20)  NOT NULL CHECK (type_mime IN ('video/mp4', 'video/webm')),
    cree_le    TIMESTAMPTZ  NOT NULL DEFAULT now()
);