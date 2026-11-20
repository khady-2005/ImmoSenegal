ALTER TABLE annonces ADD COLUMN date_fin_gratuite date;

-- Les annonces déjà publiées ne sont pas rétroactivement soumises à la période gratuite.
