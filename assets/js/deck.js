/* Slide navigation: chapter progress bar, drawer, overview, notes, presenter tools, keyboard and swipe. */
(() => {
  "use strict";
  const { $, $$, el, store } = TT;

  const CHAPTERS = ["Welcome", "Platforms", "Scouting on GeM", "Scope with Claude", "Eligibility", "Bid or no-bid",
    "Scoring", "Documents", "Teams & tracker", "Submitting", "File limits", "Practice tender", "Quiz & wrap-up"];
  const presenter = TT.mode === "present";
  const slides = $$(".slide");
  const chapterOf = s => Number(s.dataset.chapter);
  let current = -1;

  /* Chapter dividers list the slides inside their chapter as buttons. */
  $$(".divider-slide").forEach(d => {
    const box = $(".inside", d);
    if (!box) return;
    slides.filter(s => chapterOf(s) === chapterOf(d) && s !== d).forEach((s, k) =>
      box.append(el("button", { type: "button", style: `--k:${k}`, "data-go": s.id, text: s.dataset.title })));
  });

  /* Cover title: split into letters so they can rise one by one. */
  $$(".title-xl [data-split]").forEach(node => {
    let k = 0;
    const words = node.textContent.split(" ");
    node.textContent = "";
    words.forEach((w, wi) => {
      const word = el("span", { class: "w" });
      [...w].forEach(ch => word.append(el("span", { class: "ch", style: `--k:${k++}`, text: ch })));
      node.append(word);
      if (wi < words.length - 1) node.append(" ");
    });
  });

  /* Top progress bar: one segment per chapter, filled as you go. */
  const bar = $("#chapterbar");
  const segs = CHAPTERS.map((name, i) => {
    const members = slides.filter(s => chapterOf(s) === i);
    if (!members.length) return null;
    const b = el("button", { type: "button", "data-chapter": String(i), style: `--n:${members.length}`, title: name, "aria-label": `Go to ${name}`, onclick: () => go(slides.indexOf(members[0])) }, el("i"));
    bar.append(b);
    return { b, members };
  });

  /* Drawer with chapters */
  const chapterList = $("#chapters");
  CHAPTERS.forEach((name, i) => {
    const first = slides.findIndex(s => chapterOf(s) === i);
    if (first < 0) return;
    chapterList.append(el("li", {}, el("button", { type: "button", "data-chapter": String(i), onclick: () => { go(first); openDrawer(false); } },
      el("span", { class: "no", text: String(i).padStart(2, "0") }), el("span", { text: name }))));
  });

  /* Overview grid */
  const grid = $("#overviewGrid");
  slides.forEach((s, i) => grid.append(el("button", { type: "button", "data-chapter": s.dataset.chapter, onclick: () => { go(i); showOverview(false); } },
    el("small", { text: `${String(i + 1).padStart(2, "0")} · ${CHAPTERS[chapterOf(s)]}` }), el("span", { text: s.dataset.title || s.id }))));

  function go(i, { fromHash = false } = {}) {
    if (i < 0 || i >= slides.length || i === current) return;
    const back = i < current;
    const s = slides[i];
    slides.forEach(x => { x.hidden = x !== s; x.classList.remove("enter", "back"); });
    if (current >= 0 && !TT.reduceMotion()) {
      [...s.children].forEach((c, k) => c.style.setProperty("--i", String(k)));
      void s.offsetWidth;
      s.classList.add("enter");
      if (back) s.classList.add("back");
      TT.fx?.whoosh();
    }
    s.scrollTop = 0;
    current = i;
    const ch = chapterOf(s);
    $("#count").textContent = `${i + 1} / ${slides.length}`;
    $("#chapterName").textContent = ch ? `${String(ch).padStart(2, "0")} · ${CHAPTERS[ch]}` : "";
    segs.forEach((seg, k) => {
      if (!seg) return;
      const idx = seg.members.indexOf(s);
      const fill = k < ch ? 100 : k > ch ? 0 : ((idx + 1) / seg.members.length) * 100;
      seg.b.firstChild.style.width = `${fill}%`;
    });
    $("#prevBtn").disabled = i === 0;
    $("#nextBtn").disabled = i === slides.length - 1;
    $("#revealBtn").disabled = !TT.canReveal(s);
    $("#resetBtn").disabled = !s.querySelector("[data-widget], details.answer");
    $$("#chapters button").forEach(b => b.setAttribute("aria-current", String(Number(b.dataset.chapter) === ch)));
    $$("#overviewGrid button").forEach((b, j) => b.setAttribute("aria-current", String(j === i)));
    const notes = $("aside.notes", s);
    $("#notesBody").innerHTML = notes ? notes.innerHTML : "<p>No notes for this slide.</p>";
    document.title = i === 0 ? "Winning on GeM" : `${s.dataset.title} · Winning on GeM`;
    if (!fromHash && s.id) { try { history.replaceState(null, "", `${location.pathname}${location.search}#${s.id}`); } catch { /* sandboxed frame */ } }
    s.dispatchEvent(new CustomEvent("slide:shown", { bubbles: true }));
    fit();
  }
  const goId = id => { const i = slides.findIndex(s => s.id === id); if (i >= 0) go(i); };
  const next = () => go(current + 1);
  const prev = () => go(current - 1);
  window.TTDeck = { go, goId, next, prev };

  /* Presenter view: every slide fills the screen without scrolling.
     Type starts at 1.6vw (about 31px on a 1080p TV) and steps down to 1.15vw. A slide still too
     long at that size is scaled down to fit: first laid out on a wider page (so lines get longer
     and the slide shorter), or, if that doesn't fit, kept at its width and shrunk as a whole.
     A− and A+ scale both ends for the room. */
  let zoom = Number(store.get("tt-zoom")) || 1;
  let quietUntil = 0;
  const scale = (s, k, wide) => {
    s.classList.toggle("scaled", k < 1);
    s.classList.toggle("wide", k < 1 && wide);
    if (k < 1) s.style.setProperty("--k", k.toFixed(4)); else s.style.removeProperty("--k");
  };
  function fit() {
    if (!presenter || current < 0) return;
    const root = document.documentElement, s = slides[current];
    root.classList.add("fitting"); // measure final sizes, not the start of a transition
    slides.forEach(x => scale(x, 1));
    const vw = innerWidth / 100;
    const max = Math.min(56, Math.max(18, 1.6 * vw * zoom)), min = Math.max(16, Math.min(max, 1.15 * vw * zoom));
    const over = () => s.scrollHeight > s.clientHeight + 2;
    let size = max;
    root.style.fontSize = `${size}px`;
    while (over() && size > min) {
      size = Math.max(min, size - 0.06 * max);
      root.style.fontSize = `${size}px`;
    }
    if (over()) {
      const k0 = s.clientHeight / s.scrollHeight;
      scale(s, k0, true);
      if (over()) scale(s, k0, false);
      else {
        // The wider page has room to spare: grow it back as far as it still fits.
        let lo = k0, hi = 1;
        for (let n = 0; n < 6; n++) { const k = (lo + hi) / 2; scale(s, k, true); if (over()) hi = k; else lo = k; }
        scale(s, lo, true);
      }
    }
    root.classList.remove("fitting");
    quietUntil = performance.now() + 250;
  }
  // Answers, feedback and lists change a slide's height, so measure again when they do.
  if (presenter && "ResizeObserver" in window) {
    const watch = new ResizeObserver(() => { if (performance.now() > quietUntil) refit(); });
    slides.forEach(x => [...x.children].forEach(c => watch.observe(c)));
  }
  const setZoom = z => { zoom = Math.min(1.6, Math.max(0.7, Math.round(z * 10) / 10)); store.set("tt-zoom", String(zoom)); $("#zoomLabel").textContent = `${Math.round(zoom * 100)}%`; fit(); };
  $("#zoomOut").addEventListener("click", () => setZoom(zoom - 0.1));
  $("#zoomIn").addEventListener("click", () => setZoom(zoom + 0.1));
  $("#zoomLabel").textContent = `${Math.round(zoom * 100)}%`;
  let fitTimer = null;
  const refit = () => { clearTimeout(fitTimer); fitTimer = setTimeout(fit, 80); };
  addEventListener("resize", refit);
  // Web fonts arrive after the first measurement and change line lengths, so measure again.
  document.fonts?.ready.then(() => fit());
  document.fonts?.addEventListener?.("loadingdone", refit);

  /* Buttons */
  $("#nextBtn").addEventListener("click", next);
  $("#prevBtn").addEventListener("click", prev);
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-go]");
    if (t) { e.preventDefault(); goId(t.dataset.go); }
  });

  const notesPanel = $("#notesPanel");
  const showNotes = force => {
    const show = force ?? notesPanel.hidden;
    notesPanel.hidden = !show;
    $("#notesBtn").setAttribute("aria-pressed", String(show));
  };
  $("#notesBtn").addEventListener("click", () => showNotes());

  const revealHere = () => { if (presenter && current >= 0) { TT.reveal(slides[current]); TT.fx?.good($("#revealBtn")); fit(); } };
  $("#revealBtn").addEventListener("click", revealHere);
  $("#resetBtn").addEventListener("click", () => { if (current >= 0) { TT.reset(slides[current]); fit(); } });
  if (presenter) {
    // Keep presenter mode when opening the practice tender in a new tab.
    $$('a[href^="practice/"]').forEach(a => { const [path, hash] = a.getAttribute("href").split("#"); a.href = `${path}?mode=present${hash ? `#${hash}` : ""}`; });
  }

  const overview = $("#overview");
  const showOverview = force => {
    const show = force ?? overview.hidden;
    overview.hidden = !show;
    if (show) $("#overviewGrid button[aria-current='true']")?.focus();
  };
  $("#overviewBtn").addEventListener("click", () => showOverview(true));
  $("#overviewClose").addEventListener("click", () => showOverview(false));

  const drawer = $("#drawer"), scrim = $("#scrim");
  const openDrawer = open => { drawer.classList.toggle("open", open); scrim.hidden = !open; $("#menuBtn").setAttribute("aria-expanded", String(open)); };
  $("#menuBtn").addEventListener("click", () => openDrawer(!drawer.classList.contains("open")));
  scrim.addEventListener("click", () => openDrawer(false));

  const saved = store.get("tt-theme");
  if (saved) document.documentElement.dataset.theme = saved;
  $("#themeBtn").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    store.set("tt-theme", root.dataset.theme);
  });

  const soundBtn = $("#soundBtn");
  const paintSound = () => { soundBtn.setAttribute("aria-pressed", String(!!TT.fx?.soundOn)); soundBtn.title = TT.fx?.soundOn ? "Sound on (S)" : "Sound off (S)"; };
  soundBtn.addEventListener("click", () => { TT.fx?.setSound(!TT.fx.soundOn); paintSound(); if (TT.fx?.soundOn) TT.fx.good(soundBtn); });
  paintSound();

  $("#fullBtn").addEventListener("click", async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { /* full screen not available */ }
  });

  /* Keyboard */
  document.addEventListener("keydown", e => {
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key, lk = k.toLowerCase();
    if (!overview.hidden) { if (k === "Escape" || lk === "o") showOverview(false); return; }
    if (k === "ArrowRight" || k === "PageDown" || (k === " " && !e.target.closest("button, summary, a"))) { e.preventDefault(); next(); }
    else if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); prev(); }
    else if (k === "Home") go(0);
    else if (k === "End") go(slides.length - 1);
    else if (lk === "o") showOverview(true);
    else if (lk === "t") $("#themeBtn").click();
    else if (lk === "f") $("#fullBtn").click();
    else if (lk === "s") soundBtn.click();
    else if (lk === "n" && presenter) showNotes();
    else if (lk === "r" && presenter) revealHere();
    else if (lk === "l" && presenter) TT.fx?.toggleLaser();
    else if (lk === "b" && presenter) TT.fx?.toggleBlackout();
    else if ((k === "+" || k === "=") && presenter) setZoom(zoom + 0.1);
    else if ((k === "-" || k === "_") && presenter) setZoom(zoom - 0.1);
    else if (k === "Escape") { showNotes(false); openDrawer(false); }
  });

  /* Swipe */
  let touch = null;
  const stage = $("#stage");
  stage.addEventListener("touchstart", e => { const t = e.touches[0]; touch = { x: t.clientX, y: t.clientY }; }, { passive: true });
  stage.addEventListener("touchend", e => {
    if (!touch) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    touch = null;
    if (e.target.closest("input, select, .table-wrap, .sim, .shot, pre")) return;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) (dx < 0 ? next : prev)();
  });

  addEventListener("hashchange", () => {
    const i = slides.findIndex(s => s.id === location.hash.slice(1));
    if (i >= 0) go(i, { fromHash: true });
  });

  TT.initAll();
  const start = slides.findIndex(s => s.id === location.hash.slice(1));
  go(Math.max(0, start), { fromHash: true });
})();
