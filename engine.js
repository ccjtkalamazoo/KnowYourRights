// Know Your Rights · CCJT
// engine.js : the quiz. Every screen, plus the state machine that drives them.
//
// The whole game is one component (App) holding all the state, rendering one of
// six screens depending on `phase`:
//
//   start       the title screen
//   walkthrough the 10-step tutorial (safety brief first)
//   playing     a question is live, waiting for a pick
//   locking     answer locked, suspense pause before the reveal
//   revealing   the verdict beat, then the three review cards
//   winbig      the Q15 celebration + take-the-money-or-keep-going choice
//   gameover    a miss ended the run
//   won         the run is over (banked the prize, or cleared the bonus deck)
//
// The suspense pause in `locking` is deliberate and scales with the stakes:
// 1.5s early, 3s mid, 5s late, and a full 7s on Q15. That silence is most of
// what makes locking in an answer feel like a decision.

import { c, u, C, U, useState, useEffect, useRef, injectStyles } from "./theme.js";
import { R } from "./questions.js";
import {
  LADDER, LADDER_TIERS, LIFELINE_PRICES, musicStageFor,
  fmtMoney, fmtMoneyShort, shuffle, buildDeck, shuffleOptions,
  buildEndlessDeck, simulateJury
} from "./rules.js";
import { Shell, Button, Backdrop, ConfirmModal, Confetti, LifeIcon } from "./ui.js";
import { SfxEngine, MusicEngine } from "./audio.js";

// ===========================================================================
// App : all game state lives here.
// ===========================================================================
export function App() {
  const [phase, setPhase] = useState("start"); // start|walkthrough|playing|locking|revealing|gameover|won
  const [walkStep, setWalkStep] = useState(0);
  const [deck, setDeck] = useState([]);
  const [level, setLevel] = useState(0);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [revealCorrect, setRevealCorrect] = useState(false);
  const [revealWrong, setRevealWrong] = useState(false);
  const [showFloating, setShowFloating] = useState(false);
  const [streak, setStreak] = useState(0);
  const [lifelines, setLifelines] = useState({ fifty: true, poll: true, hint: true, shield: false, skip: false });
  const [shieldArmed, setShieldArmed] = useState(false);
  const [usage, setUsage] = useState({ fifty: 0, poll: 0, hint: 0, shield: 0, skip: 0 });
  const [pointsSpent, setPointsSpent] = useState(0);
  const [removedAnswers, setRemovedAnswers] = useState([]);
  const [juryResults, setJuryResults] = useState(null);
  const [hintShown, setHintShown] = useState(false);
  const [pendingLifeline, setPendingLifeline] = useState(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [homeConfirm, setHomeConfirm] = useState(false);
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [skipConfirmed, setSkipConfirmed] = useState(false);
  const [points, setPoints] = useState(0);
  const [isEndless, setIsEndless] = useState(false);
  const [finalPrize, setFinalPrize] = useState(0);
  const [bestRun, setBestRun] = useState(0);
  const [muted, setMuted] = useState(false);
  const [screenFlash, setScreenFlash] = useState(null);
  const [screenShake, setScreenShake] = useState(false);

  const sfx = useRef(null);
  const music = useRef(null);
  const audioCtx = useRef(null);
  const prevAffordable = useRef(false);

  if (sfx.current === null) sfx.current = new SfxEngine();
  if (music.current === null) music.current = new MusicEngine();

  // Fonts + stylesheet go into <head> once, on mount. The actual CSS lives in
  // theme.js, which is what makes a future skin system a token swap rather than
  // a rewrite.
  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    sfx.current.setMuted(muted);
    music.current.setMuted(muted);
  }, [muted]);

  // threshold chime: fire when points cross into "can afford cheapest lifeline"
  useEffect(() => {
    const cheapest = Math.min(LIFELINE_PRICES.hint, LIFELINE_PRICES.poll, LIFELINE_PRICES.fifty);
    const canAfford = points >= cheapest;
    if (canAfford && !prevAffordable.current && phase !== "start" && points > 0) {
      sfx.current.lifelineThreshold();
    }
    prevAffordable.current = canAfford;
  }, [points, phase]);

  const initAudio = () => {
    if (audioCtx.current === null) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx.current = new AC();
      } catch {}
    }
    if (audioCtx.current) {
      sfx.current.init(audioCtx.current);
      music.current.init(audioCtx.current);
    }
  };

  const resetState = () => {
    setDeck([]); setLevel(0); setSelected(null); setLocked(false);
    setRevealCorrect(false); setRevealWrong(false); setShowFloating(false);
    setStreak(0); setLifelines({ fifty: true, poll: true, hint: true, shield: false, skip: false });
    setShieldArmed(false); setUsage({ fifty: 0, poll: 0, hint: 0, shield: 0, skip: 0 }); setPointsSpent(0);
    setRemovedAnswers([]); setJuryResults(null); setHintShown(false);
    setPendingLifeline(null); setShopOpen(false); setHomeConfirm(false); setSkipConfirm(false);
    setPoints(0); setIsEndless(false); setFinalPrize(0);
  };

  const goWalkthrough = () => { initAudio(); sfx.current.click(); setWalkStep(0); setPhase("walkthrough"); };
  const playAgain = () => { initAudio(); sfx.current.click(); startGame(); };
  const startGame = () => {
    resetState();
    setDeck(buildDeck());
    setPhase("playing");
    setTimeout(() => { music.current.start(); music.current.setStage(1); }, 200);
  };

  const currentQ = deck[level];
  const rung = LADDER[level] || { level: level + 1, prize: LADDER[LADDER.length - 1].prize };
  const difficulty = (currentQ && currentQ.difficulty) || LADDER_TIERS[level] || "hard";
  const stage = isEndless ? 3 : musicStageFor(level);

  const enterEndless = () => {
    sfx.current.click();
    const extra = buildEndlessDeck(deck);
    setFinalPrize(LADDER[LADDER.length - 1].prize);
    setBestRun((b) => Math.max(b, LADDER[LADDER.length - 1].prize));
    setDeck([...deck, ...extra]);
    setIsEndless(true);
    setLevel(15);
    setSelected(null); setLocked(false); setRevealCorrect(false); setRevealWrong(false);
    setShowFloating(false); setRemovedAnswers([]); setJuryResults(null); setHintShown(false);
    setPhase("playing");
  };

  const onSelect = (idx) => {
    if (phase !== "playing") return;
    if (removedAnswers.includes(idx)) return;
    sfx.current.select();
    setSelected(idx);
  };

  const onLockIn = () => {
    if (selected === null) return;
    const s = stage;
    sfx.current.lockIn(s);
    sfx.current.duck(0.4, 200);
    music.current.duck(s === 1 ? 0.18 : s === 2 ? 0.3 : 0.4, 200);
    setLocked(true);
    setPhase("locking");
    setTimeout(() => {
      sfx.current.unduck(150);
      sfx.current.reveal();
      if (selected === currentQ.correct) {
        setRevealCorrect(true); setShowFloating(true);
        setStreak((v) => v + 1);
        setScreenFlash("warm");
        setTimeout(() => setScreenFlash(null), 600);
        setTimeout(() => sfx.current.correct(s), 160);
        setPhase("revealing");
        music.current.unduck(800);
      } else if (shieldArmed) {
        // shield takes the hit: cross off this wrong choice, let them pick again
        setShieldArmed(false);
        setRemovedAnswers((prev) => prev.includes(selected) ? prev : [...prev, selected]);
        setSelected(null);
        setLocked(false);
        setScreenFlash("warm");
        setTimeout(() => setScreenFlash(null), 600);
        sfx.current.lifeline();
        setTimeout(() => sfx.current.select(), 180);
        setPhase("playing");
        music.current.unduck(600);
      } else {
        setRevealWrong(true);
        setScreenFlash("red");
        setScreenShake(true);
        setTimeout(() => setScreenFlash(null), 600);
        setTimeout(() => setScreenShake(false), 500);
        setTimeout(() => sfx.current.wrong(), 150);
        setFinalPrize(0);
        setPhase("revealing");
        music.current.duck(0.12, 400);
      }
    }, (!isEndless && level === LADDER.length - 1) ? 7000 : s === 1 ? 1500 : s === 2 ? 3000 : 5000);
  };

  const advance = () => {
    sfx.current.click();
    if (revealWrong) { music.current.stop(); setPhase("gameover"); return; }
    if (!isEndless && level === LADDER.length - 1) {
      setFinalPrize(LADDER[level].prize);
      setBestRun((v) => Math.max(v, LADDER[level].prize));
      setPhase("winbig");
      music.current.duck(0.12, 400);
      return;
    }
    const next = level + 1;
    if (isEndless && next >= deck.length) {
      setPhase("won");
      setTimeout(() => sfx.current.win(), 200);
      setTimeout(() => music.current.stop(), 200);
      return;
    }
    const nextStage = isEndless ? 3 : musicStageFor(next);
    setLevel(next);
    setSelected(null); setLocked(false); setRevealCorrect(false); setRevealWrong(false);
    setShowFloating(false); setRemovedAnswers([]); setJuryResults(null); setHintShown(false);
    if (nextStage !== stage) music.current.setStage(nextStage);
    setPhase("playing");
  };

  const openShop = () => { if (phase !== "playing") return; sfx.current.modalOpen(); setShopOpen(true); };
  const closeShop = () => { sfx.current.click(); setShopOpen(false); };
  const requestLifeline = (k) => { if (phase !== "playing") return; setShopOpen(false); sfx.current.modalOpen(); setPendingLifeline(k); };
  const cancelLifeline = () => { sfx.current.click(); setPendingLifeline(null); };

  // swap the current question for another of the same difficulty not in this run's deck.
  // returns true if a swap happened. with a thin bank this can be false; guarded in confirmLifeline.
  const skipQuestion = () => {
    const diff = (currentQ && currentQ.difficulty) || LADDER_TIERS[level] || "hard";
    const seenQs = new Set(deck.map((q) => q.q));
    const poolRaw = (R.questions[diff] || []).filter((q) => !seenQs.has(q.q));
    if (poolRaw.length === 0) return false;
    const picked = shuffleOptions({ ...shuffle(poolRaw)[0], difficulty: diff });
    setDeck((prev) => { const copy = prev.slice(); copy[level] = picked; return copy; });
    setSelected(null); setRemovedAnswers([]); setJuryResults(null); setHintShown(false);
    return true;
  };
  // is a same-tier swap currently available? (used to avoid charging skip for a no-op)
  const canSkipNow = () => {
    const diff = (currentQ && currentQ.difficulty) || LADDER_TIERS[level] || "hard";
    const seenQs = new Set(deck.map((q) => q.q));
    return (R.questions[diff] || []).some((q) => !seenQs.has(q.q));
  };

  const applyLifeline = (k) => {
    if (k === "fifty") {
      sfx.current.lifeline();
      const wrong = [0, 1, 2, 3].filter((x) => x !== currentQ.correct);
      const toRemove = shuffle(wrong).slice(0, 2);
      setRemovedAnswers(toRemove);
      if (selected !== null && toRemove.includes(selected)) setSelected(null);
    } else if (k === "poll") {
      sfx.current.lifeline();
      setJuryResults(simulateJury(currentQ.correct, removedAnswers, difficulty));
    } else if (k === "hint") {
      sfx.current.lifeline();
      setHintShown(true);
    } else if (k === "shield") {
      sfx.current.lifeline();
      setShieldArmed(true);
    } else if (k === "skip") {
      sfx.current.lifeline();
      skipQuestion();
    }
  };

  const confirmLifeline = () => {
    const k = pendingLifeline;
    setPendingLifeline(null);
    if (!k) return;
    // skip with nothing to swap to: don't charge, don't consume (thin-bank safety)
    if (k === "skip" && !canSkipNow()) { sfx.current.click(); return; }
    const bumpUsage = () => setUsage((s) => ({ ...s, [k]: s[k] + 1 }));
    if (lifelines[k]) {
      // free use of a starting lifeline (only fifty/poll/hint start available)
      applyLifeline(k);
      bumpUsage();
      setLifelines((s) => ({ ...s, [k]: false }));
    } else {
      const price = LIFELINE_PRICES[k];
      if (points >= price) {
        sfx.current.purchase();
        setPoints((p) => p - price);
        setPointsSpent((p) => p + price);
        applyLifeline(k);
        bumpUsage();
      }
    }
  };

  // ---- points earned from reading review cards (one per card, max 3 per question) ----
  const earnCardPoint = (seg) => {
    setPoints((p) => p + 1);
    sfx.current.cardPointEarn(seg);
  };

  const openSkipConfirm = () => {
    if (skipConfirmed) { doSkip(); return; }
    sfx.current.modalOpen();
    setSkipConfirm(true);
  };
  const cancelSkip = () => { sfx.current.click(); setSkipConfirm(false); };
  const doSkip = () => { sfx.current.click(); setSkipConfirm(false); setSkipConfirmed(true); advance(); };

  const askHome = () => {
    if (phase === "start" || phase === "gameover" || phase === "won" || phase === "winbig") return;
    sfx.current.modalOpen();
    setHomeConfirm(true);
  };
  const cancelHome = () => { sfx.current.click(); setHomeConfirm(false); };
  const confirmHome = () => { sfx.current.click(); setHomeConfirm(false); music.current.stop(); resetState(); setPhase("start"); };

  // after the big win celebration: take the money (end) or keep going (bonus round)
  const winTakeMoney = () => { sfx.current.click(); music.current.stop(); setPhase("won"); };
  const winKeepGoing = () => { sfx.current.click(); enterEndless(); };

  const walkNext = () => { sfx.current.click(); if (walkStep < R.walkthrough.length - 1) setWalkStep(walkStep + 1); else startGame(); };
  const walkPrev = () => { sfx.current.click(); if (walkStep > 0) setWalkStep(walkStep - 1); };
  const walkSkip = () => { sfx.current.click(); startGame(); };

  if (phase === "start")
    return c.jsx(Shell, { muted, setMuted, children: c.jsx(StartScreen, { onPlay: goWalkthrough, bestRun }) });

  if (phase === "walkthrough")
    return c.jsx(Shell, { muted, setMuted, children: c.jsx(WalkScreen, { step: walkStep, total: R.walkthrough.length, screen: R.walkthrough[walkStep], onNext: walkNext, onPrev: walkPrev, onSkip: walkSkip, isLast: walkStep === R.walkthrough.length - 1, canPrev: walkStep > 0 }) });

  if (phase === "winbig")
    return c.jsx(Shell, { muted, setMuted, hideSoundButton: true, children: c.jsx(WinBigScreen, {
      prize: LADDER[LADDER.length - 1].prize, usage, pointsSpent, pointsLeft: points,
      sfx: sfx.current, onTakeMoney: winTakeMoney, onKeepGoing: winKeepGoing
    }) });

  if (phase === "gameover" || phase === "won") {
    const completedIdx = phase === "won" ? level : level - 1;
    return c.jsx(Shell, { muted, setMuted, children: c.jsx(EndScreen, {
      phase, missedAtLevel: phase === "gameover" ? level : null, finalPrize, bestRun, streak,
      isEndless, completedIdx, missedQuestion: phase === "gameover" ? currentQ : null,
      onPlayAgain: playAgain, onHome: () => { resetState(); setPhase("start"); }
    }) });
  }

  if (phase === "revealing") {
    return c.jsxs(Shell, { muted, setMuted, screenFlash, screenShake, hideSoundButton: true, children: [
      c.jsx(RevealScreen, {
        question: currentQ, level, isEndless, streak, rung,
        revealCorrect, selectedIdx: selected, muted, setMuted, points,
        onNext: advance, onEnterEndless: enterEndless, onHome: askHome,
        onEarnCardPoint: (seg) => earnCardPoint(seg),
        onFlipSound: () => sfx.current.cardFlip(),
        onRevisitSound: () => sfx.current.cardRevisit(),
        onSkipReview: openSkipConfirm
      }),
      homeConfirm && c.jsx(ConfirmModal, { title: R.homeConfirm.title, body: R.homeConfirm.body, primaryLabel: R.homeConfirm.leaveLabel, secondaryLabel: R.homeConfirm.stayLabel, primaryVariant: "danger", onPrimary: confirmHome, onSecondary: cancelHome }),
      skipConfirm && c.jsx(ConfirmModal, { title: "Skip the review?", body: "You'll miss the points from reading these cards.", primaryLabel: "Skip anyway", secondaryLabel: "Keep learning", primaryVariant: "danger", onPrimary: doSkip, onSecondary: cancelSkip })
    ] });
  }

  // playing or locking
  return c.jsxs(Shell, { muted, setMuted, screenFlash, screenShake, hideSoundButton: true, children: [
    c.jsx(QuestionScreen, {
      question: currentQ, level, rung, difficulty, stage, streak, selectedIdx: selected,
      locked, revealCorrect, revealWrong, showFloating, phase, removedAnswers, juryResults,
      hintShown, lifelines, muted, setMuted, isEndless, points, shieldArmed,
      onSelect, onLockIn, onNext: advance, onHome: askHome, onRequestLifeline: requestLifeline,
      onOpenShop: openShop, onEnterEndless: enterEndless
    }),
    shopOpen && c.jsx(ShopPanel, {
      lifelines, points, prices: LIFELINE_PRICES, shieldArmed,
      onPick: requestLifeline, onClose: closeShop
    }),
    pendingLifeline && c.jsx(LifelineModal, {
      lifelineKey: pendingLifeline,
      remainingAfter: Object.values(lifelines).filter(Boolean).length - 1,
      available: lifelines[pendingLifeline], points, price: LIFELINE_PRICES[pendingLifeline],
      onConfirm: confirmLifeline, onCancel: cancelLifeline
    }),
    homeConfirm && c.jsx(ConfirmModal, { title: R.homeConfirm.title, body: R.homeConfirm.body, primaryLabel: R.homeConfirm.leaveLabel, secondaryLabel: R.homeConfirm.stayLabel, primaryVariant: "accent", onPrimary: confirmHome, onSecondary: cancelHome })
  ] });
}

