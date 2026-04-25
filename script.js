// ============================================================
// CONFIGURATION — Update this after deploying your Apps Script
// ============================================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzdpo8xEP4CiKWuZzqT3bW5nPST-X3B6F4b_Pl5n9UlzVbNCkdZ9Xm2uMXDda9mkV-4/exec';

// ============================================================
// QUIZ QUESTIONS — Replace these with your actual questions
// Correct answers are stored ONLY in the Google Sheet's AnswerKey tab
// ============================================================
const QUESTIONS = [
  {
    id: 1,
    text: "How many chapters are in the Bhagavad Gita?",
    options: [
      { label: "A", text: "14" },
      { label: "B", text: "18" },
      { label: "C", text: "21" },
      { label: "D", text: "16" }
    ]
  },
  {
    id: 2,
    text: "Who narrated the Bhagavad Gita to Arjuna?",
    options: [
      { label: "A", text: "Vyasa" },
      { label: "B", text: "Sanjaya" },
      { label: "C", text: "Krishna" },
      { label: "D", text: "Bhishma" }
    ]
  },
  {
    id: 3,
    text: "On which battlefield was the Bhagavad Gita spoken?",
    options: [
      { label: "A", text: "Hastinapura" },
      { label: "B", text: "Indraprastha" },
      { label: "C", text: "Kurukshetra" },
      { label: "D", text: "Mathura" }
    ]
  },
  {
    id: 4,
    text: "What is the first chapter of the Bhagavad Gita called?",
    options: [
      { label: "A", text: "Sankhya Yoga" },
      { label: "B", text: "Arjuna Vishada Yoga" },
      { label: "C", text: "Karma Yoga" },
      { label: "D", text: "Dhyana Yoga" }
    ]
  },
  {
    id: 5,
    text: "Which Yoga does Chapter 2 of the Gita primarily discuss?",
    options: [
      { label: "A", text: "Bhakti Yoga" },
      { label: "B", text: "Karma Yoga" },
      { label: "C", text: "Sankhya Yoga" },
      { label: "D", text: "Raja Yoga" }
    ]
  },
  {
    id: 6,
    text: "What does Krishna say about the soul (Atman) in Chapter 2?",
    options: [
      { label: "A", text: "It can be destroyed by weapons" },
      { label: "B", text: "It is born and dies repeatedly" },
      { label: "C", text: "It is eternal and cannot be destroyed" },
      { label: "D", text: "It exists only in living beings" }
    ]
  },
  {
    id: 7,
    text: "What relationship is Arjuna to the Pandavas?",
    options: [
      { label: "A", text: "Eldest brother" },
      { label: "B", text: "Youngest brother" },
      { label: "C", text: "Third brother" },
      { label: "D", text: "Cousin" }
    ]
  },
  {
    id: 8,
    text: "Who is the charioteer of Arjuna in the Mahabharata war?",
    options: [
      { label: "A", text: "Bhima" },
      { label: "B", text: "Drona" },
      { label: "C", text: "Krishna" },
      { label: "D", text: "Karna" }
    ]
  },
  {
    id: 9,
    text: "The Bhagavad Gita is part of which larger epic?",
    options: [
      { label: "A", text: "Ramayana" },
      { label: "B", text: "Mahabharata" },
      { label: "C", text: "Vishnu Purana" },
      { label: "D", text: "Upanishads" }
    ]
  },
  {
    id: 10,
    text: "What is the total number of shlokas (verses) in the Bhagavad Gita?",
    options: [
      { label: "A", text: "500" },
      { label: "B", text: "600" },
      { label: "C", text: "700" },
      { label: "D", text: "800" }
    ]
  }
];

// ============================================================
// STATE
// ============================================================
const state = {
  studentName: '',
  currentQuestion: 0,
  answers: {},  // { 0: "A", 1: "C", ... }
};

// ============================================================
// SECTION MANAGEMENT
// ============================================================
function showSection(sectionId) {
  ['intro-section', 'quiz-section', 'loading-section', 'results-section'].forEach(id => {
    document.getElementById(id).classList.add('section-hidden');
  });
  document.getElementById(sectionId).classList.remove('section-hidden');

  // Show/hide progress bar
  const progressContainer = document.getElementById('progress-container');
  if (sectionId === 'quiz-section') {
    progressContainer.classList.remove('section-hidden');
  } else {
    progressContainer.classList.add('section-hidden');
  }
}

