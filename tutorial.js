// Know Your Rights · CCJT
// tutorial.js : the guided tour overlay.
//
// ---------------------------------------------------------------------------
// WHAT THIS IS
// ---------------------------------------------------------------------------
// The old walkthrough was ten cards describing the game. This is the game, with
// a hole cut in a dimmed screen around whatever the player should look at next.
// The safety brief is still a full card and still comes first, because that one
// should never be a tooltip.
//
// The tour does not simulate anything. Every step points at a REAL element that
// the real engine rendered, and a "tap" step is satisfied by the player tapping
// that real element, which runs the real handler. There is no second code path
// pretending to be the game, which is the failure mode that makes most product
// tours drift out of sync with the product.
//
// ---------------------------------------------------------------------------
// HOW THE SPOTLIGHT WORKS
// ---------------------------------------------------------------------------
// Four dim rectangles (above, below, left, right of the target) rather than one
// overlay with an SVG mask. The point is pointer events: with four rectangles
// there is genuinely nothing covering the target, so a tap lands on the real
// button with no forwarding, no synthetic events, and no z-index fight. The
// rectangles themselves swallow taps, which is what makes a "tap" step forced.
//
// ---------------------------------------------------------------------------
// THINGS THAT WILL GO WRONG, AND WHAT HAPPENS
// ---------------------------------------------------------------------------
//   * Target not on screen. The ladder rail is display:none under 920px, so a
//     step pointing at it has nothing to measure on a phone. After a short
//     grace period the step degrades to a centred card with no spotlight rather
//     than hanging. Nothing in the shipped script targets a desktop-only
//     element, but content is edited by people and this is the safe failure.
//   * Target moves. Cards flip, the shop slides in, Safari's toolbars come and
//     go. The rect is re-measured every animation frame, so the hole tracks it.
//   * Target off-viewport. Scrolled into view once per step, centred.
//   * Player gets stuck. There is always a skip, in the overlay and in a chip
//     the engine keeps on screen. Nobody is ever trapped in the tutorial.

import { c, u, C, U, useState, useEffect, useRef } from "./theme.js";
import { createPortal } from "https://esm.sh/react-dom@18.3.1";

// Breathing room around the highlighted element, in px.
const PAD = 8;
// How long to wait for a missing target before giving up and centring the card.
const TARGET_GRACE_MS = 1200;

function vh() { return typeof window === "undefined" ? 0 : window.innerHeight; }

