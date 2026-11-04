-- V6 : annonces d'exemple (données de démonstration).
-- Une annonce « exemple » est créée uniquement par le serveur (jamais par un formulaire public) quand
-- EXEMPLES_ACTIFS=true. Elle est affichée avec la mention « Exemple » : elle ne doit jamais passer pour un vrai bien.

ALTER TABLE annonces ADD COLUMN exemple BOOLEAN NOT NULL DEFAULT FALSE;
