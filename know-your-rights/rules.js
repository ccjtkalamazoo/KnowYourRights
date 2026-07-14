// Know Your Rights · CCJT
// rules.js : the game's rules, with no UI attached.
//
// Everything here is a pure function or a constant. Nothing renders, nothing
// holds state. That means you can reason about (and later test) the game's logic
// without touching React.
//
// This is where the chapter/district system will eventually plug in: today
// buildDeck() deals from difficulty tiers, and a chapter version would deal from
// a chapter's pool instead. The engine wouldn't have to change.

import { R } from "./questions.js";

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


// Which difficulty tier each rung pulls from. 5 easy, 5 medium, 5 hard.
export const LADDER_TIERS = ["easy", "easy", "easy", "easy", "easy", "medium", "medium", "medium", "medium", "medium", "hard", "hard", "hard", "hard", "hard"];

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

// Deals a fresh 15-question run: 5 random from each tier, in ladder order.
// Every run is a different deck, which is why the game is replayable at all.
export const buildDeck = () => {
  const e = { easy: shuffle(R.questions.easy), medium: shuffle(R.questions.medium), hard: shuffle(R.questions.hard), expert: shuffle(R.questions.expert) };
  const t = { easy: 0, medium: 0, hard: 0, expert: 0 };
  return LADDER_TIERS.map((n) => {
    const r = e[n][t[n]];
    t[n] += 1;
    return shuffleOptions({ ...r, difficulty: n });
  });
};

// Randomizes which slot (A/B/C/D) the correct answer lands in.
// Source data always puts the correct answer at index 0 so authors don't have to
// think about placement; this is what makes that safe.
export const shuffleOptions = (e) => {
  const t = shuffle([0, 1, 2, 3]);
  const n = t.map((i) => e.options[i]);
  const r = t.indexOf(e.correct);
  const o = e.optionExplanations ? t.map((i) => e.optionExplanations[i]) : null;
  return { ...e, options: n, correct: r, optionExplanations: o };
};

// Builds the endless/bonus deck after a Q15 win: every question NOT already seen
// this run, shuffled. If somehow all have been seen, it falls back to the full
// bank so the bonus round still has something to serve.
export const buildEndlessDeck = (e) => {
  const t = new Set(e.map((i) => i.q));
  const n = [], r = [];
  ["easy", "medium", "hard", "expert"].forEach((i) => {
    (R.questions[i] || []).forEach((l) => {
      const s = { ...l, difficulty: i };
      if (t.has(l.q)) r.push(s); else n.push(s);
    });
  });
  const o = n.length > 0 ? n : r;
  return shuffle(o.map((i) => shuffleOptions(i)));
};

// ---------------------------------------------------------------------------
// The JURY lifeline
// ---------------------------------------------------------------------------
// Simulates a poll of other students. It is NOT real data (yet). The correct
// answer always keeps a plurality, but the margin narrows on harder questions,
// so the crowd is helpful without being an oracle.
//
// When the backend lands, this is the function that gets replaced by real
// aggregate answer data, and the JURY lifeline becomes a genuine "here is what
// people actually believe" readout.
export const simulateJury = (e, t = [], n = "medium") => {
  // e = correct index, t = removed indices, n = difficulty
  // Build a plausible audience poll where the correct answer keeps the plurality.
  const base = { easy: 72, medium: 58, hard: 46, expert: 38 }[n] || 50;
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
