@echo off
setlocal EnableExtensions
title Xuan Zhu Gorge Game Launcher
cd /d "%~dp0"

if /i "%~1"=="--check" set "CHECK_ONLY=1"

set "NODE_EXE="
for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"

if not defined NODE_EXE (
  set "CODEX_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if exist "%CODEX_NODE%" set "NODE_EXE=%CODEX_NODE%"
)

if not defined NODE_EXE goto NO_NODE

if /i "%~1"=="--server" goto RUN_SERVER

if not exist "node_modules\vite\bin\vite.js" goto INSTALL_DEPS
goto CHECK_RUNNING

:INSTALL_DEPS
where npm >nul 2>nul
if errorlevel 1 goto NO_NPM
echo [Setup] Installing project dependencies...
call npm install
if errorlevel 1 goto INSTALL_FAILED

:CHECK_RUNNING
if defined CHECK_ONLY (
  echo Launcher check passed: Node and local dependencies are ready.
  exit /b 0
)
set "GAME_URL=http://127.0.0.1:5175/"
call :PING_SERVER
if not errorlevel 1 goto OPEN_GAME

echo [Start] Launching the local game server...
start "Xuan Zhu Gorge Game Server - close to stop" "%ComSpec%" /k call "%~f0" --server

set /a WAIT_COUNT=0
:WAIT_FOR_SERVER
call :PING_SERVER
if not errorlevel 1 goto OPEN_GAME
set /a WAIT_COUNT+=1
if %WAIT_COUNT% GEQ 20 goto START_FAILED
timeout /t 1 /nobreak >nul
goto WAIT_FOR_SERVER

:OPEN_GAME
echo [Ready] Opening %GAME_URL%
start "" "%GAME_URL%"
exit /b 0

:PING_SERVER
powershell -NoProfile -Command "try { $response=Invoke-WebRequest -UseBasicParsing -Uri '%GAME_URL%' -TimeoutSec 1; if ($response.StatusCode -ge 200) { exit 0 } } catch {}; exit 1" >nul 2>nul
exit /b %errorlevel%

:RUN_SERVER
echo Keep this window open while playing. Close it to stop the server.
"%NODE_EXE%" "node_modules\vite\bin\vite.js" --host 127.0.0.1 --port 5175 --strictPort
echo.
echo The game server has stopped.
pause
exit /b %errorlevel%

:NO_NODE
echo [Error] Node.js was not found.
echo Install Node.js 20.19 or newer, then run this file again.
pause
exit /b 1

:NO_NPM
echo [Error] Dependencies are missing and npm was not found.
echo Install Node.js with npm, then run this file again.
pause
exit /b 1

:INSTALL_FAILED
echo [Error] Dependency installation failed. Check the network and retry.
pause
exit /b 1

:START_FAILED
echo [Error] The game server did not start within 20 seconds.
echo Check the separate game server window for details.
pause
exit /b 1
