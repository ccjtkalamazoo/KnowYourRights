// Know Your Rights · CCJT
// ui.js : the shared component kit.
//
// Everything here is presentational and reusable: no game logic, no knowledge of
// questions or the ladder. The engine (and later the map) both build on these.
//
// Design note: the look is "printed paper." Hard 2-3px ink outlines, no blur, and
// solid offset shadows (U.sm/md/lg) that make elements feel stamped onto the page.
// Buttons physically press: they slide INTO their shadow on click.

import { c, u, C, U, useState, useMemo } from "./theme.js";

// ---------------------------------------------------------------------------
// Shell : the page frame every screen sits inside.
// ---------------------------------------------------------------------------
// Owns the warm background wash, the two soft corner glows, the full-screen
// flash on a right/wrong answer, and the mute toggle. screenShake is applied to
// the whole subtree when an answer is wrong.
export function Shell({ children, muted, setMuted, screenFlash, screenShake, hideSoundButton }) {
  return c.jsxs("div", {
    style: { fontFamily: C.body, minHeight: "100vh", width: "100%", background: `radial-gradient(ellipse at 50% -10%, ${u.bgWarm} 0%, ${u.bg} 70%)`, color: u.text, position: "relative", overflow: "hidden", fontSize: 16 },
    children: [
      c.jsx("div", { "aria-hidden": true, style: { position: "absolute", top: "60%", left: "-10%", width: "40%", height: "40%", background: `radial-gradient(ellipse, ${u.brandSofter} 0%, transparent 70%)`, filter: "blur(60px)", pointerEvents: "none" } }),
      c.jsx("div", { "aria-hidden": true, style: { position: "absolute", top: "50%", right: "-10%", width: "40%", height: "40%", background: "radial-gradient(ellipse, #f7e0d8 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none" } }),
      screenFlash && c.jsx("div", { "aria-hidden": true, style: { position: "fixed", inset: 0, background: screenFlash === "warm" ? "#fde9c8" : "#f7d8cc", opacity: 0, pointerEvents: "none", zIndex: 100, animation: `${screenFlash === "warm" ? "ts-flash-warm" : "ts-flash-red"} 0.6s ease-out forwards` } }),
      !hideSoundButton && c.jsx("button", {
        onClick: () => setMuted((m) => !m), "aria-label": muted ? "Unmute sound" : "Mute sound",
        style: { position: "absolute", top: 18, right: 18, zIndex: 60, background: muted ? "transparent" : u.surface, border: `2px solid ${u.outline}`, color: muted ? u.textMuted : u.text, padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontFamily: C.mono, fontSize: 11, letterSpacing: 1.5, fontWeight: 700, boxShadow: muted ? "none" : U.sm },
        children: muted ? "\u266A OFF" : "\u266A ON"
      }),
      c.jsx("div", { style: { position: "relative", zIndex: 1, animation: screenShake ? "ts-screen-shake 0.5s" : "none" }, children })
    ]
  });
}

// Inlined Lucide icons (MIT licensed) so lifelines get clean line-icons with no
// added dependency. Each icon is a list of [tag, attrs] describing the real

// ---------------------------------------------------------------------------
// LifeIcon : inlined Lucide icons (MIT) for the five lifelines.
// ---------------------------------------------------------------------------
// These are the real Lucide paths, pasted as data rather than imported. That
// keeps the dependency list at exactly one (React) and means the icons cannot
// break from a CDN outage.
export const LIFE_ICONS = {
  // fifty (50/50): two split panels ("columns-2")
  fifty: [["rect", { x: 3, y: 3, width: 18, height: 18, rx: 2 }], ["line", { x1: 12, y1: 3, x2: 12, y2: 21 }]],
  // poll (JURY): a group of people ("users")
  poll: [["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }], ["circle", { cx: 9, cy: 7, r: 4 }], ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }], ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75" }]],
  // hint (COUNSEL): a lightbulb
  hint: [["path", { d: "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" }], ["path", { d: "M9 18h6" }], ["path", { d: "M10 22h4" }]],
  // shield (SHIELD): a shield with a check
  shield: [["path", { d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" }], ["path", { d: "m9 12 2 2 4-4" }]],
  // skip (SKIP): skip-forward
  skip: [["polygon", { points: "5 4 15 12 5 20 5 4" }], ["line", { x1: 19, y1: 5, x2: 19, y2: 19 }]],
};
export function LifeIcon({ name, size = 22, color = "currentColor" }) {
  const spec = LIFE_ICONS[name] || [];
  return c.jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
    children: spec.map(([tag, attrs], i) => c.jsx(tag, { ...attrs }, i)) });
}

