const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xreanudar')
    .setDescription('Reanuda la canción pausada'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ No hay nada sonando.', ephemeral: true });

    queue.resume();
    await interaction.reply('▶️ Reanudado.');
  },
};
