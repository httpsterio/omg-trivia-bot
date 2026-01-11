const irc = require('irc-framework');
const { loadQuestions } = require('./questions');
const { bold } = require('./format');
const trivia = require('./trivia');
const bot = new irc.Client();

// Load config first
trivia.loadConfig();
const config = trivia.getConfig();

bot.connect({
  host: config.irc.host,
  port: config.irc.port,
  tls: config.irc.tls,
  nick: config.irc.nick,
  username: config.irc.username,
  gecos: config.irc.gecos,
  account: {
    account: config.irc.account,
    password: config.irc.password
  }
});

bot.on('registered', () => {
  console.log('Connected and registered!');
  console.log('SASL authentication successful');
  console.log(' ');

  // Load questions (config already loaded)
  loadQuestions();

  console.log('Bot is now running and listening for messages...');
  console.log('Admin commands: !start, !stop, !reload, !status');
  console.log('Press Ctrl+C to stop');
  console.log(' ');

  // Join trivia channel from config
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
      event.reply(`Starting trivia!`);
      event.reply("⠀");
      event.reply(bold("Question: ") + result.question);
    } else {
      event.reply(result.message);
    }
    return;
  }

  if (event.message === '!stop') {
    if (!trivia.isAdmin(event.nick)) {
      event.reply("Sorry, only admins can stop trivia.");
      return;
    }

    const result = trivia.stop();
    event.reply(result.message);
    return;
  }

  if (event.message === '!reload') {
    if (!trivia.isAdmin(event.nick)) {
      event.reply("Sorry, only admins can reload questions.");
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

  // replying to !help with possible command options 
  if (event.message == '!help') {
    event.reply(`!start to start the trivia`);
    event.reply(`!stop to stop the trivia`);
    event.reply(`!skip to skip a question`);
    event.reply(`!reload to reload questions`);
    event.reply(`!stats to print high scores`);
    event.reply(`!status to print the current status`);
    event.reply("⠀");
    return;
  }


  // Check if message is an answer attempt
  // Ignore commands (messages starting with !)
  if (event.message.startsWith('!')) {
    return;
  }

  const answerResult = trivia.checkAnswer(event.nick, event.message);

  if (answerResult) {
    if (answerResult.correct) {
      event.reply(bold("Correct") + ", " + event.nick + "! The answer was: " + bold(answerResult.answer));
      event.reply("⠀");
      event.reply(bold("Question: ") + answerResult.nextQuestion);
    } else if (answerResult.skipped) {
      event.reply(bold("Too many wrong attempts!") + " The answer was: " + answerResult.correctAnswer);
      event.reply("⠀");
      event.reply(bold("Question: ") + answerResult.nextQuestion);
    } else {
      // Wrong answer but not skipped yet
      event.reply(bold("Wrong!") + " The answer isn't " + bold(event.message) + ". " + answerResult.remaining + " attempts remaining.");
      console.log(`Wrong answer (${answerResult.attempts}/${answerResult.attempts + answerResult.remaining})`);
    }
  }
});

bot.on('join', (event) => {
  if (event.nick === bot.user.nick) {
    console.log(`Joined channel: ${event.channel}`);
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