# Dockerfile — InnDesk (FastAPI + WeasyPrint)
FROM python:3.11-slim

# Dépendances système requises par WeasyPrint (génération PDF)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installer d'abord les dépendances (cache Docker optimisé)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code applicatif
COPY backend/ backend/
COPY frontend/ frontend/
COPY seed.py .

# Utilisateur non-root (bonne pratique sécurité)
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
