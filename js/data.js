/* ============================================================
   ADONIS — exercise database & programming
   Every slot holds a pool of exercises ordered best-first for
   the MBJ / Killmonger physique. Each exercise lists the
   equipment it needs; the generator picks the best option that
   matches whatever you selected for the session. An empty
   `equip` array means bodyweight — always available.
   ============================================================ */

const EQUIPMENT = [
  { id: "dumbbells",  icon: "🏋️", name: "Dumbbells",     note: "Any pair or set" },
  { id: "barbell",    icon: "➖", name: "Barbell",        note: "Bar + plates" },
  { id: "bench",      icon: "🛋️", name: "Bench",          note: "Flat or adjustable" },
  { id: "rack",       icon: "🗼", name: "Squat rack",     note: "Rack or stands" },
  { id: "pullup",     icon: "🚪", name: "Pull-up bar",    note: "Bar, rings, or beam" },
  { id: "cables",     icon: "🕹️", name: "Cable station",  note: "Pulleys / functional" },
  { id: "machines",   icon: "⚙️", name: "Machines",       note: "Selectorized gym" },
  { id: "kettlebell", icon: "🔔", name: "Kettlebell",     note: "One is enough" },
  { id: "bands",      icon: "🪢", name: "Bands",          note: "Loop or handle" },
  { id: "dipstation", icon: "🥢", name: "Dip station",    note: "Bars or parallettes" },
  { id: "heavybag",   icon: "🥊", name: "Heavy bag",      note: "Or shadowbox" },
  { id: "cardio",     icon: "🏃", name: "Cardio machine", note: "Rower, bike, treadmill" },
];

/* helper: ex(name, equipNeeded[], cue) */
const ex = (name, equip, cue) => ({ name, equip, cue });

