const { loadQuestions, getNextQuestion, getQuestionCount } = require('./questions');
const fs = require('fs');
const toml = require('@iarna/toml');

let config = {};
let isRunning = false;
let currentQuestion = null;
let wrongAttempts = 0;

function loadConfig() {
  try {
    const content = fs.readFileSync('./config.toml', 'utf8');
    config = toml.parse(content);
    console.log('✓ Config loaded');
    return true;
  } catch (error) {
    console.error('Error loading config:', error);
    return false;
  }
}

function isAdmin(nick) {
  return config.admins?.nicks?.includes(nick) || false;
}

function start() {
  if (isRunning) {
    return { success: false, message: 'Trivia is already running!' };
  }

  if (getQuestionCount() === 0) {
    return { success: false, message: 'No questions loaded! Add question files first.' };
  }

  isRunning = true;
  wrongAttempts = 0;

  return askNextQuestion();
}

function stop() {
  if (!isRunning) {
    return { success: false, message: 'Trivia is not running.' };
  }

  isRunning = false;
  currentQuestion = null;
  wrongAttempts = 0;

  return { success: true, message: 'Trivia stopped!' };
}

function askNextQuestion() {
  currentQuestion = getNextQuestion();
  wrongAttempts = 0;

  if (!currentQuestion) {
    return { success: false, message: 'No questions available!' };
  }

  return {
    success: true,
    question: currentQuestion.question,
    meta: `[${currentQuestion.topic}/${currentQuestion.difficulty}]`
  };
}

function checkAnswer(nick, message) {
  if (!isRunning || !currentQuestion) {
    return null;
  }

  const userAnswer = message.toLowerCase().trim();
  const correctAnswers = currentQuestion.answer.map(a => a.toLowerCase().trim());

  if (correctAnswers.includes(userAnswer)) {
    // Correct answer!
    const result = {
      correct: true,
      nick: nick,
      answer: currentQuestion.answer[0] // Show the primary answer
    };

    // Ask next question
    const nextQ = askNextQuestion();
    result.nextQuestion = nextQ.question;
    result.nextMeta = nextQ.meta;

    return result;
  } else {
    // Wrong answer
    wrongAttempts++;

    if (wrongAttempts >= config.trivia?.max_wrong_attempts) {
      // Too many wrong attempts - skip
      const result = {
        correct: false,
        skipped: true,
        correctAnswer: currentQuestion.answer[0],
        attempts: wrongAttempts
      };

      // Ask next question
      const nextQ = askNextQuestion();
      result.nextQuestion = nextQ.question;
      result.nextMeta = nextQ.meta;

      return result;
    }

    return {
      correct: false,
      skipped: false,
      attempts: wrongAttempts,
      remaining: config.trivia.max_wrong_attempts - wrongAttempts
    };
  }
}

function reload() {
  const success = loadQuestions();
  return {
    success,
    message: success ? `Reloaded ${getQuestionCount()} questions` : 'Failed to reload questions'
  };
}

function getStatus() {
  return {
    isRunning,
    currentQuestion: currentQuestion ? currentQuestion.question : null,
    wrongAttempts,
    totalQuestions: getQuestionCount()
  };
}

function getConfig() {
  return config;
}

module.exports = {
  loadConfig,
  isAdmin,
  start,
  stop,
  checkAnswer,
  reload,
  getStatus,
  getConfig
};