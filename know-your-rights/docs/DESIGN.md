# Know Your Rights — Design Decisions

Everything below was decided deliberately. Where something is still open it says
so. Where a decision has a reason that is not obvious, the reason is written
down, because the reason is the part that gets forgotten.

Maintained by one person. Every choice here is biased toward "obvious in six
months to someone with no context" over "clever."

---

## 1. The districts

Eight, six chapters each, 48 chapters total. Live in `map.js` today as a
hardcoded array; moving to `content/<district>/meta.json` (see section 3).

| # | District | What it owns |
|---|----------|--------------|
| 1 | JUVENILE | What is different because you are under 17, and what changes when you are not |
| 2 | THE STOP | Detention. Am I free to go, reasonable suspicion, what you must give |
| 3 | THE ARREST | The transition into custody |
| 4 | WHAT YOU SAY | The Fifth. Silence, counsel, Miranda |
| 5 | THE BYSTANDER | When it is happening to someone else |
| 6 | JAIL | Booking through pretrial detention |
| 7 | THE COURTHOUSE | Arraignment through sentencing |
| 8 | AFTER THE CHARGE | Probation, fines, record, collateral consequences |

**Ordering.** 1 through 6 are roughly chronological through the system.
THE BYSTANDER and JUVENILE are off-arc. JUVENILE leads anyway because it is what
applies to the player today.

**Authoring priority:** JUVENILE, then THE STOP, then THE ARREST. The other five
are ordered but not scheduled.

**Not owned by any district: searches.** Currently spread across THE STOP,
THE ARREST, and THE BYSTANDER. The Fourth Amendment is deep enough to carry its
own district and is the likeliest ninth. The eight are not locked.

**Why districts are not places.** Earlier drafts used locations (THE SCHOOL,
THE PORCH, DOWNTOWN). Every one came out thin, because rights are organized by
*what is happening to you*, not *where you are standing*. A place-district is a
slice of three or four doctrines and owns none of them. Districts are now
moments in a process, and each owns something.

**Why JUVENILE is a district and not a chapter.** It duplicates topics found in
COURTHOUSE, JAIL, and AFTER THE CHARGE. That is accepted: the district is about
the *transitions* — what applies today vs at 17 vs charged as an adult — which
is a genuinely different question from "what is bail." Making the overlap
distinct is an authoring responsibility.

---

## 2. Content rules

- **30 questions** in a chapter's bank. **15 dealt** per quiz.
- **5 to 7 chapters** per district. All eight currently sit at 6.
- **Chapters are sequential** inside a district: clear chapter 1 to open 2.
  Districts themselves are free choice.
- Because chapters are sequential, **chapter order is a content constraint**, not
  just navigation. A chapter may rely on everything before it and must assume
  nothing after it.

### Difficulty is deleted

Not "unused" — **gone**. There is no easy/medium/hard tier, no per-question
difficulty field, no difficulty metadata for analytics. A quiz pulls 15 random
from the chapter's 30. Rationale: who is to say what a given person finds easy.

Consequences, all of which have to be handled:

- `buildDeck()` in `rules.js` currently deals 5 easy / 5 medium / 5 hard. Becomes
  15 random from one chapter pool.
- `LADDER_TIERS` in `rules.js` is deleted.
- `simulateJury()` keys its plurality off difficulty. Needs a fixed base, and is
  eventually replaced entirely by real aggregate data (section 5).
- The SKIP lifeline swaps for a question "of the same difficulty." That clause is
  meaningless now and needs rewriting.
- `musicStageFor()` keys off rung position, not difficulty. **Unaffected.**
- The ladder's $100 → $1M climb was designed around escalating difficulty. With a
  flat pool, the tension comes from the streak, not the question. **This is a
  real open design question**, noted in section 8.

The only difficulty that will ever exist is **empirical difficulty**: a question's
real correct-rate from aggregate play data. It cannot exist until there is play
data, which means the adaptive mode (section 6) starts cold.

### Total scale

48 chapters × 30 = **1,440 questions**. Current bank: 72, untagged, sorted only
by the difficulty tiers now being deleted. This is the critical path for the
whole project and it is authorship plus attorney review, not engineering.

---

## 3. File structure

Current state: one 130KB `questions.js` holding both the bank and all UI copy.
At 1,440 questions that file is ~2.5MB. Unworkable for load, editing, diffing,
and review.

Target:

```
content/
  schema/question.schema.json
  CONTENT.md                     authoring rules, written before questions
  tutorial.json                  the 10 gating questions
  juvenile/
    meta.json                    name, blurb, chapter order, slugs
    01-what-is-different.json    30 questions
    ...
  stop/
  ...
src/
  questions/copy.js              R — all UI text. Stays code.
  questions/loader.js            fetch + validate + cache
```

