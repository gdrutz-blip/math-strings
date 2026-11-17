# Math Strings Wishlist

Ideas to build when they're needed. Add to this any time, either by asking Claude or by editing it on GitHub (open the file, then the ✏️ pencil icon).

**Rule of thumb:** build a tool when there are strings that need it.

## 🎯 Current priority: school PD, Grades 4–8

Three 30-minute small-group sessions (School Improvement Plan, math fluency): **Dec 4, 2026** (launch: learn strings, choose an instructional focus, plan), **Feb 1, 2027** (review evidence, refine), **Apr 1, 2027** (examine growth, next steps). About 8 weeks of classroom use between sessions. Framed by the Ontario monograph *Making Space for Students to Think Mathematically*.

The app has a **🎓 PD page** (`#/pd`, `#/pd/4`…) for teachers: session dates, their grade's focus units with Present / Practice card / Notes, classroom routine, and how to collect evidence. It lists whatever `Grade N · …` strings are in the library, so new units appear there automatically. Dates live in the `PD` constant in app.js.

Before **Dec 4**:
- [ ] **Strings for Grades 4, 5, 6, 7 and 8**: at least 2 focus units per grade (a week of 5 strings each), aligned to the Ontario curriculum, each with `responses` for printable practice cards. Planned in the Claude Project, uploaded to `strings/` as `grade-N-week-NN-topic.json`. *(Approved plan, Nov 17: G4 Wk 2 Multiplying by One Digit ✅ · G5 Decimals to Hundredths ✅, Two-Digit Multiplication ✅ · G6 Percents of Whole Numbers ✅, Adding and Subtracting Fractions ✅ · G7 Integers ✅, Percent Increase and Decrease ✅. Grades 4–7 now have 2 units each with practice responses; Grade 8 has 2 units without practice responses yet.)*
- [ ] Add practice `responses` to Grade 4 Days 3–5 and to the Grade 8 strings
- [ ] Test the site on the school network/laptops (ask IT to allow gdrutz-blip.github.io if blocked)
- [ ] **Save a run / benchmark strings** (see below): teachers will re-run their first string in March and compare. PDFs via 🖨 work today as a fallback.
- [ ] Short feedback form and an evidence tracker (outside the app)



- [ ] **Save a run / benchmark strings**: one click at the wrap-up keeps a named copy
      (e.g. "Day 3 · Period 2 · Nov 12"); reopen it later; compare September with January.
      For now: press `O` at the end and take a screenshot.
- [ ] **Model suggestions in the notes**: add the Day 1 rehearsal "Model:" lines to the Week 1 notes so they print with the plan.

## 🛠 Build plan (agreed Nov 17), one step at a time

1. [x] **Browse by grade and topic, and keep track**: ask the teacher's grade on the first visit; topic filter (Addition & Subtraction, Multiplication & Division, Decimals, Fractions, Percents, Integers); ✓ done (automatic on Finish), ★ favourites, 📌 to try, with lists and unit progress. Saved in the browser; Export/Import carry it. (Nov 17)
2. [x] **Suggested tools first** in the presenter: the string's tool and the tools in its responses, the rest under "More tools". Strings that suggest fewer than 3 tools still show them all; ⚙ can turn it off. (Nov 17)
3. [x] **Don't lose site revisions**: tell a teacher when the site's copy of a string they edited has changed; 🗑 on a site string hides it instead of deleting ("Show hidden strings" brings it back). (Nov 17)
4. [ ] **Save a run** (before Feb 1): keep a dated copy of a run (answers, models, drawings) to reopen and compare December with March. Feeds ✓ done.
5. [ ] **Try a response** buttons in the presenter (teacher-only), using each problem's practice responses.
6. [ ] **Curriculum codes as a field** (`curriculum: "B2.3"`), shown as badges on the PD page and in notes.
7. [ ] **Share a string by link** (the string packed into the URL; no server).
8. [ ] ~~**Grade 8 wording** in the README and guides~~ (done Nov 17); **Grade 8 units** on Grade 8 expectations (B2.7 integers × ÷, B2.3 powers of ten).
9. [ ] **Topic banks** per grade (see below), each new unit showing up under its topic.

## Maybe later

- [ ] **Topic banks per grade**: several possible focus units for each grade (4–8), each tied to Ontario Number expectations, so teachers can pick a different focus after the first 8 weeks. Do after the PD units are written.
- [ ] **Estimate tool with decimals**: it rounds small numbers to the nearest 5 on a 0–10 line, so decimal estimates crowd together. Workaround: type the friendly numbers (`3.99 + 2.45 ≈ 4 + 2.5`).

- [ ] **"Try a response" buttons**: likely student answers listed for each problem; one tap draws that model. Good for rehearsing at home and as a safety net in class.
- [ ] **Connect two problems**: an arrow between problems in the left column for "the last one helped me" (for now, use the pen).
- [ ] **Printable teacher card** for each string: goal, what to listen for, 3 questions to ask.

## Opening it up to K–8 (big idea, not yet)

Start with 1–2 interested colleagues, ideally including a primary teacher.

- [ ] A K–8 strategy map (scope and sequence) per grade band, planned in the Claude Project before any code
- [ ] A grade on every string, and a "Choose your grade" home page
- [ ] Tools shown by grade band
- [ ] Primary tools: ten frames, double ten frames, rekenrek, dot images, number path, hundred chart (tap-friendly for smartboards)
- [ ] Picture problems and quick-flash (show an image for 2 seconds, then hide it) for K–1
- [ ] A "first week" guide per grade for new teachers
- [ ] Check district approval for classroom web tools (privacy is good: no accounts, and no student data leaves the browser)
- [ ] Write original strings; don't copy published string books

## Done

- [x] From the Grade 4 trial: Estimate and Split (tens first) tools; long Words text shrinks and wraps; 🖨 print / save as PDF of what's on screen (Nov 13)
- [x] Fit-everything layout: the model being typed is big at the bottom and shrinks into a grid on Enter; click to spotlight; slim problem list (L to hide); typing box at the bottom (Nov 12)
- [x] Choose which tools show (⚙ in the tool bar) (Nov 12)
- [x] Integer tiles: zero pairs, taking away with added zero pairs, groups (Nov 12)

- [x] Library, editor, presenter, timer, random name picker (Nov 5)
- [x] Number line, ratio table, area, array, double number line, clock, bar, words & equations (Nov 5)
- [x] Problem pinned at the top; subtraction in area/array (`40x20 - 2x20`); fraction number lines (Nov 6)
- [x] Slide, Give & take, Doubling & halving (Nov 6)
- [x] `strings/` folder: upload a week's file on GitHub; planning guide for the Claude Project (Nov 6)
- [x] Forgiving inputs ("38 to 48 to 47", "start 38, jump 10, back 1", "62 - 49 up 1", …) (Nov 8)
- [x] Moved hosting to GitHub Pages: no monthly deploy limit (Nov 9)
- [x] Standard algorithm tool; number line starts blank; Finish button at the end (Nov 9)
