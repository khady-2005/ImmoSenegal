-- Conserver l'historique des refus et résiliations tout en autorisant une nouvelle demande.
ALTER TABLE mandats_gestion DROP CONSTRAINT IF EXISTS uq_mandat_agence_annonce;

-- Empêcher uniquement les doublons encore actifs pour un même bien et une même agence.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mandat_agence_annonce_actif
    ON mandats_gestion(agence_id, annonce_id)
    WHERE statut IN ('EN_ATTENTE', 'ACCEPTE', 'RESILIATION_DEMANDEE');
