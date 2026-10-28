(() => {
  const DATA = window.QUIZ_DATA || [];
  const STORAGE_KEY = 'mental-nursing-quiz-github-v2';
  const $ = (id) => document.getElementById(id);
  const el = {
    category: $('categorySelect'), shuffle: $('shuffleToggle'), type: $('typeSelect'),
    progress: $('progressText'), correct: $('correctText'), wrong: $('wrongText'), accuracy: $('accuracyText'),
    card: $('quizCard'), complete: $('completeCard'), categoryBadge: $('categoryBadge'), typeBadge: $('typeBadge'),
    attempt: $('attemptBadge'), questionLabel: $('questionLabel'), question: $('meaningText'), form: $('answerForm'),
    input: $('answerInput'), hint: $('hintBtn'), next: $('nextBtn'), feedback: $('feedback'),
    review: $('meaningReview'), reviewText: $('meaningReviewText'), exampleBox: $('exampleBox'),
    example: $('exampleText'), final: $('finalScore')
  };
  let state = {
    category: 'all', shuffle: true, typeMode: 'mixed', queue: [], questionTypes: {}, index: 0,
    attempts: 0, correct: 0, wrong: 0, wrongIds: [], answered: false
  };

  const normalize = (text) => text.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[\s·ㆍ,./_-]/g, '').replace(/증상$/, '증');
  const answersFor = (term) => term.replace(/\([^)]*\)/g, '').trim().split(/[·,/]/).map(normalize).filter(Boolean);
  const shuffleArray = (array) => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved?.queue?.length) state = { ...state, ...saved };
    } catch {}
  };
  const filteredIds = () => DATA
    .filter((q) => state.category === 'all' || q.category === state.category)
    .filter((q) => state.typeMode !== 'scenario' || q.scenario)
    .map((q) => q.id);
  const current = () => DATA.find((q) => q.id === state.queue[state.index]);
  const currentType = (q) => state.questionTypes[q.id] === 'scenario' && q.scenario ? 'scenario' : 'meaning';
  const chooseType = (q) => {
    if (state.typeMode === 'meaning' || !q.scenario) return 'meaning';
    if (state.typeMode === 'scenario') return 'scenario';
    return Math.random() < 0.5 ? 'scenario' : 'meaning';
  };
  const setFeedback = (message, kind) => {
    el.feedback.textContent = message;
    el.feedback.className = `feedback ${kind}`;
  };
  const stats = () => {
    const done = state.correct + state.wrong;
    const total = state.queue.length;
    el.progress.textContent = `${Math.min(done, total)} / ${total}`;
    el.correct.textContent = state.correct;
    el.wrong.textContent = state.wrong;
    el.accuracy.textContent = done ? `${Math.round(state.correct / done * 100)}%` : '0%';
  };
  const revealStudyNotes = (q) => {
    el.reviewText.textContent = q.meaning;
    el.review.classList.remove('hidden');
    el.exampleBox.classList.remove('hidden');
  };
  const render = () => {
    stats();
    if (state.index >= state.queue.length) {
      el.card.classList.add('hidden');
      el.complete.classList.remove('hidden');
      const done = state.correct + state.wrong;
      el.final.textContent = `${done}문제 중 ${state.correct}문제를 맞혔습니다. 정답률 ${done ? Math.round(state.correct / done * 100) : 0}%`;
      $('retryWrongBtn').classList.toggle('hidden', !state.wrongIds.length);
      save();
      return;
    }
    const q = current();
    if (!q) { start(); return; }
    const type = currentType(q);
    el.card.classList.remove('hidden');
    el.complete.classList.add('hidden');
    el.categoryBadge.textContent = q.category;
    el.typeBadge.textContent = type === 'scenario' ? '사례형' : '의미형';
    el.questionLabel.textContent = type === 'scenario' ? '사례를 읽고 해당 용어를 쓰세요.' : '이 의미에 해당하는 용어는?';
    el.question.textContent = type === 'scenario' ? q.scenario : q.meaning;
    el.attempt.textContent = state.attempts === 0 ? '1차 시도' : '2차 시도';
    el.input.value = '';
    el.input.disabled = state.answered;
    el.form.querySelector('button').disabled = state.answered;
    el.hint.classList.toggle('hidden', state.answered);
    el.next.classList.toggle('hidden', !state.answered);
    el.feedback.className = 'feedback hidden';
    el.review.classList.add('hidden');
    el.exampleBox.classList.add('hidden');
    el.exampleBox.open = false;
    el.example.textContent = q.example;
    if (!state.answered) setTimeout(() => el.input.focus(), 0);
  };
  const start = (ids = null) => {
    const base = ids || filteredIds();
    state.queue = state.shuffle ? shuffleArray(base) : [...base];
    state.questionTypes = {};
    state.queue.forEach((id) => {
      const q = DATA.find((item) => item.id === id);
      state.questionTypes[id] = chooseType(q);
    });
    state.index = 0;
    state.attempts = 0;
    state.correct = 0;
    state.wrong = 0;
    state.wrongIds = [];
    state.answered = false;
    save();
    render();
  };
  const next = () => {
    state.index++;
    state.attempts = 0;
    state.answered = false;
    save();
    render();
  };
  const resetAll = () => {
    if (confirm('현재 학습 기록을 지우고 처음부터 시작할까요?')) start();
  };

  [...new Set(DATA.map((q) => q.category))].forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    el.category.appendChild(option);
  });
  load();
  el.category.value = state.category;
  el.shuffle.checked = state.shuffle;
  el.type.value = state.typeMode;

  el.form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.answered) return;
    const q = current();
    const guess = normalize(el.input.value);
    if (!guess) return;
    if (answersFor(q.term).includes(guess)) {
      state.correct++;
      state.answered = true;
      setFeedback(`정답입니다. ${q.term}`, 'good');
      revealStudyNotes(q);
      el.input.disabled = true;
      el.form.querySelector('button').disabled = true;
      el.hint.classList.add('hidden');
      el.next.classList.remove('hidden');
      save();
      stats();
    } else if (state.attempts === 0) {
      state.attempts = 1;
      el.attempt.textContent = '2차 시도';
      setFeedback('아쉽지만 한 번 더 생각해 보세요. 기회가 한 번 남았습니다.', 'bad');
      el.input.select();
      save();
    } else {
      state.wrong++;
      if (!state.wrongIds.includes(q.id)) state.wrongIds.push(q.id);
      state.answered = true;
      setFeedback(`정답은 “${q.term}”입니다.`, 'bad');
      revealStudyNotes(q);
      el.input.disabled = true;
      el.form.querySelector('button').disabled = true;
      el.hint.classList.add('hidden');
      el.next.classList.remove('hidden');
      save();
      stats();
    }
  });
  el.hint.addEventListener('click', () => {
    const term = current().term.replace(/\([^)]*\)/g, '').trim();
    const first = [...term].find((character) => /[가-힣A-Za-z0-9]/.test(character)) || term[0];
    setFeedback(`힌트: 첫 글자는 “${first}”입니다.`, 'hint');
    el.input.focus();
  });
  el.next.addEventListener('click', next);
  $('resetBtn').addEventListener('click', resetAll);
  $('restartBtn').addEventListener('click', () => start());
  $('retryWrongBtn').addEventListener('click', () => start([...state.wrongIds]));
  el.category.addEventListener('change', () => { state.category = el.category.value; start(); });
  el.shuffle.addEventListener('change', () => { state.shuffle = el.shuffle.checked; start(); });
  el.type.addEventListener('change', () => { state.typeMode = el.type.value; start(); });
  if (state.queue.length) render(); else start();
})();

