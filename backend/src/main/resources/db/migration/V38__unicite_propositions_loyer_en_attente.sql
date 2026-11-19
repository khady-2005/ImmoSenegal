-- Nettoie les éventuelles propositions en attente en double avant de renforcer la contrainte.
WITH doublons AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY annonce_id, locataire_id
               ORDER BY cree_le DESC, id
           ) AS rang
    FROM offres_location
    WHERE statut = 'EN_ATTENTE'
)
UPDATE offres_location o
SET statut = 'ANNULEE',
    modifie_le = now()
FROM doublons d
WHERE o.id = d.id AND d.rang > 1;

DROP INDEX IF EXISTS ix_offres_location_attente;
CREATE UNIQUE INDEX ux_offres_location_une_attente
    ON offres_location(annonce_id, locataire_id)
    WHERE statut = 'EN_ATTENTE';