// ============================================================
// INTRO / START
// ============================================================
function startQuiz() {
  const nameInput = document.getElementById('student-name');
  const name = nameInput.value.trim();

  if (!name) {
    document.getElementById('name-error').classList.remove('hidden');
    nameInput.classList.add('border-red-400');
    nameInput.focus();
    return;
  }

  state.studentName = name;
  state.currentQuestion = 0;
  state.answers = {};

  showSection('quiz-section');
  renderQuestion();
  buildQuestionDots();
}

// Allow pressing Enter on name input
document.getElementById('student-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startQuiz();
  // Clear error state on typing
  document.getElementById('name-error').classList.add('hidden');
  e.target.classList.remove('border-red-400');
});

// ============================================================
// QUIZ FLOW
// ============================================================
function renderQuestion() {
  const q = QUESTIONS[state.currentQuestion];
  const total = QUESTIONS.length;

  // Update counter
  document.getElementById('question-counter').textContent = `Question ${state.currentQuestion + 1} of ${total}`;

  // Update progress bar
  document.getElementById('progress-bar').style.width = `${((state.currentQuestion + 1) / total) * 100}%`;

  // Update question text
  document.getElementById('question-text').textContent = q.text;

  // Render options
  const container = document.getElementById('options-container');
  container.innerHTML = '';
  q.options.forEach(opt => {
    const selected = state.answers[state.currentQuestion] === opt.label;
    const div = document.createElement('div');
    div.className = `option-card cursor-pointer border-2 rounded-xl p-4 flex items-center gap-4 ${selected
        ? 'selected border-saffron-400 bg-saffron-50'
        : 'border-gray-200 hover:border-saffron-300 bg-white'
      }`;
    div.onclick = () => selectOption(opt.label);
    div.innerHTML = `
      <span class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${selected
        ? 'bg-saffron-500 text-white'
        : 'bg-gray-100 text-gray-600'
      }">${opt.label}</span>
      <span class="text-gray-800 text-lg">${opt.text}</span>
    `;
    container.appendChild(div);
  });

  // Show/hide nav buttons
  document.getElementById('prev-btn').disabled = state.currentQuestion === 0;

  const isLast = state.currentQuestion === total - 1;
  document.getElementById('next-btn').classList.toggle('section-hidden', isLast);
  document.getElementById('submit-btn').classList.toggle('section-hidden', !isLast);

  // Update dots
  updateQuestionDots();
}

function selectOption(label) {
  state.answers[state.currentQuestion] = label;
  renderQuestion();
}

function nextQuestion() {
  if (state.currentQuestion < QUESTIONS.length - 1) {
    state.currentQuestion++;
    renderQuestion();
  }
}

function prevQuestion() {
  if (state.currentQuestion > 0) {
    state.currentQuestion--;
    renderQuestion();
  }
}

// Question dots
function buildQuestionDots() {
  const container = document.getElementById('question-dots');
  container.innerHTML = '';
  QUESTIONS.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'w-3 h-3 rounded-full bg-gray-300 transition-all duration-200';
    dot.onclick = () => {
      state.currentQuestion = i;
      renderQuestion();
    };
    container.appendChild(dot);
  });
}

function updateQuestionDots() {
  const dots = document.getElementById('question-dots').children;
  for (let i = 0; i < dots.length; i++) {
    let cls = 'w-3 h-3 rounded-full transition-all duration-200 ';
    if (i === state.currentQuestion) {
      cls += 'bg-saffron-500 scale-125';
    } else if (state.answers[i] !== undefined) {
      cls += 'bg-saffron-300';
    } else {
      cls += 'bg-gray-300';
    }
    dots[i].className = cls;
  }
}

