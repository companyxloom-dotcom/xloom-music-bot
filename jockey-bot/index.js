require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const fs = require('fs');
const path = require('path');

// ---- Mini servidor web: le da a Render algo a lo que hacer ping ----
// Esto es lo que evita que Render "duerma" el servicio gratis.
const app = express();
app.get('/', (req, res) => res.send('Xloom Music está viva 🎶'));
app.get('/healthz', (req, res) => res.status(200).send('ok'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Servidor web escuchando en el puerto ${PORT}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ---- DisTube: el motor de música (colas, YouTube, Spotify, SoundCloud) ----
client.distube = new DisTube(client, {
  emitNewSongOnly: true,
  emitAddSongWhenCreatingQueue: false,
  emitAddListWhenCreatingQueue: false,
  plugins: [
    new SpotifyPlugin({ emitEventsAfterFetching: true }),
    new SoundCloudPlugin(),
  ],
});

// ---- Cargar comandos slash desde /commands ----
client.commands = new Collection();
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(path.join(__dirname, 'commands', file));
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`✅ Conectado como ${client.user.tag}`);
  client.user.setActivity('/play | música 🎶', { type: 2 }); // type 2 = Listening
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    const msg = { content: '❌ Hubo un error ejecutando ese comando.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg);
    } else {
      await interaction.reply(msg);
    }
  }
});

// ---- Eventos de DisTube: mandan mensajes al canal donde se pidió la canción ----
client.distube
  .on('playSong', (queue, song) => {
    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🎶 Reproduciendo ahora')
      .setDescription(`**[${song.name}](${song.url})**`)
      .addFields(
        { name: 'Duración', value: song.formattedDuration, inline: true },
        { name: 'Pedida por', value: `${song.user}`, inline: true },
      )
      .setThumbnail(song.thumbnail);
    queue.textChannel?.send({ embeds: [embed] });
  })
  .on('addSong', (queue, song) => {
    queue.textChannel?.send(`➕ **${song.name}** agregada a la cola.`);
  })
  .on('addList', (queue, playlist) => {
    queue.textChannel?.send(`➕ Playlist **${playlist.name}** agregada (${playlist.songs.length} canciones).`);
  })
  .on('error', (channel, e) => {
    console.error(e);
    channel?.send?.(`❌ Error: ${e?.message?.slice(0, 1900) || e}`);
  })
  .on('empty', (channel) => {
    channel.send('👋 Canal de voz vacío, me salgo.');
  })
  .on('finish', (queue) => {
    queue.textChannel?.send('✅ Cola terminada.');
  })
  .on('disconnect', (queue) => {
    queue.textChannel?.send('🔌 Desconectado del canal de voz.');
  });

client.login(process.env.DISCORD_TOKEN);
