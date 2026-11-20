ALTER TABLE abonnements_proprietaires
    ADD COLUMN paydunya_token VARCHAR(120),
    ADD COLUMN paiement_confirme_le TIMESTAMPTZ,
    ADD COLUMN reference_fournisseur VARCHAR(150);

CREATE UNIQUE INDEX uq_abonnements_paydunya_token
    ON abonnements_proprietaires(paydunya_token)
    WHERE paydunya_token IS NOT NULL;
