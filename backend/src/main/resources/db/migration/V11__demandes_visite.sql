CREATE TABLE demandes_visite (
    id UUID PRIMARY KEY,
    annonce_id UUID NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_visite TIMESTAMP NOT NULL,
    message VARCHAR(1000),
    statut VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE',
    reponse_proprietaire VARCHAR(1000),
    cree_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_demandes_visite_client ON demandes_visite(client_id, cree_le DESC);
CREATE INDEX idx_demandes_visite_annonce ON demandes_visite(annonce_id, cree_le DESC);
