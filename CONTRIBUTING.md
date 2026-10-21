# Contributing

Thanks for improving the training. A few rules keep it useful and safe.

## Ground rules

- **Nothing private.** The repository is public. No client financials, bank details, quoted prices, real bid numbers, employee names or CVs. Black out account names in screenshots. Keep examples fictional or anonymised.
- **Plain language.** Write the way you'd explain it to a new colleague at their desk.
- **Keep it interactive.** If a slide is only text, ask whether trainees could answer, sort, match or circle something instead.

## Workflow

1. Branch from `main`.
2. Make the change. Content edits are described in [docs/editing-content.md](docs/editing-content.md).
3. Run the checks:
   ```sh
   npm install
   npm run check
   ```
4. Open a pull request describing what changed for trainees. Add a screenshot if the slide looks different.

CI runs the same lint and Playwright checks. `main` publishes to GitHub Pages.

## Code style

- No build step and no framework. Plain HTML, CSS and browser JavaScript in classic scripts, so the deck also works when opened from a file.
- Colours come from the tokens at the top of `assets/css/deck.css`, with light and dark values.
- New interactive pieces register with `TT.register("name", (root, data) => { … })` in `assets/js/widgets/`, read their content from a JSON block, and get a test in `tests/`.
