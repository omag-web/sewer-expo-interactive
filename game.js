// Shared game logic for all three pages. Edit config.js, not this file.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator, doc, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, GAME, TEAMS, DECISIONS, ROUND_QUESTIONS, ROUNDS } from "./config.js";

export { GAME, TEAMS, DECISIONS, ROUNDS };

// ── Build the flat question list from ROUNDS × ROUND_QUESTIONS ──
const PALETTE = ["#d49c61", "#5b9bd5", "#6cc08b", "#c77dcc", "#e0614f", "#4fc1c1", "#e8c14f", "#9aa5b1"];
const SCALE = ["#8a8178", "#a58a6c", "#bd9264", "#d49c61", "#e9b27a"];
const norm = (s) => String(s).trim().toLowerCase();
const confAt = ROUND_QUESTIONS.findIndex((t) => t.scale);
export const QUESTIONS = ROUNDS.flatMap((r, ri) => ROUND_QUESTIONS.map((t, k) => {
  const base = ri * ROUND_QUESTIONS.length;
  const choices = t.choices.map((c, j) => {
    const o = typeof c === "string" ? { label: c } : { ...c };
    o.color = o.color || (t.scale ? SCALE[j % SCALE.length] : PALETTE[j % PALETTE.length]);
    if (t.scale) o.mark = o.label;
    return o;
  });
  const notes = r.notes || {};
  const cue = (x) => (x == null ? null : typeof x === "string" ? { say: x } : x);
  if (t.scale) return {
    id: t.id, q: t.q, scale: true, unscored: true, multi: false, time: t.time, choices, answer: [],
    low: t.low, high: t.high, explain: "",
    round: ri, roundTitle: r.title || `Video ${ri + 1}`, step: k, steps: ROUND_QUESTIONS.length,
    video: k === 0 ? r.video : null, videoNotes: k === 0 ? cue(notes.video) : null, notes: cue(notes[t.id]),
    leaderboard: k === ROUND_QUESTIONS.length - 1, confIndex: -1
  };
  const raw = r.answers ? r.answers[t.id] : undefined;
  const answer = [].concat(raw ?? []).map((a) => {
    const idx = choices.findIndex((c) => norm(c.label) === norm(a));
    if (idx < 0) console.warn(`config.js: "${a}" isn't a choice for "${t.q}" in ${r.title}`);
    return idx;
  }).filter((x) => x >= 0);
  if (!answer.length) console.warn(`config.js: no correct answer set for "${t.q}" in ${r.title}`);
  return {
    id: t.id, q: t.q, multi: !!t.multi, time: t.time, choices, answer,
    hasMeanings: choices.some((c) => c.meaning),
    explain: r.explain ? r.explain[t.id] : "",
    round: ri, roundTitle: r.title || `Video ${ri + 1}`, step: k, steps: ROUND_QUESTIONS.length,
    video: k === 0 ? r.video : null, videoNotes: k === 0 ? cue(notes.video) : null, notes: cue(notes[t.id]),
    leaderboard: k === ROUND_QUESTIONS.length - 1,
    confIndex: confAt >= 0 && confAt < k ? base + confAt : -1
  };
}));
export const qLabel = (i) => { const Q = QUESTIONS[i]; return `${Q.roundTitle} · Question ${Q.step + 1} of ${Q.steps}`; };
export const qShort = (i) => { const Q = QUESTIONS[i]; return `${Q.roundTitle} · Q${Q.step + 1}`; };
export const choiceMark = (c, k) => c.emoji || c.mark || LETTERS[k];

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Local testing only: add ?emulator=1 to any page URL.
if (new URLSearchParams(location.search).get("emulator") === "1") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export const gameRef = doc(db, "games", GAME.id);
export const playersCol = collection(db, "games", GAME.id, "players");
export const answersCol = collection(db, "games", GAME.id, "answers");
export const answerId = (uid, q) => `${uid}_${q}`;

export const $ = (id) => document.getElementById(id);
export const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
export const teamById = (id) => TEAMS.find((t) => t.id === id) || { id, name: "No team", color: "#888" };
export const timeLimitFor = (i) => (QUESTIONS[i] && QUESTIONS[i].time) || GAME.defaultTimeLimit;

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function setLogo(img) {
  if (!img || !GAME.logo) return;
  img.alt = GAME.eventLine1;
  img.onload = () => { img.hidden = false; };
  img.src = encodeURI(GAME.logo);
}

