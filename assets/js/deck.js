/* Slide navigation: chapters rail, overview, speaker notes, theme, keyboard and swipe. */
(() => {
  "use strict";
  const { $, $$, el, store } = TT;

  const CHAPTERS = ["The file", "Platforms", "Scouting on GeM", "Scope with Claude", "Eligibility", "Bid or no-bid",
    "Scoring", "Documents", "Teams & tracker", "Submitting", "File limits", "Practice tender", "Quiz & wrap-up"];
  const slides = $$(".slide");
  let current = -1;

  const chapterList = $("#chapters");
  CHAPTERS.forEach((name, i) => {
    const first = slides.findIndex(s => Number(s.dataset.chapter) === i);
    if (first < 0) return;
    chapterList.append(el("li", {}, el("button", { type: "button", "data-chapter": String(i), onclick: () => { go(first); closeRail(); } },
      el("span", { class: "no" }, String(i).padStart(2, "0")), el("span", { text: name }))));
  });

  const grid = $("#overviewGrid");
  slides.forEach((s, i) => grid.append(el("button", { type: "button", onclick: () => { go(i); showOverview(false); } },
    el("small", { text: `${String(i + 1).padStart(2, "0")} · ${CHAPTERS[Number(s.dataset.chapter)]}` }),
    el("span", { text: s.dataset.title || s.id }))));

  function go(i, { fromHash = false } = {}) {
    if (i < 0 || i >= slides.length || i === current) return;
    const back = i < current;
    slides.forEach((s, j) => { s.hidden = j !== i; s.classList.remove("is-entering", "from-left"); });
    const s = slides[i];
    if (current >= 0) { s.classList.add("is-entering"); if (back) s.classList.add("from-left"); }
    s.scrollTop = 0;
    current = i;
    $("#count").textContent = `${i + 1} / ${slides.length}`;
    $("#progress").style.width = `${((i + 1) / slides.length) * 100}%`;
    $("#prevBtn").disabled = i === 0;
    $("#nextBtn").disabled = i === slides.length - 1;
    $$("#chapters button").forEach(b => b.setAttribute("aria-current", String(b.dataset.chapter === s.dataset.chapter)));
    $$("#overviewGrid button").forEach((b, j) => b.setAttribute("aria-current", String(j === i)));
    const notes = $("aside.notes", s);
    $("#notesBody").innerHTML = notes ? notes.innerHTML : "<p>No notes for this slide.</p>";
    document.title = i === 0 ? "Winning on GeM" : `${s.dataset.title} · Winning on GeM`;
    if (!fromHash && s.id) { try { history.replaceState(null, "", `#${s.id}`); } catch { /* sandboxed frame */ } }
    s.dispatchEvent(new CustomEvent("slide:shown", { bubbles: true }));
  }
  const goId = id => { const i = slides.findIndex(s => s.id === id); if (i >= 0) go(i); };
  const next = () => go(current + 1);
  const prev = () => go(current - 1);
  window.TTDeck = { go, goId, next, prev };

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

  const overview = $("#overview");
  const showOverview = force => {
    const show = force ?? overview.hidden;
    overview.hidden = !show;
    if (show) $("#overviewGrid button[aria-current='true']")?.focus();
  };
  $("#overviewBtn").addEventListener("click", () => showOverview(true));
  $("#overviewClose").addEventListener("click", () => showOverview(false));

  const saved = store.get("tt-theme");
  if (saved) document.documentElement.dataset.theme = saved;
  $("#themeBtn").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    store.set("tt-theme", root.dataset.theme);
  });

  $("#fullBtn").addEventListener("click", async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { /* full screen not available */ }
  });

  const rail = $("#rail");
  const closeRail = () => { rail.classList.remove("open"); $("#menuBtn").setAttribute("aria-expanded", "false"); };
  $("#menuBtn").addEventListener("click", () => {
    const open = !rail.classList.contains("open");
    rail.classList.toggle("open", open);
    $("#menuBtn").setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("keydown", e => {
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (!overview.hidden) { if (k === "Escape" || k.toLowerCase() === "o") showOverview(false); return; }
    if (k === "ArrowRight" || k === "PageDown" || (k === " " && !e.target.closest("button, summary, a"))) { e.preventDefault(); next(); }
    else if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); prev(); }
    else if (k === "Home") go(0);
    else if (k === "End") go(slides.length - 1);
    else if (k.toLowerCase() === "n") showNotes();
    else if (k.toLowerCase() === "o") showOverview(true);
    else if (k.toLowerCase() === "t") $("#themeBtn").click();
    else if (k.toLowerCase() === "f") $("#fullBtn").click();
    else if (k === "Escape") { showNotes(false); closeRail(); }
  });

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

  window.addEventListener("hashchange", () => {
    const i = slides.findIndex(s => s.id === location.hash.slice(1));
    if (i >= 0) go(i, { fromHash: true });
  });

  TT.initAll();
  const start = slides.findIndex(s => s.id === location.hash.slice(1));
  go(Math.max(0, start), { fromHash: true });
})();
