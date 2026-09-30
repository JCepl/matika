# Matika

Small maths practice apps for primary school (preparation for the 5th-grade gymnasium entrance exams).
Plain HTML/JS, no build step, no server. Open `index.html` in a browser.

- `index.html`: hub with child profiles, the list of apps, and backup/restore
- `shared/`: code and styles used by every app (storage per profile, language, colours)
- `nasobilka/`: 1–10 times tables, "what do I already know?" map

Data is stored in the browser (localStorage) per device. Use the hub's backup button to move it between devices.

## Principles every app follows

1. **Measure quietly, never show a clock.** Time is recorded for the parent's map, but the child never sees a timer. Visible time pressure is a known source of maths anxiety.
2. **Automaticity is fast *and* correct recall.** A fact counts as automatic only when it is answered correctly in about 3 s or less across repeated attempts on different days, not after a single good answer.
3. **Judge on cold attempts.** Re-asks right after a mistake are practice, not evidence, so they don't count toward the colours.
4. **Mistakes lead to a correction, not a penalty.** The child sees the right answer, copies it once, and meets the fact again a few problems later.
5. **Keep the success rate high.** About 30 % of each round are facts the child already knows (interspersal), so a round is never a wall of failures.
6. **Keep rounds short and frequent.** 10–20 problems, several times a week, spaces practice over days.
7. **Praise progress, not speed.** Summaries show what newly became automatic.
