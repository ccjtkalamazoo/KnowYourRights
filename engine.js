// Know Your Rights · CCJT
// engine.js : the quiz. Every screen, plus the state machine that drives them.
//
// The whole game is one component (App) holding all the state, rendering one of
// several screens depending on `phase`:
//
//   start       the title screen
//   walkthrough the tutorial (safety brief first)
//   map         the launcher
//   district    one district: what it covers, the notice, its chapters
//   playing     a question is live, waiting for a pick
//   locking     answer locked, suspense pause before the reveal
//   revealing   the verdict beat, then the three review cards
//   winbig      the end-of-deck celebration + take-it-or-keep-going choice
//   gameover    three lives gone
//   won         the run is over (banked the prize, or cleared the bonus deck)
//
// ---------------------------------------------------------------------------
// TWO KINDS OF STATE, AND WHY THEY ARE SEPARATE
// ---------------------------------------------------------------------------
// `session` is progress: which chapters were cleared, how many tries each one
// took, best score. It lives for the tab and resetState() never touches it.
// Everything else here is one round, and resetState() wipes all of it. Mixing
// the two is how a "play again" ends up erasing the scoreboard it just wrote.
//
// The session shape and every function that changes it live in state.js. This
// file calls them and holds the result; it does not know how progress is
// stored.
//
// ---------------------------------------------------------------------------
// THE PRE-ROUND SCREEN IS GONE
// ---------------------------------------------------------------------------
// Picking a chapter used to land on a screen with two warnings on it: a
// legal-advice card and a red safety note that opened by saying the same thing
// again. The district screen now carries the legal notice once, and each
// chapter's own note shows on its card next to the Start button, which is where
// the decision is being made. So a chapter goes straight into question one.
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
//   THE SHOP, REBUILT.  Eight lifeline uses across 453 answers said the old one
//   was not working. It is back with SHIELD removed, because SHIELD survived one
//   wrong answer and lives now do that three times for free. Four lifelines, same
//   prices. Points still come only from reading cards after a RIGHT answer, which
//   is a known weakness worth watching: a player on a cold streak earns nothing
//   and cannot buy the help that would break the streak. Lives soften it, since a
//   struggling player now survives to see more cards instead of going out at
//   question one, but if the next event shows the same near-zero usage, the thing
//   to try is a small per-round floor rather than another redesign.
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
  LIFELINE_PRICES, LIFELINE_KEYS, FREE_LIFELINES,
  fmtMoney, fmtMoneyShort, shuffle, buildDeck, buildTutorialDeck, shuffleOptions,
  buildEndlessDeck, simulateJury
} from "./rules.js";
import { Shell, Button, Backdrop, ConfirmModal, Confetti, LifeIcon } from "./ui.js";
import * as EV from "./events.js";
import { SfxEngine, MusicEngine } from "./audio.js";
import { MapScreen } from "./map.js";
import { DistrictScreen } from "./district.js";
import { newSession, recordChapterRun, clearTutorial } from "./state.js";
import { loadChapter, loadDemo, loadTutorial } from "./content.js";
import { TourOverlay, TourBail, TourBailConfirm, injectTourStyles, activeStep } from "./tutorial.js";

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
  // Session progress. Survives resetState, dies with the tab. See the note at
  // the top of this file about why it is kept apart from round state.
  const [session, setSession] = useState(newSession);
  // The district list from the map, and the one the player opened. Held here so
  // the district screen does not depend on the map still being mounted, and so
  // returning from a round lands back on the district it came from.
  const [districts, setDistricts] = useState(null);
  const [district, setDistrict] = useState(null);
  // The three numbers that describe a run now. `results` is one entry per
  // question answered, which is what the progress bar reads: it can show a red
  // segment mid-run without the run being over, which the old version could not.
  const [lives, setLives] = useState(LIVES_PER_ROUND);
  const [correctCount, setCorrectCount] = useState(0);
  const [results, setResults] = useState([]);
  // Every question missed this run, not just the one that ended it. With three
  // lives there can be more than one, and the end screen shows all of them.
  const [missed, setMissed] = useState([]);
  // Shop and lifeline state. `lifelines[k]` true means a free use is still
  // available; false means used, and it can be bought back with points.
  const [lifelines, setLifelines] = useState({ ...FREE_LIFELINES });
  const [usage, setUsage] = useState({ fifty: 0, poll: 0, hint: 0, skip: 0 });
  const [points, setPoints] = useState(0);
  const [pointsSpent, setPointsSpent] = useState(0);
  const [removedAnswers, setRemovedAnswers] = useState([]);
  const [juryResults, setJuryResults] = useState(null);
  const [hintShown, setHintShown] = useState(false);
  const [pendingLifeline, setPendingLifeline] = useState(null);
  const [shopOpen, setShopOpen] = useState(false);
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
  // Tutorial mode. `tourIdx` is the step within THIS question's tour script;
  // it resets to 0 on every question, so the scripts stay independent and a
  // content editor never has to count steps across questions.
  const [isTutorial, setIsTutorial] = useState(false);
  // Set when a tutorial retry strikes an option out, so the question screen can
  // say so. Without it the board just quietly rearranges itself and the player
  // has no idea they got it wrong.
  const [retryNotice, setRetryNotice] = useState(false);
  // Leaving the tutorial asks first, the same way skipping the review cards
  // does. A single tap on a chip that is on screen for the whole tutorial is
  // too easy to hit by accident.
  const [bailConfirm, setBailConfirm] = useState(false);
  const [tourIdx, setTourIdx] = useState(0);
  // RevealScreen owns whether it is showing the verdict or the cards, and the
  // tour needs to know which. It reports up rather than the engine guessing.
  const [revealStep, setRevealStep] = useState("verdict");

  const sfx = useRef(null);
  const music = useRef(null);
  const audioCtx = useRef(null);
  const prevAffordable = useRef(false);

  if (sfx.current === null) sfx.current = new SfxEngine();
  if (music.current === null) music.current = new MusicEngine();

  useEffect(() => {
    injectStyles();
    injectTourStyles();
    EV.beginSession({ soundOn: !muted });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [phase, walkStep, level]);

  // Per-question measurement (events.js). Reset each time a question is shown.
  const qMeter = useRef({ exposure: 1, shownAt: 0, firstSelectAt: null, changes: 0, lifelines: [] });
  useEffect(() => {
    if (phase !== "playing" || !currentQ) return;
    // Tutorial answers are dictated, so they are not knowledge signals and they
    // never enter the events table. Emitting them would quietly poison the
    // per-question accuracy numbers with 100% scores on scripted taps.
    const exposure = isTutorial ? 1 : EV.trackQuestionShown(currentQ, level);
    qMeter.current = { exposure, shownAt: performance.now(), firstSelectAt: null, changes: 0, lifelines: [] };
  }, [phase, level]);

  // Each question carries its own tour script, so the step counter restarts.
  useEffect(() => {
    if (!isTutorial) return;
    setTourIdx(0);
    setRevealStep("verdict");
  }, [level, isTutorial]);

  useEffect(() => {
    sfx.current.setMuted(muted);
    music.current.setMuted(muted);
  }, [muted]);

  // Chime the moment points cross into "can afford the cheapest lifeline".
  // Without it the shop is a thing you have to remember to check; with it the
  // game tells you when checking is worth doing.
  useEffect(() => {
    const cheapest = Math.min(...LIFELINE_KEYS.map((k) => LIFELINE_PRICES[k]));
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

  // Wipes ONE ROUND. Never touches `session`, `districts` or `district`: those
  // are progress and navigation, and a player who finishes a round has not
  // stopped being somewhere or lost what they cleared.
  const resetState = () => {
    setDeck([]); setLevel(0); setSelected(null); setLocked(false);
    setRevealCorrect(false); setRevealWrong(false); setShowFloating(false);
    setStreak(0); setLives(LIVES_PER_ROUND); setCorrectCount(0);
    setResults([]); setMissed([]);
    setLifelines({ ...FREE_LIFELINES });
    setUsage({ fifty: 0, poll: 0, hint: 0, skip: 0 });
    setPoints(0); setPointsSpent(0);
    setRemovedAnswers([]); setJuryResults(null); setHintShown(false);
    setPendingLifeline(null); setShopOpen(false);
    setHomeConfirm(false); setSkipConfirm(false);
    setIsEndless(false); setFinalPrize(0); setIsDemo(false);
    setIsTutorial(false); setTourIdx(0); setRevealStep("verdict");
    setRetryNotice(false); setBailConfirm(false);
  };

  // Per-round reset for the demo. Same as resetState minus the deck and minus
  // isDemo, so Try Again lands on question one of a fresh shuffle.
  const resetRound = () => {
    setLevel(0); setSelected(null); setLocked(false);
    setRevealCorrect(false); setRevealWrong(false); setShowFloating(false);
    setStreak(0); setLives(LIVES_PER_ROUND); setCorrectCount(0);
    setResults([]); setMissed([]);
    setLifelines({ ...FREE_LIFELINES });
    setUsage({ fifty: 0, poll: 0, hint: 0, skip: 0 });
    setPoints(0); setPointsSpent(0);
    setRemovedAnswers([]); setJuryResults(null); setHintShown(false);
    setPendingLifeline(null); setShopOpen(false);
    setHomeConfirm(false); setSkipConfirm(false);
    setIsEndless(false); setFinalPrize(0);
    setTourIdx(0); setRevealStep("verdict");
  };

  // Play now means: safety brief, then the tutorial, then the map. The brief
  // stays a full card and stays first. Everything that used to be a card after
  // it is now a step in the real game.
  const goWalkthrough = () => { initAudio(); sfx.current.click(); setWalkStep(0); setPhase("walkthrough"); };

  // Ending whatever is running, wherever it is. Both goMap and goDistrict go
  // through it so an abandoned run is reported exactly once and in one place.
  const endRunIfPlaying = () => {
    if (phase === "playing" || phase === "revealing" || phase === "locking") {
      EV.trackRunEnd("abandoned", { level, mode: isDemo ? "demo" : isEndless ? "endless" : "ladder" });
      EV.flush();
    }
  };

  const goMap = () => {
    initAudio(); sfx.current.click(); music.current.stop();
    endRunIfPlaying();
    EV.trackNav("map"); resetState(); setPhase("map");
  };

  // Back to the district a chapter came from, which is where somebody who just
  // finished a round most likely wants to be: the other chapters are there, and
  // so is their score for the one they just played.
  const goDistrict = () => {
    if (!district) return goMap();
    initAudio(); sfx.current.click(); music.current.stop();
    endRunIfPlaying();
    EV.trackNav("district"); resetState(); setPhase("district");
  };

  const openDistrict = (d) => {
    initAudio(); sfx.current.click();
    setDistrict(d);
    EV.trackNav("district");
    setPhase("district");
  };

  const playAgain = () => { district ? goDistrict() : goMap(); };

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

  // -------------------------------------------------------------------------
  // The tutorial
  // -------------------------------------------------------------------------
  // Runs on the real game screen with the real handlers. Five fixed questions,
  // never shuffled, because the tour scripts address answers by position.
  const startTutorial = async () => {
    resetState();
    setChapter(null);
    setLoadError(null);
    setPhase("loading");
    try {
      const pool = await loadTutorial();
      const d = buildTutorialDeck(pool);
      setChapter(pool);
      setDeck(d);
      setIsTutorial(true);
      setTourIdx(0);
      // Mode is recorded so every tutorial row is trivially excludable from
      // analysis. No answers are ever emitted (see the note on trackAnswer
      // below), so this and the step events are the whole footprint.
      EV.trackModeStart("tutorial", d, { deckSize: d.length, lives: LIVES_PER_ROUND });
      setPhase("playing");
      setTimeout(() => { music.current.start(); music.current.setStage(1); }, 200);
    } catch (err) {
      setLoadError(err.message || String(err));
      setPhase("loaderror");
    }
  };


  // Leaving the tutorial early. Goes straight to the map: dumping somebody back
  // on the title screen after they asked to skip a tutorial makes them start the
  // navigation over, which is the opposite of what they asked for.
  const askBailTutorial = () => { sfx.current.modalOpen(); setBailConfirm(true); };
  const cancelBailTutorial = () => { sfx.current.click(); setBailConfirm(false); };

  const bailTutorial = () => {
    setBailConfirm(false);
    sfx.current.click();
    music.current.stop();
    EV.trackTutorialStep("skipped", { level, atStep: tourIdx });
    EV.trackRunEnd("abandoned", { level, mode: "tutorial" });
    EV.flush();
    resetState();
    EV.trackNav("map");
    setPhase("map");
  };

  // A chapter now goes straight into question one. The district screen showed
  // the legal notice and this chapter's own note before Start was pressed, so
  // there is nothing left to put on a screen in between.
  const startChapter = async (d, chapterRef) => {
    resetState();
    setChapter(null);
    setLoadError(null);
    setDistrict(d);
    setPhase("loading");
    try {
      const ch = await loadChapter(d.id, chapterRef);
      const deckNow = buildDeck(ch, CHAPTER_DECK_SIZE);
      setChapter(ch);
      setDeck(deckNow);
      EV.trackModeStart("chapter", deckNow, { chapterId: ch.id, districtId: d.id, deckSize: deckNow.length, lives: LIVES_PER_ROUND });
      EV.trackNav("round_start");
      setPhase("playing");
      setTimeout(() => { music.current.start(); music.current.setStage(1); }, 200);
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

  // Recording a finished CHAPTER round into session progress. `cleared` means
  // the deck was finished with lives left, not that every answer was right.
  // Called exactly once per round, from advance().
  const recordChapter = (right, cleared) => {
    if (!chapter || !district || isDemo || isTutorial || isEndless) return;
    setSession((s) => recordChapterRun(s, district.id, chapter.id, {
      correct: right, deckSize: deck.length, cleared
    }));
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

  // Which tour phase the game is in right now. Order matters: a modal sits over
  // the shop, and the shop sits over the question, so the most-covering surface
  // wins. Anything else (the locking pause, an end screen) is null, which hides
  // the overlay and lets the game breathe.
  const tourPhase = !isTutorial ? null
    : pendingLifeline ? "modal"
    : shopOpen ? "shop"
    : phase === "playing" ? "playing"
    : phase === "revealing" ? (revealStep === "cards" ? "cards" : "verdict")
    : null;

  const tourScript = (isTutorial && currentQ && currentQ.tour) || [];
  const tourStep = isTutorial ? activeStep(tourScript, tourIdx, tourPhase) : null;

  const tourAdvance = () => {
    const s = tourScript[tourIdx];
    if (s) EV.trackTutorialStep(s.id, { level, action: s.action, target: s.target });
    setTourIdx((i) => i + 1);
  };

  // Back reaches within the current section only, and only across steps that
  // share a phase. Crossing a phase would mean undoing an answer or closing a
  // dialog the player already resolved, which Back cannot actually do, so
  // offering it would be a lie. Sections themselves are one-way: once a new
  // question is dealt, the previous one is gone.
  const tourCanBack = isTutorial && tourIdx > 0
    && !!tourScript[tourIdx] && !!tourScript[tourIdx - 1]
    && tourScript[tourIdx - 1].phase === tourScript[tourIdx].phase;
  const tourBack = () => { if (tourCanBack) setTourIdx((i) => Math.max(0, i - 1)); };

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
    setRemovedAnswers([]); setJuryResults(null); setHintShown(false);
    setPhase("playing");
  };

  const onSelect = (idx) => {
    if (phase !== "playing") return;
    if (removedAnswers.includes(idx)) return;
    sfx.current.select();
    setRetryNotice(false);
    const m = qMeter.current;
    if (m.firstSelectAt === null) m.firstSelectAt = performance.now();
    else if (idx !== selected) m.changes += 1;
    setSelected(idx);
  };

  const onLockIn = () => {
    if (selected === null) return;
    const wasRight = selected === currentQ.correct;
    // No answer events in the tutorial. The player did not choose anything: the
    // tour told them which button to press, including the one deliberate miss.
    // Timing still lands, via the session clock and the tutorial step events.
    if (!isTutorial) {
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
        // Category axis (DESIGN.md 5): unaided / hint-assisted / reduced-field
        // is derived downstream from this ordered list, not judged here.
        lifelinesUsed: m.lifelines.slice(),
        // Display indices, same rule as displayIndex above. optionId() resolves
        // each to the permanent id of the option that was actually on screen.
        removedDisplayIndices: removedAnswers,
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
      } else if (isTutorial && currentQ && currentQ.retryOnWrong) {
        // Tutorial retry. The last tutorial question is a real choice, so a wrong
        // pick has to do something, but marching a player through the whole
        // wrong-answer ceremony on the closing question is the wrong note and
        // handing them the answer defeats the point of asking.
        //
        // The option they picked is struck out the way 50/50 strikes one, the
        // selection clears, and they go again. No life, no verdict, no reveal.
        setResults((r) => { const copy = r.slice(); copy[level] = undefined; return copy; });
        setRemovedAnswers((prev) => (prev.includes(selected) ? prev : [...prev, selected]));
        setSelected(null);
        setLocked(false);
        setRetryNotice(true);
        setScreenFlash("red");
        setTimeout(() => setScreenFlash(null), 600);
        sfx.current.lifeline();
        setPhase("playing");
        music.current.unduck(600);
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

    // Out of lives ends the run wherever it is. Never in the tutorial: the
    // script spends exactly one life on purpose and a tutorial that can be
    // failed is not a tutorial.
    if (lives <= 0 && !isTutorial) {
      music.current.stop();
      setFinalPrize(0);
      if (isDemo) recordDemoRun(correctCount, LIVES_PER_ROUND, false);
      else recordChapter(correctCount, false);
      EV.trackRunEnd("lost", { level, mode: runMode, correct: correctCount, wrong: LIVES_PER_ROUND });
      EV.flush();
      setPhase("gameover");
      return;
    }

    const next = level + 1;

    // Reached the end of the deck with lives to spare. This is a finished round
    // whether or not every answer was right, which is the other half of the
    // lives change: "cleared it" now means "got to the end", not "was perfect".
    // The tutorial has no prize, no scoreboard and no win screen. It ends by
    // putting the player where they wanted to be in the first place.
    if (isTutorial && next >= deck.length) {
      music.current.stop();
      EV.trackTutorialStep("completed", { level, correct: correctCount });
      EV.trackRunEnd("tutorial_done", { level, mode: "tutorial", correct: correctCount, wrong: wrongCount });
      EV.flush();
      setSession((s) => clearTutorial(s));
      resetState();
      EV.trackNav("map");
      setPhase("map");
      return;
    }

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
      // A chapter finished. Recorded here rather than on the win screen so it
      // lands whichever way the player leaves that screen.
      recordChapter(correctCount, true);
      setPhase("winbig");
      music.current.duck(0.12, 400);
      return;
    }

    const nextStage = isEndless ? 3 : musicStageFor(next);
    setLevel(next);
    setSelected(null); setLocked(false); setRevealCorrect(false); setRevealWrong(false);
    setShowFloating(false); setRetryNotice(false);
    setRemovedAnswers([]); setJuryResults(null); setHintShown(false);
    if (nextStage !== stage) music.current.setStage(nextStage);
    setPhase("playing");
  };

  // -------------------------------------------------------------------------
  // The shop
  // -------------------------------------------------------------------------
  const openShop = () => { if (phase !== "playing") return; sfx.current.modalOpen(); setShopOpen(true); };
  const closeShop = () => { sfx.current.click(); setShopOpen(false); };
  const requestLifeline = (k) => { if (phase !== "playing") return; setShopOpen(false); sfx.current.modalOpen(); setPendingLifeline(k); };
  const cancelLifeline = () => { sfx.current.click(); setPendingLifeline(null); };

  // Swap the current question for another from this chapter not already dealt.
  // Returns true if a swap happened; false when the pool is exhausted, which
  // confirmLifeline guards against so SKIP is never charged for a no-op.
  const skipQuestion = () => {
    if (!chapter) return false;
    const seenQs = new Set(deck.map((q) => q.id || q.q));
    const poolRaw = chapter.questions.filter((q) => !seenQs.has(q.id || q.q));
    if (poolRaw.length === 0) return false;
    const picked = shuffleOptions({ ...shuffle(poolRaw)[0] });
    setDeck((prev) => { const copy = prev.slice(); copy[level] = picked; return copy; });
    setSelected(null); setRemovedAnswers([]); setJuryResults(null); setHintShown(false);
    return true;
  };
  const canSkipNow = () => {
    if (!chapter) return false;
    const seenQs = new Set(deck.map((q) => q.id || q.q));
    return chapter.questions.some((q) => !seenQs.has(q.id || q.q));
  };

  const applyLifeline = (k) => {
    sfx.current.lifeline();
    if (k === "fifty") {
      const wrong = [0, 1, 2, 3].filter((x) => x !== currentQ.correct);
      const toRemove = shuffle(wrong).slice(0, 2);
      setRemovedAnswers(toRemove);
      if (selected !== null && toRemove.includes(selected)) setSelected(null);
    } else if (k === "poll") {
      setJuryResults(simulateJury(currentQ.correct, removedAnswers));
    } else if (k === "hint") {
      setHintShown(true);
    } else if (k === "skip") {
      skipQuestion();
    }
  };

  const confirmLifeline = () => {
    const k = pendingLifeline;
    setPendingLifeline(null);
    if (!k) return;
    // SKIP with nothing to swap to: do not charge, do not consume.
    if (k === "skip" && !canSkipNow()) { sfx.current.click(); return; }
    const bumpUsage = () => setUsage((s) => ({ ...s, [k]: s[k] + 1 }));
    qMeter.current.lifelines.push(k);
    if (!isTutorial) EV.trackLifeline(currentQ, k, { purchased: !lifelines[k], points });
    if (lifelines[k]) {
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

  // A point banked from reading a review card. Only ever called on a correct
  // answer; see the note at the top of the file about why that is the part of
  // this design most worth watching.
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
  const doSkip = () => {
    sfx.current.click();
    if (!isTutorial) EV.trackReviewCard(currentQ, -1, { skipped: true, correct: revealCorrect });
    setSkipConfirm(false); setSkipConfirmed(true); advance();
  };

  const askHome = () => {
    if (phase === "start" || phase === "map" || phase === "district" || phase === "gameover" || phase === "won" || phase === "winbig") return;
    sfx.current.modalOpen();
    setHomeConfirm(true);
  };
  const cancelHome = () => { sfx.current.click(); setHomeConfirm(false); };
  // Leaving a chapter mid-round goes back to its district, not the map: the
  // other chapters are there and it is one fewer tap than landing on the grid.
  const confirmHome = () => {
    setHomeConfirm(false);
    if (isDemo) exitDemo();
    else if (district && !isTutorial) goDistrict();
    else goMap();
  };

  const askLogo = () => { sfx.current.modalOpen(); setLogoConfirm(true); };
  const cancelLogo = () => { sfx.current.click(); setLogoConfirm(false); };
  const confirmLogo = () => {
    sfx.current.click();
    setLogoConfirm(false);
    try { window.open(LOGO.url, "_blank", "noopener,noreferrer"); } catch {}
  };

  const winTakeMoney = () => { sfx.current.click(); music.current.stop(); EV.trackRunEnd("walked", { level, mode: "endless", correct: correctCount, wrong: wrongCount }); EV.flush(); setPhase("won"); };
  const winKeepGoing = () => { sfx.current.click(); enterEndless(); };

  const walkNext = () => { sfx.current.click(); if (walkStep < R.walkthrough.length - 1) setWalkStep(walkStep + 1); else startTutorial(); };
  const walkPrev = () => { sfx.current.click(); if (walkStep > 0) setWalkStep(walkStep - 1); };
  // Skipping the brief still skips the tutorial. Somebody who taps past the
  // safety screen is not going to sit through nine tooltips, and pretending
  // otherwise just moves the drop-off one screen later.
  const walkSkip = () => { sfx.current.click(); goMap(); };

  // The tutorial layer: the spotlight for the current step, plus a bail-out chip
  // that is present for the WHOLE tutorial regardless of what the overlay is
  // doing. If a step ever wedges (a target that never renders, a phase that
  // never arrives) the chip is the guaranteed way out, and it sits at a higher
  // z-index than the overlay so it stays reachable.
  const tutorialLayer = !isTutorial ? [] : [
    c.jsx(TourBail, { onSkip: askBailTutorial, label: R.tutorial.bailLabel }, "tour-bail"),
    bailConfirm && c.jsx(TourBailConfirm, {
      onConfirm: bailTutorial, onCancel: cancelBailTutorial,
      title: R.tutorial.bailConfirmTitle, body: R.tutorial.bailConfirmBody,
      confirmLabel: R.tutorial.bailConfirmPrimary, cancelLabel: R.tutorial.bailConfirmSecondary
    }, "tour-bail-confirm"),
    c.jsx(TourOverlay, {
      step: tourStep,
      stepNumber: Math.min(tourIdx + 1, tourScript.length),
      stepTotal: tourScript.length,
      onAdvance: tourAdvance,
      onBack: tourBack,
      canBack: tourCanBack
    }, "tour-overlay")
  ];

  // -------------------------------------------------------------------------
  // Screens
  // -------------------------------------------------------------------------

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
            c.jsx(Button, {
              onClick: district ? goDistrict : goMap, variant: "primary", size: "sm",
              children: district ? "Back" : "Back to the map"
            })
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
        session,
        onOpenDistrict: openDistrict,
        onDistricts: setDistricts,
        onHome: () => { resetState(); setPhase("start"); },
        onPlayDemo: startDemo, onPlayTutorial: startTutorial,
        demoRunsUsed, demoMaxRuns: MAX_DEMO_RUNS, demoCanPlay, demoWon
      }),
      logoConfirm && c.jsx(LogoConfirm, { onGo: confirmLogo, onCancel: cancelLogo })
    ] });

  // One district: what it covers, the legal notice once, and its chapters in
  // order. Falling back to the map when there is somehow no district beats
  // rendering an empty screen.
  if (phase === "district") {
    if (!district) { setPhase("map"); return null; }
    return c.jsxs(Shell, { muted, setMuted, onLogoClick: askLogo, children: [
      c.jsx(DistrictScreen, {
        district, session,
        onPlayChapter: startChapter,
        onBack: () => { sfx.current.click(); setPhase("map"); }
      }),
      logoConfirm && c.jsx(LogoConfirm, { onGo: confirmLogo, onCancel: cancelLogo })
    ] });
  }

  if (phase === "winbig")
    return c.jsxs(Shell, { muted, setMuted, hideSoundButton: true, onLogoClick: askLogo, children: [
      c.jsx(WinBigScreen, {
        prize: finalPrize || prizeFor(correctCount),
        correctCount, wrongCount, usage, pointsSpent, pointsLeft: points,
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
        // Play again and Home both land on the district, which is where the
        // other chapters are and where this round's score just appeared.
        onPlayAgain: playAgain, onHome: district ? goDistrict : goMap
      }),
      logoConfirm && c.jsx(LogoConfirm, { onGo: confirmLogo, onCancel: cancelLogo })
    ] });
  }

  if (phase === "revealing") {
    return c.jsxs(Shell, { muted, setMuted, screenFlash, screenShake, hideSoundButton: true, hideLogo: true, children: [
      c.jsx(RevealScreen, {
        question: currentQ, level, runLength, isEndless, streak,
        revealCorrect, selectedIdx: selected, muted, setMuted, points,
        lives, isLastQuestion: level + 1 >= deck.length, isTutorial,
        onNext: advance, onHome: askHome,
        onEarnCardPoint: (seg) => earnCardPoint(seg),
        onRevealStep: setRevealStep,
        onFlipSound: () => sfx.current.cardFlip(),
        onRevisitSound: () => sfx.current.cardRevisit(),
        onAckSound: () => sfx.current.click(),
        onSkipReview: openSkipConfirm
      }),
      homeConfirm && c.jsx(ConfirmModal, { title: R.homeConfirm.title, body: R.homeConfirm.body, primaryLabel: R.homeConfirm.leaveLabel, secondaryLabel: R.homeConfirm.stayLabel, primaryVariant: "danger", onPrimary: confirmHome, onSecondary: cancelHome }),
      skipConfirm && c.jsx(ConfirmModal, { title: R.review.skipConfirmTitle, body: R.review.skipConfirmBody, primaryLabel: R.review.skipConfirmPrimary, secondaryLabel: R.review.skipConfirmSecondary, primaryVariant: "danger", onPrimary: doSkip, onSecondary: cancelSkip }),
      ...tutorialLayer
    ] });
  }

  // playing or locking
  return c.jsxs(Shell, { muted, setMuted, screenFlash, screenShake, hideSoundButton: true, onLogoClick: askLogo, children: [
    c.jsx(QuestionScreen, {
      question: currentQ, level, runLength, rung, stage, streak, selectedIdx: selected,
      locked, revealCorrect, revealWrong, showFloating, phase, results,
      lives, muted, setMuted, isEndless, isDemo, correctCount,
      removedAnswers, juryResults, hintShown, lifelines, points, retryNotice,
      onSelect, onLockIn, onHome: askHome, onOpenShop: openShop
    }),
    shopOpen && c.jsx(ShopPanel, {
      lifelines, points, prices: LIFELINE_PRICES,
      onPick: requestLifeline, onClose: closeShop
    }),
    pendingLifeline && c.jsx(LifelineModal, {
      lifelineKey: pendingLifeline,
      remainingAfter: Object.values(lifelines).filter(Boolean).length - 1,
      available: lifelines[pendingLifeline], points, price: LIFELINE_PRICES[pendingLifeline],
      onConfirm: confirmLifeline, onCancel: cancelLifeline
    }),
    homeConfirm && c.jsx(ConfirmModal, { title: R.homeConfirm.title, body: R.homeConfirm.body, primaryLabel: R.homeConfirm.leaveLabel, secondaryLabel: R.homeConfirm.stayLabel, primaryVariant: "accent", onPrimary: confirmHome, onSecondary: cancelHome }),
    logoConfirm && c.jsx(LogoConfirm, { onGo: confirmLogo, onCancel: cancelLogo }),
    ...tutorialLayer
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
    "data-tour": "lives",
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
          // Back is omitted entirely when there is nowhere to go back to. It
          // used to be visibility:hidden, which still occupies its width and
          // shoved the only button off-centre.
          c.jsxs("div", { style: { marginTop: 30, display: "flex", justifyContent: "center", alignItems: "center", gap: 12, flexShrink: 0 }, children: [
            canPrev && c.jsx(Button, { onClick: onPrev, variant: "secondary", size: "md", children: "\u2039 Back" }),
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
  if (screen.type === "points")
    return c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 14 }, children: [
      c.jsx("div", { style: { display: "flex", gap: 5 }, children: [0, 1, 2].map((n) => c.jsx("div", { style: { width: 16, height: 16, borderRadius: "50%", background: u.brand, border: `2px solid ${u.outline}` } }, n)) }),
      c.jsx("div", { style: { fontFamily: C.display, fontSize: 34, color: u.brand }, children: "3 PTS" })
    ] });
  // The shop slide shows all four lifelines at once. It used to be one slide
  // each, four slides, which was most of the walkthrough's length for the
  // feature nobody used.
  if (screen.type === "shop")
    return c.jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 340 }, children: LIFELINE_KEYS.map((k) => c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, background: u.surface, border: `2px solid ${u.outline}`, padding: "10px 14px", borderRadius: 10, boxShadow: U.sm }, children: [
      c.jsx("span", { style: { display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, background: u.brand, border: `2px solid ${u.outline}`, color: u.textOnDark, flexShrink: 0 }, children: c.jsx(LifeIcon, { name: k, size: 17 }) }),
      c.jsx("span", { style: { fontFamily: C.display, fontSize: 14, letterSpacing: 1, color: u.text }, children: R.lifelines[k].label })
    ] }, k)) });
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
    setMuted, isEndless, isDemo, removedAnswers = [], juryResults, hintShown, lifelines,
    points, retryNotice, onSelect, onLockIn, onHome, onOpenShop } = props;
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

        // The stat row: LIVES, SHOP, WORTH. Three tiles instead of two, because
        // lives have to be visible at all times and the shop still needs to be
        // one tap away. Lives sit leftmost because they are the thing a player
        // checks most often and never have to think about.
        c.jsxs("div", { className: "ts-stat-row", style: { display: "flex", gap: 12, alignItems: "stretch" }, children: [
          c.jsx(LivesBox, { lives }),
          c.jsx(ShopButton, { lifelines, points, disabled: locked, onClick: onOpenShop }),
          c.jsxs("div", { className: "ts-stat-money", "data-tour": "worth", style: { flex: "1.6 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "12px 16px", background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 10, boxShadow: U.md }, children: [
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
        c.jsxs("div", { className: "ts-question-card", "data-tour": "question", style: { position: "relative", background: u.surfaceHigh, border: `2px solid ${u.outline}`, borderLeft: `8px solid ${u.brand}`, padding: "32px 36px", borderRadius: 10, animation: revealWrong ? "ts-wrong-shake-card 0.5s ease-out" : "ts-fade-in 0.4s ease-out", boxShadow: U.md }, children: [
          c.jsx("p", { style: { fontFamily: C.body, fontSize: "clamp(19px, 2.2vw, 24px)", lineHeight: 1.45, fontWeight: 600, margin: 0, color: u.text }, children: question.q }),
          hintShown && c.jsxs("div", { "data-tour": "hint", style: { marginTop: 22, padding: "14px 18px", background: u.blueBg, border: `2px solid ${u.blue}`, borderRadius: 6, fontFamily: C.body, fontSize: 14, color: u.blue, fontStyle: "italic", lineHeight: 1.6, animation: "ts-fade-in 0.4s", fontWeight: 500 }, children: [
            c.jsx("span", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, color: u.blue, fontWeight: 700, fontStyle: "normal", marginRight: 10, textTransform: "uppercase" }, children: R.lifelines.hint.inGameLabel }),
            question.hint
          ] })
        ] }, "q-" + level),
        // Tutorial retry notice. Terra, not red: this is "go again", not "you
        // lost something", and the tutorial never takes a life for it.
        retryNotice && c.jsxs("div", {
          style: { display: "flex", alignItems: "center", gap: 12, background: u.terraSoft, border: `2px solid ${u.terra}`, borderRadius: 10, padding: "12px 16px", boxShadow: U.sm, animation: "ts-fade-in 0.35s ease-out" },
          children: [
            c.jsx("span", { "aria-hidden": true, style: { fontFamily: C.display, fontSize: 20, color: u.terra, lineHeight: 1, flexShrink: 0 }, children: "\u2715" }),
            c.jsxs("div", { children: [
              c.jsx("div", { style: { fontFamily: C.display, fontSize: 16, letterSpacing: 1, color: u.terra, lineHeight: 1.1 }, children: R.tutorial.retryTitle }),
              c.jsx("div", { style: { fontFamily: C.body, fontSize: 13.5, lineHeight: 1.45, color: u.text, fontWeight: 500, marginTop: 3 }, children: R.tutorial.retryBody })
            ] })
          ]
        }),
        c.jsx("div", { "data-tour": "answers", style: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }, className: "ts-answer-grid", children: question.options.map((opt, i) => c.jsx(AnswerButton, {
          letter: ["A", "B", "C", "D"][i], text: opt, selected: selectedIdx === i, locked,
          isCorrect: i === question.correct, isSelectedAnswer: selectedIdx === i, revealCorrect, revealWrong,
          removed: removedAnswers.includes(i), juryPct: juryResults ? juryResults[i] : null,
          tourId: "answer-" + i,
          stage, onClick: () => onSelect(i)
        }, i)) }),
        c.jsx("div", { className: "ts-action-bar", style: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14 }, children:
          c.jsx("div", { className: "ts-action-bar-right", style: { display: "flex", gap: 12 }, children: c.jsx(Button, { variant: "primary", size: "md", disabled: selectedIdx === null || locked, onClick: onLockIn, "data-tour": "lock", children: "Lock It In" }) })
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
  return c.jsx("div", { className: "ts-progress-dots", "data-tour": "progress", style: { display: "flex", gap: 4, alignItems: "center" }, children: Array.from({ length: n }).map((_, i) => {
    const res = results[i];
    const current = i === level;
    const green = res === true || (current && revealCorrect);
    const red = res === false || (current && revealWrong);
    return c.jsx("div", { style: { flex: 1 }, children: c.jsx("div", { style: { width: "100%", height: 6, borderRadius: 3, background: green ? u.green : red ? u.red : current ? u.brand : u.borderLight, border: `1px solid ${u.outline}`, animation: green ? "ts-dot-fill 0.4s ease-out" : "none", transition: "background 0.3s" } }, "dot-" + i + "-" + green + "-" + red) }, i);
  }) });
}

function AnswerButton(props) {
  const { letter, text, selected, locked, isCorrect, isSelectedAnswer, revealCorrect, revealWrong, removed, juryPct, stage, tourId, onClick } = props;
  let bg = u.surface, border = u.outline, color = u.text, anim = "", letterBg = u.brand, letterColor = u.textOnDark, shadow = U.md, transform = "translate(0, 0)";
  if (removed) { bg = "transparent"; color = u.textMuted; letterBg = u.borderLight; letterColor = u.textMuted; shadow = "none"; }
  else if (revealCorrect && isCorrect) { bg = u.green; color = u.textOnDark; letterBg = u.surface; letterColor = u.green; anim = "ts-correct-pop 0.8s ease-out"; }
  else if (revealWrong && isCorrect) { bg = u.green; color = u.textOnDark; letterBg = u.surface; letterColor = u.green; anim = "ts-correct-pop 0.9s ease-out"; }
  else if (revealWrong && isSelectedAnswer) { bg = u.red; color = u.textOnDark; letterBg = u.surface; letterColor = u.red; }
  else if (locked && selected) { bg = u.brandSoft; anim = `ts-tension-${stage} ${1.6 - stage * 0.1}s ease-in-out infinite`; shadow = "none"; transform = "translate(4px, 4px)"; }
  else if (selected) { bg = u.brandSoft; shadow = U.sm; transform = "translate(1px, 1px)"; }
  return c.jsxs("button", {
    onClick, disabled: removed || locked, className: "ts-answer-btn", "data-tour": tourId,
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
// ShopButton : the shop, living as the middle tile of the stat row.
// ---------------------------------------------------------------------------
// Terra fill so it reads as a tappable tool, distinct from the neutral Lives and
// Worth boxes either side of it. The sub-label is just the points now: the old
// version read "12 PTS · 2 READY", which at three tiles across a phone was more
// text than the tile could hold.
function ShopButton({ lifelines, points, disabled, onClick }) {
  const [hover, setHover] = useState(false);
  const ready = Object.values(lifelines).filter(Boolean).length;
  const off = disabled;
  const active = !off && hover;
  return c.jsxs("button", {
    onClick: off ? undefined : onClick, disabled: off,
    onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
    className: "ts-shop-btn",
    "data-tour": "shop",
    "aria-label": `Open shop. ${points} points, ${ready} free lifelines ready.`,
    style: {
      flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 2,
      padding: "10px 8px", background: off ? u.surface : u.terra,
      border: `2px solid ${u.outline}`, borderRadius: 10,
      boxShadow: off ? "none" : active ? U.sm : U.md,
      transform: active ? "translate(1px,1px)" : "translate(0,0)",
      transition: "transform 0.1s, box-shadow 0.1s",
      cursor: off ? "not-allowed" : "pointer", opacity: off ? 0.55 : 1,
      position: "relative", WebkitTapHighlightColor: "transparent"
    },
    children: [
      c.jsxs("span", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
        c.jsx("svg", {
          width: 17, height: 17, viewBox: "0 0 24 24", fill: "none",
          stroke: off ? u.textMuted : u.textOnDark, strokeWidth: 2.4,
          strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
          children: [
            c.jsx("path", { d: "M4 8 L20 8 L18.5 22 L5.5 22 Z" }, 0),
            c.jsx("path", { d: "M8 8 C8 3 16 3 16 8" }, 1)
          ]
        }),
        c.jsx("span", { style: { fontFamily: C.display, fontSize: 16, letterSpacing: 1.5, color: off ? u.textMuted : u.textOnDark }, children: R.shop.openLabel })
      ] }),
      c.jsxs("span", { style: { fontFamily: C.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4, color: off ? u.textMuted : "rgba(251,246,236,0.92)" }, children: [String(points), " ", R.shop.ptsLabel] }),
      ready > 0 && c.jsx("span", {
        title: `${ready} free`,
        style: { position: "absolute", top: 5, right: 5, fontFamily: C.mono, fontSize: 8, fontWeight: 700, color: u.textOnDark, background: u.green, border: `2px solid ${u.outline}`, borderRadius: 5, padding: "1px 4px" },
        children: String(ready)
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// ShopPanel : four lifelines, each in one of three states.
// ---------------------------------------------------------------------------
// Free-and-ready, buyable with points, or too expensive. SHIELD used to add a
// fourth state (armed) and is gone, which makes this list shorter and the rules
// simpler to read at a glance.
function ShopPanel({ lifelines, points, prices, onPick, onClose }) {
  const purchaseOnly = { skip: true }; // never starts free
  return c.jsx(Backdrop, { onClose, children: c.jsxs("div", {
    className: "ts-shop-panel",
    style: { background: u.surfaceHigh, border: `2px solid ${u.outline}`, borderRadius: 14, boxShadow: U.lg, padding: "22px 24px 20px", maxWidth: 480, width: "100%", maxHeight: "90dvh", overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", touchAction: "pan-y", animation: "ts-modal-in 0.18s ease-out" },
    children: [
      c.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }, children: [
        c.jsx("h3", { style: { fontFamily: C.display, fontSize: 26, letterSpacing: 0, margin: 0, color: u.text }, children: R.shop.title }),
        c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, background: u.brandSoft, border: `2px solid ${u.outline}`, borderRadius: 20, padding: "5px 12px" }, children: [
          c.jsx("span", { style: { fontFamily: C.display, fontSize: 18, color: u.brand, lineHeight: 1 }, children: points }),
          c.jsx("span", { style: { fontFamily: C.mono, fontSize: 9, letterSpacing: 1.5, color: u.brandDeep, fontWeight: 700 }, children: R.shop.ptsLabel })
        ] })
      ] }),
      c.jsx("p", { style: { fontFamily: C.body, fontSize: 13, lineHeight: 1.5, color: u.textDim, fontWeight: 500, margin: "0 0 16px" }, children: R.shop.blurb }),
      c.jsx("div", { "data-tour": "shop-list", style: { display: "flex", flexDirection: "column", gap: 9, marginBottom: 18 }, children: LIFELINE_KEYS.map((k) => {
        const meta = R.lifelines[k];
        const available = lifelines[k];
        const price = prices[k];
        const affordable = points >= price;
        const buyable = !available && affordable;
        const clickable = available || buyable;
        let stateLabel, stateColor, actionText;
        if (available) { stateLabel = R.shop.freeState; stateColor = u.green; actionText = R.shop.useLabel; }
        else if (buyable) { stateLabel = purchaseOnly[k] ? R.shop.buyState(price) : R.shop.buyBackState(price); stateColor = u.brand; actionText = `Buy ${price}`; }
        else { stateLabel = R.shop.needState(price); stateColor = u.textMuted; actionText = `${price} pts`; }
        return c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 14, background: available ? u.surfaceHigh : buyable ? u.brandSofter : u.surfaceWarm, border: `3px solid ${clickable ? u.outline : u.borderLight}`, borderRadius: 12, padding: "12px 14px", opacity: clickable ? 1 : 0.72, boxShadow: clickable ? U.sm : "none" }, children: [
          c.jsx("div", { style: { flexShrink: 0, width: 46, height: 46, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: clickable ? u.brand : u.surface, border: `2px solid ${clickable ? u.outline : u.borderLight}`, color: clickable ? u.textOnDark : u.textMuted, boxShadow: clickable ? U.sm : "none" }, children: c.jsx(LifeIcon, { name: k, size: 24 }) }),
          c.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
            c.jsx("div", { style: { fontFamily: C.display, fontSize: 18, letterSpacing: 1, color: clickable ? u.text : u.textMuted }, children: meta.label }),
            c.jsx("div", { style: { fontFamily: C.body, fontSize: 12.5, lineHeight: 1.4, color: u.textDim, fontWeight: 500, marginTop: 2 }, children: meta.shortDesc }),
            c.jsx("div", { style: { fontFamily: C.mono, fontSize: 9.5, letterSpacing: 0.5, fontWeight: 700, color: stateColor, textTransform: "uppercase", marginTop: 4 }, children: stateLabel })
          ] }),
          c.jsx("button", {
            onClick: clickable ? () => onPick(k) : undefined, disabled: !clickable,
            "data-tour": "shop-item-" + k,
            style: { flexShrink: 0, fontFamily: C.display, fontSize: 13, letterSpacing: 1, background: clickable ? u.brand : u.surfaceWarm, color: clickable ? u.textOnDark : u.textMuted, border: `2px solid ${clickable ? u.outline : u.borderLight}`, borderRadius: 8, padding: "9px 16px", cursor: clickable ? "pointer" : "default", textTransform: "uppercase", boxShadow: clickable ? U.sm : "none", minWidth: 72 },
            children: actionText
          })
        ] }, k);
      }) }),
      c.jsx("div", { style: { display: "flex", justifyContent: "flex-end" }, children: c.jsx(Button, { onClick: onClose, variant: "ghost", size: "sm", style: { fontSize: 14 }, children: R.shop.closeLabel }) })
    ]
  }) });
}

