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
  //   • Points for EACH correct pick (e.g. Roots + Crack both right = 200).
  //   • Any incorrect pick on a question = 0 points for that question,
  //     even if the correct ones were picked too.
  //   • A question with more than one accepted answer (e.g. Maintain it OR Fix it)
  //     scores full points for picking any one of them.
  defaultTimeLimit: 120,  // seconds per question (2 min for table discussion); a question can set its own "time"
  basePoints: 100,        // per correct answer
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
  adminCode: "admin",

  // false = the admin page opens straight in, no password (firestore.rules must
  // match: isGameHost() returns request.auth != null). true = moderator login.
  adminLogin: false
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
    q: "How confident is your team?",
    scale: true,            // phones get a 1–5 slider
    time: 45,               // seconds
    low: "Not confident",
    high: "Extremely confident",
    choices: ["1", "2", "3", "4", "5"]
  },
  {
    id: "seen",
    q: "What did you see?",
    multi: true,
    time: 60,               // seconds
    choices: ["Roots", "Offset(s)", "Crack", "Protruding taps", "Grease", "Belly/Sag"]
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
// PRACTICE — warm-up questions before the first video, so the room gets
// used to answering on their phones. Never scored. No video.
// ─────────────────────────────────────────────────────────────
export const PRACTICE = {
  title: "Practice",
  time: 45,                 // seconds per practice question
  questions: [
    {
      q: "How many people at your table have watched an actual sewer CCTV inspection?",
      choices: ["Nobody", "1–2 people", "3–5 people", "6 or more people"]
    },
    {
      q: "How many years of sewer experience does your table have combined?",
      choices: ["Less than 25 years", "25–50 years", "51–100 years", "Over 100 years — we've seen some things!"]
    }
  ]
};

// ─────────────────────────────────────────────────────────────
// ROUNDS — one per video, in the order they're played. The video plays on
// the big screen, then the questions above are asked about it.
//
//   title    shown on screen and in the admin run of show
//   video    { src: "video/<file name>.mp4" }            file in /video
//            { youtube: "VIDEO_ID", start: 0, end: 45 }   YouTube (start/end optional)
//   answers  correct answers, written exactly as the choice labels above
//            (capitals don't matter). Any question can list several:
//              seen    → every item that's in the video (points for each one)
//              serious → every acceptable call (any one of them scores)
//            Leave a question out of answers and it's asked as an unscored poll:
//            the room still votes and sees the results, nobody gets points.
//   explain  optional one-liners shown on the screen at each reveal
//   extra    true = a spare video "just in case": it's skipped unless you click
//            it in the admin run of show; if played, its points count and Next
//            goes on to the final standings
// ─────────────────────────────────────────────────────────────
export const ROUNDS = [
  {
    title: "Bartlesville 2",
    video: { src: "video/Bartlesville 2 - Edit - Final.mp4" },
    answers: { seen: ["Crack", "Roots"], serious: ["Maintain it", "Fix it"] }
  },
  {
    title: "Bartlesville 2A",
    video: { src: "video/Bartlesville 2A - Edit - Final.mp4" },
    answers: { seen: ["Offset(s)", "Belly/Sag"], serious: ["Fix it"] }
  },
  {
    title: "Mellenson",
    video: { src: "video/Mellenson - Edit - Final.mp4" },
    answers: { seen: ["Grease", "Roots", "Crack", "Offset(s)"], serious: ["Act now"] }
  },
  {
    title: "Barnsdall",
    video: { src: "video/Barnsdall - Edit - Final.mp4" },
    answers: { seen: ["Crack", "Roots", "Offset(s)"], serious: ["Act now"] }
  },
  {
    title: "Yale",
    extra: true,                                        // spare video, only if there's time
    video: { src: "video/Yale - Edit - Final.mp4" },
    answers: { seen: ["Offset(s)", "Protruding taps"], serious: ["Fix it"] }
  }
];

// Played after the winner is revealed to close the session. Not scored,
// no questions. Plays with sound (see README: click the screen once at setup).
// Set to null for no closing video.
export const CLOSING_VIDEO = {
  title: "Smittle",
  src: "video/Smittle - Edit - Final.mp4",
  // Final slide after the video ends: each entry is its own line
  endText: [
    "You can inspect your sewer lines on your terms.",
    "Or you may end up watching the consequences on someone else's."
  ]
};
