// ─────────────────────────────────────────────────────────────
// Sewer Expo Game — shared config
// Every page (index.html, host.html, screen.html) reads from here.
// To set up the game you only need to edit ROUNDS at the bottom.
// ─────────────────────────────────────────────────────────────

// Same Firebase project as the Expo Wall. The game keeps its data under
// the "games" collection, so it never touches the wall's posts.
export const firebaseConfig = {
  apiKey: "AIzaSyBO0Sk_lzPrnK5cZABusQBDas_wjde3gZk",
  authDomain: "sewer-expo-social-wall.firebaseapp.com",
  projectId: "sewer-expo-social-wall",
  storageBucket: "sewer-expo-social-wall.firebasestorage.app",
  messagingSenderId: "403538112744",
  appId: "1:403538112744:web:3eb13e389c35a0cece195d"
};

export const GAME = {
  // Change the id to run a fresh game without deleting an old one
  // (e.g. "expo-2026-day2"). Players, answers and scores live under it.
  id: "expo-2026",

  title: "What Lies Beneath",
  subtitle: "See the Pipe, Make the Call, Live with the Consequences",
  eventLine1: "2026 OMAG Sanitary Sewer Expo",
  eventLine2: "Stride Bank Center, Enid",
  logo: "images/Sewer Expo Logo - white.png",

  // Public URL of the player page (index.html), shown as a QR in the lobby.
  // Leave "" to auto-detect from wherever screen.html is hosted.
  joinUrl: "",

  // Scoring (every player's points go to their team)
  defaultTimeLimit: 20,   // seconds per question unless the question sets its own
  basePoints: 500,        // for a correct answer
  speedBonus: 500,        // up to this much more for answering fast (scales to 0 at the buzzer)
  streakBonus: 100,       // per fully-correct answer in a row after the first...
  streakBonusMax: 300,    // ...capped here
  // Pick-all-that-apply questions give partial credit:
  // (right picks − wrong picks) ÷ number of right answers, never below zero.

  // Confidence wager: when true, each player's confidence (1–5) after a video
  // scales their points for the rest of that round — bigger reward when right,
  // a penalty when wrong. Off = confidence is just a room poll (bell curve).
  confidenceWager: false,
  wager: {           // right = multiplier on points earned, wrong = points lost on a 0-credit answer
    1: { right: 0.8, wrong: 0 },
    2: { right: 0.9, wrong: 0 },
    3: { right: 1.0, wrong: 0 },
    4: { right: 1.2, wrong: -100 },
    5: { right: 1.4, wrong: -200 }
  },

  // Team standings: "average" (fair when teams are uneven) or "total"
  teamScoring: "average",

  // Host page moves to the reveal on its own when the timer runs out
  // or everyone has answered
  autoReveal: true,

  maxNameLength: 24
};

// Players pick one of these when they join. id must be unique and stay
// the same once the game starts; name and color can change any time.
export const TEAMS = [
  { id: "force-main",   name: "Force Main",    color: "#d49c61" },
  { id: "lift-station", name: "Lift Station",  color: "#5b9bd5" },
  { id: "manhole",      name: "Manhole Crew",  color: "#6cc08b" },
  { id: "grease-trap",  name: "Grease Trap",   color: "#e06c5a" }
];

// The decision key — shown in the lobby, on the "How serious" question,
// and behind the Key button on every phone.
export const DECISIONS = [
  { label: "Watch it",    emoji: "🟢", color: "#4fbf7f", meaning: "Acceptable condition; monitor it" },
  { label: "Maintain it", emoji: "🟡", color: "#e8c14f", meaning: "Clean, root cut, investigate, etc." },
  { label: "Fix it",      emoji: "🟠", color: "#e8893a", meaning: "Rehab/spot repair should be planned" },
  { label: "Act now",     emoji: "🔴", color: "#e0614f", meaning: "High likelihood/consequence of failure" }
];

// The questions asked after EVERY video, in order.
//   multi: true   → pick all that apply (partial credit)
//   scale: true   → 1–5 rating, not scored; the reveal shows a bell curve
//   time          → seconds for this question
export const ROUND_QUESTIONS = [
  {
    id: "confidence",
    q: "How confident are you?",
    scale: true,
    time: 15,
    low: "Not sure at all",
    high: "Very confident",
    choices: ["1", "2", "3", "4", "5"]
  },
  {
    id: "seen",
    q: "What did you see?",
    multi: true,
    time: 30,
    choices: ["Roots", "Offset(s)", "Crack", "Infiltration", "Collapse", "Protruding taps", "Grease"]
  },
  {
    id: "serious",
    q: "How serious is it?",
    time: 20,
    choices: DECISIONS
  },
  {
    id: "action",
    q: "What would you do?",
    time: 20,
    choices: ["Clean", "Root removal", "Point repair", "Replace line", "Investigate further", "No action"]
  }
];

// ─────────────────────────────────────────────────────────────
// ROUNDS — one per video. The video plays on the big screen, then
// the three questions above are asked about it.
//
//   title    shown on screen ("Video 1", or a location name)
//   video    { src: "video/clip1.mp4" }                 file in /video
//            { youtube: "VIDEO_ID", start: 0, end: 45 }  YouTube (start/end optional)
//   answers  correct answers, written exactly as the choice labels above
//            (capitals don't matter). "seen" can list several.
//   explain  optional one-liners shown on the screen at each reveal
//   notes    optional presenter cues, shown only on the admin page:
//            { video, confidence, seen, serious, action } — each a string, or
//            { say, ask, reveal, land } like the AI Control Room cue cards
//
// SAMPLE — replace with the real videos and answers.
// ─────────────────────────────────────────────────────────────
export const ROUNDS = [
  {
    title: "Video 1",
    video: { src: "video/sample.mp4" },
    answers: {
      seen: ["Roots", "Crack"],
      serious: "Maintain it",
      action: "Root removal"
    },
    explain: {
      serious: "Sample note — roots and a minor crack: clean it and keep an eye on it."
    },
    notes: {
      video: { say: "Sample cue — watch for what's coming in at the joints." },
      serious: { ask: "Sample cue — who picked Act Now? Why?", land: "Sample cue — roots come back; maintenance plan matters." }
    }
  },
  {
    title: "Video 2",
    video: { src: "video/sample.mp4" },
    answers: {
      seen: ["Offset(s)", "Infiltration"],
      serious: "Fix it",
      action: "Point repair"
    }
  }
];
