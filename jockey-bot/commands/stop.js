const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xdetener')
    .setDescription('Detiene la música y vacía la cola'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ No hay nada sonando.', ephemeral: true });

    queue.stop();
    await interaction.reply('⏹️ Música detenida y cola vaciada.');
  },
};
