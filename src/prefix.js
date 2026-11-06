"use strict";
// Comandos con prefijo: x!p canción · m!s · m!pause · m!resume · m!q · m!np · m!clear · m!stop
const music = require("./player");
const PREFIX = (process.env.PREFIX || "x!").toLowerCase();

module.exports = async function onMessage(m) {
  if (m.author.bot || !m.guild || !m.content.toLowerCase().startsWith(PREFIX)) return;
  const [cmd = "", ...rest] = m.content.slice(PREFIX.length).trim().split(/\s+/);
  const arg = rest.join(" ").trim();
  const c = cmd.toLowerCase();
  const reply = (t) => m.reply({ ...(typeof t === "string" ? { content: t } : t), allowedMentions: { repliedUser: false } }).catch(() => {});
  const q = music.get(m);
  const mine = !q || m.member.voice?.channelId === q.voiceChannelId;
  try {
    switch (c) {
      case "p": case "play": case "reproducir": {
        if (!arg) return reply(`Escribe la canción: \`${PREFIX}p nombre de la canción\``);
        const wait = await m.reply({ content: "⏳ Conectando a nuestros servidores…", allowedMentions: { repliedUser: false } }).catch(() => null);
        const edit = (t) => (wait ? wait.edit({ content: typeof t === "string" ? t : "", embeds: typeof t === "string" ? [] : (t.embeds || []) }).catch(() => {}) : reply(t));
        try {
          return await music.play({ guild: m.guild, member: m.member, channel: m.channel, client: m.client, editReply: edit, deleteReply: () => (wait ? wait.delete() : Promise.resolve()) }, arg);
        } catch (e) { console.error("[prefix]", e); return edit(`❌ ${String(e.message).slice(0, 150)}`); }
      }
      case "s": case "skip": case "next": case "saltar":
        if (!q?.current) return reply("No hay nada sonando."); if (!mine) return reply("Entra a mi canal de voz.");
        q.player.stop(); return reply("⏭️ Saltada.");
      case "stop": case "leave": case "dc": case "salir":
        if (!q) return reply("No estoy sonando."); if (!mine) return reply("Entra a mi canal de voz.");
        music.destroy(m.guild.id); return reply("⏹️ Listo, me salgo.");
      case "pause": case "pausa":
        if (!q?.current) return reply("No hay nada sonando."); q.player.pause(); return reply("⏸️ Pausada.");
      case "resume": case "r": case "reanudar":
        if (!q?.current) return reply("No hay nada sonando."); q.player.unpause(); return reply("▶️ Sigue.");
      case "q": case "queue": case "cola": {
        if (!q || (!q.current && !q.tracks.length)) return reply("La cola está vacía.");
        const rows = q.tracks.slice(0, 15).map((t, n) => `**${n + 1}.** ${t.title} (${music.fmt(t.sec)})`).join("\n");
        return reply(`🎶 Ahora: **${q.current?.title || "—"}**${rows ? `\n${rows}` : ""}${q.tracks.length > 15 ? `\n…y ${q.tracks.length - 15} más` : ""}${rows ? `\n👉 \`${PREFIX}ir número\` para poner una ya · \`${PREFIX}quitar número\` para sacarla` : ""}`);
      }
      case "ir": case "jump": case "skipto": {
        if (!q?.tracks.length) return reply("La cola está vacía.");
        if (!mine) return reply("Entra a mi canal de voz.");
        const n = parseInt(arg, 10);
        if (!n || n < 1 || n > q.tracks.length) return reply(`Elige un número de 1 a ${q.tracks.length}. Míralos con \`${PREFIX}q\``);
        const [t] = q.tracks.splice(n - 1, 1); q.tracks.unshift(t);
        q.player.stop();
        return reply(`⏭️ Voy con **${t.title}** (la que era nº ${n}).`);
      }
      case "quitar": case "remove": case "rm": {
        if (!q?.tracks.length) return reply("La cola está vacía.");
        const n = parseInt(arg, 10);
        if (!n || n < 1 || n > q.tracks.length) return reply(`Elige un número de 1 a ${q.tracks.length}.`);
        const [t] = q.tracks.splice(n - 1, 1);
        return reply(`🗑️ Quité **${t.title}** de la cola.`);
      }
      case "np": case "now": case "ahora":
        return reply(q?.current ? `🎶 Sonando: **${q.current.title}**${q.current.artist ? ` — ${q.current.artist}` : ""} (${music.fmt(q.current.sec)})` : "No hay nada sonando.");
      case "clear": case "limpiar":
        if (!q) return reply("La cola está vacía."); q.tracks.length = 0; return reply("🧹 Cola limpia.");
      case "help": case "ayuda": case "h":
        return reply(`**Comandos:** \`${PREFIX}p canción\` · \`${PREFIX}s\` saltar · \`${PREFIX}pause\` · \`${PREFIX}resume\` · \`${PREFIX}q\` cola · \`${PREFIX}ir 3\` va a la nº 3 · \`${PREFIX}quitar 3\` · \`${PREFIX}np\` · \`${PREFIX}clear\` · \`${PREFIX}stop\``);
    }
  } catch (e) {
    console.error("[prefix]", e);
    reply(`❌ ${String(e.message).slice(0, 150)}`);
  }
};
