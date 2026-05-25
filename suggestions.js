// suggestions.js

const AFFIRMATIONS = [
  "I am allowed to take up space and feel what I feel.",
  "This difficult moment is temporary. I have survived hard times before.",
  "I am worthy of care, compassion, and healing.",
  "I don't have to be perfect to deserve love and support.",
  "Healing is not linear, and that's okay.",
  "I am doing the best I can with what I have.",
  "My feelings are valid and deserve acknowledgment.",
  "I am stronger than my darkest thoughts.",
  "One breath, one moment, one step at a time.",
  "I choose to be gentle with myself today.",
  "My past does not define my future.",
  "I am worthy of peace.",
  "Even in pain, I am growing.",
  "It is okay to ask for help. That is courage.",
  "I am not alone in what I'm going through."
];

const MUSIC = {
  stressed: [
    { name: "Weightless — Marconi Union", desc: "Scientifically designed to reduce anxiety by 65%", link: "https://www.youtube.com/results?search_query=weightless+marconi+union" },
    { name: "Clair de Lune — Debussy", desc: "Classical piece known for deep calming effects", link: "https://www.youtube.com/results?search_query=clair+de+lune+debussy" },
    { name: "Lo-fi Study Beats", desc: "Gentle background music to quieten a racing mind", link: "https://www.youtube.com/results?search_query=lofi+study+beats" }
  ],
  sad: [
    { name: "The Night Will Always Win — Manchester Orchestra", desc: "Comforting music that sits with you in sadness", link: "https://www.youtube.com/results?search_query=the+night+will+always+win" },
    { name: "Skinny Love — Bon Iver", desc: "Raw and beautiful — lets you feel without judgment", link: "https://www.youtube.com/results?search_query=skinny+love+bon+iver" },
    { name: "Healing Frequencies — 432Hz", desc: "Frequency-based music for emotional release", link: "https://www.youtube.com/results?search_query=432hz+healing+frequency" }
  ],
  anxious: [
    { name: "Forest Rain Sounds", desc: "Nature sounds are clinically proven to reduce cortisol", link: "https://www.youtube.com/results?search_query=forest+rain+sounds+relax" },
    { name: "Tibetan Singing Bowls", desc: "Meditative tones to slow the nervous system", link: "https://www.youtube.com/results?search_query=tibetan+singing+bowls+meditation" },
    { name: "Brian Eno — Ambient 1: Music for Airports", desc: "Minimalist ambient designed to soothe and ground", link: "https://www.youtube.com/results?search_query=brian+eno+ambient+music+for+airports" }
  ],
  grieving: [
    { name: "The Scientist — Coldplay", desc: "A gentle companion through grief and longing", link: "https://www.youtube.com/results?search_query=the+scientist+coldplay" },
    { name: "Somewhere Over the Rainbow — Israel Kamakawiwoʻole", desc: "Tender and hopeful — a classic for healing hearts", link: "https://www.youtube.com/results?search_query=somewhere+over+the+rainbow+israel" },
    { name: "Grief Healing Meditation Music", desc: "Specifically curated soundscapes for bereavement", link: "https://www.youtube.com/results?search_query=grief+healing+meditation+music" }
  ],
  calm: [
    { name: "Gymnopédie No.1 — Erik Satie", desc: "Timeless, serene piano piece for peaceful moments", link: "https://www.youtube.com/results?search_query=gymnopedie+satie" },
    { name: "Ocean Wave Sounds", desc: "Steady waves to maintain a state of calm presence", link: "https://www.youtube.com/results?search_query=ocean+wave+sounds+calm" },
    { name: "Deep Focus — Ambient Mix", desc: "For staying in a grounded, centered state", link: "https://www.youtube.com/results?search_query=deep+focus+ambient+mix" }
  ]
};

/* ---- Breathing exercise configs ---- */
const BREATHING_CONFIGS = {
  '478':  { name: '4-7-8 Breathing', phases: [{label:'Inhale', dur:4}, {label:'Hold', dur:7}, {label:'Exhale', dur:8}] },
  'box':  { name: 'Box Breathing',   phases: [{label:'Inhale', dur:4}, {label:'Hold', dur:4}, {label:'Exhale', dur:4}, {label:'Hold', dur:4}] },
  'belly':{ name: 'Belly Breathing', phases: [{label:'Inhale', dur:5}, {label:'Exhale', dur:6}] }
};

/* ---- Grounding steps ---- */
const GROUNDING_STEPS = [
  { num: '5', title: 'See', instruction: 'Name 5 things you can SEE right now', help: 'Look around slowly. Name each one aloud.' },
  { num: '4', title: 'Touch', instruction: 'Name 4 things you can TOUCH', help: 'Feel their texture, temperature, weight.' },
  { num: '3', title: 'Hear', instruction: 'Name 3 things you can HEAR', help: 'Listen carefully — near and far sounds.' },
  { num: '2', title: 'Smell', instruction: 'Name 2 things you can SMELL', help: 'Take a deep breath. Notice the air.' },
  { num: '1', title: 'Taste', instruction: 'Name 1 thing you can TASTE', help: 'Notice any taste — even the absence of taste.' },
  { num: '✓', title: 'Done', instruction: 'You\'ve completed the grounding exercise', help: 'Take a final slow breath. You are here, you are safe.' }
];

