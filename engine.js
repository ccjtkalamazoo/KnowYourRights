// Know Your Rights · CCJT
// engine.js : the quiz. Every screen, plus the state machine that drives them.
//
// The whole game is one component (App) holding all the state, rendering one of
// several screens depending on `phase`:
//
//   start       the title screen
//   walkthrough the tutorial (safety brief first)
//   map         the launcher
//   preround    safety note before a chapter run
//   playing     a question is live, waiting for a pick
//   locking     answer locked, suspense pause before the reveal
//   revealing   the verdict beat, then the three review cards
//   winbig      the end-of-deck celebration + take-it-or-keep-going choice
//   gameover    three lives gone
//   won         the run is over (banked the prize, or cleared the bonus deck)
//
// ---------------------------------------------------------------------------
// WHAT CHANGED, AND WHY
// ---------------------------------------------------------------------------
// Three changes, all of them from watching kids play at the first event rather
// than from a design document.
//
//   LIVES.  A wrong answer used to end the run. 25 of 85 runs died on question
//   one, and what kids said out loud was that losing everything to one miss was
//   not fair. Three lives per round now. A miss costs a life and the round
//   continues. This also absorbs the old SHIELD lifeline, which was this exact
//   mechanic sold for points nobody spent.
//
//   NO LIFELINES, NO POINTS.  Eight lifeline uses across 453 answers. The shop,
//   the five lifelines, the points economy, and the four tutorial slides that
//   explained them are gone. The review-card beat survives; only the currency
//   is removed, because the pause was doing the work, not the point.
//
//   FIVE QUESTIONS IN THE DEMO.  Fifteen is a five-minute commitment from a
//   stranger at a table with a line behind them. The demo exists to show how the
//   game works, not to certify what anybody knows.
//
// The suspense pause in `locking` is a flat 2 seconds on every question.

import { c, u, C, U, LOGO, useState, useEffect, useRef, injectStyles } from "./theme.js";
import { R } from "./copy.js";
import {
  LADDER, LIVES_PER_ROUND, DEMO_DECK_SIZE, CHAPTER_DECK_SIZE, musicStageFor,
  fmtMoney, fmtMoneyShort, buildDeck, buildEndlessDeck
} from "./rules.js";
import { Shell, Button, ConfirmModal, Confetti } from "./ui.js";
import * as EV from "./events.js";
import { SfxEngine, MusicEngine } from "./audio.js";
import { MapScreen } from "./map.js";
import { loadChapter, loadDemo } from "./content.js";

// ---------------------------------------------------------------------------
// The demo (event build)
// ---------------------------------------------------------------------------
// Three rounds per page load, then it stops. The cap is deliberately in memory
// and nowhere else: a refresh clears it, which is exactly how the table is run.
const MAX_DEMO_RUNS = 3;

// How long the game holds on a locked answer before the reveal, in ms.
const LOCK_PAUSE_MS = 2000;