// Confirmation for spending a lifeline (or buying one back with points).
function LifelineModal({ lifelineKey, remainingAfter, available, points, price, onConfirm, onCancel }) {
  const meta = R.lifelines[lifelineKey];
  const purchaseOnly = lifelineKey === "skip";
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

// The scoreboard: which lifelines were used, points spent, points left.
function RunBreakdown({ usage = {}, pointsSpent = 0, pointsLeft = 0 }) {
  const totalUses = LIFELINE_KEYS.reduce((n, k) => n + (usage[k] || 0), 0);
  return c.jsxs("div", { style: { width: "100%", background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 12, padding: "18px 20px", boxShadow: U.md, textAlign: "left" }, children: [
    c.jsxs("div", { style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 2, color: u.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }, children: ["How you got there \u00B7 ", totalUses, totalUses === 1 ? " lifeline used" : " lifelines used"] }),
    c.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }, children: LIFELINE_KEYS.map((k) => {
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
    points, lives, isLastQuestion, isTutorial, onNext, onHome, onEarnCardPoint, onRevealStep,
    onFlipSound, onRevisitSound, onAckSound, onSkipReview } = props;

  // Points are only earned on a correct answer. The cards themselves are
  // identical either way, which is the part that matters and the part that used
  // to be broken: a miss showed the cards but recorded nothing about them.
  const scoring = revealCorrect;

  const [step, setStep] = useState("verdict"); // "verdict" | "cards"
  const [current, setCurrent] = useState(0);
  const [seen, setSeen] = useState([false, false, false]);
  const [acked, setAcked] = useState([false, false, false]);
  const [dir, setDir] = useState(1);
  const [firstView, setFirstView] = useState(true);
  const [dwellDone, setDwellDone] = useState(false);
  const [pointBurst, setPointBurst] = useState(0);
  const dwellTimer = useRef(null);
  const burstTimer = useRef(null);

  const CARD_COUNT = R.cardMeta.length; // 3

  // Tell the parent which half of the reveal is on screen. Mount reports
  // "verdict"; enterCards reports "cards". Without this the tour cannot tell a
  // verdict step from a card step, since both live in phase "revealing".
  useEffect(() => { if (onRevealStep) onRevealStep("verdict"); }, []); // eslint-disable-line

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
    const copy = acked.slice();
    copy[idx] = true;
    setAcked(copy);
    if (scoring && onEarnCardPoint) {
      onEarnCardPoint(copy.filter(Boolean).length - 1);
      setPointBurst((n) => n + 1);
      if (burstTimer.current) clearTimeout(burstTimer.current);
      burstTimer.current = setTimeout(() => setPointBurst(0), 1200);
    } else if (onAckSound) {
      onAckSound();
    }
  };

  // Safety net: a player who navigates past a card they read without tapping
  // still keeps the point. The tap is the intended path, not a toll booth.
  const creditUnacked = () => {
    if (!scoring) return;
    const copy = acked.slice();
    let added = 0;
    for (let i = 0; i < CARD_COUNT; i++) {
      if (seen[i] && !copy[i]) { copy[i] = true; added++; }
    }
    if (added === 0) return;
    const alreadyHad = acked.filter(Boolean).length;
    setAcked(copy);
    for (let k = 0; k < added; k++) if (onEarnCardPoint) onEarnCardPoint(alreadyHad + k);
  };

  const advanceOut = () => { emitCard(current); creditUnacked(); onNext(); };

  useEffect(() => {
    if (step !== "cards") return;
    if (dwellDone && !seen[current]) markSeen(current);
  }, [dwellDone, step]); // eslint-disable-line

  const enterCards = () => {
    if (onFlipSound) onFlipSound();
    setStep("cards");
    if (onRevealStep) onRevealStep("cards");
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

  useEffect(() => () => { if (dwellTimer.current) clearTimeout(dwellTimer.current); if (burstTimer.current) clearTimeout(burstTimer.current); }, []);

  const allSeen = seen.every(Boolean);
  const allAcked = acked.every(Boolean);
  const earnedCount = acked.filter(Boolean).length;
  const allEarned = scoring && earnedCount === CARD_COUNT;
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
          c.jsxs("div", { "data-tour": "verdict", style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, animation: "ts-fade-in 0.3s ease-out" }, children: [
            c.jsx("div", { style: { width: 54, height: 6, borderRadius: 3, background: revealCorrect ? u.green : u.red } }),
            c.jsx("div", { style: { fontFamily: C.display, fontSize: "clamp(38px, 8vw, 64px)", lineHeight: 1, letterSpacing: 1, color: revealCorrect ? u.green : u.red }, children: revealCorrect ? "CORRECT" : "NOT QUITE" })
          ] }),

          // What the miss cost, in hearts, right where the player is looking.
          // Getting this wrong reads as punishment; getting it right reads as a
          // running total, which is the difference between "you failed" and
          // "you have two left".
          !revealCorrect && c.jsxs("div", { "data-tour": "verdict-hearts", style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, animation: "ts-fade-in 0.45s ease-out" }, children: [
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
          c.jsx("button", { onClick: enterCards, "data-tour": "continue", style: { fontFamily: C.display, fontSize: 16, letterSpacing: 2, background: u.brand, color: u.textOnDark, border: `2px solid ${u.outline}`, padding: "13px 32px", borderRadius: 10, cursor: "pointer", textTransform: "uppercase", boxShadow: U.md }, children: revealCorrect ? R.verdictContinue : R.verdictContinueWrong })
        })
      ]
    });
  }

  // ---------- CARDS STEP ----------
  const finalLabel = outOfLives ? "See Final Result \u2192" : isLastQuestion ? "See your result \u2192" : "Next Question \u2192";
  const finalBtnEl = c.jsx("button", {
    onClick: advanceOut,
    "data-tour": "final",
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
          c.jsx(LivesBox, { lives, compact: true }),
          // Three pips plus "X of 3". On a miss this is replaced by a plain
          // line saying there are no points, so the absence is stated rather
          // than left as a thing the player notices is missing.
          scoring
            ? c.jsxs("div", { "data-tour": "points", style: { display: "flex", alignItems: "center", gap: 10, background: earnedCount === CARD_COUNT ? u.brandSofter : u.surfaceWarm, border: `3px solid ${earnedCount === CARD_COUNT ? u.brand : u.outline}`, borderRadius: 22, padding: "6px 14px 6px 10px", boxShadow: U.sm, animation: earnedCount === CARD_COUNT ? "ts-streak-pop 0.5s ease-out" : "none" }, children: [
                c.jsx("div", { style: { display: "flex", gap: 5 }, children: [0, 1, 2].map((r) => {
                  const filled = r < earnedCount;
                  return c.jsx("div", { style: { width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: filled ? u.brand : u.surface, border: `2.5px solid ${filled ? u.brand : u.borderLight}`, boxShadow: filled ? U.sm : "none", animation: r === earnedCount - 1 ? "ts-pip-pop 0.4s ease-out" : "none" }, children: filled ? c.jsx("span", { style: { color: u.textOnDark, fontSize: 11, fontFamily: C.display, lineHeight: 1 }, children: "\u2605" }) : null }, r);
                }) }),
                c.jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }, children: [
                  c.jsx("div", { style: { fontFamily: C.display, fontSize: 16, letterSpacing: 0.5, color: u.brand, lineHeight: 1 }, children: R.review.pointsOfLabel(earnedCount, CARD_COUNT) }),
                  c.jsx("div", { style: { fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, color: u.brandDeep, fontWeight: 700, textTransform: "uppercase", marginTop: 2 }, children: earnedCount === CARD_COUNT ? R.review.allEarnedLabel : R.review.pointsLabel })
                ] })
              ] })
            : c.jsx("div", { style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1, color: u.textMuted, fontWeight: 700, textTransform: "uppercase" }, children: R.review.noPointsNote })
        ] }),
        c.jsx("button", { onClick: () => setMuted((m) => !m), "aria-label": muted ? "Unmute" : "Mute", className: "ts-sound-btn", style: { background: muted ? "transparent" : u.surface, border: `2px solid ${u.outline}`, color: muted ? u.textMuted : u.text, padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontFamily: C.mono, fontSize: 10, letterSpacing: 1.5, fontWeight: 700 }, children: muted ? "OFF" : "ON" })
      ] }),

      c.jsxs("div", { style: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", maxWidth: 760, margin: "0 auto", width: "100%", position: "relative" }, children: [
        c.jsx(ComicCard, {
          cardIndex: current, meta, dir, firstView, question, scoring,
          acked: acked[current], onAck: () => acknowledge(current)
        }, "card-" + current + "-" + (firstView ? "f" : "s")),
        pointBurst > 0 && c.jsxs("div", { "aria-hidden": true, style: { position: "absolute", left: "50%", top: "42%", transform: "translate(-50%, -50%)", zIndex: 20, pointerEvents: "none", textAlign: "center", animation: "ts-point-burst 1.2s cubic-bezier(.2,.8,.2,1.1) forwards" }, children: [
          c.jsx("div", { style: { fontFamily: C.display, fontSize: "clamp(48px, 11vw, 92px)", color: u.brand, textShadow: `4px 4px 0 ${u.outline}`, lineHeight: 0.9 }, children: "+1" }),
          c.jsx("div", { style: { fontFamily: C.display, fontSize: "clamp(16px, 3.5vw, 26px)", letterSpacing: 3, color: u.brandDeep, marginTop: 2 }, children: allEarned ? "POINT \u00B7 ALL 3!" : "POINT" })
        ] })
      ] }),

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

        // No skipping the review in the tutorial. The cards are the reason the
        // tutorial exists, and a skip link on them is an invitation to miss the
        // one part that is not about buttons.
        !allSeen && !isTutorial && c.jsx("button", { onClick: onSkipReview, style: { background: "transparent", border: "none", fontFamily: C.mono, fontSize: 11, letterSpacing: 2, color: u.textMuted, cursor: "pointer", textTransform: "uppercase", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3, padding: "2px 10px" }, children: scoring ? R.review.skipLabelScoring : R.review.skipLabel })
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
    "data-tour": "next-card",
    style: { position: "relative", overflow: "hidden", fontFamily: C.display, fontSize: 13, letterSpacing: 1.5, background: canAdvance ? u.surface : u.surfaceWarm, color: canAdvance ? u.text : u.textMuted, border: `2px solid ${u.outline}`, padding: "10px 22px", borderRadius: 8, cursor: canAdvance ? "pointer" : "default", textTransform: "uppercase", boxShadow: canAdvance ? U.sm : "none", minWidth: 140 },
    children: [
      readingStill && c.jsx("span", { "aria-hidden": true, style: { position: "absolute", left: 0, top: 0, bottom: 0, background: u.brandSofter, animation: "ts-dwell-fill 2s linear forwards", zIndex: 0 } }),
      c.jsx("span", { style: { position: "relative", zIndex: 1 }, children: canAdvance ? (label || "Next \u203A") : (needsAck ? R.review.acknowledgeFirstLabel : R.review.readingLabel) })
    ]
  });
}

