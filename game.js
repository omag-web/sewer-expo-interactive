// Shared game logic for all three pages. Edit config.js, not this file.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator, doc, collection, setDoc, getDocFromServer, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, GAME, TEAMS, DECISIONS, ROUND_QUESTIONS, ROUNDS, CLOSING_VIDEO, PRACTICE, CLOSING_SLIDE } from "./config.js";

export { GAME, TEAMS, DECISIONS, ROUNDS, CLOSING_VIDEO, CLOSING_SLIDE };

// ── Build the flat question list from ROUNDS × ROUND_QUESTIONS ──
const PALETTE = ["#d49c61", "#5b9bd5", "#6cc08b", "#c77dcc", "#e0614f", "#4fc1c1", "#e8c14f", "#9aa5b1"];
const SCALE = ["#8a8178", "#a58a6c", "#bd9264", "#d49c61", "#e9b27a"];
const norm = (s) => String(s).trim().toLowerCase();
const confAt = ROUND_QUESTIONS.findIndex((t) => t.scale);
// Video numbers (1-based) that end with full-screen standings. Never the last one,
// because the finale follows it.
// Main rounds are the scored videos played in order; "extra" rounds are spares.
// Standings positions count main rounds only (e.g. halftime of 4 = after the 2nd).
const MAIN = ROUNDS.map((r, ri) => ri).filter((ri) => !ROUNDS[ri].extra);
const LAST_MAIN = MAIN[MAIN.length - 1];
const STANDINGS_ROUNDS = (() => {
  const n = MAIN.length, v = GAME.standingsAfter ?? "middle";
  const list = Array.isArray(v) ? v : v === "middle" ? [Math.ceil(n / 2)] : [];
  return list.filter((r) => r >= 1 && r < n).map((r) => MAIN[r - 1]);   // → ROUNDS indexes
})();
const HALFTIME = GAME.standingsAfter === "middle" || GAME.standingsAfter == null;
// What the audience sees instead of the video's real name
const publicTitle = (ri) => (ROUNDS[ri].extra ? "Bonus video" : `Video ${MAIN.indexOf(ri) + 1}`);
const VIDEO_QS = ROUNDS.flatMap((r, ri) => ROUND_QUESTIONS.map((t, k) => {
  const base = ri * ROUND_QUESTIONS.length;
  const choices = t.choices.map((c, j) => {
    const o = typeof c === "string" ? { label: c } : { ...c };
    o.color = o.color || (t.scale ? SCALE[j % SCALE.length] : PALETTE[j % PALETTE.length]);
    if (t.scale) o.mark = o.label;
    return o;
  });
  if (t.scale) return {
    id: t.id, q: t.q, scale: true, unscored: true, multi: false, time: t.time, choices, answer: [],
    low: t.low, high: t.high, explain: "",
    round: ri, roundTitle: r.title || `Video ${ri + 1}`, publicTitle: publicTitle(ri), step: k, steps: ROUND_QUESTIONS.length,
    video: k === 0 ? r.video : null,
    leaderboard: k === ROUND_QUESTIONS.length - 1 && (STANDINGS_ROUNDS.includes(ri) || ri === LAST_MAIN), confIndex: -1,
    standingsTitle: ri === LAST_MAIN ? "Final standings" : HALFTIME ? "Halftime standings" : `Standings after ${publicTitle(ri)}`,
    extra: !!r.extra
  };
  const raw = r.answers ? r.answers[t.id] : undefined;
  const answer = [].concat(raw ?? []).map((a) => {
    const idx = choices.findIndex((c) => norm(c.label) === norm(a));
    if (idx < 0) console.warn(`config.js: "${a}" isn't a choice for "${t.q}" in ${r.title}`);
    return idx;
  }).filter((x) => x >= 0);
  // no answer key yet → asked as an unscored poll
  const noKey = !answer.length;
  return {
    id: t.id, q: t.q, multi: !!t.multi, time: t.time, choices, answer,
    noKey, unscored: noKey,
    hasMeanings: choices.some((c) => c.meaning),
    explain: r.explain ? r.explain[t.id] : "",
    round: ri, roundTitle: r.title || `Video ${ri + 1}`, publicTitle: publicTitle(ri), step: k, steps: ROUND_QUESTIONS.length,
    video: k === 0 ? r.video : null,
    leaderboard: k === ROUND_QUESTIONS.length - 1 && (STANDINGS_ROUNDS.includes(ri) || ri === LAST_MAIN),
    standingsTitle: ri === LAST_MAIN ? "Final standings" : HALFTIME ? "Halftime standings" : `Standings after ${publicTitle(ri)}`,
    extra: !!r.extra,
    confIndex: confAt >= 0 && confAt < k ? base + confAt : -1
  };
}));

