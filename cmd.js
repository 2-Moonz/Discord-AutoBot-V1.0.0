

const readline = require('readline');
const cfg = require('./config.js');
const bot = require('./bot.js');


const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  black:   '\x1b[30m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bgBlack: '\x1b[40m',
  bgBlue:  '\x1b[44m',
  gray:    '\x1b[90m',
  lred:    '\x1b[91m',
  lgreen:  '\x1b[92m',
  lyellow: '\x1b[93m',
  lblue:   '\x1b[94m',
  lcyan:   '\x1b[96m',
  lwhite:  '\x1b[97m',
};

function color(str, ...codes) {
  return codes.join('') + str + C.reset;
}

// ─── ASCII Art Banner ─────────────────────────────────────────────────────────
const BANNER = `
${C.cyan}${C.bold} ██████╗  ██████╗ ████████╗ █████╗ ████████╗ ██████╗     ${C.lwhite} ██████╗  █████╗ ████████╗██████╗  ██████╗ ██╗     
${C.cyan}${C.bold} ██╔══██╗██╔═══██╗╚══██╔══╝██╔══██╗╚══██╔══╝██╔═══██╗    ${C.lwhite} ██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗██╔═══██╗██║     
${C.cyan}${C.bold} ██████╔╝██║   ██║   ██║   ███████║   ██║   ██║   ██║    ${C.lwhite} ██████╔╝███████║   ██║   ██████╔╝██║   ██║██║     
${C.cyan}${C.bold} ██╔═══╝ ██║   ██║   ██║   ██╔══██║   ██║   ██║   ██║    ${C.lwhite} ██╔═══╝ ██╔══██║   ██║   ██╔══██╗██║   ██║██║     
${C.cyan}${C.bold} ██║     ╚██████╔╝   ██║   ██║  ██║   ██║   ╚██████╔╝    ${C.lwhite} ██║     ██║  ██║   ██║   ██║  ██║╚██████╔╝███████╗
${C.cyan}${C.bold} ╚═╝      ╚═════╝    ╚═╝   ╚═╝  ╚═╝   ╚═╝    ╚═════╝     ${C.lwhite} ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
${C.reset}${C.gray} ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
${C.gray}  [*] Potato Patrol Bot  |  v1.0.0  |  type "help" for commands
${C.gray} ─────────────────────────────────────────────────────────────────────────────────────────────────────────────${C.reset}
`;

// ─── Log buffer for redraw ────────────────────────────────────────────────────
const LOG_MAX = 200;
let logLines = [];
let inputBuffer = '';
let cursorVisible = true;
let cursorTimer = null;
let rl = null;

function ts() {
  const now = new Date();
  return color(
    `[${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}]`,
    C.gray
  );
}

function pushLog(line) {
  logLines.push(line);
  if (logLines.length > LOG_MAX) logLines.shift();
}

bot.setLogger((msg) => {
  const prefix = msg.startsWith('[BOT]')    ? color('[BOT]',    C.cyan)    :
                 msg.startsWith('[FILTER]') ? color('[FILTER]', C.lred)    :
                 msg.startsWith('[ERR]')    ? color('[ERR]',    C.lred)    :
                 msg.startsWith('[OK]')     ? color('[OK]',     C.lgreen)  :
                 msg.startsWith('[INFO]')   ? color('[INFO]',   C.lblue)   :
                                             color('[LOG]',     C.gray);
  const rest = msg.replace(/^\[.*?\]\s*/, '');
  pushLog(`${ts()} ${prefix} ${rest}`);
  renderLog();
});

function log(msg, type = 'LOG') {
  const icons = {
    LOG:     color('[LOG]',     C.gray),
    OK:      color('[OK]',      C.lgreen),
    ERR:     color('[ERR]',     C.lred),
    WARN:    color('[WARN]',    C.lyellow),
    INFO:    color('[INFO]',    C.lblue),
    CMD:     color('[CMD]',     C.lcyan),
    BOT:     color('[BOT]',     C.cyan),
    FILTER:  color('[FILTER]', C.lred),
  };
  pushLog(`${ts()} ${icons[type] || icons.LOG} ${msg}`);
  renderLog();
}

// ─── Render ───────────────────────────────────────────────────────────────────
const PROMPT_ICON  = color('|>', C.cyan + C.bold);
const PROMPT_LINE  = color(' discord-bot', C.lwhite) + color('@', C.gray) + color('manager', C.lcyan) + color(' $ ', C.gray);

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

