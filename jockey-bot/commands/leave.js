const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xsalir')
    .setDescription('Saca al bot del canal de voz'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ No estoy en ningún canal de voz.', ephemeral: true });

    queue.voice.leave();
    await interaction.reply('👋 Listo, me salí del canal.');
  },
};