// ===========================================================================
// Screens
// ===========================================================================

// The title screen.
function StartScreen({ onPlay, bestRun }) {
  return c.jsxs("div", {
    className: "ts-start-screen",
    style: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center" },
    children: [
      R.logo && c.jsx("img", { src: R.logo.path, alt: R.logo.alt, onError: (n) => { if (R.logo.fallbackPath && !n.currentTarget.dataset.triedFallback) { n.currentTarget.dataset.triedFallback = "1"; n.currentTarget.src = R.logo.fallbackPath; } else n.currentTarget.style.display = "none"; }, style: { height: R.logo.height, maxWidth: "80%", objectFit: "contain", marginBottom: 32 } }),
      R.presenter,
      c.jsx("h1", { className: "ts-start-title", style: { fontFamily: C.display, fontSize: "clamp(56px, 12vw, 140px)", lineHeight: 0.9, letterSpacing: "-0.01em", margin: 0, color: u.text, textShadow: `6px 6px 0 ${u.brand}`, maxWidth: "15ch" }, children: R.title }),
      c.jsxs("p", { style: { fontFamily: C.body, fontSize: 22, fontWeight: 700, color: u.text, maxWidth: 620, margin: "48px 0 12px", lineHeight: 1.4 }, children: [R.hero.headline, c.jsx("br", {}), c.jsx("span", { style: { color: u.brand }, children: R.hero.headlineAccent })] }),
      c.jsx("p", { style: { fontFamily: C.body, fontSize: 16, color: u.textDim, maxWidth: 560, margin: "0 0 44px", lineHeight: 1.65, fontWeight: 500 }, children: R.hero.subtitle }),
      c.jsx(Button, { onClick: onPlay, variant: "primary", size: "lg", children: R.playLabel }),
      bestRun > 0 && c.jsxs("div", { style: { marginTop: 32, fontFamily: C.mono, fontSize: 11, color: u.textMuted, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }, children: ["Best this session: ", c.jsx("span", { style: { color: u.brand, fontWeight: 700 }, children: fmtMoney(bestRun) })] })
    ]
  });
}

// The walkthrough. Ten steps; step one is the safety brief, which is the single
// most important screen in the product. Back/Next navigation, skippable.
function WalkScreen({ step, total, screen, onNext, onPrev, onSkip, isLast, canPrev }) {
  return c.jsxs("div", {
    className: "ts-walk-screen",
    style: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" },
    children: [
      c.jsxs("div", {
        className: "ts-walk-card",
        style: { maxWidth: 640, width: "100%", minHeight: 620, background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 14, boxShadow: U.lg, padding: "36px 40px 32px", textAlign: "center", animation: "ts-fade-in 0.35s ease-out", display: "flex", flexDirection: "column", boxSizing: "border-box" },
        children: [
          c.jsxs("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 3, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 20, flexShrink: 0 }, children: [R.walkthroughStepPrefix, " ", step + 1, " of ", total] }),
          c.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0 }, children: [
            c.jsx("h2", { className: "ts-walk-title", style: { fontFamily: C.display, fontSize: "clamp(36px, 6vw, 56px)", lineHeight: 0.95, letterSpacing: "-0.01em", margin: 0, color: u.text, textShadow: `4px 4px 0 ${u.brand}` }, children: screen.title }),
            c.jsx("div", { style: { margin: "32px 0 28px", display: "flex", justifyContent: "center" }, children: c.jsx(WalkArt, { screen }) }),
            c.jsx("p", { style: { fontFamily: C.body, fontSize: 16, color: u.textDim, lineHeight: 1.7, fontWeight: 500, margin: "0 auto", maxWidth: 500 }, children: screen.body })
          ] }),
          // Prev + Next row. Prev is hidden (but space kept) on the first step.
          c.jsxs("div", { style: { marginTop: 30, display: "flex", justifyContent: "center", alignItems: "center", gap: 12, flexShrink: 0 }, children: [
            c.jsx(Button, { onClick: canPrev ? onPrev : undefined, variant: "secondary", size: "md", style: { visibility: canPrev ? "visible" : "hidden", pointerEvents: canPrev ? "auto" : "none" }, children: "\u2039 Back" }),
            c.jsx(Button, { onClick: onNext, variant: "primary", size: "md", children: isLast ? R.walkthroughPlayLabel : R.walkthroughNextLabel })
          ] })
        ]
      }),
      c.jsxs("button", { onClick: onSkip, "aria-hidden": isLast, tabIndex: isLast ? -1 : 0, style: { marginTop: 24, background: "none", border: "none", fontFamily: C.mono, fontSize: 12, letterSpacing: 1.5, color: u.textMuted, cursor: isLast ? "default" : "pointer", textTransform: "uppercase", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 4, visibility: isLast ? "hidden" : "visible", pointerEvents: isLast ? "none" : "auto" }, children: [R.walkthroughSkipLabel, " \u2192"] })
    ]
  });
}

