// dashboard.js

window.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (!user) return;

  // Greeting
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greetingText').textContent = `${greet}, ${user.name.split(' ')[0]} 🌿`;

  // Date
  document.getElementById('headerDate').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  loadStats();
  renderWeeklyChart();
});

function loadStats() {
  const moods = getData('moods');
  const journals = getData('journals');
  const stats = JSON.parse(localStorage.getItem(storageKey('stats')) || '{}');

  document.getElementById('chatCount').textContent = stats.chats || 0;
  document.getElementById('journalCount').textContent = journals.length;

  // Streak calculation
  let streak = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const hasEntry = moods.some(m => m.date.startsWith(ds));
    if (hasEntry) streak++;
    else if (i > 0) break;
  }
  document.getElementById('streakCount').textContent = streak;

  // 7-day avg mood
  const week = moods.filter(m => {
    const d = new Date(m.date);
    const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });
  if (week.length) {
    const avg = week.reduce((s, m) => s + moodScore(m.mood), 0) / week.length;
    const emoji = avg >= 7 ? '😊' : avg >= 5 ? '😐' : avg >= 3 ? '😟' : '😢';
    document.getElementById('avgMood').textContent = emoji;
  }
}

function renderWeeklyChart() {
  const moods = getData('moods');
  const days = [];
  const scores = [];
  const emojis = ['😊','😊','😊','😊','😊','😊','😊'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const ds = d.toISOString().split('T')[0];
    const dayMoods = moods.filter(m => m.date.startsWith(ds));
    const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
    days.push(label);
    if (dayMoods.length) {
      const avg = dayMoods.reduce((s, m) => s + moodScore(m.mood), 0) / dayMoods.length;
      scores.push(Math.round(avg * 10) / 10);
    } else {
      scores.push(null);
    }
  }

  const ctx = document.getElementById('weeklyMoodChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Mood Score',
        data: scores,
        borderColor: '#5a7a5a',
        backgroundColor: 'rgba(90,122,90,0.08)',
        pointBackgroundColor: '#2d4a2d',
        pointRadius: 5,
        tension: 0.4,
        fill: true,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0, max: 10,
          ticks: { stepSize: 2 },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

function quickCheckin(mood) {
  // Deselect all, select chosen
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.querySelector(`.mood-btn[data-mood="${mood}"]`);
  if (btn) btn.classList.add('selected');

  // Save mood
  const moods = getData('moods');
  moods.push({ mood, date: new Date().toISOString(), source: 'dashboard', note: '' });
  saveData('moods', moods);

  // Show feedback
  const messages = {
    happy:    "Wonderful! Hold onto that positive energy. 🌟",
    calm:     "Lovely. Peace is something to be treasured. 🌿",
    neutral:  "Thanks for checking in. Even neutral days matter.",
    anxious:  "I hear you. Try a slow breath — you're not alone. 💙",
    sad:      "Thank you for sharing. Be gentle with yourself today. 💙",
    stressed: "Stress is tough. Let's find you something calming. 🫁",
    grieving: "I'm so sorry. Grief takes time — be patient with yourself. 💙"
  };
  const fb = document.getElementById('checkinFeedback');
  fb.textContent = messages[mood] || "Thanks for checking in.";
  fb.classList.remove('hidden');

  setTimeout(() => {
    loadStats();
  }, 500);
}
