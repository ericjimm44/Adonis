/* ============================================================
   ADONIS — app logic
   12-week periodized plan, equipment-adaptive session generator,
   per-set weight/rep logging with progression suggestions,
   goals, swaps, and a journal. All state in localStorage.
   ============================================================ */

(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  /* storage that degrades to in-memory when localStorage is unavailable
     (private browsing, sandboxed embeds) instead of crashing */
  const mem = {};
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) return JSON.parse(raw) ?? fallback;
      } catch { /* fall through to mem */ }
      return key in mem ? mem[key] : fallback;
    },
    set(key, val) {
      mem[key] = val;
      try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* memory only */ }
    },
    del(key) {
      delete mem[key];
      try { localStorage.removeItem(key); } catch { /* memory only */ }
    },
  };

  const KEY_EQUIP = "adonis.equip";
  const KEY_LOG = "adonis.log";
  const KEY_PLAN = "adonis.plan";
  const KEY_HIST = "adonis.hist";
  const KEY_GOALS = "adonis.goals";
  const KEY_ACTIVE = "adonis.active";
  const KEY_TECH = "adonis.tech";

  let selectedEquip = new Set(store.get(KEY_EQUIP, []));
  let techPref = store.get(KEY_TECH, {}); // { exerciseName: techniqueId } — remembered per lift
  let selectedFocus = "auto";
  let sessTime = (store.get(KEY_PLAN, null) || {}).mins || 60; // minutes available for today's session
  let wizDays = 4;
  let wizTime = 60;
  let currentSession = store.get(KEY_ACTIVE, null);

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ================= plan model ================= */

  const getPlan = () => store.get(KEY_PLAN, null);

  function phaseForWeek(week) {
    return PHASES.find((p) => week >= p.from && week <= p.to) || PHASES[0];
  }

  function nextPlanSession(plan) {
    return plan ? plan.sessions.find((s) => !s.done) || null : null;
  }

  function createPlan(days, mins) {
    const layout = SPLITS[days];
    const sessions = [];
    for (let w = 1; w <= 12; w++) {
      layout.forEach((dayKey, i) => sessions.push({ week: w, slot: i, dayKey, done: false }));
    }
    store.set(KEY_PLAN, { createdAt: new Date().toISOString(), days, mins, sessions });
  }

  /* ================= rotation fallback (no plan) ================= */

  function lastLoggedDay() {
    const log = store.get(KEY_LOG, []);
    return log.length ? log[log.length - 1].dayKey : null;
  }

  function nextDayInRotation() {
    const last = lastLoggedDay();
    if (!last || !DAY_ORDER.includes(last)) return DAY_ORDER[0];
    return DAY_ORDER[(DAY_ORDER.indexOf(last) + 1) % DAY_ORDER.length];
  }

  /* ================= plan wizard ================= */

  function renderWizard() {
    $("#daysRow").innerHTML = [2, 3, 4, 5, 6].map((d) =>
      `<button type="button" class="focus__chip${d === wizDays ? " is-on" : ""}" data-days="${d}">${d} days</button>`).join("");
    $("#timeRow").innerHTML = TIME_OPTIONS.map((t) =>
      `<button type="button" class="focus__chip${t.mins === wizTime ? " is-on" : ""}" data-mins="${t.mins}">${t.label}</button>`).join("");
    $("#daysHint").textContent = SPLIT_NOTES[wizDays];
    $("#timeHint").textContent = TIME_OPTIONS.find((t) => t.mins === wizTime).note;
  }

  $("#daysRow").addEventListener("click", (ev) => {
    const chip = ev.target.closest("[data-days]");
    if (!chip) return;
    wizDays = +chip.dataset.days;
    renderWizard();
  });

  $("#timeRow").addEventListener("click", (ev) => {
    const chip = ev.target.closest("[data-mins]");
    if (!chip) return;
    wizTime = +chip.dataset.mins;
    renderWizard();
  });

  $("#startPlanBtn").addEventListener("click", () => {
    createPlan(wizDays, wizTime);
    sessTime = wizTime;
    renderPlan();
    renderFocus();
    renderTimeToday();
    $("#plan").scrollIntoView({ behavior: "smooth" });
  });

  $("#resetPlanBtn").addEventListener("click", () => {
    if (!confirm("Restart the 12-week plan? Your session history, logs and goals are kept.")) return;
    store.del(KEY_PLAN);
    renderPlan();
    renderFocus();
  });

  /* ================= plan overview ================= */

  function renderPlan() {
    const plan = getPlan();
    $("#planWizard").hidden = !!plan;
    $("#planView").hidden = !plan;
    $("#upNext").hidden = true;
    if (!plan) { renderWizard(); return; }

    const next = nextPlanSession(plan);
    const curWeek = next ? next.week : 12;
    const phase = phaseForWeek(curWeek);

    $("#planMeta").innerHTML = next
      ? `Week <strong>${curWeek}</strong> of 12 — <strong>${esc(phase.name)}</strong> · ${plan.days} days / week · ${plan.mins} min sessions`
      : `<strong>Campaign complete.</strong> Twelve weeks in the books — measure, compare, and start the next cycle heavier.`;

    let nextSeen = false;
    $("#weeksGrid").innerHTML = Array.from({ length: 12 }, (_, i) => {
      const w = i + 1;
      const ph = phaseForWeek(w);
      const weekSessions = plan.sessions.filter((s) => s.week === w);
      const allDone = weekSessions.every((s) => s.done);
      const dots = weekSessions.map((s) => {
        let cls = s.done ? " is-done" : "";
        if (!s.done && !nextSeen) { cls = " is-next"; nextSeen = true; }
        return `<span class="week__dot${cls}" title="${esc(PROGRAM[s.dayKey].title)}"></span>`;
      }).join("");
      const state = w === curWeek && next ? " is-current" : (allDone ? " is-past" : "");
      const deload = ph.setMult < 1 ? " is-deload" : "";
      return `<div class="week${state}${deload}">
        <span class="week__num">W${w}</span>
        <span class="week__phase">${esc(ph.name)}</span>
        <div class="week__dots">${dots}</div>
      </div>`;
    }).join("");

    $("#phaseNote").textContent = `${phase.name} — ${phase.note}`;

    if (next) {
      $("#upNext").hidden = false;
      $("#upNext").textContent =
        `Up next — Week ${next.week}, session ${next.slot + 1}: ${PROGRAM[next.dayKey].title} · ${phase.name} (${phase.rpe}, ${phase.reps} reps).`;
    }

    // Welcome-back band: surface a paused plan instead of stalling silently.
    const wb = $("#welcomeBack");
    const days = daysSinceLastActivity();
    if (next && days !== null && days >= 10) {
      wb.hidden = false;
      $("#welcomeTitle").textContent = "Welcome back.";
      $("#welcomeNote").textContent =
        `It's been ${days} days. You paused at Week ${curWeek} — pick up exactly where you left off with ${PROGRAM[next.dayKey].title}, or restart the plan below. The statue doesn't finish itself.`;
    } else {
      wb.hidden = true;
    }

    updateHomeState();
  }

  /* ================= home orientation ================= */

  function daysSinceLastActivity() {
    const log = store.get(KEY_LOG, []);
    if (!log.length) return null;
    const last = new Date(log[log.length - 1].date);
    return Math.floor((Date.now() - last.getTime()) / 86400000);
  }

  // The Today card + bottom bar: one state-aware answer to
  // "what do I train today, and where do I start?"
  function updateHomeState() {
    const plan = getPlan();
    const next = plan ? nextPlanSession(plan) : null;
    const log = store.get(KEY_LOG, []);
    const weekDone = log.filter((l) => weekId(l.date) === weekId(new Date())).length;
    const weekTarget = plan ? plan.days : 3;

    // weekly ring
    const C = 226.2;
    const frac = Math.min(1, weekTarget ? weekDone / weekTarget : 0);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        $("#ringFill").style.strokeDashoffset = (C * (1 - frac)).toFixed(1);
      }));
    $("#ringNum").textContent = weekDone;
    $("#ringLabel").textContent = `of ${weekTarget} this wk`;
    $("#ringSvg").setAttribute("aria-label", `${weekDone} of ${weekTarget} sessions this week`);

    // streak + total line
    const weeks = new Set(log.map((l) => weekId(l.date)));
    let streak = 0;
    const cursor = new Date();
    if (!weeks.has(weekId(cursor))) cursor.setDate(cursor.getDate() - 7);
    while (weeks.has(weekId(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 7); }
    $("#todaySub").textContent = log.length
      ? `${streak > 0 ? `${streak}-week streak · ` : ""}${log.length} session${log.length === 1 ? "" : "s"} logged`
      : "Session one is waiting.";

    // state-aware card + CTAs
    const eyebrow = $("#todayEyebrow"), title = $("#todayTitle"), meta = $("#todayMeta");
    const btn = $("#todayBtn"), bar = $("#barCta");
    const setCta = (label, href) => {
      btn.textContent = label; btn.setAttribute("href", href);
      bar.textContent = label; bar.setAttribute("href", href);
    };

    if (currentSession) {
      const day = PROGRAM[currentSession.dayKey];
      eyebrow.textContent = "In progress";
      title.textContent = day.title;
      meta.textContent = currentSession.phaseName
        ? `Week ${currentSession.week} · ${currentSession.phaseName}`
        : "Freestyle session";
      setCta("Resume workout", "#session");
    } else if (plan && next) {
      const phase = phaseForWeek(next.week);
      eyebrow.textContent = `Today — Week ${next.week} · ${phase.name}`;
      title.textContent = PROGRAM[next.dayKey].title;
      meta.textContent = `~${sessTime} min · ${phase.reps} reps · ${phase.rpe}`;
      setCta("Start workout", "#arsenal");
    } else if (plan && !next) {
      eyebrow.textContent = "Campaign complete";
      title.textContent = "Twelve weeks, done.";
      meta.textContent = "Measure, compare, then go again heavier.";
      setCta("Start next 12 weeks", "#plan");
    } else {
      eyebrow.textContent = "Begin";
      title.textContent = "Build your 12-week plan";
      meta.textContent = "Two questions — training days and session length.";
      setCta("Build my plan", "#plan");
    }
  }

  /* ================= motion: count-up numbers ================= */

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function countUp(el) {
    const target = parseInt(el.textContent, 10);
    if (REDUCED || !target || target > 999) return;
    const t0 = performance.now(), dur = 900;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ================= split list (protocol) ================= */

  function renderSplit() {
    $("#splitList").innerHTML = DAY_ORDER.map((key) => {
      const d = PROGRAM[key];
      return `<li><span class="split__day">${esc(d.title)}</span><span class="split__desc">${esc(d.desc)}</span></li>`;
    }).join("");
  }

  /* ================= equipment grid ================= */

  function renderEquip() {
    $("#equipGrid").innerHTML = EQUIPMENT.map((e) => `
      <button type="button" class="equip__card${selectedEquip.has(e.id) ? " is-on" : ""}"
              data-id="${e.id}" aria-pressed="${selectedEquip.has(e.id)}">
        <span class="equip__icon" aria-hidden="true">${e.icon}</span>
        <span class="equip__name">${e.name}</span>
        <span class="equip__note">${e.note}</span>
      </button>`).join("");
  }

  $("#equipGrid").addEventListener("click", (ev) => {
    const card = ev.target.closest(".equip__card");
    if (!card) return;
    const id = card.dataset.id;
    selectedEquip.has(id) ? selectedEquip.delete(id) : selectedEquip.add(id);
    store.set(KEY_EQUIP, [...selectedEquip]);
    card.classList.toggle("is-on");
    card.setAttribute("aria-pressed", card.classList.contains("is-on"));
    renderEquipNote();
  });

  // Non-blocking heads-up so a full-gym user never gets a silent bodyweight day.
  function renderEquipNote() {
    const note = $("#equipNote");
    const n = selectedEquip.size;
    if (n === 0) {
      note.hidden = false;
      note.classList.add("equipnote--warn");
      note.textContent = "No equipment selected — this will be a bodyweight-only session. Tap your gear above to include loaded lifts.";
    } else {
      note.hidden = false;
      note.classList.remove("equipnote--warn");
      note.textContent = `${n} tool${n === 1 ? "" : "s"} selected — the session will use the best variations they allow.`;
    }
  }

  /* ================= time-today chips ================= */

  function renderTimeToday() {
    $("#timeTodayRow").innerHTML = TIME_OPTIONS.map((t) =>
      `<button type="button" class="focus__chip${t.mins === sessTime ? " is-on" : ""}" data-mins="${t.mins}">${t.label}</button>`).join("");
    const opt = TIME_OPTIONS.find((t) => t.mins === sessTime) || TIME_OPTIONS[2];
    const plan = getPlan();
    const planNote = plan && plan.mins !== sessTime ? ` (your plan default is ${plan.mins} min).` : ".";
    $("#timeTodayHint").textContent = opt.note.replace(/\.$/, "") + planNote;
  }

  $("#timeTodayRow").addEventListener("click", (ev) => {
    const chip = ev.target.closest("[data-mins]");
    if (!chip) return;
    sessTime = +chip.dataset.mins;
    renderTimeToday();
    updateHomeState();
  });

  /* ================= focus chips ================= */

  function renderFocus() {
    const plan = getPlan();
    const autoLabel = plan ? "As planned" : "Auto (rotation)";
    const chips = [{ key: "auto", label: autoLabel }]
      .concat(DAY_ORDER.concat(["fullbody"]).map((key) => ({ key, label: PROGRAM[key].title })));
    $("#focusRow").innerHTML = chips.map((c) =>
      `<button type="button" class="focus__chip${c.key === selectedFocus ? " is-on" : ""}" data-key="${c.key}">${esc(c.label)}</button>`).join("");
    updateFocusHint();
  }

  function updateFocusHint() {
    const plan = getPlan();
    if (selectedFocus !== "auto") {
      $("#focusHint").textContent = plan
        ? "Overriding today's planned focus — the session still counts toward the plan."
        : "Overriding the rotation — the journal will pick up from here.";
      return;
    }
    if (plan) {
      const next = nextPlanSession(plan);
      $("#focusHint").textContent = next
        ? `Following the plan: ${PROGRAM[next.dayKey].title}.`
        : "Plan complete — sessions now follow the free rotation.";
    } else {
      $("#focusHint").textContent = `Next in the rotation: ${PROGRAM[nextDayInRotation()].title}. (Set up the 12-week plan above for periodized programming.)`;
    }
  }

  $("#focusRow").addEventListener("click", (ev) => {
    const chip = ev.target.closest(".focus__chip");
    if (!chip) return;
    selectedFocus = chip.dataset.key;
    document.querySelectorAll("#focusRow .focus__chip").forEach((c) =>
      c.classList.toggle("is-on", c === chip));
    updateFocusHint();
  });

  /* ================= history & progression ================= */

  const getHist = () => store.get(KEY_HIST, {});

  function lastEntry(name) {
    const h = getHist()[name];
    return h && h.length ? h[h.length - 1] : null;
  }

  function fmtLast(entry) {
    const sets = entry.sets.map((s) => (s.w ? `${s.w}×${s.r || "?"}` : `${s.r || "?"} reps`)).join(", ");
    const when = new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `Last (${when}): ${sets}`;
  }

  function repTop(repsStr) {
    const nums = String(repsStr).match(/\d+/g);
    return nums ? +nums[nums.length - 1] : 12;
  }

  function progressionHint(name, phase) {
    const entry = lastEntry(name);
    if (!entry || !entry.sets.length) return "First time logged — find a weight that leaves 2 reps in the tank.";
    const top = repTop(phase ? phase.reps : "12");
    const allTop = entry.sets.every((s) => (+s.r || 0) >= top);
    const hasWeight = entry.sets.some((s) => +s.w > 0);
    if (allTop) return hasWeight
      ? "You topped the rep range — add ~5% weight this session."
      : "You topped the rep range — add load, slow the tempo, or pick a harder variation.";
    return "Beat the logbook: same weight, one more rep per set.";
  }

  /* ================= session generation ================= */

  const isAvailable = (exercise) => exercise.equip.every((id) => selectedEquip.has(id));

  function availablePool(pool) {
    const a = pool.filter(isAvailable);
    return a.length ? a : [pool[pool.length - 1]]; // last entry is the bodyweight fallback
  }

  function roundsFromScheme(scheme) {
    const m = scheme.match(/^(\d+)/);
    return m ? Math.min(parseInt(m[1], 10), 6) : 3;
  }

  function videoUrl(name) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " exercise form tutorial")}`;
  }

  // Parse a target rep range from a phase string ("12–15") or a block
  // scheme ("4 rounds · 8–12 reps · rest 60s").
  function repRange(str, fromScheme) {
    const s = String(str || "");
    const m = fromScheme
      ? s.match(/(\d+)\s*[–-]\s*(\d+)\s*reps/) || s.match(/(\d+)\s*reps/)
      : s.match(/(\d+)\s*[–-]\s*(\d+)/) || s.match(/(\d+)/);
    if (!m) return { lo: 8, hi: 12 };
    return m[2] ? { lo: +m[1], hi: +m[2] } : { lo: +m[1], hi: +m[1] };
  }

  // The rep range the app autoregulates against — an applied intensity
  // technique can override it (e.g. reps-to-failure → 20–30).
  function effectiveTarget(ex) {
    if (ex.technique) {
      const t = INTENSITY.find((i) => i.id === ex.technique);
      if (t && t.rep) return t.rep;
    }
    return ex.baseTarget || { lo: 8, hi: 12 };
  }

  function makeExercise(chosen, rounds, phase, target) {
    const last = lastEntry(chosen.name);
    return {
      name: chosen.name,
      cue: chosen.cue,
      meta: chosen.equip.length
        ? chosen.equip.map((id) => EQUIPMENT.find((e) => e.id === id).name).join(" + ")
        : "Bodyweight (add load if you have it)",
      last: last ? fmtLast(last) : null,
      hint: progressionHint(chosen.name, phase),
      baseTarget: target || { lo: 8, hi: 12 },
      technique: techPref[chosen.name] || null, // auto-apply a remembered technique
      techRemembered: !!techPref[chosen.name],
      sets: Array.from({ length: rounds }, (_, i) => ({
        w: last && last.sets[i] ? last.sets[i].w : "",
        r: last && last.sets[i] ? last.sets[i].r : "",
        done: false,
      })),
    };
  }

  // Per-set autoregulation: compare logged reps to the target and say what
  // to change next set to keep every set at the intended effort.
  function evaluateSet(reps, target, hasTechnique) {
    const r = +reps;
    if (!r) return null;
    const { lo, hi } = target;
    if (r > hi + 2) {
      return {
        kind: "light",
        msg: hasTechnique
          ? `${r} reps — still light for the target ${lo}–${hi}. Add another technique, add load, or push reps higher next set.`
          : `${r} reps beats the target ${lo}–${hi} — that load is light. Tap ⚡ Intensify (slow negatives or single-arm) or add weight so the set actually challenges you.`,
      };
    }
    if (r < lo) {
      return { kind: "heavy", msg: `${r} reps — short of the ${lo}–${hi} target. Drop ~10%, or take a 15s rest-pause and finish the reps with clean form.` };
    }
    return { kind: "good", msg: `${r} reps — right in the ${lo}–${hi} zone. Repeat it, and aim for one more rep next set to progress.` };
  }

  function buildSession(reroll = false) {
    const plan = getPlan();
    const planNext = plan ? nextPlanSession(plan) : null;

    let dayKey;
    if (selectedFocus !== "auto") dayKey = selectedFocus;
    else if (planNext) dayKey = planNext.dayKey;
    else dayKey = nextDayInRotation();

    const day = PROGRAM[dayKey];
    const phase = planNext ? phaseForWeek(planNext.week) : null;
    // Use the time chosen for today (defaults to the plan's session length).
    const timeOpt = TIME_OPTIONS.find((t) => t.mins === sessTime) || TIME_OPTIONS[2];

    const prev = reroll && currentSession && currentSession.dayKey === dayKey ? currentSession : null;
    const blocks = day.blocks.slice(0, timeOpt.blocks);

    currentSession = {
      dayKey,
      week: planNext ? planNext.week : null,
      phaseName: phase ? phase.name : null,
      phaseReps: phase ? phase.reps : null,
      phaseRpe: phase ? phase.rpe : null,
      timeNote: timeOpt.extraNote || null,
      blocks: blocks.map((block, bi) => {
        let rounds = Math.max(2, roundsFromScheme(block.scheme) + timeOpt.roundAdj);
        if (phase) {
          rounds = Math.max(2, Math.round(rounds * phase.setMult));
          if (phase.setAdd && bi === 0) rounds += phase.setAdd;
        }
        const target = phase ? repRange(phase.reps) : repRange(block.scheme, true);
        return {
          label: block.label,
          scheme: block.scheme,
          exercises: block.slots.map((pool, si) => {
            const avail = availablePool(pool);
            let chosen = avail[0];
            if (prev && prev.blocks[bi] && prev.blocks[bi].exercises[si] && avail.length > 1) {
              const others = avail.filter((e) => e.name !== prev.blocks[bi].exercises[si].name);
              chosen = others[Math.floor(Math.random() * others.length)] || avail[0];
            }
            return makeExercise(chosen, rounds, phase, target);
          }),
        };
      }),
    };
    saveActive();
    renderSession();
  }

  const saveActive = () => store.set(KEY_ACTIVE, currentSession);

  /* ================= session rendering ================= */

  function renderSession() {
    if (!currentSession) return;
    const day = PROGRAM[currentSession.dayKey];

    $("#sessionTitle").innerHTML = esc(day.title).replace(/ (\S+)$/, " <em>$1</em>");
    $("#sessionSub").textContent = day.sub + (currentSession.timeNote ? " " + currentSession.timeNote : "");
    $("#sessionScience").textContent = day.science || "";

    const chip = $("#phaseChip");
    if (currentSession.phaseName) {
      chip.hidden = false;
      chip.textContent = `Week ${currentSession.week} · ${currentSession.phaseName} · ${currentSession.phaseRpe} · ${currentSession.phaseReps} reps`;
    } else chip.hidden = true;

    $("#workoutBlocks").innerHTML = currentSession.blocks.map((block, bi) => `
      <article class="block">
        <div class="block__head">
          <span class="block__label">${esc(block.label)}</span>
          <span class="block__scheme">${esc(block.scheme)}${currentSession.phaseReps ? ` · this phase: ${esc(currentSession.phaseReps)} reps @ ${esc(currentSession.phaseRpe)}` : ""}</span>
        </div>
        ${block.exercises.map((x, si) => {
          const tech = x.technique ? INTENSITY.find((i) => i.id === x.technique) : null;
          const tgt = effectiveTarget(x);
          return `
          <div class="exercise">
            <h3 class="exercise__name">${esc(x.name)}</h3>
            <div class="exercise__actions">
              <button type="button" class="chipbtn${tech ? " is-on" : ""}" data-intensify data-b="${bi}" data-s="${si}" title="Make a light load harder">⚡ ${tech ? "Intensity" : "Intensify"}</button>
              <button type="button" class="chipbtn" data-swap data-b="${bi}" data-s="${si}" title="Swap for an equivalent">⇄ Swap</button>
              <a class="chipbtn" href="${videoUrl(x.name)}" target="_blank" rel="noopener" title="Watch a form tutorial">▶ Form</a>
            </div>
            <p class="exercise__meta">${esc(x.meta)} · target ${tgt.lo}–${tgt.hi} reps</p>
            <p class="exercise__cue">${esc(x.cue)}</p>
            ${tech ? `<p class="technique">⚡ ${esc(tech.name)} — ${esc(tech.cue)}${x.techRemembered ? `<span class="technique__saved">remembered for this lift</span>` : ""}</p>` : ""}
            ${x.last ? `<p class="exercise__last">${esc(x.last)}</p>` : ""}
            <p class="exercise__cue">${esc(x.hint)}</p>
            <div class="setrows">
              ${x.sets.map((s, di) => `
                <div class="setrow">
                  <span class="setrow__idx">${di + 1}</span>
                  <input type="number" inputmode="decimal" min="0" step="0.5" placeholder="weight"
                         value="${esc(s.w)}" data-w data-b="${bi}" data-s="${si}" data-d="${di}" aria-label="Set ${di + 1} weight" />
                  <span class="setrow__x">×</span>
                  <input type="number" inputmode="numeric" min="0" step="1" placeholder="reps"
                         value="${esc(s.r)}" data-r data-b="${bi}" data-s="${si}" data-d="${di}" aria-label="Set ${di + 1} reps" />
                  <button type="button" class="setdot${s.done ? " is-done" : ""}"
                          data-dot data-b="${bi}" data-s="${si}" data-d="${di}"
                          aria-label="Mark set ${di + 1} done" aria-pressed="${s.done}"></button>
                </div>`).join("")}
            </div>
            <p class="autoreg" data-ar="${bi}-${si}" hidden></p>
          </div>`;
        }).join("")}
      </article>`).join("");

    renderLightAll();
    $("#session").hidden = false;
    updateSetsProgress();
    updateHomeState();
    requestWake();
  }

  // Session-wide intensity: one control makes every move a light-day workout.
  function renderLightAll() {
    if (!currentSession) return;
    const techs = new Set();
    currentSession.blocks.forEach((b) => b.exercises.forEach((x) => techs.add(x.technique || null)));
    const shared = techs.size === 1 ? [...techs][0] : "__mixed__";
    const chips = [{ id: null, label: "Off" }, ...INTENSITY.map((t) => ({ id: t.id, label: t.name }))];
    $("#lightAllRow").innerHTML = chips.map((c) =>
      `<button type="button" class="focus__chip${c.id === shared ? " is-on" : ""}" data-lightall="${c.id === null ? "off" : c.id}">${esc(c.label)}</button>`).join("");
  }

  $("#lightAllRow").addEventListener("click", (ev) => {
    const chip = ev.target.closest("[data-lightall]");
    if (!chip || !currentSession) return;
    const id = chip.dataset.lightall === "off" ? null : chip.dataset.lightall;
    // apply to the whole session for TODAY (not saved permanently per lift)
    currentSession.blocks.forEach((b) => b.exercises.forEach((x) => {
      x.technique = id;
      x.techRemembered = false;
    }));
    saveActive();
    renderSession();
  });

  // Live "sets done" readout + progress bar in the sticky timer bar.
  function updateSetsProgress() {
    const out = $("#setsDone"), bar = $("#setsBar");
    if (!currentSession) { out.hidden = true; bar.style.width = "0"; return; }
    let done = 0, total = 0;
    currentSession.blocks.forEach((b) => b.exercises.forEach((x) => {
      done += x.sets.filter((s) => s.done).length;
      total += x.sets.length;
    }));
    out.hidden = false;
    out.textContent = `${done} / ${total} sets`;
    bar.style.width = total ? `${Math.round((done / total) * 100)}%` : "0";
  }

  // The rest a block prescribes ("rest 60s", "1 min rest") — default 45s.
  function schemeRest(scheme) {
    const s = String(scheme || "");
    let m = s.match(/rest\s+(\d+)\s*s/i) || s.match(/(\d+)\s*s\s+rest/i);
    if (m) return +m[1];
    m = s.match(/(\d+)\s*min\s+rest/i) || s.match(/rest\s+(\d+)\s*min/i);
    if (m) return +m[1] * 60;
    return 45;
  }

  $("#workoutBlocks").addEventListener("click", (ev) => {
    const dot = ev.target.closest("[data-dot]");
    if (dot) {
      const { b, s, d } = dot.dataset;
      const set = currentSession.blocks[b].exercises[s].sets[d];
      set.done = !set.done;
      dot.classList.toggle("is-done", set.done);
      dot.setAttribute("aria-pressed", set.done);
      saveActive();
      updateSetsProgress();
      // completing a set starts the block's prescribed rest automatically
      if (set.done) startRest(schemeRest(currentSession.blocks[b].scheme));
      return;
    }
    const swap = ev.target.closest("[data-swap]");
    if (swap) {
      const { b, s } = swap.dataset;
      swapExercise(+b, +s);
      return;
    }
    const intensify = ev.target.closest("[data-intensify]");
    if (intensify) {
      const { b, s } = intensify.dataset;
      cycleIntensity(+b, +s);
    }
  });

  // Cycle: none → technique 1 → … → technique N → none.
  // The choice is remembered per lift, so it auto-applies next time.
  function cycleIntensity(bi, si) {
    const ex = currentSession.blocks[bi].exercises[si];
    const ids = [null, ...INTENSITY.map((t) => t.id)];
    ex.technique = ids[(ids.indexOf(ex.technique || null) + 1) % ids.length];
    ex.techRemembered = true; // it's now saved for this lift
    if (ex.technique) techPref[ex.name] = ex.technique;
    else delete techPref[ex.name];
    store.set(KEY_TECH, techPref);
    saveActive();
    renderSession();
  }

  $("#workoutBlocks").addEventListener("input", (ev) => {
    const el = ev.target;
    if (!el.matches("[data-w],[data-r]")) return;
    const { b, s, d } = el.dataset;
    const ex = currentSession.blocks[b].exercises[s];
    const set = ex.sets[d];
    if (el.hasAttribute("data-w")) set.w = el.value;
    else { set.r = el.value; updateAutoreg(+b, +s, +d); }
    saveActive();
  });

  function updateAutoreg(bi, si, di) {
    const ex = currentSession.blocks[bi].exercises[si];
    const line = document.querySelector(`.autoreg[data-ar="${bi}-${si}"]`);
    if (!line) return;
    const res = evaluateSet(ex.sets[di].r, effectiveTarget(ex), !!ex.technique);
    if (!res) { line.hidden = true; line.textContent = ""; return; }
    line.hidden = false;
    line.className = `autoreg autoreg--${res.kind}`;
    line.textContent = `Set ${di + 1}: ${res.msg}`;
  }

  function swapExercise(bi, si) {
    const day = PROGRAM[currentSession.dayKey];
    const pool = day.blocks[bi].slots[si];
    const avail = availablePool(pool);
    if (avail.length < 2) return;
    const cur = currentSession.blocks[bi].exercises[si];
    const idx = avail.findIndex((e) => e.name === cur.name);
    const chosen = avail[(idx + 1) % avail.length];
    const phase = currentSession.phaseName
      ? PHASES.find((p) => p.name === currentSession.phaseName && currentSession.week >= p.from && currentSession.week <= p.to) || phaseForWeek(currentSession.week)
      : null;
    currentSession.blocks[bi].exercises[si] = makeExercise(chosen, cur.sets.length, phase, cur.baseTarget);
    saveActive();
    renderSession();
  }

  $("#buildBtn").addEventListener("click", () => {
    buildSession(false);
    $("#session").scrollIntoView({ behavior: "smooth" });
  });
  $("#rerollBtn").addEventListener("click", () => buildSession(true));

  /* ================= rest timer ================= */

  let timerId = null;

  function startRest(secs) {
    clearInterval(timerId);
    const clock = $("#restClock");
    clock.hidden = false;
    let left = secs;
    const paint = () => {
      clock.textContent = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
    };
    paint();
    timerId = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(timerId);
        clock.textContent = "GO.";
        setTimeout(() => { clock.hidden = true; }, 2500);
        return;
      }
      paint();
    }, 1000);
  }

  $("#restBtn").addEventListener("click", (e) => startRest(+e.currentTarget.dataset.secs));
  $("#restBtnLong").addEventListener("click", (e) => startRest(+e.currentTarget.dataset.secs));

  /* ================= finishing ================= */

  $("#finishBtn").addEventListener("click", () => {
    if (!currentSession) return;

    // one shared timestamp across log/plan/history, so deleting the
    // journal entry can find and revert everything this finish wrote
    const stamp = new Date().toISOString();

    // save exercise history (only sets marked done, or with reps entered)
    const hist = getHist();
    let done = 0, total = 0;
    currentSession.blocks.forEach((b) => b.exercises.forEach((x) => {
      total += x.sets.length;
      const logged = x.sets.filter((s) => s.done || +s.r > 0);
      done += x.sets.filter((s) => s.done).length;
      if (logged.length) {
        (hist[x.name] = hist[x.name] || []).push({
          date: stamp,
          sets: logged.map((s) => ({ w: s.w || "", r: s.r || "" })),
        });
        if (hist[x.name].length > 30) hist[x.name] = hist[x.name].slice(-30);
      }
    }));
    store.set(KEY_HIST, hist);

    // advance the plan
    const plan = getPlan();
    let weekInfo = "";
    if (plan) {
      const next = nextPlanSession(plan);
      if (next) {
        next.done = true;
        next.doneAt = stamp;
        store.set(KEY_PLAN, plan);
        weekInfo = `W${next.week}`;
      }
    }

    // journal entry
    const log = store.get(KEY_LOG, []);
    log.push({
      date: stamp,
      dayKey: currentSession.dayKey,
      title: PROGRAM[currentSession.dayKey].title,
      week: weekInfo,
      done, total,
    });
    store.set(KEY_LOG, log);

    currentSession = null;
    store.del(KEY_ACTIVE);
    $("#session").hidden = true;
    releaseWake();
    renderPlan();
    renderJournal();
    renderProgress();
    updateFocusHint();
    $("#journal").scrollIntoView({ behavior: "smooth" });
  });

  // Discard an in-progress session: nothing is logged, the plan doesn't advance.
  $("#discardBtn").addEventListener("click", () => {
    if (!currentSession) return;
    if (!confirm("Discard this session? Nothing will be logged and the plan won't advance.")) return;
    currentSession = null;
    store.del(KEY_ACTIVE);
    $("#session").hidden = true;
    releaseWake();
    updateHomeState();
    $("#arsenal").scrollIntoView({ behavior: "smooth" });
  });

  // Delete a submitted session: removes the journal entry and reverts what
  // that finish wrote — the plan slot it completed and the exercise history
  // it recorded (so prefill, hints, and charts forget it too).
  function deleteLogEntry(idx) {
    const log = store.get(KEY_LOG, []);
    const entry = log[idx];
    if (!entry) return;
    const when = new Date(entry.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    if (!confirm(`Delete "${entry.title}" (${when})? This also removes the weights logged in that session and re-opens its slot in the plan.`)) return;

    log.splice(idx, 1);
    store.set(KEY_LOG, log);

    const t = new Date(entry.date).getTime();
    const near = (iso) => iso && Math.abs(new Date(iso).getTime() - t) < 10000;

    // re-open the plan slot (exact stamp match; fall back to the most
    // recent completed slot of the same day type for older entries)
    const plan = getPlan();
    if (plan) {
      let sess = plan.sessions.filter((s) => s.done && near(s.doneAt)).pop();
      if (!sess && entry.week) {
        sess = plan.sessions.filter((s) => s.done && s.dayKey === entry.dayKey).pop();
      }
      if (sess) {
        sess.done = false;
        delete sess.doneAt;
        store.set(KEY_PLAN, plan);
      }
    }

    // drop the history entries written by that same finish
    const hist = getHist();
    Object.keys(hist).forEach((name) => {
      hist[name] = hist[name].filter((e) => !near(e.date));
      if (!hist[name].length) delete hist[name];
    });
    store.set(KEY_HIST, hist);

    renderPlan();
    renderJournal();
    renderProgress();
    updateFocusHint();
  }

  /* ================= the blueprint ================= */

  let bpUnit = "imperial";
  let bpAmbition = "adonis";
  let lastBlueprint = null;

  const toCm = (v) => bpUnit === "imperial" ? v * 2.54 : v;
  const toKg = (v) => bpUnit === "imperial" ? v * 0.453592 : v;
  const lenOut = (cm) => bpUnit === "imperial" ? +(cm / 2.54).toFixed(1) : +cm.toFixed(0);
  const wtOut = (kg) => bpUnit === "imperial" ? +(kg * 2.20462).toFixed(0) : +kg.toFixed(0);
  const lenU = () => bpUnit === "imperial" ? "in" : "cm";
  const wtU = () => bpUnit === "imperial" ? "lb" : "kg";

  function renderBpAmbition() {
    $("#bpAmbition").innerHTML = AMBITIONS.map((a) =>
      `<button type="button" class="focus__chip${a.id === bpAmbition ? " is-on" : ""}" data-amb="${a.id}">${esc(a.name)}</button>`).join("");
    $("#bpAmbitionNote").textContent = AMBITIONS.find((a) => a.id === bpAmbition).note;
  }

  function syncBpUnitLabels() {
    const l = bpUnit === "imperial" ? "in" : "cm";
    $("#uLen").textContent = `(${l})`;
    $("#uWt").textContent = `(${bpUnit === "imperial" ? "lb" : "kg"})`;
    $("#uLen2").textContent = `(${l}, optional)`;
    $("#uLen3").textContent = `(${l}, optional)`;
  }

  $("#bpForm").querySelector(".bp__units").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-unit]");
    if (!b) return;
    bpUnit = b.dataset.unit;
    document.querySelectorAll("#bpForm .bp__units .focus__chip").forEach((c) => c.classList.toggle("is-on", c === b));
    syncBpUnitLabels();
  });

  $("#bpAmbition").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-amb]");
    if (!b) return;
    bpAmbition = b.dataset.amb;
    renderBpAmbition();
  });

  $("#bpForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const heightCm = toCm(+$("#bpHeight").value);
    const weightKg = toKg(+$("#bpWeight").value);
    if (!(heightCm > 0) || !(weightKg > 0)) { alert("Enter your height and weight."); return; }
    const waistIn = +$("#bpWaist").value;
    const wristIn = +$("#bpWrist").value;
    const waistCmNow = waistIn > 0 ? toCm(waistIn) : null;
    const wristCm = wristIn > 0 ? toCm(wristIn) : null;

    const amb = AMBITIONS.find((a) => a.id === bpAmbition);
    const h2 = (heightCm / 100) ** 2;
    const bfMid = (amb.bf[0] + amb.bf[1]) / 2 / 100;
    const wLoKg = amb.ffmi[0] * h2 / (1 - bfMid);
    const wHiKg = amb.ffmi[1] * h2 / (1 - bfMid);
    const wMidKg = (wLoKg + wHiKg) / 2;

    const targetWaistCm = AESTHETIC_WAIST_RATIO * heightCm;
    const targetShoulderCm = targetWaistCm * GOLDEN_RATIO;
    const limbs = wristCm ? GRECIAN.map((g) => ({ ...g, cm: wristCm * g.k })) : null;

    lastBlueprint = {
      ambName: amb.name,
      weightNow: wtOut(weightKg), weightTarget: wtOut(wMidKg), wtUnit: wtU(),
      waistNow: waistCmNow ? lenOut(waistCmNow) : null, waistTarget: lenOut(targetWaistCm),
      shoulderTarget: lenOut(targetShoulderCm),
      armTarget: limbs ? lenOut(limbs.find((l) => l.id === "arm").cm) : null,
      chestTarget: limbs ? lenOut(limbs.find((l) => l.id === "chest").cm) : null,
      lenUnit: lenU(),
    };

    const stat = (num, unit, label, sub) =>
      `<div class="bp__stat"><span class="bp__statnum">${num}${unit ? `<span style="font-size:0.7em"> ${unit}</span>` : ""}</span>
        <span class="bp__statlabel">${label}</span>${sub ? `<span class="bp__statsub">${sub}</span>` : ""}</div>`;

    let html = `<p class="bp__headline">Your <em>${esc(amb.name)}</em> blueprint</p>
      <div class="bp__grid">
        ${stat(`${amb.bf[0]}–${amb.bf[1]}`, "%", "Target body fat", "healthy & visible")}
        ${stat(`${wtOut(wLoKg)}–${wtOut(wHiKg)}`, wtU(), "Target weight", `at ~${Math.round(bfMid * 100)}% body fat`)}
        ${stat(lenOut(targetWaistCm), lenU(), "Target waist", "46% of height")}
        ${stat(lenOut(targetShoulderCm), lenU(), "Target shoulders", "1.618 × waist")}
      </div>
      <p class="bp__ratio">The Adonis Index — shoulders <strong>1.618×</strong> your waist. That golden ratio <em>is</em> the V-taper the eye reads as powerful.</p>`;

    if (limbs) {
      html += `<div class="bp__limbs"><p class="eyebrow">Classic proportions (from your wrist)</p>
        <p class="bp__limbrow">${limbs.map((l) => `<span><strong>${lenOut(l.cm)} ${lenU()}</strong> ${esc(l.label)}</span>`).join("")}</p></div>`;
    }

    html += `<p class="bp__disclaimer">These are aesthetic ideals and a planning aid for a lean, natural, healthy build — not medical advice. The body-fat floor is set for health; going lower isn't better. Frame and genetics vary; treat this as a direction, not a verdict.</p>
      <button type="button" class="btn btn--primary btn--sm" id="bpSetGoals">Set these as my goals</button>`;

    const res = $("#bpResult");
    res.innerHTML = html;
    res.hidden = false;
    res.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  $("#bpResult").addEventListener("click", (ev) => {
    if (ev.target.closest("#bpSetGoals")) setBlueprintGoals();
  });

  function setBlueprintGoals() {
    const bp = lastBlueprint;
    if (!bp) return;
    const meas = store.get(KEY_MEAS, []);
    const latest = meas.length ? meas[meas.length - 1].vals : {};
    const goals = getGoals();
    const added = [];
    const add = (name, current, target, unit) => {
      if (current == null || current === "" || isNaN(+current) || !(+target > 0)) return;
      const g = { name, start: +current, current: +current, target: +target, unit };
      const i = goals.findIndex((x) => x.name.toLowerCase() === name.toLowerCase());
      if (i >= 0) goals[i] = g; else goals.push(g);
      added.push(name);
    };
    add("Bodyweight", bp.weightNow, bp.weightTarget, bp.wtUnit);
    add("Waist", bp.waistNow != null ? bp.waistNow : latest.waist, bp.waistTarget, bp.lenUnit);
    if (bp.shoulderTarget) add("Shoulders", latest.shoulders, bp.shoulderTarget, bp.lenUnit);
    if (bp.armTarget) add("Arm", latest.arm, bp.armTarget, bp.lenUnit);
    if (bp.chestTarget) add("Chest", latest.chest, bp.chestTarget, bp.lenUnit);
    store.set(KEY_GOALS, goals);
    renderGoals();
    const missing = ["Shoulders", "Arm", "Chest"].filter((m) => !added.includes(m) && (m === "Shoulders" || bp[m.toLowerCase() + "Target"]));
    alert(`Goals set: ${added.join(", ")}.` + (missing.length
      ? ` Log a ${missing.join(" / ")} measurement in The Mirror and re-run to track those too.`
      : ""));
    $("#goalsList").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ================= goals ================= */

  const getGoals = () => store.get(KEY_GOALS, []);

  const GOAL_PRESETS = [
    { name: "Bodyweight", unit: "lb" },
    { name: "Waist", unit: "in" },
    { name: "Bench press", unit: "lb" },
    { name: "Pull-ups", unit: "reps" },
    { name: "Shoulder press", unit: "lb" },
  ];

  function goalProgress(g) {
    const start = +g.start, cur = +g.current, target = +g.target;
    if (start === target) return 100;
    return Math.max(0, Math.min(100, Math.round(((cur - start) / (target - start)) * 100)));
  }

  function renderGoals() {
    const goals = getGoals();
    $("#goalsEmpty").hidden = goals.length > 0;
    $("#goalsList").innerHTML = goals.map((g, i) => `
      <li>
        <div class="goal__top">
          <span class="goal__name">${esc(g.name)}</span>
          <span class="goal__nums">
            <input type="number" step="any" value="${esc(g.current)}" data-goal="${i}" aria-label="Current value for ${esc(g.name)}" />
            <span>/ ${esc(g.target)} ${esc(g.unit || "")} · ${goalProgress(g)}%</span>
            <button type="button" class="goal__del" data-goaldel="${i}" aria-label="Delete goal" title="Delete">✕</button>
          </span>
        </div>
        <div class="goal__bar"><span style="width:${goalProgress(g)}%"></span></div>
      </li>`).join("");

    $("#goalPresets").innerHTML = GOAL_PRESETS
      .filter((p) => !goals.some((g) => g.name === p.name))
      .map((p) => `<button type="button" class="chipbtn" data-preset="${esc(p.name)}" data-unit="${esc(p.unit)}">+ ${esc(p.name)}</button>`).join("");
  }

  $("#goalForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const goals = getGoals();
    const current = $("#goalCurrent").value;
    goals.push({
      name: $("#goalName").value.trim(),
      start: current,
      current,
      target: $("#goalTarget").value,
      unit: $("#goalUnit").value.trim(),
    });
    store.set(KEY_GOALS, goals);
    ev.target.reset();
    renderGoals();
  });

  $("#goalPresets").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-preset]");
    if (!btn) return;
    $("#goalName").value = btn.dataset.preset;
    $("#goalUnit").value = btn.dataset.unit;
    $("#goalCurrent").focus();
  });

  $("#goalsList").addEventListener("change", (ev) => {
    const input = ev.target.closest("[data-goal]");
    if (!input) return;
    const goals = getGoals();
    goals[+input.dataset.goal].current = input.value;
    store.set(KEY_GOALS, goals);
    renderGoals();
  });

  $("#goalsList").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-goaldel]");
    if (!btn) return;
    const goals = getGoals();
    if (!confirm(`Delete goal “${goals[+btn.dataset.goaldel].name}”?`)) return;
    goals.splice(+btn.dataset.goaldel, 1);
    store.set(KEY_GOALS, goals);
    renderGoals();
  });

  /* ================= progress charts ================= */

  let progSel = null;

  // Epley estimated 1-rep-max — the standard way to compare sets at
  // different weights/reps on one strength curve.
  const est1RM = (w, r) => (+w) * (1 + (+r) / 30);

  // Per-exercise series: one best data point per logged session.
  function seriesFor(name) {
    const entries = (getHist()[name] || []).filter((e) => e.sets && e.sets.length);
    const weighted = entries.some((e) => e.sets.some((s) => +s.w > 0));
    return {
      weighted,
      points: entries.map((e) => {
        const best = e.sets.reduce((m, s) => {
          const v = weighted ? est1RM(s.w || 0, s.r || 0) : (+s.r || 0);
          return v > m ? v : m;
        }, 0);
        return { t: new Date(e.date), v: Math.round(best * 10) / 10 };
      }).filter((p) => p.v > 0),
    };
  }

  function exercisesWithData() {
    const hist = getHist();
    return Object.keys(hist)
      .map((name) => ({ name, n: seriesFor(name).points.length }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n);
  }

  const shortDate = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  function lineChartSVG(points, suffix) {
    const W = 640, H = 200, pL = 46, pR = 56, pT = 16, pB = 30;
    if (!points.length) return "";
    const vs = points.map((p) => p.v);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    if (lo === hi) { lo = Math.max(0, lo - 1); hi = hi + 1; }
    const pad = (hi - lo) * 0.15; lo = Math.max(0, lo - pad); hi = hi + pad;
    const x = (i) => points.length === 1 ? W - pR : pL + (i / (points.length - 1)) * (W - pL - pR);
    const y = (v) => pT + (1 - (v - lo) / (hi - lo)) * (H - pT - pB);

    // faint grid + axis labels
    let grid = "";
    for (let g = 0; g <= 2; g++) {
      const v = lo + (g / 2) * (hi - lo);
      const yy = y(v);
      grid += `<line class="chart__grid" x1="${pL}" y1="${yy.toFixed(1)}" x2="${W - pR}" y2="${yy.toFixed(1)}" />`;
      grid += `<text class="chart__gridlabel" x="${pL - 8}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${Math.round(v)}</text>`;
    }

    const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
    const area = `${line} L${x(points.length - 1).toFixed(1)},${H - pB} L${x(0).toFixed(1)},${H - pB} Z`;

    const last = points[points.length - 1];
    const lx = x(points.length - 1), ly = y(last.v);
    const label = `${Math.round(last.v * 10) / 10}${suffix || ""}`;

    const xlabels = points.length === 1
      ? `<text class="chart__gridlabel" x="${lx.toFixed(1)}" y="${H - 8}" text-anchor="end">${shortDate(last.t)}</text>`
      : `<text class="chart__gridlabel" x="${pL}" y="${H - 8}">${shortDate(points[0].t)}</text>
         <text class="chart__gridlabel" x="${W - pR}" y="${H - 8}" text-anchor="end">${shortDate(last.t)}</text>`;

    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Strength over time">
      <defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c96f4a" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#c96f4a" stop-opacity="0"/>
      </linearGradient></defs>
      ${grid}
      <path d="${area}" fill="url(#areaFill)" />
      <path class="chart__line" d="${line}" />
      <circle class="chart__end" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4.5" />
      <text class="chart__endlabel" x="${(lx - 8).toFixed(1)}" y="${(ly - 10).toFixed(1)}" text-anchor="end">${label}</text>
      ${xlabels}
    </svg>`;
  }

  function barChartSVG(bars) {
    const W = 640, H = 180, pL = 30, pR = 12, pT = 20, pB = 30;
    if (!bars.length) return "";
    const hi = Math.max(...bars.map((b) => b.v), 1);
    const slot = (W - pL - pR) / bars.length;
    const bw = Math.min(slot * 0.6, 42);
    const y = (v) => pT + (1 - v / hi) * (H - pT - pB);
    const body = bars.map((b, i) => {
      const cx = pL + slot * i + slot / 2;
      const yy = y(b.v), h = (H - pB) - yy;
      const cls = i === bars.length - 1 ? "chart__bar" : "chart__bar chart__bar--dim";
      return `<rect class="${cls}" x="${(cx - bw / 2).toFixed(1)}" y="${yy.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="2" />
        ${b.v ? `<text class="chart__barval" x="${cx.toFixed(1)}" y="${(yy - 6).toFixed(1)}" text-anchor="middle">${b.v}</text>` : ""}
        <text class="chart__barlabel" x="${cx.toFixed(1)}" y="${H - 10}" text-anchor="middle">${b.label}</text>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly sets completed">${body}</svg>`;
  }

  function weeklyVolume() {
    const log = store.get(KEY_LOG, []);
    const byWeek = new Map();
    log.forEach((l) => {
      const id = weekId(l.date);
      byWeek.set(id, (byWeek.get(id) || 0) + (l.done || 0));
    });
    // last 8 calendar weeks up to now, so gaps read as honest zeroes
    const bars = [];
    const cursor = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(cursor); d.setDate(d.getDate() - i * 7);
      const id = weekId(d);
      bars.push({ label: d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" }), v: byWeek.get(id) || 0 });
    }
    return bars;
  }

  function renderProgress() {
    const options = exercisesWithData();
    const panel = $("#progressPanel");
    const empty = $("#progressEmpty");
    if (!options.length) {
      panel.hidden = true;
      empty.hidden = false;
      return;
    }
    panel.hidden = false;
    empty.hidden = true;

    if (!progSel || !options.some((o) => o.name === progSel)) progSel = options[0].name;
    $("#progExercise").innerHTML = options.map((o) =>
      `<option value="${esc(o.name)}"${o.name === progSel ? " selected" : ""}>${esc(o.name)} · ${o.n} log${o.n === 1 ? "" : "s"}</option>`).join("");

    const s = seriesFor(progSel);
    const best = s.points.reduce((m, p) => (p.v > m.v ? p : m), s.points[0]);
    $("#progPR").textContent = s.weighted
      ? `Personal best · ≈ ${Math.round(best.v)} estimated 1-rep max (${shortDate(best.t)})`
      : `Personal best · ${Math.round(best.v)} reps in a set (${shortDate(best.t)})`;
    $("#strengthChart").innerHTML = lineChartSVG(s.points, s.weighted ? "" : " reps");
    $("#volumeChart").innerHTML = barChartSVG(weeklyVolume());
  }

  $("#progExercise").addEventListener("change", (e) => {
    progSel = e.target.value;
    renderProgress();
  });

  /* ================= the mirror: measurements ================= */

  const KEY_MEAS = "adonis.meas";
  const MEAS_METRICS = [
    { id: "weight", label: "Weight" },
    { id: "waist", label: "Waist" },
    { id: "chest", label: "Chest" },
    { id: "shoulders", label: "Shoulders" },
    { id: "arm", label: "Arm" },
  ];
  let measSel = null;

  $("#measForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const vals = {};
    let any = false;
    MEAS_METRICS.forEach((m) => {
      const el = $("#m" + m.label.replace(/ /g, ""));
      if (el && el.value !== "") { vals[m.id] = +el.value; any = true; }
    });
    if (!any) { alert("Enter at least one measurement to log a check-in."); return; }
    const meas = store.get(KEY_MEAS, []);
    meas.push({ date: new Date().toISOString(), vals });
    store.set(KEY_MEAS, meas);
    ev.target.reset();
    renderMeasurements();
  });

  function renderMeasurements() {
    const meas = store.get(KEY_MEAS, []);
    const withData = MEAS_METRICS.filter((m) => meas.some((e) => m.id in e.vals));
    const wrap = $("#measTrend");
    if (!withData.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    if (!measSel || !withData.some((m) => m.id === measSel)) measSel = withData[0].id;
    $("#measMetric").innerHTML = withData.map((m) =>
      `<option value="${m.id}"${m.id === measSel ? " selected" : ""}>${m.label}</option>`).join("");
    const points = meas
      .filter((e) => measSel in e.vals)
      .map((e) => ({ t: new Date(e.date), v: e.vals[measSel] }));
    $("#measChart").innerHTML = lineChartSVG(points, "");
  }

  $("#measMetric").addEventListener("change", (e) => {
    measSel = e.target.value;
    renderMeasurements();
  });

  /* ================= the mirror: progress photos (IndexedDB) ================= */

  const idb = {
    open() {
      return new Promise((res, rej) => {
        const rq = indexedDB.open("adonis", 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore("photos", { keyPath: "id" });
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
      });
    },
    async put(rec) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction("photos", "readwrite");
        tx.objectStore("photos").put(rec);
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    },
    async all() {
      const db = await this.open();
      return new Promise((res, rej) => {
        const rq = db.transaction("photos").objectStore("photos").getAll();
        rq.onsuccess = () => res(rq.result || []);
        rq.onerror = () => rej(rq.error);
      });
    },
    async del(id) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction("photos", "readwrite");
        tx.objectStore("photos").delete(id);
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    },
  };

  // Downscale to ≤900px JPEG so a year of photos stays a few MB, not hundreds.
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, 900 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("compress failed")), "image/jpeg", 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("not an image")); };
      img.src = url;
    });
  }

  $("#photoBtn").addEventListener("click", () => $("#photoFile").click());

  $("#photoFile").addEventListener("change", async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    try {
      const blob = await compressImage(file);
      await idb.put({ id: Date.now(), date: new Date().toISOString(), blob });
      renderPhotos();
    } catch {
      alert("Couldn't read that file as an image.");
    }
  });

  $("#photoStrip").addEventListener("click", async (ev) => {
    const btn = ev.target.closest("[data-photodel]");
    if (!btn) return;
    if (!confirm("Delete this progress photo?")) return;
    await idb.del(+btn.dataset.photodel);
    renderPhotos();
  });

  async function renderPhotos() {
    let photos = [];
    try { photos = await idb.all(); } catch { /* IDB unavailable — leave empty state */ }
    photos.sort((a, b) => a.id - b.id);
    const strip = $("#photoStrip");
    const compare = $("#photoCompare");
    $("#photoEmpty").hidden = photos.length > 0;

    strip.innerHTML = photos.map((p) => `
      <figure>
        <img src="${URL.createObjectURL(p.blob)}" alt="Progress photo ${shortDate(new Date(p.date))}" loading="lazy" />
        <button type="button" class="photo__del" data-photodel="${p.id}" aria-label="Delete photo" title="Delete">✕</button>
        <figcaption>${shortDate(new Date(p.date))}</figcaption>
      </figure>`).join("");

    if (photos.length >= 2) {
      const first = photos[0], last = photos[photos.length - 1];
      compare.hidden = false;
      $("#compareFirst").src = URL.createObjectURL(first.blob);
      $("#compareLast").src = URL.createObjectURL(last.blob);
      const days = Math.round((last.id - first.id) / 86400000);
      $("#compareFirstCap").textContent = `Day 1 · ${shortDate(new Date(first.date))}`;
      $("#compareLastCap").textContent = `Now · ${shortDate(new Date(last.date))}${days > 0 ? ` · ${days} days in` : ""}`;
    } else {
      compare.hidden = true;
    }
  }

  /* ================= data backup (export / import) ================= */

  const DATA_KEYS = [KEY_EQUIP, KEY_LOG, KEY_PLAN, KEY_HIST, KEY_GOALS, KEY_ACTIVE, KEY_TECH, KEY_MEAS];

  $("#exportBtn").addEventListener("click", () => {
    const dump = { app: "ADONIS", version: 1, exportedAt: new Date().toISOString(), data: {} };
    DATA_KEYS.forEach((k) => { dump.data[k] = store.get(k, null); });
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `adonis-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $("#importBtn").addEventListener("click", () => $("#importFile").click());

  $("#importFile").addEventListener("change", (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let dump;
      try { dump = JSON.parse(reader.result); }
      catch { alert("That file isn't a valid ADONIS backup — it couldn't be read as JSON."); return; }
      if (!dump || dump.app !== "ADONIS" || !dump.data) {
        alert("That doesn't look like an ADONIS backup file.");
        return;
      }
      if (!confirm("Import this backup? It replaces the data currently on this device.")) return;
      DATA_KEYS.forEach((k) => {
        if (k in dump.data && dump.data[k] !== null) store.set(k, dump.data[k]);
        else store.del(k);
      });
      // reload in-memory state from the imported data
      selectedEquip = new Set(store.get(KEY_EQUIP, []));
      currentSession = store.get(KEY_ACTIVE, null);
      techPref = store.get(KEY_TECH, {});
      sessTime = (store.get(KEY_PLAN, null) || {}).mins || 60;
      progSel = null;
      measSel = null;
      renderPlan(); renderFocus(); renderEquip(); renderTimeToday();
      renderGoals(); renderJournal(); renderProgress(); renderMeasurements();
      if (currentSession) renderSession(); else $("#session").hidden = true;
      alert("Backup imported. Your plan, logs, and goals are restored.");
    };
    reader.readAsText(file);
    ev.target.value = ""; // allow re-importing the same file later
  });

  /* ================= journal ================= */

  function weekId(date) {
    const d = new Date(date);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.floor(((d - jan1) / 86400000 + jan1.getDay()) / 7);
    return `${d.getFullYear()}-${week}`;
  }

  function renderJournal() {
    const log = store.get(KEY_LOG, []);
    $("#statTotal").textContent = log.length;
    $("#navStreak").textContent = `${log.length} session${log.length === 1 ? "" : "s"}`;

    const nowWeek = weekId(new Date());
    $("#statWeek").textContent = log.filter((l) => weekId(l.date) === nowWeek).length;

    const weeks = new Set(log.map((l) => weekId(l.date)));
    let streak = 0;
    const cursor = new Date();
    if (!weeks.has(weekId(cursor))) cursor.setDate(cursor.getDate() - 7);
    while (weeks.has(weekId(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 7);
    }
    $("#statStreak").textContent = streak;

    const list = $("#logList");
    const empty = $("#logEmpty");
    if (!log.length) {
      list.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.innerHTML = log.map((l, i) => ({ l, i })).reverse().slice(0, 14).map(({ l, i }) => {
      const d = new Date(l.date);
      const when = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      const wk = l.week ? ` · ${l.week}` : "";
      return `<li><span class="log__name">${esc(l.title)}</span><span class="log__meta">${when}${wk} · ${l.done}/${l.total} sets
        <button type="button" class="goal__del" data-logdel="${i}" aria-label="Delete this session" title="Delete session">✕</button></span></li>`;
    }).join("");
  }

  $("#logList").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-logdel]");
    if (btn) deleteLogEntry(+btn.dataset.logdel);
  });

  /* ================= PWA: install prompt & wake lock ================= */

  // Install button — appears only when the browser offers installation.
  let deferredPrompt = null;
  const installBtn = $("#installBtn");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.hidden = true;
  });
  window.addEventListener("appinstalled", () => { installBtn.hidden = true; });

  // Keep the screen awake while a session is open (best-effort; not in all browsers).
  let wakeLock = null;
  async function requestWake() {
    try {
      if ("wakeLock" in navigator && !$("#session").hidden) {
        wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch { /* denied or unsupported — ignore */ }
  }
  function releaseWake() {
    try { wakeLock && wakeLock.release(); } catch { /* ignore */ }
    wakeLock = null;
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !$("#session").hidden) requestWake();
  });

  /* ================= scroll reveals ================= */

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("is-in");
        en.target.querySelectorAll(".stat__num").forEach(countUp);
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ================= init ================= */

  renderSplit();
  renderEquip();
  renderEquipNote();
  renderWizard();
  renderTimeToday();
  renderPlan();
  renderFocus();
  updateHomeState();
  renderBpAmbition();
  syncBpUnitLabels();
  renderGoals();
  renderJournal();
  renderProgress();
  renderMeasurements();
  renderPhotos();
  if (currentSession) renderSession(); // restore an in-progress session after refresh
})();