// The little illustration on each walkthrough step, switched on screen.type.
function WalkArt({ screen }) {
  if (screen.type === "safety")
    return c.jsx("div", { style: { fontFamily: C.display, fontSize: 46, lineHeight: 1, color: u.terra, textShadow: `4px 4px 0 ${u.outline}`, border: `3px solid ${u.outline}`, borderRadius: 14, background: u.surfaceHigh, padding: "18px 26px", boxShadow: U.lg }, children: "\u26A0 SAFETY FIRST" });
  if (screen.type === "ladder") {
    const rows = [{ label: "Q15", prize: "$1M", highlight: true }, { label: "Q10", prize: "$32K" }, { label: "Q5", prize: "$1K" }, { label: "Q1", prize: "$100" }];
    return c.jsx("div", { className: "ts-walk-ladder-mini", style: { display: "inline-block", border: `2px solid ${u.outline}`, borderRadius: 8, background: u.surfaceHigh, overflow: "hidden", boxShadow: U.md }, children: rows.map((n, r) => c.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", gap: 16, background: n.highlight ? u.brand : "transparent", color: n.highlight ? u.textOnDark : u.text, borderTop: r === 0 ? "none" : `1px solid ${u.borderLight}`, minWidth: 180 }, children: [c.jsx("span", { style: { fontFamily: C.mono, fontSize: 11, fontWeight: 700 }, children: n.label }), c.jsx("span", { style: { fontFamily: C.display, fontSize: 16 }, children: n.prize })] }, r)) });
  }
  if (screen.type === "questions")
    return c.jsx("div", { className: "ts-walk-answer-mini", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 320 }, children: ["A", "B", "C", "D"].map((t) => c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, background: u.surfaceHigh, border: `2px solid ${u.outline}`, borderRadius: 8, padding: "10px 12px", boxShadow: U.sm }, children: [c.jsx("span", { style: { fontFamily: C.display, fontSize: 13, color: u.textOnDark, background: u.brand, border: `2px solid ${u.outline}`, borderRadius: 5, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }, children: t }), c.jsxs("span", { style: { fontFamily: C.body, fontSize: 12, color: u.textDim, fontWeight: 500 }, children: ["Choice ", t.toLowerCase()] })] }, t)) });
  if (screen.type === "cards")
    return c.jsx("div", { style: { display: "flex", gap: 8, perspective: 600 }, children: R.cardMeta.map((m, i) => c.jsx("div", { style: { width: 58, height: 78, background: i === 0 ? u.surfaceHigh : u.cardBack, border: `2px solid ${u.outline}`, borderRadius: 7, boxShadow: U.sm, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotateY(${i === 0 ? 0 : -22}deg)`, color: i === 0 ? u.brand : u.brandSoft, fontFamily: C.display, fontSize: 20 }, children: i === 0 ? m.icon : "?" }, i)) });
  if (screen.type === "points")
    return c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 14 }, children: [
      c.jsx("div", { style: { display: "flex", gap: 5 }, children: [0, 1, 2].map((n) => c.jsx("div", { style: { width: 16, height: 16, borderRadius: "50%", background: u.brand, border: `2px solid ${u.outline}` } }, n)) }),
      c.jsx("div", { style: { fontFamily: C.display, fontSize: 34, color: u.brand }, children: "3 PTS" })
    ] });
  if (screen.type === "lifeline") {
    const t = R.lifelines[screen.lifelineKey];
    return c.jsx("div", { style: { background: u.surface, border: `2px solid ${u.outline}`, padding: "14px 26px", borderRadius: 26, fontFamily: C.display, fontSize: 22, letterSpacing: 2, color: u.brand, boxShadow: U.md }, children: t.label });
  }
  if (screen.type === "shop")
    return c.jsxs("div", { style: { display: "flex", gap: 12, alignItems: "center" }, children: [
      c.jsx("div", { style: { background: "#e5f0e6", border: `2px solid ${u.green}`, padding: "12px 20px", borderRadius: 14, fontFamily: C.display, fontSize: 20, letterSpacing: 1, color: u.green, boxShadow: U.md }, children: "\uD83D\uDEE1 SHIELD" }),
      c.jsx("div", { style: { background: u.surface, border: `2px solid ${u.outline}`, padding: "12px 20px", borderRadius: 14, fontFamily: C.display, fontSize: 20, letterSpacing: 1, color: u.brand, boxShadow: U.md }, children: "\u21BB SKIP" })
    ] });
  if (screen.type === "ready")
    return c.jsx("div", { style: { fontFamily: C.display, fontSize: 44, color: u.terra, letterSpacing: 2, textShadow: `4px 4px 0 ${u.outline}` }, children: "\u2726 \u2726 \u2726" });
  return null;
}

// Confirmation dialog for spending a lifeline (or buying one back with points).
function LifelineModal({ lifelineKey, remainingAfter, available, points, price, onConfirm, onCancel }) {
  const meta = R.lifelines[lifelineKey];
  const purchaseOnly = lifelineKey === "shield" || lifelineKey === "skip";
  const affordable = available || points >= price;
  const isBuy = !available;
  const header = c.jsx("div", { style: { display: "inline-block", background: u.brand, color: u.textOnDark, border: `2px solid ${u.outline}`, borderRadius: 8, padding: "6px 14px", fontFamily: C.display, fontSize: 16, letterSpacing: 2, boxShadow: U.sm }, children: meta.label });
  let remainingLine;
  if (!isBuy) {
    remainingLine = remainingAfter <= 0 ? R.lifelineConfirm.remainingOne : R.lifelineConfirm.remainingMany(remainingAfter);
  } else if (purchaseOnly) {
    remainingLine = affordable ? `Costs ${price} points. You have ${points}.` : `Costs ${price} points. You have only ${points}. Read more review cards to earn.`;
  } else {
    remainingLine = affordable ? `Already used. Buy again for ${price} points. You have ${points}.` : `Already used. Buy again for ${price} points. You have only ${points}. Read more review cards to earn.`;
  }
  const primaryLabel = isBuy ? `Buy for ${price} pts` : R.lifelineConfirm.useLabel;
  return c.jsx(ConfirmModal, {
    header,
    title: meta.shortDesc,
    body: c.jsxs(c.Fragment, { children: [
      c.jsx("span", { style: { display: "block", marginBottom: 12 }, children: meta.fullDesc }),
      c.jsx("span", { style: { fontFamily: C.mono, fontSize: 12, letterSpacing: 1.5, color: affordable ? u.textMuted : u.red, fontWeight: 700, textTransform: "uppercase" }, children: remainingLine })
    ] }),
    primaryLabel, secondaryLabel: R.lifelineConfirm.cancelLabel,
    primaryVariant: affordable ? "primary" : "secondary",
    onPrimary: affordable ? onConfirm : onCancel,
    onSecondary: onCancel
  });
}

// ---------------------------------------------------------------------------
// The question screen
// ---------------------------------------------------------------------------
function QuestionScreen(props) {
  const { question, level, rung, difficulty, stage, streak, selectedIdx, locked, revealCorrect,
    revealWrong, showFloating, phase, removedAnswers, juryResults, hintShown, lifelines, muted,
    setMuted, isEndless, points, shieldArmed, onSelect, onLockIn, onNext, onHome, onRequestLifeline,
    onOpenShop, onEnterEndless } = props;
  return c.jsxs("div", {
    style: { maxWidth: 1280, margin: "0 auto", padding: "24px 24px 24px", display: "flex", gap: 28, alignItems: "flex-start", minHeight: "100vh", boxSizing: "border-box" },
    className: "ts-game-layout ts-game-screen",
    children: [
      c.jsxs("div", { className: "ts-game-main", style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }, children: [
        c.jsxs("div", { className: "ts-top-bar", style: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }, children: [
          c.jsx(Button, { variant: "secondary", size: "sm", onClick: onHome, style: { fontSize: 12 }, children: R.homeButton }),
          c.jsxs("div", { className: "ts-hud", style: { flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", padding: "14px 22px", background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 10, boxShadow: U.md, minWidth: 260 }, children: [
            // Streak: only shown in endless mode, where the money is frozen and streak is the live score.
            isEndless && c.jsxs("div", { children: [
              c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 2, color: u.textMuted, marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }, children: "Streak" }),
              c.jsx("div", { style: { fontFamily: C.display, fontSize: 22, letterSpacing: 0, color: streak > 0 ? u.terra : u.textMuted, lineHeight: 1, animation: streak > 0 ? "ts-streak-pop 0.5s ease-out" : "none" }, children: streak }, "streak-" + streak)
            ] }),
            c.jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }, children: [
              c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 2, color: u.textMuted, fontWeight: 700, textTransform: "uppercase" }, children: "Points" }),
              c.jsx("div", { style: { fontFamily: C.display, fontSize: 22, letterSpacing: 0, color: u.brand, lineHeight: 1 }, children: points }),
              c.jsx("div", { style: { fontFamily: C.mono, fontSize: 8, letterSpacing: 1, color: u.textMuted, fontWeight: 700 }, children: "SPEND ON LIFELINES" })
            ] }),
            // Worth: only shown in the main 15, where the climbing prize is the stakes. Hidden in endless (money is maxed and inert).
            !isEndless && c.jsxs("div", { style: { textAlign: "right" }, children: [
              c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 2, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }, children: "Worth" }),
              c.jsx("div", { className: "ts-hud-worth", style: { fontFamily: C.display, fontSize: "clamp(24px, 3.4vw, 34px)", color: u.brand, letterSpacing: "-0.01em", lineHeight: 1 }, children: fmtMoney(rung.prize) })
            ] })
          ] }),
          c.jsx("button", { onClick: () => setMuted((m) => !m), "aria-label": muted ? "Unmute sound" : "Mute sound", className: "ts-sound-btn", style: { background: muted ? "transparent" : u.surface, border: `2px solid ${u.outline}`, color: muted ? u.textMuted : u.text, padding: "8px 12px", borderRadius: 6, cursor: "pointer", fontFamily: C.mono, fontSize: 11, letterSpacing: 1.5, fontWeight: 700, boxShadow: muted ? "none" : U.sm, flexShrink: 0, alignSelf: "stretch" }, children: muted ? "\u266A OFF" : "\u266A ON" })
        ] }),
        c.jsx(ProgressDots, { level, revealCorrect, revealWrong, isEndless }),
        c.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }, children: [
          c.jsx("div", { className: "ts-q-header", style: { fontFamily: C.display, fontSize: 28, letterSpacing: "-0.01em", color: u.text, lineHeight: 1 }, children: isEndless
            ? c.jsxs(c.Fragment, { children: [R.endlessMode.headerLabel, " Q", String(level + 1).padStart(2, "0")] })
            : c.jsxs(c.Fragment, { children: ["QUESTION ", String(level + 1).padStart(2, "0"), " ", c.jsx("span", { className: "ts-q-header-total", style: { color: u.textMuted, fontSize: 18 }, children: "/ 15" })] }) }),
          c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 2, color: u.text, textTransform: "uppercase", fontWeight: 700, padding: "5px 12px", background: u.mustardSoft, border: `2px solid ${u.outline}`, borderRadius: 6, boxShadow: U.sm }, children: difficulty })
        ] }),
        c.jsxs("div", { className: "ts-question-card", style: { position: "relative", background: u.surfaceHigh, border: `2px solid ${u.outline}`, borderLeft: `8px solid ${u.brand}`, padding: "32px 36px", borderRadius: 10, animation: revealWrong ? "ts-wrong-shake-card 0.5s ease-out" : "ts-fade-in 0.4s ease-out", boxShadow: U.md }, children: [
          c.jsx("p", { style: { fontFamily: C.body, fontSize: "clamp(19px, 2.2vw, 24px)", lineHeight: 1.45, fontWeight: 600, margin: 0, color: u.text }, children: question.q }),
          hintShown && c.jsxs("div", { style: { marginTop: 22, padding: "14px 18px", background: u.blueBg, border: `2px solid ${u.blue}`, borderRadius: 6, fontFamily: C.body, fontSize: 14, color: u.blue, fontStyle: "italic", lineHeight: 1.6, animation: "ts-fade-in 0.4s", fontWeight: 500 }, children: [c.jsx("span", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: u.blue, fontWeight: 700, fontStyle: "normal", marginRight: 10, textTransform: "uppercase" }, children: R.lifelines.hint.inGameLabel }), question.hint] })
        ] }, "q-" + level),
        c.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }, className: "ts-answer-grid", children: question.options.map((opt, i) => c.jsx(AnswerButton, {
          letter: ["A", "B", "C", "D"][i], text: opt, selected: selectedIdx === i, locked,
          isCorrect: i === question.correct, isSelectedAnswer: selectedIdx === i, revealCorrect, revealWrong,
          removed: removedAnswers.includes(i), juryPct: juryResults ? juryResults[i] : null, stage, onClick: () => onSelect(i)
        }, i)) }),
        c.jsxs("div", { className: "ts-action-bar", style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }, children: [
          c.jsx("div", { className: "ts-lifelines-row", style: { display: "flex", gap: 10 }, children:
            c.jsx(ShopButton, { lifelines, points, shieldArmed, disabled: locked, onClick: onOpenShop })
          }),
          c.jsx("div", { className: "ts-action-bar-right", style: { display: "flex", gap: 12 }, children: c.jsx(Button, { variant: "primary", size: "md", disabled: selectedIdx === null || locked, onClick: onLockIn, children: "Lock It In" }) })
        ] })
      ] }),
      c.jsx(Ladder, { currentLevel: level, isEndless, streak }),
      revealCorrect && c.jsx(Confetti, { intensity: stage >= 3 ? "high" : stage >= 2 ? "med" : "low" })
    ]
  });
}

// The 15 progress bars across the top: green cleared, red missed, brand current.
function ProgressDots({ level, revealCorrect, revealWrong, isEndless }) {
  return c.jsx("div", { className: "ts-progress-dots", style: { display: "flex", gap: 4, alignItems: "center" }, children: LADDER.map((o, i) => {
    const done = isEndless || i < level;
    const current = !isEndless && i === level;
    const green = done || (current && revealCorrect);
    const red = current && revealWrong;
    return c.jsx("div", { style: { flex: 1 }, children: c.jsx("div", { style: { width: "100%", height: 6, borderRadius: 3, background: green ? u.green : red ? u.red : current ? u.brand : u.borderLight, border: `1px solid ${u.outline}`, animation: green ? "ts-dot-fill 0.4s ease-out" : "none", transition: "background 0.3s" } }, "dot-" + i + "-" + green + "-" + red) }, i);
  }) });
}

// One answer choice. Handles every visual state: idle, hovered, selected,
// locked (pulsing with tension), revealed correct, revealed wrong, and removed
// by 50/50 (struck through and faded).
function AnswerButton(props) {
  const { letter, text, selected, locked, isCorrect, isSelectedAnswer, revealCorrect, revealWrong, removed, juryPct, stage, onClick } = props;
  let bg = u.surface, border = u.outline, color = u.text, anim = "", letterBg = u.brand, letterColor = u.textOnDark, shadow = U.md, transform = "translate(0, 0)";
  if (removed) { bg = "transparent"; color = u.textMuted; letterBg = u.borderLight; letterColor = u.textMuted; shadow = "none"; }
  else if (revealCorrect && isCorrect) { bg = u.green; color = u.textOnDark; letterBg = u.surface; letterColor = u.green; anim = "ts-correct-pop 0.8s ease-out"; }
  else if (revealWrong && isCorrect) { bg = u.green; color = u.textOnDark; letterBg = u.surface; letterColor = u.green; anim = "ts-correct-pop 0.9s ease-out"; }
  else if (revealWrong && isSelectedAnswer) { bg = u.red; color = u.textOnDark; letterBg = u.surface; letterColor = u.red; }
  else if (locked && selected) { bg = u.brandSoft; anim = `ts-tension-${stage} ${1.6 - stage * 0.1}s ease-in-out infinite`; shadow = "none"; transform = "translate(4px, 4px)"; }
  else if (selected) { bg = u.brandSoft; shadow = U.sm; transform = "translate(1px, 1px)"; }
  return c.jsxs("button", {
    onClick, disabled: removed || locked, className: "ts-answer-btn",
    style: { textAlign: "left", background: bg, color, border: `2px solid ${border}`, borderRadius: 10, padding: "16px 18px", cursor: removed || locked ? "default" : "pointer", fontFamily: C.body, fontSize: 15, fontWeight: 600, opacity: removed ? 0.4 : 1, textDecoration: removed ? "line-through" : "none", transition: "background 0.18s, box-shadow 0.12s, transform 0.12s, opacity 0.3s", animation: anim, position: "relative", minHeight: 68, display: "flex", alignItems: "center", gap: 14, lineHeight: 1.4, boxShadow: shadow, transform },
    onMouseEnter: (e) => { if (!removed && !locked && !selected) { e.currentTarget.style.boxShadow = "2px 2px 0 " + u.outline; e.currentTarget.style.transform = "translate(2px, 2px)"; } },
    onMouseLeave: (e) => { if (!removed && !locked && !selected) { e.currentTarget.style.boxShadow = U.md; e.currentTarget.style.transform = "translate(0, 0)"; } },
    children: [
      c.jsx("span", { className: "ts-answer-btn-letter", style: { fontFamily: C.display, fontSize: 18, color: letterColor, background: letterBg, border: `2px solid ${u.outline}`, borderRadius: 6, width: 36, height: 36, minWidth: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: 0, lineHeight: 1 }, children: letter }),
      c.jsx("span", { style: { flex: 1 }, children: text }),
      juryPct != null && !removed && c.jsxs("span", { style: { fontFamily: C.mono, fontSize: 12, color: color === u.textOnDark ? u.textOnDark : u.brand, fontWeight: 700, padding: "5px 10px", background: color === u.textOnDark ? "rgba(0,0,0,0.18)" : u.brandSoft, border: `2px solid ${color === u.textOnDark ? u.textOnDark : u.outline}`, borderRadius: 4, flexShrink: 0 }, children: [juryPct, "%"] })
    ]
  });
}

// The single action-bar button that opens the lifeline shop.

// The button that opens the lifeline shop. Filled brand color so it stands out
// from the rest of the UI; shows how many lifelines are ready and your points.
function ShopButton({ lifelines, points, shieldArmed, disabled, onClick }) {
  const [hover, setHover] = useState(false);
  const ready = Object.values(lifelines).filter(Boolean).length;
  const off = disabled;
  const shadow = off ? "none" : hover ? "1px 1px 0 " + u.outline : U.md;
  const transform = off ? "none" : hover ? "translate(1px, 1px)" : "translate(0, 0)";
  return c.jsxs("button", {
    onClick: off ? undefined : onClick, disabled: off,
    onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
    className: "ts-lifeline-btn",
    style: { position: "relative", display: "flex", alignItems: "center", gap: 10, background: off ? u.surface : u.brand, border: `3px solid ${u.outline}`, padding: "10px 18px", borderRadius: 12, cursor: off ? "not-allowed" : "pointer", opacity: off ? 0.5 : 1, boxShadow: shadow, transform, transition: "box-shadow 0.1s, transform 0.1s" },
    children: [
      c.jsx("span", { style: { display: "flex", alignItems: "center", justifyContent: "center", color: off ? u.brand : u.textOnDark }, children: c.jsx(LifeIcon, { name: "shield", size: 20 }) }),
      c.jsx("span", { style: { fontFamily: C.display, fontSize: 17, letterSpacing: 1.5, color: off ? u.brand : u.textOnDark }, children: "LIFELINES" }),
      shieldArmed && c.jsx("span", { title: "Shield armed", style: { display: "flex", alignItems: "center", gap: 4, fontFamily: C.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: u.textOnDark, background: u.green, border: `2px solid ${u.outline}`, borderRadius: 6, padding: "2px 7px" }, children: [c.jsx(LifeIcon, { name: "shield", size: 12, color: u.textOnDark }), "ARMED"] }),
      c.jsxs("span", { style: { display: "flex", alignItems: "center", gap: 7, background: off ? "transparent" : "rgba(255,255,255,0.18)", borderRadius: 8, padding: "3px 9px" }, children: [
        c.jsxs("span", { style: { fontFamily: C.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: off ? u.textMuted : u.textOnDark, textTransform: "uppercase" }, children: [ready, " ready"] }),
        c.jsx("span", { style: { width: 1, height: 14, background: off ? u.borderLight : "rgba(255,255,255,0.4)" } }),
        c.jsxs("span", { style: { fontFamily: C.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: off ? u.brand : u.textOnDark }, children: [points, " PTS"] })
      ] })
    ]
  });
}


// The shop. Five lifelines, each in one of four states: free-and-ready, buyable
// with points, too-expensive, or already armed (Shield only).
function ShopPanel({ lifelines, points, prices, shieldArmed, onPick, onClose }) {
  const order = ["fifty", "poll", "hint", "shield", "skip"];
  const purchaseOnly = { shield: true, skip: true }; // never start free; always cost points
  return c.jsx(Backdrop, { children: c.jsxs("div", {
    className: "ts-shop-panel",
    style: { background: u.surfaceHigh, border: `2px solid ${u.outline}`, borderRadius: 14, boxShadow: U.lg, padding: "22px 24px 20px", maxWidth: 480, width: "100%", maxHeight: "90dvh", overflowY: "auto", animation: "ts-modal-in 0.18s ease-out" },
    children: [
      c.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }, children: [
        c.jsx("h3", { style: { fontFamily: C.display, fontSize: 26, letterSpacing: 0, margin: 0, color: u.text }, children: "LIFELINES" }),
        c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, background: u.brandSoft, border: `2px solid ${u.outline}`, borderRadius: 20, padding: "5px 12px" }, children: [
          c.jsx("span", { style: { fontFamily: C.display, fontSize: 18, color: u.brand, lineHeight: 1 }, children: points }),
          c.jsx("span", { style: { fontFamily: C.mono, fontSize: 9, letterSpacing: 1.5, color: u.brandDeep, fontWeight: 700 }, children: "PTS" })
        ] })
      ] }),
      c.jsx("p", { style: { fontFamily: C.body, fontSize: 13, lineHeight: 1.5, color: u.textDim, fontWeight: 500, margin: "0 0 16px" }, children: "The first three come free once each. Buy any of them back, or buy a shield or skip, with points from reading review cards." }),
      c.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 9, marginBottom: 18 }, children: order.map((k) => {
        const meta = R.lifelines[k];
        const available = lifelines[k]; // free-use ready (only ever true for fifty/poll/hint)
        const price = prices[k];
        const affordable = points >= price;
        const armed = k === "shield" && shieldArmed;
        const buyable = !available && affordable && !armed;
        const clickable = available || buyable;
        let stateLabel, stateColor, actionText;
        if (armed) { stateLabel = "Armed \u00B7 protects your next answer"; stateColor = u.green; actionText = "ARMED"; }
        else if (available) { stateLabel = "Ready to use, free"; stateColor = u.green; actionText = "Use"; }
        else if (buyable) { stateLabel = purchaseOnly[k] ? `Buy for ${price} pts` : `Buy back for ${price} pts`; stateColor = u.brand; actionText = `Buy ${price}`; }
        else { stateLabel = `Need ${price} pts`; stateColor = u.textMuted; actionText = `${price} pts`; }
        return c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 14, background: armed ? "#e5f0e6" : available ? u.surfaceHigh : buyable ? u.brandSofter : u.surfaceWarm, border: `3px solid ${armed ? u.green : clickable ? u.outline : u.borderLight}`, borderRadius: 12, padding: "12px 14px", opacity: (clickable || armed) ? 1 : 0.72, boxShadow: (clickable || armed) ? U.sm : "none" }, children: [
          // bold icon badge, colored by state so the lifeline reads at a glance
          c.jsx("div", { style: { flexShrink: 0, width: 46, height: 46, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: armed ? u.green : clickable ? u.brand : u.surface, border: `2px solid ${(armed || clickable) ? u.outline : u.borderLight}`, color: (armed || clickable) ? u.textOnDark : u.textMuted, boxShadow: (armed || clickable) ? U.sm : "none" }, children: c.jsx(LifeIcon, { name: k, size: 24 }) }),
          c.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
            c.jsx("div", { style: { fontFamily: C.display, fontSize: 18, letterSpacing: 1, color: (clickable || armed) ? u.text : u.textMuted }, children: meta.label }),
            c.jsx("div", { style: { fontFamily: C.body, fontSize: 12.5, lineHeight: 1.4, color: u.textDim, fontWeight: 500, marginTop: 2 }, children: meta.shortDesc }),
            c.jsx("div", { style: { fontFamily: C.mono, fontSize: 9.5, letterSpacing: 0.5, fontWeight: 700, color: stateColor, textTransform: "uppercase", marginTop: 4 }, children: stateLabel })
          ] }),
          c.jsx("button", {
            onClick: clickable ? () => onPick(k) : undefined, disabled: !clickable,
            style: { flexShrink: 0, fontFamily: C.display, fontSize: 13, letterSpacing: 1, background: armed ? u.green : clickable ? u.brand : u.surfaceWarm, color: (armed || clickable) ? u.textOnDark : u.textMuted, border: `2px solid ${(armed || clickable) ? u.outline : u.borderLight}`, borderRadius: 8, padding: "9px 16px", cursor: clickable ? "pointer" : "default", textTransform: "uppercase", boxShadow: clickable ? U.sm : "none", minWidth: 72 },
            children: actionText
          })
        ] }, k);
      }) }),
      c.jsx("div", { style: { display: "flex", justifyContent: "flex-end" }, children: c.jsx(Button, { onClick: onClose, variant: "ghost", size: "sm", style: { fontSize: 14 }, children: "Close" }) })
    ]
  }) });
}

// The money ladder rail down the right side. Hidden below 920px.
function Ladder({ currentLevel, isEndless, streak }) {
  return c.jsxs("aside", {
    className: "ts-ladder",
    style: { width: 240, flexShrink: 0, background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 10, position: "sticky", top: 60, maxHeight: "calc(100vh - 80px)", overflowY: "auto", boxShadow: U.md },
    children: [
      c.jsx("div", { style: { fontFamily: C.display, fontSize: isEndless ? 16 : 20, letterSpacing: 0, color: u.text, padding: "14px 18px", borderBottom: `2px solid ${u.outline}`, background: isEndless ? u.terraSoft : u.brandSoft, textAlign: "center" }, children: isEndless
        ? c.jsxs(c.Fragment, { children: [R.endlessMode.ladderLabel, c.jsxs("div", { style: { fontFamily: C.display, fontSize: 26, color: u.terra, lineHeight: 1, marginTop: 4 }, children: ["STREAK ", streak] })] })
        : "THE LADDER" }),
      [...LADDER].reverse().map((r) => {
        const idx = r.level - 1;
        const active = !isEndless && idx === currentLevel;
        const done = isEndless || idx < currentLevel;
        const grand = r.prize === 1e6;
        return c.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 16px", background: active ? u.brand : done ? u.brandSofter : "transparent", borderTop: `1px solid ${u.borderLight}`, animation: active ? "ts-ladder-light 1.6s ease-in-out infinite" : "none", position: "relative" }, children: [
          c.jsx("div", { style: { fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: active ? u.textOnDark : done ? u.brand : u.textMuted, width: 22 }, children: String(r.level).padStart(2, "0") }),
          c.jsx("div", { style: { flex: 1, fontFamily: C.body, fontSize: 10, color: active ? u.textOnDark : u.textMuted, fontWeight: 700, letterSpacing: 1, paddingLeft: 8, textTransform: "uppercase" }, children: grand && !active && !done ? "GRAND PRIZE" : "" }),
          c.jsx("div", { style: { fontFamily: C.display, fontSize: 16, letterSpacing: 0, color: active ? u.textOnDark : done || grand ? u.brand : u.text }, children: fmtMoneyShort(r.prize) })
        ] }, r.level);
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// The reveal: verdict beat, then three review cards
// ---------------------------------------------------------------------------
// This is where the teaching happens, and the flow is deliberate:
//
//   1. VERDICT   right or wrong, and what the correct answer was.
//   2. CARDS     three cards, one at a time: THE LAW, REMEMBER THIS, IN REAL LIFE.
//
// Each card has a ~2s read-gate (you cannot skip past instantly) and, on a
// correct answer, a Redeem button worth one point. Three cards, three points,
// which is the currency for lifelines. Reading is how you afford help later.
//
// Points are only earned on a CORRECT answer. A miss still shows the cards
// (learning matters more than the game) but earns nothing.
function RevealScreen(props) {
  const { question, level, isEndless, streak, rung, revealCorrect, selectedIdx, muted, setMuted,
    points, onNext, onEnterEndless, onHome, onEarnCardPoint,
    onFlipSound, onRevisitSound, onSkipReview } = props;

  // sub-flow: first the verdict beat, then the learning cards
  const [step, setStep] = useState("verdict"); // "verdict" | "cards"
  const [current, setCurrent] = useState(0);      // which card index 0..2 is showing
  const [seen, setSeen] = useState([false, false, false]);
  const [claimed, setClaimed] = useState([false, false, false]); // point redeemed per card
  const [dir, setDir] = useState(1);
  const [firstView, setFirstView] = useState(true);
  const [dwellDone, setDwellDone] = useState(false); // has the current card met its read-time gate
  const [pointBurst, setPointBurst] = useState(0); // increments each time a point is earned (drives the +1 animation)
  const dwellTimer = useRef(null);
  const burstTimer = useRef(null);

  const CARD_COUNT = R.cardMeta.length; // 3
  const DWELL_MS = 2000;
  const scoring = revealCorrect; // only correct answers earn points
  const earnedCount = claimed.filter(Boolean).length; // points actually redeemed
  const allEarned = scoring && earnedCount === CARD_COUNT;
  const isQ15Win = revealCorrect && level === LADDER.length - 1 && !isEndless;

  // begin the dwell gate for whichever card is showing
  const startDwell = () => {
    setDwellDone(false);
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    dwellTimer.current = setTimeout(() => setDwellDone(true), DWELL_MS);
  };

  // dwell only marks the card as READ (unlocks the redeem/next tap). It no
  // longer awards the point; the player claims that with a deliberate tap.
  const markSeen = (idx) => {
    if (seen[idx]) return;
    const copy = seen.slice();
    copy[idx] = true;
    setSeen(copy);
  };

  // claim the point for the current card. redeem now lives INSIDE the card and
  // is independent of navigation, so advancing never depends on it.
  const claimPoint = (idx) => {
    if (!scoring || claimed[idx]) return false;
    const copy = claimed.slice();
    copy[idx] = true;
    const claimedCount = copy.filter(Boolean).length;
    setClaimed(copy);
    onEarnCardPoint(claimedCount - 1);
    setPointBurst((n) => n + 1); // trigger the visible +1 POINT burst
    if (burstTimer.current) clearTimeout(burstTimer.current);
    burstTimer.current = setTimeout(() => setPointBurst(0), 1200);
    return true;
  };

  // safety net: credit any read-but-unredeemed points so a player who navigates
  // past a card without tapping Redeem still keeps the point they earned by reading.
  const autoCreditRemaining = () => {
    if (!scoring) return;
    const copy = claimed.slice();
    let added = 0;
    for (let i = 0; i < CARD_COUNT; i++) {
      if (seen[i] && !copy[i]) { copy[i] = true; added++; }
    }
    if (added === 0) return;
    setClaimed(copy);
    const alreadyHad = claimed.filter(Boolean).length;
    for (let k = 0; k < added; k++) onEarnCardPoint(alreadyHad + k);
  };

  // advancing to the next question/result: sweep up any unclaimed-but-read points first.
  const advanceOut = () => { autoCreditRemaining(); onNext(); };

  // when a card's dwell completes, mark it read (if first view)
  useEffect(() => {
    if (step !== "cards") return;
    if (dwellDone && !seen[current]) markSeen(current);
  }, [dwellDone, step]); // eslint-disable-line

  // entering the cards step, or moving between cards, (re)start the dwell
  const enterCards = () => {
    if (onFlipSound) onFlipSound();
    setStep("cards");
    setCurrent(0);
    setFirstView(true);
    startDwell();
  };

  const go = (targetIdx) => {
    if (targetIdx < 0 || targetIdx > CARD_COUNT - 1) return;
    const wasSeen = seen[targetIdx];
    setDir(targetIdx > current ? 1 : -1);
    setFirstView(!wasSeen);
    setCurrent(targetIdx);
    if (!wasSeen) { if (onFlipSound) onFlipSound(); startDwell(); }
    else { if (onRevisitSound) onRevisitSound(); setDwellDone(true); }
  };

  useEffect(() => () => { if (dwellTimer.current) clearTimeout(dwellTimer.current); if (burstTimer.current) clearTimeout(burstTimer.current); }, []);

  const allSeen = seen.every(Boolean);
  const meta = R.cardMeta[current];
  const cardRead = seen[current] || dwellDone; // read-gate: dwell finished
  // Next is gated: on a scoring run you must redeem this card's point before advancing.
  const pointOwed = scoring && !claimed[current];
  const canAdvanceCard = cardRead && !pointOwed;
  // for the final card, all points must be claimed before the result button shows.
  const allClaimed = !scoring || claimed.every(Boolean);
  const yourLetter = selectedIdx != null ? ["A", "B", "C", "D"][selectedIdx] : null;
  const rightLetter = ["A", "B", "C", "D"][question.correct];

  // ---------- VERDICT STEP ----------
  if (step === "verdict") {
    return c.jsxs("div", {
      className: "ts-reveal-screen",
      style: { minHeight: "100vh", height: "100vh", maxHeight: "100vh", background: u.bg, display: "flex", flexDirection: "column", padding: "14px 18px 18px", boxSizing: "border-box", overflow: "hidden" },
      children: [
        c.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }, children: [
          c.jsx(Button, { onClick: onHome, variant: "secondary", size: "sm", style: { fontSize: 12 }, children: R.homeButton }),
          c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 2, color: u.textMuted, fontWeight: 700, textTransform: "uppercase" }, children: isEndless ? `Bonus Q${level + 1}` : `Question ${level + 1} of 15` }),
          c.jsx("button", { onClick: () => setMuted((m) => !m), "aria-label": muted ? "Unmute" : "Mute", className: "ts-sound-btn", style: { background: muted ? "transparent" : u.surface, border: `2px solid ${u.outline}`, color: muted ? u.textMuted : u.text, padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, fontWeight: 700 }, children: muted ? "OFF" : "ON" })
        ] }),

        c.jsxs("div", { style: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, textAlign: "center", maxWidth: 560, margin: "0 auto", width: "100%" }, children: [
          // simple result label with a small colored bar, no big stamp
          c.jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, animation: "ts-fade-in 0.3s ease-out" }, children: [
            c.jsx("div", { style: { width: 54, height: 6, borderRadius: 3, background: revealCorrect ? u.green : u.red } }),
            c.jsx("div", { style: { fontFamily: C.display, fontSize: "clamp(38px, 8vw, 64px)", lineHeight: 1, letterSpacing: 1, color: revealCorrect ? u.green : u.red }, children: revealCorrect ? "CORRECT" : "NOT QUITE" })
          ] }),

          // your pick (only shown when wrong) and the correct answer
          c.jsxs("div", { style: { width: "100%", display: "flex", flexDirection: "column", gap: 10, animation: "ts-fade-in 0.4s ease-out" }, children: [
            !revealCorrect && yourLetter != null && c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, background: u.surface, border: `2px solid ${u.borderLight}`, borderRadius: 10, padding: "12px 16px", textAlign: "left" }, children: [
              c.jsx("span", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", flexShrink: 0 }, children: "You picked" }),
              c.jsxs("span", { style: { fontFamily: C.display, color: u.textMuted, fontSize: 17, flexShrink: 0 }, children: [yourLetter, "."] }),
              c.jsx("span", { style: { fontFamily: C.body, fontSize: 15, fontWeight: 600, color: u.textDim }, children: question.options[selectedIdx] })
            ] }),
            c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, background: u.brandSoft, border: `2px solid ${u.outline}`, borderRadius: 10, padding: "12px 16px", textAlign: "left" }, children: [
              c.jsx("span", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: u.brand, fontWeight: 700, textTransform: "uppercase", flexShrink: 0 }, children: revealCorrect ? "Your answer" : "Correct answer" }),
              c.jsxs("span", { style: { fontFamily: C.display, color: u.brand, fontSize: 17, flexShrink: 0 }, children: [rightLetter, "."] }),
              c.jsx("span", { style: { fontFamily: C.body, fontSize: 15, fontWeight: 600, color: u.text }, children: question.options[question.correct] })
            ] })
          ] })
        ] }),

        c.jsxs("div", { style: { flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }, children: [
          revealCorrect && c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, background: u.brandSofter, border: `2px solid ${u.outline}`, borderRadius: 20, padding: "7px 16px", fontFamily: C.mono, fontSize: 11, letterSpacing: 0.5, color: u.brandDeep, fontWeight: 700 }, children: [
            c.jsx("span", { style: { fontFamily: C.display, fontSize: 15, color: u.brand }, children: "\u2605\u2605\u2605" }),
            c.jsx("span", { children: "3 info cards ahead \u00B7 read each to earn a point" })
          ] }),
          c.jsx("button", { onClick: enterCards, style: { fontFamily: C.display, fontSize: 16, letterSpacing: 2, background: u.brand, color: u.textOnDark, border: `2px solid ${u.outline}`, padding: "13px 32px", borderRadius: 10, cursor: "pointer", textTransform: "uppercase", boxShadow: U.md }, children: revealCorrect ? R.verdictContinue : R.verdictContinueWrong })
        ] })
      ]
    });
  }

  // ---------- CARDS STEP ----------
  const finalBtnEl = isQ15Win
    ? c.jsx("button", { onClick: advanceOut, style: { fontFamily: C.display, fontSize: 15, letterSpacing: 2, background: u.brand, color: u.textOnDark, border: `2px solid ${u.outline}`, padding: "11px 26px", borderRadius: 8, cursor: "pointer", textTransform: "uppercase", boxShadow: U.md, animation: "ts-pulse-next 1.8s ease-in-out infinite" }, children: "See your result \u2192" })
    : c.jsx("button", { onClick: advanceOut, style: { fontFamily: C.display, fontSize: 15, letterSpacing: 2, background: revealCorrect ? u.brand : u.terra, color: u.textOnDark, border: `2px solid ${u.outline}`, padding: "11px 24px", borderRadius: 8, cursor: "pointer", textTransform: "uppercase", boxShadow: U.md, animation: "ts-pulse-next 1.8s ease-in-out infinite" }, children: revealCorrect ? "Next Question \u2192" : "See Final Result \u2192" });

  return c.jsxs("div", {
    className: "ts-reveal-screen",
    style: { minHeight: "100vh", height: "100vh", maxHeight: "100vh", background: u.bg, display: "flex", flexDirection: "column", padding: "14px 18px 12px", boxSizing: "border-box", overflow: "hidden" },
    children: [
      // top bar: home, question count, compact points readout, mute
      c.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexShrink: 0, marginBottom: 10 }, children: [
        c.jsx(Button, { onClick: onHome, variant: "secondary", size: "sm", style: { fontSize: 12 }, children: R.homeButton }),
        c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center" }, children: [
          c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 2, color: u.textMuted, fontWeight: 700, textTransform: "uppercase" }, children: isEndless ? `Bonus Q${level + 1}` : `Q ${String(level + 1).padStart(2, "0")} / 15` }),
          // prominent points progress: 3 big pips + "X of 3" to reinforce collecting all three
          scoring
            ? c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, background: earnedCount === 3 ? u.brandSofter : u.surfaceWarm, border: `3px solid ${earnedCount === 3 ? u.brand : u.outline}`, borderRadius: 22, padding: "6px 16px 6px 12px", boxShadow: U.sm, animation: earnedCount === 3 ? "ts-streak-pop 0.5s ease-out" : "none" }, children: [
                c.jsx("div", { style: { display: "flex", gap: 6 }, children: [0, 1, 2].map((r) => {
                  const filled = r < earnedCount;
                  return c.jsx("div", { style: { width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: filled ? u.brand : u.surface, border: `2.5px solid ${filled ? u.brand : u.borderLight}`, boxShadow: filled ? U.sm : "none", animation: r === earnedCount - 1 ? "ts-pip-pop 0.4s ease-out" : "none" }, children: filled ? c.jsx("span", { style: { color: u.textOnDark, fontSize: 12, fontFamily: C.display, lineHeight: 1 }, children: "\u2605" }) : null }, r);
                }) }),
                c.jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }, children: [
                  c.jsxs("div", { style: { fontFamily: C.display, fontSize: 17, letterSpacing: 0.5, color: u.brand, lineHeight: 1 }, children: [earnedCount, " of 3"] }),
                  c.jsx("div", { style: { fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, color: u.brandDeep, fontWeight: 700, textTransform: "uppercase", marginTop: 2 }, children: earnedCount === 3 ? "All earned!" : "Points" })
                ] })
              ] })
            : c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1, color: u.textMuted, fontWeight: 700, textTransform: "uppercase" }, children: "Review \u00B7 no points on a miss" })
        ] }),
        c.jsx("button", { onClick: () => setMuted((m) => !m), "aria-label": muted ? "Unmute" : "Mute", className: "ts-sound-btn", style: { background: muted ? "transparent" : u.surface, border: `2px solid ${u.outline}`, color: muted ? u.textMuted : u.text, padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, fontWeight: 700 }, children: muted ? "OFF" : "ON" })
      ] }),

      // the single comic card is now the hero of the screen (with the +1 POINT burst overlaid)
      c.jsxs("div", { style: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", maxWidth: 760, margin: "0 auto", width: "100%", position: "relative" }, children: [
        c.jsx(ComicCard, {
          cardIndex: current, meta, dir, firstView, question, revealCorrect,
          selectedIdx, rightLetter,
          scoring, redeemed: claimed[current],
          onRedeem: () => claimPoint(current)
        }, "card-" + current + "-" + (firstView ? "f" : "s")),
        pointBurst > 0 && c.jsxs("div", { "aria-hidden": true, style: { position: "absolute", left: "50%", top: "42%", transform: "translate(-50%, -50%)", zIndex: 20, pointerEvents: "none", textAlign: "center", animation: "ts-point-burst 1.2s cubic-bezier(.2,.8,.2,1.1) forwards" }, children: [
          c.jsx("div", { style: { fontFamily: C.display, fontSize: "clamp(48px, 11vw, 92px)", color: u.brand, textShadow: `4px 4px 0 ${u.outline}`, lineHeight: 0.9 }, children: "+1" }),
          c.jsx("div", { style: { fontFamily: C.display, fontSize: "clamp(16px, 3.5vw, 26px)", letterSpacing: 3, color: u.brandDeep, marginTop: 2 }, children: allEarned ? "POINT \u00B7 ALL 3!" : "POINT" })
        ] })
      ] }),

      // dots + nav
      c.jsxs("div", { style: { flexShrink: 0, paddingTop: 8, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }, children: [
        c.jsx("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: R.cardMeta.map((m, i) => c.jsx("button", {
          onClick: () => go(i), "aria-label": "Card " + (i + 1),
          style: { width: i === current ? 26 : 11, height: 11, borderRadius: 6, padding: 0, border: `2px solid ${u.outline}`, background: i === current ? u.brand : seen[i] ? u.brandSofter : u.surface, cursor: "pointer", transition: "width 0.2s, background 0.2s" }
        }, i)) }),

        c.jsxs("div", { style: { display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }, children: [
          c.jsx(Button, { onClick: () => go(current - 1), variant: "ghost", size: "sm", disabled: current === 0, style: { fontSize: 13 }, children: "\u2039 Prev" }),
          // Redeem lives inside the card; Next stays locked until this card's point is claimed.
          current < CARD_COUNT - 1
            ? c.jsx(NextCardButton, { canAdvance: canAdvanceCard, scoring, pointOwed, cardRead, onClick: () => go(current + 1) })
            : ((allSeen && allClaimed) ? finalBtnEl : c.jsx(NextCardButton, { canAdvance: canAdvanceCard, scoring, pointOwed, cardRead, label: "Almost\u2026", onClick: () => {} }))
        ] }),

        !allSeen && c.jsx("button", { onClick: onSkipReview, style: { background: "transparent", border: "none", fontFamily: C.mono, fontSize: 11, letterSpacing: 2, color: u.textMuted, cursor: "pointer", textTransform: "uppercase", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3, padding: "2px 10px" }, children: scoring ? "Skip Review (no points) \u2192" : "Skip \u2192" })
      ] }),

      revealCorrect && c.jsx(Confetti, { intensity: "med" })
    ]
  });
}

// Next-card button. While the read-dwell runs it shows "Reading" with the fill
// bar; once read but the point is still owed it prompts "Redeem first"; once the

// The Next button between cards. Shows a fill-bar while the read-gate runs, then
// prompts to redeem, then unlocks.
function NextCardButton({ canAdvance, onClick, label, scoring, pointOwed, cardRead }) {
  const readingStill = !canAdvance && !cardRead;
  const needsRedeem = !canAdvance && cardRead && pointOwed;
  return c.jsxs("button", {
    onClick: canAdvance ? onClick : undefined,
    disabled: !canAdvance,
    style: { position: "relative", overflow: "hidden", fontFamily: C.display, fontSize: 13, letterSpacing: 1.5, background: canAdvance ? u.surface : u.surfaceWarm, color: canAdvance ? u.text : u.textMuted, border: `2px solid ${u.outline}`, padding: "10px 22px", borderRadius: 8, cursor: canAdvance ? "pointer" : "default", textTransform: "uppercase", boxShadow: canAdvance ? U.sm : "none", minWidth: 140 },
    children: [
      readingStill && c.jsx("span", { "aria-hidden": true, style: { position: "absolute", left: 0, top: 0, bottom: 0, background: u.brandSofter, animation: "ts-dwell-fill 2s linear forwards", zIndex: 0 } }),
      c.jsx("span", { style: { position: "relative", zIndex: 1 }, children: canAdvance ? (label || "Next \u203A") : (needsRedeem ? "Redeem \u2605 first" : "Reading\u2026") })
    ]
  });
}

// Bold, self-explaining points banner shown above the review cards.
// Makes the "read 3 cards -> earn 3 points -> spend on lifelines" loop obvious.

// A single review card. Flips in on first view, slides on revisit.
function ComicCard({ cardIndex, meta, dir, firstView, question, revealCorrect, selectedIdx, rightLetter, scoring, redeemed, onRedeem }) {
  // outer animation: flip on first view, slide on revisit
  const anim = firstView
    ? "ts-card-flip-in 0.5s cubic-bezier(.2,.7,.2,1) both"
    : (dir >= 0 ? "ts-card-slide-left 0.28s ease-out both" : "ts-card-slide-right 0.28s ease-out both");
  return c.jsx("div", { style: { flex: 1, minHeight: 0, perspective: 1400, display: "flex" }, children:
    c.jsxs("div", { className: "ts-comic-card", style: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: u.surfaceHigh, border: `3px solid ${u.outline}`, borderRadius: 12, boxShadow: U.lg, overflow: "hidden", transformStyle: "preserve-3d", animation: anim }, children: [
      // header band
      c.jsxs("div", { className: "ts-comic-header", style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 20px", background: u.brand, color: u.textOnDark, borderBottom: `3px solid ${u.outline}`, fontFamily: C.display, fontSize: "clamp(22px, 4vw, 30px)", letterSpacing: 1, flexShrink: 0 }, children: [
        c.jsx("span", { children: meta.label }),
        c.jsx("span", { style: { fontFamily: C.mono, fontSize: 12, letterSpacing: 1, opacity: 0.85, fontWeight: 700 }, children: `${cardIndex + 1} / ${R.cardMeta.length}` })
      ] }),
      // body: content is vertically centered so short scenarios don't leave a big void
      c.jsx("div", { className: "ts-comic-body ts-halftone", style: { flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 22px", background: u.surfaceHigh, display: "flex", flexDirection: "column", justifyContent: "center" }, children:
        c.jsx("div", { style: { width: "100%" }, children:
          meta.key === "info" ? c.jsx(FaceInfo, { question })
          : meta.key === "phrase" ? c.jsx(FacePhrase, { question })
          : c.jsx(FaceRealLife, { question })
        })
      }),
      // in-card redeem footer: fills the lower space, lives with the content it rewards.
      // Only on a scoring (correct) run. Uses the read-gate so it unlocks after a beat.
      scoring && c.jsx("div", { className: "ts-comic-redeem", style: { flexShrink: 0, borderTop: `3px solid ${u.outline}`, padding: "14px 20px", background: redeemed ? u.brandSofter : u.surfaceWarm, display: "flex", justifyContent: "center" }, children:
        c.jsx(InCardRedeem, { redeemed, onRedeem })
      })
    ] })
  });
}

// The redeem control that lives INSIDE the review card. Instantly tappable
// (no read-gate here; that lives on the Next button). Banks the point, then

// The in-card Redeem control. Instantly tappable; the read-gate lives on Next.
function InCardRedeem({ redeemed, onRedeem }) {
  if (redeemed) {
    return c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, fontFamily: C.display, fontSize: 16, letterSpacing: 1.5, color: u.brandDeep, textTransform: "uppercase" }, children: [
      c.jsx("span", { style: { fontFamily: C.display, fontSize: 20, color: u.brand }, children: "\u2605" }),
      c.jsx("span", { children: "Point earned" })
    ] });
  }
  return c.jsx("button", {
    onClick: onRedeem,
    style: { fontFamily: C.display, fontSize: "clamp(15px, 2.6vw, 19px)", letterSpacing: 1.5, background: u.brand, color: u.textOnDark, border: `2px solid ${u.outline}`, padding: "12px 34px", borderRadius: 10, cursor: "pointer", textTransform: "uppercase", boxShadow: U.md, minWidth: 200, animation: "ts-pulse-next 1.6s ease-in-out infinite" },
    children: "\u2605 Redeem +1 Point"
  });
}

// The three card faces.
function FaceVerdict({ question, revealCorrect, selectedIdx, rightLetter }) {
  const rightAnswer = question.options[question.correct];
  const yourLetter = selectedIdx != null ? ["A", "B", "C", "D"][selectedIdx] : null;
  const yourAnswer = selectedIdx != null ? question.options[selectedIdx] : null;
  const wrongExp = !revealCorrect && question.optionExplanations && selectedIdx != null ? question.optionExplanations[selectedIdx] : null;
  return c.jsxs("div", { children: [
    c.jsx("div", { style: { display: "flex", justifyContent: "center", marginBottom: 16 }, children: c.jsx("div", { style: { position: "relative", display: "inline-block", animation: "ts-pow-burst 0.6s cubic-bezier(.2,.8,.2,1.2) both" }, children: c.jsx("div", { className: "ts-pow", style: { fontFamily: C.display, fontSize: "clamp(34px, 7vw, 58px)", color: u.textOnDark, background: revealCorrect ? u.green : u.red, border: `3px solid ${u.outline}`, borderRadius: 10, padding: "8px 26px", letterSpacing: 2, transform: "rotate(-2deg)", boxShadow: U.md }, children: revealCorrect ? "CORRECT!" : "WRONG!" }) }) }),
    yourLetter && !revealCorrect && c.jsxs("div", { style: { fontFamily: C.body, fontSize: 15, marginBottom: 10, color: u.text, lineHeight: 1.45, background: u.terraSoft, border: `2px solid ${u.outline}`, borderRadius: 8, padding: "10px 14px" }, children: [
      c.jsx("span", { style: { color: u.red, fontSize: 10, letterSpacing: 1.5, fontFamily: C.mono, fontWeight: 700, textTransform: "uppercase", marginRight: 8 }, children: "You picked" }),
      c.jsxs("span", { style: { fontFamily: C.display, color: u.red, marginRight: 6 }, children: [yourLetter, "."] }), yourAnswer
    ] }),
    c.jsxs("div", { style: { fontFamily: C.body, fontSize: 16, color: u.text, lineHeight: 1.45, fontWeight: 600, background: u.brandSoft, border: `2px solid ${u.outline}`, borderRadius: 8, padding: "12px 16px" }, children: [
      c.jsx("span", { style: { color: u.brand, fontSize: 10, letterSpacing: 1.5, fontFamily: C.mono, fontWeight: 700, textTransform: "uppercase", marginRight: 8 }, children: "Correct" }),
      c.jsxs("span", { style: { fontFamily: C.display, color: u.brand, marginRight: 6 }, children: [rightLetter, "."] }), rightAnswer
    ] }),
    wrongExp && c.jsx("p", { style: { fontFamily: C.body, fontSize: 14, lineHeight: 1.55, color: u.textDim, margin: "12px 2px 0", fontWeight: 500 }, children: wrongExp })
  ] });
}

function FaceInfo({ question }) {
  return c.jsx("div", { style: { display: "flex", alignItems: "center", minHeight: "100%" }, children:
    c.jsx("div", { style: { background: u.mustardSoft, border: `2px solid ${u.outline}`, borderRadius: 8, padding: "18px 20px", boxShadow: U.sm }, children:
      c.jsx("p", { style: { fontFamily: C.body, fontSize: "clamp(15px, 2.2vw, 18px)", lineHeight: 1.6, color: u.text, margin: 0, fontWeight: 500 }, children: question.principle || "" })
    })
  });
}

function FacePhrase({ question }) {
  const kp = question.keyPhrase || { quote: "", gloss: "" };
  return c.jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: "100%", gap: 16 }, children: [
    c.jsx("div", { className: "ts-phrase-quote", style: { fontFamily: C.display, fontSize: "clamp(28px, 5.5vw, 46px)", lineHeight: 1.05, letterSpacing: "-0.01em", color: u.text, textShadow: `2px 2px 0 ${u.brandBright}`, animation: "ts-phrase-in 0.6s cubic-bezier(.2,.8,.2,1.2) both", maxWidth: "16ch" }, children: kp.quote }),
    kp.gloss && c.jsx("p", { style: { fontFamily: C.body, fontSize: 15, lineHeight: 1.55, color: u.textDim, margin: 0, fontWeight: 500, maxWidth: 460 }, children: kp.gloss })
  ] });
}

function FaceRealLife({ question }) {
  const sc = question.scenario || { lines: [] };
  const lines = sc.lines || [];
  // A "you" vs "officer/other" bubble layout with a scene-setter and split outcomes when present
  const outcomes = lines.filter((l) => /YES|NO/i.test(l.label));
  const exchange = lines.filter((l) => !/YES|NO/i.test(l.label));
  const isYou = (label) => /^YOU/i.test(label);
  return c.jsxs("div", { children: [
    sc.setup && c.jsx("div", { style: { fontFamily: C.body, fontStyle: "italic", fontWeight: 700, fontSize: 15, color: u.text, marginBottom: 14, lineHeight: 1.45, borderLeft: `4px solid ${u.brand}`, paddingLeft: 12 }, children: sc.setup }),
    c.jsx("div", { className: "ts-scenario-panels", style: { display: "grid", gridTemplateColumns: exchange.length > 1 ? "1fr 1fr" : "1fr", gap: 12, marginBottom: outcomes.length ? 14 : 0 }, children: exchange.map((l, i) => c.jsxs("div", { style: { background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 10, padding: "12px 14px", boxShadow: U.sm, animation: `ts-bubble-in 0.4s ease-out ${i * 0.08}s both` }, children: [
      c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }, children: [
        c.jsx("div", { style: { width: 30, height: 30, borderRadius: "50%", background: isYou(l.label) ? u.brandBright : u.blue, border: `2px solid ${u.outline}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }, children: isYou(l.label) ? "\uD83E\uDDD1" : "\uD83D\uDC6E" }),
        c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.2, color: u.textMuted, fontWeight: 700, textTransform: "uppercase" }, children: l.label })
      ] }),
      c.jsx("div", { style: { fontFamily: C.body, fontSize: 14.5, lineHeight: 1.4, color: u.text, fontWeight: 600, background: isYou(l.label) ? u.brandSoft : u.surfaceHigh, border: `2px solid ${u.outline}`, borderRadius: 8, padding: "8px 12px" }, children: l.text })
    ] }, i)) }),
    outcomes.length > 0 && c.jsx("div", { className: "ts-scenario-outcomes", style: { display: "grid", gridTemplateColumns: outcomes.length > 1 ? "1fr 1fr" : "1fr", gap: 10 }, children: outcomes.map((l, i) => {
      const yes = /YES/i.test(l.label);
      return c.jsxs("div", { style: { background: yes ? "#e5f0e6" : u.terraSoft, border: `2px solid ${yes ? u.green : u.terra}`, borderRadius: 8, padding: "10px 14px" }, children: [
        c.jsx("div", { style: { fontFamily: C.display, fontSize: 15, color: yes ? u.green : u.terra, marginBottom: 4, letterSpacing: 0.5 }, children: l.label }),
        c.jsx("div", { style: { fontFamily: C.body, fontSize: 13.5, lineHeight: 1.4, color: u.text, fontWeight: 500 }, children: l.text })
      ] }, i);
    }) }),
    sc.note && c.jsxs("p", { style: { fontFamily: C.body, fontSize: 13, lineHeight: 1.45, color: u.textDim, margin: "12px 0 0", fontStyle: "italic", fontWeight: 500 }, children: ["\u2192 ", sc.note] })
  ] });
}

