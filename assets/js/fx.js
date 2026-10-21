/* Effects: confetti, fireworks, sounds, count-ups, the laser pointer and blackout.
   Everything here is decoration. It switches itself off for people who ask for reduced motion,
   and sounds play only after the presenter has clicked something (browsers require that). */
(() => {
  "use strict";
  const { store, reduceMotion } = TT;

  /* ---------- Canvas layer ---------- */
  const canvas = document.createElement("canvas");
  canvas.className = "fx-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size();
  addEventListener("resize", size);

  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const palette = () => [css("--green-2"), css("--sun"), css("--coral"), css("--sky"), "#ffffff"];
  let parts = [], raf = 0, fireworksOn = false, nextRocket = 0;

  const loop = t => {
    ctx.clearRect(0, 0, W, H);
    if (fireworksOn && t > nextRocket) { rocket(); nextRocket = t + 520 + Math.random() * 520; }
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
      if (p.kind === "rocket" && p.vy >= -1.2) { burst(p.x, p.y, 70, true); p.life = 0; continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 40));
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.kind === "spark" || p.kind === "rocket") { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)));
      ctx.restore();
    }
    raf = parts.length || fireworksOn ? requestAnimationFrame(loop) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  const confetti = (x = W / 2, y = H / 3, n = 120, spread = 1) => {
    if (reduceMotion()) return;
    const cols = palette();
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * spread;
      const v = 6 + Math.random() * 9;
      parts.push({ kind: "paper", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.25, drag: 0.985, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, w: 7 + Math.random() * 6, h: 10 + Math.random() * 8, color: cols[i % cols.length], life: 140 + Math.random() * 60 });
    }
    kick();
  };
  const burst = (x, y, n = 60, firework = false) => {
    const cols = palette();
    const c = cols[Math.floor(Math.random() * (cols.length - 1))];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, v = (firework ? 3 : 2) + Math.random() * (firework ? 4 : 3);
      parts.push({ kind: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.06, drag: 0.975, rot: 0, vr: 0, r: firework ? 2.4 : 2, color: firework ? c : cols[i % cols.length], life: 70 + Math.random() * 30 });
    }
    kick();
  };
  const rocket = () => {
    const x = W * (0.15 + Math.random() * 0.7);
    parts.push({ kind: "rocket", x, y: H + 10, vx: (Math.random() - 0.5) * 2, vy: -(10 + Math.random() * 4), g: 0.16, drag: 0.995, rot: 0, vr: 0, r: 2.6, color: css("--sun"), life: 200 });
  };
  const fireworks = on => {
    if (reduceMotion()) return;
    fireworksOn = on;
    if (on) { nextRocket = 0; kick(); }
  };
  const at = node => { const r = node?.getBoundingClientRect?.(); return r ? [r.left + r.width / 2, r.top + r.height / 2] : [W / 2, H / 3]; };

  /* ---------- Sound (Web Audio, generated, no files) ---------- */
  let audio = null;
  let soundOn = (store.get("tt-sound") ?? (TT.mode === "present" ? "on" : "off")) === "on";
  const ac = () => { if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch { audio = null; } } return audio; };
  const tone = (freq, dur = 0.12, type = "sine", when = 0, gain = 0.12) => {
    const a = ac(); if (!a || !soundOn) return;
    const t = a.currentTime + when;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  const sounds = {
    good: () => { tone(660, 0.12, "triangle"); tone(990, 0.16, "triangle", 0.08); },
    bad: () => { tone(180, 0.18, "sawtooth", 0, 0.06); tone(140, 0.22, "sawtooth", 0.06, 0.05); },
    stamp: () => { tone(90, 0.18, "square", 0, 0.12); tone(60, 0.25, "sine", 0.02, 0.18); },
    tick: () => tone(1200, 0.04, "square", 0, 0.05),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, "triangle", i * 0.11, 0.12)),
    whoosh: () => tone(320, 0.08, "sine", 0, 0.03),
  };
  const play = name => { try { sounds[name]?.(); } catch { /* audio unavailable */ } };
  const setSound = on => { soundOn = on; store.set("tt-sound", on ? "on" : "off"); if (on) ac()?.resume?.(); document.dispatchEvent(new CustomEvent("fx:sound", { detail: on })); };

  /* ---------- Public helpers used by widgets ---------- */
  const fx = {
    good(node) { play("good"); const [x, y] = at(node); confetti(x, y, 26, 0.6); },
    bad(node) { play("bad"); node?.classList?.add("shake"); setTimeout(() => node?.classList?.remove("shake"), 320); },
    stamp() { play("stamp"); },
    tick() { play("tick"); },
    win(node) { play("win"); const [x, y] = node ? at(node) : [W / 2, H * 0.35]; confetti(x, y, 180, 1.1); setTimeout(() => confetti(W * 0.2, H * 0.4, 90, 0.8), 180); setTimeout(() => confetti(W * 0.8, H * 0.4, 90, 0.8), 320); },
    whoosh() { play("whoosh"); },
    confetti, fireworks,
    get soundOn() { return soundOn; }, setSound,
    countUp(node, to, { dur = 900, decimals = 0, prefix = "", suffix = "" } = {}) {
      if (reduceMotion() || !Number.isFinite(to)) { node.textContent = `${prefix}${Number(to).toFixed(decimals)}${suffix}`; return; }
      const from = Number(node.dataset.shown || 0), t0 = performance.now();
      const step = t => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        node.textContent = `${prefix}${(from + (to - from) * e).toFixed(decimals)}${suffix}`;
        if (k < 1) requestAnimationFrame(step); else node.dataset.shown = String(to);
      };
      requestAnimationFrame(step);
    },
  };
  TT.fx = fx;

  /* ---------- Laser pointer and blackout (presenter) ---------- */
  const laser = document.createElement("div");
  laser.className = "laser"; laser.hidden = true; laser.setAttribute("aria-hidden", "true");
  const black = document.createElement("div");
  black.className = "blackout"; black.hidden = true; black.innerHTML = "<span>Press B to come back</span>";
  document.body.append(laser, black);
  addEventListener("pointermove", e => { if (!laser.hidden) laser.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; });
  fx.toggleLaser = () => { laser.hidden = !laser.hidden; document.documentElement.classList.toggle("laser-on", !laser.hidden); return !laser.hidden; };
  fx.toggleBlackout = () => { black.hidden = !black.hidden; return !black.hidden; };
  black.addEventListener("click", () => { black.hidden = true; });

  /* Count up any [data-count] number when its slide appears. */
  document.addEventListener("slide:shown", e => {
    e.target.querySelectorAll("[data-count]").forEach(n => { n.dataset.shown = "0"; fx.countUp(n, Number(n.dataset.count), { dur: 1200 }); });
    fireworks(e.target.classList.contains("finale"));
    if (e.target.classList.contains("finale")) setTimeout(() => fx.win(), 450);
  });
})();
