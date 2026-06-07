// bot.js - Discord bot logic

const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
} = require('discord.js');

const cfg = require('./config.js');
let client = null;
let logger = null; // set by cmd.js

function setLogger(fn) { logger = fn; }
function log(msg) { if (logger) logger(msg); }

// ─── Slash command definitions ───────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a member')
    .addUserOption(o => o.setName('user').setDescription('User to mute').setRequired(true))
    .addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes (default 10)').setRequired(false))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout from a member')
    .addUserOption(o => o.setName('user').setDescription('User to unmute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member (sends them a DM)')
    .addUserOption(o => o.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete the last N messages in this channel')
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages (1-100)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('add-badword')
    .setDescription('Add a word to the bad-word filter')
    .addStringOption(o => o.setName('word').setDescription('Word to block').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('remove-badword')
    .setDescription('Remove a word from the bad-word filter')
    .addStringOption(o => o.setName('word').setDescription('Word to remove').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('list-badwords')
    .setDescription('List all filtered words')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Display information about this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Display information about a user')
    .addUserOption(o => o.setName('user').setDescription('User to inspect').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for this channel')
    .addIntegerOption(o => o.setName('seconds').setDescription('Seconds between messages (0 = off)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock this channel (prevent members from sending messages)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement embed to this channel')
    .addStringOption(o => o.setName('message').setDescription('Announcement text').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

// ─── Register slash commands ─────────────────────────────────────────────────
async function registerCommands(token, clientId) {
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationCommands(clientId), {
    body: commands.map(c => c.toJSON()),
  });
  log('[BOT] Slash commands registered globally.');
}

// ─── Check message for bad words ─────────────────────────────────────────────
function containsBadword(content) {
  const lower = content.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const words = cfg.getBadwords();
  return words.find(w => lower.includes(w)) || null;
}

// ─── Start bot ───────────────────────────────────────────────────────────────
async function start(onReady) {
  const token = cfg.getToken();
  if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
    log('[BOT] No token set. Use "add-token <token>" first.');
    return false;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel],
  });

  client.once('ready', async () => {
    log(`[BOT] Logged in as ${client.user.tag}`);
    try {
      await registerCommands(token, client.user.id);
    } catch (e) {
      log('[BOT] Failed to register commands: ' + e.message);
    }
    if (onReady) onReady(client.user.tag);
  });

  // Auto-delete bad words
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot) return;
    const hit = containsBadword(msg.content);
    if (hit) {
      try {
        await msg.delete();
        log(`[FILTER] Deleted message from ${msg.author.tag} in #${msg.channel.name} — matched: "${hit}"`);
        const warn = await msg.channel.send(`> [!] ${msg.author}, your message was removed for containing a filtered word.`);
        setTimeout(() => warn.delete().catch(() => {}), 5000);
      } catch (e) {
        log('[FILTER] Could not delete message: ' + e.message);
      }
    }
  });

  // Slash command handler
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    try {
      if (commandName === 'ban') {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = interaction.guild.members.cache.get(user.id);
        if (!member) return interaction.reply({ content: '[!] User not found in this server.', ephemeral: true });
        await member.ban({ reason });
        log(`[BOT] ${interaction.user.tag} banned ${user.tag} | Reason: ${reason}`);
        await interaction.reply({ content: `[+] Banned **${user.tag}** | Reason: ${reason}` });
      }

      else if (commandName === 'kick') {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = interaction.guild.members.cache.get(user.id);
        if (!member) return interaction.reply({ content: '[!] User not found.', ephemeral: true });
        await member.kick(reason);
        log(`[BOT] ${interaction.user.tag} kicked ${user.tag} | Reason: ${reason}`);
        await interaction.reply({ content: `[+] Kicked **${user.tag}** | Reason: ${reason}` });
      }

      else if (commandName === 'mute') {
        const user = interaction.options.getUser('user');
        const duration = (interaction.options.getInteger('duration') || 10) * 60 * 1000;
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = interaction.guild.members.cache.get(user.id);
        if (!member) return interaction.reply({ content: '[!] User not found.', ephemeral: true });
        await member.timeout(duration, reason);
        log(`[BOT] ${interaction.user.tag} muted ${user.tag} for ${duration / 60000}m`);
        await interaction.reply({ content: `[+] Muted **${user.tag}** for ${duration / 60000} minute(s) | Reason: ${reason}` });
      }

      else if (commandName === 'unmute') {
        const user = interaction.options.getUser('user');
        const member = interaction.guild.members.cache.get(user.id);
        if (!member) return interaction.reply({ content: '[!] User not found.', ephemeral: true });
        await member.timeout(null);
        log(`[BOT] ${interaction.user.tag} unmuted ${user.tag}`);
        await interaction.reply({ content: `[+] Unmuted **${user.tag}**` });
      }

      else if (commandName === 'warn') {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        try {
          await user.send(`[!] You have been warned in **${interaction.guild.name}**.\nReason: ${reason}`);
        } catch (_) {}
        log(`[BOT] ${interaction.user.tag} warned ${user.tag} | Reason: ${reason}`);
        await interaction.reply({ content: `[+] Warned **${user.tag}** | Reason: ${reason}` });
      }

      else if (commandName === 'purge') {
        const amount = Math.min(100, Math.max(1, interaction.options.getInteger('amount')));
        await interaction.deferReply({ ephemeral: true });
        const deleted = await interaction.channel.bulkDelete(amount, true);
        log(`[BOT] ${interaction.user.tag} purged ${deleted.size} messages in #${interaction.channel.name}`);
        await interaction.editReply({ content: `[+] Deleted ${deleted.size} message(s).` });
      }

      else if (commandName === 'add-badword') {
        const word = interaction.options.getString('word').toLowerCase();
        const added = cfg.addBadword(word);
        log(`[BOT] ${interaction.user.tag} added badword: "${word}"`);
        await interaction.reply({ content: added ? `[+] Added "${word}" to filter.` : `[!] "${word}" is already in the filter.`, ephemeral: true });
      }

      else if (commandName === 'remove-badword') {
        const word = interaction.options.getString('word').toLowerCase();
        const removed = cfg.removeBadword(word);
        log(`[BOT] ${interaction.user.tag} removed badword: "${word}"`);
        await interaction.reply({ content: removed ? `[+] Removed "${word}" from filter.` : `[!] "${word}" was not in the filter.`, ephemeral: true });
      }

      else if (commandName === 'list-badwords') {
        const words = cfg.listBadwords();
        const display = words.length ? words.map((w, i) => `${i + 1}. ${w}`).join('\n') : '(none)';
        await interaction.reply({ content: `**Filtered Words:**\n\`\`\`\n${display}\n\`\`\``, ephemeral: true });
      }

      else if (commandName === 'serverinfo') {
        const g = interaction.guild;
        const embed = new EmbedBuilder()
          .setTitle(g.name)
          .setColor(0x2b2d31)
          .addFields(
            { name: 'ID', value: g.id, inline: true },
            { name: 'Owner', value: `<@${g.ownerId}>`, inline: true },
            { name: 'Members', value: `${g.memberCount}`, inline: true },
            { name: 'Channels', value: `${g.channels.cache.size}`, inline: true },
            { name: 'Roles', value: `${g.roles.cache.size}`, inline: true },
            { name: 'Created', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true },
          )
          .setThumbnail(g.iconURL());
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      else if (commandName === 'userinfo') {
        const user = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        const embed = new EmbedBuilder()
          .setTitle(user.tag)
          .setColor(0x2b2d31)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: 'ID', value: user.id, inline: true },
            { name: 'Joined Server', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true },
            { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'Roles', value: member ? member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.name).join(', ') || 'None' : 'N/A', inline: false },
          );
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      else if (commandName === 'slowmode') {
        const seconds = interaction.options.getInteger('seconds');
        await interaction.channel.setRateLimitPerUser(seconds);
        log(`[BOT] ${interaction.user.tag} set slowmode to ${seconds}s in #${interaction.channel.name}`);
        await interaction.reply({ content: seconds === 0 ? '[+] Slowmode disabled.' : `[+] Slowmode set to ${seconds}s.` });
      }

      else if (commandName === 'lock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        log(`[BOT] ${interaction.user.tag} locked #${interaction.channel.name}`);
        await interaction.reply({ content: '[+] Channel locked.' });
      }

      else if (commandName === 'unlock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
        log(`[BOT] ${interaction.user.tag} unlocked #${interaction.channel.name}`);
        await interaction.reply({ content: '[+] Channel unlocked.' });
      }

      else if (commandName === 'announce') {
        const message = interaction.options.getString('message');
        const embed = new EmbedBuilder()
          .setDescription(message)
          .setColor(0x5865f2)
          .setFooter({ text: `Announced by ${interaction.user.tag}` })
          .setTimestamp();
        await interaction.channel.send({ embeds: [embed] });
        log(`[BOT] ${interaction.user.tag} sent announcement in #${interaction.channel.name}`);
        await interaction.reply({ content: '[+] Announcement sent.', ephemeral: true });
      }

    } catch (e) {
      log('[BOT] Command error: ' + e.message);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '[!] An error occurred.', ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: '[!] An error occurred.', ephemeral: true }).catch(() => {});
      }
    }
  });

  client.on('error', (err) => log('[BOT] Client error: ' + err.message));

  try {
    await client.login(token);
    return true;
  } catch (e) {
    log('[BOT] Login failed: ' + e.message);
    return false;
  }
}

async function stop() {
  if (client) {
    client.destroy();
    client = null;
    log('[BOT] Bot stopped.');
    return true;
  }
  return false;
}

function isRunning() { return client !== null; }
function getClient() { return client; }

module.exports = { start, stop, isRunning, getClient, setLogger };
