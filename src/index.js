'use strict';
require('dotenv').config();
const http = require('http');
const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
const nodes = require('./nodes');
const music = require('./player');
const ytdlp = require('./lib/ytdlp');

if (!process.env.DISCORD_TOKEN) { console.error('Falta DISCORD_TOKEN en .env'); process.exit(1); }
if (!process.env.NODE_KEY) console.warn('⚠️ Falta NODE_KEY: ningún celular podrá conectarse.');

// Servidor HTTP: los celulares de la comunidad se conectan acá.
const server = http.createServer(nodes.handle);
server.requestTimeout = 0; server.timeout = 0; server.headersTimeout = 30000; // las subidas de audio duran lo que dura la canción
server.listen(process.env.PORT || 3000, () => console.log('[http] escuchando'));

// Anti-sueño (Render Free): el bot se visita a sí mismo por su URL pública cada 8 min.
// Render pone RENDER_EXTERNAL_URL solo; en otro hosting usa SELF_URL.
const SELF = process.env.SELF_URL || process.env.RENDER_EXTERNAL_URL;
if (SELF) setInterval(() => fetch(SELF).catch(() => {}), 8 * 60 * 1000);


const commands = [
  new SlashCommandBuilder().setName('play').setDescription('Pone una canción (nombre o link de YouTube)').addStringOption((o) => o.setName('cancion').setDescription('Nombre o link').setRequired(true)),
  new SlashCommandBuilder().setName('skip').setDescription('Salta la canción'),
  new SlashCommandBuilder().setName('stop').setDescription('Para la música y me salgo'),
  new SlashCommandBuilder().setName('pausa').setDescription('Pausa'),
  new SlashCommandBuilder().setName('reanudar').setDescription('Reanuda'),
  new SlashCommandBuilder().setName('cola').setDescription('Muestra la cola'),
  new SlashCommandBuilder().setName('celulares').setDescription('Cuántos celulares de la comunidad están conectados'),
  new SlashCommandBuilder().setName('banear-celular').setDescription('(Dueño) Bloquea un celular por su código').addStringOption((o) => o.setName('codigo').setDescription('Primeras letras del código').setRequired(true)),
].map((c) => c.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once(Events.ClientReady, async (c) => {
  console.log(`[bot] ${c.user.tag} listo`);
  try {
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    const route = process.env.GUILD_ID ? Routes.applicationGuildCommands(c.user.id, process.env.GUILD_ID) : Routes.applicationCommands(c.user.id);
    await rest.put(route, { body: commands });
  } catch (e) { console.error('[cmds]', e.message); }
  ytdlp.ensure().then(() => ytdlp.autoUpdate()).catch(() => {});
});

client.on(Events.InteractionCreate, async (i) => {
  if (!i.isChatInputCommand() || !i.guild) return;
  const q = music.get(i);
  const owner = process.env.OWNER_ID && i.user.id === process.env.OWNER_ID;
  const mine = () => !q || (i.member.voice?.channelId === q.voiceChannelId);
  try {
    switch (i.commandName) {
      case 'play': await i.deferReply(); return await music.play(i, i.options.getString('cancion'));
      case 'skip': if (!q?.current) return i.reply('No hay nada sonando.'); if (!mine()) return i.reply('Entra a mi canal de voz.'); q.player.stop(); return i.reply('⏭️ Saltada.');
      case 'stop': if (!q) return i.reply('No estoy sonando.'); if (!mine()) return i.reply('Entra a mi canal de voz.'); music.destroy(i.guild.id); return i.reply('⏹️ Listo, me salgo.');
      case 'pausa': if (!q) return i.reply('No estoy sonando.'); q.player.pause(); return i.reply('⏸️ Pausada.');
      case 'reanudar': if (!q) return i.reply('No estoy sonando.'); q.player.unpause(); return i.reply('▶️ Sigue.');
      case 'cola': {
        if (!q || (!q.current && !q.tracks.length)) return i.reply('La cola está vacía.');
        const rows = q.tracks.slice(0, 10).map((t, n) => `${n + 1}. ${t.title} (${music.fmt(t.sec)})`).join('\n');
        return i.reply(`🎶 Ahora: **${q.current?.title || '—'}**${rows ? `\n${rows}` : ''}${q.tracks.length > 10 ? `\n…y ${q.tracks.length - 10} más` : ''}`);
      }
      case 'celulares': {
        const n = nodes.count();
        let t = n ? `📱 ${n} celular${n === 1 ? '' : 'es'} de la comunidad conectado${n === 1 ? '' : 's'}.` : '📵 No hay celulares conectados (uso el servidor de respaldo).';
        if (owner && n) t += '\n' + nodes.list().map((x) => `• ${x.name} · código ${x.id.slice(0, 6)} · ${x.served} canciones`).join('\n');
        return i.reply({ content: t, ephemeral: !!owner });
      }
      case 'banear-celular': if (!owner) return i.reply({ content: 'Solo el dueño del bot.', ephemeral: true }); return i.reply({ content: nodes.ban(i.options.getString('codigo')) ? '🚫 Bloqueado.' : 'No encontré ese código.', ephemeral: true });
    }
  } catch (e) {
    console.error('[cmd]', e);
    const msg = `❌ ${String(e.message).slice(0, 150)}`;
    (i.deferred || i.replied ? i.editReply(msg) : i.reply(msg)).catch(() => {});
  }
});

client.on(Events.MessageCreate, require('./prefix'));

process.on('unhandledRejection', (e) => console.error('[unhandled]', e));
client.login(process.env.DISCORD_TOKEN);
