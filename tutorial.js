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
export function TourOverlay({ step, stepNumber, stepTotal, onAdvance, onSkip }) {
  // `box` holds the target rect AND the viewport size together, because both
  // change the geometry and both have to land in the same render.
  const [box, setBox] = useState(null);
  const [gaveUp, setGaveUp] = useState(false);
  const rafRef = useRef(null);
  const startedAt = useRef(0);
  const scrolledFor = useRef(null);
  const lastBox = useRef(null);

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

  const targetSel = step ? `[data-tour="${step.target}"]` : null;

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
      const el = document.querySelector(targetSel);
      if (el) {
        const r = el.getBoundingClientRect();
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
    let el = null;
    let attached = false;
    const handler = () => { onAdvance(); };
    const attach = () => {
      const found = document.querySelector(targetSel);
      if (found && found !== el) {
        if (el && attached) el.removeEventListener("click", handler, true);
        el = found;
        el.addEventListener("click", handler, true);
        attached = true;
      }
    };
    attach();
    // React can swap the node out from under us (the review card is remounted
    // with a new key on every flip), so re-check on an interval rather than
    // trusting the node we found on mount.
    const iv = setInterval(attach, 150);
    return () => {
      clearInterval(iv);
      if (el && attached) el.removeEventListener("click", handler, true);
    };
  }, [step && step.id, targetSel]); // eslint-disable-line

  if (!step) return null;

  const tapToAdvance = step.action !== "tap";
  const swallow = (e) => { e.preventDefault(); e.stopPropagation(); if (tapToAdvance) onAdvance(); };

  // ---- no target: centred card, no spotlight ----
  if (!box) {
    if (!gaveUp) return null; // still looking; do not flash an empty scrim
    return c.jsxs("div", {
      className: "kyr-tour",
      style: { position: "fixed", inset: 0, zIndex: 200, background: "rgba(42,31,18,0.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
      onClick: swallow,
      children: [
        c.jsx(TourCard, { step, stepNumber, stepTotal, onAdvance, onSkip, centred: true, tapToAdvance })
      ]
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
  const band = (style) => c.jsx("div", { onClick: swallow, style: { position: "fixed", background: dim, ...style } });

  // Tooltip placement: below the hole if it fits, above if not, and if neither
  // fits (a tall target on a short phone) it overlays the bottom of the screen,
  // because an unreadable tooltip is worse than one that covers something.
  const CARD_H = 168; // generous estimate; only used to choose a side
  const BAIL_CLEAR = 46; // room at the bottom for the persistent skip chip
  const spaceBelow = H - (hy + hh) - BAIL_CLEAR;
  const spaceAbove = hy;
  const place = spaceBelow >= CARD_H ? "below" : spaceAbove >= CARD_H ? "above" : "bottom";

  const cardWidth = Math.min(W - 24, 360);
  let cardLeft = box.left + box.width / 2 - cardWidth / 2;
  cardLeft = Math.max(12, Math.min(cardLeft, W - cardWidth - 12));

  const cardStyle = place === "below"
    ? { top: hy + hh + 12, left: cardLeft, width: cardWidth }
    : place === "above"
      ? { bottom: H - hy + 12, left: cardLeft, width: cardWidth }
      : { bottom: 52, left: cardLeft, width: cardWidth };

  return c.jsxs("div", { className: "kyr-tour", children: [
    // Four dim bands. The gap between them IS the spotlight, and it is a real
    // gap: no element sits over the target, so its own click handler runs.
    band({ top: 0, left: 0, width: W, height: hy, zIndex: 200 }),
    band({ top: hy + hh, left: 0, width: W, height: Math.max(0, H - (hy + hh)), zIndex: 200 }),
    band({ top: hy, left: 0, width: hx, height: hh, zIndex: 200 }),
    band({ top: hy, left: hx + hw, width: Math.max(0, W - (hx + hw)), height: hh, zIndex: 200 }),

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
      style: { position: "fixed", zIndex: 202, ...cardStyle },
      children: c.jsx(TourCard, { step, stepNumber, stepTotal, onAdvance, onSkip, tapToAdvance })
    })
  ] });
}

// ---------------------------------------------------------------------------
// TourCard : the tooltip itself.
// ---------------------------------------------------------------------------
function TourCard({ step, stepNumber, stepTotal, onAdvance, onSkip, centred, tapToAdvance }) {
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
        c.jsx("button", {
          onClick: onSkip,
          style: { background: "none", border: "none", padding: "4px 2px", fontFamily: C.mono, fontSize: 10, letterSpacing: 1.4, color: u.textMuted, cursor: "pointer", textTransform: "uppercase", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3, WebkitTapHighlightColor: "transparent" },
          children: "Skip tutorial"
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
  /* The persistent escape hatch the engine keeps on screen for the whole
     tutorial, above the overlay so it is reachable even if a step wedges. */
  .kyr-tour-bail {
    position: fixed; z-index: 210;
    bottom: max(env(safe-area-inset-bottom), 10px);
    left: 50%; transform: translateX(-50%);
    background: ${u.surface}; border: 2px solid ${u.outline}; border-radius: 8px;
    padding: 7px 16px; font-family: ${C.mono}; font-size: 10px; letter-spacing: 1.4px;
    font-weight: 700; text-transform: uppercase; color: ${u.textDim}; cursor: pointer;
    box-shadow: ${U.sm}; -webkit-tap-highlight-color: transparent;
  }
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