// ---------------------------------------------------------------------------
// TourOverlay
// ---------------------------------------------------------------------------
// Renders exactly one step. Sequencing lives in the engine, which knows what
// phase the game is in; this component knows only how to point at a thing.
export function TourOverlay({ step, stepNumber, stepTotal, onAdvance, onBack, canBack }) {
  // `box` holds the target rect AND the viewport size together, because both
  // change the geometry and both have to land in the same render.
  const [box, setBox] = useState(null);
  const [gaveUp, setGaveUp] = useState(false);
  const rafRef = useRef(null);
  const startedAt = useRef(0);
  const scrolledFor = useRef(null);
  const lastBox = useRef(null);
  // The tooltip measures itself so placement can be decided against its real
  // height. Starts at a conservative estimate for the first frame only.
  const cardRef = useRef(null);
  const [cardH, setCardH] = useState(150);

  // Only re-render when something actually moved. The measure loop runs every
  // frame; setting state every frame would re-render the overlay 60 times a
  // second for a screen that is usually perfectly still.
  const commit = (next) => {
    const p = lastBox.current;
    if (p && next && p.top === next.top && p.left === next.left &&
        p.width === next.width && p.height === next.height &&
        p.vw === next.vw && p.vh === next.vh) return;
    if (!p && !next) return;
    lastBox.current = next;
    setBox(next);
  };

  // A step may name one anchor or several. Several produces the union of their
  // rects, which is how "read this question and pick an answer" highlights both
  // the question card and the answer grid as one region instead of pretending
  // the question is not part of the instruction.
  const targetList = !step ? [] : (Array.isArray(step.target) ? step.target : [step.target]);
  const targetSel = targetList.map((t) => `[data-tour="${t}"]`).join(",");

  // Re-measure every frame. Cheap enough for one element, and it is the only
  // thing that keeps the hole glued to a card that is mid-flip or a panel that
  // is mid-slide. A resize listener alone would not catch either.
  useEffect(() => {
    if (!step || typeof window === "undefined") return;
    startedAt.current = performance.now();
    setGaveUp(false);
    lastBox.current = null;
    setBox(null);

    const tick = () => {
      // Keep the measured tooltip height current: the body text length changes
      // per step and wraps differently at every width.
      if (cardRef.current) {
        const h = Math.round(cardRef.current.getBoundingClientRect().height);
        if (h > 0 && h !== cardH) setCardH(h);
      }
      const els = Array.from(document.querySelectorAll(targetSel))
        .filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; });
      const el = els[0];
      if (el) {
        // Union of every matched anchor.
        const r = els.reduce((acc, e) => {
          const b = e.getBoundingClientRect();
          if (!acc) return { top: b.top, left: b.left, right: b.right, bottom: b.bottom };
          return { top: Math.min(acc.top, b.top), left: Math.min(acc.left, b.left),
                   right: Math.max(acc.right, b.right), bottom: Math.max(acc.bottom, b.bottom) };
        }, null);
        r.width = r.right - r.left;
        r.height = r.bottom - r.top;
        // A zero-size box means it is in the DOM but not laid out yet (or
        // display:none). Treat it as missing rather than drawing a hole at 0,0.
        if (r.width > 0 && r.height > 0) {
          // Scroll it into view once per step, not every frame, or the page
          // fights the player's own scrolling.
          if (scrolledFor.current !== step.id) {
            const off = r.top < 8 || r.bottom > vh() - 8;
            if (off && el.scrollIntoView) {
              try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch { el.scrollIntoView(); }
            }
            scrolledFor.current = step.id;
          }
          commit({
            top: Math.round(r.top), left: Math.round(r.left),
            width: Math.round(r.width), height: Math.round(r.height),
            vw: window.innerWidth, vh: window.innerHeight
          });
          setGaveUp(false);
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
      }
      commit(null);
      if (performance.now() - startedAt.current > TARGET_GRACE_MS) setGaveUp(true);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [step && step.id, targetSel]); // eslint-disable-line

  // For a "tap" step, listen on the real element. The player's tap runs the
  // game's own handler AND advances the tour. Capture phase so the tour still
  // advances even if the handler stops propagation or unmounts the node.
  useEffect(() => {
    if (!step || step.action !== "tap" || typeof document === "undefined") return;
    let bound = [];
    const handler = () => { onAdvance(); };
    const attach = () => {
      const found = Array.from(document.querySelectorAll(targetSel));
      // Only rebind when the set actually changed, or every interval tick would
      // detach and reattach for nothing.
      const same = found.length === bound.length && found.every((e, i) => e === bound[i]);
      if (same) return;
      bound.forEach((e) => e.removeEventListener("click", handler, true));
      bound = found;
      bound.forEach((e) => e.addEventListener("click", handler, true));
    };
    attach();
    // React can swap nodes out from under us (the review card is remounted with
    // a new key on every flip), so re-check rather than trusting what was found
    // on mount.
    const iv = setInterval(attach, 150);
    return () => {
      clearInterval(iv);
      bound.forEach((e) => e.removeEventListener("click", handler, true));
    };
  }, [step && step.id, targetSel]); // eslint-disable-line

  if (!step) return null;

  const tapToAdvance = step.action !== "tap";
  const swallow = (e) => { e.preventDefault(); e.stopPropagation(); if (tapToAdvance) onAdvance(); };

  // ---- no target: centred card, no spotlight ----
  if (!box) {
    if (!gaveUp) return null; // still looking; do not flash an empty scrim
    // A "next" step can safely dim the screen: there is nothing to reach.
    // A "tap" step must NOT, because the element it is pointing at has not
    // rendered yet and a scrim would seal the player away from the very control
    // that makes it appear. This was a hard lock at the end of the tutorial.
    if (tapToAdvance) {
      return c.jsxs("div", {
        className: "kyr-tour",
        style: { position: "fixed", inset: 0, zIndex: 200, background: "rgba(42,31,18,0.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
        onClick: swallow,
        children: [
          c.jsx(TourCard, { step, stepNumber, stepTotal, onAdvance, onBack, canBack, centred: true, tapToAdvance })
        ]
      });
    }
    return c.jsx("div", {
      className: "kyr-tour",
      style: { position: "fixed", left: 12, right: 12, bottom: 62, zIndex: 202, display: "flex", justifyContent: "center", pointerEvents: "none" },
      children: c.jsx("div", { style: { maxWidth: 360, width: "100%", pointerEvents: "auto" },
        children: c.jsx(TourCard, { step, stepNumber, stepTotal, onAdvance, onBack, canBack, centred: true, tapToAdvance }) })
    });
  }

  // ---- spotlight geometry ----
  // W and H come from the same measurement pass as the rect, so the bands can
  // never be sized against a viewport the rect was not measured in.
  const W = box.vw, H = box.vh;
  const hx = Math.max(0, box.left - PAD);
  const hy = Math.max(0, box.top - PAD);
  const hw = Math.min(W - hx, box.width + PAD * 2);
  const hh = Math.min(H - hy, box.height + PAD * 2);

  const dim = "rgba(42,31,18,0.62)";
  // Height of the always-clickable strip at the bottom of the screen where the
  // skip chip lives. No interactive overlay layer is ever painted here.
  const BAIL_STRIP = 54;
  const floor = Math.max(0, H - BAIL_STRIP);
  const band = (style) => c.jsx("div", { onClick: swallow, style: { position: "fixed", background: dim, ...style } });

  // ---- tooltip placement ----
  const BAIL_CLEAR = 62;  // room at the bottom for the persistent skip chip
  const GAP = 12;
  const cardWidth = Math.min(W - 24, 360);
  let cardLeft = box.left + box.width / 2 - cardWidth / 2;
  cardLeft = Math.max(12, Math.min(cardLeft, W - cardWidth - 12));

  // The question card must stay readable at all times. It is the content the
  // step is talking about, and a tooltip sitting on top of it is the single
  // worst thing this overlay can do. Treated as a no-go zone unless it is
  // itself part of what is being highlighted.
  let noGo = null;
  if (!targetList.includes("question") && typeof document !== "undefined") {
    const qEl = document.querySelector('[data-tour="question"]');
    if (qEl) {
      const b = qEl.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) noGo = { top: b.top, bottom: b.bottom };
    }
  }
  const hitsNoGo = (top, bottom) =>
    !!noGo && bottom > noGo.top + 4 && top < noGo.bottom - 4;

  const belowTop = hy + hh + GAP;
  const aboveTop = hy - GAP - cardH;
  const dockTop = H - BAIL_CLEAR - GAP - cardH;

  let cardStyle;
  if (belowTop + cardH <= H - BAIL_CLEAR && !hitsNoGo(belowTop, belowTop + cardH)) {
    cardStyle = { top: belowTop, left: cardLeft, width: cardWidth };
  } else if (aboveTop >= 8 && !hitsNoGo(aboveTop, aboveTop + cardH)) {
    cardStyle = { top: aboveTop, left: cardLeft, width: cardWidth };
  } else {
    // Nothing fits cleanly. Dock above the skip chip: this covers the action bar
    // for a moment, which costs nothing, and leaves the question and the answers
    // both fully visible.
    cardStyle = { top: Math.max(8, dockTop), left: cardLeft, width: cardWidth };
  }

  return c.jsxs("div", { className: "kyr-tour", children: [
    // Four dim bands. The gap between them IS the spotlight, and it is a real
    // gap: no element sits over the target, so its own click handler runs.
    band({ top: 0, left: 0, width: W, height: Math.min(hy, floor), zIndex: 200 }),
    band({ top: hy + hh, left: 0, width: W, height: Math.max(0, floor - (hy + hh)), zIndex: 200 }),
    band({ top: hy, left: 0, width: hx, height: Math.max(0, Math.min(hh, floor - hy)), zIndex: 200 }),
    band({ top: hy, left: hx + hw, width: Math.max(0, W - (hx + hw)), height: Math.max(0, Math.min(hh, floor - hy)), zIndex: 200 }),
    // The bottom strip: dimmed for looks, transparent to clicks, so the skip
    // chip underneath is always reachable.
    c.jsx("div", { "aria-hidden": true, style: { position: "fixed", top: floor, left: 0, width: W, height: BAIL_STRIP, background: dim, pointerEvents: "none", zIndex: 200 } }),

    // On a "next" step, seal the hole. The player has nothing to do here except
    // read and continue, and leaving the real control live underneath means a
    // tap can change the game's phase out from under the step that is showing.
    tapToAdvance && c.jsx("div", {
      onClick: swallow,
      style: { position: "fixed", top: hy, left: hx, width: hw, height: hh, background: "transparent", zIndex: 200 }
    }),

    // The ring. pointerEvents none so it never intercepts the tap it is
    // pointing at.
    c.jsx("div", {
      "aria-hidden": true,
      style: {
        position: "fixed", top: hy, left: hx, width: hw, height: hh,
        border: `3px solid ${u.brandBright}`, borderRadius: 12,
        boxShadow: `0 0 0 2px ${u.outline}`,
        pointerEvents: "none", zIndex: 201,
        animation: "kyr-tour-ring 1.6s ease-in-out infinite"
      }
    }),

    c.jsx("div", {
      ref: cardRef,
      style: { position: "fixed", zIndex: 202, ...cardStyle },
      children: c.jsx(TourCard, { step, stepNumber, stepTotal, onAdvance, onBack, canBack, tapToAdvance })
    })
  ] });
}

// ---------------------------------------------------------------------------
// TourBail : the one and only way out of the tutorial.
// ---------------------------------------------------------------------------
// Inline styles, deliberately. This was a CSS class, and a class is one missing
// stylesheet away from a button that renders in the document flow behind the
// dim bands: visibly there, completely dead. The escape hatch is the last thing
// that should depend on anything.
//
// z-index sits above every band (200), ring (201) and card (202) in this file.
export function TourBail({ onSkip, label }) {
  const [hover, setHover] = useState(false);
  if (typeof document === "undefined") return null;
  return createPortal(c.jsx("button", {
    onClick: onSkip,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: "fixed",
      bottom: "max(env(safe-area-inset-bottom), 10px)",
      left: "50%", transform: "translateX(-50%)",
      zIndex: 9999,
      background: hover ? u.surfaceHigh : u.surface,
      border: `2px solid ${u.outline}`, borderRadius: 8,
      padding: "8px 18px", cursor: "pointer",
      fontFamily: C.mono, fontSize: 10.5, letterSpacing: 1.4,
      fontWeight: 700, textTransform: "uppercase", color: u.textDim,
      boxShadow: U.sm, WebkitTapHighlightColor: "transparent"
    },
    children: label
  }), document.body);
}

