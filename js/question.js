import { soundManager } from './sounds.js';

export default class Question {
  constructor(quiz, container, onQuizEnd) {
    this.quiz = quiz;
    this.container = container;
    this.onQuizEnd = onQuizEnd;

    this.questionData = quiz.getCurrentQuestion();
    this.index = quiz.currentQuestionIndex;

    this.question = this.decodeHtml(this.questionData.question);
    this.correctAnswer = this.decodeHtml(this.questionData.correct_answer);
    this.category = this.decodeHtml(this.questionData.category);
    this.wrongAnswers = (this.questionData.incorrect_answers || []).map((ans) =>
      this.decodeHtml(ans)
    );

    this.allAnswers = this.shuffleAnswers();
    this.answered = false;
    this.timerInterval = null;
    this.timeRemaining = 15;
    this.keyboardHandler = null;
    this.transitionTimeout = null;
    this.exitTimeout = null;
  }

  decodeHtml(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.documentElement.textContent || '';
  }

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  escapeAttr(str) {
    return this.escapeHtml(str);
  }

  shuffleAnswers() {
    const combined = [...this.wrongAnswers, this.correctAnswer];
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }
    return combined;
  }

  getProgress() {
    if (this.quiz.numberOfQuestions <= 0) return 0;
    return Math.round(((this.index + 1) / this.quiz.numberOfQuestions) * 100);
  }

  getDifficultyIcon() {
    const icons = {
      easy: 'fa-face-smile',
      medium: 'fa-face-meh',
      hard: 'fa-skull',
    };
    return icons[this.quiz.difficulty] || 'fa-gauge-high';
  }

  displayQuestion() {
    const questionHtml = `
      <div class="game-card question-card">
        <div class="xp-bar-container">
          <div class="xp-bar-header">
            <span class="xp-label"><i class="fa-solid fa-bolt"></i> Progress</span>
            <span class="xp-value">Question ${this.index + 1}/${this.quiz.numberOfQuestions}</span>
          </div>
          <div class="xp-bar">
            <div class="xp-bar-fill" style="width: ${this.getProgress()}%"></div>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-badge category">
            <i class="fa-solid fa-bookmark"></i>
            <span>${this.escapeHtml(this.category)}</span>
          </div>
          <div class="stat-badge difficulty ${this.quiz.difficulty}">
            <i class="fa-solid ${this.getDifficultyIcon()}"></i>
            <span>${this.quiz.difficulty}</span>
          </div>
          <div class="stat-badge timer">
            <i class="fa-solid fa-stopwatch"></i>
            <span class="timer-value">${this.timeRemaining}</span>s
          </div>
          <div class="stat-badge counter">
            <i class="fa-solid fa-gamepad"></i>
            <span>${this.index + 1}/${this.quiz.numberOfQuestions}</span>
          </div>
        </div>

        <h2 class="question-text">${this.escapeHtml(this.question)}</h2>

        <div class="answers-grid">
          ${this.allAnswers
            .map(
              (choice, i) => `
            <button class="answer-btn" data-index="${i}" data-answer="${this.escapeAttr(choice)}">
              <span class="answer-key">${i + 1}</span>
              <span class="answer-text">${this.escapeHtml(choice)}</span>
            </button>
          `
            )
            .join('')}
        </div>

        <p class="keyboard-hint">
          <i class="fa-regular fa-keyboard"></i> Press 1-${this.allAnswers.length} to select
        </p>

        <div class="score-panel">
          <div class="score-item">
            <div class="score-item-label">Score</div>
            <div class="score-item-value">${this.quiz.score}</div>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = questionHtml;
    this.addEventListeners();
    this.startTimer();
  }

  addEventListeners() {
    const answerButtons = this.container.querySelectorAll('.answer-btn');

    answerButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.checkAnswer(btn);
      });

      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.checkAnswer(btn);
        }
      });
    });

    this.keyboardHandler = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) {
        return;
      }

      if (this.answered) return;

      if (['1', '2', '3', '4'].includes(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        const currentButtons = this.container.querySelectorAll('.answer-btn');
        if (index >= 0 && index < currentButtons.length) {
          this.checkAnswer(currentButtons[index]);
        }
      }
    };

    document.addEventListener('keydown', this.keyboardHandler);
  }

  removeEventListeners() {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }

  startTimer() {
    const timerValue = this.container.querySelector('.timer-value');
    const timerBadge = this.container.querySelector('.stat-badge.timer');

    this.stopTimer();

    this.timerInterval = setInterval(() => {
      this.timeRemaining -= 1;

      if (timerValue) {
        timerValue.textContent = this.timeRemaining;
      }

      if (this.timeRemaining <= 5 && this.timeRemaining > 0) {
        timerBadge?.classList.add('warning');
        soundManager.playWarning();
      }

      if (this.timeRemaining <= 0) {
        this.stopTimer();
        if (!this.answered) {
          this.handleTimeUp();
        }
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleTimeUp() {
    if (this.answered) return;
    this.answered = true;

    this.stopTimer();
    this.removeEventListeners();

    soundManager.playTimeUp();

    const questionCard = this.container.querySelector('.question-card');
    if (questionCard) {
      const scorePanel = questionCard.querySelector('.score-panel');
      const timeUpDiv = document.createElement('div');
      timeUpDiv.className = 'time-up-message';
      timeUpDiv.innerHTML = '<i class="fa-solid fa-clock"></i> TIME\'S UP!';
      if (scorePanel) {
        scorePanel.before(timeUpDiv);
      } else {
        questionCard.appendChild(timeUpDiv);
      }
    }

    const allButtons = this.container.querySelectorAll('.answer-btn');
    allButtons.forEach((btn) => {
      const answerVal = btn.dataset.answer || '';
      if (answerVal.trim().toLowerCase() === this.correctAnswer.trim().toLowerCase()) {
        btn.classList.add('correct');
      } else {
        btn.classList.add('disabled');
      }
    });

    this.animateQuestion(400);
  }

  checkAnswer(choiceElement) {
    if (this.answered) return;
    this.answered = true;

    this.stopTimer();
    this.removeEventListeners();

    const selectedAnswer = choiceElement.dataset.answer || '';
    const isCorrect =
      selectedAnswer.trim().toLowerCase() === this.correctAnswer.trim().toLowerCase();

    const allButtons = this.container.querySelectorAll('.answer-btn');
    allButtons.forEach((btn) => {
      if (btn !== choiceElement) {
        btn.classList.add('disabled');
      }
    });

    if (isCorrect) {
      choiceElement.classList.add('correct');
      this.quiz.incrementScore();
      soundManager.playCorrect();

      const scoreValueDisplay = this.container.querySelector('.score-item-value');
      if (scoreValueDisplay) {
        scoreValueDisplay.textContent = this.quiz.score;
      }
    } else {
      choiceElement.classList.add('wrong');
      this.highlightCorrectAnswer();
      soundManager.playWrong();
    }

    this.animateQuestion(400);
  }

  highlightCorrectAnswer() {
    const allButtons = this.container.querySelectorAll('.answer-btn');
    allButtons.forEach((btn) => {
      const answerVal = btn.dataset.answer || '';
      if (answerVal.trim().toLowerCase() === this.correctAnswer.trim().toLowerCase()) {
        btn.classList.add('correct-reveal');
        btn.classList.remove('disabled');
      }
    });
  }

  getNextQuestion() {
    if (this.quiz.nextQuestion()) {
      const nextQ = new Question(this.quiz, this.container, this.onQuizEnd);
      nextQ.displayQuestion();
    } else {
      this.container.innerHTML = this.quiz.endQuiz();

      const restartBtn = this.container.querySelector('.btn-restart');
      if (restartBtn) {
        restartBtn.addEventListener('click', () => {
          restartBtn.classList.add('loading');
          restartBtn.innerHTML = '<i class="fa-solid fa-spinner"></i> Loading...';
          setTimeout(() => {
            if (typeof this.onQuizEnd === 'function') {
              this.onQuizEnd();
            }
          }, 350);
        });
      }
    }
  }

  animateQuestion(duration = 400) {
    this.transitionTimeout = setTimeout(() => {
      const questionCard = this.container.querySelector('.question-card');
      if (questionCard) {
        questionCard.classList.add('exit');
      }

      this.exitTimeout = setTimeout(() => {
        this.getNextQuestion();
      }, duration);
    }, 1200);
  }

  cleanup() {
    this.stopTimer();
    this.removeEventListeners();
    if (this.transitionTimeout) clearTimeout(this.transitionTimeout);
    if (this.exitTimeout) clearTimeout(this.exitTimeout);
  }
}
