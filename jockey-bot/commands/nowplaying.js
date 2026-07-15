const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xsonando')
    .setDescription('Muestra la canción que está sonando'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ No hay nada sonando.', ephemeral: true });

    const song = queue.songs[0];
    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🎶 Sonando ahora')
      .setDescription(`**[${song.name}](${song.url})**`)
      .addFields(
        { name: 'Duración', value: song.formattedDuration, inline: true },
        { name: 'Volumen', value: `${queue.volume}%`, inline: true },
        { name: 'Repetir', value: ['Desactivado', 'Canción', 'Cola'][queue.repeatMode], inline: true },
      )
      .setThumbnail(song.thumbnail);

    await interaction.reply({ embeds: [embed] });
  },
};
