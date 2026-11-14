CREATE TABLE avis (
    id UUID PRIMARY KEY,
    annonce_id UUID NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
    auteur_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note INTEGER NOT NULL CHECK (note BETWEEN 1 AND 5),
    commentaire VARCHAR(1200) NOT NULL,
    cree_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_avis_annonce_auteur UNIQUE (annonce_id, auteur_id)
);

CREATE INDEX idx_avis_annonce_date ON avis(annonce_id, cree_le DESC);
