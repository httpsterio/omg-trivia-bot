require('dotenv').config();
const irc = require('irc-framework');
const { loadQuestions } = require('./questions');
const trivia = require('./trivia');

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

  // Load config and questions (but don't start trivia yet)
  trivia.loadConfig();
  loadQuestions();

  console.log('✓ Bot is now running and listening for messages...');
  console.log('  Admin commands: !start, !stop, !reload, !status');
  console.log('  Press Ctrl+C to stop');

  // Join trivia channel from config
  const config = trivia.getConfig();
  if (config.trivia?.channel) {
    bot.join(config.trivia.channel);
  }
});

bot.on('message', (event) => {
  console.log(`[${event.target}] <${event.nick}> ${event.message}`);

  // Admin commands
  if (event.message === '!start') {
    if (!trivia.isAdmin(event.nick)) {
      event.reply('Sorry, only admins can start trivia.');
      return;
    }

    const result = trivia.start();
    if (result.success) {
      event.reply(`Trivia started!`);
      event.reply(`Question: ${result.question}`)
    } else {
      event.reply(result.message);
    }
    return;
  }

  if (event.message === '!stop') {
    if (!trivia.isAdmin(event.nick)) {
      event.reply('Sorry, only admins can stop trivia.');
      return;
    }

    const result = trivia.stop();
    event.reply(result.message);
    return;
  }

  if (event.message === '!reload') {
    if (!trivia.isAdmin(event.nick)) {
      event.reply('Sorry, only admins can reload questions.');
      return;
    }

    const result = trivia.reload();
    event.reply(result.message);
    return;
  }

  if (event.message === '!status') {
    const status = trivia.getStatus();
    if (status.isRunning) {
      event.reply(`Trivia is running. Wrong attempts: ${status.wrongAttempts}/10. Total questions: ${status.totalQuestions}`);
    } else {
      event.reply(`Trivia is not running. Total questions loaded: ${status.totalQuestions}`);
    }
    return;
  }

  // Check if message is an answer attempt
  const answerResult = trivia.checkAnswer(event.nick, event.message);

  if (answerResult) {
    if (answerResult.correct) {
      event.reply(`✓ Correct, ${event.nick}! The answer was: ${answerResult.answer}`);
      event.reply(`Question: ${answerResult.nextQuestion}`);
    } else if (answerResult.skipped) {
      event.reply(`✗ Too many wrong attempts (${answerResult.attempts})! The answer was: ${answerResult.correctAnswer}`);
      event.reply(`Question: ${answerResult.nextQuestion}`);
    } else {
      // Wrong answer but not skipped yet
      event.reply(`✗ Wrong, ${event.nick}! The answer isn't ${event.message}. (${answerResult.attempts}/${answerResult.attempts + answerResult.remaining})`);
      console.log(`  ✗ Wrong answer (${answerResult.attempts}/${answerResult.attempts + answerResult.remaining})`);
    }
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