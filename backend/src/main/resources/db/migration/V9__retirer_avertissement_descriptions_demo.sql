-- V9 : retirer le préambule explicatif des descriptions des annonces de démonstration.
-- Le badge « Démonstration » reste visible dans le catalogue.
UPDATE annonces
SET description = substring(
    description FROM char_length('Donnée de démonstration enregistrée dans la base ImmoSénégal. Les informations, prix et photos sont simulés et ne constituent pas une offre immobilière réelle. ') + 1
)
WHERE exemple = TRUE
  AND description LIKE 'Donnée de démonstration enregistrée dans la base ImmoSénégal.%';
