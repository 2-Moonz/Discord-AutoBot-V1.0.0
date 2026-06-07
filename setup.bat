@echo off
REM setup.bat - Prepare a Windows machine to run this Discord bot repository
REM What this script will do (best-effort):
REM  - Check for Node.js and try to install it via winget or choco if missing
REM  - Run `npm install` to install dependencies
REM  - Ensure config.txt exists with default content
REM  - Print next steps to the user

SETLOCAL ENABLEDELAYEDEXPANSION
:: Change to the script directory
cd /d "%~dp0"

:: Support a dry-run mode to validate without making changes
set "DRYRUN=0"
if /I "%~1"=="--dry" set DRYRUN=1
if /I "%~1"=="/dry" set DRYRUN=1
if /I "%~1"=="dry" set DRYRUN=1

echo ==================================================
echo Setting up Discord bot repository (script: setup.bat)
echo ==================================================

echo.
echo Checking for Node.js...
where node >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
  for /f "delims=" %%v in ('node -v 2^>nul') do set "NODE_VERSION=%%v"
  echo Node is installed: %NODE_VERSION%
  goto :node_check_done
)

echo Node.js was not found on this system.
echo.
goto :try_node_install

:try_node_install
echo Trying to install Node.js (best-effort)...

:: Try winget
where winget >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
  echo winget found.
  IF %DRYRUN% EQU 1 (
    echo [DRY RUN] Would run: winget install OpenJS.NodeJS -e --accept-source-agreements --accept-package-agreements
  ) ELSE (
    set /p CHOICE="Install Node.js via winget now? [Y/N]: "
    if /I "!CHOICE!"=="Y" (
      echo Installing Node.js via winget...
      winget install OpenJS.NodeJS -e --accept-source-agreements --accept-package-agreements
    ) ELSE (
      echo Skipping winget install.
    )
  )
) ELSE (
  echo winget not available.
  :: Try Chocolatey
  where choco >nul 2>&1
  IF %ERRORLEVEL% EQU 0 (
    echo Chocolatey found.
    IF %DRYRUN% EQU 1 (
      echo [DRY RUN] Would run: choco install nodejs-lts -y
    ) ELSE (
      set /p CHOICE="Install Node.js via Chocolatey now? [Y/N]: "
      if /I "!CHOICE!"=="Y" (
        echo Installing Node.js via Chocolatey...
        choco install nodejs-lts -y
      ) ELSE (
        echo Skipping choco install.
      )
    )
  ) ELSE (
    echo Neither winget nor Chocolatey found. Please install Node.js manually from https://nodejs.org/ and re-run this script.
  )
)

echo.
echo Re-checking for node executable...
where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo Node.js still not found. You may need to restart your terminal or log off/log on after installation.
  IF %DRYRUN% EQU 1 (
    echo [DRY RUN] Continuing for dry-run mode.
  ) ELSE (
    pause
    exit /b 1
  )
) ELSE (
  for /f "delims=" %%v in ('node -v 2^>nul') do set "NODE_VERSION=%%v"
  echo Node is now available: %NODE_VERSION%
)

:node_check_done

echo.
echo Running npm install in repository...
IF NOT EXIST package.json (
  echo package.json not found in %cd% - are you in the project root?
  pause
  exit /b 1
)

where npm >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo npm was not found. Ensure Node.js is correctly installed and npm is on PATH.
  pause
  exit /b 1
)

IF %DRYRUN% EQU 1 (
  echo [DRY RUN] Would run: npm install --no-audit --no-fund
) ELSE (
  echo Installing npm dependencies. This may take a minute...
  npm install --no-audit --no-fund
  IF %ERRORLEVEL% NEQ 0 (
    echo npm install failed. Please inspect the errors above.
    pause
    exit /b 1
  )
)

echo.
echo Ensuring config.txt exists and has default values...
IF NOT EXIST config.txt (
  IF %DRYRUN% EQU 1 (
    echo [DRY RUN] Would create config.txt with default content
  ) ELSE (
    >config.txt echo # Bot Configuration File
    >>config.txt echo.
    >>config.txt echo [BADWORDS]
    >>config.txt echo.
    >>config.txt echo [TOKEN]
    >>config.txt echo YOUR_BOT_TOKEN_HERE
    echo Created config.txt
  )
) ELSE (
  echo config.txt already exists. Leaving it unchanged.
)

echo.
echo Setup complete.
echo Next steps:
echo  - Open config.txt and set your bot token under the [TOKEN] section.
echo  - Run run.bat to start the bot (it will restart on crashes).
echo  - Alternatively run "npm start" or "node cmd.js" to run manually.
IF %DRYRUN% EQU 1 echo [DRY RUN] Finished.
pause
ENDLOCAL
