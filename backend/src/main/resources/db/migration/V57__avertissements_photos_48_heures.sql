-- V57 : suivi des photos signalées et délai de correction de 48 heures.
CREATE TABLE avertissements_photos (
    id UUID PRIMARY KEY,
    annonce_id UUID NOT NULL,
    photo_id UUID NOT NULL,
    proprietaire_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL,
    motif VARCHAR(500) NOT NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    echeance_le TIMESTAMPTZ NOT NULL,
    statut VARCHAR(20) NOT NULL CHECK (statut IN ('EN_ATTENTE', 'REPONDU', 'CORRIGE', 'RETIRE')),
    reponse_proprietaire VARCHAR(1000),
    repondu_le TIMESTAMPTZ,
    traite_le TIMESTAMPTZ
);

CREATE INDEX ix_avertissements_photos_echeance
    ON avertissements_photos(statut, echeance_le);
CREATE INDEX ix_avertissements_photos_photo
    ON avertissements_photos(photo_id, statut);
