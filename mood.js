// mood.js

let selectedMood = null;
let moodChart1 = null;
let moodChart2 = null;

window.addEventListener('DOMContentLoaded', () => {
  getUser();
  renderMoodHistory();
  renderCharts();
  renderInsights();
});

function selectMood(mood) {
  selectedMood = mood;
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.querySelector(`.mood-btn[data-mood="${mood}"]`);
  if (btn) btn.classList.add('selected');
  document.getElementById('moodNoteArea').classList.remove('hidden');
  document.getElementById('moodSaved').classList.add('hidden');
}

function updateIntensity(val) {
  document.getElementById('intensityVal').textContent = val;
}

function logMood() {
  if (!selectedMood) return;
  const note = document.getElementById('moodNote').value.trim();
  const intensity = parseInt(document.getElementById('moodIntensity').value);

  const moods = getData('moods');
  moods.push({
    id: 'm_' + Date.now(),
    mood: selectedMood,
    date: new Date().toISOString(),
    note,
    intensity,
    source: 'tracker'
  });
  saveData('moods', moods);

  // Reset
  selectedMood = null;
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('moodNote').value = '';
  document.getElementById('moodIntensity').value = 5;
  document.getElementById('intensityVal').textContent = '5';
  document.getElementById('moodNoteArea').classList.add('hidden');

  const saved = document.getElementById('moodSaved');
  saved.classList.remove('hidden');
  setTimeout(() => saved.classList.add('hidden'), 3000);

  renderMoodHistory();
  renderCharts();
  renderInsights();
}

function renderMoodHistory() {
  const moods = getData('moods').reverse();
  const container = document.getElementById('moodHistory');
  container.innerHTML = '';

  if (!moods.length) {
    container.innerHTML = '<p class="empty-state">No mood entries yet.</p>';
    return;
  }

  moods.slice(0, 30).forEach(m => {
    const el = document.createElement('div');
    el.className = 'mood-entry-item';
    el.innerHTML = `
      <span class="mood-entry-emoji">${moodEmoji(m.mood)}</span>
      <div class="mood-entry-info">
        <strong>${m.mood}</strong>
        <small>${formatDate(m.date)}</small>
        ${m.note ? `<div class="mood-entry-note">"${m.note}"</div>` : ''}
      </div>
      ${m.intensity ? `<span class="mood-intensity-badge">${m.intensity}/10</span>` : ''}
    `;
    container.appendChild(el);
  });
}

function renderCharts() {
  const moods = getData('moods');

  // Line chart — last 30 days
  const lineData = [];
  const lineLabels = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const ds = d.toISOString().split('T')[0];
    const dayMoods = moods.filter(m => m.date.startsWith(ds));
    lineLabels.push(d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
    if (dayMoods.length) {
      const avg = dayMoods.reduce((s, m) => s + moodScore(m.mood), 0) / dayMoods.length;
      lineData.push(Math.round(avg * 10) / 10);
    } else {
      lineData.push(null);
    }
  }

  const ctx1 = document.getElementById('moodLineChart');
  if (moodChart1) moodChart1.destroy();
  moodChart1 = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: lineLabels,
      datasets: [{
        data: lineData,
        borderColor: '#5a7a5a',
        backgroundColor: 'rgba(90,122,90,0.1)',
        pointBackgroundColor: '#2d4a2d',
        pointRadius: 3,
        tension: 0.4,
        fill: true,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 10, ticks: { stepSize: 2 } },
        x: { ticks: { maxTicksLimit: 7 }, grid: { display: false } }
      }
    }
  });

  // Pie chart — distribution
  const counts = {};
  moods.forEach(m => { counts[m.mood] = (counts[m.mood] || 0) + 1; });
  const pieLabels = Object.keys(counts);
  const pieData = Object.values(counts);
  const colors = {
    happy: '#d4a853', calm: '#5a7a5a', neutral: '#8aaa8a',
    anxious: '#c4714a', sad: '#6b7c93', stressed: '#c0392b',
    grieving: '#7f8c8d'
  };

  const ctx2 = document.getElementById('moodPieChart');
  if (moodChart2) moodChart2.destroy();
  moodChart2 = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: pieLabels,
      datasets: [{
        data: pieData,
        backgroundColor: pieLabels.map(l => colors[l] || '#8aaa8a'),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 } } }
      }
    }
  });
}

function renderInsights() {
  const moods = getData('moods');
  const container = document.getElementById('moodInsights');
  container.innerHTML = '';

  if (moods.length === 0) {
    container.innerHTML = '<p class="empty-state">Log some moods to see insights.</p>';
    return;
  }

  const week = moods.filter(m => {
    const diff = (Date.now() - new Date(m.date)) / (1000*60*60*24);
    return diff <= 7;
  });
  const month = moods.filter(m => {
    const diff = (Date.now() - new Date(m.date)) / (1000*60*60*24);
    return diff <= 30;
  });

  const weekAvg = week.length
    ? (week.reduce((s,m) => s + moodScore(m.mood), 0) / week.length).toFixed(1)
    : '—';
  const monthAvg = month.length
    ? (month.reduce((s,m) => s + moodScore(m.mood), 0) / month.length).toFixed(1)
    : '—';

  const counts = {};
  moods.forEach(m => { counts[m.mood] = (counts[m.mood] || 0) + 1; });
  const topMood = Object.entries(counts).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';

  const items = [
    { val: weekAvg + '/10', label: '7-day Avg Mood' },
    { val: monthAvg + '/10', label: '30-day Avg Mood' },
    { val: moodEmoji(topMood) + ' ' + topMood, label: 'Most Common Mood' },
    { val: moods.length, label: 'Total Entries' },
    { val: week.length, label: 'Entries This Week' },
    { val: month.length, label: 'Entries This Month' }
  ];

  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'insight-item';
    el.innerHTML = `<span class="insight-val">${item.val}</span><span class="insight-label">${item.label}</span>`;
    container.appendChild(el);
  });
}

function exportMoodData() {
  const moods = getData('moods');
  if (!moods.length) { alert('No mood data to export.'); return; }

  const rows = ['Date,Mood,Score,Intensity,Note'];
  moods.forEach(m => {
    rows.push([
      new Date(m.date).toLocaleString(),
      m.mood,
      moodScore(m.mood),
      m.intensity || '',
      `"${(m.note || '').replace(/"/g, '""')}"`
    ].join(','));
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'serenity_mood_data.csv';
  a.click();
}
