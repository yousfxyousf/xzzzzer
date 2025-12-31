module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`🚀 Bot is ready in ${client.guilds.cache.size} servers`);
    
    // Set bot status
    client.user.setPresence({
      activities: [{ name: 'Music & Voice', type: 2 }], // 2 = LISTENING
      status: 'online',
    });
  },
};