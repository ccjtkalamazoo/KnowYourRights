// Know Your Rights · CCJT
// rules.js : the game's rules, with no UI attached.
//
// Everything here is a pure function or a constant. Nothing renders, nothing
// holds state. That means you can reason about (and later test) the game's logic
// without touching React.
//
// This is where the chapter/district system will eventually plug in: today
// buildDeck() deals 15 at random from the whole bank, and a chapter version
// would deal 15 from that chapter's 30 instead. The engine wouldn't change.


// ---------------------------------------------------------------------------
// The ladder
// ---------------------------------------------------------------------------
// 15 rungs, doubling-ish, $100 to $1M. The money is symbolic (nobody is paid),
// but the climb is what makes a wrong answer at Q14 hurt.
export const LADDER = [
  { level: 1, prize: 100 }, { level: 2, prize: 200 }, { level: 3, prize: 300 },
  { level: 4, prize: 500 }, { level: 5, prize: 1e3 }, { level: 6, prize: 2e3 },
  { level: 7, prize: 4e3 }, { level: 8, prize: 8e3 }, { level: 9, prize: 16e3 },
  { level: 10, prize: 32e3 }, { level: 11, prize: 64e3 }, { level: 12, prize: 125e3 },
  { level: 13, prize: 25e4 }, { level: 14, prize: 5e5 }, { level: 15, prize: 1e6 }
];


// Lifeline prices, in points earned from reading review cards.
// Skip is cheapest (least powerful), Shield is dearest (survives a wrong answer).
export const LIFELINE_PRICES = { skip: 4, hint: 6, poll: 10, fifty: 16, shield: 24 };

// Music stage by level: 1 for Q1-5, 2 for Q6-10, 3 for Q11-15.
// The backing track gets faster and denser as the stakes rise.
export const musicStageFor = (e) => e < 5 ? 1 : e < 10 ? 2 : 3;

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
// fmtMoney: full dollars with commas. fmtMoneyShort: compact ($1M, $32K) for the ladder rail.
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

// Deals a fresh 15-question run from a chapter's 30.
// There are no difficulty tiers. Who is to say what a given person finds easy,
// so a run is a random draw and the tension comes from the streak, not from a
// curve someone else decided. Fifteen of thirty means every run is a different
// deck, which is what makes a chapter worth replaying.
export const buildDeck = (chapter) =>
  shuffle(chapter.questions).slice(0, 15).map(shuffleOptions);

// Randomizes which slot (A/B/C/D) the correct answer lands in.
// Source data always puts the correct answer at index 0 so authors don't have to
// think about placement; this is what makes that safe.
export const shuffleOptions = (e) => {
  const t = shuffle([0, 1, 2, 3]);
  const pick = (arr) => (arr ? t.map((i) => arr[i]) : null);
  // Every per-option array is permuted by the SAME order, so text, explanation,
  // permanent id, and misconception code stay attached to each other.
  // order[displayIndex] = authored index, which is how events report a choice
  // by its authored identity rather than where it happened to appear.
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

// Builds the endless/bonus deck after a Q15 win: every question in the chapter
// NOT already dealt this run, shuffled. With 30 in a chapter and 15 dealt, that
// is the other 15. If somehow all were seen, it falls back to the whole chapter
// so the bonus round still has something to serve.
export const buildEndlessDeck = (seen, chapter) => {
  const dealt = new Set(seen.map((q) => q.id || q.q));
  const fresh = [], repeats = [];
  (chapter ? chapter.questions : []).forEach((q) => {
    if (dealt.has(q.id || q.q)) repeats.push(q); else fresh.push(q);
  });
  const pool = fresh.length > 0 ? fresh : repeats;
  return shuffle(pool.map(shuffleOptions));
};

// ---------------------------------------------------------------------------
// The JURY lifeline
// ---------------------------------------------------------------------------
// Simulates a poll of other students. It is NOT real data. The correct answer
// always keeps a plurality, so the crowd is helpful without being an oracle.
//
// The margin used to widen or narrow by difficulty tier. Difficulty is gone, so
// this is a single fixed base. That makes the fake poll less interesting, which
// is fine: it is a placeholder. When the backend lands this function is replaced
// by real aggregate answer data and JURY becomes a genuine "here is what people
// actually believe" readout, keyed per question rather than guessed.
export const simulateJury = (e, t = []) => {
  // e = correct index, t = removed indices
  // Build a plausible audience poll where the correct answer keeps the plurality.
  const base = 58;
  const result = [0, 0, 0, 0];
  const wrong = [0, 1, 2, 3].filter((v) => v !== e && !t.includes(v));

  if (wrong.length === 0) { result[e] = 100; t.forEach((v) => (result[v] = 0)); return result; }

  // correct answer's share; ensure it stays above an even split of the wrong pool
  let correctShare = base;
  const remaining = 100 - correctShare;
  // give each wrong answer a random weight, then normalize to the remaining pool
  const weights = wrong.map(() => 0.35 + Math.random());
  const wsum = weights.reduce((a, b) => a + b, 0);
  let assigned = 0;
  wrong.forEach((idx, k) => {
    let share = Math.round((weights[k] / wsum) * remaining);
    result[idx] = share;
    assigned += share;
  });
  // reconcile rounding into the correct answer so the total is exactly 100
  correctShare = 100 - assigned;
  result[e] = correctShare;

  // guarantee the correct answer is a strict plurality: if any wrong share ties or
  // exceeds it, shave the biggest offender(s) down and give it back to correct
  let guard = 0;
  while (guard++ < 8) {
    const maxWrong = Math.max(...wrong.map((i) => result[i]));
    if (result[e] > maxWrong) break;
    const bigIdx = wrong.find((i) => result[i] === maxWrong);
    const take = (maxWrong - result[e]) + 1 + Math.floor(Math.random() * 2);
    const shave = Math.min(take, result[bigIdx]);
    result[bigIdx] -= shave;
    result[e] += shave;
  }
  t.forEach((v) => (result[v] = 0));
  return result;
};
