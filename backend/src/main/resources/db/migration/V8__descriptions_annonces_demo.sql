-- V8 : reformule les descriptions des anciennes annonces de démonstration.
-- Les annonces restent clairement identifiées comme données simulées, mais sont bien persistées en base.
UPDATE annonces
SET description =
    'Donnée de démonstration enregistrée dans la base ImmoSénégal. Les informations, prix et photos sont simulés et ne constituent pas une offre immobilière réelle. '
    || substring(description FROM char_length('Annonce d''exemple, créée pour la démonstration : ce bien n''existe pas. ') + 1)
WHERE exemple = TRUE
  AND description LIKE 'Annonce d''exemple, créée pour la démonstration : ce bien n''existe pas.%';
