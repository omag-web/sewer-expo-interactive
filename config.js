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
  joinUrl: "https://link.omag.org/what-lies-beneath",

  // Scoring (every player's points go to their team). Speed doesn't matter —
  // any answer locked in before the timer ends scores the same.
  defaultTimeLimit: 120,  // seconds per question (2 min for table discussion); a question can set its own "time"
  basePoints: 100,        // for a correct answer
  streakBonus: 0,         // optional: extra points per fully-correct answer in a row (0 = off)
  streakBonusMax: 0,      // ...capped here
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
    4: { right: 1.2, wrong: -25 },
    5: { right: 1.4, wrong: -50 }
  },

  // Team standings: "average" (fair when teams are uneven) or "total"
  teamScoring: "average",

  // Host page moves to the reveal on its own when the timer runs out
  // or everyone has answered
  autoReveal: true,

  maxNameLength: 24,

  leaderboardSize: 25,    // teams shown on the screen's standings (two columns)

  // When to stop for full-screen team standings (the finale always shows the winners).
  //   "middle"  → once, halfway through the videos
  //   [2, 4]    → after those video numbers
  standingsAfter: "middle",

  // Type this on the screen or the player page (on a keyboard, not in a text box)
  // to jump to the admin console — same idea as the AI Control Room's code word.
  adminCode: "admin"
};

// Players pick one of these when they join. Change TEAM_COUNT to add or
// remove teams; they're named "Team 1", "Team 2", … and each gets its own color.
export const TEAM_COUNT = 52;
export const TEAMS = Array.from({ length: TEAM_COUNT }, (_, i) => ({
  id: `team-${i + 1}`,
  name: `Team ${i + 1}`,
  num: i + 1,
  // golden-angle hues so neighbouring team numbers never look alike
  color: `hsl(${Math.round((i * 137.508) % 360)}, 62%, 62%)`
}));

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
//   time          → optional seconds for just this question (default: GAME.defaultTimeLimit)
export const ROUND_QUESTIONS = [
  {
    id: "confidence",
    q: "How confident are you that you know what needs to be done?",
    scale: true,
    low: "Not sure at all",
    high: "Very confident",
    choices: ["1", "2", "3", "4", "5"]
  },
  {
    id: "seen",
    q: "What did you see?",
    multi: true,
    choices: ["Roots", "Offset(s)", "Crack", "Infiltration", "Collapse", "Protruding taps", "Grease"]
  },
  {
    id: "serious",
    q: "How serious is it?",
    choices: DECISIONS
  },
  {
    id: "action",
    q: "What would you do?",
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
