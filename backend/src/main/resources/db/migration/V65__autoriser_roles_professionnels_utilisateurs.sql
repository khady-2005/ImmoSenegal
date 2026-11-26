-- V65 : autoriser les nouveaux rôles professionnels dans les comptes utilisateurs.
-- Ces rôles sont déjà définis dans Role.java et attribués après acceptation d'une candidature.

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN (
        'CLIENT',
        'PROPRIETAIRE',
        'AGENT',
        'GESTIONNAIRE',
        'CAISSIER',
        'ASSISTANT_ADMINISTRATIF',
        'RESPONSABLE',
        'ADMIN'
    ));
