-- Actualise les données déjà présentes en base pour la maison de Saly.
-- L'annonce reste identifiée comme donnée de présentation via exemple = TRUE.
UPDATE users
SET nom_complet = 'Équipe ImmoSénégal'
WHERE email = 'exemples@immosenegal.invalid';

UPDATE annonces
SET description = 'Située à Saly Portudal, cette maison de plage développe une superficie de 350 m². Elle comprend cinq pièces et offre un cadre de séjour tourné vers l’extérieur, avec une piscine, un jardin aménagé et un espace de détente couvert. La climatisation et la présence d’un gardien complètent les équipements indiqués. Une présentation détaillée de chaque espace et des photos récentes permettront de confirmer l’agencement exact du bien.'
WHERE exemple = TRUE
  AND titre = 'Maison de plage avec piscine';