function getTermRows() { return process.stdout.rows || 30; }
function getTermCols() { return process.stdout.columns || 100; }

function renderLog() {
  if (!process.stdout.isTTY) {
    // Non-TTY fallback: just print lines normally
    if (logLines.length > 0) {
      process.stdout.write(logLines[logLines.length - 1] + '\n');
    }
    return;
  }

  const rows = getTermRows();
  // Lines for log area: total rows - banner lines (8) - separator (1) - input (1) - padding (2)
  const logAreaRows = Math.max(5, rows - 13);

  // Save cursor, go to top
  process.stdout.write('\x1b[s'); // save
  process.stdout.write('\x1b[H'); // go to top

  // Print banner (clear it first)
  process.stdout.write(BANNER);

  // Print log lines
  const visible = logLines.slice(-logAreaRows);
  for (let i = 0; i < logAreaRows; i++) {
    process.stdout.write('\x1b[K'); // clear line
    if (i < visible.length) {
      process.stdout.write('  ' + visible[i]);
    }
    process.stdout.write('\n');
  }

  // Separator
  process.stdout.write(C.gray + '  ' + '─'.repeat(Math.max(0, getTermCols() - 4)) + C.reset + '\n');

  // Input line
  const cursor = cursorVisible ? color('|', C.cyan + C.bold) : ' ';
  process.stdout.write('\x1b[K');
  process.stdout.write(PROMPT_LINE + inputBuffer + cursor + '\n');

  // Restore cursor
  process.stdout.write('\x1b[u');
}

function startCursorBlink() {
  if (cursorTimer) return;
  cursorTimer = setInterval(() => {
    cursorVisible = !cursorVisible;
    renderLog();
  }, 530);
}


// Helper to pad regular text so it perfectly fits the box width
const formatRow = (leftText, rightText = '') => {
  const TOTAL_INNER_WIDTH = 54; // Matches your 54-character wide box
  
  // Combine your command and description
  let content = leftText;
  if (rightText) {
    // Pads the space between command and description
    content = `  ${leftText.padEnd(23)}${rightText}`;
  } else {
    content = ` ${leftText}`; // Padding for category headers
  }
  
  // Pad the rest of the string to perfectly hit the right border
  const paddedContent = content.padEnd(TOTAL_INNER_WIDTH);
  
  // Wrap ONLY the borders in color, keeping the inside lengths predictable
  return color('  ║', C.cyan) + paddedContent + color('║', C.cyan);
};

// ─── Commands ─────────────────────────────────────────────────────────────────
const HELP_TEXT = [
  '',
  color('  ╔══════════════════════════════════════════════════════╗', C.cyan),
  color('  ║', C.cyan) + color('                  AVAILABLE COMMANDS                  ', C.lwhite) + color('║', C.cyan),
  color('  ╠══════════════════════════════════════════════════════╣', C.cyan),
  color('  ║', C.cyan) + color(' TOKEN MANAGEMENT                                     ', C.lyellow) + color('║', C.cyan),
  formatRow('add-token <token>', 'Set the bot token'),
  formatRow('replace-token <token>', 'Replace existing bot token'),
  formatRow('show-token', 'Show the current token (masked)'),
  color('  ╠══════════════════════════════════════════════════════╣', C.cyan),
  color('  ║', C.cyan) + color(' BOT CONTROL                                          ', C.lyellow) + color('║', C.cyan),
  formatRow('start', 'Start the Discord bot'),
  formatRow('stop', 'Stop the Discord bot'),
  formatRow('restart', 'Restart the Discord bot'),
  formatRow('status', 'Show bot status'),
  color('  ╠══════════════════════════════════════════════════════╣', C.cyan),
  color('  ║', C.cyan) + color(' BAD WORD FILTER                                      ', C.lyellow) + color('║', C.cyan),
  formatRow('add-word <word>', 'Add word to filter'),
  formatRow('remove-word <word>', 'Remove word from filter'),
  formatRow('list-words', 'List all filtered words'),
  color('  ╠══════════════════════════════════════════════════════╣', C.cyan),
  color('  ║', C.cyan) + color(' TERMINAL                                             ', C.lyellow) + color('║', C.cyan),
  formatRow('clear / cls', 'Clear the screen'),
  formatRow('log', 'Show recent activity log'),
  formatRow('help', 'Show this help screen'),
  formatRow('exit / quit', 'Exit the program'),
  color('  ╚══════════════════════════════════════════════════════╝', C.cyan),
  '',
];

