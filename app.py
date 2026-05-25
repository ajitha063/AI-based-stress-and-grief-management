"""
Serenity — AI Grief & Stress Management Assistant
Flask Backend API
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import bcrypt
import jwt
import os
import json
import re
import google.generativeai as genai
genai.configure(api_key="AIzaSyDxivXeD_w6KIsjkV--phiZqa0inim7cTo")
generation_config = {
    "temperature": 1.0,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 200,
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=generation_config
)
from datetime import datetime, timedelta
from functools import wraps

# ── Config ──────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app, origins=["*"])

SECRET_KEY = os.environ.get("SERENITY_SECRET", "serenity-secret-key-change-in-production")
DB_PATH = os.path.join(os.path.dirname(__file__), 'database', 'serenity.db')

# ── Database ─────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS moods (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                mood TEXT NOT NULL,
                intensity INTEGER DEFAULT 5,
                note TEXT,
                source TEXT DEFAULT 'tracker',
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS journals (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT,
                content TEXT NOT NULL,
                mood_tag TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS chat_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                message TEXT NOT NULL,
                role TEXT NOT NULL,
                emotion_detected TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        """)
    print("✅ Database initialized")

# ── Auth helpers ──────────────────────────────────────────────────────────────
def generate_id(prefix=''):
    import uuid
    return prefix + str(uuid.uuid4())[:8]

