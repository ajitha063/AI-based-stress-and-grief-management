// chat.js — AI Chat Engine

/* ---- Response Templates ---- */
const RESPONSES = {
  stressed: [
    { text: "I can hear how much pressure you're under right now. Stress can feel overwhelming, but you don't have to carry it alone. 🌿\n\nFirst, take one slow breath with me. Then let's think about this together — what's the single biggest thing weighing on you right now?" },
    { text: "Feeling stressed is your mind's way of saying 'this matters to me' — which means you care deeply. That's actually a strength.\n\nRight now, try grounding yourself: name 5 things you can see around you. It sounds simple, but it really does help bring you back to the present moment." },
    { text: "Burnout and overwhelm are signals, not failures. Your nervous system is asking for a pause.\n\nHere's something that helps: write down everything on your mind — get it all out of your head and onto paper. Just seeing it can reduce the mental load. Would you like some breathing exercises too? 🫁" }
  ],
  anxious: [
    { text: "Anxiety can make everything feel more urgent and threatening than it actually is. Your feelings are completely valid — and manageable. 💙\n\nTry this: breathe in slowly for 4 seconds, hold for 4, breathe out for 6. The extended exhale activates your body's natural calming response." },
    { text: "I understand — anxiety has a way of convincing us that worst-case scenarios are certain. But you've gotten through difficult moments before, and you can navigate this too.\n\nWould it help to talk about what specifically is making you feel anxious?" },
    { text: "When anxiety spikes, your body is in 'fight-or-flight' mode, even if there's no real danger. Grounding techniques can help signal safety to your nervous system.\n\nTry holding something cold, or pressing your feet firmly into the floor. These physical anchors can help bring you back to the present." }
  ],
  sad: [
    { text: "I'm really glad you reached out. Sadness deserves to be acknowledged, not pushed away.\n\nIt's okay to not be okay. Sometimes we just need to sit with how we feel before we can move forward. Is there something specific that's brought this sadness on, or has it been building for a while?" },
    { text: "Feeling sad can make the world look grey and heavy. Everything takes more effort. That's not weakness — that's what sadness does.\n\nBe gentle with yourself today. Small things matter: a warm drink, a favorite song, a brief walk. What's one tiny thing that used to bring you comfort?" },
    { text: "You don't have to explain or justify your sadness. Whatever you're feeling is real and valid.\n\nWould it help to write about what you're experiencing? Sometimes putting feelings into words — even imperfect words — can gently release some of the weight. 📝" }
  ],
  grieving: [
    { text: "I'm so deeply sorry for your loss. Grief is one of the heaviest things a person can carry, and there's no right way to grieve.\n\nPlease be patient with yourself — grief doesn't follow a timeline. Whatever you feel (or don't feel) right now is okay. I'm here with you. 💙" },
    { text: "Loss leaves a space that nothing else quite fills. Grief is love with nowhere to go.\n\nIf you'd like to share a memory of who or what you've lost, I'd be honored to listen. Sometimes speaking of those we've lost helps keep their presence alive." },
    { text: "Grief can come in waves — sometimes you're okay, and then something small brings it all rushing back. Both the calm and the waves are part of healing.\n\nPlease don't isolate yourself through this. Reaching out — even to me — takes courage. Is there someone in your life who knows what you're going through?" }
  ],
  angry: [
    { text: "Anger is a valid emotion — often it points to something important that's been violated: a boundary, an expectation, a value.\n\nBefore you do or say anything you might regret, give yourself some space. Even 10 minutes can change your response significantly. What happened?" },
    { text: "It sounds like something has really upset you. I hear you.\n\nAnger often has sadness, fear, or hurt underneath it. Sometimes asking 'what am I really feeling?' can reveal what needs to be addressed. What's going on?" }
  ],
  happy: [
    { text: "That's wonderful to hear! Positive moments deserve to be celebrated and savored. 🌟\n\nHold on to this feeling — what's brought you to this good place? I'd love to hear about it." },
    { text: "I'm genuinely glad you're feeling good! It's important to acknowledge and appreciate these moments.\n\nIs there something specific that's lifted your spirits, or is it more of a general sense of well-being?" }
  ],
  calm: [
    { text: "It's lovely that you're feeling calm. Moments of peace are precious — they restore and recharge us.\n\nIs there anything you'd like to talk through while you're in this centered space? Sometimes calm moments are great for reflection. 🌿" }
  ],
  neutral: [
    { text: "Thank you for reaching out. I'm here and I'm listening.\n\nHow are things going for you today? You can share anything that's on your mind — big or small." },
    { text: "Hello, I'm glad you're here. I'm Serenity, and I'm designed to listen, support, and help you find tools for whatever you're going through.\n\nWhat would you like to talk about today?" }
  ]
};

const FOLLOWUP_SUGGESTIONS = {
  stressed:  ['🫁 Try a breathing exercise', '📝 Journal your thoughts', '🧘 See coping techniques'],
  anxious:   ['🫁 4-7-8 Breathing', '🌱 Grounding exercise', '📊 Track this feeling'],
  sad:       ['📝 Write in journal', '🎵 Music for comfort', '📊 Log your mood'],
  grieving:  ['💬 Keep talking', '📝 Write about memories', '🆘 Professional support'],
  angry:     ['🫁 Calm down breathing', '📝 Express it in writing', '🧘 Body scan meditation'],
  happy:     ['📊 Log this good feeling', '📝 Capture this moment', '🌟 Affirmations'],
  calm:      ['📝 Reflect in journal', '🧘 Maintain this calm', '📊 Track this mood']
};