// Show the full help screen in a temporary fullscreen view and wait for any key to return
async function showHelp() {
  if (!process.stdin.isTTY) {
    HELP_TEXT.forEach(l => process.stdout.write(l + '\n'));
    return;
  }

  // remember whether cursor blinking was enabled
  const wasBlinking = !!cursorTimer;
  if (wasBlinking) {
    clearInterval(cursorTimer);
    cursorTimer = null;
  }

  clearScreen();
  process.stdout.write(BANNER);
  HELP_TEXT.forEach(l => process.stdout.write(l + '\n'));
  process.stdout.write('\n' + color('Press any key to return...', C.gray) + '\n');

  // Wait for a single keypress
  await new Promise((resolve) => {
    const onKey = (str, key) => {
      // remove listener and resolve
      process.stdin.removeListener('keypress', onKey);
      resolve();
    };
    process.stdin.on('keypress', onKey);
  });

  // restore cursor blinking if it was running
  if (wasBlinking) startCursorBlink();
  renderLog();
}

async function handleCommand(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return;

  const parts  = trimmed.split(/\s+/);
  const cmd    = parts[0].toLowerCase();
  const args   = parts.slice(1);
  const argStr = args.join(' ');

  log(`> ${trimmed}`, 'CMD');

  switch (cmd) {
    // ── Token ──────────────────────────────────────────────
    case 'add-token':
    case 'replace-token': {
      if (!argStr) { log('Usage: add-token <token>', 'WARN'); break; }
      const prev = cfg.getToken();
      if (prev && prev !== 'YOUR_BOT_TOKEN_HERE' && cmd === 'add-token') {
        log('Token already set. Use replace-token to overwrite.', 'WARN');
        break;
      }
      cfg.setToken(argStr);
      log('Token saved to config.txt', 'OK');
      break;
    }

    case 'show-token': {
      const t = cfg.getToken() || '(none)';
      if (t === 'YOUR_BOT_TOKEN_HERE' || t === '(none)') {
        log('No token set.', 'WARN');
      } else {
        const masked = t.slice(0, 8) + '****' + t.slice(-6);
        log(`Current token: ${color(masked, C.lyellow)}`, 'INFO');
      }
      break;
    }

    // ── Bot control ────────────────────────────────────────
    case 'start': {
      if (bot.isRunning()) { log('Bot is already running.', 'WARN'); break; }
      log('Starting bot...', 'INFO');
      const ok = await bot.start((tag) => {
        log(`Bot is online as ${color(tag, C.lgreen)}`, 'OK');
      });
      if (!ok) log('Failed to start bot. Check your token.', 'ERR');
      break;
    }

    case 'stop': {
      if (!bot.isRunning()) { log('Bot is not running.', 'WARN'); break; }
      await bot.stop();
      log('Bot stopped.', 'OK');
      break;
    }

    case 'restart': {
      if (bot.isRunning()) {
        await bot.stop();
        log('Stopped. Restarting...', 'INFO');
      }
      const ok2 = await bot.start((tag) => {
        log(`Bot restarted as ${color(tag, C.lgreen)}`, 'OK');
      });
      if (!ok2) log('Restart failed. Check your token.', 'ERR');
      break;
    }

    case 'status': {
      const running = bot.isRunning();
      const client  = bot.getClient();
      const token   = cfg.getToken();
      const words   = cfg.getBadwords();
      log(`Bot status   : ${running ? color('ONLINE', C.lgreen) : color('OFFLINE', C.lred)}`, 'INFO');
      if (running && client) log(`Logged in as : ${color(client.user.tag, C.lcyan)}`, 'INFO');
      log(`Token set    : ${token && token !== 'YOUR_BOT_TOKEN_HERE' ? color('Yes', C.lgreen) : color('No', C.lred)}`, 'INFO');
      log(`Filtered words: ${color(words.length.toString(), C.lyellow)}`, 'INFO');
      break;
    }

    // ── Bad word filter ────────────────────────────────────
    case 'add-word': {
      if (!argStr) { log('Usage: add-word <word>', 'WARN'); break; }
      const added = cfg.addBadword(argStr);
      log(added ? `Added "${argStr}" to filter.` : `"${argStr}" is already in the filter.`, added ? 'OK' : 'WARN');
      break;
    }

    case 'remove-word': {
      if (!argStr) { log('Usage: remove-word <word>', 'WARN'); break; }
      const removed = cfg.removeBadword(argStr);
      log(removed ? `Removed "${argStr}" from filter.` : `"${argStr}" was not in the filter.`, removed ? 'OK' : 'WARN');
      break;
    }

    case 'list-words': {
      const words = cfg.listBadwords();
      if (words.length === 0) {
        log('No filtered words configured.', 'INFO');
      } else {
        log(`Filtered words (${words.length}):`, 'INFO');
        words.forEach((w, i) => log(`  ${color((i + 1).toString().padStart(2, ' '), C.gray)}. ${color(w, C.lyellow)}`, 'LOG'));
      }
      break;
    }

    // ── Terminal ───────────────────────────────────────────
    case 'clear':
    case 'cls': {
      logLines = [];
      clearScreen();
      process.stdout.write(BANNER);
      renderLog();
      log('Screen cleared.', 'OK');
      break;
    }

    case 'log': {
      log(`Showing last ${Math.min(logLines.length, 50)} log entries:`, 'INFO');
      // already visible in the log pane
      break;
    }

    case 'help': {
      await showHelp();
      break;
    }

    case 'exit':
    case 'quit': {
      log('Shutting down...', 'INFO');
      if (bot.isRunning()) await bot.stop();
      if (cursorTimer) clearInterval(cursorTimer);
      setTimeout(() => process.exit(0), 400);
      break;
    }

    default:
      log(`Unknown command: "${cmd}". Type "help" for a list of commands.`, 'WARN');
  }
}

