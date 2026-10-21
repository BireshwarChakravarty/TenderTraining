/* gemsim: a practice run of the five GeM participation tabs for the practice tender.
   It is a teaching simulator, not a copy of the portal. Rules it enforces come from the
   practice tender: price floor, GST basis, 10 MB / 100 page slots, team size, EMD, declarations.

   data: {
     bid, bidder, category,
     offerings: [{ label, id, ok, why }],          one with ok: true
     floor, emd,                                    rupees
     gstins: ["…"],
     slots: [{ name, required, std, want }],        std: 10 MB / 100 pages applies; want: file kind expected
     files: [{ name, mb, pages, kind, must }]       kind: experience | turnover | atc | add | proposal | poa |
   }                                                price | stale (old CVs) | big (too large); must: required upload */
(() => {
  "use strict";
  const { $, el, inr } = TT;

  TT.register("gemsim", (root, data) => {
    const json = root.querySelector('script[type="application/json"]');
    const TABS = ["Catalogue Offering", "Offer Price", "Upload Documents", "EMD / ePBG", "Verify Bid Participation"];
    let s;
    const fresh = () => ({ tab: 0, done: TABS.map(() => false), offering: null, price: "", gst: false, breakup: "", slots: {}, gstin: "", mii: "", emdEx: "", emdAmt: "", emdMode: "", emdRef: "", checked: false, otp: false, submitted: null });
    s = fresh();

    const fileBy = name => data.files.find(f => f.name === name);
    const nav = el("ol", { class: "sim-nav" });
    const panel = el("div", { class: "sim-panel" });
    const alertBox = el("div", { class: "sim-alert", role: "alert", hidden: true });
    const head = el("div", { class: "sim-head" },
      el("span", { class: "typed", text: `Bid Participation · ${data.bid}` }),
      el("span", { class: "sim-tag", text: "Practice simulator · not the GeM portal" }));
    root.replaceChildren(json, head, el("div", { class: "sim-body" }, nav, el("div", { class: "stack" }, alertBox, panel)));

    const alert = (msgs, tone = "bad") => {
      if (!msgs.length) { alertBox.hidden = true; return; }
      if (tone === "bad") TT.fx?.bad(alertBox);
      alertBox.hidden = false; alertBox.className = `sim-alert ${tone}`;
      alertBox.replaceChildren(el("ul", {}, msgs.map(m => el("li", { text: m }))));
    };
    const saveBtn = (label, fn) => el("button", { type: "button", class: "btn ink", text: label, onclick: fn });
    const go = i => { s.tab = i; alert([]); draw(); };
    const complete = i => { s.done[i] = true; alert([]); TT.fx?.good(nav.children[i]); go(Math.min(i + 1, TABS.length - 1)); };

    const slotIssues = (slot, f) => {
      if (!f) return [];
      const out = [];
      if (f.kind === "price") out.push("Price break-up in a technical slot. Any price in the technical bid means outright rejection.");
      if (f.mb > 10) out.push(`${f.mb} MB is over the 10 MB limit. GeM will not accept it.`);
      if (slot.std && f.pages > 100) out.push(`${f.pages} pages is over the 100-page limit for this slot.`);
      if (f.kind === "stale") out.push("This file has 12 CVs. Corrigendum 1 cut the team to 10.");
      if (slot.want && f.kind !== slot.want && f.kind !== "price" && f.kind !== "stale" && f.kind !== "big") out.push(`This file does not belong in "${slot.name}".`);
      return out;
    };

    const tabs = [
      () => {
        const list = el("div", { class: "stack" });
        data.offerings.forEach((o, i) => list.append(el("label", { class: "check sim-choice" },
          el("input", { type: "radio", name: "sim-off", checked: s.offering === i, onchange: () => { s.offering = i; } }),
          el("span", {}, el("b", { text: o.label }), el("br"), el("span", { class: "small muted", text: o.id })))));
        return [el("h3", { text: "Select the service offering for this bid" }),
          el("p", { class: "small muted", text: `Bid category: ${data.category}` }), list,
          saveBtn("Save and continue", () => {
            if (s.offering == null) return alert(["Select an offering."]);
            const o = data.offerings[s.offering];
            if (!o.ok) return alert([o.why]);
            complete(0);
          })];
      },
      () => {
        const price = el("input", { type: "number", class: "typed", min: "0", step: "1000", value: s.price, placeholder: "e.g. 28000000", "aria-label": "Total offer price in rupees", oninput: e => { s.price = e.target.value; words.textContent = s.price ? inr(Number(s.price)) : ""; } });
        const words = el("span", { class: "typed muted", text: s.price ? inr(Number(s.price)) : "" });
        const gst = el("input", { type: "checkbox", checked: s.gst, onchange: e => { s.gst = e.target.checked; } });
        const breakup = el("select", { "aria-label": "Price break-up file", onchange: e => { s.breakup = e.target.value; } },
          el("option", { value: "", text: "Choose a file…" }), data.files.map(f => el("option", { value: f.name, selected: s.breakup === f.name, text: f.name })));
        return [el("h3", { text: "Offer price for 24 months" }),
          el("label", { class: "field" }, el("span", { text: "Total price (₹)" }), price, words),
          el("label", { class: "check" }, gst, el("span", { text: "This price includes GST" })),
          el("label", { class: "field" }, el("span", { text: "Financial document indicating price break-up *" }), breakup),
          saveBtn("Save and continue", () => {
            const errs = [], p = Number(s.price);
            if (!(p > 0)) errs.push("Enter the total price.");
            else if (p < data.floor) errs.push(`${inr(p)} is more than 15% below the estimated bid value. Corrigendum 1 makes this bid non-responsive. The floor is ${inr(data.floor)}.`);
            if (s.gst) errs.push("Corrigendum 1 changed the quote to exclusive of GST.");
            const f = fileBy(s.breakup);
            if (!f) errs.push("Upload the price break-up file.");
            else if (f.kind !== "price") errs.push(`"${f.name}" is not the price break-up. Only Annexure XI goes here.`);
            if (errs.length) return alert(errs);
            complete(1);
          })];
      },
      () => {
        const rows = data.slots.map(slot => {
          const meta = el("span", { class: "small" });
          const sel = el("select", { "aria-label": slot.name }, el("option", { value: "", text: "Upload File…" }),
            data.files.map(f => el("option", { value: f.name, selected: s.slots[slot.name] === f.name, text: f.name })));
          const paint = () => {
            const f = fileBy(sel.value);
            const issues = slotIssues(slot, f);
            meta.className = `small ${issues.length ? "sim-err" : "muted"}`;
            meta.textContent = f ? (issues[0] || `${f.mb} MB · ${f.pages} pages`) : slot.std ? ".pdf · 10 MB · 100 pages" : ".pdf";
          };
          sel.addEventListener("change", () => { s.slots[slot.name] = sel.value; paint(); });
          paint();
          return el("div", { class: "sim-slot" }, el("span", {}, slot.name, slot.required ? el("span", { class: "req", text: " *" }) : ""), el("div", { class: "stack tight" }, sel, meta));
        });
        const radio = (name, key, opts) => el("span", { class: "opts" }, opts.map(o => el("label", { class: "check" },
          el("input", { type: "radio", name, checked: s[key] === o, onchange: () => { s[key] = o; } }), el("span", { text: o }))));
        const gstin = el("select", { "aria-label": "GSTIN for transaction charges", onchange: e => { s.gstin = e.target.value; } },
          el("option", { value: "", text: "Please Select" }), data.gstins.map(g => el("option", { value: g, selected: s.gstin === g, text: g })));
        return [el("h3", { text: "Upload Documents" }), el("div", { class: "sim-slots" }, rows),
          el("hr", { class: "divider" }),
          el("label", { class: "field" }, el("span", { text: "GSTIN for transaction charges * (cannot be changed later)" }), gstin),
          el("div", { class: "sim-q" }, el("span", { text: "Do you comply with Public Procurement (Preference to MII) Order 2017?" }), radio("sim-mii", "mii", ["Yes", "No"])),
          el("div", { class: "sim-q" }, el("span", { text: "Do you want to request for EMD Exemption? *" }), radio("sim-emd", "emdEx", ["Yes", "No"])),
          saveBtn("Save", () => {
            const errs = [];
            const used = {};
            data.slots.forEach(slot => {
              const f = fileBy(s.slots[slot.name]);
              if (slot.required && !f) errs.push(`"${slot.name}" is mandatory.`);
              slotIssues(slot, f).forEach(m => errs.push(`${slot.name}: ${m}`));
              if (f) { if (used[f.name]) errs.push(`"${f.name}" is uploaded in two slots.`); used[f.name] = true; }
            });
            const need = data.files.filter(f => f.must).filter(f => !used[f.name]);
            need.forEach(f => errs.push(`"${f.name}" is required by the RFP but not uploaded.`));
            if (!s.gstin) errs.push("Select the GSTIN for transaction charges.");
            if (!s.mii) errs.push("Answer the Make in India question.");
            if (!s.emdEx) errs.push("Answer the EMD exemption question.");
            else if (s.emdEx === "Yes") errs.push("Northstar is not an MSE. A false EMD exemption claim can get the seller disabled on GeM.");
            if (errs.length) return alert(errs);
            complete(2);
          })];
      },
      () => {
        const amt = el("input", { type: "number", class: "typed", value: s.emdAmt, "aria-label": "EMD amount", oninput: e => { s.emdAmt = e.target.value; } });
        const mode = el("select", { "aria-label": "EMD mode", onchange: e => { s.emdMode = e.target.value; } }, el("option", { value: "", text: "Select…" }),
          ["Bank Guarantee", "Online transfer", "Fixed Deposit Receipt", "Insurance Surety Bond"].map(m => el("option", { value: m, selected: s.emdMode === m, text: m })));
        const ref = el("input", { type: "text", class: "typed", value: s.emdRef, placeholder: "UTR or BG number", "aria-label": "Reference number", oninput: e => { s.emdRef = e.target.value; } });
        return [el("h3", { text: "EMD details" }), el("p", { class: "small muted", text: `Beneficiary as stated in the bid document. Advisory bank as per bid.` }),
          el("label", { class: "field" }, el("span", { text: "EMD amount (₹) *" }), amt),
          el("label", { class: "field" }, el("span", { text: "Mode *" }), mode),
          el("label", { class: "field" }, el("span", { text: "Reference number *" }), ref),
          saveBtn("Save and continue", () => {
            const errs = [];
            if (Number(s.emdAmt) !== data.emd) errs.push(`The bid asks for an EMD of ${inr(data.emd)}.`);
            if (!s.emdMode) errs.push("Select how the EMD was paid.");
            if (!s.emdRef.trim()) errs.push("Enter the payment or guarantee reference.");
            if (errs.length) return alert(errs);
            complete(3);
          })];
      },
      () => {
        if (s.submitted) {
          return [el("div", { class: "receipt" },
            el("span", { class: "stamp green thump", text: "Submitted" }),
            el("h3", { text: "Bid participation successful" }),
            el("dl", { class: "typed" },
              el("dt", { text: "Bid" }), el("dd", { text: data.bid }),
              el("dt", { text: "Seller" }), el("dd", { text: data.bidder }),
              el("dt", { text: "Submitted" }), el("dd", { text: s.submitted.when }),
              el("dt", { text: "Acknowledgement" }), el("dd", { text: s.submitted.ack })),
            el("p", { class: "hand", text: "Now: download the receipt, screenshot every tab, and watch the dashboard for clarifications." }),
            el("button", { type: "button", class: "btn", text: "Run it again", onclick: () => { s = fresh(); alert([]); draw(); } }))];
        }
        const list = el("ul", { class: "sim-verify" }, TABS.slice(0, 4).map((t, i) => el("li", {}, el("span", { class: `pill ${s.done[i] ? "ok" : "bad"}`, text: s.done[i] ? "Saved" : "Pending" }), " ", t)));
        const opened = el("label", { class: "check" }, el("input", { type: "checkbox", checked: s.checked, onchange: e => { s.checked = e.target.checked; } }), el("span", { text: "I opened every uploaded file from the portal and checked it is the final version." }));
        const otpWrap = el("div", { class: "stack", hidden: !s.otp });
        const otp = el("input", { type: "text", class: "typed otp", inputmode: "numeric", maxlength: "6", placeholder: "6-digit OTP", "aria-label": "One-time password" });
        otpWrap.append(el("p", { class: "small muted", text: "An OTP has been sent to the authorised signatory's Aadhaar-linked mobile. (Practice: type any six digits.)" }), otp,
          saveBtn("Submit bid", () => {
            if (!/^\d{6}$/.test(otp.value)) return alert(["Enter the six-digit OTP."]);
            const d = new Date();
            s.submitted = { when: d.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }), ack: `TRN-${String(d.getTime()).slice(-8)}` };
            s.done[4] = true; alert([]); draw();
            TT.fx?.stamp(); setTimeout(() => TT.fx?.win($(".receipt .stamp", root)), 200);
          }));
        return [el("h3", { text: "Verify and submit" }), list, opened,
          el("button", { type: "button", class: "btn ink", hidden: s.otp, text: "e-Sign and submit", onclick: () => {
            const errs = [];
            TABS.slice(0, 4).forEach((t, i) => { if (!s.done[i]) errs.push(`Complete "${t}" first.`); });
            if (!s.checked) errs.push("Open and check every uploaded file before you sign.");
            if (errs.length) return alert(errs);
            s.otp = true; alert([]); draw();
          } }), otpWrap];
      },
    ];

    /* The presenter's Reveal fills every tab correctly and opens Upload Documents to show the right slots. */
    const answerKey = () => {
      const ok = data.offerings.findIndex(o => o.ok);
      const key = data.answers || {};
      s = fresh();
      Object.assign(s, {
        offering: ok, price: String(key.price || data.floor), gst: false,
        breakup: (data.files.find(f => f.kind === "price") || {}).name || "",
        slots: { ...(key.slots || {}) }, gstin: data.gstins[0], mii: "Yes", emdEx: "No",
        emdAmt: String(data.emd), emdMode: key.emdMode || "Bank Guarantee", emdRef: key.emdRef || "BG/2026/0001", checked: true,
      });
      s.done = TABS.map((_, i) => i < 4);
      s.tab = 2;
      alert(["Answer key: every tab filled correctly. Open each tab to walk through it, then press e-Sign on Verify."], "ok");
      draw();
    };

    function draw() {
      nav.replaceChildren(...TABS.map((t, i) => el("li", {}, el("button", { type: "button", "aria-current": String(i === s.tab), onclick: () => go(i) },
        el("span", { text: t }), s.done[i] ? el("span", { class: "tick", "aria-label": "saved", text: "✓" }) : ""))));
      panel.replaceChildren(...tabs[s.tab]());
    }
    draw();
    return { reveal: answerKey };
  });
})();
