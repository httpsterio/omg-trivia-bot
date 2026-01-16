const fs = require("fs");
const toml = require("@iarna/toml");

let allQuestions = [];
let questionPool = [];
let currentIndex = 0;
let loadedBanks = [];
let unloadedBanks = [];
let bankFiles = {}; // maps bank id to filename

function loadQuestions() {
  allQuestions = [];
  loadedBanks = [];
  unloadedBanks = [];
  bankFiles = {};

  try {
    const files = fs
      .readdirSync("./questions")
      .filter((f) => f.endsWith(".toml"));

    files.forEach((file) => {
      const content = fs.readFileSync(`./questions/${file}`, "utf8");
      const data = toml.parse(content);

      // Store the filename for this bank
      bankFiles[data.id] = file;

      // Track loaded/unloaded banks
      if (data.hidden === true) {
        unloadedBanks.push({ id: data.id, name: data.name });
        return;
      }

      loadedBanks.push({ id: data.id, name: data.name });

      // Add metadata to each question
      if (data.questions) {
        data.questions.forEach((q) => {
          allQuestions.push({
            ...q,
            bank: data.name,
            difficulty: data.difficulty,
            topic: data.topic,
          });
        });
      }
    });

    // Shuffle for the first time
    questionPool = shuffleArray([...allQuestions]);
    currentIndex = 0;

    console.log(
      `Loaded ${allQuestions.length} questions from ${files.length} files`,
    );
    return true;
  } catch (error) {
    console.error("Error loading questions:", error);
    return false;
  }
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getNextQuestion() {
  if (allQuestions.length === 0) {
    return null;
  }

  // Reshuffle if pool is empty or we've gone through all questions
  if (questionPool.length === 0 || currentIndex >= questionPool.length) {
    questionPool = shuffleArray([...allQuestions]);
    currentIndex = 0;
    console.log("Reshuffled question pool");
  }

  return questionPool[currentIndex++];
}

function checkAnswer(userAnswer, correctAnswers) {
  const normalized = userAnswer.toLowerCase().trim();
  return correctAnswers.some((ans) => ans.toLowerCase().trim() === normalized);
}

function getBankInfo() {
  return { loadedBanks, unloadedBanks };
}

function setBankHidden(bankId, hidden) {
  const filename = bankFiles[bankId];
  if (!filename) {
    return { success: false, error: "Bank not found" };
  }

  try {
    const filepath = `./questions/${filename}`;
    const content = fs.readFileSync(filepath, "utf8");
    const data = toml.parse(content);

    data.hidden = hidden;

    fs.writeFileSync(filepath, toml.stringify(data));
    loadQuestions();

    return { success: true };
  } catch (error) {
    console.error("Error updating bank:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  loadQuestions,
  getNextQuestion,
  checkAnswer,
  getQuestionCount: () => allQuestions.length,
  getBankInfo,
  setBankHidden,
};
