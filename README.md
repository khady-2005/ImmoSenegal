# ImmoSénégal

Plateforme immobilière sénégalaise (location et vente) : projet de mémoire de Licence 3 Ingénierie Informatique, UASZ.
Elle combine les projets 2 (ImmoSénégal) et 14 (E-Courtier) des briefs de projets.

**Stack :** Java 21, Spring Boot 3.4, Spring Security, PostgreSQL 16, Flyway, Swagger/OpenAPI. Frontend : React, TypeScript, Vite, Tailwind, carte Leaflet/OpenStreetMap (sans clé API).

## Fonctionnalités de l'application

| Espace / module | Fonctionnalités présentes dans le dépôt |
|---|---|
| Visiteur | Accueil, catalogue public, recherche et filtres, carte, fiche détaillée des annonces publiées, contact et FAQ |
| Authentification | Inscription, connexion, sessions sécurisées, mot de passe oublié et changement de mot de passe |
| Client / locataire | Favoris, demandes de visite et réservation, propositions de loyer et d'achat, contrats, messagerie, incidents, états des lieux et suivi du dépôt de garantie |
| Propriétaire | Publication autonome des annonces, gestion des photos et vidéo, suivi des visites, réservations, offres, contrats, incidents et échanges |
| Agence | Équipe, invitations, candidatures, collaborateurs, mandats de gestion, portefeuille, missions, visites, CRM et suivi des ventes |
| Collaborateur | Espace dédié selon la fonction (agent immobilier ou gestionnaire), avec accès contrôlés par l'appartenance active à l'agence |
| Administration | Gestion des comptes et rôles, modération a posteriori, supervision des agences, suivi des litiges et journal d'audit |
| Sécurité | Rôles vérifiés côté serveur, contrôle de propriété, validation des données, limitation des tentatives de connexion et sessions HttpOnly |

**Important :** cette liste décrit les fonctionnalités présentes dans le code, pas une certification de leur fonctionnement en production. Les compilations, tests automatisés, migrations et déploiements doivent être vérifiés sur la version finale. Les vérifications GitHub récentes sont actuellement en échec et doivent être corrigées avant de déclarer le projet validé.

**Photos :** stockées dans la base PostgreSQL (aucun disque à gérer, sauvegardées avec les données). Chaque photo est décodée puis ré-encodée à l'envoi : un fichier qui n'est pas une vraie image est refusé, les métadonnées (position GPS, appareil) sont supprimées, l'image est réduite à 1600 px. WebP et SVG sont refusés. Limite connue : pas de réorganisation des photos (la plus ancienne sert de couverture ; pour changer, supprimer et renvoyer).

**Session :** le jeton d'accès (15 min) reste en mémoire du navigateur, jamais dans `localStorage`. Un cookie `HttpOnly` limité à `/api/auth` (illisible par JavaScript) permet de retrouver la session après un rechargement et de renouveler le jeton discrètement. Chaque jeton de rafraîchissement ne sert qu'une fois ; si un ancien jeton est rejoué, toutes les sessions du compte sont révoquées. Seule l'empreinte SHA-256 est stockée en base. La déconnexion révoque le jeton côté serveur.

**Hébergement en ligne (Neon + Render + Vercel) :** la base est sur Neon, le serveur sur Render (`render.yaml`, redéployé à chaque commit dont les vérifications sont vertes), le site sur Vercel (`frontend/vercel.json`). Vercel relaie les appels `/api` vers Render : le navigateur ne parle qu'à une seule adresse, donc le cookie de session reste « même site ». Limites de l'offre gratuite : le serveur Render s'endort après 15 minutes sans visite (premier chargement lent, un message d'attente s'affiche) ; derrière Vercel, la limitation de connexion par adresse IP voit l'IP du relais, donc le compteur par IP est partagé entre tous les visiteurs (le compteur par email reste exact).

**À régler au déploiement :** `REFRESH_COOKIE_SECURE=true` (https) et `CORS_ALLOWED_ORIGINS` = adresse exacte du frontend. Si le frontend et l'API sont sur deux sites différents (ex. Vercel + Render), mettre `REFRESH_COOKIE_SAMESITE=None`.

## Lancer toute l'application (méthode recommandée, une seule commande)

Prérequis : **Docker** uniquement (Docker Desktop sous Windows et macOS). Ni Java, ni Node, ni Maven à installer.

```bash
# Linux, macOS ou Git Bash
bash scripts/demarrer.sh
```

```powershell
# Windows (PowerShell, Docker Desktop démarré)
powershell -ExecutionPolicy Bypass -File scripts\demarrer.ps1
```

Au premier lancement, le script génère au hasard les secrets (mot de passe de la base, clé JWT, premier compte administrateur) dans le fichier `.env.complet`. Ce fichier est ignoré par Git : il n'existe que sur votre ordinateur. Le premier lancement prend 3 à 6 minutes (construction des images).

