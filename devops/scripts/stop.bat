@echo off
echo.
echo  Arret de l'environnement DEV...
docker compose -f docker-compose.dev.yml down
echo  Arrete.
echo.