// ---------------------------------------------------------------------------
// Button : the press-into-shadow button used everywhere.
// ---------------------------------------------------------------------------
// Five variants (primary/secondary/accent/danger/ghost), three sizes.
// The shadow shrinks and the button translates as it is pressed, so it reads as
// a physical key going down.
export function Button({ onClick, children, variant = "primary", size = "md", disabled, style, ...rest }) {
  const [pressed, setPressed] = useState(false);
  const [hover, setHover] = useState(false);
  const pal = {
    primary: { bg: u.brand, color: u.textOnDark, border: u.outline },
    secondary: { bg: u.surface, color: u.text, border: u.outline },
    accent: { bg: u.terra, color: u.textOnDark, border: u.outline },
    danger: { bg: u.red, color: u.textOnDark, border: u.outline },
    ghost: { bg: "transparent", color: u.text, border: u.outline }
  }[variant] || { bg: u.brand, color: u.textOnDark, border: u.outline };
  const sz = {
    sm: { padding: "8px 14px", fontSize: 13, shadow: U.sm, shadowHover: "2px 2px 0 " + u.outline },
    md: { padding: "12px 24px", fontSize: 16, shadow: U.md, shadowHover: "3px 3px 0 " + u.outline },
    lg: { padding: "18px 50px", fontSize: 30, shadow: U.xl, shadowHover: "5px 5px 0 " + u.outline }
  }[size];
  let shadow = sz.shadow, transform = "translate(0, 0)";
  if (disabled) { shadow = "none"; transform = "translate(0, 0)"; }
  else if (pressed) { shadow = "none"; transform = `translate(${size === "lg" ? "8px" : size === "md" ? "4px" : "3px"}, ${size === "lg" ? "8px" : size === "md" ? "4px" : "3px"})`; }
  else if (hover) { shadow = sz.shadowHover; transform = `translate(${size === "lg" ? "3px" : "1px"}, ${size === "lg" ? "3px" : "1px"})`; }
  return c.jsx("button", {
    onClick, disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => { setHover(false); setPressed(false); },
    onMouseDown: () => setPressed(true),
    onMouseUp: () => setPressed(false),
    style: { fontFamily: C.display, fontSize: sz.fontSize, letterSpacing: size === "lg" ? 3 : 1.5, padding: sz.padding, background: disabled ? u.surfaceWarm : pal.bg, color: disabled ? u.textMuted : pal.color, border: `2px solid ${pal.border}`, borderRadius: size === "lg" ? 12 : 8, cursor: disabled ? "not-allowed" : "pointer", textTransform: "uppercase", boxShadow: shadow, transform, transition: "transform 0.08s, box-shadow 0.08s", opacity: disabled ? 0.55 : 1, ...style },
    ...rest,
    children
  });
}

// ---------------------------------------------------------------------------
// Backdrop + ConfirmModal : every dialog in the game.
// ---------------------------------------------------------------------------
export function Backdrop({ children }) {
  return c.jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(42, 31, 18, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 24, animation: "ts-backdrop-in 0.15s ease-out" }, children });
}

export function ConfirmModal({ title, body, primaryLabel, secondaryLabel, primaryVariant = "primary", onPrimary, onSecondary, header }) {
  return c.jsx(Backdrop, { children: c.jsxs("div", {
    className: "ts-modal-card",
    style: { background: u.surfaceHigh, border: `2px solid ${u.outline}`, borderRadius: 14, boxShadow: U.lg, padding: "28px 32px 26px", maxWidth: 460, width: "100%", animation: "ts-modal-in 0.18s ease-out" },
    children: [
      header,
      c.jsx("h3", { style: { fontFamily: C.display, fontSize: 26, letterSpacing: 0, margin: header ? "10px 0 8px" : "0 0 8px", color: u.text, lineHeight: 1.15 }, children: title }),
      body && c.jsx("p", { style: { fontFamily: C.body, fontSize: 15, lineHeight: 1.65, color: u.textDim, fontWeight: 500, margin: "0 0 22px" }, children: body }),
      c.jsxs("div", { style: { display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }, children: [
        c.jsx(Button, { variant: "ghost", size: "sm", onClick: onSecondary, style: { fontSize: 14 }, children: secondaryLabel }),
        c.jsx(Button, { variant: primaryVariant, size: "sm", onClick: onPrimary, style: { fontSize: 14 }, children: primaryLabel })
      ] })
    ]
  }) });
}

// ---------------------------------------------------------------------------
// Confetti : celebration particles.
// ---------------------------------------------------------------------------
// Intensity scales with the stakes: a Q2 win gets a sprinkle, a Q15 win gets a
// downpour. Generated once via useMemo so the pieces don't re-randomize on every
// re-render mid-fall.
export function Confetti({ intensity = "med" }) {
  const count = { low: 35, med: 65, high: 115 }[intensity];
  const bits = useMemo(() => Array.from({ length: count }).map((o, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.5, duration: 2.2 + Math.random() * 2.4,
    color: [u.brand, u.brandBright, u.terra, u.mustard, u.brandDeep, u.green][i % 6],
    size: 5 + Math.random() * 9, rot: Math.random() * 360
  })), [count]);
  return c.jsx("div", { "aria-hidden": true, style: { position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 50 }, children: bits.map((o, i) => c.jsx("span", { style: { position: "absolute", left: o.left + "%", top: -20, width: o.size, height: o.size * 0.45, background: o.color, border: `1px solid ${u.outline}`, transform: `rotate(${o.rot}deg)`, animation: `ts-confetti-fall ${o.duration}s ease-in ${o.delay}s forwards` } }, i)) });
}