// Practice questions: before the first video, no video, never scored.
const PRACTICE_QS = ((PRACTICE && PRACTICE.questions) || []).map((p, k, all) => ({
  id: `practice${k + 1}`, q: p.q, multi: false, time: p.time || PRACTICE.time,
  choices: p.choices.map((c, j) => ({ label: c, color: PALETTE[j % PALETTE.length] })),
  answer: [], noKey: true, unscored: true, practice: true, hasMeanings: false, explain: "",
  round: "practice", roundTitle: PRACTICE.title || "Practice", publicTitle: PRACTICE.title || "Practice",
  step: k, steps: all.length, video: null, leaderboard: false, standingsTitle: "", extra: false, confIndex: -1
}));
export const QUESTIONS = [...PRACTICE_QS, ...VIDEO_QS.map((Q) => ({ ...Q, confIndex: Q.confIndex >= 0 ? Q.confIndex + PRACTICE_QS.length : -1 }))];
// qLabel is for the audience (never the video's real name); qShort is admin-only
// Fingerprint of the question list, answer keys and timers. The admin page
// stamps it on the game; any phone or screen whose copy differs is running
// old (cached) code and refreshes itself.
// BUILD changes with every update (set automatically when changes are saved),
// so any code change — not just question changes — makes old pages refresh.
export const BUILD = "20261011015925";
export const QSIG = (() => {
  const t = BUILD + JSON.stringify(QUESTIONS.map((q) => [q.round, q.id, q.q, q.time, q.choices.map((c) => c.label), q.answer, !!q.multi, !!q.leaderboard, !!q.extra]));
  let h = 5381; for (let k = 0; k < t.length; k++) h = ((h * 33) ^ t.charCodeAt(k)) >>> 0;
  return h.toString(36);
})();
let staleShown = false, refreshing = false;
export function checkVersion(game, onStillStale) {
  if (!game || !game.sig || game.sig === QSIG || refreshing) return;
  const key = `refreshedFor_${game.sig}`;
  let tried = false; try { tried = !!sessionStorage.getItem(key); sessionStorage.setItem(key, "1"); } catch {}
  if (!tried) {
    refreshing = true;
    // pull fresh copies of the page's files, then reload
    const page = location.pathname.split("/").pop() || "index.html";
    Promise.all([page, "game.js", "config.js", "theme.css"].map((u) => fetch(u, { cache: "reload" }).catch(() => {})))
      .finally(() => location.reload());
    return;
  }
  if (!staleShown) { staleShown = true; onStillStale && onStillStale(); }
}
export const qLabel = (i) => { const Q = QUESTIONS[i]; return `${Q.publicTitle} · Question ${Q.step + 1} of ${Q.steps}`; };
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
// The screen drops a note here when a video finishes, so the admin page can open the first question.
export const videoSignalRef = (q) => doc(db, "games", GAME.id, "signals", `video-${q}`);
// 125000 → "2:05"
export const fmtClock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

