# Math Strings

An easy number-strings board for Grades 4–8 math. Show one problem at a time, run a think timer,
record student answers (even wrong ones), and model their thinking with an open number line,
ratio table, area model, array, double number line, clock, bar model, integer tiles, or the student's own words.
Earlier problems stay visible, shrunk down in the column on the left. Teachers pick their grade and a topic,
and the app keeps track of which strings they've done (✓).

Live at **https://gdrutz-blip.github.io/math-strings/**. Plain HTML, CSS and JavaScript; GitHub Pages publishes it on every push (`.github/workflows/pages.yml`), after `build.js` combines the `strings/` files.

## Files

| File | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The app |
| `models.js` | The drawing tools (number line, clock, …) |
| `strings/` | **Your string library**, one `.json` file per week. Every computer that opens the site gets these. |
| `build.js` | The publish step runs this to combine the `strings/` files into `strings.json` (generated; don't edit) |
| `PLANNING-GUIDE.md` | Instructions for a Claude planning chat: the file format and model inputs |
| `netlify.toml` | Old Netlify setup (no longer used) |

## Quick board

**☰ More → ⚡ Quick board** is a blank board for any math problem, not just strings. Type or paste the question
(a word problem is fine; Shift+Enter starts a new line), or paste a picture of it with Ctrl+V (Cmd+V on a Mac)
or **📷 Add a picture**. Then model it with any tool, the pen, or students' answers. **New problem ▶** starts the
next one, and ↺ clears the board. Pictures are kept in this browser, so clear the board now and then.

## Boards
**☰ More → 📋 Boards** keeps saved lists of problems (a unit test, a warm-up) that you show on a **clean screen**: the problem at the top, your tools along the bottom, nothing else.

- **Make one ahead of time:** name it, paste the problems (one per line, or separate longer ones with a blank line) and press *Create and open*. Question numbers like `1.` or `Q3:` are removed for you.
- **Move between problems** with ← → or Space, the arrows at the screen edges, or a two-finger swipe on the trackpad.
- **The ⋯ in the top corner** has: all my boards, edit this board's problems, add a problem, the problem list, the pen, clear answers and models, and *Show all the controls* (the normal top bar and list; *🧼 Clean view* goes back).
- **Pictures:** on the board, use **📷 Add a picture** or paste one with Ctrl+V (a diagram, or a screenshot of the question). When you edit a board's problems, a problem that is only a picture shows as `[picture]`, and work and pictures follow each problem even if you move it.
- **The pen** sits at the top right in the clean view, away from the problem. **✓ Done** puts it away.
- Boards, and any models you make on them, are saved in the browser. **Export** includes them, so they move to another computer with the rest.

The Quick board is unchanged: a single blank board that is cleared after a few hours.

## Adding strings

1. **Quick way:** in the app open **☰ More → Import** and drop in a `.json` file (from Claude or from **Export** on
   another computer), or paste a plain list.
2. **Permanent way:** on GitHub, open the `strings` folder → **Add file** → **Upload files**, and drop in the
   week's `.json` file. The site republishes in a minute or two and every computer picks it up.
   Uploading a file with the same name replaces it.

If you edit a string in the app, your edited copy wins on that computer. The library card shows
↺ if you want the website's copy back, and a notice if the website's copy is revised after you edited yours
(**Use website version** or **Keep mine**). 🗑 on a website string only hides it; **Show hidden strings** at the
bottom of the library brings it back.

## Format (for Claude)

```json
{
  "version": 1,
  "strings": [
    {
      "id": "w2-d1-decimals-near-a-whole",
      "title": "Decimals Near a Whole",
      "label": "Day 1",
      "group": "Week 2 · Decimals",
      "tool": "numberline",
      "strategy": "Add a friendly number, then take back the extra.",
      "problems": [
        { "q": "2.5 + 1.5", "a": "4", "notes": "Look for: ... Ask: ..." },
        { "q": "2.5 + 1.9", "a": "4.4", "optional": true }
      ]
    }
  ]
}
```

- `id` is unique and stays the same when a string is revised.
- `tool` is one of: `numberline`, `slide`, `givetake`, `halve`, `tiles`, `split`, `estimate`, `column`, `ratio`, `area`, `array`, `doubleline`, `clock`, `bar`, `text`.
- Problems are written plainly: `38 + 9`, `100 - 76`, `3/4 + 1/3`, `1 1/2 x 4`, `2^3 × 2^4`.
- `a` (answer), `notes`, `strategy`, `keywords`, `connection`, `watchFor`, `wrapUp` are for the teacher only.
  Students never see them.

## Keyboard (while presenting)

`→` / Space / `N` / Page Down next · `←` / Page Up back · `T` timer · `R` random name · `A` add answer ·
`Y` try a likely response · `P` pen · `E` eraser · `Ctrl+Z` undo a stroke · `L` problem list · `O` whole-string overview ·
`Enter` finish a model · `Esc` stop typing/drawing · `?` help

Number keys add a model (shown on each tool button): `1` Number line · `2` Double number line · `3` Area model · `4` Array ·
`5` Ratio table · `6` Bar model · `7` Integer tiles · `8` Algorithm · `9` Slide · `0` Words (for anything else).
The other tools (vertical number line, give & take, halving, clock, split, estimate) show in the tool bar when a string uses them, or under **More tools**.

## Model input cheat sheet

| Tool | Type | Draws |
|---|---|---|
| Number line | `38 +10 -1` | start at 38, jump +10, back 1 |
| | `76 >80 >100` | jump *to* 80, then to 100 |
| | `89 ~100` | the gap (distance) from 89 to 100 |
| | `0 +20x3` | three jumps of 20 |
| | `0 +1/4x3 ~2` | fraction jumps (points labeled as fractions); mixed numbers work: `1 1/2 -1/2 -1/4` |
| Vertical number line | `-8 +8 +7` (same typing as the number line) | a thermometer-style line: up is more, down is less |
| | `@100` | mark a point |
| Slide (same difference) | `62 - 49 = 63 - 50` or `62 - 49 > +1` | both numbers sliding together, same gap marked |
| Give & take | `49 + 26 = 50 + 25` or `49 + 26 > +1` | bars showing the amount moving from one number to the other |
| Doubling & halving | `16 x 25 = 8 x 50 = 4 x 100` | rectangle cut and rearranged at each step |
| Ratio table | `bags:apples, 1:7, 10:70, 5:35` · `100:60, 10:6, 5:3, 15:9` · `3:4 x2` (makes 6:8; also `÷2`) | table with ×/÷ arrows; a column made by adding (or subtracting) two others is marked, e.g. 10 + 5 |
| Area model | `30+8 x 7` | split rectangle with partial products |
| | `40-2 x 20` or `40x20 - 2x20` | 40 × 20 with a 2 × 20 strip taken away |
| | `84 / 7 = 70 + 14` · `86 / 7 = 70 + 14 + 2` · `84 / 7` | division as a missing side: 84 split into 70 and 14, sides 10 and 2 (a remainder is hatched) |
| | `2/3 x 3/4` · `1 1/2 x 2/3` · `3 x 2/5` | fraction area model: unit squares cut both ways, the overlap is the product |
| Array | `6 x 5+3` | dot array split into 5 and 3 |
| | `10-1 x 12` or `40x20 - 2x20` | dots with a row/column crossed out |
| Double number line | `miles:hours, 0:0, 60:1, 150:2.5` | two aligned lines (spaced evenly, marked "not to scale", when marks would overlap) |
| Clock | `3/4 + 1/3` | shaded minutes of an hour |
| Standard algorithm | `38 + 9` · `100 - 76` · `2.5 + 1.9` · `24 x 13` | column method with carries / regrouping / partial products |
| Integer tiles | `3 + -5` · `-2 - 4` · `3 x -2` | yellow/red tiles with zero pairs |
| Split by place value | `36 + 47` | tens with tens, ones with ones |
| Estimate | `36 + 47` · `3.99 + 2.45` · `36 + 47 ≈ 35 + 45` | nearest friendly numbers (decimals to the nearest half), then the estimate |
| Words & equations | `38 x 20 = 40 x 20 - 2 x 20 ; = 800 - 40` | student words or equations; `;` starts a new line |
| Bar model | `3/4 of 24` · `24 = 10 + ?` · `Ana: 12; Ben: 12 + 5` | tape diagrams |

Click any label on a drawing to replace it with the student's words.

Class lists for the random picker are stored only in the browser, never in this repository.
