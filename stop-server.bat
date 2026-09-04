@echo off
setlocal
title Stop WallettuTrack - Docker Desktop
cd /d "%~dp0"

echo Stopping the WallettuTrack containers...
docker compose stop
if errorlevel 1 (
  echo ERROR: the containers could not be stopped.
  pause
  exit /b 1
)

echo Containers stopped. MySQL data remains in the configured external volume.
pause