// A single review card. Flips in on first view, slides on revisit.
function ComicCard({ cardIndex, meta, dir, firstView, question, scoring, acked, onAck }) {
  const anim = firstView
    ? "ts-card-flip-in 0.5s cubic-bezier(.2,.7,.2,1) both"
    : (dir >= 0 ? "ts-card-slide-left 0.28s ease-out both" : "ts-card-slide-right 0.28s ease-out both");
  return c.jsx("div", { className: "ts-comic-flip-wrap", style: { flex: 1, minHeight: 0, perspective: 1400, display: "flex" }, children:
    c.jsxs("div", { className: "ts-comic-card", "data-tour": "card", style: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: u.surfaceHigh, border: `3px solid ${u.outline}`, borderRadius: 12, boxShadow: U.lg, overflow: "hidden", transformStyle: "preserve-3d", animation: anim }, children: [
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
        c.jsx(InCardAck, { acked, onAck, scoring })
      })
    ] })
  });
}

// The "I understand" control inside the card. Instantly tappable; the read-gate
// lives on the Next button.
function InCardAck({ acked, onAck, scoring }) {
  if (acked) {
    return c.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, fontFamily: C.display, fontSize: 16, letterSpacing: 1.5, color: u.brandDeep, textTransform: "uppercase" }, children: [
      c.jsx("span", { style: { fontFamily: C.display, fontSize: 20, color: scoring ? u.brand : u.green }, children: scoring ? "\u2605" : "\u2713" }),
      c.jsx("span", { children: scoring ? R.review.acknowledgedScoringLabel : R.review.acknowledgedLabel })
    ] });
  }
  // Same tap, same words, plus the point when there is one. The wording leads
  // with the understanding rather than the reward, which is the right way round
  // for a card whose job is teaching.
  return c.jsx("button", {
    onClick: onAck,
    "data-tour": "ack",
    style: { fontFamily: C.display, fontSize: "clamp(15px, 2.6vw, 19px)", letterSpacing: 1.5, background: u.brand, color: u.textOnDark, border: `2px solid ${u.outline}`, padding: "12px 34px", borderRadius: 10, cursor: "pointer", textTransform: "uppercase", boxShadow: U.md, minWidth: 200, animation: "ts-pulse-next 1.6s ease-in-out infinite" },
    children: scoring ? R.review.acknowledgeScoringLabel : R.review.acknowledgeLabel
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
function WinBigScreen({ prize, correctCount, wrongCount, usage, pointsSpent, pointsLeft, sfx, onTakeMoney, onKeepGoing }) {
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
        c.jsx(RunBreakdown, { usage, pointsSpent, pointsLeft }),
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