// ─── Input handling ───────────────────────────────────────────────────────────
function setupInput() {
  if (!process.stdin.isTTY) {
    // Non-interactive fallback (piped input)
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on('line', async (line) => {
      await handleCommand(line);
    });
    rl.on('close', () => process.exit(0));
    return;
  }

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  const history = [];
  let historyIdx = -1;

  process.stdin.on('keypress', async (str, key) => {
    if (!key) return;

    if (key.ctrl && key.name === 'c') {
      process.stdout.write('\n');
      log('Exiting...', 'INFO');
      if (bot.isRunning()) await bot.stop();
      if (cursorTimer) clearInterval(cursorTimer);
      process.exit(0);
    }

    if (key.name === 'return' || key.name === 'enter') {
      const cmd = inputBuffer.trim();
      inputBuffer = '';
      historyIdx = -1;
      if (cmd) {
        history.unshift(cmd);
        if (history.length > 100) history.pop();
        await handleCommand(cmd);
      }
      renderLog();
      return;
    }

    if (key.name === 'backspace') {
      inputBuffer = inputBuffer.slice(0, -1);
      renderLog();
      return;
    }

    if (key.name === 'up') {
      if (historyIdx < history.length - 1) {
        historyIdx++;
        inputBuffer = history[historyIdx] || '';
        renderLog();
      }
      return;
    }

    if (key.name === 'down') {
      if (historyIdx > 0) {
        historyIdx--;
        inputBuffer = history[historyIdx] || '';
      } else {
        historyIdx = -1;
        inputBuffer = '';
      }
      renderLog();
      return;
    }

    if (key.name === 'tab') {
      // Auto-complete
      const cmds = ['add-token', 'replace-token', 'show-token', 'start', 'stop', 'restart',
                    'status', 'add-word', 'remove-word', 'list-words', 'clear', 'cls',
                    'log', 'help', 'exit', 'quit'];
      const matches = cmds.filter(c => c.startsWith(inputBuffer));
      if (matches.length === 1) {
        inputBuffer = matches[0] + ' ';
        renderLog();
      } else if (matches.length > 1) {
        log('Suggestions: ' + matches.join(', '), 'INFO');
      }
      return;
    }

    // Printable chars
    if (str && !key.ctrl && !key.meta && str.length === 1) {
      inputBuffer += str;
      renderLog();
    }
  });
}

// ─── Entry point ──────────────────────────────────────────────────────────────
function main() {
  clearScreen();
  process.stdout.write(BANNER);

  log('Discord Bot Manager started. Type "help" for commands.', 'INFO');

  const t = cfg.getToken();
  if (!t || t === 'YOUR_BOT_TOKEN_HERE') {
    log('No token configured. Use: add-token <your_discord_bot_token>', 'WARN');
  } else {
    log('Token is set. Use "start" to launch the bot.', 'INFO');
  }

  setupInput();
  startCursorBlink();
  renderLog();
}

main();
