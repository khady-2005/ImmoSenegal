# Scénario de démonstration — ImmoSénégal

## Comptes créés sur la base Neon (mot de passe : `ImmoTest2026!`)
| Rôle | E-mail | Espace & usages |
|---|---|---|
| **Administrateur** | *(compte admin existant en base)* | `/tableau-de-bord` (statistiques globales), `/admin/utilisateurs`, `/admin/agences`, `/admin/annonces`, `/admin/signalements`, `/admin/audit` |
| **Client / Locataire** | `client@immosenegal.sn` | `/catalogue`, `/annonces/:id`, `/mes-visites`, `/mes-reservations`, `/mes-contrats-location` (loyer simulé + reçu QR), `/mes-signalements` |
| **Propriétaire** | `proprietaire@immosenegal.sn` | Inscription libre possible, `/annonces/nouvelle`, `/mes-annonces` (vues, mandats), `/espace-proprietaire` (abonnement simulé ou PayDunya) |
| **Responsable ImmoSénégal** | `responsable@immosenegal.sn` | `/mes-agences/:id` — seul habilité à publier les biens d'ImmoSénégal, gérer les mandats, recruter/valider les collaborateurs, assigner missions |
| **Agent ImmoSénégal** | `agent@immosenegal.sn` | `/mes-agences/:id/espace` — CRM prospects, visites, ventes, missions |
| **Gestionnaire ImmoSénégal** | `gestionnaire@immosenegal.sn` | `/mes-agences/:id/espace` — biens confiés attribués, dossiers |
| **Caissier ImmoSénégal** | `caissier@immosenegal.sn` | `/mes-agences/:id/espace` — mouvements de caisse (`/api/agence/{id}/caisse`) |
| **Assistant administratif** | `assistant@immosenegal.sn` | `/mes-agences/:id/espace` — dossiers administratifs & archivage (`/api/agence/{id}/dossiers`) |
| **Responsable Partenaire** | `partenaire.responsable@immosenegal.sn` | Agence `Dakar Immo Partenaire` (en attente de validation admin), collaboration & biens propres |
| **Agent Partenaire** | `partenaire.agent@immosenegal.sn` | Collaboration avec accès limités |

## Parcours de démonstration recommandé
1. **Visiteur** : ouvrir `/catalogue` et `/annonces/:id` (consultation sans compte, adresse exacte masquée).
2. **Propriétaire** : s'inscrire librement en choisissant « Propriétaire », publier un bien (catégories maison, appartement, villa, studio, chambre, terrain, immeuble, bureau, local commercial, autre), tester le **paiement simulé** d'abonnement (`SIMULATION`).
3. **Client / Locataire** : se connecter, contacter le diffuseur depuis la fiche, demander une visite puis une réservation, signer le contrat en direct (`SignaturePad`), imprimer le contrat, puis payer un mois de loyer en **WAVE_SIMULATION** et afficher le **reçu SIMULATION avec QR code**.
4. **Agence ImmoSénégal** : le responsable publie un bien d'ImmoSénégal, gère les mandats et missions ; l'assistant administratif crée et classe un dossier dans `DossiersAgence`.
5. **Administrateur** : consulter les statistiques globales, traiter un signalement dans `/admin/signalements` et vérifier la traçabilité dans `/admin/audit`.