// ============================================================
// SUBMIT
// ============================================================
async function submitQuiz() {
  // Check all questions answered
  const unanswered = QUESTIONS.filter((_, i) => state.answers[i] === undefined);
  if (unanswered.length > 0) {
    const count = unanswered.length;
    alert(`Please answer all questions before submitting. You have ${count} unanswered question${count > 1 ? 's' : ''}.`);
    // Jump to first unanswered
    const firstUnanswered = QUESTIONS.findIndex((_, i) => state.answers[i] === undefined);
    state.currentQuestion = firstUnanswered;
    renderQuestion();
    return;
  }

  // Disable submit button
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  // Build answers array
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

    if (result.success || result.alreadySubmitted) {
      // Save to localStorage
      localStorage.setItem('quizSubmitted', JSON.stringify({
        name: state.studentName,
        submitted: true
      }));
      renderResults(result);
    } else if (result.error === 'duplicate') {
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
// RESULTS
// ============================================================
function renderResults(data) {
  showSection('results-section');

  // Score
  const scoreEl = document.getElementById('result-score');
  const score = data.score || 0;
  scoreEl.textContent = score;

  // Color code
  scoreEl.className = 'text-6xl font-bold animate-count-up ';
  if (score >= 8) {
    scoreEl.className += 'score-high';
  } else if (score >= 5) {
    scoreEl.className += 'score-mid';
  } else {
    scoreEl.className += 'score-low';
  }

  // Message
  const msgEl = document.getElementById('result-message');
  if (score === 10) {
    msgEl.textContent = 'Perfect score! Outstanding!';
    msgEl.className = 'text-lg mt-3 font-medium text-green-600';
  } else if (score >= 8) {
    msgEl.textContent = 'Excellent work!';
    msgEl.className = 'text-lg mt-3 font-medium text-green-600';
  } else if (score >= 5) {
    msgEl.textContent = 'Good effort! Keep studying.';
    msgEl.className = 'text-lg mt-3 font-medium text-yellow-600';
  } else {
    msgEl.textContent = 'Keep practicing — you\'ll get there!';
    msgEl.className = 'text-lg mt-3 font-medium text-red-500';
  }

  // Class stats
  document.getElementById('stat-average').textContent = (data.classAverage || 0).toFixed(1);
  document.getElementById('stat-submissions').textContent = data.numSubmissions || 0;

  // Distribution chart
  renderDistribution(data.distribution || []);

  // Per-question breakdown
  renderBreakdown(data);
}

function renderDistribution(distribution) {
  const container = document.getElementById('distribution-chart');
  container.innerHTML = '';

  const maxCount = Math.max(...distribution, 1);

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

    // Color based on score range
    if (score >= 8) {
      bar.classList.add('bg-green-400');
    } else if (score >= 5) {
      bar.classList.add('bg-yellow-400');
    } else {
      bar.classList.add('bg-red-300');
    }

    barWrapper.appendChild(countLabel);
    barWrapper.appendChild(bar);
    container.appendChild(barWrapper);
  });
}

function renderBreakdown(data) {
  const container = document.getElementById('question-breakdown');
  container.innerHTML = '';

  const answers = data.answers || [];
  const correct = data.correctAnswers || [];
  const perQuestion = data.perQuestion || [];

  QUESTIONS.forEach((q, i) => {
    const studentAnswer = answers[i] || '—';
    const correctAnswer = correct[i] || '?';
    const isCorrect = studentAnswer === correctAnswer;
    const pctCorrect = Math.round((perQuestion[i] || 0) * 100);

    // Find the text for the student's answer and correct answer
    const studentOptionText = q.options.find(o => o.label === studentAnswer)?.text || studentAnswer;
    const correctOptionText = q.options.find(o => o.label === correctAnswer)?.text || correctAnswer;

    const div = document.createElement('div');
    div.className = `rounded-xl border-2 p-4 animate-fade-in ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      }`;
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
          <div class="h-full rounded-full animate-width-grow ${pctCorrect >= 70 ? 'bg-green-400' : pctCorrect >= 40 ? 'bg-yellow-400' : 'bg-red-400'
      }" style="width: ${pctCorrect}%; animation-delay: ${i * 0.05 + 0.3}s;"></div>
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
(function checkReturningStudent() {
  const saved = localStorage.getItem('quizSubmitted');
  if (!saved) return;

  try {
    const { name, submitted } = JSON.parse(saved);
    if (!submitted || !name) return;

    // If the Apps Script URL isn't configured yet, skip
    if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_DEPLOYMENT_URL_HERE') return;

    // Show loading and fetch their results
    state.studentName = name;
    showSection('loading-section');

    fetch(`${APPS_SCRIPT_URL}?name=${encodeURIComponent(name)}`, {
      redirect: 'follow'
    })
      .then(r => r.json())
      .then(data => {
        if (data.found) {
          renderResults(data);
        } else {
          // Name not found in sheet — maybe sheet was reset
          localStorage.removeItem('quizSubmitted');
          showSection('intro-section');
        }
      })
      .catch(() => {
        // Network error — show intro
        localStorage.removeItem('quizSubmitted');
        showSection('intro-section');
      });
  } catch {
    localStorage.removeItem('quizSubmitted');
  }
})();
