const {
  loadQuestions,
  getNextQuestion,
  getQuestionCount,
  getBankInfo,
  getBrokenBanks,
  setBankHidden,
} = require("./questions");
const {
  recordScore,
  getTopScoresRolling,
  getPlayerScoreRolling,
} = require("./scores");
const { bold, underline } = require("./format");
const fs = require("fs");
const toml = require("@iarna/toml");

let config = {};
let isRunning = false;
let currentQuestion = null;
let wrongAttempts = 0;
let easyMode = false;
let revealedIndices = new Set();

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

function getRevealOrder(answer) {
  const nonSpaceIndices = [];
  for (let i = 0; i < answer.length; i++) {
    if (answer[i] !== " ") nonSpaceIndices.push(i);
  }

  const order = [];
  let left = 0,
    right = nonSpaceIndices.length - 1;
  while (left <= right) {
    order.push(nonSpaceIndices[left]);
    if (left !== right) order.push(nonSpaceIndices[right]);
    left++;
    right--;
  }
  return order;
}

function buildEasyModeHint(answer, revealed) {
  let hint = "";
  for (let i = 0; i < answer.length; i++) {
    if (answer[i] === " ") {
      hint += " ";
    } else if (revealed.has(i)) {
      hint += answer[i];
    } else {
      hint += "_";
    }
  }
  return hint;
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
  easyMode = false;
  revealedIndices = new Set();
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
  easyMode = false;
  revealedIndices = new Set();
  event.reply("Trivia stopped!");
}

function handleSkip(event) {
  if (!isRunning || !currentQuestion) {
    event.reply("Trivia is not running.");
    return;
  }

  event.reply(
    bold("Skipped! ") + "The answer was: " + bold(currentQuestion.answer[0]),
  );
  currentQuestion = getNextQuestion();
  wrongAttempts = 0;
  revealedIndices = new Set();

  event.reply("\u2800");
  event.reply(bold("Question: ") + currentQuestion.question);
}

function handleReload(event) {
  if (!isAdmin(event.nick)) {
    event.reply("Sorry, only admins can reload.");
    return;
  }

  const configSuccess = loadConfig();
  const questionsSuccess = loadQuestions();

  if (configSuccess && questionsSuccess) {
    event.reply(`Reloaded config and ${getQuestionCount()} questions`);
  } else if (questionsSuccess) {
    event.reply(`Reloaded ${getQuestionCount()} questions (config failed)`);
  } else if (configSuccess) {
    event.reply("Reloaded config (questions failed)");
  } else {
    event.reply("Failed to reload config and questions");
  }
}

function handleStatus(event) {
  if (isRunning) {
    event.reply(
      `Trivia is running. Wrong attempts: ${wrongAttempts}/${config.trivia.max_wrong_attempts}. Total questions: ${getQuestionCount()}`,
    );
  } else {
    event.reply(
      `Trivia is not running. Total questions loaded: ${getQuestionCount()}`,
    );
  }
}

function handleHelp(event) {
  event.reply("Use /me to chat");
  event.reply("!scores <total|month|week|day> to get the top scorers");
  event.reply("!score <username> to get scores for that user");
  event.reply("!hint to show parts of the answer");
  event.reply("!skip to skip a question");
  event.reply("!list to list all question banks");
  event.reply("!status to check trivia status");
  event.reply("!helpadmin to show admin commands");
}

function handleHelpAdmin(event) {
  event.reply("!start to start the trivia");
  event.reply("!stop to stop the trivia");
  event.reply("!reload to reload config and questions");
  event.reply("!load <id> to load a question bank");
  event.reply("!unload <id> to unload a question bank");
  event.reply("!easymode to toggle easy mode (auto-hints)");
}

// !hint reveals parts of the answer. If  answer length is >3, show first and last. else show the first letter.
function handleHint(event) {
  if (!isRunning || !currentQuestion) {
    event.reply("Trivia is not running.");
    return;
  }

  if (easyMode) {
    event.reply("Hints are automatic in easy mode!");
    return;
  }

  const answer = currentQuestion.answer[0];
  let hint = "";

  for (let i = 0; i < answer.length; i++) {
    const char = answer[i];
    if (char === " ") {
      hint += " ";
    } else if (i === 0) {
      hint += char;
    } else if (i === answer.length - 1 && answer.length > 3) {
      hint += char;
    } else {
      hint += "_";
    }
  }

  event.reply(bold("Hint: ") + hint);
}

