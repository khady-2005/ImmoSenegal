-- V66 : permettre le stockage du rôle ASSISTANT_ADMINISTRATIF (23 caractères).
ALTER TABLE users
    ALTER COLUMN role TYPE VARCHAR(30);
