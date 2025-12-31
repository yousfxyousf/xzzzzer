const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { getVoiceConnection, createVoiceConnection, audioPlayers } = require('../bot');
const { createAudioPlayer, createAudioResource, AudioPlayerStatus, joinVoiceChannel } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Voice channel commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('join')
        .setDescription('Join your voice channel')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('leave')
        .setDescription('Leave the voice channel')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('play')
        .setDescription('Play a sound file')
        .addStringOption(option =>
          option
            .setName('sound')
            .setDescription('Sound to play')
            .setRequired(true)
            .addChoices(
              { name: 'Welcome', value: 'welcome' },
              { name: 'Notification', value: 'notification' },
              { name: 'Alert', value: 'alert' }
            )
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'join':
        await handleJoin(interaction);
        break;

      case 'leave':
        await handleLeave(interaction);
        break;

      case 'play':
        await handlePlay(interaction);
        break;
    }
  },
};

async function handleJoin(interaction) {
  const member = interaction.member;
  
  if (!member.voice.channel) {
    return interaction.editReply('You need to be in a voice channel first!');
  }

  try {
    const connection = getVoiceConnection(interaction.guildId) || 
                      createVoiceConnection(member.voice.channel);
    
    // Create audio player if not exists
    if (!audioPlayers.has(interaction.guildId)) {
      const player = createAudioPlayer();
      audioPlayers.set(interaction.guildId, player);
      connection.subscribe(player);
    }

    await interaction.editReply(`Joined ${member.voice.channel.name}!`);
  } catch (error) {
    console.error('Error joining voice channel:', error);
    await interaction.editReply('Failed to join voice channel!');
  }
}

async function handleLeave(interaction) {
  const connection = getVoiceConnection(interaction.guildId);
  
  if (!connection) {
    return interaction.editReply("I'm not in a voice channel!");
  }

  connection.destroy();
  await interaction.editReply('Left the voice channel!');
}

async function handlePlay(interaction) {
  const soundName = interaction.options.getString('sound');
  const connection = getVoiceConnection(interaction.guildId);
  
  if (!connection) {
    return interaction.editReply("I'm not in a voice channel! Use `/voice join` first.");
  }

  try {
    // Map sound names to file paths
    const soundFiles = {
      welcome: 'sounds/welcome.mp3',
      notification: 'sounds/notification.mp3',
      alert: 'sounds/alert.mp3'
    };

    // For demo, we'll use a local sound file or play a test tone
    const resource = createAudioResource(
      path.join(__dirname, '../../assets/test.mp3'), // Create this file or modify
      { inlineVolume: true }
    );

    const player = audioPlayers.get(interaction.guildId) || createAudioPlayer();
    player.play(resource);
    connection.subscribe(player);

    // Set volume (optional)
    resource.volume.setVolume(0.5);

    player.on(AudioPlayerStatus.Playing, () => {
      console.log(`Playing ${soundName} in ${interaction.guild.name}`);
    });

    player.on(AudioPlayerStatus.Idle, () => {
      console.log(`Finished playing ${soundName}`);
    });

    player.on('error', error => {
      console.error('Error playing sound:', error);
    });

    await interaction.editReply(`Playing ${soundName} sound!`);
  } catch (error) {
    console.error('Error playing sound:', error);
    await interaction.editReply('Failed to play sound!');
  }
}