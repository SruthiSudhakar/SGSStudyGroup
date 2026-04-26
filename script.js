// ============================================================
// CONFIGURATION — Update this after deploying your Apps Script
// ============================================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7IsziV1fGAUKi-wqggy_EuO9_7dPifktn3jLeNMwAqh2rafhK6Ev9reAS-lETyDpr/exec';

// ============================================================
// STATE
// ============================================================
let QUESTIONS = []; // Loaded from Google Sheet on page load

const state = {
  studentName: '',
  answers: {},  // { 0: "A", 1: "C", ... }
  questionsLoaded: false,
};

// ============================================================
// SECTION MANAGEMENT
// ============================================================
function showSection(sectionId) {
  ['intro-section', 'quiz-section', 'loading-section', 'results-section'].forEach(id => {
    document.getElementById(id).classList.add('section-hidden');
  });
  document.getElementById(sectionId).classList.remove('section-hidden');
}

// ============================================================
// LOAD QUESTIONS FROM GOOGLE SHEET
// ============================================================
async function loadQuestions() {
  const startBtn = document.getElementById('start-btn');
  const quizInfo = document.getElementById('quiz-info');

  startBtn.disabled = true;
  startBtn.textContent = 'Loading questions...';

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=questions`, {
      redirect: 'follow'
    });
    const data = await response.json();

    if (data.questions && data.questions.length > 0) {
      QUESTIONS = data.questions;
      state.questionsLoaded = true;
      startBtn.disabled = false;
      startBtn.textContent = 'Start Quiz';
      quizInfo.textContent = `${QUESTIONS.length} questions • Multiple choice`;
    } else {
      startBtn.textContent = 'No questions available';
      quizInfo.textContent = 'The quiz has not been set up yet.';
    }
  } catch (err) {
    startBtn.textContent = 'Failed to load — tap to retry';
    quizInfo.textContent = 'Could not connect to the server.';
    startBtn.disabled = false;
    startBtn.onclick = () => {
      startBtn.onclick = () => startQuiz();
      loadQuestions();
    };
  }
}

// ============================================================
// INTRO / START
// ============================================================
function startQuiz() {
  if (!state.questionsLoaded || QUESTIONS.length === 0) return;

  const nameInput = document.getElementById('student-name');
  const name = nameInput.value.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !emailRegex.test(name)) {
    document.getElementById('name-error').classList.remove('hidden');
    nameInput.classList.add('border-red-400');
    nameInput.focus();
    return;
  }

  state.studentName = name;
  state.answers = {};

  showSection('quiz-section');
  renderAllQuestions();
}

// Allow pressing Enter on name input
document.getElementById('student-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startQuiz();
  // Clear error state on typing
  document.getElementById('name-error').classList.add('hidden');
  e.target.classList.remove('border-red-400');
});

// ============================================================
// QUIZ FLOW — All questions at once
// ============================================================
function renderAllQuestions() {
  const container = document.getElementById('all-questions-container');
  container.innerHTML = '';

  QUESTIONS.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl shadow-lg p-6 sm:p-8 animate-fade-in-up';
    card.style.animationDelay = `${i * 0.05}s`;
    card.id = `question-card-${i}`;

    let html = `
      <div class="flex items-start gap-3 mb-5">
        <span class="flex-shrink-0 w-8 h-8 rounded-full bg-saffron-100 text-saffron-700 flex items-center justify-center text-sm font-bold">${i + 1}</span>
        <h2 class="text-lg sm:text-xl font-semibold text-gray-800 leading-relaxed">${q.text}</h2>
      </div>
      <div class="space-y-2.5 pl-11" id="options-${i}">
    `;

    q.options.forEach(opt => {
      html += `
        <div
          class="option-card cursor-pointer border-2 border-gray-200 hover:border-saffron-300 bg-white rounded-xl p-3.5 flex items-center gap-3"
          data-question="${i}" data-label="${opt.label}"
          onclick="selectOption(${i}, '${opt.label}')"
        >
          <span class="flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-bold" id="badge-${i}-${opt.label}">${opt.label}</span>
          <span class="text-gray-800">${opt.text}</span>
        </div>
      `;
    });

    html += '</div>';
    card.innerHTML = html;
    container.appendChild(card);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectOption(questionIndex, label) {
  state.answers[questionIndex] = label;

  const optionsContainer = document.getElementById(`options-${questionIndex}`);
  const cards = optionsContainer.querySelectorAll('.option-card');
  cards.forEach(card => {
    const cardLabel = card.dataset.label;
    const badge = document.getElementById(`badge-${questionIndex}-${cardLabel}`);
    if (cardLabel === label) {
      card.className = 'option-card cursor-pointer border-2 selected border-saffron-400 bg-saffron-50 rounded-xl p-3.5 flex items-center gap-3';
      badge.className = 'flex-shrink-0 w-9 h-9 rounded-full bg-saffron-500 text-white flex items-center justify-center text-sm font-bold';
    } else {
      card.className = 'option-card cursor-pointer border-2 border-gray-200 hover:border-saffron-300 bg-white rounded-xl p-3.5 flex items-center gap-3';
      badge.className = 'flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-bold';
    }
  });

  // Clear red ring if it was highlighted as unanswered
  document.getElementById(`question-card-${questionIndex}`).classList.remove('ring-2', 'ring-red-400');
}

// ============================================================
// SUBMIT
// ============================================================
async function submitQuiz() {
  const unanswered = QUESTIONS.filter((_, i) => state.answers[i] === undefined);
  if (unanswered.length > 0) {
    const firstUnanswered = QUESTIONS.findIndex((_, i) => state.answers[i] === undefined);
    QUESTIONS.forEach((_, i) => {
      const card = document.getElementById(`question-card-${i}`);
      if (state.answers[i] === undefined) {
        card.classList.add('ring-2', 'ring-red-400');
      } else {
        card.classList.remove('ring-2', 'ring-red-400');
      }
    });
    document.getElementById(`question-card-${firstUnanswered}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  const answers = QUESTIONS.map((_, i) => state.answers[i]);

  showSection('loading-section');

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        name: state.studentName,
        answers: answers
      }),
      redirect: 'follow'
    });

    const result = await response.json();

    if (result.success || result.alreadySubmitted || result.error === 'duplicate') {
      // Use questions from response if available (for results breakdown)
      if (result.questions) QUESTIONS = result.questions;
      localStorage.setItem('quizSubmitted', JSON.stringify({
        name: state.studentName,
        submitted: true
      }));
      renderResults(result);
    } else {
      alert('Error: ' + (result.error || 'Something went wrong. Please try again.'));
      showSection('quiz-section');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Quiz';
    }
  } catch (err) {
    alert('Network error. Please check your connection and try again.');
    showSection('quiz-section');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Quiz';
  }
}

