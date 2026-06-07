

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.txt');

function readRaw() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, '# Bot Configuration File\n\n[BADWORDS]\n\n[TOKEN]\nYOUR_BOT_TOKEN_HERE\n');
  }
  return fs.readFileSync(CONFIG_PATH, 'utf8');
}

function parseConfig() {
  const raw = readRaw();
  const lines = raw.split('\n');
  const config = { token: null, badwords: [] };
  let section = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed === '') continue;
    if (trimmed === '[BADWORDS]') { section = 'badwords'; continue; }
    if (trimmed === '[TOKEN]') { section = 'token'; continue; }
    if (section === 'badwords' && trimmed) config.badwords.push(trimmed.toLowerCase());
    if (section === 'token' && trimmed) config.token = trimmed;
  }
  return config;
}

function writeConfig(config) {
  let out = '# Bot Configuration File\n# Lines starting with # are comments\n\n';
  out += '[BADWORDS]\n';
  for (const w of config.badwords) out += w + '\n';
  out += '\n[TOKEN]\n';
  out += (config.token || 'YOUR_BOT_TOKEN_HERE') + '\n';
  fs.writeFileSync(CONFIG_PATH, out, 'utf8');
}

function getToken() {
  return parseConfig().token;
}

function setToken(token) {
  const config = parseConfig();
  config.token = token.trim();
  writeConfig(config);
}

function getBadwords() {
  return parseConfig().badwords;
}

function addBadword(word) {
  const config = parseConfig();
  const w = word.trim().toLowerCase();
  if (!config.badwords.includes(w)) {
    config.badwords.push(w);
    writeConfig(config);
    return true;
  }
  return false; // already exists
}

function removeBadword(word) {
  const config = parseConfig();
  const w = word.trim().toLowerCase();
  const idx = config.badwords.indexOf(w);
  if (idx !== -1) {
    config.badwords.splice(idx, 1);
    writeConfig(config);
    return true;
  }
  return false;
}

function listBadwords() {
  return getBadwords();
}

module.exports = { getToken, setToken, getBadwords, addBadword, removeBadword, listBadwords };