// ===========================================================================
// App : all game state lives here.
// ===========================================================================
export function App() {
  const [phase, setPhase] = useState("start");
  const [chapter, setChapter] = useState(null);
  const [seenDisclaimer, setSeenDisclaimer] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [walkStep, setWalkStep] = useState(0);
  const [deck, setDeck] = useState([]);
  const [level, setLevel] = useState(0);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [revealCorrect, setRevealCorrect] = useState(false);
  const [revealWrong, setRevealWrong] = useState(false);
  const [showFloating, setShowFloating] = useState(false);
  const [streak, setStreak] = useState(0);
  // The three numbers that describe a run now. `results` is one entry per
  // question answered, which is what the progress bar reads: it can show a red
  // segment mid-run without the run being over, which the old version could not.
  const [lives, setLives] = useState(LIVES_PER_ROUND);
  const [correctCount, setCorrectCount] = useState(0);
  const [results, setResults] = useState([]);
  // Every question missed this run, not just the one that ended it. With three
  // lives there can be more than one, and the end screen shows all of them.
  const [missed, setMissed] = useState([]);
  const [homeConfirm, setHomeConfirm] = useState(false);
  const [logoConfirm, setLogoConfirm] = useState(false);
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [skipConfirmed, setSkipConfirmed] = useState(false);
  const [isEndless, setIsEndless] = useState(false);
  const [finalPrize, setFinalPrize] = useState(0);
  const [bestRun, setBestRun] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [demoRuns, setDemoRuns] = useState([]);
  const [screenFlash, setScreenFlash] = useState(null);
  const [screenShake, setScreenShake] = useState(false);

  const sfx = useRef(null);
  const music = useRef(null);
  const audioCtx = useRef(null);

  if (sfx.current === null) sfx.current = new SfxEngine();
  if (music.current === null) music.current = new MusicEngine();

  useEffect(() => {
    injectStyles();
    EV.beginSession({ soundOn: !muted });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [phase, walkStep, level]);

  // Per-question measurement (events.js). Reset each time a question is shown.
  const qMeter = useRef({ exposure: 1, shownAt: 0, firstSelectAt: null, changes: 0 });
  useEffect(() => {
    if (phase !== "playing" || !currentQ) return;
    const exposure = EV.trackQuestionShown(currentQ, level);
    qMeter.current = { exposure, shownAt: performance.now(), firstSelectAt: null, changes: 0 };
  }, [phase, level]);

  useEffect(() => {
    sfx.current.setMuted(muted);
    music.current.setMuted(muted);
  }, [muted]);

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
    setStreak(0); setLives(LIVES_PER_ROUND); setCorrectCount(0);
    setResults([]); setMissed([]);
    setHomeConfirm(false); setSkipConfirm(false);
    setIsEndless(false); setFinalPrize(0); setIsDemo(false);
  };

  // Per-round reset for the demo. Same as resetState minus the deck and minus
  // isDemo, so Try Again lands on question one of a fresh shuffle.
  const resetRound = () => {
    setLevel(0); setSelected(null); setLocked(false);
    setRevealCorrect(false); setRevealWrong(false); setShowFloating(false);
    setStreak(0); setLives(LIVES_PER_ROUND); setCorrectCount(0);
    setResults([]); setMissed([]);
    setHomeConfirm(false); setSkipConfirm(false);
    setIsEndless(false); setFinalPrize(0);
  };

  const goWalkthrough = () => { initAudio(); sfx.current.click(); setWalkStep(0); setPhase("walkthrough"); };

  const goMap = () => {
    initAudio(); sfx.current.click(); music.current.stop();
    if (phase === "playing" || phase === "revealing" || phase === "locking") {
      EV.trackRunEnd("abandoned", { level, mode: isDemo ? "demo" : isEndless ? "endless" : "ladder" });
      EV.flush();
    }
    EV.trackNav("map"); resetState(); setPhase("map");
  };
  const playAgain = () => { initAudio(); sfx.current.click(); goMap(); };

  const exitDemo = () => {
    initAudio(); sfx.current.click(); music.current.stop();
    if (phase === "playing" || phase === "revealing" || phase === "locking") {
      EV.trackRunEnd("abandoned", { level, mode: "demo" }); EV.flush();
    }
    EV.trackNav("home");
    resetState();
    setChapter(null);
    setWalkStep(0);
    setPhase("start");
  };

  const startChapter = async (district, chapterRef) => {
    resetState();
    setChapter(null);
    setLoadError(null);
    setPhase("loading");
    try {
      const ch = await loadChapter(district.id, chapterRef);
      const d = buildDeck(ch, CHAPTER_DECK_SIZE);
      setChapter(ch);
      setDeck(d);
      EV.trackModeStart("chapter", d, { chapterId: ch.id, districtId: district.id, deckSize: d.length, lives: LIVES_PER_ROUND });
      setPhase("preround");
    } catch (err) {
      setLoadError(err.message || String(err));
      setPhase("loaderror");
    }
  };

  // The demo. Five questions, three lives, straight from the map into question
  // one: no pre-round screen, no safety note, no disclaimer. The walkthrough
  // already carried the warning and the event table has a person standing at it.
  const startDemo = async () => {
    if (!demoCanPlay) return;
    resetState();
    setChapter(null);
    setLoadError(null);
    setPhase("loading");
    try {
      const pool = await loadDemo();
      const d = buildDeck(pool, DEMO_DECK_SIZE);
      setChapter(pool);
      setDeck(d);
      setIsDemo(true);
      EV.trackModeStart("demo", d, { poolId: "demo", poolSize: pool.questions.length, run: demoRuns.length + 1, deckSize: d.length, lives: LIVES_PER_ROUND });
      setPhase(demoRuns.length === 0 ? "demointro" : "playing");
    } catch (err) {
      setLoadError(err.message || String(err));
      setPhase("loaderror");
    }
  };

  const demoTryAgain = () => {
    if (!demoCanPlay || !chapter) return;
    sfx.current.click();
    music.current.stop();
    resetRound();
    const d = buildDeck(chapter, DEMO_DECK_SIZE);
    setDeck(d);
    EV.trackModeStart("demo", d, { poolId: "demo", poolSize: chapter.questions.length, run: demoRuns.length + 1, deckSize: d.length, lives: LIVES_PER_ROUND });
    setPhase("playing");
  };

  // Recording a finished round. Right and wrong are both stored, because the
  // end screen now reports both and "how far you got" stopped being the score
  // the moment a run could survive a miss.
  const recordDemoRun = (right, wrong, cleared) => {
    setDemoRuns((rs) => (rs.length >= MAX_DEMO_RUNS ? rs : [...rs, { correct: right, wrong, won: !!cleared }]));
  };

  const demoWon = demoRuns.some((r) => r.won);
  const demoRunsUsed = demoRuns.length;
  const demoCanPlay = !demoWon && demoRunsUsed < MAX_DEMO_RUNS;

  const currentQ = deck[level];
  const runLength = deck.length || CHAPTER_DECK_SIZE;
  const wrongCount = LIVES_PER_ROUND - lives;
  // What the player is WORTH: driven by right answers, not by questions seen.
  // A miss costs a life and leaves the number where it was.
  const prizeFor = (n) => (n <= 0 ? 0 : LADDER[Math.min(n, LADDER.length) - 1].prize);
  const rung = { level: correctCount, prize: prizeFor(correctCount) };
  const stage = isEndless ? 3 : musicStageFor(level);

  const enterEndless = () => {
    sfx.current.click();
    const extra = buildEndlessDeck(deck, chapter);
    EV.trackModeStart("endless", extra, { lives: LIVES_PER_ROUND });
    setFinalPrize(prizeFor(correctCount));
    setBestRun((b) => Math.max(b, prizeFor(correctCount)));
    setDeck([...deck, ...extra]);
    setIsEndless(true);
    setLevel(deck.length);
    setSelected(null); setLocked(false); setRevealCorrect(false); setRevealWrong(false);
    setShowFloating(false);
    setPhase("playing");
  };

  const onSelect = (idx) => {
    if (phase !== "playing") return;
    sfx.current.select();
    const m = qMeter.current;
    if (m.firstSelectAt === null) m.firstSelectAt = performance.now();
    else if (idx !== selected) m.changes += 1;
    setSelected(idx);
  };

  const onLockIn = () => {
    if (selected === null) return;
    const wasRight = selected === currentQ.correct;
    {
      const m = qMeter.current;
      const t = performance.now();
      EV.trackAnswer(currentQ, {
        // Display index, NOT authored. optionIds is already permuted into
        // display order by shuffleOptions, so events.js indexes it directly.
        displayIndex: selected,
        correct: wasRight,
        exposure: m.exposure,
        msToFirstSelect: m.firstSelectAt === null ? null : Math.round(m.firstSelectAt - m.shownAt),
        msToLock: Math.round(t - m.shownAt),
        selectionChanges: m.changes,
        lifelinesUsed: [],
        removedDisplayIndices: [],
      });
    }
    const s = stage;
    sfx.current.lockIn(s);
    sfx.current.duck(0.4, 200);
    music.current.duck(s === 1 ? 0.18 : s === 2 ? 0.3 : 0.4, 200);
    setLocked(true);
    setPhase("locking");
    setResults((r) => { const copy = r.slice(); copy[level] = wasRight; return copy; });
    setTimeout(() => {
      sfx.current.unduck(150);
      sfx.current.reveal();
      if (wasRight) {
        setRevealCorrect(true); setShowFloating(true);
        setStreak((v) => v + 1);
        setCorrectCount((v) => v + 1);
        setScreenFlash("warm");
        setTimeout(() => setScreenFlash(null), 600);
        setTimeout(() => sfx.current.correct(s), 160);
        setPhase("revealing");
        music.current.unduck(800);
      } else {
        // A miss costs a life. It does NOT end the run unless that was the last
        // one, which is the whole point of the change.
        setLives((v) => v - 1);
        setStreak(0);
        setMissed((m) => [...m, currentQ]);
        setRevealWrong(true);
        setScreenFlash("red");
        setScreenShake(true);
        setTimeout(() => setScreenFlash(null), 600);
        setTimeout(() => setScreenShake(false), 500);
        setTimeout(() => sfx.current.wrong(), 150);
        setPhase("revealing");
        music.current.duck(0.12, 400);
      }
    }, LOCK_PAUSE_MS);
  };

  const advance = () => {
    sfx.current.click();
    const runMode = isDemo ? "demo" : isEndless ? "endless" : "ladder";

    // Out of lives ends the run wherever it is.
    if (lives <= 0) {
      music.current.stop();
      setFinalPrize(0);
      if (isDemo) recordDemoRun(correctCount, LIVES_PER_ROUND, false);
      EV.trackRunEnd("lost", { level, mode: runMode, correct: correctCount, wrong: LIVES_PER_ROUND });
      EV.flush();
      setPhase("gameover");
      return;
    }

    const next = level + 1;

    // Reached the end of the deck with lives to spare. This is a finished round
    // whether or not every answer was right, which is the other half of the
    // lives change: "cleared it" now means "got to the end", not "was perfect".
    if (next >= deck.length) {
      const prize = prizeFor(correctCount);
      setFinalPrize(prize);
      setBestRun((v) => Math.max(v, prize));
      EV.trackRunEnd("won", { level, mode: runMode, correct: correctCount, wrong: wrongCount });
      EV.flush();
      if (isDemo) {
        recordDemoRun(correctCount, wrongCount, true);
        setPhase("won");
        setTimeout(() => sfx.current.win(), 200);
        music.current.stop();
        return;
      }
      if (isEndless) {
        setPhase("won");
        setTimeout(() => sfx.current.win(), 200);
        setTimeout(() => music.current.stop(), 200);
        return;
      }
      setPhase("winbig");
      music.current.duck(0.12, 400);
      return;
    }

    const nextStage = isEndless ? 3 : musicStageFor(next);
    setLevel(next);
    setSelected(null); setLocked(false); setRevealCorrect(false); setRevealWrong(false);
    setShowFloating(false);
    if (nextStage !== stage) music.current.setStage(nextStage);
    setPhase("playing");
  };

  const openSkipConfirm = () => {
    if (skipConfirmed) { doSkip(); return; }
    sfx.current.modalOpen();
    setSkipConfirm(true);
  };
  const cancelSkip = () => { sfx.current.click(); setSkipConfirm(false); };
  const doSkip = () => {
    sfx.current.click();
    EV.trackReviewCard(currentQ, -1, { skipped: true, correct: revealCorrect });
    setSkipConfirm(false); setSkipConfirmed(true); advance();
  };

  const askHome = () => {
    if (phase === "start" || phase === "map" || phase === "gameover" || phase === "won" || phase === "winbig") return;
    sfx.current.modalOpen();
    setHomeConfirm(true);
  };
  const cancelHome = () => { sfx.current.click(); setHomeConfirm(false); };
  const confirmHome = () => { setHomeConfirm(false); if (isDemo) exitDemo(); else goMap(); };

  const askLogo = () => { sfx.current.modalOpen(); setLogoConfirm(true); };
  const cancelLogo = () => { sfx.current.click(); setLogoConfirm(false); };
  const confirmLogo = () => {
    sfx.current.click();
    setLogoConfirm(false);
    try { window.open(LOGO.url, "_blank", "noopener,noreferrer"); } catch {}
  };

  const beginRound = () => {
    sfx.current.click();
    setSeenDisclaimer(true);
    EV.trackNav("round_start");
    setPhase("playing");
    setTimeout(() => { music.current.start(); music.current.setStage(1); }, 200);
  };

  const winTakeMoney = () => { sfx.current.click(); music.current.stop(); EV.trackRunEnd("walked", { level, mode: "endless", correct: correctCount, wrong: wrongCount }); EV.flush(); setPhase("won"); };
  const winKeepGoing = () => { sfx.current.click(); enterEndless(); };

  const walkNext = () => { sfx.current.click(); if (walkStep < R.walkthrough.length - 1) setWalkStep(walkStep + 1); else goMap(); };
  const walkPrev = () => { sfx.current.click(); if (walkStep > 0) setWalkStep(walkStep - 1); };
  const walkSkip = () => { sfx.current.click(); goMap(); };

  // -------------------------------------------------------------------------
  // Screens
  // -------------------------------------------------------------------------

  if (phase === "preround")
    return c.jsx(Shell, { muted, setMuted, onLogoClick: askLogo,
      children: c.jsx("div", {
        style: { minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" },
        children: c.jsxs("div", { style: { width: "100%", maxWidth: 560 }, children: [
          c.jsx("div", {
            style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 2.4, color: u.brand, marginBottom: 6 },
            children: chapter ? chapter.name : ""
          }),
          !seenDisclaimer && c.jsxs("div", {
            style: {
              background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 12,
              boxShadow: U.md, padding: "18px 20px", marginBottom: 14
            },
            children: [
              c.jsx("div", {
                style: { fontFamily: C.display, fontSize: 17, color: u.text, marginBottom: 8 },
                children: R.disclaimer.title
              }),
              ...R.disclaimer.lines.map((l, i) => c.jsx("p", {
                style: { fontFamily: C.body, fontSize: 14, lineHeight: 1.55, color: u.textDim, margin: "0 0 6px" },
                children: l
              }, i))
            ]
          }),
          chapter && chapter.safetyNote && c.jsxs("div", {
            style: {
              display: "flex", gap: 12, alignItems: "flex-start",
              background: u.terraSoft, border: `2px solid ${u.terra}`,
              borderRadius: 12, padding: "16px 18px", boxShadow: U.sm
            },
            children: [
              c.jsx("span", { "aria-hidden": true, style: { fontSize: 20, lineHeight: 1.2, flexShrink: 0 }, children: "\u26A0" }),
              c.jsxs("div", { children: [
                c.jsx("div", {
                  style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: u.terra, fontWeight: 700, marginBottom: 5 },
                  children: R.safetyHeading
                }),
                c.jsx("p", {
                  style: { fontFamily: C.body, fontSize: 15, lineHeight: 1.55, color: u.text, margin: 0, fontWeight: 500 },
                  children: chapter.safetyNote
                })
              ] })
            ]
          }),
          c.jsx("div", {
            style: { display: "flex", justifyContent: "center", marginTop: 20 },
            children: c.jsx(Button, { onClick: beginRound, variant: "primary", children: R.roundStart })
          })
        ] })
      })
    });

  if (phase === "loading")
    return c.jsx(Shell, { muted, setMuted, onLogoClick: askLogo,
      children: c.jsx("div", {
        style: { minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" },
        children: c.jsx("div", {
          style: { fontFamily: C.mono, fontSize: 12, letterSpacing: 2, color: u.textMuted },
          children: "DEALING THE QUESTIONS\u2026"
        })
      })
    });

  if (phase === "loaderror")
    return c.jsx(Shell, { muted, setMuted, onLogoClick: askLogo,
      children: c.jsx("div", {
        style: { minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" },
        children: c.jsxs("div", {
          style: {
            background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 12,
            boxShadow: U.md, padding: "24px 26px", maxWidth: 460, textAlign: "center"
          },
          children: [
            c.jsx("div", {
              style: { fontFamily: C.display, fontSize: 22, color: u.text, marginBottom: 8 },
              children: "THAT CHAPTER DID NOT LOAD"
            }),
            c.jsx("div", {
              style: { fontFamily: C.body, fontSize: 14, color: u.textDim, marginBottom: 18 },
              children: "Its questions could not be fetched. Check your connection and pick it again."
            }),
            c.jsx(Button, { onClick: goMap, variant: "primary", size: "sm", children: "Back to the map" })
          ]
        })
      })
    });

  if (phase === "start")
    return c.jsxs(Shell, { muted, setMuted, onLogoClick: askLogo, children: [
      c.jsx(StartScreen, { onPlay: goWalkthrough, bestRun }),
      logoConfirm && c.jsx(LogoConfirm, { onGo: confirmLogo, onCancel: cancelLogo })
    ] });

  if (phase === "walkthrough")
    return c.jsxs(Shell, { muted, setMuted, onLogoClick: askLogo, children: [
      c.jsx(WalkScreen, { step: walkStep, total: R.walkthrough.length, screen: R.walkthrough[walkStep], onNext: walkNext, onPrev: walkPrev, onSkip: walkSkip, isLast: walkStep === R.walkthrough.length - 1, canPrev: walkStep > 0 }),
      logoConfirm && c.jsx(LogoConfirm, { onGo: confirmLogo, onCancel: cancelLogo })
    ] });

  if (phase === "map")
    return c.jsxs(Shell, { muted, setMuted, onLogoClick: askLogo, children: [
      c.jsx(MapScreen, {
        onPlayChapter: startChapter, onHome: () => { resetState(); setPhase("start"); },
        onPlayDemo: startDemo, demoRunsUsed, demoMaxRuns: MAX_DEMO_RUNS, demoCanPlay, demoWon
      }),
      logoConfirm && c.jsx(LogoConfirm, { onGo: confirmLogo, onCancel: cancelLogo })
    ] });

  if (phase === "winbig")
    return c.jsxs(Shell, { muted, setMuted, hideSoundButton: true, onLogoClick: askLogo, children: [
      c.jsx(WinBigScreen, {
        prize: finalPrize || prizeFor(correctCount),
        correctCount, wrongCount, livesLeft: lives,
        sfx: sfx.current, onTakeMoney: winTakeMoney, onKeepGoing: winKeepGoing
      }),
      logoConfirm && c.jsx(LogoConfirm, { onGo: confirmLogo, onCancel: cancelLogo })
    ] });

  if (phase === "demointro") {
    return c.jsxs(Shell, { muted, setMuted, onLogoClick: askLogo, children: [
      c.jsx(DemoIntroScreen, { maxRuns: MAX_DEMO_RUNS, onStart: () => { sfx.current.click(); setPhase("playing"); } }),
      logoConfirm && c.jsx(LogoConfirm, { onGo: confirmLogo, onCancel: cancelLogo })
    ] });
  }

  if (isDemo && (phase === "gameover" || phase === "won")) {
    return c.jsxs(Shell, { muted, setMuted, onLogoClick: askLogo, children: [
      c.jsx(DemoEndScreen, {
        runs: demoRuns, maxRuns: MAX_DEMO_RUNS, canPlay: demoCanPlay,
        won: phase === "won", deckSize: runLength,
        thisCorrect: correctCount, thisWrong: phase === "won" ? wrongCount : LIVES_PER_ROUND,
        missedQuestions: missed,
        onTryAgain: demoTryAgain, onHome: exitDemo
      }),
      logoConfirm && c.jsx(LogoConfirm, { onGo: confirmLogo, onCancel: cancelLogo })
    ] });
  }

  if (phase === "gameover" || phase === "won") {
    return c.jsxs(Shell, { muted, setMuted, onLogoClick: askLogo, children: [
      c.jsx(EndScreen, {
        phase, finalPrize, bestRun, streak, isEndless,
        correctCount, wrongCount: phase === "won" ? wrongCount : LIVES_PER_ROUND,
        missedQuestions: missed,
        onPlayAgain: playAgain, onHome: goMap
      }),
      logoConfirm && c.jsx(LogoConfirm, { onGo: confirmLogo, onCancel: cancelLogo })
    ] });
  }

  if (phase === "revealing") {
    return c.jsxs(Shell, { muted, setMuted, screenFlash, screenShake, hideSoundButton: true, hideLogo: true, children: [
      c.jsx(RevealScreen, {
        question: currentQ, level, runLength, isEndless, streak,
        revealCorrect, selectedIdx: selected, muted, setMuted,
        lives, isLastQuestion: level + 1 >= deck.length,
        onNext: advance, onHome: askHome,
        onFlipSound: () => sfx.current.cardFlip(),
        onRevisitSound: () => sfx.current.cardRevisit(),
        onAckSound: () => sfx.current.click(),
        onSkipReview: openSkipConfirm
      }),
      homeConfirm && c.jsx(ConfirmModal, { title: R.homeConfirm.title, body: R.homeConfirm.body, primaryLabel: R.homeConfirm.leaveLabel, secondaryLabel: R.homeConfirm.stayLabel, primaryVariant: "danger", onPrimary: confirmHome, onSecondary: cancelHome }),
      skipConfirm && c.jsx(ConfirmModal, { title: R.review.skipConfirmTitle, body: R.review.skipConfirmBody, primaryLabel: R.review.skipConfirmPrimary, secondaryLabel: R.review.skipConfirmSecondary, primaryVariant: "danger", onPrimary: doSkip, onSecondary: cancelSkip })
    ] });
  }

  // playing or locking
  return c.jsxs(Shell, { muted, setMuted, screenFlash, screenShake, hideSoundButton: true, onLogoClick: askLogo, children: [
    c.jsx(QuestionScreen, {
      question: currentQ, level, runLength, rung, stage, streak, selectedIdx: selected,
      locked, revealCorrect, revealWrong, showFloating, phase, results,
      lives, muted, setMuted, isEndless, isDemo, correctCount,
      onSelect, onLockIn, onHome: askHome
    }),
    homeConfirm && c.jsx(ConfirmModal, { title: R.homeConfirm.title, body: R.homeConfirm.body, primaryLabel: R.homeConfirm.leaveLabel, secondaryLabel: R.homeConfirm.stayLabel, primaryVariant: "accent", onPrimary: confirmHome, onSecondary: cancelHome }),
    logoConfirm && c.jsx(LogoConfirm, { onGo: confirmLogo, onCancel: cancelLogo })
  ] });
}

function LogoConfirm({ onGo, onCancel }) {
  return c.jsx(ConfirmModal, {
    title: "Leave the game?",
    body: "This opens ccjtkalamazoo.org in a new tab. Your game will stay open here.",
    primaryLabel: "Go to site",
    secondaryLabel: "Stay here",
    primaryVariant: "primary",
    onPrimary: onGo,
    onSecondary: onCancel
  });
}

// ===========================================================================
// Lives
// ===========================================================================
// Three hearts, filled for what is left and hollow for what is spent. Drawn
// rather than emoji so it matches the printed-ink look and renders identically
// on every device, which an emoji heart very much does not.
function Heart({ filled, size = 22, pulse }) {
  return c.jsx("svg", {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: filled ? u.terra : "none",
    stroke: filled ? u.outline : u.borderLight,
    strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round",
    "aria-hidden": true,
    style: pulse ? { animation: "ts-streak-pop 0.5s ease-out" } : undefined,
    children: c.jsx("path", { d: "M19 14c1.5-1.5 2-3.2 2-5a5 5 0 0 0-9-3 5 5 0 0 0-9 3c0 1.8.5 3.5 2 5l7 7z" })
  });
}

function LivesBox({ lives, max = LIVES_PER_ROUND, compact }) {
  const low = lives === 1;
  return c.jsxs("div", {
    className: "ts-lives-box",
    "aria-label": R.lives.remaining(lives),
    style: {
      flex: compact ? "0 0 auto" : "1 1 0", minWidth: 0,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
      padding: compact ? "6px 12px" : "12px 16px",
      background: low ? u.terraSoft : u.surface,
      border: `2px solid ${low ? u.terra : u.outline}`,
      borderRadius: 10, boxShadow: U.md
    },
    children: [
      c.jsx("div", {
        style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 2, color: low ? u.terra : u.textMuted, fontWeight: 700, textTransform: "uppercase" },
        children: R.lives.label
      }),
      c.jsx("div", {
        style: { display: "flex", gap: 5 },
        children: Array.from({ length: max }).map((_, i) => c.jsx(Heart, {
          filled: i < lives, size: compact ? 18 : 24, pulse: i === lives - 1 && low
        }, i))
      })
    ]
  });
}

