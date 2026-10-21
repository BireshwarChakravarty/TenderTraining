/* Classroom games: question rounds, matching, ordering, sorting into lanes, index cards and the team quiz. */
(() => {
  "use strict";
  const { $, $$, el, shuffle, flash } = TT;
  const fx = () => TT.fx || {};

  /* rounds: a list of short questions, each answered by picking one option.
     In the presenter view the questions come one at a time, large, with Next and Back.
     data: { items: [{ q, options: [..], answer: <index>, why }] } */
  TT.register("rounds", (root, data) => {
    const focus = TT.mode === "present";
    const list = el("ol", { class: `rounds${focus ? " focus" : ""}` });
    const tally = el("span", { class: "tally" });
    let right = 0, now = 0;
    const update = () => { tally.textContent = `${right} of ${data.items.length} right`; };
    const answer = (li, item, chosen) => {
      const opts = $(".opts", li), why = $(".fb", li);
      if (opts.dataset.done) return;
      opts.dataset.done = "1";
      const ok = chosen === item.answer;
      if (ok) right++;
      $$("button", opts).forEach((b, j) => { b.disabled = true; if (j === item.answer) b.classList.add("right"); });
      if (chosen != null && !ok) $$("button", opts)[chosen].classList.add("wrong");
      why.className = `fb ${ok || chosen == null ? "ok" : "bad"}`;
      why.textContent = item.why;
      why.hidden = false;
      if (chosen != null) (ok ? fx().good?.($$("button", opts)[chosen]) : fx().bad?.($$("button", opts)[chosen]));
      update(); paintDots();
      if (chosen != null && right === data.items.length) setTimeout(() => fx().win?.(tally), 250);
    };
    const items = data.items.map((item, qi) => {
      const why = el("p", { class: "fb", hidden: true });
      const opts = el("div", { class: "opts" });
      const li = el("li", {}, el("p", { class: "q", text: item.q }), opts, why);
      item.options.forEach((label, i) => opts.append(el("button", { type: "button", class: "opt", text: label, onclick: () => answer(li, item, i) })));
      li.dataset.qi = String(qi);
      list.append(li);
      return li;
    });
    const dots = el("span", { class: "dots", "aria-hidden": "true" }, data.items.map(() => el("i")));
    const paintDots = () => $$("i", dots).forEach((d, i) => { d.classList.toggle("on", i === now); d.classList.toggle("done", !!$(".opts", items[i]).dataset.done); });
    const show = i => { now = Math.max(0, Math.min(items.length - 1, i)); items.forEach((li, j) => li.classList.toggle("now", j === now)); prev.disabled = now === 0; next.disabled = now === items.length - 1; paintDots(); };
    const prev = el("button", { type: "button", class: "btn", text: "← Back", onclick: () => show(now - 1) });
    const next = el("button", { type: "button", class: "btn ink", text: "Next question →", onclick: () => show(now + 1) });
    const reset = el("button", { type: "button", class: "btn quiet", text: "Start again", onclick: () => TT.resetWidget(root) });
    const json = root.querySelector('script[type="application/json"]');
    const top = el("div", { class: "row between" }, tally, focus ? el("div", { class: "round-nav" }, dots, prev, next) : null, reset);
    root.replaceChildren(json, top, list);
    update();
    if (focus) show(0);
    return {
      reveal() {
        if (focus) { const li = items[now]; answer(li, data.items[now], null); return; }
        items.forEach((li, qi) => answer(li, data.items[qi], null));
        tally.textContent = "Answers shown";
      },
    };
  });

  /* match: click an item on the left, then its partner on the right.
     data: { left: "heading", right: "heading", pairs: [[a, b], ..] } */
  TT.register("match", (root, data) => {
    const json = root.querySelector('script[type="application/json"]');
    const tally = el("span", { class: "tally" });
    const msg = el("p", { class: "fb", text: "Pick a criterion, then the evidence that proves it." });
    const L = el("div", { class: "match-col" }, el("span", { class: "label", text: data.left }));
    const R = el("div", { class: "match-col" }, el("span", { class: "label", text: data.right }));
    let picked = null, matched = 0;
    const update = () => { tally.textContent = `${matched} of ${data.pairs.length} matched`; };
    const lefts = data.pairs.map(([a], i) => el("button", { type: "button", class: "opt match-item", "data-i": String(i), text: a }));
    const rights = shuffle(data.pairs.map(([, b], i) => ({ b, i }))).map(({ b, i }) => el("button", { type: "button", class: "opt match-item", "data-i": String(i), text: b }));
    lefts.forEach(b => { L.append(b); b.addEventListener("click", () => {
      if (b.classList.contains("right")) return;
      lefts.forEach(x => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true"); picked = b;
    }); });
    rights.forEach(b => { R.append(b); b.addEventListener("click", () => {
      if (b.classList.contains("right")) return;
      if (!picked) { msg.className = "fb warn"; msg.textContent = "Pick a criterion on the left first."; flash(b); return; }
      if (picked.dataset.i === b.dataset.i) {
        matched++;
        [picked, b].forEach(x => { x.classList.add("right"); x.setAttribute("aria-pressed", "false"); x.disabled = true; x.prepend(el("span", { class: "pair-no", text: String(matched) })); });
        const done = matched === data.pairs.length;
        msg.className = "fb ok"; msg.textContent = done ? "All matched. Every criterion has its evidence." : "Correct.";
        picked = null;
        if (done) fx().win?.(b); else fx().good?.(b);
      } else {
        flash(b); flash(picked); fx().bad?.();
        msg.className = "fb bad"; msg.textContent = `"${b.textContent}" does not prove "${picked.textContent}".`;
      }
      update();
    }); });
    root.replaceChildren(json, tally, el("div", { class: "match" }, L, R), msg);
    update();
    return {
      reveal() {
        lefts.forEach((a, i) => {
          const b = rights.find(r => r.dataset.i === String(i));
          R.append(b);
          if (!a.classList.contains("right")) {
            [a, b].forEach(x => { x.classList.add("right"); x.setAttribute("aria-pressed", "false"); x.disabled = true; x.prepend(el("span", { class: "pair-no", text: String(i + 1) })); });
          }
        });
        picked = null; matched = data.pairs.length; update();
        msg.className = "fb ok"; msg.textContent = "Each criterion sits beside its evidence.";
      },
    };
  });

  /* order: click the items from highest to lowest.
     data: { items: [..in correct order..], done: "message" } */
  TT.register("order", (root, data) => {
    const json = root.querySelector('script[type="application/json"]');
    const placed = el("ol", { class: "order-list" });
    const pool = el("div", { class: "opts" });
    const msg = el("p", { class: "fb", text: "Click the document that wins first." });
    let step = 0;
    const build = () => {
      step = 0; placed.replaceChildren(); pool.replaceChildren();
      msg.className = "fb"; msg.textContent = "Click the document that wins first.";
      shuffle(data.items.map((t, i) => ({ t, i }))).forEach(({ t, i }) => pool.append(el("button", { type: "button", class: "opt", text: t, onclick: e => {
        const b = e.currentTarget;
        if (i === step) {
          step++; b.remove(); placed.append(el("li", { text: t }));
          const done = step === data.items.length;
          msg.className = `fb ${done ? "ok" : ""}`;
          msg.textContent = done ? data.done : "Right. What comes next?";
          if (done) fx().win?.(placed); else fx().good?.(placed.lastElementChild);
        } else { flash(b); fx().bad?.(); msg.className = "fb bad"; msg.textContent = `Not yet. Something outranks "${t}".`; }
      } })));
    };
    root.replaceChildren(json, el("div", { class: "order" }, placed, el("div", { class: "stack" }, pool, msg,
      el("button", { type: "button", class: "btn quiet", text: "Shuffle again", onclick: build }))));
    build();
    return {
      reveal() {
        pool.replaceChildren(); placed.replaceChildren(...data.items.map(t => el("li", { text: t })));
        step = data.items.length; msg.className = "fb ok"; msg.textContent = data.done;
      },
    };
  });

  /* sort: put each item in the right lane. Click an item, then a lane.
     data: { lanes: [..], items: [{ text, lane }] } */
  TT.register("sort", (root, data) => {
    const json = root.querySelector('script[type="application/json"]');
    const tray = el("div", { class: "tray" });
    const lanes = el("div", { class: "lanes" });
    const msg = el("p", { class: "fb", text: "Click a document, then the team that owns it." });
    let picked = null;
    const pick = chip => {
      $$(".chip", root).forEach(c => c.setAttribute("aria-pressed", "false"));
      picked = picked === chip ? null : chip;
      picked?.setAttribute("aria-pressed", "true");
    };
    const chips = data.items.map(it => {
      const c = el("button", { type: "button", class: "chip", "aria-pressed": "false", "data-lane": it.lane, text: it.text });
      c.addEventListener("click", e => { e.stopPropagation(); pick(c); });
      return c;
    });
    const laneNodes = data.lanes.map(name => {
      const body = el("div", { class: "lane-body" });
      const lane = el("div", { class: "lane", "data-lane": name, role: "button", tabindex: "0", "aria-label": `Put the selected document in ${name}` }, el("b", { text: name }), body);
      const drop = () => {
        if (!picked) { msg.className = "fb warn"; msg.textContent = "Pick a document first."; return; }
        picked.classList.remove("ok", "bad"); body.append(picked); fx().whoosh?.(); pick(picked);
      };
      lane.addEventListener("click", drop);
      lane.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); drop(); } });
      return lane;
    });
    tray.addEventListener("click", () => { if (picked) { picked.classList.remove("ok", "bad"); tray.append(picked); pick(picked); } });
    const check = el("button", { type: "button", class: "btn ink", text: "Check answers", onclick: () => {
      let ok = 0, placedCount = 0;
      laneNodes.forEach(l => $$(".chip", l).forEach(c => { placedCount++; const good = c.dataset.lane === l.dataset.lane; c.classList.toggle("ok", good); c.classList.toggle("bad", !good); if (good) ok++; }));
      const left = data.items.length - placedCount, all = ok === data.items.length;
      msg.className = `fb ${all ? "ok" : "warn"}`;
      msg.textContent = all ? "Every document has the right owner." : `${ok} of ${data.items.length} in the right place${left ? `, ${left} still on the table` : ""}. Red ones need to move.`;
      if (all) fx().win?.(lanes); else fx().bad?.();
    } });
    const reset = el("button", { type: "button", class: "btn quiet", text: "Clear", onclick: () => { shuffle(chips).forEach(c => { c.classList.remove("ok", "bad"); tray.append(c); }); msg.className = "fb"; msg.textContent = "Click a document, then the team that owns it."; } });
    shuffle(chips).forEach(c => tray.append(c));
    laneNodes.forEach(l => lanes.append(l));
    root.replaceChildren(json, el("div", { class: "tray-wrap" }, el("span", { class: "label", text: "On the table" }), tray), lanes, el("div", { class: "row" }, check, reset), msg);
    return {
      reveal() {
        chips.forEach((c, i) => setTimeout(() => {
          const lane = laneNodes.find(l => l.dataset.lane === c.dataset.lane);
          $(".lane-body", lane).append(c); c.classList.remove("bad"); c.classList.add("ok"); c.setAttribute("aria-pressed", "false");
        }, TT.reduceMotion() ? 0 : i * 70));
        picked = null; msg.className = "fb ok"; msg.textContent = "Every document in its owner's lane.";
      },
    };
  });

  /* cards: index cards that flip over. data: { cards: [[term, expansion, meaning]] } */
  TT.register("cards", (root, data) => {
    const json = root.querySelector('script[type="application/json"]');
    const grid = el("div", { class: "cards" });
    data.cards.forEach(([term, full, def]) => {
      const card = el("button", { type: "button", class: "card", "aria-expanded": "false", "aria-label": `${term}: ${full}. Turn over for the meaning.` },
        el("span", { class: "face" }, el("b", { text: term }), el("span", { class: "card-full", text: full }), el("span", { class: "flip-hint", text: "Tap to flip" })),
        el("span", { class: "face back" }, el("b", { text: term }), el("span", { class: "card-def", text: def })));
      card.addEventListener("click", () => { const open = card.getAttribute("aria-expanded") !== "true"; card.setAttribute("aria-expanded", String(open)); fx().whoosh?.(); });
      grid.append(card);
    });
    root.replaceChildren(json, grid);
    return { reveal() { $$(".card", grid).forEach((c, i) => setTimeout(() => c.setAttribute("aria-expanded", "true"), TT.reduceMotion() ? 0 : i * 60)); } };
  });

  /* quiz: one question at a time, two teams keep score.
     data: { questions: [{ q, options, answer, why }] } */
  TT.register("quiz", (root, data) => {
    const json = root.querySelector('script[type="application/json"]');
    const score = [0, 0];
    let qi = 0, answered = false, finished = false;
    const names = [el("input", { type: "text", id: "teamA", value: "Team A", "aria-label": "First team name" }), el("input", { type: "text", id: "teamB", value: "Team B", "aria-label": "Second team name" })];
    const pts = [el("span", { class: "pts", text: "0" }), el("span", { class: "pts", text: "0" })];
    const board = el("div", { class: "board" }, ...names.map((n, i) => el("div", { class: "team" }, n, pts[i])));
    const counter = el("span", { class: "label" });
    const q = el("p", { class: "quiz-q" });
    const opts = el("div", { class: "opts quiz-opts" });
    const why = el("p", { class: "fb", hidden: true });
    const award = el("div", { class: "row", hidden: true });
    const nextBtn = el("button", { type: "button", class: "btn ink", text: "Next question" });
    const give = i => { score[i]++; pts[i].textContent = String(score[i]); flash(pts[i], "bump"); fx().good?.(pts[i]); award.hidden = true; };
    award.append(el("span", { class: "muted", text: "Point to:" }),
      el("button", { type: "button", class: "btn", onclick: () => give(0) }, "＋1 ", el("span", { "data-name": "0" })),
      el("button", { type: "button", class: "btn", onclick: () => give(1) }, "＋1 ", el("span", { "data-name": "1" })));
    const syncNames = () => $$("[data-name]", award).forEach(s => { s.textContent = names[Number(s.dataset.name)].value || `Team ${Number(s.dataset.name) ? "B" : "A"}`; });
    names.forEach(n => n.addEventListener("input", syncNames));
    const settle = chosen => {
      const item = data.questions[qi];
      answered = true;
      $$("button", opts).forEach((b, j) => { b.disabled = true; if (j === item.answer) b.classList.add("right"); });
      if (chosen != null && chosen !== item.answer) { $$("button", opts)[chosen].classList.add("wrong"); fx().bad?.(); }
      else fx().good?.($$("button", opts)[item.answer]);
      why.className = "fb"; why.textContent = item.why; why.hidden = false; award.hidden = false; syncNames();
    };
    const show = () => {
      const item = data.questions[qi];
      answered = false;
      counter.textContent = `Question ${qi + 1} of ${data.questions.length}`;
      q.textContent = item.q;
      q.classList.remove("quiz-q"); void q.offsetWidth; q.classList.add("quiz-q");
      why.hidden = true; award.hidden = true;
      opts.replaceChildren(...item.options.map((o, i) => el("button", { type: "button", class: "opt", text: o, onclick: () => { if (!answered) settle(i); } })));
      nextBtn.textContent = qi === data.questions.length - 1 ? "Finish" : "Next question";
    };
    nextBtn.addEventListener("click", () => {
      if (finished) { finished = false; score[0] = score[1] = 0; pts.forEach(p => { p.textContent = "0"; }); qi = 0; show(); return; }
      if (qi < data.questions.length - 1) { qi++; show(); return; }
      finished = true;
      const [a, b] = names.map(n => n.value || "Team");
      q.textContent = score[0] === score[1] ? `A tie at ${score[0]} each. Everyone gets chai.` : `${score[0] > score[1] ? a : b} wins, ${Math.max(...score)} to ${Math.min(...score)}!`;
      opts.replaceChildren(); why.hidden = true; award.hidden = true; counter.textContent = "Final score";
      nextBtn.textContent = "Play again";
      fx().win?.(q);
    });
    root.replaceChildren(json, board, el("div", { class: "quiz-card" }, counter, q, opts, why, award, el("div", {}, nextBtn)));
    show();
    return { reveal() { if (!finished && !answered) settle(null); } };
  });
})();
