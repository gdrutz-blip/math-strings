# Math Strings: Planning Guide (for Claude)

You are helping a Grade 8 math teacher plan **number strings**: short sequences of related mental-math problems, shown one at a time, where each problem nudges students toward a strategy. The teacher runs them with a web app called **Math Strings**. This guide explains what the app does and exactly how to hand over strings so the teacher can load them with no fixing.

You do not need to open or use the app. Your job is to plan good strings and produce a `.json` file in the format below.

- **App:** https://gdrutz-blip.github.io/math-strings/
- **Code and library:** https://github.com/gdrutz-blip/math-strings
- The teacher's routine (think time, thumbs, partner talk, sharing with name sticks, the prompt bank) is in their **Math Strings Running Log** in this project. Follow its style and depth when planning.

---

## 1. What the app does in class (so you can plan for it)

- Shows **one problem at a time**, in large type. Earlier problems shrink into a column on the left, so students can always see the whole string so far.
- A **think timer** runs (about 20 seconds), then partner talk (about 30 seconds).
- The teacher types **student answers**, wrong ones included, and can circle or cross them out. **The app never shows the planned answer.**
- The teacher **models student thinking** by typing a short input into a tool. The tools are listed in section 4.
- A random name picker and a whole-string overview (for the wrap-up) are built in.

**Students see only the problem text, plus whatever the teacher models live.** Everything else in the file (answer, notes, strategy, watch-fors) is for the teacher, who usually prints it.

---

## 2. What to hand back

Give the teacher **one downloadable `.json` file per week** (or per block of strings), named like this:

```
week-02-decimals.json
week-03-multiplication.json
```

Always use a two-digit week number (`week-02`, not `week-2`) so files sort in order.

Put the file in a code block **and** offer it as a downloadable file if you can. Briefly list the strings in plain text, too, so the teacher can check the plan at a glance.

---

## 3. The file format

```json
{
  "version": 1,
  "strings": [
    {
      "id": "w02-d1-decimals-near-a-whole",
      "title": "Decimals Near a Whole",
      "label": "Day 1",
      "group": "Grade 8 · Week 3 · Decimals",
      "tool": "numberline",
      "strategy": "Add a friendly number, then take back the extra.",
      "keywords": "friendly number, take back, tenths",
      "connection": "Week 1 Day 1 with decimals instead of whole numbers.",
      "watchFor": [
        "Lining up digits instead of thinking about size: ask \"About how big should the answer be?\"",
        "2.5 + 1.9 = 3.14 (adding 9 tenths as 9 hundredths): ask \"Is 1.9 closer to 1 or 2?\""
      ],
      "wrapUp": "Ask \"How is this like Week 1 Day 1?\" Land: go to the friendly number, then take back the extra.",
      "problems": [
        { "q": "2.5 + 1.5", "a": "4", "notes": "Look for: a quick known fact. Ask: \"Hold on to this answer.\"" },
        { "q": "2.5 + 1.9", "a": "4.4", "notes": "Look for: 2.5 + 2, then back 0.1. Ask: \"Can the last problem help?\" Model: numberline 2.5 +2 -0.1" },
        { "q": "2.8 + 1.9", "a": "4.7", "optional": true, "notes": "Look for: 2.8 + 2, then back 0.1. Model: numberline 2.8 +2 -0.1" }
      ]
    }
  ]
}
```

### Fields

| Field | Required | What it is |
|---|---|---|
| `id` | yes | Unique and permanent. Format: `wNN-dN-short-title` (e.g. `w02-d3-decimal-subtraction`). **Never change an id when revising a string.** Keeping the same id is how the app knows to replace the old version instead of adding a duplicate. |
| `title` | yes | Short strategy name, e.g. "Constant Difference". |
| `label` | yes | Usually `Day 1`, `Day 2`, … |
| `group` | yes | Groups strings in the library. Format: `Grade N · Week N · Topic` (e.g. `Grade 8 · Week 3 · Decimals`). Use the exact same text for every string in that week. |
| `tool` | yes | The model the teacher will most likely use. It gets highlighted on screen. One of the ids in section 4. |
| `strategy` | yes | One sentence: the big idea the string is building. |
| `keywords` | no | Class vocabulary for the strategy. |
| `connection` | no | How it builds on earlier strings. |
| `watchFor` | no | A list of likely mistakes or misconceptions, each with the question to ask. |
| `wrapUp` | no | What to ask at the end, and where to land. |
| `problems` | yes | The string itself, in order. Usually 5 to 8 problems. |

### Each problem

| Field | Required | What it is |
|---|---|---|
| `q` | yes | The problem exactly as students should see it, **without** "= ?". |
| `a` | yes | The correct answer (teacher only). **Double-check every answer.** |
| `optional` | no | `true` for problems to skip if short on time. The app shows a "Skip" button for these. |
| `notes` | no | Teacher-only prompts. Use this order: `Look for: … Ask: "…" Word choice: … Model: <tool> <input>` |

### How to write problems (`q`)

The app displays these nicely: stacked fractions, × and −, superscripts.

| Write | Students see |
|---|---|
| `38 + 9`, `100 - 76` | 38 + 9, 100 − 76 |
| `6 x 8` or `6 × 8` | 6 × 8 |
| `3/4 + 1/3` | stacked fractions |
| `1 1/2 x 4` | mixed number 1½ × 4 |
| `2^3 × 2^4` | exponents as superscripts |
| `24 / 6` (spaces around `/`) | 24 ÷ 6 |
| `-5 + 8` | negative numbers |

