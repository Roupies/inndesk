# InnDesk

InnDesk est un PMS (*Property Management System*) destiné aux petits hôtels indépendants.

L’application centralise les principales opérations d’un établissement hôtelier : gestion des réservations, clients, chambres, gouvernante, arrivées, départs, facturation et génération de factures PDF.

Le projet a été réalisé dans le cadre du titre professionnel **Développeur web et web mobile — niveau 5, RNCP37674**.

---

## Fonctionnalités

### Réservations

- création, consultation, modification et annulation ;
- affectation manuelle ou automatique d’une chambre ;
- détection des conflits de dates ;
- planning d’occupation sur 7, 14 ou 28 jours ;
- statuts de réservation ;
- cycle de check-in et check-out.

### Clients et données personnelles

- création, consultation et modification des fiches clients ;
- recherche et historique des séjours ;
- document d’identité facultatif ;
- consentement marketing facultatif et décoché par défaut ;
- export des données d’un client ;
- anonymisation par un administrateur lorsque les relations métier doivent être conservées.

InnDesk intègre plusieurs mesures techniques inspirées des principes du RGPD : information des personnes, minimisation des données, gestion d’un consentement facultatif, accès, export et anonymisation.

Ces mécanismes constituent une démonstration technique et ne représentent pas une attestation de conformité juridique complète.

### Chambres et gouvernante

- gestion des types et tarifs de chambres ;
- filtrage par type, étage et statut ;
- statuts disponible, occupée, sale, en nettoyage et maintenance ;
- interface dédiée au suivi de la gouvernante.

### Facturation

- création d’une facture à partir d’un séjour ;
- calcul serveur des montants HT, TVA et TTC ;
- suivi du statut et du moyen de paiement ;
- génération d’un PDF avec Jinja2 et WeasyPrint ;
- téléchargement du PDF ;
- envoi par e-mail lorsque Resend est configuré.

### Administration et sécurité

- authentification JWT ;
- rôles administrateur et réceptionniste ;
- gestion des utilisateurs ;
- mots de passe hashés avec bcrypt ;
- validation serveur avec Pydantic ;
- limitation des tentatives de connexion ;
- contrôle des autorisations côté serveur ;
- thème clair et sombre.

---

## Architecture

InnDesk utilise une architecture web trois tiers :

```text
Navigateur
    │
    │ HTML, CSS, JavaScript, API REST
    ▼
FastAPI
    │
    │ Services métier, Pydantic, SQLAlchemy
    ▼
PostgreSQL
```

Le front-end est servi par FastAPI sur la même origine que l’API.

---

## Technologies

### Back-end

- Python 3.11 ;
- FastAPI 0.115.0 ;
- SQLAlchemy 2.0.36 ;
- PostgreSQL 15 ;
- Pydantic 2.10.3 ;
- python-jose pour les JWT ;
- Passlib avec bcrypt ;
- SlowAPI ;
- Jinja2 ;
- WeasyPrint 61.2 ;
- pydyf 0.8.0.

### Front-end

- HTML5 ;
- CSS3 ;
- JavaScript natif ;
- scripts classiques organisés par page et responsabilité ;
- aucune chaîne de compilation ;
- interface responsive desktop, tablette et mobile ;
- thème clair et sombre ;
- icônes Lucide.

### Qualité et déploiement

- pytest ;
- Docker ;
- Docker Compose ;
- healthchecks PostgreSQL et FastAPI ;
- script de déploiement local ;
- utilisateur non privilégié dans le conteneur.

---

## Structure du projet

```text
inndesk/
├── backend/
│   ├── core/                  # Configuration, base de données et sécurité
│   ├── models/                # Modèles SQLAlchemy
│   ├── routers/               # Endpoints FastAPI
│   ├── schemas/               # Schémas Pydantic
│   ├── services/              # Services métier
│   ├── templates/             # Templates Jinja2
│   └── main.py                # Point d’entrée FastAPI
├── database/
│   ├── migrations/            # Scripts de migration SQL
│   └── schema.sql             # Schéma PostgreSQL
├── docs/                      # Documentation technique et RGPD
├── frontend/
│   ├── *.html                 # Pages de l’application
│   └── assets/
│       ├── api/               # Clients API par domaine
│       ├── js/                # Scripts organisés par page
│       ├── app.js             # Fonctions communes
│       └── style.css          # Styles globaux et responsive
├── tests/                     # Tests automatisés
├── .dockerignore
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── deploy.sh
├── requirements.txt
├── seed.py
└── README.md
```

