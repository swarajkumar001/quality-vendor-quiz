(() => {
  "use strict";

  const BANK = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];
  const BY_ID = new Map(BANK.map(q => [q.id, q]));
  const LETTERS = ["A", "B", "C", "D"];
  const DECKS = { QM: "Quality Management (Session 11)", VM: "Vendor Management (Session 7)" };
  const DIFFS = ["Easy", "Medium", "Hard", "Tricky", "Numerical", "Application", "Conceptual"];
  const STORE_KEY = "qvm-question-bank-v1";

  const ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const ICON_BAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
  const ICON_PART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M6 12h12"/></svg>';

  // ------------------------------------------------------------ storage (safe)
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        progress: state.progress, filters: { ...state.filters, diffs: [...state.filters.diffs] },
        shuffle: state.shuffle, instant: state.instant, theme: state.theme, currentId: currentQ()?.id,
      }));
    } catch { /* storage unavailable: progress lasts for this visit only */ }
  }

  const saved = load();
  const state = {
    filters: {
      type: saved.filters?.type || "ALL",
      deck: saved.filters?.deck || "ALL",
      topic: saved.filters?.topic || "ALL",
      status: saved.filters?.status || "ALL",
      diffs: new Set(saved.filters?.diffs || []),
    },
    shuffle: !!saved.shuffle,
    instant: saved.instant !== false,
    theme: saved.theme || null,
    progress: saved.progress || {},   // id -> { sel: [..], result: "ok" | "part" | "bad" }
    picks: {},                        // id -> [..] unsaved selections
    order: [],
    idx: 0,
    streak: 0,                        // correct answers in a row, this visit only
  };
  let lastCardId = null;

  // ------------------------------------------------------------ cat memes
  const MEMES = {
    ok: [
      ["😸", "Purr-fect! You nailed it."],
      ["😻", "Meow-velous answer!"],
      ["😼", "Cool cat. Very correct."],
      ["🐱", "Paw-sitively right!"],
      ["😺", "Deming would be proud. Meow."],
      ["🐈", "Zero defects. Six Sigma cat."],
    ],
    part: [
      ["😿", "So close! Not quite purr-fect."],
      ["🐈", "Half the fish. Go get the rest."],
      ["😾", "Partial credit. The cat is unimpressed."],
    ],
    bad: [
      ["🙀", "Cat-astrophe!"],
      ["😹", "Even the cat is laughing. Read the why!"],
      ["😾", "Hiss. That's not it."],
      ["🐈‍⬛", "Bad luck black cat. Try again!"],
      ["😿", "Common-cause error. Fix the system, hooman."],
    ],
  };
  const STREAK_MEMES = { 3: ["😼", "3 in a row! Hat-trick cat."], 5: ["🔥", "5 streak! Certified Top Cat."], 10: ["👑", "10 streak! Cat Royalty. Bow, hoomans."] };
  const pickOne = a => a[Math.floor(Math.random() * a.length)];
  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  let memeTimer;

  function showMeme([cat, text], kind) {
    const m = $("#meme");
    $("#memeCat").textContent = cat;
    $("#memeText").textContent = text;
    m.className = `meme ${kind}`;
    m.hidden = false;
    void m.offsetWidth;               // restart the pop-in animation
    m.classList.add("show");
    clearTimeout(memeTimer);
    memeTimer = setTimeout(() => { m.classList.remove("show"); setTimeout(() => (m.hidden = true), 300); }, 2600);
  }

  function confetti() {
    if (reduceMotion()) return;
    const box = $("#confetti");
    const colors = ["#FF5DA2", "#FFB627", "#4FC3C1", "#B58BE0", "#5CCB7E", "#FF7B72"];
    const r = checkBtn.getBoundingClientRect();
    for (let i = 0; i < 46; i++) {
      const p = document.createElement("i");
      const ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 220;
      p.style.left = `${r.left + r.width / 2}px`;
      p.style.top = `${r.top}px`;
      p.style.background = pickOne(colors);
      p.style.setProperty("--dx", `${Math.cos(ang) * dist}px`);
      p.style.setProperty("--dy", `${Math.sin(ang) * dist - 160}px`);
      p.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
      p.textContent = Math.random() < .15 ? "🐾" : "";
      box.appendChild(p);
      setTimeout(() => p.remove(), 1300);
    }
  }

  function celebrate(result) {
    state.streak = result === "ok" ? state.streak + 1 : 0;
    renderStreak();
    if (result === "ok") confetti();
    if (result === "bad" && !reduceMotion()) {
      card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake");
    }
    showMeme(result === "ok" && STREAK_MEMES[state.streak] ? STREAK_MEMES[state.streak] : pickOne(MEMES[result]), result);
  }

  function renderStreak() {
    const s = state.streak, el = $("#streak");
    el.textContent = s ? `🔥 ${s} in a row${s >= 5 ? ", Top Cat!" : ""}` : "🐾 Get one right to start a streak";
    el.classList.toggle("hot", s >= 3);
  }

  // ------------------------------------------------------------ dom
  const $ = s => document.querySelector(s);
  const card = $("#card"), grid = $("#grid");
  const checkBtn = $("#checkBtn"), prevBtn = $("#prevBtn"), nextBtn = $("#nextBtn");

  // ------------------------------------------------------------ helpers
  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function fmt(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/_(.+?)_/g, "<em>$1</em>");
  }
  function math(el) {
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(el, { delimiters: [{ left: "\\(", right: "\\)", display: false }], throwOnError: false });
      } catch { /* leave plain text */ }
    }
  }
  function currentQ() { return BY_ID.get(state.order[state.idx]); }
  function same(a, b) { return a.length === b.length && a.every(x => b.includes(x)); }

  function grade(q, sel) {
    if (same(sel, q.answer)) return "ok";
    if (q.type === "MSQ" && sel.some(i => q.answer.includes(i))) return "part";
    return "bad";
  }

  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ------------------------------------------------------------ filtering
  function buildOrder(keepId) {
    const f = state.filters;
    let list = BANK.filter(q =>
      (f.type === "ALL" || q.type === f.type) &&
      (f.deck === "ALL" || q.deck === f.deck) &&
      (f.topic === "ALL" || q.topic === f.topic) &&
      (f.diffs.size === 0 || f.diffs.has(q.difficulty)) &&
      (f.status === "ALL" ||
        (f.status === "NEW" && !state.progress[q.id]) ||
        (f.status === "WRONG" && state.progress[q.id] && state.progress[q.id].result !== "ok"))
    ).map(q => q.id);
    if (state.shuffle) list = shuffled(list);
    state.order = list;
    const at = keepId ? list.indexOf(keepId) : -1;
    state.idx = at >= 0 ? at : 0;
  }

  // ------------------------------------------------------------ rendering
  function render() {
    renderCard();
    renderGrid();
    renderScore();
    save();
  }

  function renderCard() {
    const total = state.order.length;
    const q = currentQ();
    $("#counter").textContent = total ? `Question ${state.idx + 1} of ${total}` : "No questions";
    $("#barFill").style.width = total ? `${((state.idx + 1) / total) * 100}%` : "0";

    if (!q) {
      card.className = "card";
      card.innerHTML = "";
      card.appendChild($("#emptyTpl").content.cloneNode(true));
      $("#clearFilters").addEventListener("click", resetFilters);
      [checkBtn, prevBtn, nextBtn].forEach(b => (b.disabled = true));
      document.documentElement.style.setProperty("--accent", "var(--mcq)");
      return;
    }

    const isMSQ = q.type === "MSQ";
    document.documentElement.style.setProperty("--accent", isMSQ ? "var(--msq)" : "var(--mcq)");
    const done = state.progress[q.id];
    const sel = done ? done.sel : (state.picks[q.id] || []);

    const pages = q.pdfPages.join(", "), slides = q.slides.join(", ");
    let html = `
      <div class="meta">
        <span class="tag type">${q.type} ${q.num}</span>
        <span class="tag">${esc(q.difficulty)}</span>
        <span class="source" title="${esc(DECKS[q.deck])}">${q.deck === "QM" ? "Quality" : "Vendor"} deck, PDF page ${pages}, slide ${slides}</span>
      </div>
      <p class="topic-name">${esc(q.topic)}</p>
      <h2 class="question">${fmt(q.question)}</h2>
      <p class="instruction">${isMSQ ? "Select every correct option, then check." : (state.instant ? "Pick one option to check it." : "Pick one option, then check.")}</p>
      <ul class="options" role="${isMSQ ? "group" : "radiogroup"}" aria-label="Options">`;

    q.options.forEach((opt, i) => {
      const picked = sel.includes(i);
      let cls = "opt", stamp = LETTERS[i], why = "";
      if (done) {
        const right = q.answer.includes(i);
        if (right && picked) { cls += " is-ok"; stamp = ICON_OK; why = `<b class="v-ok">Correct.</b> `; }
        else if (!right && picked) { cls += " is-bad"; stamp = ICON_BAD; why = `<b class="v-bad">Incorrect.</b> `; }
        else if (right && !picked) { cls += " is-missed"; why = `<b class="v-miss">Correct, but you didn't pick it.</b> `; }
        else { why = `<b>Not correct.</b> `; }
        why = `<p class="why">${why}${fmt(q.explanations[i])}</p>`;
      }
      html += `
        <li><button class="${cls}" data-i="${i}" aria-pressed="${picked}" ${done ? "disabled" : ""}
             aria-label="Option ${LETTERS[i]}">
          <span class="stamp" aria-hidden="true">${stamp}</span>
          <span class="txt">${fmt(opt)}</span>${why}
        </button></li>`;
    });
    html += `</ul>`;

    if (done) {
      const nRight = q.answer.length;
      const hit = done.sel.filter(i => q.answer.includes(i)).length;
      const wrong = done.sel.length - hit;
      const key = q.answer.map(i => LETTERS[i]).join(", ");
      const info = {
        ok: ["ok", ICON_OK, "Correct", isMSQ ? `You found all ${nRight} correct option${nRight > 1 ? "s" : ""}.` : `The answer is ${key}.`],
        part: ["part", ICON_PART, "Partly right", `You got ${hit} of ${nRight} correct option${nRight > 1 ? "s" : ""}${wrong ? ` and picked ${wrong} wrong one${wrong > 1 ? "s" : ""}` : ""}. The full answer is ${key}.`],
        bad: ["bad", ICON_BAD, "Incorrect", `The correct answer${nRight > 1 ? "s are" : " is"} ${key}.`],
      }[done.result];
      html += `<div class="verdict ${info[0]}" role="status">
        <span class="verdict-mark">${info[1]}</span>
        <div><p>${info[2]}</p><p class="sub">${info[3]}</p></div></div>`;
    }

    card.className = `card type-${q.type.toLowerCase()}`;
    if (q.id !== lastCardId) { void card.offsetWidth; card.classList.add("enter"); lastCardId = q.id; }
    card.innerHTML = html;
    math(card);

    card.querySelectorAll(".opt").forEach(b => b.addEventListener("click", () => pick(+b.dataset.i)));

    prevBtn.disabled = state.idx === 0;
    nextBtn.disabled = state.idx >= total - 1;
    checkBtn.disabled = !done && sel.length === 0;
    checkBtn.textContent = done ? "Try again" : "Check answer";
  }

  function renderGrid() {
    const frag = document.createDocumentFragment();
    state.order.forEach((id, i) => {
      const q = BY_ID.get(id), p = state.progress[id];
      const b = document.createElement("button");
      b.className = `cell ${q.type.toLowerCase()}${p ? " " + p.result : ""}${i === state.idx ? " current" : ""}`;
      b.textContent = i + 1;
      b.title = `${q.type} ${q.num}: ${q.topic}${p ? ` (${p.result === "ok" ? "correct" : p.result === "part" ? "partly right" : "wrong"})` : ""}`;
      b.setAttribute("aria-label", b.title);
      b.addEventListener("click", () => go(i));
      frag.appendChild(b);
    });
    grid.replaceChildren(frag);
    // keep the current question visible inside the navigator's own scroll box
    const cur = grid.querySelector(".current");
    if (cur && grid.scrollHeight > grid.clientHeight) {
      const top = cur.offsetTop, bottom = top + cur.offsetHeight;
      if (top < grid.scrollTop || bottom > grid.scrollTop + grid.clientHeight) {
        grid.scrollTop = top - grid.clientHeight / 2 + cur.offsetHeight / 2;
      }
    }
  }

  function renderScore() {
    const vals = Object.values(state.progress);
    const ok = vals.filter(v => v.result === "ok").length;
    const pct = vals.length ? Math.round((ok / vals.length) * 100) : 0;
    $("#scoreCorrect").textContent = ok;
    $("#scoreDone").textContent = vals.length;
    $("#scorePct").textContent = `${pct}%`;
    $("#scoreRing").style.setProperty("--p", pct);
    $("#scoreTotal").textContent = `${BANK.length - vals.length} of ${BANK.length} not tried yet`;
  }

  // ------------------------------------------------------------ actions
  function pick(i) {
    const q = currentQ();
    if (!q || state.progress[q.id]) return;
    let sel = state.picks[q.id] || [];
    if (q.type === "MSQ") sel = sel.includes(i) ? sel.filter(x => x !== i) : [...sel, i].sort();
    else sel = [i];
    state.picks[q.id] = sel;
    if (q.type === "MCQ" && state.instant) return check();
    renderCard();
    card.querySelector(`.opt[data-i="${i}"]`)?.focus();
  }

  function check() {
    const q = currentQ();
    if (!q) return;
    if (state.progress[q.id]) {           // "Try again"
      delete state.progress[q.id];
      delete state.picks[q.id];
      return render();
    }
    const sel = state.picks[q.id] || [];
    if (!sel.length) return;
    const result = grade(q, sel);
    state.progress[q.id] = { sel, result };
    delete state.picks[q.id];
    render();
    celebrate(result);
  }

  function go(i) {
    if (i < 0 || i >= state.order.length) return;
    state.idx = i;
    render();
    card.focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 860px)").matches) card.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function refilter() {
    buildOrder(currentQ()?.id);
    render();
  }

  function resetFilters() {
    Object.assign(state.filters, { type: "ALL", deck: "ALL", topic: "ALL", status: "ALL" });
    state.filters.diffs.clear();
    syncControls();
    refilter();
  }

  // ------------------------------------------------------------ controls
  function syncControls() {
    document.querySelectorAll(".seg[data-filter]").forEach(seg => {
      const key = seg.dataset.filter;
      seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", String(b.dataset.value === state.filters[key])));
    });
    $("#topic").value = state.filters.topic;
    document.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(state.filters.diffs.has(c.dataset.value))));
    $("#shuffle").checked = state.shuffle;
    $("#instant").checked = state.instant;
  }

  function setupControls() {
    document.querySelectorAll(".seg[data-filter]").forEach(seg => {
      seg.addEventListener("click", e => {
        const b = e.target.closest("button");
        if (!b) return;
        state.filters[seg.dataset.filter] = b.dataset.value;
        syncControls();
        refilter();
      });
    });

    // topics in lecture order, grouped by deck
    const topicSel = $("#topic");
    for (const deck of ["QM", "VM"]) {
      const og = document.createElement("optgroup");
      og.label = DECKS[deck];
      [...new Set(BANK.filter(q => q.deck === deck).map(q => q.topic))].forEach(t => {
        if ([...topicSel.querySelectorAll("option")].some(o => o.value === t)) return;
        const o = document.createElement("option");
        o.value = t; o.textContent = t;
        og.appendChild(o);
      });
      topicSel.appendChild(og);
    }
    topicSel.addEventListener("change", () => { state.filters.topic = topicSel.value; refilter(); });

    const chips = $("#diffChips");
    DIFFS.forEach(d => {
      const n = BANK.filter(q => q.difficulty === d).length;
      if (!n) return;
      const c = document.createElement("button");
      c.className = "chip"; c.dataset.value = d; c.textContent = `${d} (${n})`;
      c.setAttribute("aria-pressed", "false");
      c.addEventListener("click", () => {
        state.filters.diffs.has(d) ? state.filters.diffs.delete(d) : state.filters.diffs.add(d);
        syncControls(); refilter();
      });
      chips.appendChild(c);
    });

    $("#shuffle").addEventListener("change", e => { state.shuffle = e.target.checked; refilter(); });
    $("#instant").addEventListener("change", e => { state.instant = e.target.checked; render(); });

    $("#resetBtn").addEventListener("click", () => {
      if (!confirm("Clear all checked answers and your score? This can't be undone.")) return;
      state.progress = {}; state.picks = {};
      refilter();
    });

    checkBtn.addEventListener("click", check);
    prevBtn.addEventListener("click", () => go(state.idx - 1));
    nextBtn.addEventListener("click", () => go(state.idx + 1));

    const ft = $("#filtersToggle");
    ft.addEventListener("click", () => {
      const open = $("#filters").classList.toggle("open");
      ft.setAttribute("aria-expanded", String(open));
      ft.textContent = open ? "Hide filters" : "Filters";
    });

    const themeBtn = $("#themeToggle");
    const applyTheme = () => {
      if (state.theme) document.documentElement.dataset.theme = state.theme;
      else delete document.documentElement.dataset.theme;
      const dark = state.theme ? state.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      themeBtn.textContent = dark ? "Light" : "Dark";
      themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    };
    themeBtn.addEventListener("click", () => {
      const dark = state.theme ? state.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      state.theme = dark ? "light" : "dark";
      applyTheme(); save();
    });
    applyTheme();

    document.addEventListener("keydown", e => {
      if (e.target.closest("select, input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const i = "abcd".indexOf(k) >= 0 ? "abcd".indexOf(k) : "1234".indexOf(k);
      if (i >= 0 && k.length === 1) { pick(i); e.preventDefault(); }
      else if (e.key === "Enter" && !e.target.closest(".cell, .seg, .chip, .ghost, .danger-link")) {
        if (!checkBtn.disabled) { check(); e.preventDefault(); }
      }
      else if (e.key === "ArrowRight") { go(state.idx + 1); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { go(state.idx - 1); e.preventDefault(); }
    });
  }

  // ------------------------------------------------------------ start
  if (!BANK.length) {
    card.innerHTML = '<div class="empty"><h2>Questions didn\'t load</h2><p>Make sure <code>questions.js</code> sits in the same folder as <code>index.html</code>.</p></div>';
    return;
  }
  setupControls();
  syncControls();
  buildOrder(saved.currentId);
  render();
  // KaTeX loads with "defer"; re-render maths once it is ready.
  window.addEventListener("load", () => math(card));
})();