// ===========================================================================
// Screens
// ===========================================================================

function StartScreen({ onPlay, bestRun }) {
  return c.jsxs("div", {
    className: "ts-start-screen",
    style: { flex: "1 0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center" },
    children: [
      R.presenter,
      c.jsx("h1", { className: "ts-start-title", style: { fontFamily: C.display, fontSize: "clamp(56px, 12vw, 140px)", lineHeight: 0.9, letterSpacing: "-0.01em", margin: 0, color: u.text, textShadow: `6px 6px 0 ${u.brand}`, maxWidth: "15ch" }, children: R.title }),
      c.jsxs("p", { style: { fontFamily: C.body, fontSize: 22, fontWeight: 700, color: u.text, maxWidth: 620, margin: "48px 0 12px", lineHeight: 1.4 }, children: [R.hero.headline, c.jsx("br", {}), c.jsx("span", { style: { color: u.brand }, children: R.hero.headlineAccent })] }),
      c.jsx("p", { style: { fontFamily: C.body, fontSize: 16, color: u.textDim, maxWidth: 560, margin: "0 0 44px", lineHeight: 1.65, fontWeight: 500 }, children: R.hero.subtitle }),
      c.jsx(Button, { onClick: onPlay, variant: "primary", size: "lg", children: R.playLabel }),
      bestRun > 0 && c.jsxs("div", { style: { marginTop: 32, fontFamily: C.mono, fontSize: 11, color: u.textMuted, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }, children: ["Best this session: ", c.jsx("span", { style: { color: u.brand, fontWeight: 700 }, children: fmtMoney(bestRun) })] })
    ]
  });
}

