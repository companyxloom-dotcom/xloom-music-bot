const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xsaltar')
    .setDescription('Salta a la siguiente canción'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ No hay nada sonando.', ephemeral: true });

    const currentSong = queue.songs[0]?.name;
    try {
      await queue.skip();
      await interaction.reply(`⏭️ Saltada: **${currentSong}**`);
    } catch (e) {
      await interaction.reply('⏭️ Era la última canción, se detuvo la cola.');
    }
  },
};
