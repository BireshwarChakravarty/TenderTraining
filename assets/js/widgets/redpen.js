/* redpen: find the mistakes in a document.
   Inside the widget, wrap phrases in <span class="rp" data-why="…"> for real mistakes and
   <span class="rp" data-ok="…"> for phrases that look suspicious but are fine.
   Optional children: .rp-tally (counter), .rp-log (list of finds), .rp-reveal (button). */
(() => {
  "use strict";
  const { $, $$, el, flash } = TT;

  TT.register("redpen", root => {
    const targets = $$(".rp", root);
    const errors = targets.filter(t => t.dataset.why);
    const tally = $(".rp-tally", root);
    const log = $(".rp-log", root);
    const reveal = $(".rp-reveal", root);
    const say = $(".rp-say", root);
    let found = 0;
    const update = () => { if (tally) tally.textContent = `${found} of ${errors.length} found`; };

    const mark = (t, auto = false) => {
      if (t.classList.contains("found")) return;
      t.classList.add("found");
      if (auto) t.classList.add("revealed"); else found++;
      if (log) log.append(el("li", { class: auto ? "revealed" : "" }, el("b", { text: t.textContent.trim().replace(/\s+/g, " ") }), " — ", t.dataset.why));
      update();
    };

    targets.forEach(t => {
      t.tabIndex = 0;
      t.setAttribute("role", "button");
      const act = () => {
        if (t.dataset.why) {
          if (t.classList.contains("found")) return;
          mark(t);
          if (say) { say.className = "rp-say fb ok"; say.textContent = found === errors.length ? "That's all of them." : t.dataset.why; }
        } else {
          flash(t);
          t.classList.add("cleared");
          if (say) { say.className = "rp-say fb"; say.textContent = t.dataset.ok || "That one is fine."; }
        }
      };
      t.addEventListener("click", act);
      t.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
    });
    reveal?.addEventListener("click", () => errors.forEach(t => mark(t, true)));
    update();
  });
})();
