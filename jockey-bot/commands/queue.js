const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xcola')
    .setDescription('Muestra la cola de canciones'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ No hay nada en la cola.', ephemeral: true });

    const list = queue.songs
      .slice(0, 15)
      .map((song, i) => `${i === 0 ? '🎶' : `${i}.`} **${song.name}** — \`${song.formattedDuration}\``)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('📜 Cola de reproducción')
      .setDescription(list)
      .setFooter({ text: `${queue.songs.length} canción(es) en total` });

    await interaction.reply({ embeds: [embed] });
  },
};