export const $ = (id) => document.getElementById(id);
export const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
export const teamById = (id) => TEAMS.find((t) => t.id === id) || { id, name: "No team", color: "#888", num: 0 };
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
// Flow: lobby → main videos in order (extra videos skipped) → final standings
// → winner → closing video. An extra video, if you play it, flows into the
// final standings when it's done.
const firstOf = (i) => ({ phase: stepsFor(i)[0], qIndex: i });
const lastOf = (i) => { const p = stepsFor(i); return { phase: p[p.length - 1], qIndex: i }; };
const lastMainQ = QUESTIONS.reduce((m, Q, i) => (!Q.extra ? i : m), -1);
const firstMainQ = QUESTIONS.findIndex((Q) => !Q.extra);
export function nextStep(phase, qIndex) {
  if (phase === "lobby") return firstOf(firstMainQ);
  if (phase === "final") return CLOSING_VIDEO ? { phase: "outro", qIndex } : CLOSING_SLIDE ? { phase: "closing", qIndex } : null;
  if (phase === "outro") return CLOSING_SLIDE ? { phase: "closing", qIndex } : null;
  if (phase === "closing") return null;
  const steps = stepsFor(qIndex);
  const at = steps.indexOf(phase);
  if (at >= 0 && at < steps.length - 1) return { phase: steps[at + 1], qIndex };
  const Q = QUESTIONS[qIndex];
  const nx = QUESTIONS[qIndex + 1];
  if (nx && nx.round === Q.round) return firstOf(qIndex + 1);           // next question, same video
  if (Q.extra) return lastMainQ >= 0 && QUESTIONS[lastMainQ].leaderboard ? { phase: "leaderboard", qIndex: lastMainQ } : { phase: "final", qIndex };
  const nextMain = QUESTIONS.findIndex((x, i) => i > qIndex && !x.extra);
  if (nextMain >= 0) return firstOf(nextMain);
  return { phase: "final", qIndex };
}
export function prevStep(phase, qIndex) {
  if (phase === "lobby") return null;
  if (phase === "outro") return { phase: "final", qIndex };
  if (phase === "closing") return CLOSING_VIDEO ? { phase: "outro", qIndex } : { phase: "final", qIndex };
  if (phase === "final") return lastOf(lastMainQ);
  const steps = stepsFor(qIndex);
  const at = steps.indexOf(phase);
  if (at > 0) return { phase: steps[at - 1], qIndex };
  const Q = QUESTIONS[qIndex];
  const pv = QUESTIONS[qIndex - 1];
  if (pv && pv.round === Q.round) return lastOf(qIndex - 1);
  if (Q.extra) return lastOf(lastMainQ);                                 // back out of a spare video
  for (let i = qIndex - 1; i >= 0; i--) if (!QUESTIONS[i].extra) return lastOf(i);
  return { phase: "lobby", qIndex: 0 };
}
export function describeStep(s) {
  if (!s) return "Game over";
  if (s.phase === "final") return "Reveal the winner";
  if (s.phase === "outro") return CLOSING_VIDEO ? `Play closing video (${CLOSING_VIDEO.title})` : "Closing video";
  if (s.phase === "closing") return "Show closing slide";
  if (s.phase === "lobby") return "Lobby";
  const Q = QUESTIONS[s.qIndex];
  const n = qShort(s.qIndex);
  return { video: `Play ${Q.roundTitle}`, question: `Open ${n}`, reveal: "Close voting & show results", leaderboard: Q.standingsTitle }[s.phase];
}

// ── Scoring ──────────────────────────────────────────────
// picks: array of choice indexes. Single-choice questions are all-or-nothing;
// pick-all-that-apply gets (right − wrong) ÷ number of right answers.
// Scoring rule:
//   • any incorrect pick → 0 for the question (even with correct picks too)
//   • pick-all-that-apply: points for each correct pick
//   • single pick with several accepted answers: any one of them is fully right
// units = how many basePoints to award; frac = share of the full answer (0–1).
export function grade(Q, picks) {
  const ans = new Set(Q.answer);
  const uniq = [...new Set(picks || [])];
  const hits = uniq.filter((p) => ans.has(p)).length;
  const wrong = uniq.length - hits;
  if (!uniq.length || wrong > 0 || !hits) return { frac: 0, exact: false, hits, wrong, total: ans.size, units: 0 };
  if (Q.multi) return { frac: hits / ans.size, exact: hits === ans.size, hits, wrong, total: ans.size, units: hits };
  return { frac: 1, exact: true, hits, wrong, total: ans.size, units: 1 };
}
// conf: the player's 1–5 confidence for this round (only used when GAME.confidenceWager is on)
export function pointsFor({ units, exact, streakBefore, conf }) {
  const w = GAME.confidenceWager && conf ? GAME.wager[conf] : null;
  if (!units) return w ? w.wrong : 0;
  const streak = exact ? Math.min(GAME.streakBonusMax || 0, (GAME.streakBonus || 0) * streakBefore) : 0;
  return Math.round((units * GAME.basePoints + streak) * (w ? w.right : 1));
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
  // only teams with at least one player are ranked
  const rows = TEAMS.filter((t) => players.some((p) => p.team === t.id)).map((t) => {
    const members = players.filter((p) => p.team === t.id);
    const total = members.reduce((s, p) => s + (p.score || 0), 0);
    const avg = members.length ? Math.round(total / members.length) : 0;
    return { id: t.id, name: t.name, color: t.color, num: t.num, players: members.length, total, avg };
  });
  const key = GAME.teamScoring === "total" ? "total" : "avg";
  rows.sort((a, b) => b[key] - a[key] || b.players - a.players || (a.num || 0) - (b.num || 0));
  let rank = 0, prev = null;
  rows.forEach((r, i) => { if (r[key] !== prev) { rank = i + 1; prev = r[key]; } r.rank = rank; r.value = r[key]; });
  return rows;
}

