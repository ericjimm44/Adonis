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
};

const DAY_ORDER = ["chestback", "shoulderarms", "legs", "engine"];
