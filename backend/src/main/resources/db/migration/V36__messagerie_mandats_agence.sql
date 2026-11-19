CREATE TABLE messages_mandats_gestion (
    id UUID PRIMARY KEY,
    mandat_id UUID NOT NULL REFERENCES mandats_gestion(id) ON DELETE CASCADE,
    expediteur_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contenu VARCHAR(2000) NOT NULL,
    envoye_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_messages_mandat_date ON messages_mandats_gestion(mandat_id, envoye_le);
