# Quality & Vendor Management: Practice Questions

A study website with **334 questions** from the Business Fundamentals lectures:

- **127 MSQs** (one or more correct answers) and **207 MCQs** (exactly one correct answer)
- Quality Management (Session 11) and Vendor Management & Contracts (Session 7)
- Pick your answer, then check it. Every option shows whether it is right or wrong, and why.

It is a plain static site (HTML, CSS, JavaScript). There is nothing to install or build, and it works offline once loaded.

## Features

- **Instant checking.** MCQs can be checked the moment you pick an option. MSQs are checked when you press **Check answer**.
- **Partial credit for MSQs.** If you pick some of the correct options, the result shows "Partly right".
- **An explanation for every option.** Each one is marked as correct, incorrect, or "correct, but you didn't pick it".
- **Filters.** Narrow the set by question type, lecture, topic, difficulty, "Not tried" or "My mistakes".
- **Saved progress.** Your score and answers are saved in your browser, and **Try again** resets a single question.
- **Navigator grid.** Every question in the current set appears, coloured by result, so you can jump to any of them.
- **Keyboard shortcuts.** <kbd>A</kbd>–<kbd>D</kbd> or <kbd>1</kbd>–<kbd>4</kbd> to pick, <kbd>Enter</kbd> to check, <kbd>←</kbd>/<kbd>→</kbd> to move.
- **Display.** Dark and light themes, mobile-friendly, with formulas rendered by KaTeX.

## Files

| File | What it does |
|---|---|
| `index.html` | Page structure |
| `styles.css` | All styling, including the light and dark themes |
| `app.js` | Quiz logic: filters, checking, scoring, saved progress |
| `questions.js` | The question bank, loaded by the page |
| `questions.json` | The same questions as plain JSON, if you want to reuse them elsewhere |
| `assets/` | Self-hosted fonts (Bricolage Grotesque, Atkinson Hyperlegible) |
| `vendor/katex/` | KaTeX, used for maths rendering |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

## Put it on GitHub Pages

1. Create a new **public** repository on GitHub, for example `quality-vendor-quiz`.
2. Upload **every file and folder** from this zip to the root of the repository: `index.html` must sit at the top level, next to `questions.js`. On the website, use **Add file → Upload files**, then drag in the unzipped contents, *including* the `assets` and `vendor` folders.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to *Deploy from a branch*. Then choose **Branch: `main`** and folder **`/ (root)`**, and click **Save**.
5. Wait a minute or two, then refresh the page. Your site address appears at the top: `https://<your-username>.github.io/<repo-name>/`

Using git instead:

```bash
cd quality-vendor-quiz
git init
git add .
git commit -m "Add practice question site"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Then do steps 3 to 5 above.

## Run it on your computer

Double-click `index.html`; it works straight from the folder. You can also serve it locally:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Edit or add questions

Open `questions.js`. Each question looks like this:

```js
{
  "id": "MCQ-13",
  "type": "MCQ",            // "MCQ" = one answer, "MSQ" = one or more
  "num": 13,
  "deck": "QM",             // "QM" = Quality Management, "VM" = Vendor Management
  "topic": "The 99.9% Trap and Scale",
  "difficulty": "Numerical",
  "pdfPages": [9], "slides": [9],
  "question": "At 99.9% success on ~698 million UPI transactions/day, failures per day are about:",
  "options": ["6.98 lakh", "69,800", "6,980", "69.8 lakh"],
  "answer": [0],            // 0 = A, 1 = B, 2 = C, 3 = D
  "explanations": ["...", "...", "...", "..."]
}
```

- Write maths between `\\(` and `\\)` (inside the JS string), for example `\\(\\pm3\\sigma\\)`.
- `**text**` shows as bold and `_text_` as italic.
- If you edit `questions.json` instead, wrap it so the page can load it: `window.QUESTION_BANK = [ ...contents of questions.json... ];` and save that as `questions.js`.

Progress is stored in each visitor's own browser (`localStorage`) and is never sent anywhere. **Clear my progress** in the sidebar resets it.

## Credits

Questions are based on lecture slides by Dr. Himanshu Warudkar. The fonts are under the SIL Open Font License (licence files are in `assets/fonts`), and KaTeX is under the MIT licence (`vendor/katex/LICENSE`).