**Why JSON and not JS modules.** The questions have a long life: attorney review,
plain-language edits, translation, corrections when law changes, possibly other
jurisdictions. As JS objects, every one of those tasks needs someone who will not
break a trailing comma. As JSON with a schema, an attorney can review a file, a
translator can work from one, CI can validate all 1,440, and the content can
eventually be generated from a spreadsheet without touching the game.

**`meta.json` drives the map.** `map.js` stops hardcoding the district array and
reads from content. Adding a ninth district becomes adding a folder.

**JSON has no comments.** The authoring notes currently at the top of
`questions.js` move to `CONTENT.md`, which is written *before* the first question.

**Lazy loading.** One chapter is ~50KB. Dynamic-import only the chapter being
played instead of shipping the whole bank. This makes `buildDeck` async, which
ripples into `startGame()` in `engine.js` and needs a loading state between
picking a chapter and the first question. Retrofitting this later means touching
every import, so it is done now.

**The existing 72** stay working as a legacy chapter powering TRAINING GROUND so
the game keeps running while districts are authored.

---

## 4. Tracking

### Principles

Anonymous, session-scoped, no personal data, no device identity. CCJT owns all
data; nobody outside gets access without CCJT granting it; raw is never public.

A real caution that shaped several choices: **players are minors, often in
classrooms.** Granular behavioral records plus a known device and class period
are more identifying than they look. Durations stay coarse. No wall-clock
timestamps. No device fingerprinting, even for deduplication. No free-text input
ever, because it will eventually contain something personal.

### Identity

- **Session ID:** random UUID, generated client-side, **per run, not per device.**
  Per-device would mean storing an identifier, which contradicts the
  no-persistence posture. Consequence: a returning player is indistinguishable
  from a new one. Accepted.

### Time

- **Duration only.** Total time spent. No time of day, no wall-clock.
- **No idle cutoff.** A session that runs long is not truncated; the
  session-influence decay (section 5) handles outliers instead.

### What is recorded

Per answer:
- question ID, option ID chosen, correct or not
- if wrong, which wrong option
- time to first selection, and time from first selection to lock-in
  (reading time and deciding time are different signals)
- number of selection changes before lock-in

Per question, the **full ordered lifeline sequence** — which lifeline, at what
point in the question, and what it revealed. Not a flag. Rationale: "used
COUNSEL and got it right" is much weaker than "used 50/50, waited, then COUNSEL,
then answered correctly." For 50/50, *which two options were removed* matters —
if 50/50 usually leaves the correct answer beside the same wrong option, that
wrong option is the strongest misconception in the bank and probably deserves its
own question.

Also:
- shop actions (buying a lifeline reveals how a player values them)
- review card dwell time, and skips — the points system assumes the cards get
  read; this measures whether that is true
- abandonment point: which question, and whether mid-question or mid-review
- walkthrough abandonment
- chapter and district selection order — which districts young people pick first
  is itself a finding
- replays
- session shape: runs per session, duration, completion rate, ladder rung reached
- viewport / device class — tells you whether the no-scroll rule holds on real
  devices
- sound on/off

**Event schema carries a `version` stamp** so that when event types are added
later, old data stays interpretable. This is the actual answer to "I wish I had
tracked this six months ago" — not tracking everything now, but making the record
extensible.

### Deliberately not tracked

Anything approaching a device fingerprint. Any free-text field.

---

## 5. Aggregation and weighting

### Three layers

1. **Raw events** — append-only, never edited, never public. Where privacy risk
   concentrates.
2. **Aggregates** — generated on a schedule from raw. Per-question response
   distributions, per-misconception rates, per-chapter completion. Small and safe.
3. **Published datasets** — aggregates plus documentation: the question, what each
   option represented, response count, period, caveats. CSV and JSON, versioned,
   with a data dictionary.

The sharing story stays clean because raw is never published and the safe artifact
is the one already being generated for gameplay.

**Suppression floor:** 100 responses. Same number as the in-game display
threshold. Below it, nothing is published — standard practice in education data,
and it prevents a single classroom's aggregate from describing a specific group of
kids.

### In-game feedback

After a player **locks in** — never before — they see how their answer compared to
everyone else's.

**Why after, not before.** Showing the distribution first would influence the
choice, and the data would start measuring "what people were told others picked"
rather than what they believe. Showing it after preserves data integrity and is a
better moment anyway: it belongs with the review cards as a fourth piece of
feedback alongside the law, the phrase, and the scenario.

**Below 100 responses:** show synthetic percentages, unlabeled. Decided
deliberately. **Implementation requirement:** the fake distribution must be
seeded from the question ID so it is stable per question — otherwise a replaying
player sees different numbers for the same question and it reads as broken.