export const teamValueLabel = () => (GAME.teamScoring === "total" ? "total pts" : "avg pts");

// ── Clock ────────────────────────────────────────────────
// Every timer counts down to the same moment: the server's openedAt + the
// time limit. Each device measures how far its own clock is from the Firebase
// server's clock (write a server timestamp, read it back, take the fastest of
// a few tries), so the phones, the screen and the admin page all show the
// same number even if a device's clock is off.
let offset = 0;                 // server time − this device's time, in ms
try { sessionStorage.removeItem("clockSkew"); } catch {}   // old method's leftover
export const serverNow = () => Date.now() + offset;
export function noteLiveOpen() {}  // no longer used (kept so older pages don't break)
let syncing = null;
const TAB_ID = Math.random().toString(36).slice(2, 10);
export function syncClock(uid, rounds = 3) {
  if (!uid || syncing) return syncing;
  // one record per open page, so the admin page and its preview don't collide
  const ref = doc(db, "games", GAME.id, "clock", `${uid}_${TAB_ID}`);
  syncing = (async () => {
    let best = null;
    for (let k = 0; k < rounds; k++) {
      try {
        const t0 = Date.now();
        await setDoc(ref, { t: serverTimestamp() });
        const t1 = Date.now();
        const snap = await getDocFromServer(ref);
        if (!snap.exists() || !snap.data().t) continue;
        const T = snap.data().t.toMillis();
        const s = { rtt: t1 - t0, off: T - (t0 + t1) / 2 };
        if (!best || s.rtt < best.rtt) best = s;
      } catch (e) { console.warn("clock sync", e.code || e); break; }
    }
    if (best) offset = best.off;
    syncing = null;
    return offset;
  })();
  return syncing;
}
// Check once on load, then again only when a phone wakes after being away a
// while (a clock doesn't drift meaningfully during a session). Keeps database
// traffic low with hundreds of phones.
export function keepClockSynced(uid) {
  syncClock(uid, 3);
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 30000) syncClock(uid, 1);
  });
}
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

// Plain-English reason for a Firebase error, shown on screen so setup
// problems are obvious instead of a generic "can't connect".
export function explainError(e) {
  const code = (e && e.code) || "";
  if (code === "auth/admin-restricted-operation" || code === "auth/operation-not-allowed")
    return { title: "Setup needed", msg: "Anonymous sign-in is turned off. Firebase console → Authentication → Sign-in method → enable Anonymous.", code };
  if (code === "auth/unauthorized-domain")
    return { title: "Setup needed", msg: `This site (${location.hostname}) isn't an authorized domain. Firebase console → Authentication → Settings → Authorized domains → add it.`, code };
  if (code === "permission-denied")
    return { title: "Setup needed", msg: "Firestore rules are blocking the game. Paste the game block from firestore.rules into the Firebase rules and publish.", code };
  if (code === "unavailable" || code === "auth/network-request-failed")
    return { title: "Can't connect", msg: "Check your signal and reload the page.", code };
  return { title: "Something went wrong", msg: (e && e.message) || "Reload the page and try again.", code };
}

// Short "T12" style label for tight spaces
export const teamShort = (id) => { const t = teamById(id); return t.num ? `T${t.num}` : t.name; };

// Secret typing shortcut to the admin console (GAME.adminCode).
export function enableAdminShortcut() {
  const code = (GAME.adminCode || "").toLowerCase();
  if (!code) return;
  let typed = "";
  addEventListener("keydown", (e) => {
    const t = document.activeElement && document.activeElement.tagName;
    if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") { typed = ""; return; }
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
    typed = (typed + e.key.toLowerCase()).slice(-code.length);
    if (typed === code) {
      typed = "";
      const url = "admin.html" + (location.search.includes("emulator=1") ? "?emulator=1" : "");
      // new tab, so the screen keeps running; same tab only if a popup blocker stops it
      const w = window.open(url, "_blank");
      if (!w) location.href = url;
    }
  });
}

// Confidence answers are stored as picks: [value − 1], where value slides
// freely from 1 to 5 (e.g. 3.4). These read them back.
export const scaleValue = (a) => { const p = ((a && a.picks) || [])[0]; return typeof p === "number" ? p + 1 : null; };
export const scaleBucket = (v) => Math.min(5, Math.max(1, Math.round(v))) - 1;   // nearest whole step, 0–4