// The big win moment. Fires on 15/15 regardless of what the player does next.

// ---------------------------------------------------------------------------
// End screens
// ---------------------------------------------------------------------------
// The Q15 win. Counts the prize up with an ease-out, then offers the choice:
// bank it, or risk nothing and keep playing for a streak in the bonus round.
function WinBigScreen({ prize, usage, pointsSpent, pointsLeft, sfx, onTakeMoney, onKeepGoing }) {
  const [display, setDisplay] = useState(0);
  const [done, setDone] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    if (sfx) sfx.win();
    const steps = 42;
    const dur = 2200;
    for (let i = 1; i <= steps; i++) {
      timers.current.push(setTimeout(() => {
        // ease-out count so it decelerates into the final number
        const t = i / steps;
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(eased * prize));
        if (i % 6 === 0 && sfx) sfx.tone(880 + i * 12, 0.08, "sine", 0.05);
        if (i === steps) {
          setDisplay(prize);
          setDone(true);
          if (sfx) { sfx.win(); setTimeout(() => sfx.correct(3), 250); }
        }
      }, Math.round((i / steps) * dur)));
    }
    return () => timers.current.forEach(clearTimeout);
  }, []); // eslint-disable-line

  return c.jsxs("div", {
    style: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center", gap: 18, position: "relative" },
    children: [
      c.jsx(Confetti, { intensity: "high" }),
      c.jsx("div", { style: { fontFamily: C.mono, fontSize: 13, letterSpacing: 4, color: u.brandDeep, fontWeight: 700, textTransform: "uppercase", animation: "ts-fade-in 0.5s" }, children: "Congratulations" }),
      c.jsx("h1", { style: { fontFamily: C.display, fontSize: "clamp(52px, 12vw, 128px)", lineHeight: 0.85, letterSpacing: "-0.02em", margin: 0, color: u.brand, textShadow: `6px 6px 0 ${u.outline}`, animation: "ts-verdict-stamp 0.7s cubic-bezier(.2,.8,.2,1.4) both" }, children: "YOU WON" }),
      c.jsx("div", { style: { fontFamily: C.display, fontSize: "clamp(44px, 10vw, 96px)", color: u.text, letterSpacing: "-0.02em", lineHeight: 1, textShadow: `4px 4px 0 ${u.mustard}`, animation: done ? "ts-streak-pop 0.5s ease-out" : "none" }, children: fmtMoney(display) }, "amt-" + done),
      done && c.jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 18, animation: "ts-verdict-detail-in 0.5s ease-out both", marginTop: 4, width: "100%", maxWidth: 460 }, children: [
        c.jsx(RunBreakdown, { usage, pointsSpent, pointsLeft }),
        c.jsxs("div", { className: "ts-end-actions", style: { display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }, children: [
          c.jsx(Button, { onClick: onTakeMoney, variant: "primary", size: "md", children: R.q15Choice.takePrize }),
          c.jsx(Button, { onClick: onKeepGoing, variant: "secondary", size: "md", children: R.q15Choice.keepGoing })
        ] })
      ] })
    ]
  });
}


