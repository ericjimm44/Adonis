/* ============================================================
   ADONIS — app logic
   Equipment-adaptive session generator + set tracking + journal.
   All state lives in localStorage; no backend, no build step.
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
  };

  const KEY_EQUIP = "adonis.equip";
  const KEY_LOG = "adonis.log";

  let selectedEquip = new Set(store.get(KEY_EQUIP, []));
  let selectedFocus = "auto";
  let currentSession = null; // { dayKey, blocks: [{label, scheme, rounds, exercises:[{name,cue,meta,done:[bool]}]}] }

  /* ---------- rotation ---------- */

  function lastLoggedDay() {
    const log = store.get(KEY_LOG, []);
    return log.length ? log[log.length - 1].dayKey : null;
  }

  function nextDayInRotation() {
    const last = lastLoggedDay();
    if (!last) return DAY_ORDER[0];
    const i = DAY_ORDER.indexOf(last);
    return DAY_ORDER[(i + 1) % DAY_ORDER.length];
  }

  /* ---------- split list (protocol section) ---------- */

  function renderSplit() {
    $("#splitList").innerHTML = DAY_ORDER.map((key) => {
      const d = PROGRAM[key];
      return `<li><span class="split__day">${d.title}</span><span class="split__desc">${d.desc}</span></li>`;
    }).join("");
  }

  /* ---------- equipment grid ---------- */

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
    if (selectedEquip.has(id)) selectedEquip.delete(id);
    else selectedEquip.add(id);
    store.set(KEY_EQUIP, [...selectedEquip]);
    card.classList.toggle("is-on");
    card.setAttribute("aria-pressed", card.classList.contains("is-on"));
  });

  /* ---------- focus chips ---------- */

  function renderFocus() {
    const chips = [{ key: "auto", label: "Auto (rotation)" }]
      .concat(DAY_ORDER.map((key) => ({ key, label: PROGRAM[key].title })));
    $("#focusRow").innerHTML = chips.map((c) =>
      `<button type="button" class="focus__chip${c.key === selectedFocus ? " is-on" : ""}" data-key="${c.key}">${c.label}</button>`
    ).join("");
    updateFocusHint();
  }

  function updateFocusHint() {
    const next = PROGRAM[nextDayInRotation()].title;
    $("#focusHint").textContent = selectedFocus === "auto"
      ? `Next in the rotation: ${next}.`
      : `Overriding the rotation — the journal will pick up from here.`;
  }

  $("#focusRow").addEventListener("click", (ev) => {
    const chip = ev.target.closest(".focus__chip");
    if (!chip) return;
    selectedFocus = chip.dataset.key;
    document.querySelectorAll(".focus__chip").forEach((c) =>
      c.classList.toggle("is-on", c === chip));
    updateFocusHint();
  });

  /* ---------- session generation ---------- */

  const isAvailable = (exercise) => exercise.equip.every((id) => selectedEquip.has(id));

  function pickFromPool(pool, avoidName) {
    const available = pool.filter(isAvailable);
    if (!available.length) return pool[pool.length - 1]; // last entry is always bodyweight
    if (avoidName && available.length > 1) {
      const others = available.filter((e) => e.name !== avoidName);
      return others[Math.floor(Math.random() * others.length)];
    }
    return available[0]; // pools are ordered best-first
  }

  function roundsFromScheme(scheme) {
    const m = scheme.match(/^(\d+)/);
    return m ? Math.min(parseInt(m[1], 10), 6) : 3;
  }

  function buildSession(reroll = false) {
    const dayKey = selectedFocus === "auto" ? nextDayInRotation() : selectedFocus;
    const day = PROGRAM[dayKey];
    const prev = reroll && currentSession && currentSession.dayKey === dayKey ? currentSession : null;

    currentSession = {
      dayKey,
      blocks: day.blocks.map((block, bi) => {
        const rounds = roundsFromScheme(block.scheme);
        return {
          label: block.label,
          scheme: block.scheme,
          exercises: block.slots.map((pool, si) => {
            const avoid = prev ? prev.blocks[bi].exercises[si].name : null;
            const chosen = pickFromPool(pool, avoid);
            return {
              name: chosen.name,
              cue: chosen.cue,
              meta: chosen.equip.length
                ? chosen.equip.map((id) => EQUIPMENT.find((e) => e.id === id).name).join(" + ")
                : "Bodyweight",
              done: Array(rounds).fill(false),
            };
          }),
        };
      }),
    };
    renderSession();
  }

  function renderSession() {
    const day = PROGRAM[currentSession.dayKey];
    $("#sessionTitle").innerHTML = `${day.title.replace(/ (\S+)$/, " <em>$1</em>")}`;
    $("#sessionSub").textContent = day.sub;

    $("#workoutBlocks").innerHTML = currentSession.blocks.map((block, bi) => `
      <article class="block">
        <div class="block__head">
          <span class="block__label">${block.label}</span>
          <span class="block__scheme">${block.scheme}</span>
        </div>
        ${block.exercises.map((x, si) => `
          <div class="exercise">
            <h3 class="exercise__name">${x.name}</h3>
            <div class="exercise__sets" role="group" aria-label="Sets for ${x.name}">
              ${x.done.map((d, di) => `
                <button type="button" class="setdot${d ? " is-done" : ""}"
                        data-b="${bi}" data-s="${si}" data-d="${di}"
                        aria-label="Set ${di + 1}" aria-pressed="${d}"></button>`).join("")}
            </div>
            <p class="exercise__meta">${x.meta}</p>
            <p class="exercise__cue">${x.cue}</p>
          </div>`).join("")}
      </article>`).join("");

    const section = $("#session");
    section.hidden = false;
    section.scrollIntoView({ behavior: "smooth" });
  }

  $("#workoutBlocks").addEventListener("click", (ev) => {
    const dot = ev.target.closest(".setdot");
    if (!dot) return;
    const { b, s, d } = dot.dataset;
    const arr = currentSession.blocks[b].exercises[s].done;
    arr[d] = !arr[d];
    dot.classList.toggle("is-done", arr[d]);
    dot.setAttribute("aria-pressed", arr[d]);
  });

  $("#buildBtn").addEventListener("click", () => buildSession(false));
  $("#rerollBtn").addEventListener("click", () => buildSession(true));

  /* ---------- rest timer ---------- */

  let timerId = null;

  function startRest(secs) {
    clearInterval(timerId);
    const clock = $("#restClock");
    clock.hidden = false;
    let left = secs;
    const paint = () => {
      const m = String(Math.floor(left / 60)).padStart(2, "0");
      const s = String(left % 60).padStart(2, "0");
      clock.textContent = `${m}:${s}`;
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

  /* ---------- finishing & journal ---------- */

  $("#finishBtn").addEventListener("click", () => {
    if (!currentSession) return;
    let done = 0, total = 0;
    currentSession.blocks.forEach((b) => b.exercises.forEach((x) => {
      done += x.done.filter(Boolean).length;
      total += x.done.length;
    }));

    const log = store.get(KEY_LOG, []);
    log.push({
      date: new Date().toISOString(),
      dayKey: currentSession.dayKey,
      title: PROGRAM[currentSession.dayKey].title,
      done, total,
    });
    store.set(KEY_LOG, log);

    currentSession = null;
    $("#session").hidden = true;
    renderJournal();
    updateFocusHint();
    $("#journal").scrollIntoView({ behavior: "smooth" });
  });

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

    // consecutive weeks (ending this week or last) with at least one session
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
    list.innerHTML = [...log].reverse().slice(0, 12).map((l) => {
      const d = new Date(l.date);
      const when = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      return `<li><span class="log__name">${l.title}</span><span class="log__meta">${when} · ${l.done}/${l.total} sets</span></li>`;
    }).join("");
  }

  /* ---------- scroll reveals ---------- */

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---------- init ---------- */

  renderSplit();
  renderEquip();
  renderFocus();
  renderJournal();
})();
