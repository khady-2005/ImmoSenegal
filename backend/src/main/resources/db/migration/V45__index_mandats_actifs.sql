-- Empêcher les doublons actifs pour un même bien et une même agence.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mandat_agence_annonce_actif
    ON mandats_gestion(agence_id, annonce_id)
    WHERE statut IN ('EN_ATTENTE', 'ACCEPTE', 'RESILIATION_DEMANDEE');
