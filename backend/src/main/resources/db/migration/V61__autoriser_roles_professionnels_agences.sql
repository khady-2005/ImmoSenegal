-- Les rôles professionnels sont attribués après validation par une agence ou l'administration.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('CLIENT', 'PROPRIETAIRE', 'AGENT', 'GESTIONNAIRE', 'RESPONSABLE', 'ADMIN'));
