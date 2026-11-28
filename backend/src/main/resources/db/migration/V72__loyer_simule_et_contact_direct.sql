-- Loyer simulé avec code de vérification pour reçu QR + messagerie directe avant réservation.
ALTER TABLE paiements_loyer
    ADD COLUMN IF NOT EXISTS code_verification VARCHAR(64) UNIQUE,
    ADD COLUMN IF NOT EXISTS mode_paiement VARCHAR(30);

CREATE TABLE IF NOT EXISTS messages_directs (
    id            UUID          PRIMARY KEY,
    annonce_id    UUID          NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
    expediteur_id UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contenu       VARCHAR(2000) NOT NULL,
    cree_le       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_messages_directs_annonce ON messages_directs(annonce_id, cree_le ASC);
