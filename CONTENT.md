# Writing Questions

Read this before writing a question. It is the difference between 1,440
consistent questions and 1,440 individual judgment calls.

The audience is middle and high school students. Assume no legal background,
assume a real chance the reader is nervous about the topic, and assume the thing
they take away is one sentence, not a paragraph.

---

## The hard rules

These are enforced by `schema/question.schema.json` and checked in CI. A file
that breaks one of them does not merge.

1. **Exactly four options.**
2. **The correct answer is authored at index 0. Always.** The game shuffles
   option positions at runtime, so authors never think about placement. Do not
   try to vary it manually; you will only break the shuffle's assumptions.
3. **Every wrong option needs an explanation.** The correct option's explanation
   is `null`. A wrong answer with no explanation is a wasted teaching moment,
   which is where most of the learning in this game actually happens.
4. **No em dashes.** Anywhere. Use a comma, a period, or a colon.
5. **Reading level: 8th grade or below.** Short sentences. Common words. If a
   legal term is unavoidable, define it in the same sentence.
6. **Every question has a stable `id` that is never reused.** See below.
7. **Every option has a stable `id`.** See below.
8. **Every wrong option carries a `misconceptionCode`.** See below.
9. **Attorney review is a hard launch gate.** No question reaches a student
   without `reviewedBy` and `reviewedAt` filled in.

---

## What a question is made of

Beyond the four options, each question carries four teaching fields. They are not
decoration; they are the reason the game works.

**`hint`** — what the COUNSEL lifeline shows. It should point at the reasoning,
not the answer. "A right the officer can't tell you're using doesn't protect you
yet. How do you make it clear?" is a good hint: it reframes the question without
giving it away.

**`principle`** — the law, in plain language, in two to four sentences. Name the
case if there is one, but never lead with it. Lead with the rule, then say where
it comes from. This is the review card the player reads after answering.

**`keyPhrase`** — the actual words to say out loud, plus a one-line gloss. This is
the most practically useful field in the whole bank. A student who remembers
nothing else should remember a sentence they can say. Keep it short enough to
recall under stress.

**`scenario`** — a concrete situation where this comes up. Specific beats
abstract: a school hallway, a car at night, a knock at the door.

---

## IDs

**Question ID format:** `<district>.<chapter>.<number>`

Examples: `stop.03.007`, `juvenile.01.014`, `tutorial.005`

- District and chapter slugs come from `meta.json`. Chapter is zero-padded to two
  digits, question number to three.
- **IDs are permanent.** They survive rewording, reordering, and rewriting.
- **IDs are never reused.** If a question is retired, its ID retires with it.

**Why this matters more than it looks.** Analytics identify questions by ID. If a
question is inserted and everything after it shifts, every historical record
silently points at the wrong question. Positional identity corrupts data quietly,
which is the worst way for data to be wrong.

**Option ID format:** the question ID plus a letter: `stop.03.007.a` through `.d`.

**Letters are assigned at authoring time and do not move.** The game shuffles
display order, so "they picked the third one" is meaningless across sessions.
"They picked `stop.03.007.c`" is meaningful forever. Option `a` is the correct
answer, since the correct answer is authored at index 0.

**`version`** starts at 1 and increments on any edit to the question text or
options. It lets analysis separate "before the rewrite" from "after," which is how
you find out whether a confusing question got clearer.

---

## Misconception codes

Every wrong option gets one. This is the single most valuable field in the bank
and the one most likely to be skipped, so here is why it exists.

A misconception code names **the false belief the distractor is testing**. Not the
wrong answer, the wrong belief underneath it.

With codes, you can say "34% of young people believe police must read Miranda at
arrest" across the entire bank. Without them, you can only say "62% got question
`arrest.02.011` wrong," which is a fact about a question, not about people.

The adaptive practice mode also reasons at this level: it models "this player
holds `silence_is_automatic`" and can serve any question that addresses it. Per-
question tracking is too brittle for that.

### Format

`snake_case`, describing the belief, not the topic. The list is maintained in
`content/schema/misconceptions.json` and codes are added by editing that file, not
by inventing one inline. A code used in a question but missing from the list fails
validation.

### Starting vocabulary

Extracted from the existing 72 questions, where several of these already recur
across multiple questions. This is a starting point, not a closed set.

**Silence and counsel**
- `silence_is_automatic` — going quiet counts as invoking the right (it does not;
  *Berghuis v. Thompkins*)
- `partial_answers_are_safe` — answering the small questions but not the big ones
  is a safe middle ground
