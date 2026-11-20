-- Conserver l'historique des refus et résiliations tout en autorisant une nouvelle demande.
ALTER TABLE mandats_gestion DROP CONSTRAINT IF EXISTS uq_mandat_agence_annonce;
