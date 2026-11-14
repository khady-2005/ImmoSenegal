CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY,
    utilisateur_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expire_le TIMESTAMP WITH TIME ZONE NOT NULL,
    utilise BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_password_reset_utilisateur
    ON password_reset_tokens(utilisateur_id);
