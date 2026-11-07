-- V7 : modération des annonces.
-- Cycle de vie : EN_ATTENTE -> PUBLIEE (validée par un administrateur), ou A_CORRIGER / REFUSEE ; une annonce publiée
-- peut être SUSPENDUE. RESERVE, VENDU et LOUE sont les statuts commerciaux d'une annonce déjà validée.
-- Seules les annonces PUBLIEE apparaissent dans le catalogue public.

ALTER TABLE annonces DROP CONSTRAINT IF EXISTS annonces_statut_check;

-- Les annonces déjà présentes étaient visibles : elles restent visibles (DISPONIBLE devient PUBLIEE).
UPDATE annonces SET statut = 'PUBLIEE' WHERE statut = 'DISPONIBLE';

ALTER TABLE annonces ADD CONSTRAINT ck_annonces_statut CHECK (statut IN
    ('EN_ATTENTE', 'PUBLIEE', 'A_CORRIGER', 'REFUSEE', 'SUSPENDUE', 'RESERVE', 'VENDU', 'LOUE'));

-- Dernière décision de modération : motif (affiché au propriétaire), administrateur, date.
-- modere_par n'a volontairement pas de clé étrangère : le service des annonces ne doit pas dépendre d'une table d'identité.
ALTER TABLE annonces ADD COLUMN motif_moderation VARCHAR(500);
ALTER TABLE annonces ADD COLUMN modere_par UUID;
ALTER TABLE annonces ADD COLUMN modere_le TIMESTAMPTZ;

CREATE INDEX ix_annonces_statut ON annonces (statut, cree_le);
