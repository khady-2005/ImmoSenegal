-- V56 : distingue les annonces publiées par ImmoSénégal de celles des propriétaires.
ALTER TABLE annonces
    ADD COLUMN publiee_par_agence BOOLEAN NOT NULL DEFAULT FALSE;

-- Les annonces d'exemple sont gérées par l'équipe ImmoSénégal.
-- Aucune autre annonce existante n'est classée automatiquement : son origine doit être confirmée par un administrateur.
UPDATE annonces
SET publiee_par_agence = TRUE
WHERE exemple = TRUE;
