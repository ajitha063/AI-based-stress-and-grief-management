// utils.js — Shared utilities across all pages

/* ---- Auth Guard ---- */
function getUser() {
  const u = sessionStorage.getItem('serenity_user');
  if (!u) { window.location.href = '../index.html'; return null; }
  return JSON.parse(u);
}

function logout() {
  sessionStorage.removeItem('serenity_user');
  window.location.href = '../index.html';
}

/* ---- Sidebar User ---- */
function initSidebar() {
  const user = getUser();
  if (!user) return;
  const el = document.getElementById('sidebarUser');
  if (el) el.textContent = '👤 ' + user.name;
}

/* ---- Storage helpers (namespaced per user) ---- */
function storageKey(type) {
  const user = getUser();
  return `serenity_${user.id}_${type}`;
}

function getData(type) {
  return JSON.parse(localStorage.getItem(storageKey(type)) || '[]');
}

function saveData(type, data) {
  localStorage.setItem(storageKey(type), JSON.stringify(data));
}

/* ---- Modal helpers ---- */
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function showHelplines() {
  document.getElementById('helplineModal').classList.remove('hidden');
}

/* ---- Date helpers ---- */
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/* ---- Mood score map ---- */
const MOOD_SCORES = { happy: 9, calm: 7, neutral: 5, anxious: 4, sad: 3, stressed: 3, grieving: 2 };
const MOOD_EMOJIS = { happy: '😊', calm: '😌', neutral: '😐', anxious: '😟', sad: '😢', stressed: '😤', grieving: '💔' };

function moodEmoji(m) { return MOOD_EMOJIS[m] || '😐'; }
function moodScore(m) { return MOOD_SCORES[m] || 5; }

/* ---- Init on load ---- */
window.addEventListener('DOMContentLoaded', () => {
  initSidebar();

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });
});