This also replaces `simulateJury()`, which is currently fake and whose own comment
says it gets replaced by real aggregate data. This is that replacement.

### The three axes

Weights are multipliers on **how much a response counts**, not on the answer
itself. A flagged response still says "this person picked C." The aggregate is a
weighted average rather than a raw count.

**Keep these axes separate. Do not collapse them into one number.**

**Axis 1 — Category (which pool).** Not a penalty. A hinted answer is perfectly
trustworthy data about "what people pick with a hint"; it is only untrustworthy as
data about "what people believe cold."

- unaided
- hint-assisted (COUNSEL or JURY — still a four-way choice)
- reduced-field (50/50 — a two-way choice, mechanically not comparable)

Public percentages come from unaided + hint-assisted. Reduced-field is kept
separate, because two options were literally unpickable and their shares would be
artificially depressed.

**Axis 2 — Trust.** "Do I doubt this reflects a real belief." This is where the
cheating signals live.

**Axis 3 — Session influence.** Representativeness: no single player should speak
for the population more than a little. A session's influence decays as it extends,
asymptoting toward a ceiling, so a 500-question marathon does not get 5× the
influence of a 100-question session.

Starting guess: ~100 questions / ~1 hour at full value, decaying after. **Numbers
are a guess until real data calibrates them.**

Applies only to the **district stream**, where a 6-hour session is genuinely
anomalous. TRAINING GROUND is designed for long sessions and is excluded anyway
(section 6).

**Replay decay** is its own thing: first play and third play of the same chapter
are not independent. Likely decaying rather than fixed — second play ~0.5, fifth
near zero.

### Two cautions

**Do not multiply penalties naively.** A response can be flagged for several
things at once. If every flag is a multiplier below 1, triple-flagged responses
collapse to near-zero fast, and most real classroom data is messy. Harsh stacking
means the "clean" aggregate becomes a tiny unrepresentative slice. Decide whether
flags stack or whether the single worst one dominates.

