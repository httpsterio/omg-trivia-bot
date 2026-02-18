// IRC trivia bot 

const startTime = Date.now();
const irc = require("irc-framework");
const { loadQuestions } = require("./questions");
const { initDatabase } = require("./scores");
const trivia = require("./trivia");
const bot = new irc.Client();

console.log("Loading config...");
trivia.loadConfig();
const config = trivia.getConfig();
console.log("Config loaded");
console.log("Connecting to:", config.irc.host + ":" + config.irc.port);

bot.connect({
  host: config.irc.host,
  port: config.irc.port,
  tls: config.irc.tls,
  nick: config.irc.nick,
  username: config.irc.username,
  gecos: config.irc.gecos,
  account: {
    account: config.irc.account,
    password: config.irc.password,
  },
});

bot.on("registered", () => {
  console.log("Connected and registered!");
  console.log("SASL authentication successful");
  console.log(" ");

  initDatabase();

  loadQuestions();

  console.log();

  // log how long it took to start the bot
  const startupTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Startup completed in ${startupTime}s`);
  console.log(
    "Admin commands: !start, !stop, !reload, !load, !unload, !easymode",
  );
  console.log("Press Ctrl+C to stop");
  console.log(" ");

  if (config.trivia?.channel) {
    bot.join(config.trivia.channel);
  }
});

bot.on("message", (event) => {
  console.log(`[${event.target}] <${event.nick}> ${event.message}`);

  // Table-driven command routing (ordering matters for overlapping prefixes)
  const commands = [
    ["!start", trivia.handleStart],
    ["!stop", trivia.handleStop],
    ["!skip", trivia.handleSkip],
    ["!reload", trivia.handleReload],
    ["!status", trivia.handleStatus],
    ["!adminhelp", trivia.handleAdminHelp],
    ["!help", trivia.handleHelp],
    ["!hint", trivia.handleHint],
    ["!easymode", trivia.handleEasyMode],
    ["!list", trivia.handleList],
    ["!load ", trivia.handleLoad],
    ["!unload ", trivia.handleUnload],
    ["!scores", trivia.handleScores],
    ["!score ", trivia.handleScore],
  ];

  for (const [prefix, handler] of commands) {
    if (event.message.startsWith(prefix)) {
      handler(event);
      return;
    }
  }

  // Ignore unknown commands
  if (event.message.startsWith("!")) {
    return;
  }

  // Ignore /me action messages
  if (event.type === "action") {
    return;
  }

  // Ignore messages from our own bot
  if (event.nick === config.irc.nick) {
    return;
  }

  // Handle potential answers
  trivia.handleAnswer(event);
});

bot.on("join", (event) => {
  if (event.nick === bot.user.nick) {
    console.log(`Joined channel: ${event.channel}`);

    if (config.trivia?.autostart) {
      const mockEvent = {
        nick: config.admins.nicks[0],
        reply: (msg) => bot.say(event.channel, msg),
      };
      trivia.handleStart(mockEvent);
    }
  }
});

bot.on("socket close", () => {
  console.log("→ Socket closed");
});

bot.on("socket error", (error) => {
  console.error("Socket error:", error);
});

bot.on("error", (error) => {
  console.error("IRC error:", error);
});

bot.on("close", () => {
  console.log("Connection closed");
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("\nDisconnecting...");
  bot.quit("Bot shutting down");
  setTimeout(() => process.exit(0), 1000);
});
