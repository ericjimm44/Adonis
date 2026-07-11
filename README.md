# ADONIS — The Killmonger Protocol

A personal workout companion built for one goal: the **Michael B. Jordan physique** —
broad shoulders, carved chest, V-taper back, and a fighter's conditioning.

## How it works

1. **Begin the campaign.** Tell it how many days a week (2–6) and how long per
   session (30–75 min). It writes a 12-week periodized plan: three build waves
   (Foundation → Build → Peak) with a deload every fourth week — the mesocycle
   structure hypertrophy research supports. Rep targets, RPE, and set counts
   shift by phase; deload weeks halve the sets automatically.
2. **Pick your arsenal.** Each session, select whatever equipment you actually
   have in front of you — a full gym, a pair of dumbbells, a band, or nothing
   at all. Every slot has a bodyweight fallback.
3. **Do the work.** Log weight × reps on every set (weight optional for
   bodyweight moves). The app remembers your last numbers, prefills them, and
   tells you when to add weight vs. chase reps (double progression). Swap any
   exercise for an equivalent with one tap, and every movement has a form
   cue plus a ▶ link to video tutorials. An in-progress session survives a
   page refresh.
4. **Set goals, keep proof.** Track measurable goals (bodyweight, waist, key
   lifts) with progress bars, plus a full session log — totals, weekly count,
   and week streak. All data stays on your device (localStorage).

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

## Install it on your phone (PWA)

ADONIS is an installable, **offline-first** app. Once you've opened it over
HTTPS (GitHub Pages counts), a service worker caches the whole app so it loads
instantly and works with **zero signal** — exactly what a gym basement needs.

- **iPhone (Safari):** Share → *Add to Home Screen*.
- **Android / desktop Chrome:** tap the **Install app** button in the nav, or
  use the browser's install prompt.

Installed, it runs full-screen with its own icon, keeps the screen awake during
a session, and stores your plan, weights, and goals on-device.

## Running it

No build step, no dependencies. Serve the folder over HTTP (a service worker
won't register from `file://`):

```sh
python3 -m http.server 8000
```

To publish with **GitHub Pages**: repo Settings → Pages → deploy from branch →
pick this branch (or `main`) → root.

## Stack

Vanilla HTML/CSS/JS. Design direction inspired by earthy, cinematic
editorial sites (deep forest inks, warm sand type, display serif, slow reveals).

---

*Not affiliated with any film or studio. Not medical advice — train smart.*
