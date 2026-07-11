/* ============================================================
   ADONIS — app logic
   12-week periodized plan, equipment-adaptive session generator,
   per-set weight/rep logging with progression suggestions,
   goals, swaps, and a journal. All state in localStorage.
   ============================================================ */

(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
    del(key) { localStorage.removeItem(key); },
  };

  const KEY_EQUIP = "adonis.equip";
  const KEY_LOG = "adonis.log";
  const KEY_PLAN = "adonis.plan";
  const KEY_HIST = "adonis.hist";
  const KEY_GOALS = "adonis.goals";
  const KEY_ACTIVE = "adonis.active";

  let selectedEquip = new Set(store.get(KEY_EQUIP, []));
  let selectedFocus = "auto";
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
    renderPlan();
    renderFocus();
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

  function makeExercise(chosen, rounds, phase) {
    const last = lastEntry(chosen.name);
    return {
      name: chosen.name,
      cue: chosen.cue,
      meta: chosen.equip.length
        ? chosen.equip.map((id) => EQUIPMENT.find((e) => e.id === id).name).join(" + ")
        : "Bodyweight (add load if you have it)",
      last: last ? fmtLast(last) : null,
      hint: progressionHint(chosen.name, phase),
      sets: Array.from({ length: rounds }, (_, i) => ({
        w: last && last.sets[i] ? last.sets[i].w : "",
        r: last && last.sets[i] ? last.sets[i].r : "",
        done: false,
      })),
    };
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
    const timeOpt = plan
      ? TIME_OPTIONS.find((t) => t.mins === plan.mins) || TIME_OPTIONS[2]
      : TIME_OPTIONS[2];

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
            return makeExercise(chosen, rounds, phase);
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
        ${block.exercises.map((x, si) => `
          <div class="exercise">
            <h3 class="exercise__name">${esc(x.name)}</h3>
            <div class="exercise__actions">
              <button type="button" class="chipbtn" data-swap data-b="${bi}" data-s="${si}" title="Swap for an equivalent">⇄ Swap</button>
              <a class="chipbtn" href="${videoUrl(x.name)}" target="_blank" rel="noopener" title="Watch a form tutorial">▶ Form</a>
            </div>
            <p class="exercise__meta">${esc(x.meta)}</p>
            <p class="exercise__cue">${esc(x.cue)}</p>
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
          </div>`).join("")}
      </article>`).join("");

    $("#session").hidden = false;
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
      return;
    }
    const swap = ev.target.closest("[data-swap]");
    if (swap) {
      const { b, s } = swap.dataset;
      swapExercise(+b, +s);
    }
  });

  $("#workoutBlocks").addEventListener("input", (ev) => {
    const el = ev.target;
    if (!el.matches("[data-w],[data-r]")) return;
    const { b, s, d } = el.dataset;
    const set = currentSession.blocks[b].exercises[s].sets[d];
    if (el.hasAttribute("data-w")) set.w = el.value;
    else set.r = el.value;
    saveActive();
  });

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
    currentSession.blocks[bi].exercises[si] = makeExercise(chosen, cur.sets.length, phase);
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

    // save exercise history (only sets marked done, or with reps entered)
    const hist = getHist();
    let done = 0, total = 0;
    currentSession.blocks.forEach((b) => b.exercises.forEach((x) => {
      total += x.sets.length;
      const logged = x.sets.filter((s) => s.done || +s.r > 0);
      done += x.sets.filter((s) => s.done).length;
      if (logged.length) {
        (hist[x.name] = hist[x.name] || []).push({
          date: new Date().toISOString(),
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
        next.doneAt = new Date().toISOString();
        store.set(KEY_PLAN, plan);
        weekInfo = `W${next.week}`;
      }
    }

    // journal entry
    const log = store.get(KEY_LOG, []);
    log.push({
      date: new Date().toISOString(),
      dayKey: currentSession.dayKey,
      title: PROGRAM[currentSession.dayKey].title,
      week: weekInfo,
      done, total,
    });
    store.set(KEY_LOG, log);

    currentSession = null;
    store.del(KEY_ACTIVE);
    $("#session").hidden = true;
    renderPlan();
    renderJournal();
    updateFocusHint();
    $("#journal").scrollIntoView({ behavior: "smooth" });
  });

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
    list.innerHTML = [...log].reverse().slice(0, 14).map((l) => {
      const d = new Date(l.date);
      const when = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      const wk = l.week ? ` · ${l.week}` : "";
      return `<li><span class="log__name">${esc(l.title)}</span><span class="log__meta">${when}${wk} · ${l.done}/${l.total} sets</span></li>`;
    }).join("");
  }

  /* ================= scroll reveals ================= */

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ================= init ================= */

  renderSplit();
  renderEquip();
  renderWizard();
  renderPlan();
  renderFocus();
  renderGoals();
  renderJournal();
  if (currentSession) renderSession(); // restore an in-progress session after refresh
})();