// ============================================================
// RESULTS (with live polling)
// ============================================================
let statsInterval = null;

function startLiveStats() {
  stopLiveStats();
  statsInterval = setInterval(async () => {
    try {
      const response = await fetch(
        `${APPS_SCRIPT_URL}?name=${encodeURIComponent(state.studentName)}`,
        { redirect: 'follow' }
      );
      const data = await response.json();
      if (data.found) {
        if (data.questions) QUESTIONS = data.questions;
        updateStats(data);
      }
    } catch {
      // silently skip — will retry next interval
    }
  }, 15000);
}

function stopLiveStats() {
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
}

// Update only the stats sections (not the score/message which don't change)
function updateStats(data) {
  document.getElementById('stat-average').textContent = (data.classAverage || 0).toFixed(1);
  document.getElementById('stat-submissions').textContent = data.numSubmissions || 0;
  renderDistribution(data.distribution || []);
  const questions = data.questions || QUESTIONS;
  renderBreakdown(data, questions);
}

// Stop polling when user leaves the page
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopLiveStats();
  } else if (document.getElementById('results-section') && !document.getElementById('results-section').classList.contains('section-hidden')) {
    startLiveStats();
  }
});

function renderResults(data) {
  showSection('results-section');

  const totalQ = data.totalQuestions || QUESTIONS.length || 10;

  // Score
  const scoreEl = document.getElementById('result-score');
  const score = data.score || 0;
  scoreEl.textContent = score;

  // Update the /total display
  document.getElementById('result-total').textContent = `/${totalQ}`;

  // Color code
  const pct = score / totalQ;
  scoreEl.className = 'text-6xl font-bold animate-count-up ';
  if (pct >= 0.8) {
    scoreEl.className += 'score-high';
  } else if (pct >= 0.5) {
    scoreEl.className += 'score-mid';
  } else {
    scoreEl.className += 'score-low';
  }

  // Message
  const msgEl = document.getElementById('result-message');
  if (score === totalQ) {
    msgEl.textContent = 'Perfect score! Outstanding!';
    msgEl.className = 'text-lg mt-3 font-medium text-green-600';
  } else if (pct >= 0.8) {
    msgEl.textContent = 'Excellent work!';
    msgEl.className = 'text-lg mt-3 font-medium text-green-600';
  } else if (pct >= 0.5) {
    msgEl.textContent = 'Good effort!';
    msgEl.className = 'text-lg mt-3 font-medium text-yellow-600';
  } else {
    msgEl.textContent = 'Keep practicing!';
    msgEl.className = 'text-lg mt-3 font-medium text-red-500';
  }

  // Class stats
  document.getElementById('stat-average').textContent = (data.classAverage || 0).toFixed(1);
  document.getElementById('stat-submissions').textContent = data.numSubmissions || 0;

  // Distribution chart
  renderDistribution(data.distribution || []);

  // Per-question breakdown — use questions from response if available
  const questions = data.questions || QUESTIONS;
  renderBreakdown(data, questions);

  // Start live-updating stats
  startLiveStats();
}