function WalkScreen({ step, total, screen, onNext, onPrev, onSkip, isLast, canPrev }) {
  return c.jsxs("div", {
    className: "ts-walk-screen",
    style: { flex: "1 0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" },
    children: [
      c.jsxs("div", {
        className: "ts-walk-card",
        style: { maxWidth: 640, width: "100%", background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 14, boxShadow: U.lg, padding: "36px 40px 32px", textAlign: "center", animation: "ts-fade-in 0.35s ease-out", display: "flex", flexDirection: "column", boxSizing: "border-box" },
        children: [
          c.jsxs("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 3, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 20, flexShrink: 0 }, children: [R.walkthroughStepPrefix, " ", step + 1, " of ", total] }),
          c.jsxs("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center" }, children: [
            c.jsx("h2", { className: "ts-walk-title", style: { fontFamily: C.display, fontSize: "clamp(36px, 6vw, 56px)", lineHeight: 0.95, letterSpacing: "-0.01em", margin: 0, color: u.text, textShadow: `4px 4px 0 ${u.brand}` }, children: screen.title }),
            c.jsx("div", { style: { margin: "32px 0 28px", display: "flex", justifyContent: "center" }, children: c.jsx(WalkArt, { screen }) }),
            c.jsx("p", { style: { fontFamily: C.body, fontSize: 16, color: u.textDim, lineHeight: 1.7, fontWeight: 500, margin: "0 auto", maxWidth: 500 }, children: screen.body })
          ] }),
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

function WalkArt({ screen }) {
  if (screen.type === "safety")
    return c.jsx("div", { style: { fontFamily: C.display, fontSize: 46, lineHeight: 1, color: u.terra, textShadow: `4px 4px 0 ${u.outline}`, border: `3px solid ${u.outline}`, borderRadius: 14, background: u.surfaceHigh, padding: "18px 26px", boxShadow: U.lg }, children: "\u26A0 SAFETY FIRST" });
  // The lives slide. Three full hearts, drawn at size, because the mechanic is
  // simple enough that showing it is the whole explanation.
  if (screen.type === "lives")
    return c.jsx("div", { style: { display: "flex", gap: 14, padding: "16px 24px", background: u.surfaceHigh, border: `3px solid ${u.outline}`, borderRadius: 14, boxShadow: U.lg }, children: [0, 1, 2].map((i) => c.jsx(Heart, { filled: true, size: 46 }, i)) });
  if (screen.type === "ladder") {
    const rows = [{ label: "Q15", prize: "$1M", highlight: true }, { label: "Q10", prize: "$32K" }, { label: "Q5", prize: "$1K" }, { label: "Q1", prize: "$100" }];
    return c.jsx("div", { className: "ts-walk-ladder-mini", style: { display: "inline-block", border: `2px solid ${u.outline}`, borderRadius: 8, background: u.surfaceHigh, overflow: "hidden", boxShadow: U.md }, children: rows.map((n, r) => c.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", gap: 16, background: n.highlight ? u.brand : "transparent", color: n.highlight ? u.textOnDark : u.text, borderTop: r === 0 ? "none" : `1px solid ${u.borderLight}`, minWidth: 180 }, children: [c.jsx("span", { style: { fontFamily: C.mono, fontSize: 11, fontWeight: 700 }, children: n.label }), c.jsx("span", { style: { fontFamily: C.display, fontSize: 16 }, children: n.prize })] }, r)) });
  }
  if (screen.type === "questions")
    return c.jsx("div", { className: "ts-walk-answer-mini", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 320 }, children: ["A", "B", "C", "D"].map((t) => c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, background: u.surfaceHigh, border: `2px solid ${u.outline}`, borderRadius: 8, padding: "10px 12px", boxShadow: U.sm }, children: [c.jsx("span", { style: { fontFamily: C.display, fontSize: 13, color: u.textOnDark, background: u.brand, border: `2px solid ${u.outline}`, borderRadius: 5, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }, children: t }), c.jsxs("span", { style: { fontFamily: C.body, fontSize: 12, color: u.textDim, fontWeight: 500 }, children: ["Choice ", t.toLowerCase()] })] }, t)) });
  if (screen.type === "cards")
    return c.jsx("div", { style: { display: "flex", gap: 8, perspective: 600 }, children: R.cardMeta.map((m, i) => c.jsx("div", { style: { width: 58, height: 78, background: i === 0 ? u.surfaceHigh : u.cardBack, border: `2px solid ${u.outline}`, borderRadius: 7, boxShadow: U.sm, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotateY(${i === 0 ? 0 : -22}deg)`, color: i === 0 ? u.brand : u.brandSoft, fontFamily: C.display, fontSize: 20 }, children: i === 0 ? m.icon : "?" }, i)) });
  if (screen.type === "ready")
    return c.jsx("div", { style: { fontFamily: C.display, fontSize: 44, color: u.terra, letterSpacing: 2, textShadow: `4px 4px 0 ${u.outline}` }, children: "\u2726 \u2726 \u2726" });
  return null;
}

// ---------------------------------------------------------------------------
// FitText : shrinks its font-size until the text fits the container width.
// ---------------------------------------------------------------------------
function FitText({ children, max = 40, min = 16, style }) {
  const boxRef = useRef(null);
  const spanRef = useRef(null);
  const [size, setSize] = useState(max);
  useEffect(() => {
    const box = boxRef.current, span = spanRef.current;
    if (!box || !span) return;
    const fit = () => {
      let s = max;
      span.style.fontSize = s + "px";
      while (s > min && span.scrollWidth > box.clientWidth) {
        s -= 1;
        span.style.fontSize = s + "px";
      }
      setSize(s);
    };
    fit();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [children, max, min]);
  return c.jsx("div", {
    ref: boxRef,
    style: { width: "100%", display: "flex", justifyContent: "center", overflow: "hidden" },
    children: c.jsx("span", {
      ref: spanRef,
      style: { ...style, fontSize: size, whiteSpace: "nowrap" },
      children
    })
  });
}

function QuestionScreen(props) {
  const { question, level, runLength, rung, stage, streak, selectedIdx, locked, revealCorrect,
    revealWrong, showFloating, phase, results, lives, muted,
    setMuted, isEndless, isDemo, onSelect, onLockIn, onHome } = props;
  return c.jsxs("div", {
    style: { maxWidth: 1280, margin: "0 auto", padding: "24px 24px 24px", display: "flex", gap: 28, alignItems: "flex-start", flex: "1 0 auto", width: "100%", boxSizing: "border-box" },
    className: "ts-game-layout ts-game-screen",
    children: [
      c.jsxs("div", { className: "ts-game-main", style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }, children: [
        c.jsxs("div", { className: "ts-top-bar", style: { display: "flex", alignItems: "stretch", gap: 12 }, children: [
          c.jsx(Button, { variant: "secondary", size: "sm", onClick: onHome, className: "ts-home-btn", style: { fontSize: 13 }, children: R.homeButton }),
          c.jsx("button", {
            onClick: () => setMuted((m) => !m), "aria-label": muted ? "Unmute sound" : "Mute sound",
            className: "ts-music-btn ts-music-inline",
            style: { flex: 1, background: muted ? "transparent" : u.surface, border: `2px solid ${u.outline}`, color: muted ? u.textMuted : u.text, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: C.mono, fontSize: 13, letterSpacing: 1.5, fontWeight: 700, boxShadow: muted ? "none" : U.sm, WebkitTapHighlightColor: "transparent" },
            children: muted ? "\u266A MUSIC OFF" : "\u266A MUSIC ON"
          })
        ] }),

        // The stat row. Lives took the slot the shop used to occupy, which is
        // the right trade: the shop was a thing almost nobody opened, and lives
        // are a thing every player needs to see at all times.
        c.jsxs("div", { className: "ts-stat-row", style: { display: "flex", gap: 12, alignItems: "stretch" }, children: [
          c.jsx(LivesBox, { lives }),
          c.jsxs("div", { className: "ts-stat-money", style: { flex: "2 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "12px 16px", background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 10, boxShadow: U.md }, children: [
            c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 2, color: u.textMuted, fontWeight: 700, textTransform: "uppercase" }, children: isEndless ? "Streak" : "Worth" }),
            c.jsx(FitText, {
              max: 44, min: 18,
              style: { fontFamily: C.display, color: isEndless ? (streak > 0 ? u.terra : u.textMuted) : u.brand, letterSpacing: "-0.01em", lineHeight: 1 },
              children: isEndless ? String(streak) : fmtMoney(rung.prize)
            })
          ] })
        ] }),
        c.jsx(ProgressDots, { level, runLength, results, revealCorrect, revealWrong, isEndless }),
        c.jsx("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }, children:
          c.jsx("div", { className: "ts-q-header", style: { fontFamily: C.display, fontSize: 28, letterSpacing: "-0.01em", color: u.text, lineHeight: 1 }, children: isEndless
            ? c.jsxs(c.Fragment, { children: [R.endlessMode.headerLabel, " Q", String(level + 1).padStart(2, "0")] })
            : c.jsxs(c.Fragment, { children: ["QUESTION ", String(level + 1).padStart(2, "0"), " ", c.jsxs("span", { className: "ts-q-header-total", style: { color: u.textMuted, fontSize: 18 }, children: ["/ ", String(runLength)] })] }) })
        }),
        c.jsx("div", { className: "ts-question-card", style: { position: "relative", background: u.surfaceHigh, border: `2px solid ${u.outline}`, borderLeft: `8px solid ${u.brand}`, padding: "32px 36px", borderRadius: 10, animation: revealWrong ? "ts-wrong-shake-card 0.5s ease-out" : "ts-fade-in 0.4s ease-out", boxShadow: U.md }, children:
          c.jsx("p", { style: { fontFamily: C.body, fontSize: "clamp(19px, 2.2vw, 24px)", lineHeight: 1.45, fontWeight: 600, margin: 0, color: u.text }, children: question.q })
        }, "q-" + level),
        c.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }, className: "ts-answer-grid", children: question.options.map((opt, i) => c.jsx(AnswerButton, {
          letter: ["A", "B", "C", "D"][i], text: opt, selected: selectedIdx === i, locked,
          isCorrect: i === question.correct, isSelectedAnswer: selectedIdx === i, revealCorrect, revealWrong,
          stage, onClick: () => onSelect(i)
        }, i)) }),
        c.jsx("div", { className: "ts-action-bar", style: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14 }, children:
          c.jsx("div", { className: "ts-action-bar-right", style: { display: "flex", gap: 12 }, children: c.jsx(Button, { variant: "primary", size: "md", disabled: selectedIdx === null || locked, onClick: onLockIn, children: "Lock It In" }) })
        })
      ] }),
      // The money rail is hidden in the demo: it has 15 rungs and the demo is a
      // five-question round, so showing it would be describing a game the player
      // is not playing.
      !isDemo && c.jsxs("div", { className: "ts-ladder-col", style: { display: "flex", flexDirection: "column", gap: 12 }, children: [
        c.jsx("button", {
          onClick: () => setMuted((m) => !m), "aria-label": muted ? "Unmute sound" : "Mute sound",
          className: "ts-music-btn ts-music-ladder",
          style: { background: muted ? "transparent" : u.surface, border: `2px solid ${u.outline}`, color: muted ? u.textMuted : u.text, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: C.mono, fontSize: 12, letterSpacing: 1.5, fontWeight: 700, boxShadow: muted ? "none" : U.sm, WebkitTapHighlightColor: "transparent", alignSelf: "flex-end" },
          children: muted ? "\u266A MUSIC OFF" : "\u266A MUSIC ON"
        }),
        c.jsx(Ladder, { rungsEarned: props.correctCount, isEndless, streak })
      ] }),
      revealCorrect && c.jsx(Confetti, { intensity: stage >= 3 ? "high" : stage >= 2 ? "med" : "low" })
    ]
  });
}

// The progress bar. One segment per question in THIS run, not a fixed 15, and
// it reads from the results array so a red segment can sit mid-run with green
// ones after it. Under the old one-miss rule that state was impossible.
function ProgressDots({ level, runLength, results = [], revealCorrect, revealWrong, isEndless }) {
  const n = isEndless ? Math.max(runLength, level + 1) : runLength;
  return c.jsx("div", { className: "ts-progress-dots", style: { display: "flex", gap: 4, alignItems: "center" }, children: Array.from({ length: n }).map((_, i) => {
    const res = results[i];
    const current = i === level;
    const green = res === true || (current && revealCorrect);
    const red = res === false || (current && revealWrong);
    return c.jsx("div", { style: { flex: 1 }, children: c.jsx("div", { style: { width: "100%", height: 6, borderRadius: 3, background: green ? u.green : red ? u.red : current ? u.brand : u.borderLight, border: `1px solid ${u.outline}`, animation: green ? "ts-dot-fill 0.4s ease-out" : "none", transition: "background 0.3s" } }, "dot-" + i + "-" + green + "-" + red) }, i);
  }) });
}

function AnswerButton(props) {
  const { letter, text, selected, locked, isCorrect, isSelectedAnswer, revealCorrect, revealWrong, stage, onClick } = props;
  let bg = u.surface, border = u.outline, color = u.text, anim = "", letterBg = u.brand, letterColor = u.textOnDark, shadow = U.md, transform = "translate(0, 0)";
  if (revealCorrect && isCorrect) { bg = u.green; color = u.textOnDark; letterBg = u.surface; letterColor = u.green; anim = "ts-correct-pop 0.8s ease-out"; }
  else if (revealWrong && isCorrect) { bg = u.green; color = u.textOnDark; letterBg = u.surface; letterColor = u.green; anim = "ts-correct-pop 0.9s ease-out"; }
  else if (revealWrong && isSelectedAnswer) { bg = u.red; color = u.textOnDark; letterBg = u.surface; letterColor = u.red; }
  else if (locked && selected) { bg = u.brandSoft; anim = `ts-tension-${stage} ${1.6 - stage * 0.1}s ease-in-out infinite`; shadow = "none"; transform = "translate(4px, 4px)"; }
  else if (selected) { bg = u.brandSoft; shadow = U.sm; transform = "translate(1px, 1px)"; }
  return c.jsxs("button", {
    onClick, disabled: locked, className: "ts-answer-btn",
    style: { textAlign: "left", background: bg, color, border: `2px solid ${border}`, borderRadius: 10, padding: "16px 18px", cursor: locked ? "default" : "pointer", fontFamily: C.body, fontSize: 15, fontWeight: 600, transition: "background 0.18s, box-shadow 0.12s, transform 0.12s, opacity 0.3s", animation: anim, position: "relative", minHeight: 68, display: "flex", alignItems: "center", gap: 14, lineHeight: 1.4, boxShadow: shadow, transform },
    onMouseEnter: (e) => { if (!locked && !selected) { e.currentTarget.style.boxShadow = "2px 2px 0 " + u.outline; e.currentTarget.style.transform = "translate(2px, 2px)"; } },
    onMouseLeave: (e) => { if (!locked && !selected) { e.currentTarget.style.boxShadow = U.md; e.currentTarget.style.transform = "translate(0, 0)"; } },
    children: [
      c.jsx("span", { className: "ts-answer-btn-letter", style: { fontFamily: C.display, fontSize: 18, color: letterColor, background: letterBg, border: `2px solid ${u.outline}`, borderRadius: 6, width: 36, height: 36, minWidth: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: 0, lineHeight: 1 }, children: letter }),
      c.jsx("span", { style: { flex: 1 }, children: text })
    ]
  });
}

// The money ladder rail down the right side. Highlights by RIGHT ANSWERS now,
// not by questions seen, so a miss leaves the marker where it was.
function Ladder({ rungsEarned = 0, isEndless, streak }) {
  return c.jsxs("aside", {
    className: "ts-ladder",
    style: { width: 240, flexShrink: 0, background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 10, position: "sticky", top: 60, maxHeight: "calc(100vh - 80px)", overflowY: "auto", boxShadow: U.md },
    children: [
      c.jsx("div", { style: { fontFamily: C.display, fontSize: isEndless ? 16 : 20, letterSpacing: 0, color: u.text, padding: "14px 18px", borderBottom: `2px solid ${u.outline}`, background: isEndless ? u.terraSoft : u.brandSoft, textAlign: "center" }, children: isEndless
        ? c.jsxs(c.Fragment, { children: [R.endlessMode.ladderLabel, c.jsxs("div", { style: { fontFamily: C.display, fontSize: 26, color: u.terra, lineHeight: 1, marginTop: 4 }, children: ["STREAK ", streak] })] })
        : "THE LADDER" }),
      [...LADDER].reverse().map((r) => {
        const active = !isEndless && r.level === rungsEarned + 1;
        const done = isEndless || r.level <= rungsEarned;
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
//   1. VERDICT   right or wrong, what the correct answer was, and (on a miss)
//                what it cost.
//   2. CARDS     three cards, one at a time: THE LAW, REMEMBER THIS, IN REAL LIFE.
//
// Each card has a ~2s read-gate and an "I understand" tap. That used to be a
// Redeem button worth a point, and the point bought lifelines. The economy is
// gone; the beat is not. The two-second gate plus a deliberate tap is what makes
// somebody actually look at the card, and that worked. The currency did not.
//
// Cards show identically on a right and a wrong answer. Under the old rules a
// wrong answer ended the run, so the explanation reached only the players who
// already knew it. That was backwards.
function RevealScreen(props) {
  const { question, level, runLength, isEndless, revealCorrect, selectedIdx, muted, setMuted,
    lives, isLastQuestion, onNext, onHome, onFlipSound, onRevisitSound, onAckSound, onSkipReview } = props;

  const [step, setStep] = useState("verdict"); // "verdict" | "cards"
  const [current, setCurrent] = useState(0);
  const [seen, setSeen] = useState([false, false, false]);
  const [acked, setAcked] = useState([false, false, false]);
  const [dir, setDir] = useState(1);
  const [firstView, setFirstView] = useState(true);
  const [dwellDone, setDwellDone] = useState(false);
  const dwellTimer = useRef(null);

  const CARD_COUNT = R.cardMeta.length; // 3

  const cardShownAt = useRef(performance.now());
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo(0, 0);
    cardShownAt.current = performance.now();
  }, [current]);
  const DWELL_MS = 2000;

  // One event per card actually viewed, emitted on the way out of it. Fires on a
  // right answer and a wrong one alike, which is what makes "did they read
  // harder after missing it" a query rather than a guess.
  const emitted = useRef([false, false, false]);
  const emitCard = (idx) => {
    if (idx < 0 || idx > CARD_COUNT - 1) return;
    if (emitted.current[idx]) return;
    emitted.current[idx] = true;
    EV.trackReviewCard(question, idx, {
      dwellMs: Math.round(performance.now() - cardShownAt.current),
      redeemed: !!acked[idx],
      skipped: false,
      correct: revealCorrect,
    });
  };

  const startDwell = () => {
    setDwellDone(false);
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    dwellTimer.current = setTimeout(() => setDwellDone(true), DWELL_MS);
  };

  const markSeen = (idx) => {
    if (seen[idx]) return;
    const copy = seen.slice();
    copy[idx] = true;
    setSeen(copy);
  };

  const acknowledge = (idx) => {
    if (acked[idx]) return;
    if (onAckSound) onAckSound();
    const copy = acked.slice();
    copy[idx] = true;
    setAcked(copy);
  };

  const advanceOut = () => { emitCard(current); onNext(); };

  useEffect(() => {
    if (step !== "cards") return;
    if (dwellDone && !seen[current]) markSeen(current);
  }, [dwellDone, step]); // eslint-disable-line

  const enterCards = () => {
    if (onFlipSound) onFlipSound();
    setStep("cards");
    setCurrent(0);
    setFirstView(true);
    startDwell();
  };

  const go = (targetIdx) => {
    if (targetIdx < 0 || targetIdx > CARD_COUNT - 1) return;
    emitCard(current);
    const wasSeen = seen[targetIdx];
    setDir(targetIdx > current ? 1 : -1);
    setFirstView(!wasSeen);
    setCurrent(targetIdx);
    if (!wasSeen) { if (onFlipSound) onFlipSound(); startDwell(); }
    else { if (onRevisitSound) onRevisitSound(); setDwellDone(true); }
  };

  useEffect(() => () => { if (dwellTimer.current) clearTimeout(dwellTimer.current); }, []);

  const allSeen = seen.every(Boolean);
  const allAcked = acked.every(Boolean);
  const meta = R.cardMeta[current];
  const cardRead = seen[current] || dwellDone;
  const ackOwed = !acked[current];
  const canAdvanceCard = cardRead && !ackOwed;
  const yourLetter = selectedIdx != null ? ["A", "B", "C", "D"][selectedIdx] : null;
  const rightLetter = ["A", "B", "C", "D"][question.correct];
  const outOfLives = lives <= 0;

  // ---------- VERDICT STEP ----------
  if (step === "verdict") {
    return c.jsxs("div", {
      className: "ts-reveal-screen",
      style: { flex: "1 0 auto", background: u.bg, display: "flex", flexDirection: "column", padding: "14px 18px 18px", boxSizing: "border-box" },
      children: [
        c.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }, children: [
          c.jsx(Button, { onClick: onHome, variant: "secondary", size: "sm", style: { fontSize: 12 }, children: R.homeButton }),
          c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 2, color: u.textMuted, fontWeight: 700, textTransform: "uppercase" }, children: isEndless ? `Bonus Q${level + 1}` : `Question ${level + 1} of ${runLength}` }),
          c.jsx("button", { onClick: () => setMuted((m) => !m), "aria-label": muted ? "Unmute" : "Mute", className: "ts-sound-btn", style: { background: muted ? "transparent" : u.surface, border: `2px solid ${u.outline}`, color: muted ? u.textMuted : u.text, padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, fontWeight: 700 }, children: muted ? "OFF" : "ON" })
        ] }),

        c.jsxs("div", { style: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, textAlign: "center", maxWidth: 560, margin: "0 auto", width: "100%" }, children: [
          c.jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, animation: "ts-fade-in 0.3s ease-out" }, children: [
            c.jsx("div", { style: { width: 54, height: 6, borderRadius: 3, background: revealCorrect ? u.green : u.red } }),
            c.jsx("div", { style: { fontFamily: C.display, fontSize: "clamp(38px, 8vw, 64px)", lineHeight: 1, letterSpacing: 1, color: revealCorrect ? u.green : u.red }, children: revealCorrect ? "CORRECT" : "NOT QUITE" })
          ] }),

          // What the miss cost, in hearts, right where the player is looking.
          // Getting this wrong reads as punishment; getting it right reads as a
          // running total, which is the difference between "you failed" and
          // "you have two left".
          !revealCorrect && c.jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, animation: "ts-fade-in 0.45s ease-out" }, children: [
            c.jsx("div", { style: { display: "flex", gap: 7 }, children: Array.from({ length: LIVES_PER_ROUND }).map((_, i) => c.jsx(Heart, { filled: i < lives, size: 30 }, i)) }),
            c.jsx("div", { style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 1.4, fontWeight: 700, textTransform: "uppercase", color: outOfLives ? u.red : lives === 1 ? u.terra : u.textMuted },
              children: outOfLives ? R.lives.outOfLives : lives === 1 ? R.lives.lastOne : R.lives.lostOne })
          ] }),

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

        c.jsx("div", { style: { flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }, children:
          c.jsx("button", { onClick: enterCards, style: { fontFamily: C.display, fontSize: 16, letterSpacing: 2, background: u.brand, color: u.textOnDark, border: `2px solid ${u.outline}`, padding: "13px 32px", borderRadius: 10, cursor: "pointer", textTransform: "uppercase", boxShadow: U.md }, children: revealCorrect ? R.verdictContinue : R.verdictContinueWrong })
        })
      ]
    });
  }

  // ---------- CARDS STEP ----------
  const finalLabel = outOfLives ? "See Final Result \u2192" : isLastQuestion ? "See your result \u2192" : "Next Question \u2192";
  const finalBtnEl = c.jsx("button", {
    onClick: advanceOut,
    style: { fontFamily: C.display, fontSize: 15, letterSpacing: 2, background: outOfLives ? u.terra : u.brand, color: u.textOnDark, border: `2px solid ${u.outline}`, padding: "11px 24px", borderRadius: 8, cursor: "pointer", textTransform: "uppercase", boxShadow: U.md, animation: "ts-pulse-next 1.8s ease-in-out infinite" },
    children: finalLabel
  });

  return c.jsxs("div", {
    className: "ts-reveal-screen",
    style: { flex: "1 0 auto", background: u.bg, display: "flex", flexDirection: "column", padding: "14px 18px 12px", boxSizing: "border-box" },
    children: [
      c.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexShrink: 0, marginBottom: 10 }, children: [
        c.jsx(Button, { onClick: onHome, variant: "secondary", size: "sm", style: { fontSize: 12 }, children: R.homeButton }),
        c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center" }, children: [
          c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 2, color: u.textMuted, fontWeight: 700, textTransform: "uppercase" }, children: isEndless ? `Bonus Q${level + 1}` : `Q ${String(level + 1).padStart(2, "0")} / ${runLength}` }),
          // Lives stay visible through the review, so the state of the round is
          // never something the player has to remember.
          c.jsx(LivesBox, { lives, compact: true })
        ] }),
        c.jsx("button", { onClick: () => setMuted((m) => !m), "aria-label": muted ? "Unmute" : "Mute", className: "ts-sound-btn", style: { background: muted ? "transparent" : u.surface, border: `2px solid ${u.outline}`, color: muted ? u.textMuted : u.text, padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, fontWeight: 700 }, children: muted ? "OFF" : "ON" })
      ] }),

      c.jsx("div", { style: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", maxWidth: 760, margin: "0 auto", width: "100%", position: "relative" }, children:
        c.jsx(ComicCard, {
          cardIndex: current, meta, dir, firstView, question,
          acked: acked[current], onAck: () => acknowledge(current)
        }, "card-" + current + "-" + (firstView ? "f" : "s"))
      }),

      c.jsxs("div", { style: { flexShrink: 0, paddingTop: 8, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }, children: [
        c.jsx("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: R.cardMeta.map((m, i) => c.jsx("button", {
          onClick: () => go(i), "aria-label": "Card " + (i + 1),
          style: { width: i === current ? 26 : 11, height: 11, borderRadius: 6, padding: 0, border: `2px solid ${u.outline}`, background: i === current ? u.brand : seen[i] ? u.brandSofter : u.surface, cursor: "pointer", transition: "width 0.2s, background 0.2s" }
        }, i)) }),

        c.jsxs("div", { style: { display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }, children: [
          c.jsx(Button, { onClick: () => go(current - 1), variant: "ghost", size: "sm", disabled: current === 0, style: { fontSize: 13 }, children: "\u2039 Prev" }),
          current < CARD_COUNT - 1
            ? c.jsx(NextCardButton, { canAdvance: canAdvanceCard, ackOwed, cardRead, onClick: () => go(current + 1) })
            : ((allSeen && allAcked) ? finalBtnEl : c.jsx(NextCardButton, { canAdvance: canAdvanceCard, ackOwed, cardRead, label: "Almost\u2026", onClick: () => {} }))
        ] }),

        !allSeen && c.jsx("button", { onClick: onSkipReview, style: { background: "transparent", border: "none", fontFamily: C.mono, fontSize: 11, letterSpacing: 2, color: u.textMuted, cursor: "pointer", textTransform: "uppercase", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3, padding: "2px 10px" }, children: R.review.skipLabel })
      ] }),

      revealCorrect && c.jsx(Confetti, { intensity: "med" })
    ]
  });
}

// The Next button between cards. Fill-bar while the read-gate runs, then prompts
// for the acknowledgment, then unlocks.
function NextCardButton({ canAdvance, onClick, label, ackOwed, cardRead }) {
  const readingStill = !canAdvance && !cardRead;
  const needsAck = !canAdvance && cardRead && ackOwed;
  return c.jsxs("button", {
    onClick: canAdvance ? onClick : undefined,
    disabled: !canAdvance,
    style: { position: "relative", overflow: "hidden", fontFamily: C.display, fontSize: 13, letterSpacing: 1.5, background: canAdvance ? u.surface : u.surfaceWarm, color: canAdvance ? u.text : u.textMuted, border: `2px solid ${u.outline}`, padding: "10px 22px", borderRadius: 8, cursor: canAdvance ? "pointer" : "default", textTransform: "uppercase", boxShadow: canAdvance ? U.sm : "none", minWidth: 140 },
    children: [
      readingStill && c.jsx("span", { "aria-hidden": true, style: { position: "absolute", left: 0, top: 0, bottom: 0, background: u.brandSofter, animation: "ts-dwell-fill 2s linear forwards", zIndex: 0 } }),
      c.jsx("span", { style: { position: "relative", zIndex: 1 }, children: canAdvance ? (label || "Next \u203A") : (needsAck ? R.review.acknowledgeFirstLabel : R.review.readingLabel) })
    ]
  });
}

// A single review card. Flips in on first view, slides on revisit.
function ComicCard({ cardIndex, meta, dir, firstView, question, acked, onAck }) {
  const anim = firstView
    ? "ts-card-flip-in 0.5s cubic-bezier(.2,.7,.2,1) both"
    : (dir >= 0 ? "ts-card-slide-left 0.28s ease-out both" : "ts-card-slide-right 0.28s ease-out both");
  return c.jsx("div", { className: "ts-comic-flip-wrap", style: { flex: 1, minHeight: 0, perspective: 1400, display: "flex" }, children:
    c.jsxs("div", { className: "ts-comic-card", style: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: u.surfaceHigh, border: `3px solid ${u.outline}`, borderRadius: 12, boxShadow: U.lg, overflow: "hidden", transformStyle: "preserve-3d", animation: anim }, children: [
      c.jsxs("div", { className: "ts-comic-header", style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 20px", background: u.brand, color: u.textOnDark, borderBottom: `3px solid ${u.outline}`, fontFamily: C.display, fontSize: "clamp(22px, 4vw, 30px)", letterSpacing: 1, flexShrink: 0 }, children: [
        c.jsx("span", { children: meta.label }),
        c.jsx("span", { style: { fontFamily: C.mono, fontSize: 12, letterSpacing: 1, opacity: 0.85, fontWeight: 700 }, children: `${cardIndex + 1} / ${R.cardMeta.length}` })
      ] }),
      c.jsx("div", { className: "ts-comic-body ts-halftone", style: { flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 22px", background: u.surfaceHigh, display: "flex", flexDirection: "column", justifyContent: "center" }, children:
        c.jsx("div", { style: { width: "100%" }, children:
          meta.key === "info" ? c.jsx(FaceInfo, { question })
          : meta.key === "phrase" ? c.jsx(FacePhrase, { question })
          : c.jsx(FaceRealLife, { question })
        })
      }),
      // The acknowledgment footer, in the same place the Redeem button used to
      // sit. It shows on every card now, not just after a right answer.
      c.jsx("div", { className: "ts-comic-redeem", style: { flexShrink: 0, borderTop: `3px solid ${u.outline}`, padding: "14px 20px", background: acked ? u.brandSofter : u.surfaceWarm, display: "flex", justifyContent: "center" }, children:
        c.jsx(InCardAck, { acked, onAck })
      })
    ] })
  });
}

// The "I understand" control inside the card. Instantly tappable; the read-gate
// lives on the Next button.
function InCardAck({ acked, onAck }) {
  if (acked) {
    return c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, fontFamily: C.display, fontSize: 16, letterSpacing: 1.5, color: u.brandDeep, textTransform: "uppercase" }, children: [
      c.jsx("span", { style: { fontFamily: C.display, fontSize: 20, color: u.green }, children: "\u2713" }),
      c.jsx("span", { children: R.review.acknowledgedLabel })
    ] });
  }
  return c.jsx("button", {
    onClick: onAck,
    style: { fontFamily: C.display, fontSize: "clamp(15px, 2.6vw, 19px)", letterSpacing: 1.5, background: u.brand, color: u.textOnDark, border: `2px solid ${u.outline}`, padding: "12px 34px", borderRadius: 10, cursor: "pointer", textTransform: "uppercase", boxShadow: U.md, minWidth: 200, animation: "ts-pulse-next 1.6s ease-in-out infinite" },
    children: R.review.acknowledgeLabel
  });
}

// The three card faces.
function FaceInfo({ question }) {
  return c.jsx("div", { className: "ts-face-fill", style: { display: "flex", alignItems: "center", minHeight: "100%" }, children:
    c.jsxs("div", { style: { width: "100%" }, children: [
      c.jsx("div", { style: { background: u.mustardSoft, border: `2px solid ${u.outline}`, borderRadius: 8, padding: "18px 20px", boxShadow: U.sm }, children:
        c.jsx("p", { style: { fontFamily: C.body, fontSize: "clamp(15px, 2.2vw, 18px)", lineHeight: 1.6, color: u.text, margin: 0, fontWeight: 500 }, children: question.principle || "" })
      }),
      question.safetyNote && c.jsxs("div", {
        style: {
          display: "flex", gap: 10, alignItems: "flex-start", marginTop: 12,
          background: u.terraSoft, border: `2px solid ${u.terra}`,
          borderRadius: 8, padding: "12px 14px"
        },
        children: [
          c.jsx("span", { "aria-hidden": true, style: { fontSize: 16, lineHeight: 1.3, flexShrink: 0 }, children: "\u26A0" }),
          c.jsxs("div", { children: [
            c.jsx("div", { style: { fontFamily: C.mono, fontSize: 9.5, letterSpacing: 1.4, color: u.terra, fontWeight: 700, marginBottom: 3 }, children: R.safetyHeading }),
            c.jsx("p", { style: { fontFamily: C.body, fontSize: "clamp(13px, 1.9vw, 15px)", lineHeight: 1.5, color: u.text, margin: 0, fontWeight: 500 }, children: question.safetyNote })
          ] })
        ]
      })
    ] })
  });
}

function FacePhrase({ question }) {
  const kp = question.keyPhrase || { quote: "", gloss: "" };
  return c.jsxs("div", { className: "ts-face-fill", style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: "100%", gap: 16 }, children: [
    c.jsx("div", { className: "ts-phrase-quote", style: { fontFamily: C.display, fontSize: "clamp(28px, 5.5vw, 46px)", lineHeight: 1.05, letterSpacing: "-0.01em", color: u.text, textShadow: `2px 2px 0 ${u.brandBright}`, animation: "ts-phrase-in 0.6s cubic-bezier(.2,.8,.2,1.2) both", maxWidth: "16ch" }, children: kp.quote }),
    kp.gloss && c.jsx("p", { style: { fontFamily: C.body, fontSize: 15, lineHeight: 1.55, color: u.textDim, margin: 0, fontWeight: 500, maxWidth: 460 }, children: kp.gloss })
  ] });
}

function FaceRealLife({ question }) {
  const sc = question.scenario || { lines: [] };
  const lines = sc.lines || [];
  const outcomes = lines.filter((l) => /YES|NO/i.test(l.label));
  const exchange = lines.filter((l) => !/YES|NO/i.test(l.label));
  const isYou = (label) => /^YOU/i.test(label);
  const speakerFor = (label) => {
    const L = String(label).toUpperCase();
    if (/^YOU/.test(L)) return { icon: "\uD83E\uDDD1", bg: u.brandBright };
    if (/OFFICER|POLICE|DEPUTY|TROOPER|SRO/.test(L)) return { icon: "\uD83D\uDC6E", bg: u.blue };
    if (/MOM|DAD|PARENT|GUARDIAN|AUNT|UNCLE|GRANDMA|GRANDPA/.test(L)) return { icon: "\uD83D\uDC64", bg: u.mustard };
    if (/FRIEND|COUSIN|BROTHER|SISTER|SIBLING/.test(L)) return { icon: "\uD83D\uDCAC", bg: u.mustard };
    if (/TEACHER|PRINCIPAL|COACH|STAFF|DEAN|COUNSELOR/.test(L)) return { icon: "\uD83C\uDFEB", bg: u.surfaceWarm };
    if (/LAWYER|ATTORNEY|JUDGE/.test(L)) return { icon: "\u2696", bg: u.surfaceWarm };
    return { icon: "\uD83D\uDCAC", bg: u.surfaceWarm };
  };
  return c.jsxs("div", { children: [
    sc.setup && c.jsx("div", { style: { fontFamily: C.body, fontStyle: "italic", fontWeight: 700, fontSize: 15, color: u.text, marginBottom: 14, lineHeight: 1.45, borderLeft: `4px solid ${u.brand}`, paddingLeft: 12 }, children: sc.setup }),
    c.jsx("div", { className: "ts-scenario-panels", style: { display: "grid", gridTemplateColumns: exchange.length > 1 ? "1fr 1fr" : "1fr", gap: 12, marginBottom: outcomes.length ? 14 : 0 }, children: exchange.map((l, i) => c.jsxs("div", { style: { background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 10, padding: "12px 14px", boxShadow: U.sm, animation: `ts-bubble-in 0.4s ease-out ${i * 0.08}s both` }, children: [
      c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }, children: [
        c.jsx("div", { style: { width: 30, height: 30, borderRadius: "50%", background: speakerFor(l.label).bg, border: `2px solid ${u.outline}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }, children: speakerFor(l.label).icon }),
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

// ---------------------------------------------------------------------------
// Scorecard : right and wrong, the only two numbers an end screen needs.
// ---------------------------------------------------------------------------
// Replaces the old lifeline breakdown. "How far you got" stopped being the score
// the moment a run could survive a miss, and lives remaining is a mid-round
// mechanic that means nothing once the round is over.
function Scorecard({ correct, wrong }) {
  return c.jsxs("div", { style: { width: "100%", maxWidth: 420, display: "flex", gap: 12, background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 12, padding: "18px 20px", boxShadow: U.md }, children: [
    c.jsxs("div", { style: { flex: 1, textAlign: "center" }, children: [
      c.jsx("div", { style: { fontFamily: C.display, fontSize: 42, color: u.green, lineHeight: 1 }, children: correct }),
      c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.4, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", marginTop: 5 }, children: "Right" })
    ] }),
    c.jsx("div", { style: { width: 2, background: u.borderLight } }),
    c.jsxs("div", { style: { flex: 1, textAlign: "center" }, children: [
      c.jsx("div", { style: { fontFamily: C.display, fontSize: 42, color: wrong > 0 ? u.terra : u.textMuted, lineHeight: 1 }, children: wrong }),
      c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.4, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", marginTop: 5 }, children: "Wrong" })
    ] })
  ] });
}

// Every question missed this run, with its answer. With three lives there can be
// up to three, so this is a list rather than the single card it used to be.
function MissedList({ questions = [] }) {
  if (!questions.length) return null;
  return c.jsxs("div", { className: "ts-missed-card", style: { background: u.surface, border: `2px solid ${u.outline}`, borderLeft: `8px solid ${u.terra}`, borderRadius: 10, padding: "20px 24px", maxWidth: 560, marginBottom: 28, boxShadow: U.md, textAlign: "left" }, children: [
    c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 2, color: u.terra, fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }, children: R.endScreens.missedQuestionLabel }),
    ...questions.map((q, i) => c.jsxs("div", { style: { marginBottom: i === questions.length - 1 ? 0 : 16, paddingBottom: i === questions.length - 1 ? 0 : 16, borderBottom: i === questions.length - 1 ? "none" : `2px solid ${u.borderLight}` }, children: [
      c.jsx("p", { style: { fontFamily: C.body, fontSize: 15.5, fontWeight: 600, lineHeight: 1.5, color: u.text, margin: "0 0 10px" }, children: q.q }),
      c.jsxs("div", { style: { fontFamily: C.body, fontSize: 14.5, color: u.green, fontWeight: 700, lineHeight: 1.45 }, children: [
        c.jsx("span", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: u.green, marginRight: 8, textTransform: "uppercase" }, children: "Answer" }),
        q.options[q.correct]
      ] })
    ] }, i))
  ] });
}

// ---------------------------------------------------------------------------
// End screens
// ---------------------------------------------------------------------------
function WinBigScreen({ prize, correctCount, wrongCount, sfx, onTakeMoney, onKeepGoing }) {
  const [display, setDisplay] = useState(0);
  const [done, setDone] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    if (sfx) sfx.win();
    const steps = 42;
    const dur = 2200;
    for (let i = 1; i <= steps; i++) {
      timers.current.push(setTimeout(() => {
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
    style: { flex: "1 0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center", gap: 18, position: "relative" },
    children: [
      c.jsx(Confetti, { intensity: "high" }),
      c.jsx("div", { style: { fontFamily: C.mono, fontSize: 13, letterSpacing: 4, color: u.brandDeep, fontWeight: 700, textTransform: "uppercase", animation: "ts-fade-in 0.5s" }, children: "You made it to the end" }),
      c.jsx("h1", { style: { fontFamily: C.display, fontSize: "clamp(52px, 12vw, 128px)", lineHeight: 0.85, letterSpacing: "-0.02em", margin: 0, color: u.brand, textShadow: `6px 6px 0 ${u.outline}`, animation: "ts-verdict-stamp 0.7s cubic-bezier(.2,.8,.2,1.4) both" }, children: "ROUND DONE" }),
      c.jsx("div", { style: { fontFamily: C.display, fontSize: "clamp(44px, 10vw, 96px)", color: u.text, letterSpacing: "-0.02em", lineHeight: 1, textShadow: `4px 4px 0 ${u.mustard}`, animation: done ? "ts-streak-pop 0.5s ease-out" : "none" }, children: fmtMoney(display) }, "amt-" + done),
      done && c.jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 18, animation: "ts-verdict-detail-in 0.5s ease-out both", marginTop: 4, width: "100%", maxWidth: 460 }, children: [
        c.jsx(Scorecard, { correct: correctCount, wrong: wrongCount }),
        c.jsxs("div", { className: "ts-end-actions", style: { display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }, children: [
          c.jsx(Button, { onClick: onTakeMoney, variant: "primary", size: "md", children: R.q15Choice.takePrize }),
          c.jsx(Button, { onClick: onKeepGoing, variant: "secondary", size: "md", children: R.q15Choice.keepGoing })
        ] })
      ] })
    ]
  });
}

function EndScreen(props) {
  const { phase, finalPrize, bestRun, streak, isEndless, correctCount, wrongCount, missedQuestions, onPlayAgain, onHome } = props;
  const won = phase === "won";
  let sk;
  if (won) sk = isEndless ? R.endScreens.endlessEnd : R.endScreens.won;
  else sk = correctCount >= 8 ? R.endScreens.gameoverLate : R.endScreens.gameoverEarly;
  const prize = won ? finalPrize : 0;
  const bonusStreak = isEndless ? Math.max(0, streak) : 0;
  return c.jsxs("div", {
    className: "ts-end-screen",
    style: { flex: "1 0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px 80px", textAlign: "center" },
    children: [
      won && c.jsx(Confetti, { intensity: "high" }),
      c.jsx("h1", { className: "ts-end-headline", style: { fontFamily: C.display, fontSize: "clamp(64px, 15vw, 150px)", lineHeight: 0.85, letterSpacing: "-0.02em", margin: 0, color: won ? u.brand : u.text, textShadow: won ? `6px 6px 0 ${u.outline}` : `5px 5px 0 ${u.terra}` }, children: sk.headline }),
      c.jsx("p", { style: { fontFamily: C.body, fontSize: 18, fontWeight: 600, color: u.textDim, maxWidth: 540, margin: "28px 0 28px", lineHeight: 1.55 }, children: sk.sub }),
      c.jsx("div", { style: { display: "flex", justifyContent: "center", marginBottom: 26, width: "100%" }, children: c.jsx(Scorecard, { correct: correctCount, wrong: wrongCount }) }),
      won && c.jsxs("div", { className: "ts-end-prize", style: { background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 14, padding: "26px 44px", marginBottom: 22, boxShadow: U.lg }, children: [
        c.jsx("div", { style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 3, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }, children: isEndless ? "Banked" : "You won" }),
        c.jsx("div", { className: "ts-end-prize-amount", style: { fontFamily: C.display, fontSize: "clamp(56px, 11vw, 92px)", color: u.brand, letterSpacing: "-0.02em", lineHeight: 1 }, children: fmtMoney(prize) }),
        isEndless && bonusStreak > 0 && c.jsxs("div", { style: { fontFamily: C.mono, fontSize: 12, letterSpacing: 2, color: u.terra, fontWeight: 700, marginTop: 10, textTransform: "uppercase" }, children: [R.endScreens.bonusStreakLabel, ": ", bonusStreak] })
      ] }),
      c.jsx(MissedList, { questions: missedQuestions }),
      bestRun > 0 && !won && c.jsxs("div", { style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 2, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 26 }, children: ["Best this session: ", c.jsx("span", { style: { color: u.brand }, children: fmtMoney(bestRun) })] }),
      c.jsxs("div", { className: "ts-end-actions", style: { display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }, children: [
        c.jsx(Button, { onClick: onPlayAgain, variant: "primary", size: "md", children: R.endScreens.playAgainLabel }),
        c.jsx(Button, { onClick: onHome, variant: "ghost", size: "md", children: "Home" })
      ] }),
      c.jsx("p", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: u.textMuted, marginTop: 30, fontWeight: 600, textTransform: "uppercase" }, children: R.endScreens.footerNote })
    ]
  });
}

