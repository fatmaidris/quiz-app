import Quiz from './quiz.js';
import Question from './question.js';
import { soundManager } from './sounds.js';

const quizOptionsForm = document.getElementById('quizOptions');
const playerNameInput = document.getElementById('playerName');
const categoryInput = document.getElementById('categoryMenu');
const categorySelect = document.getElementById('categorySelect');
const difficultyOptions = document.getElementById('difficultyOptions');
const difficultySelect = document.getElementById('difficultySelect');
const questionsNumber = document.getElementById('questionsNumber');
const startQuizBtn = document.getElementById('startQuiz');
const questionsContainer = document.querySelector('.questions-container');

let currentQuiz = null;
let currentQuestion = null;
let isStarting = false;

function showLoading() {
  questionsContainer.innerHTML = `
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading Questions...</p>
    </div>
  `;
}

function hideLoading() {
  const loadingOverlay = questionsContainer.querySelector('.loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.remove();
  }
}

function showError(message) {
  questionsContainer.innerHTML = `
    <div class="game-card error-card">
      <div class="error-icon">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <h3 class="error-title">Oops! Something went wrong</h3>
      <p class="error-message">${message}</p>
      <button class="btn-play retry-btn">
        <i class="fa-solid fa-rotate-right"></i> Try Again
      </button>
    </div>
  `;

  const retryBtn = questionsContainer.querySelector('.retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', resetToStart);
  }
}

function validateForm() {
  const rawValue = questionsNumber.value.trim();
  const num = parseInt(rawValue, 10);

  if (!rawValue || isNaN(num)) {
    return {
      isValid: false,
      error: 'Please enter the number of questions.',
    };
  }

  if (num < 1) {
    return {
      isValid: false,
      error: 'Minimum 1 question required.',
    };
  }

  if (num > 50) {
    return {
      isValid: false,
      error: 'Maximum 50 questions allowed.',
    };
  }

  return { isValid: true, error: null };
}

function showFormError(message) {
  const existingError = quizOptionsForm.querySelector('.form-error');
  if (existingError) {
    existingError.remove();
  }

  const errorDiv = document.createElement('div');
  errorDiv.className = 'form-error';
  errorDiv.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${message}`;

  startQuizBtn.before(errorDiv);

  setTimeout(() => {
    errorDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    errorDiv.style.opacity = '0';
    errorDiv.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      errorDiv.remove();
    }, 300);
  }, 3000);
}

function resetToStart() {
  if (currentQuestion) {
    currentQuestion.cleanup();
    currentQuestion = null;
  }

  questionsContainer.innerHTML = '';

  playerNameInput.value = '';
  questionsNumber.value = '10';
  categoryInput.value = '';
  difficultyOptions.value = 'easy';

  if (categorySelect) {
    const catText = categorySelect.querySelector('.custom-select-text');
    const catIcon = categorySelect.querySelector('.custom-select-icon');
    if (catText) catText.textContent = 'Random Category';
    if (catIcon) catIcon.innerHTML = '<i class="fa-solid fa-shuffle"></i>';
    categorySelect.dataset.value = '';
    categorySelect.querySelectorAll('.custom-select-option').forEach((opt) => {
      opt.classList.toggle('selected', opt.dataset.value === '');
    });
  }

  if (difficultySelect) {
    const diffText = difficultySelect.querySelector('.custom-select-text');
    const diffIcon = difficultySelect.querySelector('.custom-select-icon');
    if (diffText) diffText.textContent = 'Easy Mode';
    if (diffIcon) diffIcon.innerHTML = '<i class="fa-solid fa-face-smile"></i>';
    difficultySelect.dataset.value = 'easy';
    difficultySelect.querySelectorAll('.custom-select-option').forEach((opt) => {
      opt.classList.toggle('selected', opt.dataset.value === 'easy');
    });
  }

  const existingError = quizOptionsForm.querySelector('.form-error');
  if (existingError) {
    existingError.remove();
  }

  quizOptionsForm.classList.remove('hidden');
  currentQuiz = null;
}

async function startQuiz() {
  if (isStarting) return;

  const validation = validateForm();
  if (!validation.isValid) {
    showFormError(validation.error);
    return;
  }

  isStarting = true;
  startQuizBtn.disabled = true;

  soundManager.init();

  const playerName = playerNameInput.value.trim() || 'Player';
  const category = categoryInput.value;
  const difficulty = difficultyOptions.value || 'easy';
  const numberOfQuestions = parseInt(questionsNumber.value, 10);

  currentQuiz = new Quiz(category, difficulty, numberOfQuestions, playerName);

  quizOptionsForm.classList.add('hidden');
  showLoading();

  try {
    await currentQuiz.getQuestions();
    hideLoading();

    if (!currentQuiz.questions || currentQuiz.questions.length === 0) {
      throw new Error('No questions received from the API.');
    }

    currentQuestion = new Question(currentQuiz, questionsContainer, resetToStart);
    currentQuestion.displayQuestion();
  } catch (error) {
    hideLoading();
    showError(error.message || 'Failed to load questions. Please try again.');
  } finally {
    isStarting = false;
    startQuizBtn.disabled = false;
  }
}

startQuizBtn.addEventListener('click', startQuiz);

questionsNumber.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    startQuiz();
  }
});

playerNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    startQuiz();
  }
});

quizOptionsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  startQuiz();
});
