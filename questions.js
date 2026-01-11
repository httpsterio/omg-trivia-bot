const fs = require('fs');
const toml = require('@iarna/toml');

let allQuestions = [];
let questionPool = [];
let currentIndex = 0;

function loadQuestions() {
  allQuestions = [];

  try {
    const files = fs.readdirSync('./questions').filter(f => f.endsWith('.toml'));

    files.forEach(file => {
      const content = fs.readFileSync(`./questions/${file}`, 'utf8');
      const data = toml.parse(content);

      // Skip hidden question banks
      if (data.hidden === true) {
        return;
      }

      // Add metadata to each question
      if (data.questions) {
        data.questions.forEach(q => {
          allQuestions.push({
            ...q,
            bank: data.name,
            difficulty: data.difficulty,
            topic: data.topic
          });
        });
      }
    });

    // Shuffle for the first time
    questionPool = shuffleArray([...allQuestions]);
    currentIndex = 0;

    console.log(`Loaded ${allQuestions.length} questions from ${files.length} files`);
    return true;
  } catch (error) {
    console.error('Error loading questions:', error);
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

  // Reshuffle if we've gone through all questions
  if (currentIndex >= questionPool.length) {
    questionPool = shuffleArray([...allQuestions]);
    currentIndex = 0;
    console.log('✓ Reshuffled question pool');
  }

  return questionPool[currentIndex++];
}

function checkAnswer(userAnswer, correctAnswers) {
  const normalized = userAnswer.toLowerCase().trim();
  return correctAnswers.some(ans => ans.toLowerCase().trim() === normalized);
}

module.exports = {
  loadQuestions,
  getNextQuestion,
  checkAnswer,
  getQuestionCount: () => allQuestions.length
};