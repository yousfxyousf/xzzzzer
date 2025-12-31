const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus, entersState, AudioPlayerStatus } = require('@discordjs/voice');
const { token } = process.env;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Keep alive for Render.com (web service required)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Discord Voice Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

// Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Voice connection manager
const voiceConnections = new Map();
const audioPlayers = new Map();

function getVoiceConnection(guildId) {
  return voiceConnections.get(guildId);
}

function createVoiceConnection(channel) {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false,
  });

  // Handle connection events
  connection.on(VoiceConnectionStatus.Ready, () => {
    console.log(`Connected to voice channel in ${channel.guild.name}`);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch (error) {
      connection.destroy();
      voiceConnections.delete(channel.guild.id);
      audioPlayers.delete(channel.guild.id);
    }
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    voiceConnections.delete(channel.guild.id);
    audioPlayers.delete(channel.guild.id);
  });

  voiceConnections.set(channel.guild.id, connection);
  return connection;
}

// Export functions for commands
module.exports = {
  client,
  getVoiceConnection,
  createVoiceConnection,
  audioPlayers,
  voiceConnections,
};

// Login to Discord
client.login(process.env.DISCORD_TOKEN);