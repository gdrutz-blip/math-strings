# Math Strings

An easy number-strings board for Grade 8 math. Show one problem at a time, run a think timer,
record student answers (even wrong ones), and model their thinking with an open number line,
ratio table, area model, array, double number line, clock, bar model, or the student's own words.
Earlier problems stay visible, shrunk down in the column on the left.

No build step: it's plain HTML, CSS and JavaScript. Netlify serves this folder as is.

## Files

| File | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The app |
| `models.js` | The drawing tools (number line, clock, …) |
| `strings.json` | **Your string library.** Every computer that opens the site gets these. |
| `netlify.toml` | Tells Netlify there is nothing to build |

## Adding strings

1. **Quick way:** in the app click **Import** and drop in a `.json` file (from Claude or from **Export** on
   another computer), or paste a plain list.
2. **Permanent way:** add the string to `strings.json` in this repository. Netlify republishes in about a
   minute and every computer picks it up. Ask Claude to do this for you.

If you edit a string in the app, your edited copy wins on that computer. The library card shows
"↺ site version" if you want the website's copy back.

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
- `tool` is one of: `numberline`, `ratio`, `area`, `array`, `doubleline`, `clock`, `bar`, `text`.
- Problems are written plainly: `38 + 9`, `100 - 76`, `3/4 + 1/3`, `1 1/2 x 4`, `2^3 × 2^4`.
- `a` (answer), `notes`, `strategy`, `keywords`, `connection`, `watchFor`, `wrapUp` are for the teacher only.
  Students never see them.

## Keyboard (while presenting)

`→` next · `←` back · `T` timer · `R` random name · `A` add answer · `1`–`8` add a model ·
`P` pen · `E` eraser · `O` whole-string overview · `Esc` stop typing/drawing · `?` help

## Model input cheat sheet

| Tool | Type | Draws |
|---|---|---|
| Number line | `38 +10 -1` | start at 38, jump +10, back 1 |
| | `76 >80 >100` | jump *to* 80, then to 100 |
| | `89 ~100` | the gap (distance) from 89 to 100 |
| | `@100` | mark a point |
| Ratio table | `bags:apples, 1:7, 10:70, 5:35` | table with ×/÷ arrows |
| Area model | `30+8 x 7` | split rectangle with partial products |
| Array | `6 x 5+3` | dot array split into 5 and 3 |
| Double number line | `miles:hours, 0:0, 60:1, 150:2.5` | two aligned lines |
| Clock | `3/4 + 1/3` | shaded minutes of an hour |
| Bar model | `3/4 of 24` · `24 = 10 + ?` · `Ana: 12; Ben: 12 + 5` | tape diagrams |

Click any label on a drawing to replace it with the student's words.

Class lists for the random picker are stored only in the browser, never in this repository.
