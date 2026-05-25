// journal.js

const PROMPTS = [
  "What is one thing that happened today that you're grateful for?",
  "Describe a moment this week when you felt at peace.",
  "What emotion has been most present lately, and why do you think that is?",
  "Write a letter to your future self about what you're going through right now.",
  "What is one thing you need to forgive yourself for?",
  "If your best friend were feeling what you're feeling, what would you tell them?",
  "What small thing could you do tomorrow to take care of yourself?",
  "Describe a memory that brings you comfort.",
  "What are three things that made you smile this week, even briefly?",
  "What would 'healing' look like for you right now?",
  "Write about someone who has helped you through a difficult time.",
  "What fears are you carrying that you haven't spoken aloud?",
  "What does your ideal day of rest and recovery look like?",
  "If your emotions had a color and texture right now, what would they be?",
  "What is one thing you've learned about yourself through difficulty?"
];

let currentEntryId = null;
let allEntries = [];

window.addEventListener('DOMContentLoaded', () => {
  getUser();
  setDate();
  newPrompt();
  loadEntries();
});

function setDate() {
  document.getElementById('journalDateDisplay').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function newPrompt() {
  const text = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  document.getElementById('promptText').textContent = text;
}

function updateWordCount() {
  const text = document.getElementById('journalContent').value;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  document.getElementById('wordCount').textContent = words + (words === 1 ? ' word' : ' words');
}

function saveEntry() {
  const title = document.getElementById('journalTitle').value.trim() || 'Untitled entry';
  const content = document.getElementById('journalContent').value.trim();
  const mood = document.getElementById('journalMoodTag').value;

  if (!content) { alert('Please write something before saving.'); return; }

  const entries = getData('journals');
  const entry = {
    id: 'j_' + Date.now(),
    title,
    content,
    mood,
    date: new Date().toISOString(),
    wordCount: content.trim().split(/\s+/).length
  };

  entries.unshift(entry);
  saveData('journals', entries);

  clearEntry();
  loadEntries();

  // Brief flash feedback
  const btn = document.querySelector('.journal-actions .btn-primary');
  const orig = btn.textContent;
  btn.textContent = '✓ Saved!';
  setTimeout(() => btn.textContent = orig, 2000);
}

function clearEntry() {
  document.getElementById('journalTitle').value = '';
  document.getElementById('journalContent').value = '';
  document.getElementById('journalMoodTag').value = '';
  document.getElementById('wordCount').textContent = '0 words';
  currentEntryId = null;
  newPrompt();
}

function loadEntries(filter = '') {
  allEntries = getData('journals');
  renderEntryList(allEntries, filter);
}

function renderEntryList(entries, filter = '') {
  const container = document.getElementById('entryList');
  container.innerHTML = '';

  let filtered = entries;
  if (filter) {
    const q = filter.toLowerCase();
    filtered = entries.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q)
    );
  }

  if (!filtered.length) {
    container.innerHTML = '<p class="empty-state">No entries found.</p>';
    return;
  }

  filtered.forEach(entry => {
    const el = document.createElement('div');
    el.className = 'entry-item';
    el.onclick = () => openEntry(entry.id);
    el.innerHTML = `
      <div class="entry-item-title">${entry.title}</div>
      <div class="entry-item-date">${formatDate(entry.date)}</div>
      <div class="entry-item-preview">${entry.content.substring(0, 90)}${entry.content.length > 90 ? '…' : ''}</div>
      ${entry.mood ? `<div class="entry-item-mood">${moodEmoji(entry.mood)} ${entry.mood}</div>` : ''}
    `;
    container.appendChild(el);
  });
}

function searchEntries(q) {
  renderEntryList(allEntries, q);
}

function openEntry(id) {
  const entry = allEntries.find(e => e.id === id);
  if (!entry) return;
  currentEntryId = id;

  document.getElementById('modalDate').textContent = formatDate(entry.date);
  document.getElementById('modalTitle').textContent = entry.title;
  document.getElementById('modalMood').textContent = entry.mood ? `${moodEmoji(entry.mood)} ${entry.mood}` : '';
  document.getElementById('modalText').textContent = entry.content;

  document.getElementById('entryModal').classList.remove('hidden');
}

function deleteCurrentEntry() {
  if (!currentEntryId) return;
  if (!confirm('Delete this journal entry? This cannot be undone.')) return;

  let entries = getData('journals');
  entries = entries.filter(e => e.id !== currentEntryId);
  saveData('journals', entries);
  currentEntryId = null;
  closeModal('entryModal');
  loadEntries();
}