/* ---- State ---- */
let chatHistory = [];
let isTyping = false;

/* ---- DOM helpers ---- */
const messagesEl = () => document.getElementById('chatMessages');

function appendMessage(text, role, showSuggestions = null) {
  const wrap = document.createElement('div');
  wrap.className = `message ${role === 'user' ? 'user-message' : 'bot-message'}`;

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  // Convert line breaks to paragraphs
  text.split('\n\n').forEach(para => {
    if (para.trim()) {
      const p = document.createElement('p');
      p.textContent = para.trim();
      bubble.appendChild(p);
    }
  });

  const time = document.createElement('span');
  time.className = 'message-time';
  time.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  wrap.appendChild(bubble);
  wrap.appendChild(time);

  // Suggestion chips
  if (showSuggestions && showSuggestions.length) {
    const chips = document.createElement('div');
    chips.className = 'chat-suggestions';
    chips.style.marginTop = '8px';
    showSuggestions.forEach(s => {
      const btn = document.createElement('button');
      btn.textContent = s;
      btn.onclick = () => handleSuggestionChip(s);
      chips.appendChild(btn);
    });
    wrap.appendChild(chips);
  }

  messagesEl().appendChild(wrap);
  messagesEl().scrollTop = messagesEl().scrollHeight;
  return wrap;
}

function handleSuggestionChip(text) {
  if (text.includes('breathing')) {
    window.location.href = 'suggestions.html?type=breathing';
  } else if (text.includes('journal') || text.includes('writing') || text.includes('write')) {
    window.location.href = 'journal.html';
  } else if (text.includes('mood') || text.includes('Log')) {
    window.location.href = 'mood.html';
  } else if (text.includes('support')) {
    showHelplines();
  } else if (text.includes('technique') || text.includes('Grounding') || text.includes('coping')) {
    window.location.href = 'suggestions.html';
  } else if (text.includes('music')) {
    window.location.href = 'suggestions.html';
  } else {
    quickPrompt(text);
  }
}

function showTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'message bot-message bot-typing';
  wrap.id = 'typingIndicator';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  [0,1,2].forEach(() => {
    const dot = document.createElement('div');
    dot.className = 'typing-dot';
    bubble.appendChild(dot);
  });
  wrap.appendChild(bubble);
  messagesEl().appendChild(wrap);
  messagesEl().scrollTop = messagesEl().scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

/* ---- Generate AI response ---- */
function generateResponse(userText, emotion) {
  const pool = RESPONSES[emotion] || RESPONSES.neutral;
  // Pick based on conversation variety
  const idx = chatHistory.length % pool.length;
  return pool[idx].text;
}

/* ---- Main send ---- */
async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || isTyping) return;

  input.value = '';
  autoResize(input);
  document.getElementById('emotionIndicator').textContent = '';
  document.getElementById('crisisAlert').classList.add('hidden');

  // Append user message
  appendMessage(text, 'user');
  chatHistory.push({ role: 'user', text, time: Date.now() });

  // Detect emotion
  const result = NLP.detectEmotion(text);
  const emotion = result.emotion;

  // Show emotion indicator
  const emojiMap = { stressed:'😤', anxious:'😟', sad:'😢', grieving:'💔', angry:'😠', happy:'😊', calm:'😌', neutral:'😐' };
  if (emotion !== 'neutral') {
    document.getElementById('emotionIndicator').textContent =
      `Detected feeling: ${emojiMap[emotion] || ''} ${emotion}`;
  }

  // Crisis check
  if (result.isCrisis) {
    document.getElementById('crisisAlert').classList.remove('hidden');
  }

  // Log mood automatically
  const moods = getData('moods');
  moods.push({
    mood: emotion === 'neutral' ? 'neutral' : emotion,
    source: 'chat',
    date: new Date().toISOString(),
    note: text.substring(0, 80)
  });
  saveData('moods', moods);

  // Update chat count
  const stats = JSON.parse(localStorage.getItem(storageKey('stats')) || '{}');
  stats.chats = (stats.chats || 0) + 1;
  localStorage.setItem(storageKey('stats'), JSON.stringify(stats));

  // Simulate AI thinking
  isTyping = true;
  showTyping();
  const delay = 1200 + Math.random() * 800;

  await new Promise(r => setTimeout(r, delay));
  removeTyping();

  const response = generateResponse(text, emotion);
  const suggestions = result.isCrisis
    ? ['🆘 Crisis helplines', '💬 Keep talking']
    : (FOLLOWUP_SUGGESTIONS[emotion] || []);

  appendMessage(response, 'bot', suggestions.length ? suggestions : null);
  chatHistory.push({ role: 'bot', text: response, time: Date.now() });
  isTyping = false;
}

function quickPrompt(text) {
  document.getElementById('chatInput').value = text;
  sendMessage();
}

function handleChatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function clearChat() {
  const msgs = document.getElementById('chatMessages');
  msgs.innerHTML = '';
  chatHistory = [];
  appendMessage("Hi again! I'm here whenever you're ready to talk. How are you feeling right now? 🌿", 'bot');
}

/* ---- Load chat history from storage ---- */
function loadChatFromStorage() {
  // We keep chat ephemeral (session only) for privacy
}

window.addEventListener('DOMContentLoaded', loadChatFromStorage);
