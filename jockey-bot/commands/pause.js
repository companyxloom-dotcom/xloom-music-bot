const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpausar')
    .setDescription('Pausa la canción actual'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ No hay nada sonando.', ephemeral: true });

    queue.pause();
    await interaction.reply('⏸️ Pausado.');
  },
};
