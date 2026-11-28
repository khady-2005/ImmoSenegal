# Audit de conformité — ImmoSénégal (mis à jour sur `finalisation`)

Légende : **Fait** · **Partiel** · **Pas fait**

- **Partie 0 (Existant & CI)** : **Fait** (`mvn test-compile`, `npm run build`, `npm test` 89/89, CI `e483d32` verte).
- **Partie 1 (Administrateur)** : **Fait** (`Dashboard.tsx` stats globales `GET /api/admin/statistiques`, `AdminUtilisateurs.tsx`, `AdminAgences.tsx`, `AdminModeration.tsx`, `AdminSignalements.tsx`, `AdminAudit.tsx`, `AdminAbonnements.tsx`).
- **Partie 2 (Client / Locataire)** : **Fait** (visiteur voit catalogue + fiche sans adresse exacte ; connecté voit adresse, contact direct `/api/messagerie/annonce/{id}`, visites, réservations, contrats, loyer simulé + reçu QR, avis, réclamations `/mes-signalements`).
- **Partie 3 (Propriétaire)** : **Fait** (inscription libre via `estProprietaire` dans `Inscription.tsx` + `AuthService`, publication sans validation admin, photos/vidéo, visites/réservations, abonnement + paiement simulé `/api/abonnements/simuler`, compteur `vues` sur `Annonce`, mandats).
- **Partie 4 (Agence & Collaborateurs)** : **Fait** (seul le `RESPONSABLE` publie pour `ImmoSénégal` ; `ADMIN` bloqué sur `creerPourAgence` ; `AGENT`, `GESTIONNAIRE`, `CAISSIER`, `ASSISTANT_ADMINISTRATIF` avec `DossiersAgence` / `V71` ; `PARTENAIRE` isolé).
- **Partie 5 (Annonces)** : **Fait** (10 catégories `MAISON`, `APPARTEMENT`, `STUDIO`, `VILLA`, `TERRAIN`, `LOCAL_COMMERCIAL`, `CHAMBRE`, `IMMEUBLE`, `BUREAU`, `AUTRE` + `chambres` & `sallesDeBain` via `V69`).
- **Partie 6 (Abonnements)** : **Fait** (essai 15 jours, notifications, historique, simulation configurable via `app.paiement.simulation-active`).
- **Parties 7, 8, 9 (Mandats, Visites, Réservations, Contrats)** : **Fait** (`MandatGestionController`, `DemandeVisiteController`, `ReservationController`, `ContratLocationController`, `SignaturePad`, impression A4).
- **Partie 10 (Paiements & Commissions)** : **Fait** (`ContratLocationService.simulerPaiementLoyer`, montant fixé par le serveur, 1 paiement/mois, `WAVE_SIMULATION` / `ORANGE_MONEY_SIMULATION`, reçu `SIMULATION` avec QR + endpoint `/api/locations/recus/verifier/{code}`).
- **Parties 11, 12, 13, 14 (Messagerie, Notifications, Catalogue, Avis, Réclamations, IA, Technique)** : **Fait** (`MessageDirectController`, `NotificationService`, `SignalementController`, `AssistantIAController`, sécurité Spring/JWT/Flyway).
