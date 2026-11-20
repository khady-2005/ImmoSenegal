ALTER TABLE annonces RENAME COLUMN date_fin_gratuite TO date_fin_publication;

-- Les annonces déjà publiées avant l'introduction de la règle reçoivent un délai de transition
-- de 30 jours. Les abonnements et mandats actifs seront pris en compte par la tâche planifiée.
UPDATE annonces
SET date_fin_publication = CURRENT_DATE + 30
WHERE statut = 'PUBLIEE' AND date_fin_publication IS NULL;
