const startTime = Date.now();
const irc = require("irc-framework");
const { loadQuestions } = require("./questions");
const trivia = require("./trivia");
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
        password: config.irc.password,
    },
});

bot.on("registered", () => {
    console.log("Connected and registered!");
    console.log("SASL authentication successful");
    console.log(" ");

    // Load questions
    loadQuestions();

    console.log();
    const startupTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Startup completed in ${startupTime}s`);
    console.log("Admin commands: !start, !stop, !reload, !status");
    console.log("Press Ctrl+C to stop");
    console.log(" ");

    // Join trivia channel from config
    if (config.trivia?.channel) {
        bot.join(config.trivia.channel);
    }
});

bot.on("message", (event) => {
    console.log(`[${event.target}] <${event.nick}> ${event.message}`);

    // Route commands to trivia handlers
    if (event.message === "!start") {
        trivia.handleStart(event);
        return;
    }

    if (event.message === "!stop") {
        trivia.handleStop(event);
        return;
    }

    if (event.message === "!skip") {
        trivia.handleSkip(event);
        return;
    }

    if (event.message === "!reload") {
        trivia.handleReload(event);
        return;
    }

    if (event.message === "!status") {
        trivia.handleStatus(event);
        return;
    }

    if (event.message === "!help") {
        trivia.handleHelp(event);
        return;
    }

    // Ignore other commands
    if (event.message.startsWith("!")) {
        return;
    }

    // Handle potential answers
    trivia.handleAnswer(event);
});

bot.on("join", (event) => {
    if (event.nick === bot.user.nick) {
        console.log(`Joined channel: ${event.channel}`);
    }
});

bot.on("error", (error) => {
    console.error("Error:", error);
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