const PROGRAM = {
  chestback: {
    title: "Warrior Chest & Back",
    sub: "The armor plate and the V-taper — pressing power up front, width behind. Supersets, 30–60s rest between rounds.",
    desc: "Pressing volume + lat width. The front-and-back of the silhouette.",
    science: "Antagonist (push/pull) supersets let you do more quality sets in less time with no strength loss between pairs. Aim to leave 1–3 reps in the tank on every set — training close to, not at, failure drives the same growth with less fatigue.",
    blocks: [
      {
        label: "A — Heavy pair",
        scheme: "4 rounds · 8–12 reps · rest 60s after the pair",
        slots: [
          [
            ex("Barbell bench press", ["barbell", "bench"], "Slight arch, bar to lower chest, drive through the floor."),
            ex("Dumbbell bench press", ["dumbbells", "bench"], "Deep stretch at the bottom, squeeze at the top."),
            ex("Machine chest press", ["machines"], "Control the negative for 2 counts."),
            ex("Weighted push-up", ["bands"], "Band across the back, hands under shoulders."),
            ex("Feet-elevated push-up", [], "Hips locked, chest kisses the floor."),
          ],
          [
            ex("Weighted pull-up", ["pullup", "dumbbells"], "Dumbbell between feet. Chest to the bar."),
            ex("Pull-up", ["pullup"], "Full hang to chin over. Add a pause at the top."),
            ex("Lat pulldown", ["machines"], "Drive elbows to your back pockets."),
            ex("Barbell row", ["barbell"], "Hinge to 45°, pull to the hips."),
            ex("Single-arm dumbbell row", ["dumbbells"], "Long stretch at the bottom, pull with the lat."),
            ex("Band lat pulldown (tall kneel)", ["bands"], "Anchor high, sweep elbows down and back."),
            ex("Doorframe / table row", [], "Body straight as a plank, pull chest to hands."),
          ],
        ],
      },
      {
        label: "B — Angle work",
        scheme: "3 rounds · 10–15 reps · rest 45s",
        slots: [
          [
            ex("Incline dumbbell press", ["dumbbells", "bench"], "30° incline. Upper chest is the Killmonger shelf."),
            ex("Incline barbell press", ["barbell", "bench", "rack"], "Touch just below the collarbone."),
            ex("Low-to-high cable fly", ["cables"], "Scoop up and in — squeeze the inner chest."),
            ex("Pike push-up flow", [], "Hips high, head slides toward the floor."),
            ex("Decline push-up", [], "Feet on a chair. Slow negatives."),
          ],
          [
            ex("Seated cable row", ["cables"], "Chest tall, pause every rep at the ribs."),
            ex("Chest-supported dumbbell row", ["dumbbells", "bench"], "Incline bench. No momentum, all back."),
            ex("Kettlebell gorilla row", ["kettlebell"], "Hinge and row — alternate arms."),
            ex("Band row", ["bands"], "Slow 3-count negatives to make it heavy."),
            ex("Towel row (isometric ladder)", [], "Pull hard 10s, rest 5s, repeat 5x."),
          ],
        ],
      },
      {
        label: "C — Pump finisher",
        scheme: "3 rounds · 12–20 reps · rest 30s",
        slots: [
          [
            ex("Cable fly (mid)", ["cables"], "Hug a barrel. Chase the pump, not the load."),
            ex("Dumbbell fly", ["dumbbells", "bench"], "Wide arc, slight elbow bend, stretch deep."),
            ex("Band fly", ["bands"], "Anchor behind you at chest height."),
            ex("Push-up dropset", [], "Standard to knees — go to the burn."),
          ],
          [
            ex("Straight-arm pulldown", ["cables"], "Sweep the bar to your thighs, lats only."),
            ex("Dumbbell pullover", ["dumbbells", "bench"], "Big stretch over the head, exhale up."),
            ex("Band straight-arm pulldown", ["bands"], "Hinge slightly, arms like pendulums."),
            ex("Superman pull", [], "On the floor — pull imaginary bar to chest, squeeze 2s."),
          ],
        ],
      },
    ],
  },

  shoulderarms: {
    title: "The Adonis Frame",
    sub: "Shoulders build the ratio; arms fill the sleeve. High-volume pairs — this is the day that makes the silhouette.",
    desc: "Delts three ways + biceps/triceps giant work. The width day.",
    science: "The side delt is what visually widens the frame, and it responds to volume more than load — 12–20 controlled reps with a full range beats heaving heavy. Arms grow best with a deep stretch (skull crushers, incline curls) and strict elbows.",
    blocks: [
      {
        label: "A — Press pair",
        scheme: "4 rounds · 8–12 reps · rest 60s",
        slots: [
          [
            ex("Standing barbell press", ["barbell", "rack"], "Squeeze glutes, press to lockout, head through."),
            ex("Seated dumbbell shoulder press", ["dumbbells", "bench"], "Elbows just in front of the body."),
            ex("Standing dumbbell press", ["dumbbells"], "Brace like a plank at the top."),
            ex("Kettlebell strict press", ["kettlebell"], "Rack tight, press one side at a time."),
            ex("Machine shoulder press", ["machines"], "Constant tension — no lockout rest."),
            ex("Band overhead press", ["bands"], "Stand on the band, press against the stretch."),
            ex("Pike push-up", [], "The heavier your hips, the harder it hits."),
          ],
          [
            ex("Dumbbell lateral raise", ["dumbbells"], "Lead with the elbows, pour the pitcher. THE exercise for this goal."),
            ex("Cable lateral raise", ["cables"], "Behind the back start — tension from rep one."),
            ex("Band lateral raise", ["bands"], "Slow up, slower down."),
            ex("Kettlebell lateral raise (light)", ["kettlebell"], "One side at a time, strict."),
            ex("Side-plank arc raise", [], "Top-arm sweeps floor to sky. Slow arcs."),
          ],
        ],
      },
      {
        label: "B — Arms giant pair",
        scheme: "3 rounds · 10–15 reps · rest 45s",
        slots: [
          [
            ex("Barbell curl", ["barbell"], "Elbows pinned, no swing. Squeeze at the top."),
            ex("Alternating dumbbell curl", ["dumbbells"], "Supinate hard — turn the pinky up."),
            ex("Cable curl", ["cables"], "Constant tension, slow negatives."),
            ex("Band curl (21s)", ["bands"], "7 bottom-half, 7 top-half, 7 full."),
            ex("Chin-up (close grip)", ["pullup"], "Curl yourself over the bar."),
            ex("Towel curl (partner: your own leg)", [], "Resist with the leg — manual tension."),
          ],
          [
            ex("Dips", ["dipstation"], "Slight lean, elbows track back. Triceps gold."),
            ex("Skull crusher", ["barbell", "bench"], "Lower behind the head for a longer stretch."),
            ex("Dumbbell overhead extension", ["dumbbells"], "Both hands on one bell, big stretch."),
            ex("Cable pressdown", ["cables"], "Elbows glued to ribs, snap to lockout."),
            ex("Band pressdown", ["bands"], "Anchor high, strict elbows."),
            ex("Bench dips", ["bench"], "Feet far out, add a pause at the bottom."),
            ex("Diamond push-up", [], "Hands make a diamond, elbows tight."),
          ],
        ],
      },
      {
        label: "C — Rear delt & trap polish",
        scheme: "3 rounds · 12–20 reps · rest 30s",
        slots: [
          [
            ex("Reverse cable fly", ["cables"], "Cross the cables, open like wings."),
            ex("Bent-over dumbbell reverse fly", ["dumbbells"], "Hinge deep, thumbs down, no bounce."),
            ex("Face pull", ["cables"], "Pull to the eyebrows, thumbs to your ears."),
            ex("Band face pull", ["bands"], "Highest-value posture move you'll do."),
            ex("Prone Y-T raise", [], "Face down, sweep Y then T. Squeeze 2s each."),
          ],
          [
            ex("Dumbbell shrug", ["dumbbells"], "Straight up, hold the top for 2 counts."),
            ex("Barbell shrug", ["barbell"], "Big load, strict range."),
            ex("Kettlebell carry shrug", ["kettlebell"], "Shrug mid-carry, walk 20m."),
            ex("Band pull-apart", ["bands"], "Chest height, pull to a T. Burn it out."),
            ex("Wall handstand hold", [], "30–45s. Shoulders take the load."),
          ],
        ],
      },
    ],
  },

  legs: {
    title: "The Foundation",
    sub: "Killmonger moves like a fighter — the base is strong, springy and lean. Heavier pairs, honest depth.",
    desc: "Squat, hinge, lunge, calves. The engine under the frame.",
    science: "Heavy compound lower-body work raises whole-body training capacity and keeps the physique athletic, not just decorative. Full range of motion — especially the stretched position — produces more growth per set than partial reps with bigger loads.",
    blocks: [
      {
        label: "A — Squat pattern",
        scheme: "4 rounds · 8–12 reps · rest 75s",
        slots: [
          [
            ex("Barbell back squat", ["barbell", "rack"], "Sit between the hips, drive the floor apart."),
            ex("Goblet squat", ["dumbbells"], "Bell at the chest, elbows inside the knees."),
            ex("Kettlebell front squat", ["kettlebell"], "Double or single rack. Stay tall."),
            ex("Leg press", ["machines"], "Full range beats big plates."),
            ex("Band front squat", ["bands"], "Band under feet, racked at shoulders."),
            ex("Jump squat (tempo)", [], "3s down, explode up, soft landing."),
          ],
          [
            ex("Romanian deadlift", ["barbell"], "Push hips back, bar shaves the thighs."),
            ex("Dumbbell RDL", ["dumbbells"], "Feel the hamstrings load like bowstrings."),
            ex("Kettlebell swing", ["kettlebell"], "Snap the hips — a jump projected forward."),
            ex("Band good morning", ["bands"], "Band over neck, under feet. Hinge strict."),
            ex("Single-leg hip thrust", [], "Shoulders on a chair, drive one heel, squeeze 2s."),
          ],
        ],
      },
      {
        label: "B — Single-leg pair",
        scheme: "3 rounds · 10–12 reps each side · rest 60s",
        slots: [
          [
            ex("Bulgarian split squat", ["dumbbells", "bench"], "Rear foot up. The one everyone avoids — don't."),
            ex("Walking lunge", ["dumbbells"], "Long strides, knee kisses the floor."),
            ex("Reverse lunge", ["kettlebell"], "Goblet hold, step back, drive through the front heel."),
            ex("Bodyweight Bulgarian split squat", [], "Rear foot on chair, slow 3-count down."),
            ex("Split squat (band)", ["bands"], "Band under front foot, racked at shoulders."),
          ],
          [
            ex("Leg curl", ["machines"], "Squeeze at the top, 3s negative."),
            ex("Nordic curl (assisted)", [], "Anchor feet, lower as slow as you can."),
            ex("Slider / towel leg curl", [], "Bridge up, drag heels in and out."),
            ex("Band leg curl (prone)", ["bands"], "Loop at ankle, curl against the stretch."),
          ],
        ],
      },
      {
        label: "C — Calves & spring",
        scheme: "3 rounds · 15–20 reps · rest 30s",
        slots: [
          [
            ex("Standing calf raise (loaded)", ["dumbbells"], "Pause at the stretch, explode to tip-toe."),
            ex("Calf raise machine", ["machines"], "Full stretch, full squeeze — no bouncing."),
            ex("Single-leg calf raise", [], "On a step. Bottom stretch for 2s each rep."),
          ],
          [
            ex("Box / bench jump", ["bench"], "Land soft, stand tall, step down."),
            ex("Broad jump", [], "Stick the landing, reset every rep."),
            ex("Kettlebell snatch (light)", ["kettlebell"], "Hips snap, bell floats, punch through."),
          ],
        ],
      },
    ],
  },

  engine: {
    title: "Killmonger Engine",
    sub: "The conditioning that keeps the physique visible. Boxing rounds, intervals, and a core circuit — stay lean, stay dangerous.",
    desc: "Boxing / intervals + core circuit. The shred day.",
    science: "Definition is mostly a body-fat story: intervals and boxing burn calories while sparing muscle better than long steady cardio. Abs are muscles too — train them with load and control, then let nutrition (a modest calorie deficit, 0.7–1g protein per lb) reveal them.",
    blocks: [
      {
        label: "A — Rounds",
        scheme: "5 rounds · 3 min work / 1 min rest",
        slots: [
          [
            ex("Heavy bag rounds", ["heavybag"], "Jab-cross base, doubles and body hooks. Move your feet."),
            ex("Shadowboxing rounds", [], "Fight a real opponent in your head. Slip, roll, counter."),
            ex("Rower / bike intervals", ["cardio"], "40s hard / 80s easy within each round."),
            ex("Kettlebell complex", ["kettlebell"], "5 swings, 5 cleans, 5 push presses — repeat for the round."),
            ex("Band punch-outs + jump rope (imaginary)", ["bands"], "Band behind back, punch with resistance."),
          ],
        ],
      },
      {
        label: "B — Core circuit",
        scheme: "4 rounds · 45s on / 15s off each · rest 60s between rounds",
        slots: [
          [
            ex("Hanging knee / leg raise", ["pullup"], "No swing. Curl the pelvis at the top."),
            ex("Cable crunch", ["cables"], "Kneel, crunch ribs to hips, not arms."),
            ex("Weighted crunch", ["dumbbells"], "Plate or bell on chest, slow squeeze."),
            ex("V-up", [], "Reach for the ceiling, snap up and down with control."),
          ],
          [
            ex("Plank body-saw", [], "Rock forward and back on forearms. Brutal and quiet."),
            ex("Ab-wheel / bar rollout", ["barbell"], "Bar with round plates. Hips locked."),
            ex("Kettlebell around-the-world", ["kettlebell"], "Pass around the waist, ribs down."),
            ex("Band pallof press", ["bands"], "Anti-rotation — press and hold 3s."),
          ],
          [
            ex("Russian twist", ["dumbbells"], "Heels light, rotate through the ribs."),
            ex("Bicycle crunch", [], "Slow and long beats fast and sloppy."),
            ex("Cable woodchop", ["cables"], "High to low, pivot the back foot."),
            ex("Mountain climber (slow)", [], "Knee to elbow, hips silent."),
          ],
        ],
      },
      {
        label: "C — Finisher",
        scheme: "1 round · empty the tank",
        slots: [
          [
            ex("Assault bike / rower — 10 cal sprint x4", ["cardio"], "Rest exactly as long as the sprint took."),
            ex("Bag burnout — 100 straight punches", ["heavybag"], "Light, fast, non-stop. Then 50 more."),
            ex("Burpee ladder 10-8-6-4-2", [], "Strict push-up at the bottom of each."),
            ex("Kettlebell swing EMOM — 15/min x5", ["kettlebell"], "15 swings on the minute, rest the remainder."),
          ],
        ],
      },
    ],
  },
  fullbody: {
    title: "Total Sculpt",
    sub: "Everything in one sitting — squat, press, pull, delts, hinge, core. The highest-value session when you only train a few days a week.",
    desc: "Full-body hypertrophy — the smart play for 2–3 day weeks.",
    science: "When you train 2–3 days a week, hitting every muscle each session wins: research shows training a muscle at least twice weekly grows it better than once. Compounds first while you're fresh; isolation and core after.",
    blocks: [
      {
        label: "A — Squat + press pair",
        scheme: "4 rounds · 8–12 reps · rest 60s after the pair",
        slots: [
          [
            ex("Barbell back squat", ["barbell", "rack"], "Sit between the hips, drive the floor apart."),
            ex("Goblet squat", ["dumbbells"], "Bell at the chest, elbows inside the knees."),
            ex("Kettlebell front squat", ["kettlebell"], "Racked tall, full depth."),
            ex("Leg press", ["machines"], "Full range beats big plates."),
            ex("Band front squat", ["bands"], "Band under feet, racked at shoulders."),
            ex("Tempo squat", [], "3s down, pause, drive up. Add a jump if too easy."),
          ],
          [
            ex("Barbell bench press", ["barbell", "bench"], "Slight arch, bar to lower chest."),
            ex("Dumbbell bench press", ["dumbbells", "bench"], "Deep stretch, squeeze at the top."),
            ex("Standing dumbbell press", ["dumbbells"], "Brace like a plank at the top."),
            ex("Machine chest press", ["machines"], "Control the negative for 2 counts."),
            ex("Kettlebell floor press", ["kettlebell"], "Elbow touches, press and pause."),
            ex("Band push-up", ["bands"], "Band across the back for extra load."),
            ex("Feet-elevated push-up", [], "Hips locked, chest kisses the floor."),
          ],
        ],
      },
      {
        label: "B — Pull + delts pair",
        scheme: "3 rounds · 10–15 reps · rest 45s",
        slots: [
          [
            ex("Pull-up", ["pullup"], "Full hang to chin over the bar."),
            ex("Lat pulldown", ["machines"], "Drive elbows to your back pockets."),
            ex("Barbell row", ["barbell"], "Hinge to 45°, pull to the hips."),
            ex("Single-arm dumbbell row", ["dumbbells"], "Long stretch, pull with the lat."),
            ex("Seated cable row", ["cables"], "Chest tall, pause at the ribs."),
            ex("Band row", ["bands"], "Slow 3-count negatives."),
            ex("Doorframe / table row", [], "Body straight as a plank."),
          ],
          [
            ex("Dumbbell lateral raise", ["dumbbells"], "Lead with the elbows. The ratio-builder."),
            ex("Cable lateral raise", ["cables"], "Tension from rep one."),
            ex("Band lateral raise", ["bands"], "Slow up, slower down."),
            ex("Kettlebell lateral raise (light)", ["kettlebell"], "Strict, one side at a time."),
            ex("Side-plank arc raise", [], "Top arm sweeps floor to sky."),
          ],
        ],
      },
      {
        label: "C — Hinge + core pair",
        scheme: "3 rounds · 10–15 reps · rest 45s",
        slots: [
          [
            ex("Romanian deadlift", ["barbell"], "Push hips back, bar shaves the thighs."),
            ex("Dumbbell RDL", ["dumbbells"], "Hamstrings load like bowstrings."),
            ex("Kettlebell swing", ["kettlebell"], "Snap the hips — a jump projected forward."),
            ex("Band good morning", ["bands"], "Band over neck, under feet."),
            ex("Single-leg hip thrust", [], "Drive one heel, squeeze 2s at the top."),
          ],
          [
            ex("Hanging knee / leg raise", ["pullup"], "No swing. Curl the pelvis at the top."),
            ex("Cable crunch", ["cables"], "Crunch ribs to hips, not arms."),
            ex("Weighted crunch", ["dumbbells"], "Load on chest, slow squeeze."),
            ex("Band pallof press", ["bands"], "Anti-rotation — press and hold 3s."),
            ex("Plank body-saw", [], "Rock on forearms. Brutal and quiet."),
          ],
        ],
      },
    ],
  },
};

