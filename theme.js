// Know Your Rights · CCJT
// theme.js : the foundation every other module imports.
//
// Three jobs:
//   1. Own the React CDN import so no other file has to. Exports I / c / qc and
//      the hooks, so components import from here, not from a URL.
//   2. Hold the design tokens: u (colors), C (fonts), U (shadows).
//   3. Hold the stylesheet and inject it into <head>.
//
// This is also the file a SKIN system would swap. A skin is a different u/C/U
// and a different CSS_TEXT. Centralizing them here is what makes reskinning the
// whole game possible without touching a single component.

import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";

// ---------------------------------------------------------------------------
// React runtime
// ---------------------------------------------------------------------------
export const I = React;

// The automatic JSX runtime calls jsx(type, props, key). React.createElement
// wants key inside props, so fold it back in and spread children.
function makeEl(type, props, key) {
  const { children, ...rest } = props || {};
  if (key !== undefined) rest.key = key;
  if (Array.isArray(children)) return React.createElement(type, rest, ...children);
  if (children === undefined) return React.createElement(type, rest);
  return React.createElement(type, rest, children);
}

export const c = { jsx: makeEl, jsxs: makeEl, Fragment: React.Fragment };
export const qc = createRoot;
export const { useState, useEffect, useRef, useMemo } = React;

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
// u = colors. Warm paper palette: cream surfaces, dark ink outlines, burnt-orange brand.
export const u = {
  bg: "#f4ede0", bgWarm: "#f8f1e3", surface: "#fbf6ec", surfaceHigh: "#ffffff",
  surfaceWarm: "#f0e5cf", outline: "#2a1f12", borderLight: "#d6c9b0",
  brand: "#b36d00", brandBright: "#d68618", brandDeep: "#8a5400",
  brandSoft: "#fde9c8", brandSofter: "#faf2dd", terra: "#c64a2e", terraSoft: "#f7d8cc",
  mustard: "#d4a834", mustardSoft: "#f6e8b8", text: "#2a1f12", textDim: "#5a4a35",
  textMuted: "#8a7a60", textOnDark: "#fbf6ec", red: "#9c361e", green: "#3d7a45",
  blue: "#3a5a8c", blueBg: "#dde6f2", cardBack: "#3a2a17"
};


// C = font stacks. Archivo Black for display, Inter for body, IBM Plex Mono for labels.
export const C = {
  display: "'Archivo Black', 'Helvetica Neue', Impact, sans-serif",
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', 'Courier New', monospace"
};


// U = the hard offset shadows that give the game its stamped, printed look.
// No blur: a solid block of outline color pushed down and right.
export const U = {
  sm: `3px 3px 0 ${u.outline}`,
  md: `4px 4px 0 ${u.outline}`,
  lg: `6px 6px 0 ${u.outline}`,
  xl: `8px 8px 0 ${u.outline}`
};

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------
const STYLE_ID = "kyr-styles";
const FONT_ID = "kyr-fonts";
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=Caveat:wght@600;700&display=swap";

