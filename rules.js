// Know Your Rights · CCJT
// rules.js : the game's rules, with no UI attached.
//
// Everything here is a pure function or a constant. Nothing renders, nothing
// holds state. That means you can reason about (and later test) the game's logic
// without touching React.

// ---------------------------------------------------------------------------
// Lives
// ---------------------------------------------------------------------------
// Replaces the old one-wrong-and-out rule, and replaces the SHIELD lifeline,
// which was the same idea sold at a price nobody paid.
//
// The change came out of watching kids at the first event: 25 of 85 runs ended
// on question one, and the complaint was consistently about losing the whole
// round to a single miss. A miss should cost something. It should not end the
// conversation, because the review cards after a miss are the part that teaches.
export const LIVES_PER_ROUND = 3;

// How many questions a run deals. The demo is short on purpose: it exists to
// show somebody how the game works at a table with a line behind them, not to
// measure what they know. Fifteen was a five-minute commitment from a stranger.
export const DEMO_DECK_SIZE = 5;
export const CHAPTER_DECK_SIZE = 15;

// ---------------------------------------------------------------------------
// The ladder
// ---------------------------------------------------------------------------
// 15 rungs, doubling-ish, $100 to $1M. The money is symbolic (nobody is paid),
// but the climb is what makes a wrong answer late in a run hurt.
//
// With lives, the rung follows RIGHT ANSWERS rather than questions seen. A miss
// costs a life and moves you along; it does not move you up. That keeps the
// number on screen honest: it is what you have earned, not where you are
// standing.
export const LADDER = [
  { level: 1, prize: 100 }, { level: 2, prize: 200 }, { level: 3, prize: 300 },
  { level: 4, prize: 500 }, { level: 5, prize: 1e3 }, { level: 6, prize: 2e3 },
  { level: 7, prize: 4e3 }, { level: 8, prize: 8e3 }, { level: 9, prize: 16e3 },
  { level: 10, prize: 32e3 }, { level: 11, prize: 64e3 }, { level: 12, prize: 125e3 },
  { level: 13, prize: 25e4 }, { level: 14, prize: 5e5 }, { level: 15, prize: 1e6 }
];

// Music stage by level: 1 for Q1-5, 2 for Q6-10, 3 for Q11-15.
// The backing track gets faster and denser as the stakes rise.
export const musicStageFor = (e) => e < 5 ? 1 : e < 10 ? 2 : 3;

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
export const fmtMoney = (e) => "$" + e.toLocaleString("en-US");
export const fmtMoneyShort = (e) => e >= 1e6 ? "$" + e / 1e6 + "M" : e >= 1e3 ? "$" + e / 1e3 + "K" : "$" + e;

// ---------------------------------------------------------------------------
// Shuffling and deck building
// ---------------------------------------------------------------------------
// Fisher-Yates. Returns a new array; never mutates the input.
export const shuffle = (e) => {
  const t = [...e];
  for (let n = t.length - 1; n > 0; n--) {
    const r = Math.floor(Math.random() * (n + 1));
    [t[n], t[r]] = [t[r], t[n]];
  }
  return t;
};

// Deals a run from a chapter's bank. Size is a parameter now rather than a
// hard 15, because the demo deals 5 from the same code path.
//
// If a pool is smaller than the requested size, you get the whole pool. That is
// deliberate: a short chapter should deal a short run rather than throw.
export const buildDeck = (chapter, size = CHAPTER_DECK_SIZE) =>
  shuffle(chapter.questions).slice(0, size).map(shuffleOptions);

// Randomizes which slot (A/B/C/D) the correct answer lands in.
// Source data always puts the correct answer at index 0 so authors don't have to
// think about placement; this is what makes that safe.
export const shuffleOptions = (e) => {
  const t = shuffle([0, 1, 2, 3]);
  const pick = (arr) => (arr ? t.map((i) => arr[i]) : null);
  // Every per-option array is permuted by the SAME order, so text, explanation,
  // permanent id, and misconception code stay attached to each other. Because
  // optionIds comes out of here ALREADY in display order, events.js indexes it
  // with the display index directly. Converting to an authored index first was
  // the bug that made every option-level number unusable.
  return {
    ...e,
    options: pick(e.options),
    correct: t.indexOf(e.correct),
    optionExplanations: pick(e.optionExplanations),
    optionIds: pick(e.optionIds),
    misconceptions: pick(e.misconceptions),
    order: t
  };
};

// Builds the endless/bonus deck after clearing a chapter run: every question in
// the chapter NOT already dealt this run, shuffled. If somehow all were seen, it
// falls back to the whole chapter so the bonus round still has something to
// serve.
export const buildEndlessDeck = (seen, chapter) => {
  const dealt = new Set(seen.map((q) => q.id || q.q));
  const fresh = [], repeats = [];
  (chapter ? chapter.questions : []).forEach((q) => {
    if (dealt.has(q.id || q.q)) repeats.push(q); else fresh.push(q);
  });
  const pool = fresh.length > 0 ? fresh : repeats;
  return shuffle(pool.map(shuffleOptions));
};
