const {
  loadQuestions,
  getNextQuestion,
  getQuestionCount,
} = require("./questions");
const { bold } = require("./format");
const fs = require("fs");
const toml = require("@iarna/toml");

let config = {};
let isRunning = false;
let currentQuestion = null;
let wrongAttempts = 0;

function loadConfig() {
  try {
    const content = fs.readFileSync("./config.toml", "utf8");
    config = toml.parse(content);
    console.log("Trivia config loaded");
    return true;
  } catch (error) {
    console.error("Trivia config loading error:", error);
    return false;
  }
}

function isAdmin(nick) {
  return config.admins?.nicks?.includes(nick) || false;
}

function getConfig() {
  return config;
}

function handleStart(event) {
  if (!isAdmin(event.nick)) {
    event.reply("Sorry, only admins can start trivia.");
    return;
  }

  if (isRunning) {
    event.reply("Trivia is already running!");
    return;
  }

  if (getQuestionCount() === 0) {
    event.reply("No questions loaded! Add question files first.");
    return;
  }

  isRunning = true;
  wrongAttempts = 0;
  currentQuestion = getNextQuestion();

  if (!currentQuestion) {
    event.reply("No questions available!");
    isRunning = false;
    return;
  }

  event.reply("Starting trivia!");
  event.reply("⠀");
  event.reply(bold("Question: ") + currentQuestion.question);
}

function handleStop(event) {
  if (!isAdmin(event.nick)) {
    event.reply("Sorry, only admins can stop trivia.");
    return;
  }

  if (!isRunning) {
    event.reply("Trivia is not running.");
    return;
  }

  isRunning = false;
  currentQuestion = null;
  wrongAttempts = 0;
  event.reply("Trivia stopped!");
}

function handleSkip(event) {
  event.reply(
    bold("Skipped! ") + "The answer was: " + bold(currentQuestion.answer[0]),
  );
  currentQuestion = getNextQuestion();
  wrongAttempts = 0;

  event.reply("⠀");
  event.reply(bold("Question: ") + currentQuestion.question);
}

function handleReload(event) {
  if (!isAdmin(event.nick)) {
    event.reply("Sorry, only admins can reload questions.");
    return;
  }

  const success = loadQuestions();
  if (success) {
    event.reply(`Reloaded ${getQuestionCount()} questions`);
  } else {
    event.reply("Failed to reload questions");
  }
}

function handleStatus(event) {
  if (isRunning) {
    event.reply(
      `Trivia is running. Wrong attempts: ${wrongAttempts}/${config.trivia?.max_wrong_attempts || 10}. Total questions: ${getQuestionCount()}`,
    );
  } else {
    event.reply(
      `Trivia is not running. Total questions loaded: ${getQuestionCount()}`,
    );
  }
}

function handleHelp(event) {
  event.reply("!start to start the trivia");
  event.reply("!stop to stop the trivia");
  event.reply("!skip to skip a question");
  event.reply("!reload to reload questions");
  event.reply("!stats to print high scores");
  event.reply("!status to print the current status");
  event.reply("⠀");
}

function handleAnswer(event) {
  if (!isRunning || !currentQuestion) {
    return;
  }

  const userAnswer = event.message.toLowerCase().trim();
  const correctAnswers = currentQuestion.answer.map((a) =>
    a.toLowerCase().trim(),
  );

  if (correctAnswers.includes(userAnswer)) {
    // Correct answer!
    event.reply(
      bold("Correct") +
        ", " +
        event.nick +
        "! The answer was: " +
        bold(currentQuestion.answer[0]),
    );
    console.log(
      `${event.nick} answered correctly: ${currentQuestion.answer[0]}`,
    );

    // Get next question
    currentQuestion = getNextQuestion();
    wrongAttempts = 0;

    event.reply("⠀");
    event.reply(bold("Question: ") + currentQuestion.question);
  } else {
    // Wrong answer
    wrongAttempts++;

    if (wrongAttempts >= config.trivia?.max_wrong_attempts) {
      // Too many wrong attempts - skip
      event.reply(
        bold("Too many wrong attempts!") +
          " The answer was: " +
          currentQuestion.answer[0],
      );
      console.log(`✗ Question skipped after ${wrongAttempts} wrong attempts`);

      // Get next question
      currentQuestion = getNextQuestion();
      wrongAttempts = 0;

      event.reply("⠀");
      event.reply(bold("Question: ") + currentQuestion.question);
    } else {
      // Wrong but not skipped yet
      const remaining = config.trivia.max_wrong_attempts - wrongAttempts;
      event.reply(
        bold("Wrong!") +
          " The answer isn't " +
          bold(event.message) +
          ". " +
          remaining +
          " attempts remaining.",
      );
      console.log(
        `✗ Wrong answer (${wrongAttempts}/${config.trivia.max_wrong_attempts})`,
      );
    }
  }
}

module.exports = {
  loadConfig,
  getConfig,
  handleStart,
  handleStop,
  handleSkip,
  handleReload,
  handleStatus,
  handleHelp,
  handleAnswer,
};