function renderDistribution(distribution) {
  const container = document.getElementById('distribution-chart');
  container.innerHTML = '';

  const maxCount = Math.max(...distribution, 1);

  // Also render score labels
  const labelsEl = document.getElementById('distribution-labels');
  labelsEl.innerHTML = '';

  distribution.forEach((count, score) => {
    const barWrapper = document.createElement('div');
    barWrapper.className = 'flex-1 flex flex-col items-center justify-end h-full';

    const countLabel = document.createElement('span');
    countLabel.className = 'text-xs text-gray-500 mb-1';
    countLabel.textContent = count > 0 ? count : '';

    const bar = document.createElement('div');
    const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
    bar.className = 'w-full rounded-t-md dist-bar animate-bar-grow';
    bar.style.height = `${heightPct}%`;
    bar.style.minHeight = count > 0 ? '4px' : '0';
    bar.style.animationDelay = `${score * 0.05}s`;

    const totalQ = distribution.length - 1;
    const scorePct = score / totalQ;
    if (scorePct >= 0.8) {
      bar.classList.add('bg-green-400');
    } else if (scorePct >= 0.5) {
      bar.classList.add('bg-yellow-400');
    } else {
      bar.classList.add('bg-red-300');
    }

    barWrapper.appendChild(countLabel);
    barWrapper.appendChild(bar);
    container.appendChild(barWrapper);

    // Add label
    const label = document.createElement('span');
    label.textContent = score;
    labelsEl.appendChild(label);
  });
}

function renderBreakdown(data, questions) {
  const container = document.getElementById('question-breakdown');
  container.innerHTML = '';

  const answers = data.answers || [];
  const correct = data.correctAnswers || [];
  const perQuestion = data.perQuestion || [];

  questions.forEach((q, i) => {
    const studentAnswer = answers[i] || '—';
    const correctAnswer = correct[i] || '?';
    const isCorrect = studentAnswer === correctAnswer;
    const pctCorrect = Math.round((perQuestion[i] || 0) * 100);

    const studentOptionText = q.options.find(o => o.label === studentAnswer)?.text || studentAnswer;
    const correctOptionText = q.options.find(o => o.label === correctAnswer)?.text || correctAnswer;

    const div = document.createElement('div');
    div.className = `rounded-xl border-2 p-4 animate-fade-in ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`;
    div.style.animationDelay = `${i * 0.05}s`;

    div.innerHTML = `
      <div class="flex items-start justify-between gap-3 mb-2">
        <p class="text-sm font-medium text-gray-800 flex-1">
          <span class="text-gray-400">Q${i + 1}.</span> ${q.text}
        </p>
        <span class="flex-shrink-0 text-lg">${isCorrect ? '✅' : '❌'}</span>
      </div>
      <div class="flex items-center gap-4 text-sm mb-2">
        <span class="${isCorrect ? 'text-green-700' : 'text-red-700'}">
          Your answer: <strong>${studentAnswer}. ${studentOptionText}</strong>
        </span>
        ${!isCorrect ? `<span class="text-green-700">Correct: <strong>${correctAnswer}. ${correctOptionText}</strong></span>` : ''}
      </div>
      <div class="flex items-center gap-2">
        <div class="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div class="h-full rounded-full animate-width-grow ${pctCorrect >= 70 ? 'bg-green-400' : pctCorrect >= 40 ? 'bg-yellow-400' : 'bg-red-400'}" style="width: ${pctCorrect}%; animation-delay: ${i * 0.05 + 0.3}s;"></div>
        </div>
        <span class="text-xs text-gray-500 w-12 text-right">${pctCorrect}% correct</span>
      </div>
    `;

    container.appendChild(div);
  });
}

// ============================================================
// CHECK FOR RETURNING STUDENT (localStorage)
// ============================================================
(function init() {
  const saved = localStorage.getItem('quizSubmitted');

  if (saved) {
    try {
      const { name, submitted } = JSON.parse(saved);
      if (submitted && name) {
        state.studentName = name;
        showSection('loading-section');

        fetch(`${APPS_SCRIPT_URL}?name=${encodeURIComponent(name)}`, {
          redirect: 'follow'
        })
          .then(r => r.json())
          .then(data => {
            if (data.found) {
              if (data.questions) QUESTIONS = data.questions;
              renderResults(data);
            } else {
              localStorage.removeItem('quizSubmitted');
              showSection('intro-section');
              loadQuestions();
            }
          })
          .catch(() => {
            localStorage.removeItem('quizSubmitted');
            showSection('intro-section');
            loadQuestions();
          });
        return;
      }
    } catch {
      localStorage.removeItem('quizSubmitted');
    }
  }

  // No returning student — load questions for new quiz
  loadQuestions();
})();
