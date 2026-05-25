// nlp.js — Client-side NLP Emotion Detection Engine

const NLP = (() => {

  /* ---- Keyword Lexicon ---- */
  const LEXICON = {
    stressed: [
      'stress','stressed','stressful','overwhelm','overwhelmed','pressure','tense','tense',
      'deadline','workload','burned out','burnout','exhausted','can\'t cope','too much',
      'no time','rushed','hectic','frantic','overloaded','panicked','panicking'
    ],
    anxious: [
      'anxious','anxiety','anxiousness','nervous','nervousness','worried','worry','worrying',
      'fear','scared','afraid','panic','terrified','uneasy','apprehensive','dread','dreading',
      'heart racing','chest tight','can\'t breathe','on edge','restless','uneasy'
    ],
    sad: [
      'sad','sadness','unhappy','depressed','depression','down','low','blue','hopeless',
      'empty','numb','tearful','crying','sobbing','miserable','gloomy','heartbroken',
      'disappointed','alone','lonely','isolated','worthless','useless','no point','despair'
    ],
    grieving: [
      'grief','grieve','grieving','loss','lost','died','death','passed away','passed on',
      'gone forever','missing someone','funeral','mourning','bereaved','bereavement',
      'can\'t get over','never coming back','heartbroken','devastated','widow','widower'
    ],
    angry: [
      'angry','anger','furious','rage','mad','livid','irritated','irritable','frustrated',
      'annoyed','resent','resentment','bitter','hate','loathe','outraged','pissed'
    ],
    happy: [
      'happy','happiness','glad','joyful','joy','excited','great','wonderful','amazing',
      'fantastic','good','positive','hopeful','grateful','thankful','content','peaceful',
      'thrilled','delighted','pleased','elated'
    ],
    calm: [
      'calm','relaxed','peaceful','serene','tranquil','at ease','balanced','centered',
      'okay','fine','alright','stable','composed'
    ]
  };

  /* ---- Crisis keywords ---- */
  const CRISIS_KEYWORDS = [
    'kill myself','end my life','suicide','want to die','don\'t want to live',
    'no reason to live','better off dead','hurt myself','self harm','cut myself',
    'overdose','take my life','end it all','can\'t go on','give up on life',
    'not worth living','disappear forever'
  ];

  /* ---- Negation words ---- */
  const NEGATIONS = ['not','never','no','don\'t','doesn\'t','didn\'t','won\'t','can\'t','cannot','neither','nor'];

  /* ---- Intensifiers ---- */
  const INTENSIFIERS = ['very','extremely','so','really','terribly','deeply','incredibly','absolutely','totally','utterly'];

  /* ---- Tokenize ---- */
  function tokenize(text) {
    return text.toLowerCase()
      .replace(/[^\w\s']/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  /* ---- Check negation window ---- */
  function isNegated(tokens, idx, window = 3) {
    for (let i = Math.max(0, idx - window); i < idx; i++) {
      if (NEGATIONS.includes(tokens[i])) return true;
    }
    return false;
  }

  /* ---- Check intensifier ---- */
  function getIntensity(tokens, idx) {
    if (idx > 0 && INTENSIFIERS.includes(tokens[idx - 1])) return 1.4;
    return 1.0;
  }

  /* ---- Score text against all emotions ---- */
  function score(text) {
    const tokens = tokenize(text);
    const rawText = text.toLowerCase();
    const scores = {};
    let total = 0;

    for (const [emotion, keywords] of Object.entries(LEXICON)) {
      let emotionScore = 0;
      for (const keyword of keywords) {
        const isPhrase = keyword.includes(' ');
        if (isPhrase) {
          if (rawText.includes(keyword)) emotionScore += 1.5;
        } else {
          const idx = tokens.indexOf(keyword);
          if (idx !== -1 && !isNegated(tokens, idx)) {
            emotionScore += getIntensity(tokens, idx);
          }
        }
      }
      scores[emotion] = emotionScore;
      total += emotionScore;
    }

    return { scores, total };
  }

  /* ---- Detect crisis ---- */
  function detectCrisis(text) {
    const t = text.toLowerCase();
    return CRISIS_KEYWORDS.some(kw => t.includes(kw));
  }

  /* ---- Primary emotion detection ---- */
  function detectEmotion(text) {
    const { scores, total } = score(text);
    if (total === 0) return { emotion: 'neutral', confidence: 0, scores };

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [topEmotion, topScore] = sorted[0];
    const confidence = total > 0 ? Math.min(topScore / total, 1) : 0;

    return {
      emotion: topScore > 0 ? topEmotion : 'neutral',
      confidence: Math.round(confidence * 100),
      scores,
      isCrisis: detectCrisis(text)
    };
  }

  /* ---- Sentiment polarity (-1 to +1) ---- */
  function sentiment(text) {
    const { scores } = score(text);
    const pos = (scores.happy || 0) + (scores.calm || 0);
    const neg = (scores.stressed || 0) + (scores.anxious || 0) +
                (scores.sad || 0) + (scores.grieving || 0) + (scores.angry || 0);
    const total = pos + neg;
    if (total === 0) return 0;
    return (pos - neg) / total;
  }

  return { detectEmotion, sentiment, detectCrisis };
})();
