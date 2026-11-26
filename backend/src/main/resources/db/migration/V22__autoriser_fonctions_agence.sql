-- V21 : autoriser toutes les fonctions opérationnelles dans les agences.
-- Un responsable ne peut pas postuler à son propre poste : il est désigné par l'agence.

ALTER TABLE agence_membres
    DROP CONSTRAINT IF EXISTS agence_membres_fonction_check;

ALTER TABLE agence_membres
    ADD CONSTRAINT ck_agence_membres_fonction
    CHECK (fonction IN (
        'RESPONSABLE',
        'GESTIONNAIRE',
        'AGENT',
        'CAISSIER',
        'ASSISTANT_ADMINISTRATIF'
    ));

ALTER TABLE agence_candidatures
    DROP CONSTRAINT IF EXISTS agence_candidatures_fonction_check;

ALTER TABLE agence_candidatures
    ADD CONSTRAINT ck_agence_candidatures_fonction
    CHECK (fonction IN (
        'GESTIONNAIRE',
        'AGENT',
        'CAISSIER',
        'ASSISTANT_ADMINISTRATIF'
    ));
