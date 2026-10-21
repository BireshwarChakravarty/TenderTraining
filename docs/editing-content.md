# Editing the content

Everything a trainer is likely to change lives in `index.html` and `practice/tender.html`. You don't need to touch the JavaScript.

## Slides

Each slide is a `<section class="slide">`:

```html
<section class="slide" id="my-slide" data-chapter="4" data-title="Title in the overview">
  <span class="tab">04 · Eligibility</span>
  <div class="head"><h2>Heading on the slide</h2><p class="lede">One-line intro.</p></div>
  …content…
  <aside class="notes"><ul><li>Trainer's notes, shown with N.</li></ul></aside>
</section>
```

- `id` becomes the slide's link (`index.html#my-slide`). Use letters, numbers and hyphens.
- `data-chapter` is the chapter number (0 to 12) shown in the left-hand list.
- Slides appear in the order they are written.

Chapter dividers are `<section class="slide divider-slide" id="chN" data-chapter="N">`. They list the slides in their chapter automatically. The cover is `#start` and the thank-you slide is `#thanks` (fireworks start when it is shown).

Handy building blocks: `<p class="hand">` for a red-pen note, `<mark>` to highlight, `<div class="sticky">` for a sticky note, `<div class="clause">` for typed contract text, and `<table class="ledger">` for tables.

Numbers with `data-count="12"` count up when their slide appears.

## Interactive pieces

An interactive piece is an element with `data-widget="…"`. In the presenter view, **Reveal answers** shows its answers and **Reset** rebuilds it from the original markup. Most read their content from a JSON block inside them. Edit the JSON and reload. If it doesn't appear, check the JSON is valid: every string in double quotes, no comma after the last item.

| Widget | JSON shape |
| --- | --- |
| `rounds` | `{"items": [{"q": "Question", "options": ["A", "B"], "answer": 0, "why": "Explanation"}]}` (answer counts from 0) |
| `match` | `{"left": "Heading", "right": "Heading", "pairs": [["criterion", "evidence"]]}` |
| `order` | `{"items": ["first", "second", "…"], "done": "Message when finished"}` |
| `sort` | `{"lanes": ["Team A", "Team B"], "items": [{"text": "Document", "lane": "Team A"}]}` |
| `cards` | `{"cards": [["Term", "Expansion", "Meaning"]]}` |
| `quiz` | `{"questions": [{"q": "…", "options": ["…"], "answer": 1, "why": "…"}]}` |
| `claudesim` | `{"prompts": [{"name", "ask", "files": [], "claims": [{"text", "cite", "href", "wrong": true, "why"}]}]}` (one claim per prompt has `"wrong": true`) |
| `triage` | `{"fields": [["Hindi label", "English label", "value", "what it means"]], "checks": [{"q", "pass": true, "fail": "reason"}]}` |
| `decision` | `{"gates": ["…"], "factors": [["Name", weight, default 1–5]]}` (weights should add up to 100) |
| `qcbs` | `{"bidders": [["Name", technical score, price in crore]]}` |
| `marks` | `{"cutoff": 70, "rows": [["Criterion", "How marks are given", max, our default, "Banked" / "Interview" / "Room"]]}` |
| `timeline` | `{"steps": [[days before deadline as a negative number, "What happens", true if it's a milestone]]}` |
| `tracker` | `{"statuses": ["…"], "rows": [["S.No.", "Document", "Owner", status index]]}` |
| `prompts` | `{"prompts": [["Name", "Prompt text, use \\n for new lines"]]}` |
| `gemsim` | Files, slots and rules for the GeM simulator. See the comments in `assets/js/widgets/gem-sim.js`. |

### Red pen

`redpen` needs no JSON. Wrap phrases in the text:

```html
<span class="rp" data-why="Why it's wrong">the mistake</span>
<span class="rp" data-ok="Why it's fine">a line that looks suspicious but isn't</span>
```

Add `.rp-tally`, `.rp-say`, `.rp-log` and a `.rp-reveal` button inside the widget for the counter, feedback, list and "Show all". The practice tender's trap hunt works the same way.

### Screenshot pins

Put an image in `assets/img/gem/`, then place pins by percentage of the image's width and height:

```html
<div class="cols l" data-widget="pins">
  <figure class="shot">
    <img src="assets/img/gem/my-shot.jpg" alt="…" width="1400" height="900">
    <button type="button" class="pin" style="left:30%;top:20%" aria-label="Pin 1">1</button>
  </figure>
  <ol class="pins-list"><li><span class="n">1</span><span>What this part of the screen does.</span></li></ol>
</div>
```

Before adding a screenshot, black out account names, bid numbers, prices and anything personal. The repository is public.

## Checking your change

```sh
npm install
npm run check
```

This lints the JavaScript and opens every slide on a desktop and a phone screen, failing on script errors, broken widgets or pages that scroll sideways.
