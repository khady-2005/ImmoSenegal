ALTER TABLE mandats_gestion
    ADD COLUMN taux_commission_mensuel NUMERIC(5,2);

ALTER TABLE mandats_gestion
    ADD CONSTRAINT ck_mandats_taux_commission
    CHECK (taux_commission_mensuel IS NULL OR
           (taux_commission_mensuel >= 0.01 AND taux_commission_mensuel <= 100.00));
