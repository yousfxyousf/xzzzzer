const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection, createVoiceConnection, audioPlayers } = require('../bot');
const { createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Music commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('play')
        .setDescription('Play a song from YouTube')
        .addStringOption(option =>
          option
            .setName('query')
            .setDescription('Song name or YouTube URL')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stop')
        .setDescription('Stop playing music')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('pause')
        .setDescription('Pause the music')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('resume')
        .setDescription('Resume the music')
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'play':
        await handlePlay(interaction);
        break;

      case 'stop':
        await handleStop(interaction);
        break;

      case 'pause':
        await handlePause(interaction);
        break;

      case 'resume':
        await handleResume(interaction);
        break;
    }
  },
};

async function handlePlay(interaction) {
  const member = interaction.member;
  const query = interaction.options.getString('query');
  
  if (!member.voice.channel) {
    return interaction.editReply('You need to be in a voice channel first!');
  }

  try {
    // Join voice channel if not already connected
    let connection = getVoiceConnection(interaction.guildId);
    if (!connection) {
      connection = createVoiceConnection(member.voice.channel);
    }

    // Search for the video
    let videoUrl = query;
    if (!ytdl.validateURL(query)) {
      const searchResult = await ytSearch(query);
      if (!searchResult.videos.length) {
        return interaction.editReply('No results found!');
      }
      videoUrl = searchResult.videos[0].url;
    }

    // Get video info
    const videoInfo = await ytdl.getInfo(videoUrl);
    const stream = ytdl(videoUrl, { 
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25 
    });

    // Create audio resource
    const resource = createAudioResource(stream, {
      inlineVolume: true,
      inputType: 'webm/opus'
    });

    // Create or get audio player
    let player = audioPlayers.get(interaction.guildId);
    if (!player) {
      player = createAudioPlayer();
      audioPlayers.set(interaction.guildId, player);
    }

    connection.subscribe(player);
    player.play(resource);
    resource.volume.setVolume(0.5);

    await interaction.editReply(`Now playing: **${videoInfo.videoDetails.title}**`);

    // Handle player events
    player.on(AudioPlayerStatus.Idle, () => {
      console.log('Finished playing audio');
    });

    player.on('error', error => {
      console.error('Error playing audio:', error);
      interaction.channel.send('An error occurred while playing the audio.');
    });

  } catch (error) {
    console.error('Error playing music:', error);
    await interaction.editReply('Failed to play music!');
  }
}

async function handleStop(interaction) {
  const player = audioPlayers.get(interaction.guildId);
  
  if (!player) {
    return interaction.editReply('No music is playing!');
  }

  player.stop();
  await interaction.editReply('Stopped the music!');
}

async function handlePause(interaction) {
  const player = audioPlayers.get(interaction.guildId);
  
  if (!player || player.state.status !== AudioPlayerStatus.Playing) {
    return interaction.editReply('No music is playing!');
  }

  player.pause();
  await interaction.editReply('Paused the music!');
}

async function handleResume(interaction) {
  const player = audioPlayers.get(interaction.guildId);
  
  if (!player || player.state.status !== AudioPlayerStatus.Paused) {
    return interaction.editReply('Music is not paused!');
  }

  player.unpause();
  await interaction.editReply('Resumed the music!');
}