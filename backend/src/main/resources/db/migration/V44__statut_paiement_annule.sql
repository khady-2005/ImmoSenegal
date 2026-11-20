ALTER TABLE abonnements_proprietaires
    DROP CONSTRAINT abonnements_proprietaires_statut_check;

ALTER TABLE abonnements_proprietaires
    ADD CONSTRAINT abonnements_proprietaires_statut_check
    CHECK (statut IN ('EN_ATTENTE', 'ACTIF', 'REFUSE', 'EXPIRE', 'ANNULE'));
