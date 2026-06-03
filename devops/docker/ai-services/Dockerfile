# STAGE 1 — Builder
FROM python:3.12-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN pip install --upgrade pip

COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt


# STAGE 2 — Production
FROM python:3.12-slim AS production

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production

# Utilisateur non-root pour la sécurité
RUN addgroup --gid 1001 --system python && \
    adduser  --uid 1001 --system --gid 1001 fastapi

COPY --from=builder --chown=fastapi:python /install /usr/local
COPY --chown=fastapi:python app/ ./app/

USER fastapi

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD python -c "import httpx; httpx.get('http://localhost:8000/api/v1/health').raise_for_status()"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]