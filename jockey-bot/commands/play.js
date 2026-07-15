const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xreproducir')
    .setDescription('Reproduce una canción (YouTube, Spotify o SoundCloud)')
    .addStringOption(opt =>
      opt.setName('cancion')
        .setDescription('Nombre o link de la canción')
        .setRequired(true)),

  async execute(interaction) {
    const query = interaction.options.getString('cancion');
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({ content: '❌ Tienes que estar en un canal de voz primero.', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      await interaction.client.distube.play(voiceChannel, query, {
        member: interaction.member,
        textChannel: interaction.channel,
      });
      await interaction.editReply(`🔎 Buscando: **${query}**...`);
    } catch (err) {
      console.error(err);
      await interaction.editReply('❌ No pude reproducir eso, intenta con otro nombre o link.');
    }
  },
};
