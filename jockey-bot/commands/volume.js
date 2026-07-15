const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xvolumen')
    .setDescription('Cambia el volumen (0-100)')
    .addIntegerOption(opt =>
      opt.setName('nivel')
        .setDescription('Nivel de volumen')
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(true)),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ No hay nada sonando.', ephemeral: true });

    const nivel = interaction.options.getInteger('nivel');
    queue.setVolume(nivel);
    await interaction.reply(`🔊 Volumen ajustado a ${nivel}%.`);
  },
};
