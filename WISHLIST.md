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
- [x] **Save a run / benchmark strings**: done (🗂 My runs, with Compare). (Nov 17)
- [ ] Short feedback form and an evidence tracker (outside the app)



- [ ] **Model suggestions in the notes**: add the Day 1 rehearsal "Model:" lines to the Week 1 notes so they print with the plan.

## 🛠 Build plan (agreed Nov 17), one step at a time

1. [x] **Browse by grade and topic, and keep track**: ask the teacher's grade on the first visit; topic filter (Addition & Subtraction, Multiplication & Division, Decimals, Fractions, Percents, Integers); ✓ done (automatic on Finish), ★ favourites, 📌 to try, with lists and unit progress. Saved in the browser; Export/Import carry it. (Nov 17)
2. [x] **Suggested tools first** in the presenter: the string's tool and the tools in its responses, the rest under "More tools". Strings that suggest fewer than 3 tools still show them all; ⚙ can turn it off. (Nov 17)
3. [x] **Don't lose site revisions**: tell a teacher when the site's copy of a string they edited has changed; 🗑 on a site string hides it instead of deleting ("Show hidden strings" brings it back). (Nov 17)
4. [x] **Save a run**: Finish saves a dated copy (answers and models; class and a note at the wrap-up; 💾 Save run any time). 🗂 My runs lists them; open, print/PDF, compare two runs of a string side by side; Export/Import carry them. Finish also clears the session so the next class starts fresh. Pen drawings aren't saved yet. (Nov 17)
5. [x] **Try a response**: 💡 Try (or Y) in the presenter lists the problem's likely responses; one tap draws the model (and a numeric mistake also goes in as an answer). (Nov 17)
6. [x] **Curriculum codes as a field** (`curriculum: ["B2.3"]`): badges with the Ministry wording on the library, PD page (expandable list), practice cards and editor; searchable. Grade 7 integers corrected to B1.3. (Nov 17)
7. [x] **Share a string by link**: 🔗 Share in the editor and on the practice card copies a link with the whole string packed inside (compressed; nothing uploaded). Opening it shows a preview and Add to my library (or Replace mine / Add as a copy). (Nov 17)
8. [x] ~~**Grade 8 wording**~~ (done); Grade 8 content on Grade 8 expectations is now in the string bank, batch 1 (B2.7, B2.3, B1.4). (Nov 17)
9. [ ] ~~Topic banks~~ → replaced by step 10.
11. [x] **New models** (Nov 17, before more bank strings): area model for **division** (`84 / 7 = 70 + 14`, remainders hatched); **fraction area model** (`2/3 x 3/4`, mixed numbers, whole × fraction); **ratio tables** mark a column made by adding/subtracting two others (15% = 10% + 5%) and show friendly factors like ×2.5; **double number lines** space marks evenly ("not to scale") when they'd overlap; **Estimate** rounds decimals to the nearest half; new **Vertical number line** (thermometer). Next: pen drawings in saved runs.
10. [ ] **A big string bank** (like the books with 100+ strings, but **all original**; don't copy published strings): many single strings per grade and topic, grouped by strategy and building in difficulty, separate from the weekly PD units (group `Grade N · Bank · Topic`). Built in checked batches of ~15–25 (every answer and model checked, like the units). Add a **strategy filter** once a topic has 30+ strings. Start with Grade 8, then 4–7.
    - [x] Batch 1, Grade 8 (Nov 17): 10 strings. Integers × ÷ (4, B2.7), powers of ten (3, B2.3), percents over 100% / under 1% / fraction-decimal-percent (3, B1.4). Files `grade-8-bank-*.json`; the library lists the bank after a grade's weekly units, and the PD page points to it.
    - [ ] Next batches: Grade 8 fractions × ÷ (B2.6), squares and square roots (B2.2, B1.3), scientific notation (B1.1); then Grades 4–7.

## Maybe later

- [ ] **Topic banks per grade**: several possible focus units for each grade (4–8), each tied to Ontario Number expectations, so teachers can pick a different focus after the first 8 weeks. Do after the PD units are written.
- [ ] **Estimate tool with decimals**: it rounds small numbers to the nearest 5 on a 0–10 line, so decimal estimates crowd together. Workaround: type the friendly numbers (`3.99 + 2.45 ≈ 4 + 2.5`).

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
