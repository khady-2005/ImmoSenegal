-- Autoriser les rôles professionnels attribués après validation d'une agence.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('CLIENT', 'PROPRIETAIRE', 'AGENT', 'GESTIONNAIRE', 'RESPONSABLE', 'ADMIN'));
