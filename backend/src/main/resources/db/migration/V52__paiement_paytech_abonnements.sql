-- Référence unique de commande PayTech pour rattacher les notifications IPN à un abonnement.
ALTER TABLE abonnements_proprietaires
    ADD COLUMN paytech_ref_command VARCHAR(80);

CREATE UNIQUE INDEX uq_abonnements_paytech_ref_command
    ON abonnements_proprietaires(paytech_ref_command)
    WHERE paytech_ref_command IS NOT NULL;
