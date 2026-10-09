# What Lies Beneath — See the Pipe, Make the Call, Live with the Consequences

Live team game for the 2026 OMAG Sanitary Sewer Expo. Attendees join on their phones with their name and a team number (1–52), watch pipe-inspection videos on the big screen, and answer four questions after each one. Every answer scores for their team; the big screen shows live answer bars, a bell curve for confidence, and team standings.

Static site (GitHub Pages) + the Expo Wall's existing Firebase project (`sewer-expo-social-wall`). Game data lives under `games/{id}` in Firestore and never touches the wall's posts.

## Pages

| Page | Who | What |
|---|---|---|
| `index.html` | Attendees' phones | Join (name + team), answer, see correct/incorrect, team standing. **Key** button shows the decision key anytime. |
| `screen.html` | Projector / ProPresenter web view | Lobby with QR + decision key, videos, live answer bars, bell curve, team standings, finale. Loads straight into the game. Full screen: corner button or `F`. If a browser starts a video muted, one click anywhere turns the sound on. Join link/QR: link.omag.org/what-lies-beneath |
| `admin.html` | Presenter (or type **admin** on the screen or player page) | Admin console: run of show, Next/Back (clicker keys work), live answers, team board, Redo this question, Reset scores, Reset game. Sign in with the Expo Wall moderator login. |

## Each video round

1. Video plays on the screen
2. **How confident are you that you know what needs to be done?** 1–5, not scored → bell curve at the reveal
3. **What did you see?** pick all that apply → partial credit
4. **How serious is it?** Watch it / Maintain it / Fix it / Act now
5. **What would you do?** single pick

Full-screen team standings show once at halftime (`standingsAfter` in `config.js`), and the finale shows the winners.

Every question gets **2 minutes** for table discussion (`defaultTimeLimit` in `config.js`). When a video ends, the screen moves straight to the first question.
The admin page reveals automatically when time runs out or everyone has answered.

## Setup (one time)

1. **Repo** — put these files in a new repo (e.g. `omag-web/sewer-expo-game`) and turn on GitHub Pages (Settings → Pages → main / root).
2. **Firebase → Authentication → Sign-in method** — enable **Anonymous** (players). Email/Password is already on for the wall.
3. **Firebase → Authentication → Settings → Authorized domains** — make sure `omag-web.github.io` is listed (it should be, from the wall).
4. **Firestore rules** — `firestore.rules` is the complete file (Expo Wall + game). Replace everything in Firebase → Firestore → Rules with it and publish.
   ⚠️ Check the wall's rules first: anything that only checks `request.auth != null` would now let anonymous players through. Change those checks to `request.auth.token.firebase.sign_in_provider == 'password'` (same as `isGameHost()`).
5. **Content** — edit `ROUNDS` in `config.js`: one entry per video with its file and correct answers. Drop video files in `/video` (MP4, keep each under ~100 MB) or use a YouTube ID.

## Editing

Everything editable is in `config.js`:
- `ROUNDS` — videos, correct answers, reveal notes
- `ROUND_QUESTIONS` — the questions asked after every video and their choices
- `DECISIONS` — the decision key
- `TEAM_COUNT` — number of teams (default 52, named Team 1–52)
- `GAME` — title, timers, scoring (100 points per correct answer; speed doesn't matter), `confidenceWager` (off by default; when on, confidence 4–5 boosts right answers and costs points on wrong ones)
- `GAME.id` — change it to start a completely fresh game without deleting the old one

## Day-of checklist

- Open `admin.html` on the presenter laptop and sign in → **Set up game** (first time only)
- Open `screen.html` on the display machine → click once → `F` for full screen
- Do a rehearsal round, then **Reset scores** (keeps players) or **Reset game** (clears everyone)
