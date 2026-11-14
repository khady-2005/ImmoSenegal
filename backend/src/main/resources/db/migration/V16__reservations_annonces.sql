CREATE TABLE reservations (
    id UUID PRIMARY KEY,
    annonce_id UUID NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    statut VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE',
    message VARCHAR(1000),
    reponse_proprietaire VARCHAR(1000),
    cree_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reservations_client ON reservations(client_id, cree_le DESC);
CREATE INDEX idx_reservations_annonce ON reservations(annonce_id, cree_le DESC);