---

## Installation avec Docker

Docker est la méthode recommandée pour lancer l’environnement complet.

### Prérequis

- Docker Desktop ou Docker Engine ;
- Docker Compose v2 ;
- Git.

### 1. Cloner le dépôt

```bash
git clone https://github.com/Roupies/inndesk.git
cd inndesk
```

### 2. Préparer les variables d’environnement

```bash
cp .env.example .env
```

Renseigner au minimum :

```dotenv
POSTGRES_DB=inndesk
POSTGRES_USER=inndesk
POSTGRES_PASSWORD=replace_with_a_strong_database_password

JWT_SECRET=replace_with_at_least_64_random_characters
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=8

APP_PORT=8000
```

Pour générer des valeurs aléatoires :

```bash
python - <<'PY'
import secrets

print("POSTGRES_PASSWORD=" + secrets.token_urlsafe(32))
print("JWT_SECRET=" + secrets.token_urlsafe(64))
PY
```

Le fichier `.env` est ignoré par Git et ne doit jamais être versionné.

### 3. Construire et démarrer

```bash
docker compose up --build -d
```

Vérifier les services :

```bash
docker compose ps
```

Vérifier le healthcheck :

```bash
curl http://localhost:8000/api/v1/health
```

Résultat attendu :

```json
{"status":"healthy","database":"reachable"}
```

### 4. Ajouter les données de démonstration

```bash
docker compose exec -T api python seed.py
```

Le seed est réservé à un environnement de démonstration et réinitialise les principales données métier.

### 5. Arrêter l’application

```bash
docker compose down
```

Pour supprimer également les données PostgreSQL locales :

```bash
docker compose down --volumes
```

---

## Déploiement local automatisé

Le script `deploy.sh` :

1. valide la configuration Docker Compose ;
2. construit l’image ;
3. démarre PostgreSQL et FastAPI ;
4. attend que les services deviennent sains ;
5. vérifie le healthcheck HTTP ;
6. échoue explicitement si l’API ne devient pas disponible.

Lancement :

```bash
./deploy.sh
```

Avec les données de démonstration :

```bash
./deploy.sh --seed
```

---

## Installation locale sans Docker

### Prérequis

- Python 3.11 ;
- PostgreSQL 15 ;
- Git.

### 1. Cloner le dépôt

```bash
git clone https://github.com/Roupies/inndesk.git
cd inndesk
```

### 2. Créer un environnement virtuel

Linux ou macOS :

```bash
python3 -m venv venv
source venv/bin/activate
```

Windows PowerShell :

```powershell
py -m venv venv
venv\Scripts\Activate.ps1
```

### 3. Installer les dépendances

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configurer l’environnement

```bash
cp .env.example .env
```

Pour une base PostgreSQL locale, adapter notamment :

```dotenv
DATABASE_URL=postgresql://inndesk:mot_de_passe@localhost:5432/inndesk
JWT_SECRET=replace_with_at_least_64_random_characters
```

### 5. Lancer l’application

```bash
uvicorn backend.main:app --reload --port 8000
```

### 6. Ajouter les données de démonstration

```bash
python seed.py
```

---

## Accès

Une fois l’application démarrée :

- application : `http://localhost:8000/app/index.html`
- Swagger : `http://localhost:8000/docs`
- ReDoc : `http://localhost:8000/redoc`
- healthcheck : `http://localhost:8000/api/v1/health`

Les identifiants créés par `seed.py` sont exclusivement destinés à la démonstration locale.

---

## Tests

Lancer toute la suite :

```bash
pytest -q
```

Dernier résultat validé :

```text
98 passed
```

Les tests couvrent notamment :

- authentification ;
- rate limiting ;
- utilisateurs et rôles ;
- clients ;
- consentement marketing ;
- export et anonymisation ;
- chambres ;
- gouvernante ;
- réservations ;
- conflits de dates ;
- cycle check-in/check-out ;
- facturation ;
- génération réelle des PDF ;
- healthcheck.

