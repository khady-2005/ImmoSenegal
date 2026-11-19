CREATE TABLE offres_achat (
 id UUID PRIMARY KEY,
 annonce_id UUID NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
 acheteur_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 montant_propose NUMERIC(14,2) NOT NULL CHECK (montant_propose > 0),
 message VARCHAR(1000),
 statut VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE',
 reponse_proprietaire VARCHAR(1000),
 cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 modifie_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_offres_achat_acheteur_date ON offres_achat(acheteur_id, cree_le DESC);
CREATE INDEX idx_offres_achat_annonce_date ON offres_achat(annonce_id, cree_le DESC);
