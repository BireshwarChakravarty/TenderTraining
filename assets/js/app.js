(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const el = (tag, attrs = {}, ...kids) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const kid of kids) if (kid != null) node.append(kid);
    return node;
  };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  };
  const fmt = (n, d = 2) => Number.isFinite(n) ? n.toFixed(d) : "–";

  /* ================= Deck navigation ================= */
  const CHAPTERS = ["Start", "Platforms", "Scouting on GeM", "Scope with Claude", "Eligibility", "Bid or no-bid",
    "Scoring", "Documents", "Teams & tracker", "Submitting", "File limits", "Practice tender", "Quiz & wrap-up"];
  const slides = $$(".slide");
  let current = 0;

  const chapterList = $("#chapters");
  CHAPTERS.forEach((name, i) => {
    const first = slides.findIndex(s => Number(s.dataset.chapter) === i);
    if (first < 0) return;
    const btn = el("button", { type: "button", "data-chapter": String(i), onclick: () => { go(first); closeRail(); } },
      el("span", { class: "no" }, String(i).padStart(2, "0")), el("span", {}, name));
    chapterList.append(el("li", {}, btn));
  });

  const grid = $("#overviewGrid");
  slides.forEach((s, i) => {
    grid.append(el("button", { type: "button", onclick: () => { go(i); toggleOverview(false); } },
      el("small", {}, `${String(i + 1).padStart(2, "0")} · ${CHAPTERS[Number(s.dataset.chapter)]}`),
      el("span", {}, s.dataset.title || s.id)));
  });

  function go(i, fromHash = false) {
    if (i < 0 || i >= slides.length) return;
    const dir = i < current ? "from-left" : "";
    slides.forEach((s, j) => { s.hidden = j !== i; s.classList.remove("is-entering", "from-left"); });
    const s = slides[i];
    if (i !== current) { s.classList.add("is-entering"); if (dir) s.classList.add(dir); }
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
    if (!fromHash && s.id) {
      try { history.replaceState(null, "", `#${s.id}`); } catch { /* sandboxed */ }
    }
  }
  const goId = id => { const i = slides.findIndex(s => s.id === id); if (i >= 0) go(i); };
  const next = () => go(current + 1);
  const prev = () => go(current - 1);

  $("#nextBtn").addEventListener("click", next);
  $("#prevBtn").addEventListener("click", prev);
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-go]");
    if (t) { e.preventDefault(); goId(t.dataset.go); }
  });

  // Notes
  const notesPanel = $("#notesPanel");
  const toggleNotes = force => {
    const show = force ?? notesPanel.hidden;
    notesPanel.hidden = !show;
    $("#notesBtn").setAttribute("aria-pressed", String(show));
  };
  $("#notesBtn").addEventListener("click", () => toggleNotes());

  // Overview
  const overview = $("#overview");
  const toggleOverview = force => {
    const show = force ?? overview.hidden;
    overview.hidden = !show;
    if (show) $("#overviewGrid button[aria-current='true']")?.focus();
  };
  $("#overviewBtn").addEventListener("click", () => toggleOverview(true));
  $("#overviewClose").addEventListener("click", () => toggleOverview(false));

  // Theme
  const applyTheme = t => { if (t) document.documentElement.dataset.theme = t; };
  applyTheme(store.get("tt-theme"));
  $("#themeBtn").addEventListener("click", () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const t = isDark ? "light" : "dark";
    applyTheme(t); store.set("tt-theme", t);
  });

  // Full screen
  $("#fullBtn").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { /* not available here */ }
  });

  // Mobile rail
  const rail = $("#rail");
  const closeRail = () => { rail.classList.remove("open"); $("#menuBtn").setAttribute("aria-expanded", "false"); };
  $("#menuBtn").addEventListener("click", () => {
    const open = !rail.classList.contains("open");
    rail.classList.toggle("open", open);
    $("#menuBtn").setAttribute("aria-expanded", String(open));
  });

  // Keyboard
  document.addEventListener("keydown", e => {
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (!overview.hidden) { if (k === "Escape" || k === "o" || k === "O") toggleOverview(false); return; }
    if (k === "ArrowRight" || k === "PageDown" || (k === " " && !e.target.closest("button, summary, a"))) { e.preventDefault(); next(); }
    else if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); prev(); }
    else if (k === "Home") go(0);
    else if (k === "End") go(slides.length - 1);
    else if (k === "n" || k === "N") toggleNotes();
    else if (k === "o" || k === "O") toggleOverview(true);
    else if (k === "t" || k === "T") $("#themeBtn").click();
    else if (k === "f" || k === "F") $("#fullBtn").click();
    else if (k === "Escape") { toggleNotes(false); closeRail(); }
  });

  // Swipe
  let touch = null;
  $("#stage").addEventListener("touchstart", e => { const t = e.touches[0]; touch = { x: t.clientX, y: t.clientY }; }, { passive: true });
  $("#stage").addEventListener("touchend", e => {
    if (!touch) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    touch = null;
    if (e.target.closest("input, .table-wrap, .shot-frame, pre, .tree")) return;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
  });

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    const i = slides.findIndex(s => s.id === id);
    if (i >= 0 && i !== current) go(i, true);
  });

  /* ================= Glossary ================= */
  const TERMS = [
    ["Bid", "A tender on GeM", "The buyer's request for offers. Every bid has a number such as GEM/2026/B/1234567."],
    ["Bid Document", "System-generated PDF", "GeM's standard summary of the bid: dates, EMD, turnover, experience, evaluation method and documents required."],
    ["ATC", "Additional Terms & Conditions", "Clauses the buyer adds to a bid. Where they conflict with GeM's general terms, the ATC states that it prevails."],
    ["GTC", "General Terms & Conditions", "GeM's standard terms that govern every bid and contract on the marketplace."],
    ["SLA", "Service Level Agreement", "Terms specific to a service category. They override the GTC where the two conflict."],
    ["Corrigendum", "Official amendment", "A change to the bid after publication. The latest corrigendum supersedes earlier versions. Read every one."],
    ["EMD", "Earnest Money Deposit", "Bid security, forfeited if you withdraw after opening. MSE service providers can be exempt."],
    ["ePBG", "e-Performance Bank Guarantee", "Security the winner gives after award, often 3% of contract value."],
    ["QCBS", "Quality & Cost Based Selection", "Technical and price scores combined, commonly 70:30. Prices are opened only for bidders above the technical cut-off."],
    ["L1", "Lowest price", "In L1 bids, the lowest-priced technically compliant bidder wins."],
    ["RA", "Reverse Auction", "An online price-lowering round among qualified bidders, used only if the buyer enables it."],
    ["Two-packet bid", "Technical + financial", "Technical documents are opened and evaluated first. Prices are opened only for those who qualify."],
    ["Representation", "Seller grievance", "An objection to a bid clause, raised from the seller dashboard within 4 days of bid publication."],
    ["MSE / Startup relaxation", "Eligibility relief", "If the bid allows it, MSEs and DPIIT-registered startups are relaxed from turnover and experience, with proof uploaded."],
    ["MII", "Make in India", "Purchase preference for local content. You declare compliance on the upload page."],
    ["Service offering", "Your catalogue listing", "Your listing in a GeM category. You need one in the bid's category to participate."],
    ["UDIN", "Unique Document Identification Number", "The number a CA generates for each certificate. Many RFPs reject CA certificates without it."],
    ["Integrity Pact", "Anti-corruption agreement", "Signed on stamp paper in the buyer's format. Missing or unsigned usually means rejection."],
  ];
  const gl = $("#glossary");
  TERMS.forEach(([t, full, def]) => {
    const b = el("button", { type: "button", class: "term", "aria-expanded": "false" },
      el("b", {}, t), el("span", { class: "full" }, full), el("span", { class: "def", hidden: "" }, def));
    b.addEventListener("click", () => {
      const open = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", String(open));
      $(".def", b).hidden = !open;
    });
    gl.append(b);
  });

  /* ================= Bid listing (sample) ================= */
  const BIDS = [
    { no: "GEM/2026/B/TRN-0421", t: "Hiring of Social Media Agency - Social Media Content development and Management", org: "Bharat Craft & Culture Mission (sample)", end: "17-11-2026", q: "social media digital content" },
    { no: "GEM/2026/B/TRN-0388", t: "Social listening, media monitoring and online reputation management services", org: "A central department (sample)", end: "05-11-2026", q: "monitoring listening orm reputation social media" },
    { no: "GEM/2026/B/TRN-0402", t: "Event or conference management for a national investment summit", org: "A state industrial body (sample)", end: "12-11-2026", q: "event conference summit exhibition" },
    { no: "GEM/2026/B/TRN-0415", t: "Hiring of Consultants - Milestone/Deliverable Based: PR and media consultant", org: "A central PSU (sample)", end: "20-11-2026", q: "consultant pr public relations media" },
    { no: "GEM/2026/B/TRN-0397", t: "Creative agency for audio-visual production and documentary films", org: "A central ministry (sample)", end: "09-11-2026", q: "video film documentary creative audio visual" },
    { no: "GEM/2026/B/TRN-0409", t: "Agency for IEC campaign on public health awareness", org: "A state health mission (sample)", end: "14-11-2026", q: "iec campaign outreach awareness" },
    { no: "GEM/2026/B/TRN-0412", t: "Supply of ergonomic office chairs", org: "A district office (sample)", end: "02-11-2026", q: "chairs furniture" },
  ];
  const CHIPS = ["social media", "monitoring", "event", "consultant", "video", "IEC"];
  const search = $("#bidSearch");
  const chipBox = $("#bidChips");
  CHIPS.forEach(c => chipBox.append(el("button", { type: "button", class: "chip", "aria-pressed": "false", onclick: e => {
    const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
    $$(".chip", chipBox).forEach(x => x.setAttribute("aria-pressed", "false"));
    e.currentTarget.setAttribute("aria-pressed", String(on));
    search.value = on ? c : ""; renderBids();
  } }, c)));
  function renderBids() {
    const q = search.value.trim().toLowerCase();
    const out = $("#bidResults"); out.replaceChildren();
    const hits = BIDS.filter(b => !q || (b.t + " " + b.q).toLowerCase().includes(q));
    if (!hits.length) { out.append(el("p", { class: "small" }, "No bids match. Try a broader keyword.")); return; }
    hits.forEach(b => out.append(el("div", { class: "bidrow" },
      el("span", { class: "no" }, b.no), el("b", {}, b.t),
      el("div", { class: "meta" }, el("span", {}, b.org), el("span", {}, `End date ${b.end}`)))));
  }
  search.addEventListener("input", () => { $$(".chip", chipBox).forEach(x => x.setAttribute("aria-pressed", "false")); renderBids(); });
  renderBids();

  /* ================= Bid document fields ================= */
  const FIELDS = [
    ["Bid End Date/Time", "17-11-2026 15:00:00", "The hard deadline. Check the corrigendum tab, because extensions are common. Our internal deadline is four days earlier."],
    ["Bid Opening Date/Time", "17-11-2026 15:30:00", "Technical bids open here. Nothing can be changed after the end time."],
    ["Bid Offer Validity (From End Date)", "120 (Days)", "Our offer must stay valid this long. Use the same figure in every submission letter."],
    ["Organisation Name", "Bharat Craft & Culture Mission", "Who the buyer is. Check our history with them, any conflict of interest, and what they value."],
    ["Item Category", "Hiring of Social Media Agency - Social Media Content development and Management", "Decides whether we can bid: we need a service offering in exactly this category."],
    ["Contract Period", "2 Year(s)", "Price the whole term. Rates are usually fixed for its full length."],
    ["Minimum Average Annual Turnover (3 Years)", "600 Lakh(s)", "Pass or fail. Confirm which three financial years apply; corrigenda change this."],
    ["Years of Past Experience Required", "5 Year(s)", "Years of providing similar services to government. Contracts are needed for each year."],
    ["Past Experience of Similar Services required", "Yes", "Switches on the 3 × 40%, 2 × 50% or 1 × 80% rule."],
    ["MSE / Startup Relaxation for Experience and Turnover", "No", "If Yes, MSEs and DPIIT startups are relaxed from these criteria, with proof uploaded."],
    ["Document required from seller", "Experience Criteria, Bidder Turnover, Certificate (Requested in ATC), Additional Doc 1–4", "These become the named upload slots on the Upload Documents tab."],
    ["Show documents uploaded by bidders to all bidders?", "Yes", "Other bidders may see what we upload after opening. Upload only what is asked, and nothing confidential beyond it."],
    ["Minimum number of bids required to disable automatic bid extension", "3", "If fewer bids arrive, GeM extends the deadline automatically (here by 5 days, once). Never plan around it."],
    ["Type of Bid", "Two Packet Bid", "Technical packet first, price packet only for those who qualify."],
    ["Time allowed for Technical Clarifications", "5 Days", "Our reply window if the buyer asks questions during evaluation. Someone must watch the dashboard."],
    ["Estimated Bid Value", "30000000", "Guides the EMD and eligibility thresholds. Check the ATC and corrigenda for a price floor based on it."],
    ["Evaluation Method", "QCBS · 70:30 · cut-off 70", "Quality carries 70% of the final score. Technical marks matter more than shaving the price."],
    ["EMD Amount · ePBG", "600000 · 3.00%", "Arrange EMD or confirm exemption early. The ePBG is due only after award."],
    ["Bid to RA enabled", "No", "No reverse auction. The price you submit is final."],
  ];
  const fieldBox = $("#bidFields");
  const explain = $("#fieldExplain");
  FIELDS.forEach(([k, v, x]) => {
    const btn = el("button", { type: "button", "aria-pressed": "false" }, k);
    btn.addEventListener("click", () => {
      $$("button", fieldBox).forEach(b => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      explain.replaceChildren(el("span", { class: "kicker" }, k), el("p", {}, x));
    });
    fieldBox.append(el("div", { class: "bidfield" }, btn, el("span", { class: "val" }, v)));
  });

  /* ================= Prompt library ================= */
  const PROMPTS = [
    ["1 · Bid summary", `You are helping an Indian communications agency bid on a GeM tender. I have uploaded the GeM bid document, the RFP, ATC files, formats and all corrigenda.

Order of authority: latest corrigendum > earlier corrigenda > buyer ATC > RFP and scope of work > GeM bid document defaults and GTC. When documents disagree, say which one wins.

Write a one-page bid summary with:
1. Buyer, bid number, category, contract period, estimated value
2. Key dates: publication, pre-bid, query deadline, representation window (4 days from publication), bid end, opening, validity
3. EMD, ePBG, evaluation method, technical cut-off, QCBS weightage
4. Scope in 8 bullets: platforms, volumes, turnaround times, reports, team, on-site needs
5. The five things most likely to decide who wins

Cite the document and page for every fact, like (RFP p. 14). If something is not stated, write "Not stated".`],
    ["2 · Eligibility extractor", `List every pre-qualification / eligibility criterion as a table with columns:
S.No | Criterion (short) | Exact wording from the bid | Document + page | Evidence we must submit | Format required (letterhead, CA with UDIN, stamp paper, notarised) | Owner team (Documentation, Finance, HR, Account leads, Leadership, Admin)

Then:
- Mark any criterion changed by a corrigendum and show old vs new.
- List MSE / Startup relaxations and EMD exemption conditions exactly as written.
- List criteria that are ambiguous and draft a one-line pre-bid query for each.
Do not paraphrase numbers. Copy them exactly.`],
    ["3 · Scoring matrix", `Extract the full technical evaluation matrix as a table:
Criterion | Sub-criterion | Scoring bands exactly as written | Max marks | Evidence or event that earns it (document, interview, presentation) | Page

Then:
- Group marks into: banked from documents, earned at interview, earned in the presentation.
- State the technical cut-off and whether sectional cut-offs exist.
- Write the QCBS / L1 formula exactly as given.
- List every mandatory element of any sample campaign or case exercise.`],
    ["4 · Document checklist", `Build a master document checklist for this bid as a table:
S.No | Document | Annexure / form number | RFP page | Format and signing (letterhead, signed and stamped every page, stamp paper value, notary, witnesses, UDIN) | Packet (pre-qualification, technical, financial) | Likely GeM upload slot | Owner team

Include documents the RFP requires but does not provide a format for (incorporation certificate, audited financials, work orders, CVs, employee list).
Flag anything that must also be delivered physically.
Flag any annexure numbers that are cited inconsistently.`],
    ["5 · Red flags", `Act as a strict bid reviewer. Find everything in these documents that could get a bid rejected or cost marks:
- Contradictions between documents or within the RFP (dates, annexure numbers, team sizes, GST basis)
- Clauses that may breach GeM rules (for example, mandatory physical documents, EMD from exempt sellers, brand-specific requirements)
- Price rules: GST inclusive or exclusive, price floors, conditional bids, nil quotes
- Penalties: LD rate and cap, PBG, payment cycle, termination
- Hidden costs: dedicated team, on-site days, tools, travel, equipment
For each: what it says, where (document + page), risk level (rejection / marks / commercial), and the action we should take.`],
    ["6 · Corrigendum diff", `Compare Corrigendum [number] with the original RFP and bid document.
For every change, give: Clause | Original text (page) | New text (page) | What we must change in our documents | Which tracker rows are affected.
Also list any dates that moved, and say whether any change helps or hurts our eligibility.`],
    ["7 · Pre-bid queries", `Draft pre-bid queries in the buyer's query format (if one is given, use its columns exactly).
Each query: RFP clause and page | Existing text | Clarification sought | Suggested revision (if any).
Keep each query neutral and specific. Raise at most 10, ordered by impact on our eligibility and score.`],
    ["8 · Representation draft", `Draft a short, polite representation to the buyer for the GeM representation window (within 4 days of publication) about this clause: [paste clause].
Explain how it conflicts with GeM's ATC disclaimer or GTC, cite the clause numbers, and request a specific change. Under 150 words.`],
  ];
  const plist = $("#promptList"), ptext = $("#promptText");
  const showPrompt = i => {
    $$("button", plist).forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
    ptext.textContent = PROMPTS[i][1];
    $("#copyState").textContent = "";
  };
  PROMPTS.forEach(([name], i) => plist.append(el("button", { type: "button", onclick: () => showPrompt(i) }, name)));
  showPrompt(0);
  $("#copyPrompt").addEventListener("click", () => {
    const text = ptext.textContent;
    const selectFallback = () => {
      const r = document.createRange(); r.selectNodeContents(ptext);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      $("#copyState").textContent = "Text selected. Press Ctrl+C or ⌘C to copy.";
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => { $("#copyState").textContent = "Copied to clipboard."; }, selectFallback);
    } else selectFallback();
  });

  /* ================= Eligibility table ================= */
  const PQ = [
    ["Entity registered for at least N years", "Certificate of Incorporation; MoA/AoA or partnership deed", "Documentation", "Count to the date the RFP states, such as 31 March or the bid end date."],
    ["Average annual turnover", "CA or statutory auditor certificate with UDIN, year-wise and average", "Finance", "The exact three financial years, and wording like \"from relevant services\"."],
    ["Positive net worth", "Audited financial statements or CA certificate", "Finance", "Some RFPs also limit erosion, such as not more than 30% over three years."],
    ["Similar work experience", "Work orders plus completion certificates showing value, scope and dates", "Account leads", "Government-only clauses, minimum duration, ongoing-project rules, proof dated after incorporation."],
    ["Manpower on payroll", "Certified employee list signed by the signatory; EPF or ESIC extracts", "HR", "\"Skilled, full-time, in relevant work\": count only who qualifies."],
    ["EMD or bid security", "Payment proof, bank guarantee, exemption certificate or Bid Securing Declaration", "Finance", "Beneficiary name, validity period and any physical original."],
    ["Not blacklisted", "Declaration on letterhead in the buyer's format", "Documentation", "Some formats cover sister concerns too."],
    ["Integrity Pact", "Signed pact on stamp paper of the stated value, with witnesses", "Documentation", "Stamp paper value; some bids ask for a hard copy as well."],
    ["GST and PAN", "Self-attested copies", "Finance", "Name must match the bidding entity exactly."],
    ["Land border restriction (GFR 144(xi))", "Declaration on letterhead", "Documentation", "Annexure numbers for this one are often cited wrongly."],
    ["Authorised signatory", "Power of Attorney on stamp paper, notarised, or a board resolution", "Leadership", "The same person signs every page and e-signs on GeM."],
    ["Local office", "Lease, rent agreement or ownership proof", "Admin", "Some RFPs require the lease to pre-date a cut-off."],
  ];
  const PQ_TEAMS = ["All", "Documentation", "Finance", "HR", "Account leads", "Leadership", "Admin"];
  const pqBody = $("#pqTable tbody");
  PQ.forEach(([c, e, o, w]) => pqBody.append(el("tr", { "data-team": o }, el("td", {}, el("b", {}, c)), el("td", {}, e), el("td", {}, el("span", { class: "pill" }, o)), el("td", { class: "small" }, w))));
  const pqTeamBox = $("#pqTeams");
  PQ_TEAMS.forEach((t, i) => pqTeamBox.append(el("button", { type: "button", class: "chip", "aria-pressed": String(i === 0), onclick: e => {
    $$(".chip", pqTeamBox).forEach(x => x.setAttribute("aria-pressed", "false"));
    e.currentTarget.setAttribute("aria-pressed", "true");
    $$("tr", pqBody).forEach(r => r.classList.toggle("is-dim", t !== "All" && r.dataset.team !== t));
  } }, t)));

  /* ================= Experience calculator ================= */
  function renderExp() {
    const est = parseFloat($("#expEstimate").value);
    const vals = $("#expProjects").value.split(/[,;\s]+/).map(Number).filter(v => Number.isFinite(v) && v > 0).sort((a, b) => b - a);
    const out = $("#expOut"); out.replaceChildren();
    if (!(est > 0)) { out.append(el("p", { class: "small" }, "Enter the estimated bid value.")); return; }
    const opts = [["A", 3, 0.4], ["B", 2, 0.5], ["C", 1, 0.8]];
    let pass = false;
    opts.forEach(([name, n, share]) => {
      const need = est * share;
      const have = vals.filter(v => v >= need).length;
      const ok = have >= n;
      pass ||= ok;
      out.append(el("div", { style: "display:flex;justify-content:space-between;gap:.5rem;align-items:center;flex-wrap:wrap" },
        el("span", {}, `Option ${name}: ${n} × ₹${fmt(need)} cr or more · you have ${have}`),
        el("span", { class: `pill ${ok ? "ok" : "bad"}` }, ok ? "Meets" : "Short")));
    });
    out.append(el("p", { class: "result", style: `color:var(${pass ? "--ok" : "--bad"})` }, pass ? "Eligible on experience" : "Not eligible on experience"));
  }
  $("#expEstimate").addEventListener("input", renderExp);
  $("#expProjects").addEventListener("input", renderExp);
  renderExp();

  /* ================= Bid / no-bid ================= */
  const GATES = [
    "Meets every pre-qualification criterion on paper, after corrigenda",
    "Holds a GeM service offering in the bid category",
    "Every mandatory document obtainable before the internal deadline",
    "Commercial terms we can live with (LD, PBG, payment cycle, price floor)",
  ];
  const FACTORS = [
    ["Technical score potential", 25, 4],
    ["Strategic value of the client", 20, 5],
    ["Fit with work we can prove", 15, 4],
    ["Competition (5 = light)", 10, 3],
    ["Team available for interview and delivery", 15, 3],
    ["Time and effort against the deadline", 15, 3],
  ];
  const gatesBox = $("#gates"), factorsBox = $("#factors");
  GATES.forEach((g, i) => gatesBox.append(el("label", { style: "display:flex;gap:.55rem;align-items:flex-start;font-size:.92rem" },
    el("input", { type: "checkbox", id: `gate${i}`, checked: "" }), el("span", {}, g))));
  FACTORS.forEach(([f, w, v], i) => factorsBox.append(el("label", { class: "field", for: `fac${i}` },
    el("span", { style: "display:flex;justify-content:space-between;gap:.5rem" }, el("span", {}, `${f} · ${w}%`), el("b", { id: `facv${i}`, class: "tabular" }, String(v))),
    el("input", { type: "range", id: `fac${i}`, min: "1", max: "5", step: "1", value: String(v) }))));
  function renderDecision() {
    const gatesOk = GATES.every((_, i) => $(`#gate${i}`).checked);
    let score = 0;
    FACTORS.forEach(([, w], i) => { const v = Number($(`#fac${i}`).value); $(`#facv${i}`).textContent = String(v); score += w * v / 5; });
    let verdict, tone, why;
    if (!gatesOk) { verdict = "No-bid"; tone = "--bad"; why = "A gate failed. No score can make up for it."; }
    else if (score >= 70) { verdict = "Bid"; tone = "--ok"; why = "Gates pass and the weighted score is strong. Assign owners today."; }
    else if (score >= 55) { verdict = "Bid with conditions"; tone = "--warn"; why = "Bid only if the weakest factors can be fixed this week. Name who fixes them."; }
    else { verdict = "No-bid"; tone = "--bad"; why = "Eligible, but the odds do not justify the effort. Record why and move on."; }
    const box = $("#decisionOut");
    box.replaceChildren(el("span", { class: "kicker" }, "Recommendation"),
      el("p", { class: "result", style: `color:var(${tone})` }, verdict),
      el("p", { class: "tabular" }, `Weighted score ${Math.round(score)} of 100`),
      el("div", { class: "meter" }, el("i", { style: `width:${score}%` })),
      el("p", {}, why));
  }
  $$("#gates input, #factors input").forEach(i => i.addEventListener("input", renderDecision));
  renderDecision();

  /* ================= QCBS ================= */
  const BIDDERS = [["A", 88, 3.05], ["B", 76, 2.70], ["C", 72, 2.60], ["D", 66, 2.40]];
  const qBody = $("#qcbsTable tbody");
  BIDDERS.forEach(([n, t, p], i) => qBody.append(el("tr", { id: `qrow${i}` },
    el("td", {}, el("b", {}, `Bidder ${n}`)),
    el("td", { class: "num" }, el("input", { type: "number", id: `qt${i}`, value: String(t), min: "0", max: "100", style: "width:5.5rem", "aria-label": `Bidder ${n} technical score` })),
    el("td", { class: "num" }, el("input", { type: "number", id: `qp${i}`, value: String(p), min: "0", step: "0.05", style: "width:6rem", "aria-label": `Bidder ${n} price` })),
    el("td", { class: "num tabular", id: `qtp${i}` }), el("td", { class: "num tabular", id: `qpp${i}` }), el("td", { class: "num tabular", id: `qf${i}` }))));
  function renderQcbs() {
    const cut = Number($("#qcbsCut").value) || 0;
    const wt = Math.min(100, Math.max(0, Number($("#qcbsWeight").value) || 0)) / 100;
    const rows = BIDDERS.map((b, i) => ({ n: b[0], i, t: Number($(`#qt${i}`).value), p: Number($(`#qp${i}`).value) }));
    const q = rows.filter(r => r.t >= cut && r.p > 0);
    const tHigh = Math.max(...q.map(r => r.t)), pMin = Math.min(...q.map(r => r.p));
    rows.forEach(r => {
      const ok = q.includes(r);
      r.tp = ok ? 100 * wt * r.t / tHigh : NaN;
      r.pp = ok ? 100 * (1 - wt) * pMin / r.p : NaN;
      r.f = r.tp + r.pp;
      $(`#qtp${r.i}`).textContent = ok ? fmt(r.tp) : "below cut-off";
      $(`#qpp${r.i}`).textContent = ok ? fmt(r.pp) : "not opened";
      $(`#qf${r.i}`).textContent = ok ? fmt(r.f) : "–";
    });
    const ranked = q.slice().sort((a, b) => b.f - a.f);
    rows.forEach(r => $(`#qrow${r.i}`).classList.toggle("is-hit", ranked[0] === r));
    rows.forEach(r => $(`#qrow${r.i}`).classList.toggle("is-dim", !q.includes(r)));
    const out = $("#qcbsOut"); out.replaceChildren();
    if (!ranked.length) { out.append(el("p", {}, "No bidder clears the cut-off.")); return; }
    const w = ranked[0];
    const premium = (w.p / pMin - 1) * 100;
    out.append(el("span", { class: "kicker" }, "Winner"), el("p", { class: "result" }, `Bidder ${w.n} · ${fmt(w.f)}`),
      el("p", {}, premium > 0.5 ? `Bidder ${w.n} is ${fmt(premium, 0)}% more expensive than the cheapest qualified bid and still wins.` : `Bidder ${w.n} is also the cheapest qualified bid.`));
  }
  $$("#qcbsTable input, #qcbsCut, #qcbsWeight").forEach(i => i.addEventListener("input", renderQcbs));
  renderQcbs();

  /* ================= Scoring matrix ================= */
  const MATRIX = [
    ["A1 · Similar government projects (₹50 lakh+, 5 yrs)", "3 = 4 · 5 = 7 · 7+ = 10", 10, 7, "Banked"],
    ["A2 · Average turnover", "₹6–10 cr = 4 · ₹10–20 cr = 7 · ₹20 cr+ = 10", 10, 4, "Banked"],
    ["A3 · Case studies with measurable outcomes", "5 each, max 2", 10, 10, "Banked"],
    ["B · Team interview (6 key roles)", "Per role, by experience and interview", 25, 23, "Interview"],
    ["C1 · Understanding of the buyer and craft sector", "Committee judgement", 10, 8, "Room"],
    ["C2 · Approach, content calendar, governance", "Committee judgement", 15, 12, "Room"],
    ["C3 · Sample campaign \"Haath Se\"", "All 5 mandatory elements, quality", 15, 11, "Room"],
    ["C4 · Innovation, including AI tools", "Committee judgement", 5, 4, "Room"],
  ];
  const mBody = $("#matrixTable tbody");
  MATRIX.forEach(([c, how, max, ours, kind], i) => mBody.append(el("tr", {},
    el("td", {}, el("b", {}, c), el("br"), el("span", { class: "pill" }, kind)),
    el("td", { class: "small" }, how), el("td", { class: "num" }, String(max)),
    el("td", { class: "num" }, el("input", { type: "number", id: `mx${i}`, value: String(ours), min: "0", max: String(max), style: "width:4.6rem", "aria-label": `Our marks for ${c}` })))));
  function renderMatrix() {
    const by = { Banked: 0, Interview: 0, Room: 0 }, maxBy = { Banked: 0, Interview: 0, Room: 0 };
    let total = 0;
    MATRIX.forEach(([, , max, , kind], i) => {
      const inp = $(`#mx${i}`);
      const v = Math.min(max, Math.max(0, Number(inp.value) || 0));
      by[kind] += v; maxBy[kind] += max; total += v;
    });
    const pass = total >= 70;
    const out = $("#matrixOut"); out.replaceChildren(
      el("span", { class: "kicker" }, "Expected technical score"),
      el("p", { class: "result", style: `color:var(${pass ? "--ok" : "--bad"})` }, `${total} of 100 · ${pass ? "clears" : "below"} the cut-off of 70`),
      el("div", { class: "meter" }, el("i", { style: `width:${total}%` }), el("span", { class: "cut", style: "left:70%" })),
      el("p", { class: "small tabular" }, `Banked ${by.Banked}/${maxBy.Banked} · Interview ${by.Interview}/${maxBy.Interview} · Room ${by.Room}/${maxBy.Room}`));
  }
  $$("#matrixTable input").forEach(i => i.addEventListener("input", renderMatrix));
  renderMatrix();

  /* ================= RACI ================= */
  const RACI = {
    "Bid manager": ["Owns the bid from triage to result. Runs the tracker, the daily stand-up and the final review. Single point of contact with the buyer.", ["Bid summary and master tracker", "Pre-bid queries and representations", "Final compilation, upload and submission on GeM", "Watching the dashboard for clarifications"]],
    "Documentation": ["Drafts every annexure in the buyer's format, assembles files, numbers pages, keeps names consistent.", ["Submission letters, bidder profile, declarations", "Integrity Pact and other stamp paper documents", "Index pages, merging, compression", "Signed and stamped copies of the RFP and corrigenda, if asked"]],
    "Finance": ["Everything with a number, and the CA relationship.", ["CA certificates with UDIN for turnover and net worth", "Audited financial statements, PAN, GST", "EMD, exemption proof or Bid Securing Declaration", "Price, price break-up and financial submission letter"]],
    "HR": ["Builds the proposed team and gets them ready for interview day. Often worth 20 to 25 marks.", ["CVs in the prescribed format, signed and countersigned", "Certified employee list, EPF and ESIC extracts", "Availability undertakings", "Interview preparation for every proposed member"]],
    "Strategy & Creative": ["Writes what wins the room: understanding, approach and the sample campaign.", ["Technical proposal and methodology", "Case studies with measurable outcomes and no fees", "Sample campaign and creatives", "Presentation deck and rehearsal"]],
    "Account leads": ["Own the proof of our past work.", ["Work orders and completion certificates", "Client satisfaction letters", "Project facts for the experience forms", "Sample work from live accounts, cleared for use"]],
    "Leadership": ["Decides bid or no-bid, approves the price and signs.", ["Bid or no-bid decision", "Price approval", "Power of Attorney or board resolution", "e-sign on GeM as authorised signatory"]],
    "Admin": ["Physical logistics.", ["Stamp paper, notary and witnesses", "Couriers and hand delivery when a bid asks for originals", "Office lease proof", "Presentation-day travel and attendance"]],
  };
  const raciBox = $("#raciTeams");
  const showRaci = name => {
    $$(".chip", raciBox).forEach(c => c.setAttribute("aria-pressed", String(c.textContent === name)));
    const [role, docs] = RACI[name];
    $("#raciRole").replaceChildren(el("span", { class: "kicker" }, name), el("p", { style: "font-size:1.05rem" }, role));
    $("#raciDocs").replaceChildren(...docs.map(d => el("li", {}, d)));
  };
  Object.keys(RACI).forEach(n => raciBox.append(el("button", { type: "button", class: "chip", "aria-pressed": "false", onclick: () => showRaci(n) }, n)));
  showRaci("Bid manager");

  /* ================= Timeline ================= */
  const STEPS = [
    [-21, "Bid found, logged and triaged in five minutes"],
    [-20, "Claude summary, eligibility check, bid or no-bid meeting", true],
    [-19, "CA and client certificate requests sent; tracker live with owners"],
    [-18, "Representation (within 4 days of publication) and pre-bid queries"],
    [-14, "Annexure drafts done; proposed team frozen"],
    [-10, "Technical proposal first draft; case studies chosen"],
    [-7, "Leadership review; price approved"],
    [-5, "Stamp paper documents signed and notarised"],
    [-4, "Internal deadline: every document final, signed and merged", true],
    [-3, "Compress, check limits, upload to GeM, save each tab"],
    [-2, "Verify, e-sign and submit; download the receipt", true],
    [-1, "Buffer for corrigenda and portal trouble"],
    [0, "GeM bid end date", true],
  ];
  function renderTimeline() {
    const v = $("#deadline").value;
    const base = v ? new Date(`${v}T12:00:00`) : null;
    const list = $("#timelineList"); list.replaceChildren();
    STEPS.forEach(([off, label, key]) => {
      let dateText = "";
      let sunday = false;
      if (base && !Number.isNaN(base.getTime())) {
        const d = new Date(base); d.setDate(d.getDate() + off);
        sunday = d.getDay() === 0;
        dateText = d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
      }
      list.append(el("li", { class: key ? "key" : "" },
        el("span", { class: "t" }, off === 0 ? "T-0" : `T${off}`),
        el("span", { class: `d${sunday ? " sun" : ""}` }, sunday ? `${dateText} · Sunday` : dateText),
        el("span", {}, label)));
    });
  }
  $("#deadline").addEventListener("input", renderTimeline);
  renderTimeline();

  /* ================= Participation stepper ================= */
  const TABS = [
    ["Catalogue Offering", "Select the service offering that matches the bid category, or create one. GeM ties your participation to it.", "No offering in the category means no bid. Sort this out in week one, not in the final hour."],
    ["Offer Price", "Enter the price in the format the bid asks for (total value, monthly or per unit). Upload the price break-up file where asked.", "Follow the GST basis in the latest corrigendum. The price must match the break-up file and financial letter to the rupee, and respect any price floor."],
    ["Upload Documents", "One PDF per slot: experience, turnover, ATC certificate, Additional Doc 1 to 4, then the buyer's own slots. Choose the GSTIN for transaction charges and answer the MII and EMD exemption questions.", "Each standard slot takes up to 10 MB and 100 pages. The GSTIN choice cannot be changed later."],
    ["EMD / ePBG", "Enter EMD payment details, or the exemption basis, exactly as the bid requires.", "Beneficiary, amount and validity as stated. If you claim exemption, the proof must already be uploaded."],
    ["Verify Bid Participation", "Review the summary of everything entered, accept the terms, e-sign and submit. Download the confirmation.", "The authorised person e-signs. Finish by T-2; never leave e-sign to the last hour."],
  ];
  const stepper = $("#stepper");
  const showStep = i => {
    $$("button", stepper).forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
    $("#stepWhat").replaceChildren(el("span", { class: "kicker" }, `Tab ${i + 1} · What you do`), el("h3", {}, TABS[i][0]), el("p", {}, TABS[i][1]));
    $("#stepWatch").replaceChildren(el("span", { class: "kicker" }, "Watch out"), el("p", {}, TABS[i][2]));
  };
  TABS.forEach(([name], i) => stepper.append(el("button", { type: "button", onclick: () => showStep(i) }, el("span", { class: "no" }, `Tab ${i + 1}`), el("b", {}, name))));
  showStep(0);

  /* ================= File checker ================= */
  const FILES = [
    ["Experience_WorkOrders_Completion.pdf", 8.6, 74],
    ["Bidder_Turnover_CA_Certificate.pdf", 1.2, 6],
    ["ATC_Pack_Declarations_IntegrityPact.pdf", 24, 180],
    ["CVs_10_Members.pdf", 6.5, 30],
    ["Technical_Proposal.pdf", 14.8, 62],
  ];
  const fBody = $("#fileTable tbody");
  let fileSeq = 0;
  const addFileRow = (name, mb, pages) => {
    const i = fileSeq++;
    fBody.append(el("tr", {},
      el("td", {}, el("input", { type: "text", id: `fn${i}`, value: name, "aria-label": "File name" })),
      el("td", { class: "num" }, el("input", { type: "number", id: `fm${i}`, value: String(mb), min: "0", step: "0.1", style: "width:5.5rem", "aria-label": "Size in MB" })),
      el("td", { class: "num" }, el("input", { type: "number", id: `fp${i}`, value: String(pages), min: "0", step: "1", style: "width:5rem", "aria-label": "Pages" })),
      el("td", { id: `fr${i}`, class: "small" })));
    $$(`#fm${i}, #fp${i}`).forEach(x => x.addEventListener("input", renderFiles));
  };
  function renderFiles() {
    for (let i = 0; i < fileSeq; i++) {
      const mb = Number($(`#fm${i}`).value), pages = Number($(`#fp${i}`).value);
      const cell = $(`#fr${i}`);
      const issues = [];
      if (!(mb > 0) || !(pages > 0)) { cell.replaceChildren(el("span", { class: "pill" }, "Enter size and pages")); continue; }
      if (pages > 100) issues.push(`Split into ${Math.ceil(pages / 100)} files of 100 pages or fewer`);
      if (mb > 10) issues.push(mb <= 20 ? "Compress to under 10 MB, or split" : `Compress and split into at least ${Math.ceil(mb / 10)} files`);
      cell.replaceChildren(issues.length
        ? el("span", {}, el("span", { class: "pill bad" }, "Will not upload"), el("br"), issues.join(". ") + ".")
        : el("span", { class: "pill ok" }, mb > 8.5 ? "Fits, close to the limit" : "Fits"));
    }
  }
  FILES.forEach(f => addFileRow(...f));
  $("#addFile").addEventListener("click", () => { addFileRow(`New_file_${fileSeq + 1}.pdf`, 2, 10); renderFiles(); });
  renderFiles();

  /* ================= Quiz ================= */
  const QUIZ = [
    ["What is the size limit per standard upload slot on GeM?", ["5 MB", "10 MB", "25 MB"], 1, "Each standard slot takes one PDF of up to 10 MB and 100 pages."],
    ["The RFP says one thing and Corrigendum 2 says another. Which do you follow?", ["The RFP", "Corrigendum 2", "Ask the buyer and wait"], 1, "The latest corrigendum supersedes earlier versions."],
    ["A buyer ATC clause conflicts with GeM's general terms. Which prevails?", ["The ATC", "The GTC", "Neither applies"], 0, "The ATC states that it prevails, but it must stay within GeM's own rules, or you can raise a representation."],
    ["How long do you have to raise a representation against a bid clause?", ["4 days from publication", "7 days before the deadline", "Until bid opening"], 0, "The window is 4 days from bid publication, from the seller dashboard."],
    ["Where may prices appear?", ["In case studies, if relevant", "Only in Offer Price and the price break-up file", "Anywhere, if marked confidential"], 1, "Any financial information in the technical bid can mean outright rejection."],
    ["QCBS 70:30. A scores 90 (highest) at ₹3.0 cr. B scores 75 at ₹2.6 cr (lowest). Who wins?", ["A, about 96 against 88", "B, it is cheaper", "A tie"], 0, "A: 70 + 30 × 2.6/3.0 = 96. B: 70 × 75/90 + 30 = 88.3."],
    ["You are an MSE service provider. Can a buyer's ATC force you to pay EMD anyway?", ["Yes, ATC prevails", "No, GeM's disclaimer forbids it", "Only above ₹1 crore"], 1, "Seeking EMD from exempt sellers through ATC is listed in GeM's disclaimer as not allowed."],
    ["The bid needs 3 bids to stop automatic extension, and only 2 arrive. What happens?", ["Bid is cancelled", "Deadline is extended automatically", "Both bids are opened"], 1, "GeM extends the deadline by the days the buyer set, for the set number of times."],
    ["What can happen if you make a false MSE or EMD exemption declaration?", ["A warning email", "Disablement on GeM", "Nothing if you win"], 1, "The upload page warns that the seller can be disabled on GeM without further notice."],
  ];
  const qList = $("#quizList");
  const answered = new Map();
  const renderScore = () => { const s = [...answered.values()].filter(Boolean).length; $("#quizScore").textContent = `Score: ${s} of ${QUIZ.length}`; };
  function buildQuiz() {
    qList.replaceChildren(); answered.clear();
    QUIZ.forEach(([q, opts, right, why], qi) => {
      const whyEl = el("p", { class: "why", hidden: "" }, why);
      const optBox = el("div", { class: "opts" });
      opts.forEach((o, oi) => optBox.append(el("button", { type: "button", onclick: e => {
        if (answered.has(qi)) return;
        answered.set(qi, oi === right);
        $$("button", optBox).forEach((b, bi) => { if (bi === right) b.classList.add("right"); });
        if (oi !== right) e.currentTarget.classList.add("wrong");
        whyEl.hidden = false; renderScore();
      } }, o)));
      qList.append(el("div", { class: "qcard" }, el("b", {}, `${qi + 1}. ${q}`), optBox, whyEl));
    });
    renderScore();
  }
  $("#quizReset").addEventListener("click", buildQuiz);
  buildQuiz();

  /* ================= Start ================= */
  const startId = location.hash.slice(1);
  const startIdx = Math.max(0, slides.findIndex(s => s.id === startId));
  current = startIdx;
  go(startIdx, true);
})();
