import { soundManager } from './sounds.js';

export default class Quiz {
  constructor(category, difficulty, numberOfQuestions, playerName = 'Player') {
    this.category = category;
    this.difficulty = difficulty;
    this.numberOfQuestions = parseInt(numberOfQuestions, 10);
    this.playerName = playerName.trim() || 'Player';
    this.score = 0;
    this.questions = [];
    this.currentQuestionIndex = 0;
  }

  buildApiUrl() {
    const params = new URLSearchParams({
      amount: this.numberOfQuestions,
      difficulty: this.difficulty,
    });

    if (this.category) {
      params.append('category', this.category);
    }

    return `https://opentdb.com/api.php?${params.toString()}`;
  }

  getApiErrorMessage(code) {
    const errorMessages = {
      1: 'Not enough questions available for your criteria. Try reducing the number or picking a different category.',
      2: 'Invalid parameters sent to the quiz server.',
      3: 'Session token not found.',
      4: 'Session token exhausted. Please try again.',
      5: 'Rate limit reached. Please wait 5 seconds before trying again.',
    };
    return errorMessages[code] || 'An unknown error occurred while retrieving questions.';
  }

  async getQuestions() {
    const url = this.buildApiUrl();
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Server error (${response.status}). Please check your connection and try again.`);
    }

    const data = await response.json();

    if (data.response_code !== 0) {
      throw new Error(this.getApiErrorMessage(data.response_code));
    }

    if (!data.results || data.results.length === 0) {
      throw new Error('No questions received from the API for the selected settings.');
    }

    this.questions = data.results;
    return this.questions;
  }

  incrementScore() {
    this.score += 1;
  }

  getCurrentQuestion() {
    if (this.currentQuestionIndex >= 0 && this.currentQuestionIndex < this.questions.length) {
      return this.questions[this.currentQuestionIndex];
    }
    return null;
  }

  nextQuestion() {
    this.currentQuestionIndex += 1;
    return this.currentQuestionIndex < this.questions.length;
  }

  isComplete() {
    return this.currentQuestionIndex >= this.questions.length;
  }

  getScorePercentage() {
    if (this.numberOfQuestions <= 0) return 0;
    return Math.round((this.score / this.numberOfQuestions) * 100);
  }

  getHighScores() {
    try {
      const data = localStorage.getItem('quizHighScores');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  isHighScore() {
    const percentage = this.getScorePercentage();
    if (percentage <= 0) return false;

    const highScores = this.getHighScores();
    if (highScores.length < 10) return true;

    return percentage > highScores[highScores.length - 1].percentage;
  }

  saveHighScore() {
    const highScores = this.getHighScores();
    const newEntry = {
      name: this.playerName,
      score: this.score,
      total: this.numberOfQuestions,
      percentage: this.getScorePercentage(),
      difficulty: this.difficulty,
      date: new Date().toLocaleDateString(),
    };

    highScores.push(newEntry);
    highScores.sort((a, b) => b.percentage - a.percentage);
    const top10 = highScores.slice(0, 10);

    try {
      localStorage.setItem('quizHighScores', JSON.stringify(top10));
    } catch (e) {
      console.warn('Unable to save high score to localStorage:', e);
    }
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

  endQuiz() {
    soundManager.playComplete();

    const percentage = this.getScorePercentage();
    const isNewRecord = this.isHighScore();

    if (isNewRecord) {
      this.saveHighScore();
    }

    const highScores = this.getHighScores();

    const leaderboardMarkup = highScores.length > 0 ? `
      <div class="leaderboard">
        <h4 class="leaderboard-title">
          <i class="fa-solid fa-trophy"></i> Leaderboard
        </h4>
        <ul class="leaderboard-list">
          ${highScores.map((item, index) => {
            let rankClass = '';
            if (index === 0) rankClass = 'gold';
            else if (index === 1) rankClass = 'silver';
            else if (index === 2) rankClass = 'bronze';

            return `
              <li class="leaderboard-item ${rankClass}">
                <span class="leaderboard-rank">#${index + 1}</span>
                <span class="leaderboard-name">${this.escapeHtml(item.name || 'Player')}</span>
                <span class="leaderboard-score">${item.percentage}%</span>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    ` : '';

    return `
      <div class="game-card results-card">
        <h2 class="results-title">Quiz Complete!</h2>
        <p class="results-score-display">${this.score}/${this.numberOfQuestions}</p>
        <p class="results-percentage">${percentage}% Accuracy</p>
        
        ${isNewRecord ? `
          <div class="new-record-badge">
            <i class="fa-solid fa-star"></i> New High Score!
          </div>
        ` : ''}
        
        ${leaderboardMarkup}
        
        <div class="action-buttons">
          <button class="btn-restart">
            <i class="fa-solid fa-rotate-right"></i> Play Again
          </button>
        </div>
      </div>
    `;
  }
}