// ---------------------------------------------------------------------------
// TourBailConfirm : "are you sure" for leaving the tutorial.
// ---------------------------------------------------------------------------
// Not ui.ConfirmModal, deliberately. That component's backdrop sits at z-index
// 90, which is below the tour's dim bands at 200, so it would render behind the
// thing it is asking about. Portaled and self-contained instead.
export function TourBailConfirm({ onConfirm, onCancel, title, body, confirmLabel, cancelLabel }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    c.jsx("div", {
      onClick: (e) => { if (e.target === e.currentTarget) onCancel(); },
      style: {
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(42,31,18,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, animation: "ts-backdrop-in 0.15s ease-out"
      },
      children: c.jsxs("div", {
        style: {
          background: u.surfaceHigh, border: `3px solid ${u.outline}`, borderRadius: 14,
          boxShadow: U.lg, padding: "26px 28px 22px", maxWidth: 420, width: "100%",
          animation: "ts-modal-in 0.18s ease-out"
        },
        children: [
          c.jsx("h3", { style: { fontFamily: C.display, fontSize: 24, letterSpacing: 0, margin: "0 0 8px", color: u.text, lineHeight: 1.15 }, children: title }),
          c.jsx("p", { style: { fontFamily: C.body, fontSize: 15, lineHeight: 1.6, color: u.textDim, fontWeight: 500, margin: "0 0 20px" }, children: body }),
          c.jsxs("div", { style: { display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }, children: [
            c.jsx("button", {
              onClick: onCancel,
              style: { fontFamily: C.display, fontSize: 13, letterSpacing: 1.4, background: u.brand, color: u.textOnDark, border: `2px solid ${u.outline}`, borderRadius: 8, padding: "10px 20px", cursor: "pointer", textTransform: "uppercase", boxShadow: U.sm, WebkitTapHighlightColor: "transparent" },
              children: cancelLabel
            }),
            c.jsx("button", {
              onClick: onConfirm,
              style: { fontFamily: C.display, fontSize: 13, letterSpacing: 1.4, background: "transparent", color: u.textDim, border: `2px solid ${u.borderLight}`, borderRadius: 8, padding: "10px 20px", cursor: "pointer", textTransform: "uppercase", WebkitTapHighlightColor: "transparent" },
              children: confirmLabel
            })
          ] })
        ]
      })
    }),
    document.body
  );
}

