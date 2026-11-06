'use strict';
const V = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const nodes = require('./nodes');
const ytdlp = require('./lib/ytdlp');

const queues = new Map();
const IDLE_MS = 180000;
const YT = /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/;
const fmt = (s) => (s ? `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : "—");
const ytUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const who = (t) => (t.artist ? ` de ${t.artist}` : "");
const elapsed = (q) => { const r = q.player.state.resource; return r && r.playbackDuration ? Math.floor(r.playbackDuration / 1000) : 0; };

async function findTrack(query) {
  const m = query.match(YT) || (/^[A-Za-z0-9_-]{11}$/.test(query) ? [null, query] : null);
  try {
    if (m) { const it = await nodes.info(m[1]); if (it) return it; }
    else { const items = await nodes.search(query); if (items[0]) return items[0]; }
  } catch { /* sin celulares: respaldo */ }
  try {
    if (m) { const j = await ytdlp.json([`https://www.youtube.com/watch?v=${m[1]}`]); return { id: j.id, title: j.title, artist: j.uploader || '', sec: j.duration || 0 }; }
    const r = await ytdlp.json(['--flat-playlist', `ytsearch1:${query}`]);
    const e = (r.entries || [])[0];
    return e ? { id: e.id, title: e.title, artist: e.uploader || e.channel || '', sec: e.duration || 0 } : null;
  } catch { return null; }
}

async function getStream(track, onFail) {
  try {
    const a = await nodes.audio(track.id);
    return { stream: a.stream, via: `📱 ${a.node.name}`, cancel: a.cancel };
  } catch { /* respaldo */ }
  const proc = await ytdlp.stream(`https://www.youtube.com/watch?v=${track.id}`);
  proc.on('close', (code) => {
    if (code && !proc.killedByUs) {
      console.error('[yt-dlp]', String(proc.err || '').trim().split('\n').pop());
      if (onFail) onFail(String(proc.err || ''));
      proc.stdout.destroy(new Error(proc.err || 'yt-dlp falló'));
    }
  });
  return { stream: proc.stdout, via: '🖥️ servidor', cancel: () => { proc.killedByUs = true; try { proc.kill(); } catch {} } };
}

const sayEmbed = (q, embed) => q.client.channels.cache.get(q.textChannelId)?.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
const say = (q, text) => q.client.channels.cache.get(q.textChannelId)?.send({ content: text, allowedMentions: { parse: [] } }).catch(() => {});

function destroy(gid) {
  const q = queues.get(gid); if (!q) return;
  queues.delete(gid); clearTimeout(q.idle);
  try { q.cancel && q.cancel(); } catch {}
  try { q.player.stop(true); } catch {}
  try { q.conn.destroy(); } catch {}
}

async function playNext(gid) {
  const q = queues.get(gid); if (!q || q.loading) return;
  clearTimeout(q.idle);
  try { q.cancel && q.cancel(); } catch {}
  q.cancel = null; q.current = q.tracks.shift() || null;
  if (!q.current) { q.idle = setTimeout(() => { say(q, '👋 Me salgo por inactividad.'); destroy(gid); }, IDLE_MS); return; }
  q.loading = true;
  const t = q.current;
  try {
    const s = await getStream(t, (msg) => say(q, /sign in|bot|429|403|blocked|forbidden/i.test(msg)
      ? "❌ YouTube bloqueó la descarga desde el servidor. Hace falta un celular conectado (app Xloom → Ajustes → Prestar mi celular al bot)."
      : `❌ El servidor no pudo bajar el audio: ${msg.trim().split("\n").pop().slice(0, 140)}`));
    q.cancel = s.cancel;
    s.stream.on('error', () => {});
    q.player.play(V.createAudioResource(s.stream, { inputType: V.StreamType.Arbitrary }));
    sayEmbed(q, new EmbedBuilder().setColor(0x8b5cf6).setDescription(`▶️ Empezó a sonar **[${t.title}](${ytUrl(t.id)})**${who(t)}`).setThumbnail(thumb(t.id)).setFooter({ text: `${t.by ? `Pedida por ${t.by} · ` : ''}${s.via}`, iconURL: t.byIcon || undefined }));
  } catch (e) {
    say(q, `❌ No pude reproducir **${t.title}**: ${String(e.message).slice(0, 120)}`);
    q.loading = false; q.current = null;
    return playNext(gid);
  }
  q.loading = false;
}

async function ensure(i, vc) {
  let q = queues.get(i.guild.id);
  if (q) { q.textChannelId = i.channel.id; return q; }
  const conn = V.joinVoiceChannel({ channelId: vc.id, guildId: i.guild.id, adapterCreator: i.guild.voiceAdapterCreator, selfDeaf: true });
  const player = V.createAudioPlayer();
  q = { client: i.client, conn, player, tracks: [], current: null, textChannelId: i.channel.id, voiceChannelId: vc.id, idle: null, cancel: null, loading: false };
  queues.set(i.guild.id, q);
  try { await V.entersState(conn, V.VoiceConnectionStatus.Ready, 20000); }
  catch { destroy(i.guild.id); throw new Error('No pude conectarme al canal de voz (revisa mis permisos de Conectar y Hablar).'); }
  conn.subscribe(player);
  conn.on(V.VoiceConnectionStatus.Disconnected, async () => {
    try { await Promise.race([V.entersState(conn, V.VoiceConnectionStatus.Signalling, 5000), V.entersState(conn, V.VoiceConnectionStatus.Connecting, 5000)]); }
    catch { destroy(i.guild.id); }
  });
  player.on(V.AudioPlayerStatus.Idle, () => playNext(i.guild.id));
  player.on('error', (e) => { console.error('[player]', e.message); });
  return q;
}

async function play(i, query) {
  const vc = i.member.voice?.channel;
  if (!vc) return i.editReply('⚠️ Entra primero a un canal de voz.');
  const existing = queues.get(i.guild.id);
  if (existing && existing.voiceChannelId !== vc.id) return i.editReply('⚠️ Ya estoy sonando en otro canal de voz.');
  const track = await findTrack(query);
  if (!track) return i.editReply('❌ No encontré nada. Si no hay celulares conectados y el servidor está bloqueado por YouTube, prueba más tarde.');
  const q = await ensure(i, vc);
  track.by = i.member?.displayName || "alguien";
  track.byIcon = (i.member?.displayAvatarURL && i.member.displayAvatarURL()) || null;
  const first = !q.current && !q.loading && q.tracks.length === 0;
  let eta = q.current ? Math.max(0, (q.current.sec || 0) - elapsed(q)) : 0;
  for (const t of q.tracks) eta += t.sec || 0;
  q.tracks.push(track);
  if (first) {
    if (typeof i.deleteReply === "function") i.deleteReply().catch(() => {});
    playNext(i.guild.id);
    return;
  }
  const pos = q.tracks.length;
  const e = new EmbedBuilder().setColor(0x8b5cf6).setAuthor({ name: "Canción añadida a la cola" })
    .addFields(
      { name: "Canción", value: `[${track.title}](${ytUrl(track.id)})${who(track)}` },
      { name: "Tiempo estimado para sonar", value: fmt(eta), inline: true },
      { name: "Duración", value: fmt(track.sec), inline: true },
      { name: "Posición en la cola", value: pos === 1 ? "Siguiente" : `#${pos}`, inline: true })
    .setThumbnail(thumb(track.id))
    .setFooter({ text: `Pedida por ${track.by}`, iconURL: track.byIcon || undefined });
  await i.editReply({ embeds: [e] });
}

const get = (i) => queues.get(i.guild.id);
module.exports = { play, destroy, get, fmt };