// Keyframes and the mobile rules. The mobile block enforces a hard product rule:
// everything fits the screen. A player never scrolls to find content or a button.
export const CSS_TEXT = `
  @keyframes ts-fade-in { from { opacity:0; transform:translateY(8px);} to {opacity:1;transform:translateY(0);} }
  @keyframes ts-slide-up { from {opacity:0;transform:translateY(20px);} to {opacity:1;transform:translateY(0);} }
  @keyframes ts-pulse-next {
    0%,100% { transform:translate(0,0); box-shadow:${U.md}; }
    50% { transform:translate(-2px,-2px); box-shadow:6px 6px 0 ${u.outline}; }
  }
  @keyframes ts-blink { 0%,49%{opacity:1;} 50%,100%{opacity:0;} }
  @keyframes ts-tension-1 { 0%,100%{background:${u.brandSoft};} 50%{background:${u.brandSofter};} }
  @keyframes ts-tension-2 { 0%,100%{background:${u.brandSoft};transform:scale(1);} 50%{background:#f8d9a8;transform:scale(1.005);} }
  @keyframes ts-tension-3 { 0%,100%{background:${u.brandSoft};transform:scale(1);} 40%{background:#f5c97a;transform:scale(1.012);} 80%{background:#fde9c8;transform:scale(1);} }
  @keyframes ts-correct-pop { 0%{transform:scale(1);} 25%{transform:scale(1.04);} 60%{transform:scale(0.99);} 100%{transform:scale(1);} }
  @keyframes ts-wrong-shake-card { 0%,100%{transform:translateX(0);} 20%{transform:translateX(-7px);} 40%{transform:translateX(7px);} 60%{transform:translateX(-4px);} 80%{transform:translateX(4px);} }
  @keyframes ts-screen-shake { 0%,100%{transform:translate(0,0);} 15%{transform:translate(-3px,2px);} 30%{transform:translate(3px,-2px);} 45%{transform:translate(-2px,-3px);} 60%{transform:translate(2px,3px);} 75%{transform:translate(-2px,1px);} 90%{transform:translate(1px,-1px);} }
  @keyframes ts-confetti-fall { 0%{transform:translateY(-20vh) rotate(0deg);opacity:1;} 100%{transform:translateY(110vh) rotate(720deg);opacity:0;} }
  @keyframes ts-ladder-light { 0%,100%{background:${u.brand};} 50%{background:${u.brandBright};} }
  @keyframes ts-flash-warm { 0%{opacity:0;} 25%{opacity:0.55;} 100%{opacity:0;} }
  @keyframes ts-flash-red { 0%{opacity:0;} 25%{opacity:0.4;} 100%{opacity:0;} }
  @keyframes ts-dot-fill { 0%{transform:scale(0);} 70%{transform:scale(1.35);} 100%{transform:scale(1);} }
  @keyframes ts-streak-pop { 0%{transform:scale(1);} 30%{transform:scale(1.28);color:${u.terra};} 100%{transform:scale(1);} }
  @keyframes ts-modal-in { from {opacity:0;transform:scale(0.94) translateY(6px);} to {opacity:1;transform:scale(1) translateY(0);} }
  @keyframes ts-backdrop-in { from {opacity:0;} to {opacity:1;} }

  /* ---- comic reveal / flip / puzzle ---- */
  @keyframes ts-card-flip-in {
    0% { transform: rotateY(-180deg); }
    100% { transform: rotateY(0deg); }
  }
  @keyframes ts-card-slide-left { 0% { opacity:0; transform: translateX(40px); } 100% { opacity:1; transform: translateX(0); } }
  @keyframes ts-card-slide-right { 0% { opacity:0; transform: translateX(-40px); } 100% { opacity:1; transform: translateX(0); } }
  @keyframes ts-token-pop { 0% { transform: translate(-50%,-50%) scale(0.3); opacity:0; } 30% { transform: translate(-50%,-50%) scale(1.3); opacity:1; } 100% { transform: translate(-50%,-50%) scale(1); opacity:1; } }
  @keyframes ts-segment-impact { 0% { transform: scale(0.4); } 55% { transform: scale(1.35); } 100% { transform: scale(1); } }
  @keyframes ts-piece-celebrate {
    0% { transform: scale(1) rotate(0deg); box-shadow: ${U.sm}; }
    30% { transform: scale(1.22) rotate(-4deg); box-shadow: 0 0 22px ${u.brand}; }
    60% { transform: scale(1.12) rotate(3deg); box-shadow: 0 0 30px ${u.brandBright}; }
    100% { transform: scale(1) rotate(0deg); box-shadow: 0 0 12px ${u.brand}; }
  }
  @keyframes ts-pow-burst {
    0% { transform: scale(0.2) rotate(-12deg); opacity: 0; }
    45% { transform: scale(1.18) rotate(3deg); opacity: 1; }
    70% { transform: scale(0.94) rotate(-2deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes ts-bubble-in { 0% { opacity:0; transform: translateY(8px) scale(0.9);} 100%{opacity:1;transform:translateY(0) scale(1);} }
  @keyframes ts-phrase-in { 0% { opacity:0; transform: scale(0.7) rotate(-3deg);} 55%{transform:scale(1.06) rotate(1deg);} 100%{opacity:1;transform:scale(1) rotate(0deg);} }
  @keyframes ts-fly-token {
    0% { transform: translate(var(--fx0), var(--fy0)) scale(1); opacity:1; }
    75% { opacity:1; }
    100% { transform: translate(var(--fx1), var(--fy1)) scale(0.5); opacity:0; }
  }
  @keyframes ts-mural-pop { 0%{transform:scale(0.3);} 60%{transform:scale(1.4);} 100%{transform:scale(1);} }

  /* verdict screen: the big stamp lands hard */
  @keyframes ts-verdict-stamp {
    0% { transform: scale(2.6) rotate(-14deg); opacity: 0; }
    40% { transform: scale(0.86) rotate(-3deg); opacity: 1; }
    58% { transform: scale(1.08) rotate(-2deg); }
    100% { transform: scale(1) rotate(-2deg); opacity: 1; }
  }
  @keyframes ts-verdict-ring {
    0% { transform: scale(0.2); opacity: 0.9; }
    100% { transform: scale(2.4); opacity: 0; }
  }
  @keyframes ts-verdict-detail-in { 0% { opacity:0; transform: translateY(14px);} 100%{opacity:1;transform:translateY(0);} }

  /* the big flying token that arcs from the card up to the puzzle piece */
  @keyframes ts-bigtoken {
    0%   { offset-distance: 0%;   transform: scale(0.6); opacity: 0; }
    12%  { opacity: 1; transform: scale(1.25); }
    82%  { opacity: 1; transform: scale(1.1); }
    100% { offset-distance: 100%; transform: scale(0.4); opacity: 0; }
  }
  /* fallback arc for browsers without offset-path: straight rise + fade with a pop */
  @keyframes ts-bigtoken-fallback {
    0%   { transform: translate(-50%, 20px) scale(0.6); opacity: 0; }
    15%  { transform: translate(-50%, 0px) scale(1.3); opacity: 1; }
    100% { transform: translate(-50%, -120px) scale(0.5); opacity: 0; }
  }
  /* heavier segment landing */
  @keyframes ts-segment-slam {
    0% { transform: scale(0); }
    40% { transform: scale(1.6); }
    62% { transform: scale(0.82); }
    100% { transform: scale(1); }
  }
  @keyframes ts-piece-shockwave {
    0% { transform: scale(0.6); opacity: 0.7; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  /* end-of-game mural assembly: each tile drops into place */
  @keyframes ts-tile-drop {
    0% { transform: translateY(-40px) scale(0.5) rotate(-8deg); opacity: 0; }
    60% { transform: translateY(4px) scale(1.08) rotate(2deg); opacity: 1; }
    100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes ts-mural-finish-glow {
    0%,100% { box-shadow: 0 0 0 ${u.brand}; }
    50% { box-shadow: 0 0 40px ${u.brandBright}; }
  }
  /* dwell-timer sweep on the Next affordance */
  @keyframes ts-dwell-fill { 0% { width: 0%; } 100% { width: 100%; } }

  /* big +1 POINT burst when a card's read timer completes */
  @keyframes ts-point-burst {
    0%   { transform: translate(-50%, -50%) scale(0.3) rotate(-8deg); opacity: 0; }
    25%  { transform: translate(-50%, -50%) scale(1.25) rotate(3deg); opacity: 1; }
    45%  { transform: translate(-50%, -50%) scale(1.0) rotate(-1deg); opacity: 1; }
    75%  { transform: translate(-50%, -85%) scale(1.0); opacity: 1; }
    100% { transform: translate(-50%, -150%) scale(0.85); opacity: 0; }
  }
  @keyframes ts-pip-pop {
    0% { transform: scale(0.2); }
    55% { transform: scale(1.5); }
    100% { transform: scale(1); }
  }
  @keyframes ts-points-banner-flash {
    0%,100% { background: ${u.brandSofter}; }
    50% { background: ${u.brandSoft}; }
  }

  /* Halftone dot texture used behind comic panels */
  .ts-halftone {
    background-image: radial-gradient(${u.borderLight} 1.4px, transparent 1.5px);
    background-size: 10px 10px;
  }

  /* ---- mobile ( <600px ) ---- */
  @media (max-width: 600px) {
    .ts-game-screen { padding:8px 10px 10px !important; gap:8px !important; height:100vh !important; height:100dvh !important; min-height:100vh !important; min-height:100dvh !important; max-height:100vh !important; max-height:100dvh !important; box-sizing:border-box !important; overflow:hidden !important; }
    .ts-game-main { gap:8px !important; flex:1 !important; min-height:0 !important; }
    .ts-answer-grid { grid-template-columns:1fr !important; gap:8px !important; }
    .ts-answer-btn { min-height:50px !important; padding:11px 14px !important; font-size:14.5px !important; }
    .ts-answer-btn-letter { width:30px !important; height:30px !important; min-width:30px !important; font-size:15px !important; }
    .ts-question-card { padding:16px 18px !important; }
    .ts-question-card p { font-size:16px !important; }
    .ts-hud { padding:8px 14px !important; min-width:0 !important; }
    .ts-hud-worth { font-size:22px !important; }
    .ts-progress-dots { gap:3px !important; }
    .ts-q-header { font-size:18px !important; }
    .ts-q-header-total { font-size:12px !important; }
    .ts-sound-btn { padding:6px 10px !important; font-size:10px !important; }
    .ts-walk-screen { padding:12px 14px !important; height:100vh !important; height:100dvh !important; max-height:100dvh !important; overflow:hidden !important; box-sizing:border-box !important; }
    .ts-walk-card { padding:26px 22px 24px !important; min-height:0 !important; max-height:calc(100dvh - 70px) !important; overflow:hidden !important; }
    .ts-walk-title { font-size:30px !important; }
    .ts-walk-answer-mini { grid-template-columns:1fr !important; max-width:220px !important; }
    .ts-walk-ladder-mini > div { min-width:160px !important; padding:7px 14px !important; gap:10px !important; }
    .ts-modal-card { padding:22px 22px 20px !important; max-width:100% !important; }
    .ts-modal-card h3 { font-size:22px !important; }
    .ts-shop-panel { padding:16px 16px 14px !important; max-height:92dvh !important; }
    .ts-shop-panel p { font-size:12px !important; margin-bottom:10px !important; }
    .ts-end-screen { padding:40px 18px 60px !important; }
    .ts-end-headline { font-size:64px !important; }
    .ts-end-prize { padding:22px 20px !important; min-width:0 !important; width:100% !important; max-width:300px !important; box-sizing:border-box !important; }
    .ts-end-prize-amount { font-size:56px !important; }
    .ts-end-actions { flex-direction:column !important; align-items:stretch !important; width:100% !important; max-width:280px !important; }
    .ts-end-actions button { width:100% !important; }
    .ts-missed-card { padding:20px 20px !important; }
    .ts-start-screen { padding:40px 20px !important; }
    .ts-start-title { font-size:56px !important; text-shadow:4px 4px 0 ${u.brand} !important; }
    .ts-lifelines-row { gap:6px !important; flex-wrap:wrap !important; }
    .ts-lifeline-btn { min-width:64px !important; padding:8px 12px !important; font-size:14px !important; }
    .ts-action-bar { gap:10px !important; }
    .ts-action-bar-right { width:100% !important; justify-content:stretch !important; }
    .ts-action-bar-right button { flex:1 !important; width:100% !important; }
    .ts-top-bar { gap:8px !important; }
    /* comic reveal mobile */
    .ts-reveal-screen { padding:10px 12px 10px !important; height:100vh !important; height:100dvh !important; }
    .ts-comic-card { min-height:0 !important; }
    .ts-comic-header { font-size:26px !important; padding:12px 16px !important; }
    .ts-comic-body { padding:16px 16px !important; font-size:14px !important; }
    .ts-scenario-panels { grid-template-columns:1fr !important; }
    .ts-scenario-outcomes { grid-template-columns:1fr !important; }
    .ts-phrase-quote { font-size:26px !important; }
    .ts-pow { font-size:44px !important; }
  }
  @media (max-width: 380px) {
    .ts-start-title { font-size:48px !important; }
    .ts-end-headline { font-size:54px !important; }
    .ts-end-prize-amount { font-size:46px !important; }
    .ts-walk-title { font-size:30px !important; }
    .ts-lifeline-btn { min-width:58px !important; padding:7px 9px !important; font-size:13px !important; }
    .ts-answer-btn { min-height:46px !important; padding:10px 12px !important; }
    .ts-question-card { padding:14px 16px !important; }
    .ts-comic-header { font-size:22px !important; }
    .ts-phrase-quote { font-size:22px !important; }
  }
  @media (max-width: 920px) {
    .ts-ladder { display:none !important; }
    .ts-game-layout { flex-direction:column !important; }
  }
`;


// Injects the font link and style block. Safe to call repeatedly.
export function injectStyles() {
  if (typeof document === "undefined") return;
  if (!document.getElementById(FONT_ID)) {
    const link = document.createElement("link");
    link.id = FONT_ID;
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS_TEXT;
    document.head.appendChild(style);
  }
}