def make_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        token = auth.replace("Bearer ", "").strip()
        if not token:
            return jsonify({"error": "Missing token"}), 401
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.user_id = data["user_id"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated

# ── NLP Module ─────────────────────────────────────────────────────────────────
LEXICON = {
    "stressed":  ["stress","stressed","overwhelm","overwhelmed","pressure","tense","deadline",
                  "burnout","burned out","exhausted","too much","no time","rushed","hectic","frantic"],
    "anxious":   ["anxious","anxiety","nervous","worried","worry","fear","scared","afraid",
                  "panic","terrified","uneasy","dread","heart racing","chest tight","on edge","restless"],
    "sad":       ["sad","sadness","unhappy","depressed","depression","down","low","hopeless",
                  "empty","numb","tearful","crying","miserable","gloomy","heartbroken","lonely","isolated"],
    "grieving":  ["grief","grieve","grieving","loss","lost","died","death","passed away",
                  "funeral","mourning","bereaved","missing someone","never coming back"],
    "angry":     ["angry","anger","furious","rage","mad","irritated","frustrated","annoyed",
                  "resentment","bitter","hate","outraged"],
    "happy":     ["happy","happiness","glad","joyful","joy","excited","great","wonderful",
                  "amazing","fantastic","positive","hopeful","grateful","content","peaceful"],
    "calm":      ["calm","relaxed","peaceful","serene","tranquil","at ease","balanced","okay","fine"]
}

CRISIS_KEYWORDS = [
    "kill myself","end my life","suicide","want to die","don't want to live",
    "no reason to live","better off dead","hurt myself","self harm","cut myself",
    "overdose","take my life","end it all","can't go on","give up on life"
]

def detect_emotion(text: str) -> dict:
    text_lower = text.lower()
    scores = {}
    for emotion, keywords in LEXICON.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        scores[emotion] = score

    total = sum(scores.values())
    if total == 0:
        return {"emotion": "neutral", "confidence": 0, "scores": scores, "is_crisis": False}

    top_emotion = max(scores, key=scores.get)
    confidence = round((scores[top_emotion] / total) * 100) if total else 0
    is_crisis = any(kw in text_lower for kw in CRISIS_KEYWORDS)

    return {
        "emotion": top_emotion if scores[top_emotion] > 0 else "neutral",
        "confidence": confidence,
        "scores": scores,
        "is_crisis": is_crisis
    }

# ── Response Engine ───────────────────────────────────────────────────────────
RESPONSES = {
    "stressed": [
        "I can hear how much pressure you're under. Stress can feel overwhelming, but you don't have to carry it alone. 🌿\n\nFirst, take one slow breath. Then let's think — what's the single biggest thing weighing on you right now?",
        "Burnout and overwhelm are signals, not failures. Your nervous system is asking for a pause.\n\nTry writing everything on your mind onto paper. Getting it out of your head can reduce the mental load significantly.",
    ],
    "anxious": [
        "Anxiety can make everything feel more urgent than it actually is. Your feelings are completely valid. 💙\n\nTry this: breathe in for 4 seconds, hold for 4, breathe out for 6. The extended exhale activates your body's natural calming response.",
        "When anxiety spikes, your body is in 'fight-or-flight' mode even without real danger. Grounding techniques can help signal safety.\n\nTry pressing your feet firmly into the floor and naming 5 things you can see.",
    ],
    "sad": [
        "I'm really glad you reached out. Sadness deserves to be acknowledged, not pushed away.\n\nIt's okay to not be okay. Sometimes we just need to sit with how we feel. Is there something specific that's brought this sadness on?",
        "You don't have to explain or justify your sadness. Whatever you're feeling is real and valid.\n\nWould it help to write about what you're experiencing? Putting feelings into words can gently release some of the weight. 📝",
    ],
    "grieving": [
        "I'm so deeply sorry for your loss. Grief is one of the heaviest things a person can carry, and there's no right way to grieve.\n\nPlease be patient with yourself — grief doesn't follow a timeline. I'm here with you. 💙",
        "Loss leaves a space that nothing else quite fills. Grief is love with nowhere to go.\n\nIf you'd like to share a memory of who you've lost, I'd be honored to listen.",
    ],
    "angry": [
        "Anger is a valid emotion — it often points to something important that's been violated.\n\nGive yourself space before responding to anything. Even 10 minutes can change how you handle it. What happened?",
    ],
    "happy": [
        "That's wonderful to hear! 🌟 Positive moments deserve to be celebrated and savored.\n\nHold onto this feeling — what's brought you to this good place?",
    ],
    "calm": [
        "It's lovely that you're feeling calm. Moments of peace are precious and restorative. 🌿\n\nIs there anything you'd like to reflect on or talk through while you're in this centered space?",
    ],
    "neutral": [
        "Thank you for reaching out. I'm here and I'm listening.\n\nHow are things going for you today? You can share anything — big or small.",
        "Hello, I'm Serenity. I'm here to listen and support you through whatever you're going through.\n\nWhat would you like to talk about today?",
    ]
}

import random
def generate_response(text: str, emotion: str) -> str:
    pool = RESPONSES.get(emotion, RESPONSES["neutral"])
    return random.choice(pool)

# ═══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

# Serve frontend
@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../frontend', path)

# ── Auth ──────────────────────────────────────────────────────────────────────
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not all([name, email, password]):
        return jsonify({"error": "All fields required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password too short"}), 400

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user_id = generate_id('u_')

    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
                (user_id, name, email, pw_hash)
            )
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already registered"}), 409

    token = make_token(user_id)
    return jsonify({"token": token, "user": {"id": user_id, "name": name, "email": email}}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if not user or not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
        return jsonify({"error": "Invalid credentials"}), 401

    token = make_token(user['id'])
    return jsonify({"token": token, "user": {"id": user['id'], "name": user['name'], "email": user['email']}})

# ── Chat ──────────────────────────────────────────────────────────────────────
@app.route('/api/chat', methods=['POST'])
@token_required
def chat():
    data = request.get_json()
    message = data.get('message', '').strip()

    if not message:
        return jsonify({"error": "Message required"}), 400

    # Detect emotion
    result = detect_emotion(message)
    emotion = result['emotion']

    # Gemini AI Prompt
    prompt = f"""
You are Serenity, a warm and emotionally intelligent AI mental wellness assistant.

Your job is to respond naturally like a caring supportive friend and therapist combined.

IMPORTANT RULES:
- Never repeat the same sentences.
- Make every reply unique and conversational.
- Respond directly to the user's exact situation.
- Sound human, calm, empathetic, and emotionally aware.
- Keep replies short to medium length.
- Avoid robotic phrases.
- Ask thoughtful follow-up questions sometimes.
- Give emotional comfort and practical support.

Detected emotion: {emotion}

User message: {message}

Now give a fresh and unique supportive response.
"""

    # Generate AI response
    ai_response = model.generate_content(prompt)
    response = ai_response.text

    # Save to database
    with get_db() as conn:
        mid = generate_id('c_')

        conn.execute(
            "INSERT INTO chat_logs (id, user_id, message, role, emotion_detected) VALUES (?, ?, ?, ?, ?)",
            (mid, request.user_id, message, 'user', emotion)
        )

        rid = generate_id('c_')

        conn.execute(
            "INSERT INTO chat_logs (id, user_id, message, role, emotion_detected) VALUES (?, ?, ?, ?, ?)",
            (rid, request.user_id, response, 'bot', emotion)
        )

        # Auto log mood
        conn.execute(
            "INSERT INTO moods (id, user_id, mood, source) VALUES (?, ?, ?, ?)",
            (generate_id('m_'), request.user_id, emotion, 'chat')
        )

    return jsonify({
        "response": response,
        "emotion": emotion,
        "confidence": result['confidence'],
        "is_crisis": result['is_crisis']
    })
# ── Moods ──────────────────────────────────────────────────────────────────────
@app.route('/api/moods', methods=['GET'])
@token_required
def get_moods():
    days = request.args.get('days', 30, type=int)
    with get_db() as conn:
        moods = conn.execute(
            "SELECT * FROM moods WHERE user_id = ? AND created_at >= datetime('now', ?) ORDER BY created_at DESC",
            (request.user_id, f'-{days} days')
        ).fetchall()
    return jsonify([dict(m) for m in moods])

@app.route('/api/moods', methods=['POST'])
@token_required
def log_mood():
    data = request.get_json()
    mood = data.get('mood', '')
    if not mood:
        return jsonify({"error": "Mood required"}), 400

    mid = generate_id('m_')
    with get_db() as conn:
        conn.execute(
            "INSERT INTO moods (id, user_id, mood, intensity, note, source) VALUES (?, ?, ?, ?, ?, ?)",
            (mid, request.user_id, mood, data.get('intensity', 5), data.get('note', ''), data.get('source', 'tracker'))
        )
    return jsonify({"id": mid, "mood": mood}), 201

@app.route('/api/moods/stats', methods=['GET'])
@token_required
def mood_stats():
    SCORES = {'happy': 9, 'calm': 7, 'neutral': 5, 'anxious': 4, 'sad': 3, 'stressed': 3, 'grieving': 2}

    with get_db() as conn:
        all_moods = conn.execute(
            "SELECT mood, created_at FROM moods WHERE user_id = ? ORDER BY created_at",
            (request.user_id,)
        ).fetchall()

    moods = [dict(m) for m in all_moods]
    if not moods:
        return jsonify({"total": 0, "week_avg": None, "month_avg": None, "distribution": {}})

    now = datetime.utcnow()
    week = [m for m in moods if (now - datetime.fromisoformat(m['created_at'])).days <= 7]
    month = [m for m in moods if (now - datetime.fromisoformat(m['created_at'])).days <= 30]

    distribution = {}
    for m in moods:
        distribution[m['mood']] = distribution.get(m['mood'], 0) + 1

    week_avg = sum(SCORES.get(m['mood'], 5) for m in week) / len(week) if week else None
    month_avg = sum(SCORES.get(m['mood'], 5) for m in month) / len(month) if month else None

    return jsonify({
        "total": len(moods),
        "week_avg": round(week_avg, 1) if week_avg else None,
        "month_avg": round(month_avg, 1) if month_avg else None,
        "distribution": distribution
    })

# ── Journals ──────────────────────────────────────────────────────────────────
@app.route('/api/journals', methods=['GET'])
@token_required
def get_journals():
    with get_db() as conn:
        entries = conn.execute(
            "SELECT * FROM journals WHERE user_id = ? ORDER BY created_at DESC",
            (request.user_id,)
        ).fetchall()
    return jsonify([dict(e) for e in entries])

@app.route('/api/journals', methods=['POST'])
@token_required
def create_journal():
    data = request.get_json()
    content = data.get('content', '').strip()
    if not content:
        return jsonify({"error": "Content required"}), 400

    jid = generate_id('j_')
    with get_db() as conn:
        conn.execute(
            "INSERT INTO journals (id, user_id, title, content, mood_tag) VALUES (?, ?, ?, ?, ?)",
            (jid, request.user_id, data.get('title', 'Untitled'), content, data.get('mood_tag', ''))
        )
    return jsonify({"id": jid}), 201

@app.route('/api/journals/<jid>', methods=['DELETE'])
@token_required
def delete_journal(jid):
    with get_db() as conn:
        conn.execute("DELETE FROM journals WHERE id = ? AND user_id = ?", (jid, request.user_id))
    return jsonify({"deleted": True})

# ── Analyze text (NLP endpoint) ────────────────────────────────────────────────
@app.route('/api/analyze', methods=['POST'])
@token_required
def analyze():
    data = request.get_json()
    text = data.get('text', '')
    result = detect_emotion(text)
    return jsonify(result)

# ── User stats ─────────────────────────────────────────────────────────────────
@app.route('/api/stats', methods=['GET'])
@token_required
def user_stats():
    with get_db() as conn:
        chat_count = conn.execute(
            "SELECT COUNT(*) FROM chat_logs WHERE user_id = ? AND role = 'user'",
            (request.user_id,)
        ).fetchone()[0]
        journal_count = conn.execute(
            "SELECT COUNT(*) FROM journals WHERE user_id = ?",
            (request.user_id,)
        ).fetchone()[0]
        mood_count = conn.execute(
            "SELECT COUNT(*) FROM moods WHERE user_id = ?",
            (request.user_id,)
        ).fetchone()[0]

    return jsonify({
        "chat_count": chat_count,
        "journal_count": journal_count,
        "mood_count": mood_count
    })

# ── Health check ───────────────────────────────────────────────────────────────
@app.route('/api/health')
def health():
    return jsonify({"status": "ok", "service": "Serenity API"})

# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    init_db()
    print("🌿 Serenity backend starting on http://localhost:5000")
    app.run(debug=True, port=5000)