// ── Phase flow ───────────────────────────────────────────
// lobby → (video) → question → reveal → leaderboard → next question … → final
export function stepsFor(i) {
  const s = [];
  if (QUESTIONS[i].video) s.push("video");
  s.push("question", "reveal");
  if (QUESTIONS[i].leaderboard) s.push("leaderboard");
  return s;
}
export function nextStep(phase, qIndex) {
  if (phase === "lobby") return { phase: stepsFor(0)[0], qIndex: 0 };
  if (phase === "final") return null;
  const steps = stepsFor(qIndex);
  const at = steps.indexOf(phase);
  if (at < steps.length - 1) return { phase: steps[at + 1], qIndex };
  if (qIndex + 1 < QUESTIONS.length) return { phase: stepsFor(qIndex + 1)[0], qIndex: qIndex + 1 };
  return { phase: "final", qIndex };
}
export function prevStep(phase, qIndex) {
  if (phase === "lobby") return null;
  if (phase === "final") { const p = stepsFor(QUESTIONS.length - 1); return { phase: p[p.length - 1], qIndex: QUESTIONS.length - 1 }; }
  const steps = stepsFor(qIndex);
  const at = steps.indexOf(phase);
  if (at > 0) return { phase: steps[at - 1], qIndex };
  if (qIndex > 0) { const p = stepsFor(qIndex - 1); return { phase: p[p.length - 1], qIndex: qIndex - 1 }; }
  return { phase: "lobby", qIndex: 0 };
}
export function describeStep(s) {
  if (!s) return "Game over";
  if (s.phase === "final") return "Final results";
  if (s.phase === "lobby") return "Lobby";
  const Q = QUESTIONS[s.qIndex];
  const n = qShort(s.qIndex);
  return { video: `Play ${Q.roundTitle}`, question: `Open ${n}`, reveal: `Reveal ${n}`, leaderboard: "Team standings" }[s.phase];
}

// ── Scoring ──────────────────────────────────────────────
// picks: array of choice indexes. Single-choice questions are all-or-nothing;
// pick-all-that-apply gets (right − wrong) ÷ number of right answers.
export function grade(Q, picks) {
  const ans = new Set(Q.answer);
  const uniq = [...new Set(picks || [])];
  const hits = uniq.filter((p) => ans.has(p)).length;
  const wrong = uniq.length - hits;
  const exact = uniq.length > 0 && hits === ans.size && wrong === 0;
  const frac = Q.multi ? Math.max(0, (hits - wrong) / Math.max(1, ans.size)) : (exact ? 1 : 0);
  return { frac, exact, hits, wrong, total: ans.size };
}
// conf: the player's 1–5 confidence for this round (only used when GAME.confidenceWager is on)
export function pointsFor({ frac, exact, elapsedMs, limitSec, streakBefore, conf }) {
  const w = GAME.confidenceWager && conf ? GAME.wager[conf] : null;
  if (!frac) return w ? w.wrong : 0;
  const t = Math.min(1, Math.max(0, elapsedMs / (limitSec * 1000)));
  const speed = Math.round(GAME.speedBonus * (1 - t));
  const streak = exact ? Math.min(GAME.streakBonusMax, GAME.streakBonus * streakBefore) : 0;
  return Math.round((frac * (GAME.basePoints + speed) + streak) * (w ? w.right : 1));
}
export const scoredUpTo = (n) => QUESTIONS.slice(0, n).filter((q) => !q.unscored).length;

// Competition ranking: ties share a rank (1, 2, 2, 4).
export function rankPlayers(players) {
  const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0) || (a.name || "").localeCompare(b.name || ""));
  let rank = 0, prev = null;
  sorted.forEach((p, i) => {
    if (p.score !== prev) { rank = i + 1; prev = p.score; }
    p.rank = rank;
  });
  return sorted;
}

export function teamStandings(players) {
  const rows = TEAMS.map((t) => {
    const members = players.filter((p) => p.team === t.id);
    const total = members.reduce((s, p) => s + (p.score || 0), 0);
    const avg = members.length ? Math.round(total / members.length) : 0;
    return { id: t.id, name: t.name, color: t.color, players: members.length, total, avg };
  });
  const key = GAME.teamScoring === "total" ? "total" : "avg";
  rows.sort((a, b) => b[key] - a[key] || b.players - a.players);
  let rank = 0, prev = null;
  rows.forEach((r, i) => { if (r[key] !== prev) { rank = i + 1; prev = r[key]; } r.rank = rank; r.value = r[key]; });
  return rows;
}

export const teamValueLabel = () => (GAME.teamScoring === "total" ? "total pts" : "avg pts");

// ── Clock ────────────────────────────────────────────────
// Timers run off the server's openedAt timestamp. When a client sees a
// question open live, it measures its own clock skew so a phone with a
// wrong clock still shows the right countdown.
let skew = Number(sessionStorage.getItem("clockSkew") || 0);
export function noteLiveOpen(openedAtMs) {
  if (!openedAtMs) return;
  const s = Date.now() - openedAtMs;
  if (Math.abs(s) > 1500) { skew = s; sessionStorage.setItem("clockSkew", String(s)); }
}
export const serverNow = () => Date.now() - skew;
export function remainingMs(game) {
  if (!game || game.phase !== "question" || !game.openedAt) return 0;
  const end = game.openedAt.toMillis() + (game.timeLimit || GAME.defaultTimeLimit) * 1000;
  return Math.max(0, end - serverNow());
}

export const fmt = (n) => (n || 0).toLocaleString();
export const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
