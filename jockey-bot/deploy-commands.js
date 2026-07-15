require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(path.join(__dirname, 'commands', file));
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🔄 Registrando ${commands.length} comandos...`);

    if (process.env.GUILD_ID) {
      // Registro en UN servidor: aparecen al instante (ideal para pruebas)
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands },
      );
      console.log('✅ Comandos registrados en el servidor (instantáneo).');
    } else {
      // Registro global: tarda hasta 1 hora en aparecer
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
      console.log('✅ Comandos registrados globalmente (puede tardar ~1 hora).');
    }
  } catch (error) {
    console.error(error);
  }
})();