const DAY_ORDER = ["chestback", "shoulderarms", "legs", "engine"];

/* ============================================================
   Intensity techniques — make a too-light load hard enough to
   count. Research is clear: a light weight taken close to
   failure grows muscle comparably to a heavy one. These change
   HOW you lift the same load. `rep` optionally overrides the
   target range the app autoregulates against.
   ============================================================ */
const INTENSITY = [
  { id: "tempo",      name: "Slow negatives",   cue: "Lower under control for a 4-count on every rep. Same weight, double the time under tension." },
  { id: "unilateral", name: "One side at a time", cue: "Work a single arm or leg per set — the load effectively doubles relative to that limb." },
  { id: "onehalf",    name: "1.5 reps",         cue: "A full rep, then a half rep from the stretched bottom position — that counts as one." },
  { id: "partials",   name: "Stretch partials", cue: "After your last full rep, add 5 short partials in the deepest, hardest position." },
  { id: "restpause",  name: "Rest-pause",       cue: "Take the set to 1 rep shy of failure, rest 15s, squeeze out more — repeat twice.", rep: { lo: 12, hi: 20 } },
  { id: "highrep",    name: "Reps to failure",  cue: "Push to a high rep count, stopping 1 rep short of failure. Light load, full stimulus.", rep: { lo: 20, hi: 30 } },
  { id: "shortrest",  name: "Short-rest density", cue: "Cut rest to 20–30s between rounds. Accumulated fatigue makes a light weight feel heavy fast." },
];

