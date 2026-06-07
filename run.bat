@echo off
REM run.bat - Start the Discord bot and auto-restart if it exits with an error
REM This script assumes Node.js is installed and dependencies are installed via npm.

ncd /d "%~dp0"
echo Starting discord-bot (press Ctrl+C to stop)...
:loop
  echo [%time%] Launching node cmd.js
  node cmd.js
  set exitCode=%ERRORLEVEL%
  echo [%time%] Process exited with code %exitCode%
  if %exitCode%==0 (
    echo Process exited cleanly (exit code 0). Not restarting.
    goto end
  )
  echo Restarting in 3 seconds...
  timeout /t 3 /nobreak >nul
  goto loop
:end
necho Exiting run script.
pause
