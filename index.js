require('dotenv').config();
const irc = require('irc-framework');

const bot = new irc.Client();

bot.connect({
  host: process.env.IRC_HOST,
  port: parseInt(process.env.IRC_PORT) || 6697,
  tls: process.env.IRC_TLS === 'true',
  nick: process.env.IRC_NICK,
  username: process.env.IRC_USERNAME || process.env.IRC_NICK,
  gecos: process.env.IRC_GECOS || 'Trivia Bot',
  account: {
    account: process.env.IRC_ACCOUNT || process.env.IRC_NICK,
    password: process.env.IRC_PASSWORD
  }
});

bot.on('registered', () => {
  console.log('✓ Connected and registered!');
  console.log('✓ SASL authentication successful');
  console.log('✓ Bot is now running and listening for messages...');
  console.log('  Commands: !ping, !echo <text>');
  console.log('  Press Ctrl+C to stop');

  // Join channels from environment variable
  const channels = process.env.IRC_CHANNELS?.split(',').map(ch => ch.trim()) || [];
  channels.forEach(channel => {
    bot.join(channel);
  });
});

bot.on('message', (event) => {
  console.log(`[${event.target}] <${event.nick}> ${event.message}`);

  // echo command
  if (event.message.startsWith('!echo ')) {
    const text = event.message.slice(6);
    event.reply(text);
    console.log(`  → Replied with: ${text}`);
  }

  // ping command
  if (event.message === '!ping') {
    event.reply('Pong!');
    console.log('  → Replied: Pong!');
  }
});

bot.on('join', (event) => {
  if (event.nick === bot.user.nick) {
    console.log(`✓ Joined channel: ${event.channel}`);
  }
});

bot.on('error', (error) => {
  console.error('Error:', error);
});

bot.on('close', () => {
  console.log('Connection closed');
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nDisconnecting...');
  bot.quit('Bot shutting down');
  setTimeout(() => process.exit(0), 1000);
});