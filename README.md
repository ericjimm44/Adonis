# ADONIS — The Killmonger Protocol

A personal workout companion built for one goal: the **Michael B. Jordan physique** —
broad shoulders, carved chest, V-taper back, and a fighter's conditioning.

## How it works

1. **Pick your arsenal.** Each session, select whatever equipment you actually have
   in front of you — a full gym, a pair of dumbbells, a band, or nothing at all.
2. **Forge the session.** The app writes a workout from the 4-day Killmonger
   rotation, choosing the best exercise variation your equipment allows. Every
   slot has a bodyweight fallback, so a hotel room is never an excuse.
3. **Do the work.** Tap the dots to log sets, use the built-in rest timer
   (30–60s rests are the point), and complete the session.
4. **Proof of work.** Sessions are logged locally (localStorage) — totals,
   weekly count, and week streak. The rotation auto-advances from your last
   logged day.

## The rotation

| Day | Focus |
| --- | --- |
| 01 — Warrior Chest & Back | Pressing volume + lat width |
| 02 — The Adonis Frame | Shoulders three ways + arms giant sets |
| 03 — The Foundation | Squat, hinge, lunge, calves |
| 04 — Killmonger Engine | Boxing rounds / intervals + core circuit |

Programming principles are modeled on the publicized Killmonger prep style:
high-volume 10–15 rep hypertrophy work, supersets, short rests, side-delt and
lat priority for the shoulder-to-waist ratio, and fight conditioning to stay lean.

## Running it

No build step, no dependencies. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

To publish with **GitHub Pages**: repo Settings → Pages → deploy from branch → root.

## Stack

Vanilla HTML/CSS/JS. Design direction inspired by earthy, cinematic
editorial sites (deep forest inks, warm sand type, display serif, slow reveals).

---

*Not affiliated with any film or studio. Not medical advice — train smart.*
