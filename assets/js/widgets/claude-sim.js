/* claudesim: a replayed Claude answer about the practice tender with one planted mistake.
   data: { prompts: [{ name, ask, files: [..], claims: [{ text, cite, href, wrong, why }] }] } */
(() => {
  "use strict";
  const { $, $$, el, reduceMotion, copyText, flash } = TT;

  TT.register("claudesim", (root, data) => {
    const picker = $(".cs-prompts", root), chat = $(".cs-chat", root), fb = $(".cs-fb", root);
    let run = 0, currentIdx = 0;

    const play = (idx, { instant = false, showWrong = false } = {}) => {
      currentIdx = idx;
      const p = data.prompts[idx];
      const token = ++run;
      $$("button", picker).forEach((b, j) => b.setAttribute("aria-pressed", String(j === idx)));
      fb.className = "cs-fb fb"; fb.textContent = "Claude is answering…";
      const copy = el("button", { type: "button", class: "btn quiet small", text: "Copy prompt" });
      const askText = el("span", { text: p.ask });
      copy.addEventListener("click", () => copyText(p.ask, askText, m => { copy.textContent = m === "Copied." ? "Copied" : "Select and copy"; }));
      const thinking = el("p", { class: "cs-thinking muted", text: `Reading ${p.files.length} files…` });
      const answer = el("ol", { class: "cs-claims" });
      chat.replaceChildren(
        el("div", { class: "msg user" }, el("span", { class: "who", text: "Bid manager" }), askText,
          el("div", { class: "attach" }, p.files.map(f => el("span", { text: f }))), copy),
        el("div", { class: "msg ai" }, el("span", { class: "who", text: "Claude" }), thinking, answer));

      let flagged = false;
      const catchIt = (line, c) => {
        flagged = true;
        line.classList.add("caught");
        fb.className = "cs-fb fb ok";
        fb.replaceChildren(el("b", { text: showWrong ? "The wrong line: " : "Good catch. " }), c.why, " ", el("a", { href: c.href, target: "_blank", rel: "noopener", text: "Check the source" }));
        if (!showWrong) TT.fx?.win(line); else TT.fx?.stamp();
      };
      const claimNode = c => {
        const line = el("button", { type: "button", class: "claim" }, el("span", { text: c.text }));
        const cite = el("a", { class: "cite typed", href: c.href, target: "_blank", rel: "noopener", text: c.cite });
        line.addEventListener("click", () => {
          if (flagged) return;
          if (c.wrong) {
            catchIt(line, c);
          } else {
            flash(line);
            TT.fx?.bad();
            line.classList.add("checked");
            fb.className = "cs-fb fb";
            fb.textContent = `That one checks out against ${c.cite}. Keep looking.`;
          }
        });
        line._claim = c;
        return el("li", {}, line, cite);
      };

      if (instant) {
        thinking.remove();
        p.claims.forEach(c => answer.append(claimNode(c)));
        const wrong = $$(".claim", answer).find(l => l._claim.wrong);
        if (showWrong && wrong) catchIt(wrong, wrong._claim);
        return;
      }
      const delay = reduceMotion() ? 0 : 1;
      setTimeout(() => {
        if (token !== run) return;
        thinking.remove();
        p.claims.forEach((c, i) => setTimeout(() => {
          if (token !== run) return;
          answer.append(claimNode(c));
          if (i === p.claims.length - 1) {
            fb.className = "cs-fb fb warn";
            fb.textContent = "One line in this answer is wrong. Click the line you would not trust, then open its source to prove it.";
          }
        }, delay * 320 * i));
      }, delay * 900);
    };

    data.prompts.forEach((p, i) => picker.append(el("button", { type: "button", class: "opt", text: p.name, onclick: () => play(i) })));
    play(0);
    return { reveal: () => play(currentIdx, { instant: true, showWrong: true }) };
  });
})();
