ALTER TABLE mandats_gestion
    ADD COLUMN IF NOT EXISTS gestionnaire_id UUID;

ALTER TABLE mandats_gestion
    ADD CONSTRAINT fk_mandats_gestion_gestionnaire
    FOREIGN KEY (gestionnaire_id) REFERENCES agence_membres(id);

CREATE INDEX IF NOT EXISTS idx_mandats_gestionnaire
    ON mandats_gestion (gestionnaire_id, statut);