// The scoreboard: which lifelines were used, points spent, points left.
function RunBreakdown({ usage = {}, pointsSpent = 0, pointsLeft = 0 }) {
  const order = ["fifty", "poll", "hint", "shield", "skip"];
  const totalUses = order.reduce((n, k) => n + (usage[k] || 0), 0);
  return c.jsxs("div", { style: { width: "100%", background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 12, padding: "18px 20px", boxShadow: U.md, textAlign: "left" }, children: [
    c.jsxs("div", { style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 2, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }, children: ["How you got there \u00B7 ", totalUses, totalUses === 1 ? " lifeline used" : " lifelines used"] }),
    c.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }, children: order.map((k) => {
      const n = usage[k] || 0;
      return c.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, opacity: n > 0 ? 1 : 0.5 }, children: [
        c.jsx("span", { style: { fontFamily: C.display, fontSize: 15, letterSpacing: 1, color: n > 0 ? u.text : u.textMuted }, children: R.lifelines[k].label }),
        c.jsx("span", { style: { fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: n > 0 ? u.brand : u.textMuted }, children: n > 0 ? `\u00D7 ${n}` : "not used" })
      ] }, k);
    }) }),
    c.jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, paddingTop: 12, borderTop: `2px solid ${u.borderLight}` }, children: [
      c.jsxs("div", { style: { textAlign: "center", flex: 1 }, children: [
        c.jsx("div", { style: { fontFamily: C.display, fontSize: 26, color: u.text, lineHeight: 1 }, children: pointsSpent }),
        c.jsx("div", { style: { fontFamily: C.mono, fontSize: 9, letterSpacing: 1, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", marginTop: 3 }, children: "Points spent" })
      ] }),
      c.jsx("div", { style: { width: 2, background: u.borderLight } }),
      c.jsxs("div", { style: { textAlign: "center", flex: 1 }, children: [
        c.jsx("div", { style: { fontFamily: C.display, fontSize: 26, color: u.brand, lineHeight: 1 }, children: pointsLeft }),
        c.jsx("div", { style: { fontFamily: C.mono, fontSize: 9, letterSpacing: 1, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", marginTop: 3 }, children: "Points left over" })
      ] })
    ] })
  ] });
}

