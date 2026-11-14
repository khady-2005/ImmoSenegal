CREATE TABLE favoris (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    annonce_id UUID NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
    CONSTRAINT uk_favori_client_annonce UNIQUE (client_id, annonce_id)
);

CREATE INDEX idx_favoris_client ON favoris(client_id);
