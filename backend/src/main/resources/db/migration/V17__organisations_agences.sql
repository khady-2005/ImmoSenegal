-- V17 : fondation des organisations immobilières et de leurs collaborateurs.
-- ImmoSénégal est la première agence de type INTERNE ; les agences partenaires
-- seront créées avec le statut EN_ATTENTE après leur demande d'inscription.

CREATE TABLE agences (
    id UUID PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    slug VARCHAR(160) NOT NULL UNIQUE,
    description VARCHAR(2000),
    email_contact VARCHAR(254),
    telephone_contact VARCHAR(30),
    adresse VARCHAR(255),
    logo_url VARCHAR(500),
    type VARCHAR(20) NOT NULL CHECK (type IN ('INTERNE', 'PARTENAIRE')),
    statut VARCHAR(20) NOT NULL CHECK (statut IN ('EN_ATTENTE', 'ACTIVE', 'SUSPENDUE')),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_agences_statut_type ON agences (statut, type);

CREATE TABLE agence_membres (
    id UUID PRIMARY KEY,
    agence_id UUID NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fonction VARCHAR(25) NOT NULL CHECK (fonction IN ('RESPONSABLE', 'GESTIONNAIRE', 'AGENT')),
    statut VARCHAR(25) NOT NULL CHECK (statut IN ('INVITATION_EN_ATTENTE', 'ACTIF', 'SUSPENDU')),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_agence_membre UNIQUE (agence_id, user_id)
);

CREATE INDEX ix_agence_membres_user ON agence_membres (user_id);
CREATE INDEX ix_agence_membres_agence_statut ON agence_membres (agence_id, statut);

-- L'agence ImmoSénégal est une organisation métier à part entière,
-- distincte du compte ADMIN qui supervise la plateforme.
INSERT INTO agences (id, nom, slug, description, type, statut)
VALUES (
    '8cfd2d31-36b0-4c0a-8a1f-5c6a7b9d1101',
    'ImmoSénégal',
    'immosenegal',
    'Agence immobilière opérée par ImmoSénégal.',
    'INTERNE',
    'ACTIVE'
);