**Weights are config, not schema.** The events carry the *flags*. The weights are
tunable and should not be committed to until real data shows how much each flag
actually correlates with junk. 0.01 for cheating (Kaleb's "100 pure ≈ 10,000
cheated") is a reasonable starting guess, not a finding.

### Data-quality flagging, not cheating detection

Signals: answer times below plausible reading time, perfect runs with near-uniform
timing, rapid replay with improving scores, tab-visibility changes right before a
correct answer, impossible throughput.

**Framing matters.** There is no prize, no leaderboard, no grade. A kid who
googles "do police have to read Miranda at arrest" has just learned the thing the
game teaches — that is the best-case outcome, not a cheater. The only thing
"cheating" corrupts is the data. So this is data-quality weighting, it stays
internal, and it is not called cheating in the schema or the UI.

Never surfaced to a teacher. A flag visible to a teacher turns a learning tool
into a surveillance tool and would undercut both the game's premise and CCJT's
standing.

Rate limiting at ingest plus a per-session response cap handles automated
submission without any behavioral inference at all.

---

## 6. Two modes

### Districts — the measurement stream

Pure random selection, 15 from 30. This is the clean data and it stays clean.
Adaptive selection would contaminate it: per-question percentages would stop
meaning "what young people believe" and start meaning "what the algorithm served
to people it had already flagged as struggling." You cannot publish a
misconception rate for a question that was preferentially shown to people likely
to hold that misconception.

### TRAINING GROUND — the practice mode

Replaces the ALL RIGHTS placeholder. Not a stand-in for districts; a permanent
feature with its own reason to exist.

- No money, no ladder.
- No 15-in-a-row requirement.
- Wrong answer → click next. **No full restart.**
- Adaptive selection allowed, because nothing here feeds public aggregates.

Data is still captured, flagged as adaptive-mode, analyzed separately. That
separate stream is what answers whether the algorithm actually works — comparing
session length, return rate, and improvement between the two modes is an
experiment the architecture supports for free.

**It launches dumb.** The algorithm runs on empirical difficulty and misconception
codes, both of which need real aggregate volume. Early on TRAINING GROUND is just
random like everything else and grows into the feature.

**Open:** whether it needs its own progression hook. Districts have chapters,
clearing, the map filling in. An endless well-tuned stream may feel like
flashcards no matter how well balanced.

---

## 7. The adaptive algorithm (PINNED — not being built yet)

Recorded so the reasoning is not lost.

**Unit of adaptivity is the misconception, not the question.** This is why
`misconceptionCode` is in the schema. It lets the model reason at the level of
"this player holds the Miranda-at-arrest misconception" and select any question
addressing it, rather than tracking questions individually, which is brittle.

**Session-scoped only.** Adaptivity needs memory and there is no persistence.
In-session memory is fine and covers the real case (a kid replaying a chapter in
one sitting). It resets when they leave. Consistent with the privacy posture.

**Wrong answer → related, slightly easier question on the same concept.** Not the
same question again. Scaffold toward the idea rather than re-testing the failure.
Serving someone the questions they keep failing is how you frustrate them out of
the game.

**Explore/exploit:** ~80% serve what the model believes works, ~20% try something
new. The explore arm must be **genuinely random**, not "explore near what already
works" — otherwise the system gets very good at a local optimum and never finds a
better one.

### Guardrails — the important part

**Do not optimize for playtime.** If the reward is "what makes sessions longer,"
the system will discover that easy questions feel good and hard ones make people
quit, and it will drift toward a comfortable feed that maximizes minutes and
teaches nothing. Self-learning finds these exploits faster than a human tuning
weights would.

Reward function should be **learning** — movement on misconceptions, concept
coverage — with playtime as a *constraint* that keeps them present long enough to
learn, not the thing being maximized.

For a CCJT product: "our practice algorithm optimizes for learning, stays within
these limits, and we can audit it" is defensible. "Our algorithm maximizes how
long kids play" is not, even if the mechanics are identical.

Hard limits the optimizer cannot violate: never serve the same question twice in a
session, always cover the concept spread, cap how easy the feed can get. Plus
enough logging to see what it learned and roll it back. An optimizer that cannot
be inspected or reverted can drift into a bad state and you find out weeks later
from a metric.

**Combo detection is a late-stage capability.** Attributing session length to a
question *sequence* needs enough volume for confounds to wash out. Early on there
will not be enough data to separate signal from "it was Saturday."

---

## 8. Infrastructure

Nothing exists yet. No Cloudflare account. No data agreement. Kaleb is the sole
maintainer.

**Planned stack:** Cloudflare Workers (ingest) + D1 (raw events) + R2 (aggregate
files) + a scheduled Worker to aggregate. One vendor, generous free tier, and R2
has no egress fees, which matters if datasets get downloaded. The R2 aggregate
files serve both gameplay and publication.

**Real-time is not wanted — frequent-batch is.** The instinct is that a kid's
answer should immediately affect the percentage the next kid sees. But once a
question has real volume, one more answer moves the number by less than a point.
Nobody can perceive the difference between live data and hour-old data.

So: scheduled regeneration writes static JSON to R2; the game fetches those files,
cached at the edge. Writes are appends, reads are static files. **No live queries
during gameplay** — that is the thing that would cost money and break under a busy
classroom.

**Load reality check.** 30 kids answering once a minute is 0.5 requests/second.
Ten simultaneous classrooms is 5/second. With client-side event batching, one
classroom is a handful of requests per minute. This is inside free tiers for a
long time. Budget zero and revisit.

**Build order:** ingest endpoint + event schema first (the game needs to emit
correctly-shaped events while content is being written anyway), aggregation
second, publication last. Each layer is useful alone and none blocks content work.

**The real ongoing cost is maintenance, not hosting.** A database nobody queries
is a liability. The aggregation job needs to run. Someone needs a way to actually
look at the data.

---

## 9. Still open

1. **The tutorial's ten questions.** Unwritten. `state.js` gates the entire map
   behind them. Highest-stakes content decision in the project, because it is the
   only thing every single player is guaranteed to see. Also the thing JUVENILE
   leans on — that district teaches by contrast against a baseline, so either the
   tutorial carries the baseline or JUVENILE chapter 1 does.
2. **The ladder.** $100 → $1M across 15 rungs was designed around escalating
   difficulty, which no longer exists. Does prize escalation still make sense?
3. **Where the foundational invocation questions live** — silence, counsel, am I
   free to leave. They apply in every district. If they live only in WHAT YOU SAY,
   most players never see them. If duplicated, they are maintained in six places.
   Third option: they are the tutorial's ten, which resolves it cleanly and is the
   current leaning.
4. **Question schema specifics** — exact ID format, required fields, misconception
   code naming and who maintains the list.
5. **Whether flags stack multiplicatively** in the weighting model (section 5).
6. **TRAINING GROUND progression hook** (section 6).
7. **A ninth district for searches** (section 1).

---

## 10. What is already built

`map.js` ships the eight districts as a coming-soon shell with one live entry.
Icons are nine two-colour scene components referencing theme tokens, so a palette
skin recolours them automatically. A dark skin would need more than recolouring:
the icons draw dark outlines around light fills, so flipping light-to-dark needs
an outline token that contrasts against fill rather than a fixed ink colour.

Flow: start → walkthrough → map → playing. All end states return to the map.

When a district goes live: tag its questions, add a chapter deck builder to
`rules.js`, flip `live: true`, wire `state.js`. The card component already handles
the live state.
