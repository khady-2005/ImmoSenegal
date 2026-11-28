-- 1. Messagerie directe par fil (annonce + interlocuteur client) afin que le client voie les réponses
--    et que personne d'autre ne puisse lire ses échanges.
ALTER TABLE messages_directs
    ADD COLUMN IF NOT EXISTS interlocuteur_id UUID REFERENCES users(id) ON DELETE CASCADE;

UPDATE messages_directs
SET interlocuteur_id = expediteur_id
WHERE interlocuteur_id IS NULL;

ALTER TABLE messages_directs
    ALTER COLUMN interlocuteur_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_messages_directs_conv
    ON messages_directs(annonce_id, interlocuteur_id, cree_le ASC);

-- 2. Contrainte anti-double paiement en base sur paiements_loyer (un paiement non refusé par contrat et par mois).
ALTER TABLE paiements_loyer
    ADD COLUMN IF NOT EXISTS periode_mois VARCHAR(7);

UPDATE paiements_loyer
SET periode_mois = to_char(periode, 'YYYY-MM')
WHERE periode_mois IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_paiements_loyer_contrat_mois_actif
    ON paiements_loyer(contrat_id, periode_mois)
    WHERE statut_confirmation <> 'REFUSE';