// ---------------------------------------------------------------------------
// TourCard : the tooltip itself.
// ---------------------------------------------------------------------------
function TourCard({ step, stepNumber, stepTotal, onAdvance, onBack, canBack, centred, tapToAdvance }) {
  return c.jsxs("div", {
    className: "kyr-tour-card",
    onClick: (e) => e.stopPropagation(),
    style: {
      background: u.surfaceHigh, border: `3px solid ${u.outline}`, borderRadius: 12,
      boxShadow: U.lg, padding: "14px 16px 12px", boxSizing: "border-box",
      maxWidth: centred ? 360 : "none", width: centred ? "100%" : "auto",
      animation: "ts-fade-in 0.25s ease-out"
    },
    children: [
      c.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }, children: [
        c.jsx("div", { style: { fontFamily: C.display, fontSize: 15, letterSpacing: 1, color: u.brand, lineHeight: 1.15 }, children: step.title }),
        stepTotal > 0 && c.jsxs("div", { style: { fontFamily: C.mono, fontSize: 9.5, letterSpacing: 1, color: u.textMuted, fontWeight: 700, flexShrink: 0 }, children: [stepNumber, "/", stepTotal] })
      ] }),
      step.body && c.jsx("p", { style: { fontFamily: C.body, fontSize: 13.5, lineHeight: 1.5, color: u.textDim, fontWeight: 500, margin: "0 0 10px" }, children: step.body }),
      c.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }, children: [
        // Back, not Skip. Skipping lives in exactly one place, the chip pinned
        // to the bottom of the screen, because two skip buttons on one screen is
        // one more than anybody needs.
        //
        // Back only reaches within the current section, and only across steps in
        // the same phase. You cannot un-answer a question, so a Back that tried
        // to cross a lock would be lying about what it can undo. Hidden rather
        // than disabled at the start of a section: a permanently greyed control
        // is just clutter.
        c.jsx("button", {
          onClick: canBack ? onBack : undefined,
          disabled: !canBack,
          style: { background: "none", border: "none", padding: "4px 2px", fontFamily: C.mono, fontSize: 10, letterSpacing: 1.4, color: u.textMuted, cursor: canBack ? "pointer" : "default", textTransform: "uppercase", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3, WebkitTapHighlightColor: "transparent", visibility: canBack ? "visible" : "hidden" },
          children: "\u2039 Back"
        }),
        // A "tap" step has no Next button on purpose: the only way forward is
        // doing the thing. A "next" step gets a button AND tap-anywhere, since
        // on a phone the button is the discoverable one and the whole dimmed
        // screen is the forgiving one.
        tapToAdvance
          ? c.jsx("button", {
              onClick: onAdvance,
              style: { fontFamily: C.display, fontSize: 12.5, letterSpacing: 1.4, background: u.brand, color: u.textOnDark, border: `2px solid ${u.outline}`, borderRadius: 8, padding: "8px 18px", cursor: "pointer", textTransform: "uppercase", boxShadow: U.sm, WebkitTapHighlightColor: "transparent" },
              children: "Got it \u203A"
            })
          : c.jsx("span", {
              style: { fontFamily: C.mono, fontSize: 10, letterSpacing: 1.4, color: u.brand, fontWeight: 700, textTransform: "uppercase" },
              children: "\u2190 Your turn"
            })
      ] })
    ]
  });
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
// Injected separately from theme.js so the tutorial can be lifted out without
// touching the main stylesheet.
const TOUR_STYLE_ID = "kyr-tour-styles";
export const TOUR_CSS = `
  @keyframes kyr-tour-ring {
    0%, 100% { box-shadow: 0 0 0 2px ${u.outline}, 0 0 0 0 rgba(214,134,24,0.55); }
    50%      { box-shadow: 0 0 0 2px ${u.outline}, 0 0 0 7px rgba(214,134,24,0); }
  }
  .kyr-tour-card { pointer-events: auto; }
  @media (max-width: 600px) {
    .kyr-tour-card { padding: 12px 13px 10px !important; }
  }
`;

export function injectTourStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(TOUR_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = TOUR_STYLE_ID;
  el.textContent = TOUR_CSS;
  document.head.appendChild(el);
}

// ---------------------------------------------------------------------------
// Step sequencing
// ---------------------------------------------------------------------------
// The engine owns which question is live; this owns which step within it.
// A step is only shown when the game is actually in that step's phase, so
// after the player taps Lock It In the tour goes quiet through the two-second
// suspense pause and reappears on the verdict.
//
// Returns null when the current step's phase has not arrived yet, which is a
// normal waiting state and not an error.
export function activeStep(tour, idx, phase) {
  if (!tour || idx >= tour.length) return null;
  const step = tour[idx];
  if (!step) return null;
  return step.phase === phase ? step : null;
}
