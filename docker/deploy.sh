#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Script de déploiement InnDesk
# =============================================================================
# Déploie l'application sur un serveur (VPS Linux) via Docker Compose.
# Étapes : sauvegarde BDD -> récupération du code -> build -> migration ->
# redémarrage -> vérification de santé. En cas d'échec, la sauvegarde
# permet une restauration manuelle (voir section Rollback du dossier).
#
# Prérequis : Docker + Docker Compose installés, fichier .env présent
# (jamais versionné — contient JWT_SECRET et POSTGRES_PASSWORD).
#
# Usage : ./deploy.sh [branche]   (défaut : master)
# =============================================================================
set -euo pipefail   # arrêt immédiat en cas d'erreur, variable non définie ou échec dans un pipe

BRANCH="${1:-master}"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "==> [1/6] Sauvegarde de la base de données"
mkdir -p "$BACKUP_DIR"
docker compose exec -T db pg_dump -U inndesk inndesk > "$BACKUP_DIR/inndesk_$TIMESTAMP.sql" \
  && echo "    Sauvegarde : $BACKUP_DIR/inndesk_$TIMESTAMP.sql" \
  || echo "    (base non démarrée : premier déploiement, pas de sauvegarde)"

echo "==> [2/6] Récupération de la dernière version ($BRANCH)"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "==> [3/6] Vérification de la configuration"
[ -f .env ] || { echo "ERREUR : fichier .env manquant"; exit 1; }

echo "==> [4/6] Build de l'image applicative"
docker compose build app

echo "==> [5/6] Redémarrage des services"
docker compose up -d
# Le schéma est créé/mis à jour au démarrage (Base.metadata.create_all)

echo "==> [6/6] Vérification de santé"
sleep 5
if curl -fsS http://localhost:8000/docs > /dev/null; then
  echo "✅ Déploiement réussi — application accessible sur le port 8000"
else
  echo "❌ L'application ne répond pas. Consulter : docker compose logs app"
  echo "   Restauration possible : cat $BACKUP_DIR/inndesk_$TIMESTAMP.sql | docker compose exec -T db psql -U inndesk inndesk"
  exit 1
fi
