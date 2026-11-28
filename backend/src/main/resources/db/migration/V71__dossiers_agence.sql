-- Dossiers administratifs et archivage documentaire pour l'assistant administratif et le responsable d'agence.
CREATE TABLE dossiers_agence (
    id               UUID          PRIMARY KEY,
    agence_id        UUID          NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
    cree_par         UUID          NOT NULL REFERENCES users(id),
    titre            VARCHAR(150)  NOT NULL,
    categorie        VARCHAR(40)   NOT NULL CHECK (categorie IN ('PROPRIETAIRE', 'LOCATAIRE', 'BIEN', 'CONTRAT', 'AUTRE')),
    reference_client VARCHAR(150),
    statut           VARCHAR(30)   NOT NULL CHECK (statut IN ('A_COMPLETER', 'COMPLET', 'ARCHIVE')),
    notes            VARCHAR(2000),
    cree_le          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    modifie_le       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX ix_dossiers_agence ON dossiers_agence(agence_id, statut, cree_le DESC);
