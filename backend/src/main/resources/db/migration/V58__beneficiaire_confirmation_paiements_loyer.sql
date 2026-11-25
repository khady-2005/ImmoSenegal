ALTER TABLE paiements_loyer
    ADD COLUMN beneficiaire_type VARCHAR(20) NOT NULL DEFAULT 'PROPRIETAIRE',
    ADD COLUMN beneficiaire_id UUID,
    ADD COLUMN beneficiaire_nom VARCHAR(160),
    ADD COLUMN statut_confirmation VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE',
    ADD COLUMN confirme_le TIMESTAMPTZ;

UPDATE paiements_loyer p
SET beneficiaire_id = c.proprietaire_id,
    beneficiaire_nom = u.nom_complet
FROM contrats_location c
JOIN users u ON u.id = c.proprietaire_id
WHERE p.contrat_id = c.id;

ALTER TABLE paiements_loyer
    ALTER COLUMN beneficiaire_id SET NOT NULL,
    ALTER COLUMN beneficiaire_nom SET NOT NULL;

ALTER TABLE paiements_loyer
    ADD CONSTRAINT ck_paiements_loyer_statut_confirmation
    CHECK (statut_confirmation IN ('EN_ATTENTE', 'CONFIRME', 'REFUSE')),
    ADD CONSTRAINT ck_paiements_loyer_beneficiaire_type
    CHECK (beneficiaire_type IN ('PROPRIETAIRE', 'AGENCE'));
