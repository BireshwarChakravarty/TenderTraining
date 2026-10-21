/* Shared helpers and the widget registry.
   A widget is any element with data-widget="name". Its content can carry a
   <script type="application/json"> block with the data it needs, so trainers
   can edit questions and answers in index.html without touching the code. */
window.TT = (() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const el = (tag, attrs = {}, ...kids) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) node.append(kid);
    return node;
  };

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage blocked */ } },
  };

  const data = root => {
    const node = root.querySelector(':scope > script[type="application/json"]');
    if (!node) return null;
    try { return JSON.parse(node.textContent); } catch (err) { console.error("Bad widget data", root, err); return null; }
  };

  const shuffle = list => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "–");
  const inr = n => (Number.isFinite(n) ? `₹${Math.round(n).toLocaleString("en-IN")}` : "–");
  const crore = n => (Number.isFinite(n) ? `₹${n.toFixed(2)} cr` : "–");

  const flash = (node, cls = "shake") => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); };

  const copyText = (text, sourceNode, report) => {
    const fallback = () => {
      if (sourceNode) {
        const range = document.createRange(); range.selectNodeContents(sourceNode);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      }
      report?.("Text selected. Press Ctrl+C or ⌘C to copy.");
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => report?.("Copied."), fallback);
    else fallback();
  };

  const registry = {};
  const register = (name, init) => { registry[name] = init; };
  const initAll = (root = document) => {
    $$("[data-widget]", root).forEach(node => {
      const init = registry[node.dataset.widget];
      if (!init || node.dataset.ready) return;
      node.dataset.ready = "1";
      try { init(node, data(node)); } catch (err) { console.error(`Widget "${node.dataset.widget}" failed`, err); }
    });
  };

  return { $, $$, el, store, data, shuffle, reduceMotion, fmt, inr, crore, flash, copyText, register, initAll };
})();
