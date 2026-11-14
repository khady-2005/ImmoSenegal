CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    destinataire_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    titre VARCHAR(160) NOT NULL,
    message VARCHAR(500) NOT NULL,
    lien VARCHAR(300),
    lue BOOLEAN NOT NULL DEFAULT FALSE,
    cree_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_destinataire_date
    ON notifications(destinataire_id, cree_le DESC);

CREATE INDEX idx_notifications_non_lues
    ON notifications(destinataire_id, lue)
    WHERE lue = FALSE;
