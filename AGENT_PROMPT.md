# Prompt for an AI coding agent

Use this if you want an AI agent (Claude Code, Cursor, Copilot, etc.) to rebuild or redesign the site. Give it `questions.json` from this folder along with the prompt below.

---

Build a static quiz website that I can host on GitHub Pages. Use plain HTML, CSS and vanilla JavaScript only, with no build step and no backend. It should also work when `index.html` is opened directly from the folder.

**Data**
- The questions are in `questions.json`, an array of 334 objects with these fields: `id`, `type` ("MSQ" or "MCQ"), `num`, `deck` ("QM" = Quality Management, "VM" = Vendor Management), `topic`, `difficulty`, `pdfPages`, `slides`, `question`, `options` (4 strings), `answer` (array of 0-based indexes) and `explanations` (4 strings, one per option).
- Convert it to `questions.js` as `window.QUESTION_BANK = [...]` so it loads without a server.
- Text may contain inline maths written as `\( ... \)`. Render it with KaTeX, using files bundled in the repo rather than a CDN. `**bold**` and `_italic_` markers should render as bold and italic.

**Quiz behaviour**
- Show one question at a time, with its type, number, difficulty, topic and source ("Quality deck, PDF page 5, slide 5").
- MCQ: exactly one choice; it can check instantly on click (as a setting).
- MSQ: toggle any number of choices, then press "Check answer".
- After checking, mark each option as one of: correct and picked (green ✓), wrong and picked (red ✗), correct but missed (dashed green outline), or not correct and not picked. Show that option's explanation underneath it.
- Show a result banner: "Correct", "Partly right" (an MSQ with some correct picks, saying how many of how many), or "Incorrect", plus the full answer key letters.
- Include a "Try again" button to reset one question, and Previous/Next buttons.

**Study tools**
- Filters: type (All/MSQ/MCQ), lecture (Both/Quality/Vendor), topic dropdown grouped by lecture, difficulty multi-select chips with counts, "Show: Everything / Not tried / My mistakes", and a shuffle toggle.
- A score panel showing correct of checked, a percentage ring, and how many are not tried.
- A navigator grid of every question in the current set, coloured green, amber, red or grey by result. Clicking a cell jumps to that question.
- Save progress, filters and settings in `localStorage`, wrapped in try/catch, and add a "Clear my progress" button with a confirmation step.
- Keyboard: A–D or 1–4 to pick, Enter to check, ← and → to move.

**Design**
- Calm and readable for long study sessions, with no generic template look.
- Use a distinct accent colour for MSQ (violet) and MCQ (teal), so the question type is obvious at a glance.
- Light and dark themes: follow the system setting, plus a toggle.
- Responsive down to 360px wide: filters collapse behind a "Filters" button on mobile.
- Meet WCAG AA contrast, show visible focus outlines, and respect `prefers-reduced-motion`.
- Self-host the fonts.

**Deliverables**
- `index.html`, `styles.css`, `app.js`, `questions.js`, the KaTeX and font assets, and an empty `.nojekyll` file.
- A `README.md` with step-by-step GitHub Pages instructions (Settings → Pages → Deploy from branch → main / root).
- Test it in a browser before finishing: check one MCQ, one MSQ with a partial answer, a formula question, the filters, mobile width, and a reload to confirm progress is kept.
