ALTER TABLE mandats_gestion DROP CONSTRAINT IF EXISTS mandats_gestion_statut_check;
ALTER TABLE mandats_gestion ADD CONSTRAINT mandats_gestion_statut_check
    CHECK (statut IN ('EN_ATTENTE', 'ACCEPTE', 'REFUSE', 'RESILIATION_DEMANDEE', 'RESILIE'));
ALTER TABLE mandats_gestion ADD COLUMN resiliation_demandee_par UUID REFERENCES users(id);
CREATE INDEX ix_mandats_annonce_statut ON mandats_gestion(annonce_id, statut);