// ---------------------------------------------------------------------------
// The demo end screen (event build)
// ---------------------------------------------------------------------------
// One screen covers all three endings: a round finished with rounds left, a
// round finished with none left, and clearing the deck. The scoreboard is
// cumulative and stays on screen, so whoever is handing out prizes reads the
// tier off the same screen the player is already looking at.
//
// Every row now carries right AND wrong, because with lives "how far you got"
// and "how many you knew" are different numbers.
function DemoEndScreen({ runs = [], maxRuns = 3, canPlay, won, deckSize = DEMO_DECK_SIZE, thisCorrect = 0, thisWrong = 0, missedQuestions = [], onTryAgain, onHome }) {
  const D = R.demo;
  const best = runs.reduce((m, r) => Math.max(m, r.correct), 0);
  const tier = D.tiers.find((t) => best >= t.at);
  const outOfRuns = !canPlay;

  let headline = D.roundHeadline;
  if (won && thisCorrect === deckSize) headline = D.wonHeadline;
  else if (outOfRuns) headline = D.outOfRunsHeadline;

  return c.jsxs("div", {
    className: "ts-end-screen",
    style: {
      flex: "1 0 auto", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "48px 24px 72px", textAlign: "center"
    },
    children: [
      won && thisCorrect === deckSize && c.jsx(Confetti, { intensity: "high" }),
      c.jsx("h1", {
        className: "ts-end-headline",
        style: {
          fontFamily: C.display, fontSize: "clamp(48px, 12vw, 118px)", lineHeight: 0.85,
          letterSpacing: "-0.02em", margin: 0, color: won ? u.brand : u.text,
          textShadow: won ? `6px 6px 0 ${u.outline}` : `5px 5px 0 ${u.terra}`
        },
        children: headline
      }),
      // The one line the player reads first: right and wrong, plainly.
      c.jsx("p", {
        style: {
          fontFamily: C.body, fontSize: 19, fontWeight: 600, color: u.textDim,
          maxWidth: 540, margin: "24px 0 22px", lineHeight: 1.55
        },
        children: D.scoreSummary(thisCorrect, thisWrong)
      }),

      c.jsx("div", { style: { display: "flex", justifyContent: "center", marginBottom: 26, width: "100%" }, children:
        c.jsx(Scorecard, { correct: thisCorrect, wrong: thisWrong })
      }),

      // The cumulative scoreboard. One row per round played, blanks for rounds
      // not taken, so the player can see what is still theirs to use.
      c.jsxs("div", {
        style: {
          width: "100%", maxWidth: 460, background: u.surface,
          border: `2px solid ${u.outline}`, borderRadius: 14,
          boxShadow: U.lg, padding: "20px 22px", marginBottom: 26, textAlign: "left"
        },
        children: [
          c.jsx("div", {
            style: {
              fontFamily: C.mono, fontSize: 11, letterSpacing: 2, color: u.textMuted,
              fontWeight: 700, textTransform: "uppercase", marginBottom: 14
            },
            children: D.scoreboardTitle
          }),
          c.jsx("div", {
            style: { display: "flex", flexDirection: "column", gap: 8 },
            children: Array.from({ length: maxRuns }).map((_, i) => {
              const run = runs[i];
              const isBest = run && run.correct === best && best > 0;
              return c.jsxs("div", {
                style: {
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 12, padding: "10px 12px", borderRadius: 8,
                  background: isBest ? u.brandSofter : "transparent",
                  border: `2px solid ${isBest ? u.brand : u.borderLight}`,
                  opacity: run ? 1 : 0.45
                },
                children: [
                  c.jsxs("span", {
                    style: { fontFamily: C.display, fontSize: 16, letterSpacing: 1, color: u.text },
                    children: [D.roundWord, " ", i + 1]
                  }),
                  run
                    ? c.jsxs("span", {
                        style: { display: "inline-flex", alignItems: "baseline", gap: 8 },
                        children: [
                          c.jsx("span", { style: { fontFamily: C.display, fontSize: 26, lineHeight: 1, color: isBest ? u.brand : u.text }, children: run.correct }),
                          c.jsx("span", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.2, color: u.textMuted, fontWeight: 700, textTransform: "uppercase" }, children: D.correctWord }),
                          c.jsx("span", { style: { fontFamily: C.display, fontSize: 20, lineHeight: 1, color: u.textMuted, marginLeft: 4 }, children: run.wrong }),
                          c.jsx("span", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.2, color: u.textMuted, fontWeight: 700, textTransform: "uppercase" }, children: D.wrongWord })
                        ]
                      })
                    : c.jsx("span", {
                        style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.4, color: u.textMuted, fontWeight: 700, textTransform: "uppercase" },
                        children: won ? D.notNeededLabel : D.notPlayedLabel
                      })
                ]
              }, i);
            })
          }),

          c.jsxs("div", {
            style: {
              display: "flex", justifyContent: "space-between", gap: 12,
              paddingTop: 14, marginTop: 14, borderTop: `2px solid ${u.borderLight}`
            },
            children: [
              c.jsxs("div", { style: { textAlign: "center", flex: 1 }, children: [
                c.jsx("div", { style: { fontFamily: C.display, fontSize: 30, color: u.brand, lineHeight: 1 }, children: best }),
                c.jsx("div", { style: { fontFamily: C.mono, fontSize: 9, letterSpacing: 1, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", marginTop: 4 }, children: D.bestLabel })
              ] }),
              c.jsx("div", { style: { width: 2, background: u.borderLight } }),
              c.jsxs("div", { style: { textAlign: "center", flex: 1 }, children: [
                c.jsx("div", {
                  style: { fontFamily: C.display, fontSize: tier ? 22 : 16, color: tier ? u.terra : u.textMuted, lineHeight: 1.2, paddingTop: tier ? 4 : 8 },
                  children: tier ? tier.name : D.noTier
                }),
                c.jsx("div", { style: { fontFamily: C.mono, fontSize: 9, letterSpacing: 1, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", marginTop: 4 }, children: D.tierLabel })
              ] })
            ]
          })
        ]
      }),

      c.jsx(MissedList, { questions: missedQuestions }),

      c.jsxs("div", {
        className: "ts-end-actions",
        style: { display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "center" },
        children: [
          canPlay && c.jsx(Button, { onClick: onTryAgain, variant: "primary", size: "md", children: D.tryAgainLabel }),
          c.jsx(Button, { onClick: onHome, variant: "ghost", size: "md", children: "Home" })
        ]
      }),
      outOfRuns && c.jsx("p", {
        style: {
          fontFamily: C.body, fontSize: 15, fontWeight: 500, lineHeight: 1.55,
          color: u.textDim, maxWidth: 460, margin: "26px 0 0"
        },
        children: D.outOfRunsFooter
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// DemoIntroScreen : the one screen between the map and question one.
// ---------------------------------------------------------------------------
function DemoIntroScreen({ maxRuns = 3, onStart }) {
  const D = R.demo;
  return c.jsxs("div", {
    className: "ts-demo-intro",
    style: {
      flex: "1 0 auto", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "48px 24px", textAlign: "center", gap: 20
    },
    children: [
      c.jsx("div", {
        style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 2.6, fontWeight: 700, color: u.textMuted },
        children: D.eyebrow
      }),
      c.jsx("h1", {
        style: {
          fontFamily: C.display, fontSize: "clamp(46px, 11vw, 104px)", lineHeight: 0.88,
          letterSpacing: "-0.02em", margin: 0, color: u.brand,
          textShadow: `6px 6px 0 ${u.outline}`
        },
        children: D.introHeadline
      }),
      // Three hearts on the intro screen, because lives are the rule that
      // changed and a player should meet it before question one rather than
      // discover it by losing.
      c.jsx("div", { style: { display: "flex", gap: 12 }, children: [0, 1, 2].map((i) => c.jsx(Heart, { filled: true, size: 40 }, i)) }),
      c.jsx("p", {
        style: {
          fontFamily: C.body, fontSize: 19, fontWeight: 600, color: u.textDim,
          maxWidth: 460, margin: 0, lineHeight: 1.55
        },
        children: D.introSub(maxRuns)
      }),
      c.jsx(Button, { onClick: onStart, variant: "primary", size: "lg", children: D.introStartLabel })
    ]
  });
}