- `my_side_helps` — explaining your side clears things up
- `talking_earns_leniency` — cooperating gets you a break
- `unclear_request_counts` — "maybe I should get a lawyer" is enough
  (*Davis v. United States*)
- `no_money_no_lawyer` — you only get a lawyer if you can pay
- `miranda_at_arrest` — the warning is required the moment you are arrested
- `booking_needs_miranda` — routine booking questions are interrogation

**Consent and searches**
- `nothing_to_hide` — refusing a search implies guilt (recurs constantly; probably
  the most common misconception in the bank)
- `refusal_implies_guilt` — saying no can be used against you
- `police_can_always_search` — a request is really a command
- `partial_consent_is_safe` — agreeing to "just a look" limits the search
- `opening_it_yourself_is_different` — showing them is not consenting
- `everything_needs_a_warrant` — plain view does not exist
- `holding_phone_means_reading_it` — seizing a phone permits searching it
  (*Riley v. California*)
- `roommate_can_consent_to_anything` — anyone in the home can consent to your
  private space

**Stops and detention**
- `nerves_are_suspicion` — being nervous justifies a stop
- `police_can_hold_anyone` — detention needs no reason
- `must_always_give_name` — you must identify on demand (Michigan differs)
- `id_law_is_national` — ID rules are the same everywhere
- `passenger_has_driver_duties` — passengers must produce ID like drivers
- `frisk_opens_everything` — a pat-down permits a full search
- `can_refuse_to_exit` — you can decline an order to step out
  (*Mimms* / *Wilson*)

**Resisting and escalation**
- `illegal_stop_means_resist` — an unlawful stop can be physically refused
- `violation_means_self_help` — a rights violation can be stopped on the spot
- `being_right_helps_now` — arguing the law on the street works

**Home and door**
- `must_open_the_door` — a knock obligates you to open
- `talking_at_open_door_is_safe` — opening up is not consent to enter
- `stepping_outside_is_neutral` — leaving the home costs nothing

**School**
- `school_matches_street` — schools need what police need (they need less;
  *New Jersey v. T.L.O.*)
- `sro_is_off_the_record` — a school setting makes it casual

**Recording**
- `filming_needs_permission` — you must be allowed to record
- `must_be_on_own_property` — public sidewalks do not count
- `any_dispersal_order_is_lawful` — disliking a camera is a lawful reason
- `private_recording_is_always_ok` — keeping it private makes it legal

**Juvenile**
- `adult_age_is_17` — the old Michigan rule, changed October 1, 2021 (this one is
  actively wrong in most people's heads and worth several questions)

### Writing good distractors

The best wrong answer is one a smart, reasonable person would pick. If a
distractor is obviously wrong, it teaches nothing and wastes a quarter of the
question.

A distractor should be a belief someone actually holds, which is why every one
needs a code. If you cannot name the false belief, the distractor is probably
filler and the question needs rework.

---

## Chapter structure

- **30 questions per chapter.** The game deals 15.
- **No difficulty tiers.** There is no easy/medium/hard, no difficulty field, and
  no attempt to balance a chapter by difficulty. A quiz pulls 15 at random. Who is
  to say what a given person finds easy.
- **Chapters are sequential within a district.** Chapter 3 may rely on anything
  taught in chapters 1 and 2, and must assume nothing from chapter 4. This is a
  real authoring constraint, not just navigation: write chapter 1 as though the
  reader knows nothing.
- **Districts are free choice.** A chapter may not assume another district has
  been played.

### Avoiding sameness

The failure mode at 30 questions per chapter is thirty rephrasings of one idea. If
a chapter's questions are the same doctrine with a different noun swapped in, the
chapter is too narrow and should merge with its neighbour.

A useful test: if two questions share a misconception code and a key phrase, they
are probably the same question twice.

---

## Review workflow

1. Author writes the chapter. `reviewedBy` and `reviewedAt` stay empty.
2. Schema validation runs in CI on every commit.
3. Attorney reviews the chapter file. JSON is readable without touching code,
   which is the entire reason the content lives in JSON.
4. `reviewedBy` and `reviewedAt` are filled in.
5. Only then can the district's `live` flag flip in `meta.json`.

**A chapter with unreviewed questions cannot ship.** The review fields exist so
that is checkable at a glance rather than remembered.

---

## Michigan specificity

Some rules are state-specific and differ from what students absorb from national
television. Michigan is not a stop-and-identify state. The juvenile age changed in
2021. Where a Michigan rule differs from the common assumption, that gap is worth
a question, because the misconception is doing real work in people's heads.

Where a rule is federal, say so, so the content travels if the game is ever used
outside Michigan.