Le projet n’annonce pas de pourcentage de couverture tant qu’aucune mesure officielle n’a été intégrée.

Tests dans le conteneur :

```bash
docker compose exec -T api pytest -q
```

Test ciblé de génération PDF :

```bash
pytest -q tests/test_invoice_pdf.py
```

---

## Génération des factures PDF

La génération PDF repose sur les versions compatibles suivantes :

```text
WeasyPrint 61.2
pydyf 0.8.0
```

Ces versions sont explicitement figées dans `requirements.txt`.

Le template principal se trouve dans :

```text
backend/templates/invoice.html
```

La validation Docker a confirmé :

- génération d’un PDF minimal ;
- génération d’une facture réelle InnDesk ;
- téléchargement authentifié du document ;
- réponse HTTP `200` avec `Content-Type: application/pdf`.

---

## Déploiement Docker validé

La validation locale a confirmé :

- image basée sur Python 3.11 et Debian Bookworm ;
- application exécutée avec l’UID non privilégié `10001` ;
- PostgreSQL et FastAPI en état `healthy` ;
- PostgreSQL accessible uniquement sur le réseau Docker interne ;
- seul le port applicatif `8000` publié sur l’hôte ;
- healthcheck HTTP avec contrôle de la base ;
- fonctionnement de WeasyPrint ;
- fonctionnement du seed ;
- fonctionnement de `deploy.sh` et `deploy.sh --seed`.

Cette validation est locale et ne constitue pas une infrastructure de production ou de haute disponibilité.

---

## Sécurité

InnDesk met notamment en œuvre :

- hashage bcrypt des mots de passe ;
- authentification JWT avec expiration ;
- contrôle des rôles côté serveur ;
- validation des entrées avec Pydantic ;
- requêtes SQL paramétrées avec SQLAlchemy ;
- limitation des tentatives de connexion ;
- secrets externalisés ;
- rendu dynamique protégé contre les injections HTML ;
- exécution Docker sous un utilisateur non privilégié ;
- healthcheck vérifiant l’accès à PostgreSQL.

### Limites connues

Le projet ne comporte pas encore :

- de reverse proxy ;
- de terminaison TLS ;
- de CI/CD ;
- de haute disponibilité ;
- de sauvegarde automatisée ;
- de gestion des migrations avec Alembic ;
- de rotation ou révocation avancée des JWT ;
- d’audit RGAA complet ;
- de garantie juridique de conformité RGPD.

---

## Données personnelles et RGPD

La documentation présente :

- les finalités des traitements ;
- les catégories de données ;
- les bases légales proposées ;
- les destinataires ;
- les durées de conservation à adapter ;
- les droits des personnes ;
- les mécanismes d’export ;
- les mécanismes d’anonymisation.

Documents :

```text
docs/RGPD.md
docs/registre_traitements.md
```

Dans une exploitation réelle, l’établissement hôtelier utilisant InnDesk reste responsable du traitement et doit adapter les règles à son activité et à ses obligations.

---

## Choix techniques

### Pourquoi FastAPI ?

FastAPI apporte :

- la validation des requêtes avec Pydantic ;
- l’injection de dépendances ;
- la documentation OpenAPI automatique ;
- une séparation claire entre routage, accès aux données et logique métier.

### Pourquoi PostgreSQL ?

PostgreSQL permet :

- la gestion de relations et de contraintes d’intégrité ;
- les transactions ;
- le verrouillage pessimiste ;
- l’utilisation de `SELECT FOR UPDATE SKIP LOCKED` dans les parcours sensibles de réservation.

### Pourquoi du JavaScript natif ?

InnDesk est un back-office à l’interactivité maîtrisée. Le JavaScript natif permet :

- de limiter les dépendances ;
- de conserver un déploiement sans compilation ;
- de rendre les mécanismes du navigateur explicites ;
- d’organiser la logique par page et responsabilité.

Cette approche implique de gérer explicitement le rendu sécurisé, l’état, les événements et l’accessibilité.

---

## Auteur

**Maxime Naguet**

Projet réalisé dans le cadre du titre professionnel Développeur web et web mobile, niveau 5.