@echo off
echo.
echo  --------------------------------------
echo   VirtuFit — Environnement DEV
echo  --------------------------------------
echo.

echo [1/2] Demarrage des bases de donnees...
docker compose -f docker-compose.dev.yml up -d

echo.
echo [2/2] Attente de la disponibilite...
timeout /t 5 /nobreak >nul

echo.
echo  Bases de donnees pretes :
echo   PostgreSQL : localhost:5432
echo   MongoDB    : localhost:27017
echo.
echo  Pour arreter : docker compose -f docker-compose.dev.yml down
echo.