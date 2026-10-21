/* Working tools used in the deck: bid search, triage sheet, calculators, planners and the tracker. */
(() => {
  "use strict";
  const { $, $$, el, fmt, crore, copyText, reduceMotion } = TT;

  /* bidsearch: data { chips: [..], bids: [{ no, title, org, end, tags }] } */
  TT.register("bidsearch", (root, data) => {
    const input = $("input", root);
    const chips = $(".chips", root);
    const results = $(".results", root);
    const pipe = $(".pipeline tbody", root);
    const empty = $(".pipeline-empty", root);
    const added = new Set();
    data.chips.forEach(c => chips.append(el("button", { type: "button", class: "chip", "aria-pressed": "false", text: c, onclick: e => {
      const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
      $$(".chip", chips).forEach(x => x.setAttribute("aria-pressed", "false"));
      e.currentTarget.setAttribute("aria-pressed", String(on));
      input.value = on ? c : ""; render();
    } })));
    const addToPipe = b => {
      if (added.has(b.no)) return;
      added.add(b.no); empty.hidden = true;
      const sel = el("select", { "aria-label": `Decision for ${b.no}` }, ["To triage", "Bid", "Drop"].map(o => el("option", { text: o })));
      pipe.append(el("tr", {}, el("td", { class: "typed", text: b.no }), el("td", { text: b.title }), el("td", { class: "typed", text: b.end }), el("td", {}, sel)));
      render();
    };
    function render() {
      const q = input.value.trim().toLowerCase();
      const hits = data.bids.filter(b => !q || `${b.title} ${b.tags} ${b.org}`.toLowerCase().includes(q));
      results.replaceChildren(...(hits.length ? hits.map(b => el("div", { class: "bidrow" },
        el("div", { class: "stack tight" }, el("span", { class: "typed bidno", text: b.no }), el("b", { text: b.title }), el("span", { class: "small muted", text: `${b.org} · closes ${b.end}` })),
        el("button", { type: "button", class: "btn", disabled: added.has(b.no), text: added.has(b.no) ? "In pipeline" : "Add to pipeline", onclick: () => addToPipe(b) })))
        : [el("p", { class: "muted", text: "No bids match. Try a broader keyword." })]));
    }
    input.addEventListener("input", () => { $$(".chip", chips).forEach(x => x.setAttribute("aria-pressed", "false")); render(); });
    render();
  });

  /* triage: bilingual bid details with explanations, a five-minute timer and kill questions.
     data: { fields: [[hindi, english, value, explain]], checks: [{ q, kill }] } */
  TT.register("triage", (root, data) => {
    const sheet = $(".bid-sheet", root);
    const explain = $(".explain", root);
    data.fields.forEach(([hi, en, val, why]) => {
      const b = el("button", { type: "button", class: "bf", "aria-pressed": "false" }, el("span", { class: "bf-hi", lang: "hi", text: hi }), el("span", { class: "bf-en", text: en }));
      b.addEventListener("click", () => {
        $$(".bf", sheet).forEach(x => x.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        explain.replaceChildren(el("span", { class: "hand blue", text: en }), el("p", { text: why }));
      });
      sheet.append(el("div", { class: "bid-line" }, b, el("span", { class: "typed bf-val", text: val })));
    });

    const clock = $(".clock", root);
    const startBtn = $(".clock-btn", root);
    let left = 300, timer = null;
    const paint = () => { clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`; clock.classList.toggle("late", left <= 60); };
    startBtn.addEventListener("click", () => {
      if (timer) { clearInterval(timer); timer = null; startBtn.textContent = "Resume"; return; }
      if (left === 0) left = 300;
      startBtn.textContent = "Pause";
      timer = setInterval(() => { left = Math.max(0, left - 1); paint(); if (!left) { clearInterval(timer); timer = null; startBtn.textContent = "Restart"; } }, 1000);
    });
    paint();

    const list = $(".kill", root);
    const verdict = $(".verdict", root);
    const answers = new Map();
    data.checks.forEach((c, i) => {
      const yes = el("button", { type: "button", class: "opt", text: "Yes" });
      const no = el("button", { type: "button", class: "opt", text: "No" });
      const set = v => { answers.set(i, v); yes.setAttribute("aria-pressed", String(v)); no.setAttribute("aria-pressed", String(!v)); judge(); };
      yes.addEventListener("click", () => set(true)); no.addEventListener("click", () => set(false));
      list.append(el("li", {}, el("span", { text: c.q }), el("span", { class: "opts" }, yes, no)));
    });
    function judge() {
      const failed = data.checks.filter((c, i) => answers.has(i) && answers.get(i) !== c.pass);
      if (failed.length) { verdict.className = "verdict fb bad"; verdict.textContent = `Drop it or escalate: ${failed[0].fail}`; return; }
      if (answers.size < data.checks.length) { verdict.className = "verdict fb"; verdict.textContent = `${data.checks.length - answers.size} questions left.`; return; }
      verdict.className = "verdict fb ok"; verdict.textContent = "Worth a full read. Send it to Claude and book the bid or no-bid meeting.";
    }
    judge();
  });

  /* experience: the 3 × 40%, 2 × 50%, 1 × 80% rule, drawn as bars. */
  TT.register("experience", root => {
    const est = $(".exp-est", root);
    const list = $(".exp-projects", root);
    const out = $(".exp-out", root);
    const addBtn = $(".exp-add", root);
    const addRow = v => {
      const i = list.children.length;
      const input = el("input", { type: "number", min: "0", step: "0.05", value: String(v), class: "typed", "aria-label": `Project ${i + 1} value in crore` });
      input.addEventListener("input", render);
      list.append(el("label", { class: "exp-row" }, el("span", { class: "typed", text: `P${i + 1}` }), input,
        el("button", { type: "button", class: "btn quiet", "aria-label": `Remove project ${i + 1}`, text: "×", onclick: e => { e.currentTarget.parentNode.remove(); render(); } })));
    };
    [1.6, 1.3, 0.9].forEach(addRow);
    addBtn.addEventListener("click", () => { addRow(1); render(); });
    est.addEventListener("input", render);
    function render() {
      const E = parseFloat(est.value);
      const vals = $$("input", list).map(i => parseFloat(i.value)).filter(v => v > 0);
      out.replaceChildren();
      if (!(E > 0)) { out.append(el("p", { class: "muted", text: "Enter the estimated bid value." })); return; }
      const max = Math.max(E, ...vals);
      let pass = false;
      [["Option A", 3, 0.4], ["Option B", 2, 0.5], ["Option C", 1, 0.8]].forEach(([name, n, share]) => {
        const need = E * share;
        const have = vals.filter(v => v >= need).length;
        const ok = have >= n; pass ||= ok;
        const bars = el("div", { class: "bars" }, el("span", { class: "bar-line", style: `left:${(need / max) * 100}%`, title: `${crore(need)}` }),
          ...vals.map(v => el("span", { class: `xbar ${v >= need ? "over" : ""}`, style: `width:${(v / max) * 100}%` })));
        out.append(el("div", { class: "exp-opt" },
          el("div", { class: "row between" }, el("b", { text: `${name} · ${n} project${n > 1 ? "s" : ""} of ${crore(need)} or more` }), el("span", { class: `pill ${ok ? "ok" : "bad"}`, text: ok ? `meets (${have})` : `short (${have} of ${n})` })), bars));
      });
      out.append(el("p", { class: `stamp ${pass ? "green" : ""} exp-stamp`, text: pass ? "Eligible" : "Not eligible" }));
    }
    render();
  });

  /* decision: gates and weighted factors produce a stamped decision note.
     data: { gates: [..], factors: [[name, weight, default]] } */
  TT.register("decision", (root, data) => {
    const gates = $(".gates", root), factors = $(".factors", root), note = $(".decision-note", root);
    data.gates.forEach((g, i) => gates.append(el("label", { class: "check" }, el("input", { type: "checkbox", id: `gate${i}`, checked: true }), el("span", { text: g }))));
    data.factors.forEach(([f, w, v], i) => factors.append(el("label", { class: "field", for: `fac${i}` },
      el("span", { class: "row between" }, el("span", { text: `${f} · weight ${w}%` }), el("b", { class: "typed", id: `facv${i}`, text: String(v) })),
      el("input", { type: "range", id: `fac${i}`, min: "1", max: "5", step: "1", value: String(v) }))));
    let last = "";
    const render = () => {
      const allPass = data.gates.every((_, i) => $(`#gate${i}`, root).checked);
      let score = 0;
      data.factors.forEach(([, w], i) => { const v = Number($(`#fac${i}`, root).value); $(`#facv${i}`, root).textContent = String(v); score += (w * v) / 5; });
      const s = Math.round(score);
      let word, tone, line;
      if (!allPass) { word = "No bid"; tone = ""; line = "A gate failed. No score makes up for it."; }
      else if (s >= 70) { word = "Bid"; tone = "green"; line = "Assign owners and send the CA request today."; }
      else if (s >= 55) { word = "Bid, if…"; tone = "amber"; line = "Only if the weakest factor is fixed this week. Name who fixes it."; }
      else { word = "No bid"; tone = ""; line = "Eligible, but the odds don't justify the effort. Write down why."; }
      $(".score", note).textContent = `${s} / 100`;
      $(".line", note).textContent = line;
      const stamp = $(".stamp", note);
      stamp.className = `stamp ${tone}`;
      stamp.textContent = word;
      if (last && last !== word && !reduceMotion()) { void stamp.offsetWidth; stamp.classList.add("thump"); }
      last = word;
    };
    $$("input", root).forEach(i => i.addEventListener("input", render));
    render();
  });

  /* qcbs: bidders with sliders; shows the winner and what the runner-up would need. */
  TT.register("qcbs", (root, data) => {
    const rows = $(".q-rows", root), out = $(".q-out", root);
    const wInput = $(".q-weight", root), cutInput = $(".q-cut", root);
    const bidders = data.bidders.map(([name, t, p]) => ({ name, t, p }));
    bidders.forEach((b, i) => {
      const t = el("input", { type: "range", min: "50", max: "100", step: "1", value: String(b.t), "aria-label": `${b.name} technical score` });
      const p = el("input", { type: "range", min: "2", max: "4", step: "0.05", value: String(b.p), "aria-label": `${b.name} price in crore` });
      const tv = el("b", { class: "typed" }), pv = el("b", { class: "typed" });
      const bar = el("div", { class: "qbar" }, el("i", { class: "qt" }), el("i", { class: "qp" }));
      const total = el("b", { class: "typed q-total" });
      t.addEventListener("input", () => { b.t = Number(t.value); render(); });
      p.addEventListener("input", () => { b.p = Number(p.value); render(); });
      b.ui = { tv, pv, bar, total, row: null };
      b.ui.row = el("div", { class: "q-row" },
        el("b", { class: "q-name", text: b.name }),
        el("label", { class: "field" }, el("span", { class: "row between" }, el("span", { text: "Technical" }), tv), t),
        el("label", { class: "field" }, el("span", { class: "row between" }, el("span", { text: "Price" }), pv), p),
        el("div", { class: "stack tight" }, bar, total));
      rows.append(b.ui.row);
      if (i === 0) b.ui.row.classList.add("first");
    });
    const score = (list, wt, cut) => {
      const q = list.filter(b => b.t >= cut);
      if (!q.length) return [];
      const th = Math.max(...q.map(b => b.t)), pm = Math.min(...q.map(b => b.p));
      return list.map(b => b.t >= cut ? { b, tp: (100 * wt * b.t) / th, pp: (100 * (1 - wt) * pm) / b.p } : { b, out: true });
    };
    function render() {
      const wt = Math.min(100, Math.max(0, Number(wInput.value) || 0)) / 100;
      const cut = Number(cutInput.value) || 0;
      const res = score(bidders, wt, cut);
      res.forEach(r => {
        const u = r.b.ui;
        u.tv.textContent = String(r.b.t); u.pv.textContent = crore(r.b.p);
        u.row.classList.toggle("dim", !!r.out);
        if (r.out) { u.total.textContent = "below cut-off, price not opened"; $(".qt", u.bar).style.width = "0"; $(".qp", u.bar).style.width = "0"; return; }
        $(".qt", u.bar).style.width = `${r.tp}%`; $(".qp", u.bar).style.width = `${r.pp}%`;
        u.total.textContent = `${fmt(r.tp, 1)} + ${fmt(r.pp, 1)} = ${fmt(r.tp + r.pp)}`;
      });
      const ranked = res.filter(r => !r.out).sort((a, b) => b.tp + b.pp - (a.tp + a.pp));
      bidders.forEach(b => b.ui.row.classList.toggle("win", ranked[0]?.b === b));
      if (!ranked.length) { out.replaceChildren(el("p", { text: "Nobody clears the cut-off." })); return; }
      const win = ranked[0], second = ranked[1];
      const cheapest = Math.min(...ranked.map(r => r.b.p));
      const lines = [el("p", { class: "hand", text: `${win.b.name} wins with ${fmt(win.tp + win.pp)}.` })];
      if (win.b.p > cheapest + 0.001) lines.push(el("p", { text: `${win.b.name} costs ${fmt((win.b.p / cheapest - 1) * 100, 0)}% more than the cheapest qualified bid, and still wins.` }));
      if (second) {
        const target = second.b;
        const orig = target.p;
        let lo = 0.5, hi = orig, need = null;
        const beats = p => { target.p = p; const r = score(bidders, wt, cut).filter(x => !x.out).sort((a, b) => b.tp + b.pp - (a.tp + a.pp)); target.p = orig; return r[0]?.b === target; };
        if (beats(lo)) { for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (beats(mid)) lo = mid; else hi = mid; } need = lo; }
        const origT = target.t; let marks = null;
        for (let t = origT + 1; t <= 100; t++) { target.t = t; const r = score(bidders, wt, cut).filter(x => !x.out).sort((a, b) => b.tp + b.pp - (a.tp + a.pp)); if (r[0]?.b === target) { marks = t - origT; break; } }
        target.t = origT;
        lines.push(el("p", { class: "muted", text: `To win, ${target.name} would have to ${need ? `cut its price to ${crore(need)} (a ${fmt((1 - need / orig) * 100, 0)}% cut)` : "cut its price below any sensible level"}${marks ? `, or gain ${marks} technical mark${marks > 1 ? "s" : ""}` : ""}.` }));
      }
      out.replaceChildren(...lines);
    }
    [wInput, cutInput].forEach(i => i.addEventListener("input", render));
    render();
  });

  /* marks: a marks sheet you fill in. data: { cutoff, rows: [[criterion, how, max, ours, kind]] } */
  TT.register("marks", (root, data) => {
    const body = $("tbody", root), out = $(".marks-out", root);
    data.rows.forEach(([c, how, max, ours, kind], i) => body.append(el("tr", {},
      el("td", {}, el("b", { text: c }), el("br"), el("span", { class: `pill ${kind === "Banked" ? "blue" : kind === "Interview" ? "warn" : ""}`, text: kind })),
      el("td", { class: "small", text: how }), el("td", { class: "num typed", text: String(max) }),
      el("td", { class: "num" }, el("input", { type: "number", class: "typed marks-in", min: "0", max: String(max), value: String(ours), id: `mk${i}`, "aria-label": `Our marks for ${c}` })))));
    const render = () => {
      const by = {}; let total = 0;
      data.rows.forEach(([, , max, , kind], i) => {
        const inp = $(`#mk${i}`, root);
        const v = Math.min(max, Math.max(0, Number(inp.value) || 0));
        inp.classList.toggle("over", Number(inp.value) > max);
        by[kind] = by[kind] || [0, 0]; by[kind][0] += v; by[kind][1] += max; total += v;
      });
      const pass = total >= data.cutoff;
      out.replaceChildren(
        el("p", { class: "marks-total typed", text: `${total} / 100` }),
        el("div", { class: "meter" }, el("i", { style: `width:${total}%` }), el("span", { class: "cut", style: `left:${data.cutoff}%`, title: `Cut-off ${data.cutoff}` })),
        el("p", { class: `hand ${pass ? "blue" : ""}`, text: pass ? `Clears the cut-off of ${data.cutoff} by ${total - data.cutoff}.` : `Short of the cut-off by ${data.cutoff - total}. Price won't be opened.` }),
        el("ul", { class: "plain small" }, Object.entries(by).map(([k, [v, m]]) => el("li", { text: `${k}: ${v} of ${m}` }))));
    };
    $$("input", root).forEach(i => i.addEventListener("input", render));
    render();
  });

  /* timeline: backward plan from a deadline. data: { steps: [[offset, label, milestone]] } */
  TT.register("timeline", (root, data) => {
    const input = $("input[type=date]", root), list = $(".timeline", root);
    const render = () => {
      const base = input.value ? new Date(`${input.value}T12:00:00`) : null;
      list.replaceChildren(...data.steps.map(([off, label, key]) => {
        let dateText = "", sunday = false;
        if (base && !Number.isNaN(base.getTime())) {
          const d = new Date(base); d.setDate(d.getDate() + off);
          sunday = d.getDay() === 0;
          dateText = d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
        }
        return el("li", { class: key ? "key" : "" }, el("span", { class: "typed t", text: off === 0 ? "T-0" : `T${off}` }),
          el("span", { class: `typed d ${sunday ? "sun" : ""}`, text: dateText + (sunday ? " · Sunday!" : "") }), el("span", { text: label }));
      }));
    };
    input.addEventListener("input", render);
    render();
  });

  /* tracker: click a status to move it on. data: { statuses: [..], rows: [[id, doc, owner, statusIndex]] } */
  TT.register("tracker", (root, data) => {
    const body = $("tbody", root), meter = $(".meter i", root), sum = $(".tracker-sum", root);
    const tones = ["", "warn", "blue", "ok"];
    const state = data.rows.map(r => r[3]);
    const render = () => {
      const done = state.filter(s => s === data.statuses.length - 1).length;
      meter.style.width = `${(done / state.length) * 100}%`;
      sum.textContent = `${done} of ${state.length} done`;
    };
    data.rows.forEach(([id, doc, owner], i) => {
      const pill = el("button", { type: "button", class: "pill", "aria-label": `Status of ${doc}` });
      const paint = () => { pill.textContent = data.statuses[state[i]]; pill.className = `pill ${tones[state[i]] || ""}`; };
      pill.addEventListener("click", () => { state[i] = (state[i] + 1) % data.statuses.length; paint(); render(); });
      paint();
      body.append(el("tr", {}, el("td", { class: "typed", text: id }), el("td", { text: doc }), el("td", { text: owner }), el("td", {}, pill)));
    });
    render();
  });

  /* pdfsize: rough size of a scanned pack, and how many uploads it needs. */
  TT.register("pdfsize", root => {
    const pages = $(".ps-pages", root), dpi = $(".ps-dpi", root), colour = $(".ps-colour", root), squeeze = $(".ps-squeeze", root), out = $(".ps-out", root);
    const perPage = { 150: 0.045, 200: 0.08, 300: 0.18 };
    const render = () => {
      const n = Math.max(0, Number(pages.value) || 0);
      let mb = n * perPage[dpi.value] * (colour.checked ? 3 : 1) * (squeeze.checked ? 0.55 : 1);
      mb = Math.round(mb * 10) / 10;
      const files = Math.max(1, Math.ceil(mb / 10), Math.ceil(n / 100));
      const fits = files === 1;
      out.replaceChildren(
        el("p", { class: "ps-mb typed", text: `≈ ${mb} MB` }),
        el("div", { class: "meter" }, el("i", { style: `width:${Math.min(100, mb * 10)}%` }), el("span", { class: "cut", style: "left:100%" })),
        el("p", { class: `hand ${fits ? "blue" : ""}`, text: fits ? "Fits in one upload slot." : `Needs ${files} upload slots (10 MB and 100 pages each), or more compression.` }));
    };
    [pages, dpi, colour, squeeze].forEach(i => i.addEventListener("input", render));
    render();
  });

  /* pins: numbered pins on a screenshot, linked to a numbered list beside it. */
  TT.register("pins", root => {
    const pins = $$(".pin", root), items = $$(".pins-list li", root);
    const on = i => {
      pins.forEach((p, j) => p.setAttribute("aria-pressed", String(i === j)));
      items.forEach((li, j) => li.classList.toggle("on", i === j));
    };
    pins.forEach((p, i) => p.addEventListener("click", () => on(i)));
    items.forEach((li, i) => li.addEventListener("click", () => on(i)));
  });

  /* prompts: a library of prompts with a copy button. data: { prompts: [[name, text]] } */
  TT.register("prompts", (root, data) => {
    const list = $(".prompt-list", root), text = $(".prompt-text", root), state = $(".copy-state", root);
    const show = i => {
      $$("button", list).forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
      text.textContent = data.prompts[i][1]; state.textContent = "";
    };
    data.prompts.forEach(([name], i) => list.append(el("button", { type: "button", class: "opt", text: name, onclick: () => show(i) })));
    $(".copy-btn", root).addEventListener("click", () => copyText(text.textContent, text, m => { state.textContent = m; }));
    show(0);
  });
})();