let breathingInterval = null;
let breathingRunning = false;
let breathingConfig = null;
let breathingPhase = 0;
let breathingCycle = 0;
let breathingSeconds = 0;
let groundingStep = 0;

/* ---- Tabs ---- */
function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  event.target.classList.add('active');
}

/* ---- Breathing ---- */
function startBreathing(type) {
  breathingConfig = BREATHING_CONFIGS[type];
  breathingPhase = 0;
  breathingCycle = 0;
  breathingSeconds = 0;
  breathingRunning = false;

  document.getElementById('breathingTitle').textContent = breathingConfig.name;
  document.getElementById('breathingLabel').textContent = 'Ready';
  document.getElementById('breathingInstruction').textContent = 'Press Start to begin';
  document.getElementById('cycleCount').textContent = '';
  document.getElementById('breathingStartBtn').textContent = 'Start';

  const circle = document.getElementById('breathingCircle');
  circle.className = 'breathing-circle';

  document.getElementById('breathingModal').classList.remove('hidden');
}

function toggleBreathing() {
  if (breathingRunning) {
    pauseBreathing();
  } else {
    runBreathing();
  }
}

function runBreathing() {
  breathingRunning = true;
  document.getElementById('breathingStartBtn').textContent = 'Pause';

  const tick = () => {
    if (!breathingRunning) return;

    const phase = breathingConfig.phases[breathingPhase];
    const remaining = phase.dur - breathingSeconds;

    document.getElementById('breathingLabel').textContent = phase.label + '\n' + remaining + 's';
    document.getElementById('breathingInstruction').textContent = phase.label + '... ' + remaining + 's';

    const circle = document.getElementById('breathingCircle');
    circle.className = 'breathing-circle';
    if (phase.label === 'Inhale') circle.classList.add('inhale');
    else if (phase.label === 'Hold') circle.classList.add('hold');
    else if (phase.label === 'Exhale') circle.classList.add('exhale');

    breathingSeconds++;

    if (breathingSeconds >= phase.dur) {
      breathingSeconds = 0;
      breathingPhase++;
      if (breathingPhase >= breathingConfig.phases.length) {
        breathingPhase = 0;
        breathingCycle++;
        document.getElementById('cycleCount').textContent = `Cycle ${breathingCycle} complete`;
      }
    }

    breathingInterval = setTimeout(tick, 1000);
  };
  tick();
}

function pauseBreathing() {
  breathingRunning = false;
  clearTimeout(breathingInterval);
  document.getElementById('breathingStartBtn').textContent = 'Resume';
}

function stopBreathing() {
  breathingRunning = false;
  clearTimeout(breathingInterval);
  closeModal('breathingModal');
}

/* ---- Grounding ---- */
function startGrounding() {
  groundingStep = 0;
  renderGroundingStep();
  document.getElementById('groundingModal').classList.remove('hidden');
}

function renderGroundingStep() {
  const step = GROUNDING_STEPS[groundingStep];
  const content = document.getElementById('groundingContent');
  content.innerHTML = `
    <div class="grounding-step-num">${step.num}</div>
    <div class="grounding-instruction">${step.instruction}</div>
    <div class="grounding-help">${step.help}</div>
  `;
  const btn = document.getElementById('groundingNextBtn');
  btn.textContent = groundingStep >= GROUNDING_STEPS.length - 1 ? 'Done' : 'Next';
}

function nextGroundingStep() {
  if (groundingStep >= GROUNDING_STEPS.length - 1) {
    closeModal('groundingModal');
    return;
  }
  groundingStep++;
  renderGroundingStep();
}

/* ---- Body Scan ---- */
function startBodyScan() {
  alert('Body Scan: Start from your toes. Slowly move your attention upward through each part of your body — feet, calves, knees, thighs, belly, chest, shoulders, arms, neck, face. Notice sensations without judgment. Breathe naturally.');
}

/* ---- Music ---- */
function showMusicFor(mood) {
  document.querySelectorAll('.mood-music-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  const container = document.getElementById('musicSuggestions');
  const items = MUSIC[mood] || [];
  container.innerHTML = '';
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'music-item';
    el.innerHTML = `
      <strong>${item.name}</strong>
      <span>${item.desc}</span>
      <a href="${item.link}" target="_blank" rel="noopener">Find on YouTube →</a>
    `;
    container.appendChild(el);
  });
}

/* ---- Affirmations ---- */
let lastAffirmIdx = -1;
function newAffirmation() {
  let idx;
  do { idx = Math.floor(Math.random() * AFFIRMATIONS.length); }
  while (idx === lastAffirmIdx);
  lastAffirmIdx = idx;
  document.getElementById('affirmationText').textContent = AFFIRMATIONS[idx];
}

/* ---- Init ---- */
window.addEventListener('DOMContentLoaded', () => {
  getUser();
  newAffirmation();

  // Check URL param to auto-open a tab
  const params = new URLSearchParams(window.location.search);
  if (params.get('type') === 'breathing') {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-breathing').classList.add('active');
    document.querySelector('[onclick="showTab(\'breathing\')"]').classList.add('active');
  }
});