/* ============================================================
   12-week plan templates
   ============================================================ */

/* weekly session layout by training days per week */
const SPLITS = {
  2: ["fullbody", "fullbody"],
  3: ["fullbody", "fullbody", "engine"],
  4: ["chestback", "shoulderarms", "legs", "engine"],
  5: ["chestback", "shoulderarms", "legs", "engine", "shoulderarms"],
  6: ["chestback", "shoulderarms", "legs", "chestback", "shoulderarms", "engine"],
};

const SPLIT_NOTES = {
  2: "Two full-body days — with only two sessions, hitting every muscle twice a week is what the research supports.",
  3: "Two full-body days plus the Engine — muscle twice a week, conditioning once, lean and wide.",
  4: "The classic Killmonger rotation — every muscle group gets its own stage.",
  5: "The rotation plus a second Adonis Frame day — extra side-delt and arm volume where the silhouette lives.",
  6: "A double rotation — chest/back and shoulders twice weekly, one Engine day to stay lean. Recovery is the job now.",
};

/* mesocycle periodization: 3 build waves, deload every 4th week */
const PHASES = [
  {
    from: 1, to: 3, name: "Foundation", reps: "12–15", rpe: "RPE 7 · leave 3 reps in the tank",
    setMult: 1, note: "Groove technique and build work capacity. Moderate loads, full range, strict tempo — log every set so the next phases have a baseline.",
  },
  {
    from: 4, to: 4, name: "Deload", reps: "10–12 easy", rpe: "RPE 5–6 · everything feels crisp",
    setMult: 0.5, note: "Half the sets, same movements, loads at ~60%. Growth happens in recovery — this week is where the last three weeks get cashed in.",
  },
  {
    from: 5, to: 7, name: "Build", reps: "10–12", rpe: "RPE 8 · 2 reps in reserve",
    setMult: 1, note: "Loads climb. Beat the logbook: same weight for more reps, or more weight for the same reps — that's progressive overload, the one non-negotiable.",
  },
  {
    from: 8, to: 8, name: "Deload", reps: "10–12 easy", rpe: "RPE 5–6 · move like it's a rehearsal",
    setMult: 0.5, note: "Half sets again. Use the spare time on mobility and extra sleep — the peak phase will ask for everything.",
  },
  {
    from: 9, to: 11, name: "Peak", reps: "8–12", rpe: "RPE 9 · 1 rep in reserve",
    setMult: 1, setAdd: 1, note: "Highest volume of the cycle — one extra round on the first pair. Push sets close to failure with form intact. This is where the physique is carved.",
  },
  {
    from: 12, to: 12, name: "Deload & assess", reps: "10–12 easy", rpe: "RPE 6 · victory lap",
    setMult: 0.5, note: "Half sets, then measure: photos, waist, key lifts vs week 1. Compare against your goals — then the next 12 weeks start heavier than these did.",
  },
];

const TIME_OPTIONS = [
  { mins: 30, label: "30 min", blocks: 2, roundAdj: -1, note: "First two pairs only, one fewer round — density over volume." },
  { mins: 45, label: "45 min", blocks: 3, roundAdj: -1, note: "All pairs, trimmed rounds. Keep the rests honest." },
  { mins: 60, label: "60 min", blocks: 3, roundAdj: 0, note: "The full session as written." },
  { mins: 75, label: "75+ min", blocks: 3, roundAdj: 0, extraNote: "Add one extra round to the A pair, and stretch after.", note: "The full session plus an extra top-pair round." },
];
