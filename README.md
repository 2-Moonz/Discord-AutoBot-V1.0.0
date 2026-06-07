# Discord Bot Manager

A Discord moderation bot with a custom CMD interface.

## Requirements

- Node.js v18+
- A Discord bot token (from https://discord.com/developers/applications)

This repository also includes two small Windows helper scripts:

- `setup.bat` — Attempts to install Node.js via `winget` or `choco` if missing, runs `npm install`, and creates a default `config.txt` if one does not exist.
- `run.bat` — Starts the manager with `node cmd.js` and automatically restarts the process if it exits with a non-zero code.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Run the manager:
   ```
   node cmd.js
   ```
   or
   ```
   npm start
   ```

3. Add your bot token in the CMD:
   ```
   add-token YOUR_TOKEN_HERE
   ```

4. Start the bot:
   ```
   start
   ```

---

## CMD Commands

| Command                    | Description                              |
|----------------------------|------------------------------------------|
| `add-token <token>`        | Set the bot token                        |
| `replace-token <token>`    | Replace an existing token                |
| `show-token`               | Show the current token (masked)          |
| `start`                    | Start the Discord bot                    |
| `stop`                     | Stop the Discord bot                     |
| `restart`                  | Restart the Discord bot                  |
| `status`                   | Show bot/config status                   |
| `add-word <word>`          | Add a word to the bad-word filter        |
| `remove-word <word>`       | Remove a word from the bad-word filter   |
| `list-words`               | List all filtered words                  |
| `clear` / `cls`            | Clear the screen                         |
| `log`                      | View recent activity log                 |
| `help`                     | Show all commands                        |
| `exit` / `quit`            | Exit the program                         |

**Keyboard shortcuts:**
- `Up/Down arrows` — scroll through command history
- `Tab` — auto-complete commands
- `Ctrl+C` — force quit

---

## Discord Slash Commands (Admin only)

| Command                   | Description                              |
|---------------------------|------------------------------------------|
| `/ban <user> [reason]`    | Ban a member                             |
| `/kick <user> [reason]`   | Kick a member                            |
| `/mute <user> [duration]` | Timeout a member (default 10 min)        |
| `/unmute <user>`          | Remove timeout from a member             |
| `/warn <user> <reason>`   | Send a DM warning to a member            |
| `/purge <amount>`         | Delete last N messages (max 100)         |
| `/add-badword <word>`     | Add a word to the filter (in Discord)    |
| `/remove-badword <word>`  | Remove a word from the filter            |
| `/list-badwords`          | List all filtered words (ephemeral)      |
| `/serverinfo`             | Show server info                         |
| `/userinfo [user]`        | Show user info                           |
| `/slowmode <seconds>`     | Set channel slowmode (0 = off)           |
| `/lock`                   | Lock channel (prevent messages)          |
| `/unlock`                 | Unlock channel                           |
| `/announce <message>`     | Send an embed announcement               |

All Discord commands require admin or appropriate permissions. They appear in Discord's slash command picker when you type `/`.

---

## Discord Bot Setup

1. Go to https://discord.com/developers/applications
2. Create a new application
3. Go to "Bot" tab and copy the token
4. Under "Privileged Gateway Intents" enable:
   - Server Members Intent
   - Message Content Intent
5. Go to OAuth2 > URL Generator, select:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Administrator` (or specific permissions)
6. Use the generated URL to invite the bot to your server

---

## Bad Word Filter

- Words are stored in `config.txt` under `[BADWORDS]`
- Matching is case-insensitive and checks if the word appears anywhere in the message
- When a bad word is detected, the message is deleted and a 5-second warning is posted
- Add/remove words via CMD (`add-word`) or Discord (`/add-badword`)

## Setup (Windows)

Use the included `setup.bat` to prepare a fresh Windows machine. It checks for `node`/`npm`, offers to install Node.js using `winget` or `choco` if available, runs `npm install`, and creates a default `config.txt` if missing.

- Safe dry-run to verify actions without changes:

```powershell
cd "C:\Users\<you>\Downloads\Codes\discord-bot"
cmd /c "setup.bat --dry"
```

- To run interactively (may prompt to install Node.js):

```powershell
cmd /c "setup.bat"
```

Notes:
- If neither `winget` nor `choco` is present the script will ask you to install Node.js manually from https://nodejs.org/
- Installing Node may require admin rights and a terminal restart before `node`/`npm` appear on PATH.
