-- Signalements d'annonces ou de comportements et réclamations utilisateurs.
CREATE TABLE signalements (
    id            UUID          PRIMARY KEY,
    auteur_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    annonce_id    UUID          REFERENCES annonces(id) ON DELETE SET NULL,
    type          VARCHAR(30)   NOT NULL CHECK (type IN ('ANNONCE', 'COMPORTEMENT', 'RECLAMATION')),
    objet         VARCHAR(150)  NOT NULL,
    description   VARCHAR(2000) NOT NULL,
    statut        VARCHAR(25)   NOT NULL CHECK (statut IN ('OUVERT', 'EN_COURS', 'TRAITE', 'REJETE')),
    reponse_admin VARCHAR(1000),
    traite_par    UUID          REFERENCES users(id),
    traite_le     TIMESTAMPTZ,
    cree_le       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX ix_signalements_statut ON signalements(statut, cree_le DESC);
CREATE INDEX ix_signalements_auteur ON signalements(auteur_id, cree_le DESC);