// Game over, or the final result after banking / clearing the bonus deck.
function EndScreen(props) {
  const { phase, missedAtLevel, finalPrize, bestRun, streak, isEndless, completedIdx, missedQuestion, onPlayAgain, onHome } = props;
  const won = phase === "won";
  let sk;
  if (won) sk = isEndless ? R.endScreens.endlessEnd : R.endScreens.won;
  else sk = (missedAtLevel != null && missedAtLevel >= 10) ? R.endScreens.gameoverLate : R.endScreens.gameoverEarly;
  const prize = won ? (finalPrize || LADDER[LADDER.length - 1].prize) : 0;
  const bonusStreak = isEndless ? Math.max(0, streak - 15) : 0;
  return c.jsxs("div", {
    className: "ts-end-screen",
    style: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px 80px", textAlign: "center" },
    children: [
      won && c.jsx(Confetti, { intensity: "high" }),
      c.jsx("h1", { className: "ts-end-headline", style: { fontFamily: C.display, fontSize: "clamp(64px, 15vw, 150px)", lineHeight: 0.85, letterSpacing: "-0.02em", margin: 0, color: won ? u.brand : u.text, textShadow: won ? `6px 6px 0 ${u.outline}` : `5px 5px 0 ${u.terra}` }, children: sk.headline }),
      c.jsx("p", { style: { fontFamily: C.body, fontSize: 18, fontWeight: 600, color: u.textDim, maxWidth: 540, margin: "28px 0 36px", lineHeight: 1.55 }, children: sk.sub }),
      won && c.jsxs("div", { className: "ts-end-prize", style: { background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 14, padding: "26px 44px", marginBottom: 22, boxShadow: U.lg }, children: [
        c.jsx("div", { style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 3, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }, children: isEndless ? "Banked" : "You won" }),
        c.jsx("div", { className: "ts-end-prize-amount", style: { fontFamily: C.display, fontSize: "clamp(56px, 11vw, 92px)", color: u.brand, letterSpacing: "-0.02em", lineHeight: 1 }, children: fmtMoney(prize) }),
        isEndless && bonusStreak > 0 && c.jsxs("div", { style: { fontFamily: C.mono, fontSize: 12, letterSpacing: 2, color: u.terra, fontWeight: 700, marginTop: 10, textTransform: "uppercase" }, children: [R.endScreens.bonusStreakLabel, ": ", bonusStreak] })
      ] }),
      !won && missedQuestion && c.jsxs("div", { className: "ts-missed-card", style: { background: u.surface, border: `2px solid ${u.outline}`, borderLeft: `8px solid ${u.terra}`, borderRadius: 10, padding: "22px 26px", maxWidth: 560, marginBottom: 30, boxShadow: U.md, textAlign: "left" }, children: [
        c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 2, color: u.terra, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }, children: R.endScreens.missedQuestionLabel }),
        c.jsx("p", { style: { fontFamily: C.body, fontSize: 16, fontWeight: 600, lineHeight: 1.5, color: u.text, margin: "0 0 14px" }, children: missedQuestion.q }),
        c.jsxs("div", { style: { fontFamily: C.body, fontSize: 15, color: u.green, fontWeight: 700, lineHeight: 1.45 }, children: [
          c.jsx("span", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: u.green, marginRight: 8, textTransform: "uppercase" }, children: "Answer" }),
          missedQuestion.options[missedQuestion.correct]
        ] })
      ] }),
      bestRun > 0 && !won && c.jsxs("div", { style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 2, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 26 }, children: ["Best this session: ", c.jsx("span", { style: { color: u.brand }, children: fmtMoney(bestRun) })] }),
      c.jsxs("div", { className: "ts-end-actions", style: { display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }, children: [
        c.jsx(Button, { onClick: onPlayAgain, variant: "primary", size: "md", children: R.endScreens.playAgainLabel }),
        c.jsx(Button, { onClick: onHome, variant: "ghost", size: "md", children: "Home" })
      ] }),
      c.jsx("p", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: u.textMuted, marginTop: 30, fontWeight: 600, textTransform: "uppercase" }, children: R.endScreens.footerNote })
    ]
  });
}
