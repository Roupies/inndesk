# InnDesk - Système de Gestion Hôtelière

InnDesk est un système de gestion hôtelière (PMS - Property Management System) conçu pour les petits hôtels indépendants. Ce projet a été développé dans le cadre d'une certification RNCP de niveau 5.

## Description

InnDesk offre une solution complète pour la gestion quotidienne d'un établissement hôtelier, incluant la gestion des réservations, des clients, des chambres, de la facturation et du personnel de gouvernante.

L'interface utilisateur est entièrement en français et conçue pour être utilisée par le personnel de réception et la direction.

## Stack Technique

### Backend
- **FastAPI** - Framework web moderne avec validation automatique
- **SQLAlchemy** - ORM pour la gestion de la base de données
- **PostgreSQL** - Base de données relationnelle
- **Pydantic** - Validation et sérialisation des données
- **JWT** - Authentification sécurisée
- **WeasyPrint** - Génération de factures PDF
- **pytest** - Tests automatisés

### Frontend
- **HTML5/CSS3** - Interface utilisateur responsive
- **Vanilla JavaScript (ES6+)** - Logique côté client, modules natifs
- **CSS Variables** - Système de thème clair/sombre
- **Lucide Icons** - Iconographie moderne

### Particularités
- Aucun framework JavaScript (React, Vue, etc.)
- Aucun outil de build (Webpack, Vite, etc.)
- Architecture simple et explicable
- Code entièrement en anglais, interface en français

## Prérequis Système

- **Python 3.11+**
- **PostgreSQL 15+**
- **Git**

## Installation

### 1. Cloner le projet

```bash
git clone <url-du-dépôt>
cd inndesk
```

### 2. Créer l'environnement virtuel

```bash
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# ou
venv\Scripts\activate     # Windows
```

### 3. Installer les dépendances

```bash
pip install -r requirements.txt
```

### 4. Configuration de la base de données

Créez une base de données PostgreSQL :

```sql
CREATE DATABASE inndesk;
CREATE USER inndesk WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE inndesk TO inndesk;
```

### 5. Configuration de l'environnement

Copiez le fichier d'exemple et configurez vos variables :

```bash
cp .env.example .env
```

Éditez le fichier `.env` :

```env
DATABASE_URL=postgresql://inndesk:votre_mot_de_passe@localhost:5432/inndesk
JWT_SECRET=votre_clé_secrète_très_longue_et_complexe
ENVIRONMENT=development
```

### 6. Initialisation de la base de données

Le serveur créera automatiquement les tables au premier lancement.

### 7. Données de test (optionnel)

```bash
python backend/seed.py
```

Cela créera :
- 2 utilisateurs (admin@inndesk.com / admin123, reception@inndesk.com / reception123)
- Types de chambres et chambres
- Clients de test
- Réservations d'exemple

## Lancement

### Serveur de développement

```bash
uvicorn backend.main:app --reload --port 8000
```

L'application sera accessible sur : http://localhost:8000

### Serveur de production

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

## Tests

### Lancer tous les tests

```bash
pytest tests/ -v
```

### Lancer avec couverture

```bash
pytest tests/ --cov=backend --cov-report=html
```

Les tests couvrent :
- Authentification et autorisation
- CRUD des entités principales
- Logique métier (disponibilités, facturation)
- Validation des données

## Structure du Projet

```
inndesk/
├── README.md
├── CLAUDE.md                    # Documentation technique
├── requirements.txt
├── .env.example
├── backend/
│   ├── main.py                  # Point d'entrée FastAPI
│   ├── seed.py                  # Données de test
│   ├── core/
│   │   ├── config.py           # Configuration
│   │   ├── database.py         # Connexion DB
│   │   └── security.py         # JWT & sécurité
│   ├── models/                 # Modèles SQLAlchemy
│   ├── schemas/                # Validation Pydantic
│   ├── api/v1/                 # Routes API
│   ├── services/               # Logique métier
│   └── tests/                  # Tests automatisés
├── frontend/
│   ├── *.html                  # Pages de l'application
│   ├── assets/
│   │   ├── style.css          # Styles globaux
│   │   ├── api/               # Modules API
│   │   └── js/                # Logique par page
└── database/
    └── schema.sql              # Schéma généré (documentation)
```

## Fonctionnalités

### Gestion des Réservations
- Création, modification, annulation
- Vérification de disponibilité en temps réel
- Check-in et check-out
- Statuts : confirmé, arrivé, parti, annulé, no-show

### Gestion des Clients
- Fiche client complète avec consentement RGPD
- Historique des réservations
- Recherche et filtrage avancés

### Planning Interactif
- Vue Gantt sur 14 jours
- Navigation par semaine
- Codes couleur par statut
- Interface tactile responsive

### Chambres et Types
- Gestion des types de chambres (tarifs, capacité)
- Statuts : disponible, occupée, sale, nettoyage, maintenance
- Filtrage par statut et type

### Facturation
- Génération automatique des factures
- Export PDF avec en-tête personnalisé
- Calcul TVA automatique
- Envoi par email (optionnel)

### Gouvernante
- Vue temps réel de l'état des chambres
- Changement de statut par étage
- Restrictions selon les rôles

### Administration
- Gestion des utilisateurs et rôles
- Paramètres hôtel (coordonnées, TVA, horaires)
- Tableaux de bord avec KPI

### Sécurité
- Authentification JWT
- Autorisation par rôles (admin/réceptionniste)
- Protection RGPD
- Validation stricte des données

## Comptes par Défaut

Après exécution de `seed.py` :

- **Administrateur** : admin@inndesk.com / admin123
- **Réceptionniste** : reception@inndesk.com / reception123

## Support

Ce projet est développé dans un cadre pédagogique. Pour toute question technique, consultez la documentation dans `CLAUDE.md`.