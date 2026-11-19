ALTER TABLE agence_missions
    ADD COLUMN rapport TEXT,
    ADD COLUMN rapport_le TIMESTAMPTZ,
    ADD COLUMN rapport_par UUID REFERENCES users(id);
