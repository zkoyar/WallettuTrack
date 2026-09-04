@echo off
setlocal EnableDelayedExpansion
title Start WallettuTrack - Docker Desktop
cd /d "%~dp0"

docker info >nul 2>&1
if not errorlevel 1 goto docker_ready

echo Starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo Waiting for the Docker engine...
set /a attempts=0

:wait_for_docker
timeout /t 2 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 goto docker_ready
set /a attempts+=1
if !attempts! LSS 60 goto wait_for_docker
echo ERROR: Docker Desktop did not become available.
pause
exit /b 1

:docker_ready
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-compose-volume.ps1"
if errorlevel 1 goto startup_error

echo.
echo Building and starting the WallettuTrack stack...
docker compose up -d --build
if errorlevel 1 goto startup_error

echo.
docker compose ps
echo.
echo ============================================
echo   WallettuTrack is running on Docker Desktop
echo   From this computer: http://localhost:3001
echo ============================================
echo.
echo For remote access, configure a VPN or an HTTPS reverse proxy
echo and set AUTH_URL in the .env file to the chosen address.
echo.
echo The containers keep running after this window is closed.
echo To stop them, run stop-server.bat.
pause
exit /b 0

:startup_error
echo.
echo ERROR: the stack failed to start.
docker compose ps
pause
exit /b 1