Keep `q` to the bare problem. No words like "Solve:".

---

## 4. The modeling tools and their inputs

In `notes`, suggest how to model the expected strategy using `Model: <tool> <input>`. The teacher can type that input straight into the tool. The tools also accept looser typing (`38 to 48 to 47`, `start 38, jump 10, back 1`, `62 - 49 up 1`, `1 to 7, 10 to 70`, `×`, `½`), but in plans use the forms below, which are the clearest.

| `tool` id | Best for | Input the teacher types | What it draws |
|---|---|---|---|
| `numberline` | Addition and subtraction, adding up, decimals, fractions, integers | `38 +10 -1` · `76 >80 >100` (jump *to*) · `0 +20x3` (3 jumps of 20) · `89 ~100` (show gap) · `@100` (mark a point) · `0 +1/4x3` | Open number line with labeled jumps. Fraction jumps get fraction labels. |
| `slide` | Constant difference (same difference) | `62 - 49 = 63 - 50` or `62 - 49 > +1` | Both numbers sliding together, the same gap marked |
| `givetake` | Give and take / compensation in addition | `49 + 26 = 50 + 25` or `49 + 26 > +1` | Bars showing the amount moving between the addends, total unchanged |
| `ratio` | Ratio tables, ×10 / ÷2 / doubling, proportional reasoning | `1:7, 10:70, 5:35, 15:?` (optional names first: `bags:apples, 1:7, ...`) | Ratio table with ×/÷ arrows between columns |
| `area` | Multiplication by place-value parts, over-and-back | `30+8 x 7` · `20+3 x 10+4` · `40-2 x 20` (or `40x20 - 2x20`) | Area model with partial products (and a hatched strip taken away) |
| `array` | Small multiplication, distributive property | `6 x 8` · `6 x 5+3` · `10-1 x 12` | Dot array, split or with a row/column crossed out |
| `halve` | Doubling and halving, ×3 ÷3 | `16 x 25 = 8 x 50 = 4 x 100` | Rectangle cut and rearranged at each step |
| `doubleline` | Rates, percents, unit rates | `miles:hours, 0:0, 60:1, 30:0.5, 150:2.5` | Double number line |
| `clock` | Fractions with denominators that divide 60 (2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60) | `1/4 + 1/3` · `3/4 - 1/6` · `1 1/2 - 1/4` | Shaded clock faces, in minutes |
| `bar` | Fraction of a quantity, part-whole, comparison | `3/4 of 24` · `24 = 10 + ?` · `Ana: 12; Ben: 12 + 5` | Tape / bar diagrams |
| `tiles` | Integer addition, subtraction, multiplication | `3 + -5` · `-2 - 4` · `3 - -2` · `3 x -2` · `-3 x 2` | Integer tiles (yellow +, red −) with zero pairs |
| `column` | A student who used the standard (column) algorithm | `38 + 9` · `100 - 76` · `2.5 + 1.9` · `38 x 7` · `24 x 13` | Stacked algorithm with carries, regrouping or partial products |
| `text` | Recording a student's words or an equation chain | `38 x 20 = 40 x 20 - 2 x 20 ; = 800 - 40` (`;` = new line) | Large text and equations |

Choose the string's `tool` as the model that best shows the **target strategy**, not just any model that works.

---

## 5. Planning guidelines

- **Follow the running log's structure.** Each day has a strategy, key words, a connection to earlier days, a string with Look for / Ask / Word choice for each problem, and a Watch For list.
- **Build each string around one strategy.** Start with a helper problem students can do quickly, then problems that lean on it, then one that stretches the strategy or asks students to predict.
- **Mark one or two problems `"optional": true`** so the teacher can shorten the string.
- **Check every answer.** Wrong answers in the file would mislead the teacher.
- **Never put student names** (or any student information) in a file. The app's name picker keeps class lists only in the teacher's browser.
- **Keep ids stable.** When revising, keep each string's `id` and return the **whole week's file** with the same file name. A revised file replaces the old one.

### Strings already in the library

Do not reuse these ids. Build on them where it makes sense.

| id | Week · Day | Title |
|---|---|---|
| `w1-d1-adding-near-a-ten` | Week 1 · Day 1 | Adding Near a Ten |
| `w1-d2-give-and-take` | Week 1 · Day 2 | Give and Take |
| `w1-d3-subtraction-as-distance` | Week 1 · Day 3 | Subtraction as Distance |
| `w1-d4-constant-difference` | Week 1 · Day 4 | Constant Difference |
| `w1-d5-choosing-a-strategy` | Week 1 · Day 5 | Choosing a Strategy |

(Week 1's older ids use `w1-` rather than `w01-`. Keep them as they are.)

The teacher's running log lists what comes next: decimal addition and subtraction strings, then multiplicative strings (× 10, × 5 as half of × 10, doubling and halving).

---

## 6. How the teacher loads your file (to tell them if they ask)

**Right away, on one computer:** open the app, click **Import**, and drop in the `.json` file. The strings appear in the library immediately.

**Permanently, on every computer:**
1. Go to https://github.com/gdrutz-blip/math-strings and open the **`strings`** folder.
2. Click **Add file** → **Upload files**, drag in the `.json` file, and click **Commit changes**.
3. In a minute or two the site updates. Every computer that opens the app gets the new strings.

To **revise** a week, upload the new file with the **same name**. GitHub replaces the old one.

If a file has a mistake in it, the site skips just that file, and the rest still works. So if new strings don't appear, the file probably needs fixing. Ask Claude to check it.