- Application : http://localhost:8080 (accessible uniquement depuis votre ordinateur)
- Documentation de l'API (Swagger) : http://localhost:8080/swagger-ui.html
- Compte administrateur : voir `BOOTSTRAP_ADMIN_EMAIL` et `BOOTSTRAP_ADMIN_PASSWORD` dans `.env.complet`
- Arrêter : `docker compose -f docker-compose.complet.yml --env-file .env.complet down`
- Tout effacer (données comprises) : même commande avec `down -v`, puis supprimer `.env.complet`

**Vérification :** la CI GitHub exécute `scripts/demarrer.sh` puis le parcours de bout en bout dans un vrai navigateur sur cette application dockerisée. Le script PowerShell est identique dans son principe mais **n'est pas testé automatiquement** (la CI tourne sous Linux).

## Démarrage pour développer (sans Docker complet)

Prérequis de cette méthode :

- Java 21 et Maven 3.9+
- Docker (pour PostgreSQL en local) ou un PostgreSQL 16 déjà installé

## Démarrage en local

```bash
# 1. Variables d'environnement
cp .env.example .env          # puis éditer .env : choisir DB_PASSWORD et générer JWT_SECRET
openssl rand -base64 48       # à copier dans JWT_SECRET

# 2. Base de données
docker compose up -d db

# 3. Backend (charge le .env dans le shell puis démarre l'API)
cd backend
set -a && source ../.env && set +a
mvn spring-boot:run
```

Frontend (dans un second terminal) :

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (les appels /api sont redirigés vers le backend)
npm test           # tests
npm run build      # compilation de production
```

Vérifications du backend :

- Santé de l'API : <http://localhost:8080/api/health> (doit répondre `"statut": "UP"`)
- Documentation Swagger : <http://localhost:8080/swagger-ui.html>

## Créer le premier administrateur

Aucun compte ADMIN n'existe par défaut et aucun formulaire public ne permet d'en créer un.
Pour le tout premier démarrage, renseigner dans `.env` (ou dans les variables du serveur) :

```
BOOTSTRAP_ADMIN_EMAIL=votre.email@exemple.com
BOOTSTRAP_ADMIN_PASSWORD=un_mot_de_passe_de_12_caracteres_minimum
```

Démarrer le backend une fois, puis **supprimer ces deux lignes**. Si un ADMIN existe déjà, elles sont ignorées.
Les propriétaires et agents s'inscrivent comme CLIENT, puis demandent leur rôle (`POST /api/auth/role-requests`) ; un ADMIN valide dans `/api/admin/role-requests`.

## Annonces d'exemple (démonstration)

Pour présenter et tester l'application avec un catalogue déjà rempli, le serveur peut créer 8 annonces de **démonstration persistées dans PostgreSQL**
(villas, appartements, studio, terrain à Dakar, Ziguinchor, Saly, Saint-Louis, Mbour). Les caractéristiques, prix et photos sont simulés : ce ne sont pas des offres immobilières réelles :

```
EXEMPLES_ACTIFS=true
```

Garde-fous : jamais créées par un formulaire public ; marquées `exemple = true` en base et affichées avec la mention « Démonstration » ;
les données et photos sont simulées ; le compte associé est désactivé (impossible de s'y connecter). Les annonces sont bien enregistrées
et consultables dans la base, mais restent identifiables comme données de démonstration.

Pour les retirer (avec leurs photos), exécuter une seule requête SQL sur la base :

```sql
DELETE FROM users WHERE email = 'exemples@immosenegal.invalid';
```

Puis remettre `EXEMPLES_ACTIFS=false` (sinon elles seraient recréées au prochain démarrage).

## Tests

```bash
cd backend
set -a && source ../.env && set +a
mvn test
```

Les tests démarrent l'application complète : la base PostgreSQL doit être lancée. Sur GitHub, la CI le fait automatiquement avec un PostgreSQL jetable.

## Dépannage

- **`JWT_SECRET` manquant ou trop court** : le backend refuse de démarrer (32 caractères minimum).
- **`DB_PASSWORD` introuvable au démarrage** : le `.env` n'a pas été chargé dans le shell (`set -a && source ../.env && set +a`).
- **Connexion refusée sur le port 5432** : vérifier que la base tourne avec `docker compose ps`.
- **Erreur Flyway « validate failed »** : ne jamais modifier une migration déjà appliquée ; en créer une nouvelle (`V2__...sql`).

## Sécurité

**Limites connues de la limitation de connexion :** les compteurs sont gardés en mémoire (un seul serveur ; ils sont remis à zéro au redémarrage). Un attaquant peut bloquer temporairement (15 min) la connexion à un compte en multipliant les échecs sur son email : c'est le compromis accepté contre la devinette de mots de passe. Derrière un proxy (Render), définir `FORWARD_HEADERS_STRATEGY=native`, sinon toutes les requêtes semblent venir de la même IP.

Aucun secret n'est stocké dans le code ni dans Git : tout passe par les variables d'environnement. Le fichier `.env` est ignoré par Git.