function handleEasyMode(event) {
  if (!isAdmin(event.nick)) {
    event.reply("Sorry, only admins can toggle easy mode.");
    return;
  }

  if (!isRunning) {
    event.reply("Trivia is not running.");
    return;
  }

  easyMode = !easyMode;

  // Reset and get new question
  revealedIndices = new Set();
  wrongAttempts = 0;
  currentQuestion = getNextQuestion();

  if (easyMode) {
    event.reply(
      bold("Easy mode ON!") + " Letters will be revealed after wrong answers.",
    );
  } else {
    event.reply(bold("Easy mode OFF!") + " Back to normal trivia.");
  }

  event.reply("\u2800");
  event.reply(bold("Question: ") + currentQuestion.question);
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

    recordScore(event.nick);
    console.log(
      `${event.nick} answered correctly: ${currentQuestion.answer[0]}`,
    );

    // Get next question
    currentQuestion = getNextQuestion();
    wrongAttempts = 0;
    revealedIndices = new Set();

    event.reply("\u2800");
    event.reply(bold("Question: ") + currentQuestion.question);
  } else {
    // Wrong answer
    wrongAttempts++;

    if (wrongAttempts >= config.trivia.max_wrong_attempts) {
      // Too many wrong attempts - skip
      event.reply(
        bold("Too many wrong attempts!") +
          " The answer was: " +
          currentQuestion.answer[0],
      );
      console.log(`Question skipped after ${wrongAttempts} wrong attempts`);

      // Get next question
      currentQuestion = getNextQuestion();
      wrongAttempts = 0;
      revealedIndices = new Set();

      event.reply("\u2800");
      event.reply(bold("Question: ") + currentQuestion.question);
    } else {
      // Wrong but not skipped yet
      const remaining = config.trivia.max_wrong_attempts - wrongAttempts;

      if (easyMode) {
        // Calculate how many letters to reveal based on progress
        const answer = currentQuestion.answer[0];
        const revealOrder = getRevealOrder(answer);
        const totalLetters = revealOrder.length;
        const maxAttempts = config.trivia.max_wrong_attempts;
        const progress = wrongAttempts / (maxAttempts - 1);
        const maxRevealable = totalLetters - 1;
        const lettersToShow = Math.min(
          Math.ceil(Math.pow(progress, 0.7) * totalLetters),
          maxRevealable,
        );

        // Update revealed indices
        for (let i = 0; i < lettersToShow && i < revealOrder.length; i++) {
          revealedIndices.add(revealOrder[i]);
        }

        const hint = buildEasyModeHint(answer, revealedIndices);
        event.reply(
          bold("Wrong!") +
            " " +
            remaining +
            " attempts remaining. [" +
            hint +
            "]",
        );
      } else {
        event.reply(
          bold("Wrong!") +
            " The answer isn't " +
            bold(event.message) +
            ". " +
            remaining +
            " attempts remaining.",
        );
      }
      console.log(
        `Wrong answer (${wrongAttempts}/${config.trivia.max_wrong_attempts})`,
      );
    }
  }
}

function handleList(event) {
  const { loadedBanks, unloadedBanks } = getBankInfo();
  const brokenBanks = getBrokenBanks();

  event.reply(bold("Loaded banks:"));
  if (loadedBanks.length === 0) {
    event.reply("  (none)");
  } else {
    loadedBanks.forEach((bank) => {
      event.reply(`  [${bank.id}] ${bank.name}`);
    });
  }

  event.reply(bold("Unloaded banks:"));
  if (unloadedBanks.length === 0) {
    event.reply("  (none)");
  } else {
    unloadedBanks.forEach((bank) => {
      event.reply(`  [${bank.id}] ${bank.name}`);
    });
  }

  if (brokenBanks.length > 0) {
    event.reply(bold("Broken banks:"));
    brokenBanks.forEach((bank) => {
      event.reply(`  ${bank.file} (broken)`);
    });
  }
}

function handleLoad(event) {
  if (!isAdmin(event.nick)) {
    event.reply("Sorry, only admins can load banks.");
    return;
  }

  const parts = event.message.split(" ");
  if (parts.length < 2) {
    event.reply("Usage: !load <bank-id>");
    return;
  }

  const bankId = parts[1];
  const result = setBankHidden(bankId, false);

  if (result.success) {
    event.reply(
      `Loaded bank ${bankId}. Total questions: ${getQuestionCount()}`,
    );
  } else {
    event.reply(`Failed to load bank: ${result.error}`);
  }
}

function handleUnload(event) {
  if (!isAdmin(event.nick)) {
    event.reply("Sorry, only admins can unload banks.");
    return;
  }

  const parts = event.message.split(" ");
  if (parts.length < 2) {
    event.reply("Usage: !unload <bank-id>");
    return;
  }

  const bankId = parts[1];
  const result = setBankHidden(bankId, true);

  if (result.success) {
    event.reply(
      `Unloaded bank ${bankId}. Total questions: ${getQuestionCount()}`,
    );
  } else {
    event.reply(`Failed to unload bank: ${result.error}`);
  }
}

function handleScores(event) {
  const parts = event.message.split(" ");
  const timeframe = parts[1];

  const validTimeframes = ["total", "month", "week", "day"];
  if (!timeframe || !validTimeframes.includes(timeframe)) {
    event.reply("Usage: !scores <total|month|week|day>");
    return;
  }

  const limit = config.trivia.scores_top_count || 5;
  const scores = getTopScoresRolling(timeframe, limit);

  if (scores.length === 0) {
    event.reply(`No scores recorded for ${timeframe}.`);
    return;
  }

  const timeframeLabels = {
    total: "all time",
    month: "past 30 days",
    week: "past 7 days",
    day: "past 24 hours",
  };

  event.reply(bold(`Top ${scores.length} (${timeframeLabels[timeframe]}):`));
  scores.forEach((entry, index) => {
    event.reply(`  ${index + 1}. ${entry.nick}: ${entry.score}`);
  });
}

function handleScore(event) {
  const parts = event.message.split(" ");
  const username = parts[1];

  if (!username) {
    event.reply("Usage: !score <username>");
    return;
  }

  const scores = getPlayerScoreRolling(username);

  event.reply(bold(`Scores for ${username}:`));
  event.reply(`  All time: ${scores.total}`);
  event.reply(`  Past 30 days: ${scores.month}`);
  event.reply(`  Past 7 days: ${scores.week}`);
  event.reply(`  Past 24 hours: ${scores.day}`);
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
  handleHelpAdmin,
  handleHint,
  handleEasyMode,
  handleAnswer,
  handleList,
  handleLoad,
  handleUnload,
  handleScores,
  handleScore,
};
