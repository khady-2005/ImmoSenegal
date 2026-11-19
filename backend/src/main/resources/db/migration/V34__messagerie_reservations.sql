CREATE TABLE messages_conversation (
    id UUID PRIMARY KEY,
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    expediteur_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contenu VARCHAR(2000) NOT NULL,
    envoye_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation_date
    ON messages_conversation(reservation_id, envoye_le ASC);