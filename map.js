// Know Your Rights · CCJT
// map.js : the district map.
//
// ---------------------------------------------------------------------------
// WHAT THIS IS FOR
// ---------------------------------------------------------------------------
// The map is not decoration and it is not a level-select screen. It is the
// curriculum's structure made visible: districts trace the arc a person actually
// moves through in the justice system, and being able to see the whole thing is
// itself part of what the game teaches.
//
// It also solves a real product problem. Because there is no saved progress, the
// map is what makes a fresh session fine: you can walk to any district you have
// not played, in any order, so nothing is ever lost and nothing is ever a
// forced replay.
//
// ---------------------------------------------------------------------------
// THE LAYOUT: TWO SHELVES AND A SIDE COLUMN (chosen 2026-09-17)
// ---------------------------------------------------------------------------
// The old map put the event demo in a huge banner at the top and every district
// in one grid, so the one district that was actually playable looked like the
// seven that were not. The page is now split by what a player can DO:
//
//   READY TO PLAY   Districts that are live with at least one live chapter.
//                   One of them: a single wide card that also lists its
//                   chapter names. Two or more: two-per-row cards with just a
//                   name, progress bar and button, so a 7-chapter district fits
//                   as easily as a 2-chapter one. One card at a time carries UP
//                   NEXT (the first ready district, in map order, with a live
//                   chapter not yet cleared). A fully cleared one shows DONE.
//   COMING SOON     Small muted tiles, not clickable. The shelf shrinks as
//                   districts go live and disappears once none are left.
//   SIDE COLUMN     How to play, and a small event demo box. The demo is still
//                   reachable but no longer the loudest thing on the page.
//
// The chapters-cleared counter counts live chapters only. Counting chapters
// that do not exist yet made every new player start at 0 of 45.
//
// Picking a district opens district.js, a whole screen with room for what the
// topic covers, the legal notice, and the chapters in order. This file's only
// job is choosing a district.
//
// ---------------------------------------------------------------------------
// THE RULES THE CONTENT IS BEING WRITTEN AGAINST
// ---------------------------------------------------------------------------
//   * 30 questions in a chapter's bank, 15 dealt per quiz. The demo deals 5.
//   * Chapters are SEQUENTIAL inside a district: chapter 1 is meant to come
//     first. That order is shown rather than enforced (see district.js), but it
//     is still a content constraint: a chapter may rely on everything before it
//     and must assume nothing after it.
//   * Three lives per round. A miss costs one and the round continues.
//
// COURTROOM is the first district written against the remapped curriculum. The
// original eight below it predate that remap and are being reworked.
//
// TO PUT A CHAPTER LIVE, nothing in this file changes:
//   1. Write content/<district>/NN-<slug>.json against the schema.
//   2. Get it attorney reviewed and fill in reviewedBy / reviewedAt.
//   3. Set that chapter's "live": true in the district's meta.json, and the
//      district's own "live": true once you want it reachable.
// The map reads all of that at runtime, and the district moves shelves on its own.

import { c, u, C, U, useState, useEffect } from "./theme.js";
import { Button } from "./ui.js";
import { chapterStats } from "./state.js";
import { loadDistricts } from "./content.js";
import { R } from "./copy.js";

// ---------------------------------------------------------------------------
// Icon palette
// ---------------------------------------------------------------------------
// The district icons are small two-colour scenes, not single-stroke glyphs.
// They use the game's own tokens so a skin swap in theme.js carries through.
// GSOFT is the pale disc each scene sits on; GBRIGHT is the one element the eye
// should land on (the lit thing, the gold thing); PAPER is everything else.
const INK = u.outline;
const PAPER = u.surface;
const GSOFT = u.mustardSoft;
const GBRIGHT = u.brandBright;
const GOLD = u.brand;
const TERRA = u.terra;

export const ICONS = {
  juvenile: () => [
    c.jsx("circle", { cx: 50, cy: 48, r: 38, fill: GSOFT }, 0),
    c.jsx("path", { d: "M36,30 C30,42 28,56 30,70", fill: "none", stroke: INK, strokeWidth: 4.5, strokeLinecap: "round" }, 1),
    c.jsx("path", { d: "M64,30 C70,42 72,56 70,70", fill: "none", stroke: INK, strokeWidth: 4.5, strokeLinecap: "round" }, 2),
    c.jsx("path", { d: "M26,44 C26,30 36,22 50,22 C64,22 74,30 74,44 L74,76 C74,82 70,86 64,86 L36,86 C30,86 26,82 26,76 Z", fill: GBRIGHT, stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round" }, 3),
    c.jsx("path", { d: "M26,48 C26,34 36,26 50,26 C64,26 74,34 74,48 Z", fill: PAPER, stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round" }, 4),
    c.jsx("rect", { x: 44, y: 44, width: 12, height: 10, rx: 2, fill: PAPER, stroke: INK, strokeWidth: 3.6 }, 5),
    c.jsx("path", { d: "M34,62 L66,62 L66,76 C66,79 64,80 62,80 L38,80 C36,80 34,79 34,76 Z", fill: PAPER, stroke: INK, strokeWidth: 4, strokeLinejoin: "round" }, 6),
    c.jsx("path", { d: "M42,22 C42,16 58,16 58,22", fill: "none", stroke: INK, strokeWidth: 4 }, 7)
  ],
  stop: () => [
    c.jsx("circle", { cx: 50, cy: 46, r: 37, fill: GSOFT }, 0),
    c.jsx("path", { d: "M6,74 L94,74", fill: "none", stroke: INK, strokeWidth: 4.5, strokeLinecap: "round", strokeLinejoin: "round" }, 1),
    c.jsx("path", { d: "M10,66 L10,52 C10,48 14,46 20,46 L26,34 C28,30 32,28 38,28 L64,28 C70,28 74,30 76,34 L82,46 C88,46 90,48 90,52 L90,66 Z", fill: PAPER, stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round" }, 2),
    c.jsx("path", { d: "M32,46 L36,34 L48,34 L48,46 Z", fill: GSOFT, stroke: INK, strokeWidth: 3.4, strokeLinejoin: "round" }, 3),
    c.jsx("path", { d: "M54,46 L54,34 L64,34 L70,46 Z", fill: GSOFT, stroke: INK, strokeWidth: 3.4, strokeLinejoin: "round" }, 4),
    c.jsx("rect", { x: 38, y: 18, width: 24, height: 10, rx: 3, fill: PAPER, stroke: INK, strokeWidth: 3.6 }, 5),
    c.jsx("rect", { x: 40, y: 20, width: 9, height: 6, rx: 2, fill: TERRA }, 6),
    c.jsx("rect", { x: 51, y: 20, width: 9, height: 6, rx: 2, fill: GBRIGHT }, 7),
    c.jsx("circle", { cx: 28, cy: 66, r: 10, fill: PAPER, stroke: INK, strokeWidth: 4.5 }, 8),
    c.jsx("circle", { cx: 72, cy: 66, r: 10, fill: PAPER, stroke: INK, strokeWidth: 4.5 }, 9),
    c.jsx("circle", { cx: 28, cy: 66, r: 3, fill: INK }, 10),
    c.jsx("circle", { cx: 72, cy: 66, r: 3, fill: INK }, 11)
  ],
  arrest: () => [
    c.jsx("circle", { cx: 50, cy: 48, r: 38, fill: GSOFT }, 0),
    c.jsx("ellipse", { cx: 27, cy: 52, rx: 19, ry: 21, fill: GBRIGHT, stroke: INK, strokeWidth: 5 }, 1),
    c.jsx("ellipse", { cx: 27, cy: 52, rx: 9, ry: 11, fill: PAPER, stroke: INK, strokeWidth: 4 }, 2),
    c.jsx("ellipse", { cx: 73, cy: 52, rx: 19, ry: 21, fill: GBRIGHT, stroke: INK, strokeWidth: 5 }, 3),
    c.jsx("ellipse", { cx: 73, cy: 52, rx: 9, ry: 11, fill: PAPER, stroke: INK, strokeWidth: 4 }, 4),
    c.jsx("circle", { cx: 43, cy: 52, r: 5, fill: "none", stroke: INK, strokeWidth: 4 }, 5),
    c.jsx("circle", { cx: 57, cy: 52, r: 5, fill: "none", stroke: INK, strokeWidth: 4 }, 6),
    c.jsx("path", { d: "M20,31 C24,25 34,25 38,31", fill: "none", stroke: INK, strokeWidth: 4.5, strokeLinecap: "round" }, 7),
    c.jsx("path", { d: "M62,31 C66,25 76,25 80,31", fill: "none", stroke: INK, strokeWidth: 4.5, strokeLinecap: "round" }, 8)
  ],
  saying: () => [
    c.jsx("circle", { cx: 50, cy: 48, r: 38, fill: GSOFT }, 0),
    c.jsx("path", { d: "M10,18 L58,18 L58,48 L34,48 L22,60 L22,48 L10,48 Z", fill: PAPER, stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round" }, 1),
    c.jsx("path", { d: "M20,28 L48,28 M20,38 L38,38", fill: "none", stroke: INK, strokeWidth: 3.2, strokeLinecap: "round", strokeLinejoin: "round" }, 2),
    c.jsx("path", { d: "M44,44 L92,44 L92,74 L60,74 L50,86 L50,74 L44,74 Z", fill: GBRIGHT, stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round" }, 3),
    c.jsx("path", { d: "M56,54 L82,54 M56,64 L74,64", stroke: PAPER, strokeWidth: 3.4, strokeLinecap: "round" }, 4)
  ],
  bystander: () => [
    c.jsx("circle", { cx: 50, cy: 46, r: 37, fill: GSOFT }, 0),
    c.jsx("circle", { cx: 32, cy: 26, r: 6, fill: GOLD, opacity: 0.5 }, 1),
    c.jsx("path", { d: "M24,50 C24,38 27,32 32,32 C37,32 40,38 40,50 Z", fill: GOLD, opacity: 0.5 }, 2),
    c.jsx("circle", { cx: 52, cy: 26, r: 6, fill: GOLD, opacity: 0.5 }, 3),
    c.jsx("path", { d: "M44,50 C44,38 47,32 52,32 C57,32 60,38 60,50 Z", fill: GOLD, opacity: 0.5 }, 4),
    c.jsx("circle", { cx: 34, cy: 52, r: 11, fill: PAPER, stroke: INK, strokeWidth: 4.5 }, 5),
    c.jsx("path", { d: "M18,88 C18,72 25,64 34,64 C43,64 50,72 50,88 Z", fill: PAPER, stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round" }, 6),
    c.jsx("rect", { x: 60, y: 44, width: 20, height: 30, rx: 4, fill: GBRIGHT, stroke: INK, strokeWidth: 4 }, 7),
    c.jsx("path", { d: "M50,72 L60,64", fill: "none", stroke: INK, strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round" }, 8)
  ],
  jail: () => [
    c.jsx("rect", { x: 12, y: 12, width: 76, height: 76, rx: 4, fill: GSOFT }, 0),
    c.jsx("rect", { x: 18, y: 16, width: 64, height: 68, fill: GBRIGHT, stroke: INK, strokeWidth: 4.5 }, 1),
    c.jsx("path", { d: "M31,16 L31,84 M44,16 L44,84 M57,16 L57,84 M70,16 L70,84", stroke: INK, strokeWidth: 5 }, 2),
    c.jsx("path", { d: "M18,28 L82,28 M18,72 L82,72", stroke: INK, strokeWidth: 5 }, 3),
    c.jsx("rect", { x: 18, y: 16, width: 64, height: 68, fill: "none", stroke: INK, strokeWidth: 5 }, 4),
    c.jsx("path", { d: "M8,88 L92,88", fill: "none", stroke: INK, strokeWidth: 4.5, strokeLinecap: "round", strokeLinejoin: "round" }, 5)
  ],
  court: () => [
    c.jsx("circle", { cx: 50, cy: 44, r: 38, fill: GSOFT }, 0),
    c.jsx("path", { d: "M8,84 L92,84 M14,76 L86,76 M20,68 L80,68", fill: "none", stroke: INK, strokeWidth: 4.5, strokeLinecap: "round", strokeLinejoin: "round" }, 1),
    c.jsx("path", { d: "M30,68 L30,36 M50,68 L50,36 M70,68 L70,36", fill: "none", stroke: INK, strokeWidth: 4.5, strokeLinecap: "round", strokeLinejoin: "round" }, 2),
    c.jsx("path", { d: "M18,36 L82,36 L50,14 Z", fill: GBRIGHT, stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round" }, 3)
  ],
  after: () => [
    c.jsx("circle", { cx: 50, cy: 46, r: 37, fill: GSOFT }, 0),
    c.jsx("circle", { cx: 66, cy: 32, r: 19, fill: GBRIGHT, stroke: INK, strokeWidth: 4 }, 1),
    c.jsx("path", { d: "M66,22 L66,32 L74,36", stroke: INK, strokeWidth: 4, strokeLinecap: "round", fill: "none" }, 2),
    c.jsx("path", { d: "M18,84 L64,84 L64,44 L46,44 L18,52 Z", fill: PAPER, stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round" }, 3),
    c.jsx("path", { d: "M24,74 L56,74 M24,64 L56,64", fill: "none", stroke: INK, strokeWidth: 3.2, strokeLinecap: "round", strokeLinejoin: "round" }, 4),
    c.jsx("path", { d: "M14,88 L86,88", fill: "none", stroke: INK, strokeWidth: 4.5, strokeLinecap: "round", strokeLinejoin: "round" }, 5)
  ],
  allrights: () => [
    c.jsx("circle", { cx: 50, cy: 48, r: 38, fill: GSOFT }, 0),
    c.jsx("path", { d: "M50,14 L80,26 L80,52 C80,70 66,82 50,86 C34,82 20,70 20,52 L20,26 Z", fill: GBRIGHT, stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round" }, 1),
    c.jsx("path", { d: "M37,50 L46,60 L64,38", fill: "none", stroke: PAPER, strokeWidth: 6, strokeLinecap: "round", strokeLinejoin: "round" }, 2)
  ]

};


// ---------------------------------------------------------------------------
// Districts come from content/, not from this file.
// ---------------------------------------------------------------------------
// Names, blurbs, and chapter lists live in content/<district>/meta.json so that
// adding a ninth district is adding a folder, not editing a component. What
// stays here is the artwork: an icon is a component, and components do not
// belong in JSON. ICON_FOR joins the two by district id.
const ICON_FOR = {
  juvenile: ICONS.juvenile,
  stop: ICONS.stop,
  arrest: ICONS.arrest,
  saying: ICONS.saying,
  bystander: ICONS.bystander,
  jail: ICONS.jail,
  court: ICONS.court,
  after: ICONS.after,
};

// Palette for the three states a chapter segment can show. LOCKED is gone from
// this list: chapters are not locked anywhere in the product, so a grey "you
// cannot go there" segment would describe a rule that does not exist.
function segmentColors(state) {
  switch (state) {
    case "cleared":  return { fill: u.brand,       border: u.outline };
    case "tried":    return { fill: u.mustard,     border: u.outline };
    case "next":     return { fill: u.surface,     border: u.brand };
    default:         return { fill: u.surfaceWarm, border: u.borderLight }; // not started
  }
}

// ---------------------------------------------------------------------------
// ChapterBar : the row of segments under a district name, one per chapter.
// ---------------------------------------------------------------------------
// Reads real session stats now. A segment is gold when that chapter was
// cleared, mustard when it was tried without clearing, outlined when it is the
// one to start next, and pale when it has not been touched.
function ChapterBar({ district, session }) {
  const nextIdx = district.chapters.findIndex(
    (ch) => ch.live && !chapterStats(session, ch.id).cleared
  );
  return c.jsx("div", {
    style: { display: "flex", gap: 3, marginTop: 10 },
    children: district.chapters.map((ch, i) => {
      const s = chapterStats(session, ch.id);
      const state = s.cleared ? "cleared"
        : s.attempts > 0 ? "tried"
        : i === nextIdx ? "next"
        : "none";
      const col = segmentColors(state);
      return c.jsx("span", {
        style: {
          flex: 1, height: 10, borderRadius: 2,
          background: col.fill, border: `2px solid ${col.border}`
        }
      }, ch.id);
    })
  });
}

// ---------------------------------------------------------------------------
// Legend : what the segment colours mean.
// ---------------------------------------------------------------------------
// LOCKED came off this list with the lock itself. What is left describes states
// a player can actually be in.
function Legend() {
  const items = [
    ["CLEARED", u.brand, u.outline],
    ["TRIED", u.mustard, u.outline],
    ["NEXT UP", u.surface, u.brand],
    ["NOT STARTED", u.surfaceWarm, u.borderLight]
  ];
  return c.jsx("div", {
    style: {
      display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap",
      fontFamily: C.mono, fontSize: 9, letterSpacing: 1.3, color: u.textMuted
    },
    children: items.map(([label, fill, border]) => c.jsxs("span", {
      style: { display: "inline-flex", alignItems: "center", gap: 6 },
      children: [
        c.jsx("span", {
          style: {
            width: 10, height: 10, borderRadius: 2,
            background: fill, border: `2px solid ${border}`
          }
        }),
        label
      ]
    }, label))
  });
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// A district is ready when its own live flag is on AND at least one chapter is
// live. That is the same rule content.js uses to decide it is playable, so the
// shelf a card sits on always matches whether it can actually be played.
function isReady(d) {
  return !!d.live && d.chapters.some((ch) => ch.live);
}

// Progress over LIVE chapters only. A district is done when every live chapter
// is cleared; chapters still being written cannot hold that back or count
// toward it.
function liveProgress(session, d) {
  const live = d.chapters.filter((ch) => ch.live);
  const cleared = live.filter((ch) => chapterStats(session, ch.id).cleared).length;
  const touched = live.some((ch) => chapterStats(session, ch.id).attempts > 0);
  return { live: live.length, cleared, touched, done: live.length > 0 && cleared >= live.length };
}

function chapterName(ch) {
  return ch.name || ch.title || ch.id;
}

// Small mono label used above each shelf.
function ShelfLabel({ children, quiet = false }) {
  return c.jsxs("div", {
    style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 },
    children: [
      c.jsx("span", {
        style: {
          fontFamily: C.mono, fontSize: 10.5, letterSpacing: 2.4, fontWeight: 700,
          color: quiet ? u.textMuted : u.brand, whiteSpace: "nowrap"
        },
        children
      }),
      quiet && c.jsx("span", {
        "aria-hidden": true,
        style: { flex: 1, height: 2, background: u.borderLight, borderRadius: 1 }
      })
    ]
  });
}

function Tag({ children, strong }) {
  return c.jsx("span", {
    style: {
      flexShrink: 0, whiteSpace: "nowrap", borderRadius: 5, padding: "2px 7px",
      fontFamily: C.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: 1.2,
      background: strong ? u.brand : u.brandSofter,
      color: strong ? u.textOnDark : u.brand,
      border: `2px solid ${u.brand}`
    },
    children
  });
}

// The button look inside a card. The whole card is the real button, so this is
// a span: a button inside a button is not allowed and confuses screen readers.
function FakeButton({ children, kind, hover }) {
  const filled = kind === "filled";
  const quiet = kind === "quiet";
  return c.jsx("span", {
    "aria-hidden": true,
    style: {
      flexShrink: 0, whiteSpace: "nowrap", borderRadius: 8,
      padding: quiet ? "7px 12px" : "8px 14px",
      fontFamily: quiet ? C.mono : C.display,
      fontSize: quiet ? 12 : 13.5, fontWeight: 700, letterSpacing: quiet ? 0.2 : 0.8,
      background: filled ? u.brand : u.surface,
      color: filled ? u.textOnDark : quiet ? u.textDim : u.text,
      border: `2px solid ${quiet ? u.borderLight : u.outline}`,
      boxShadow: hover && !quiet ? U.sm : "none",
      transition: "box-shadow 0.12s"
    },
    children
  });
}

// Shared frame for both ready card shapes: printed-paper border, hard shadow,
// lifts on hover, whole surface is one tap target.
function CardFrame({ onClick, label, highlight, className, children }) {
  const [hover, setHover] = useState(false);
  const edge = highlight ? u.brand : u.outline;
  return c.jsx("button", {
    onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    "aria-label": label,
    className,
    style: {
      display: "flex", width: "100%", padding: 0, textAlign: "left", font: "inherit",
      background: u.surface, border: `3px solid ${edge}`, borderRadius: 12,
      boxShadow: hover ? U.lg : U.md,
      transform: hover ? "translate(-2px, -2px)" : "translate(0, 0)",
      transition: "transform 0.1s cubic-bezier(.34,1.3,.64,1), box-shadow 0.1s",
      overflow: "hidden", cursor: "pointer", WebkitTapHighlightColor: "transparent"
    },
    children: children(hover, edge)
  });
}

function IconPanel({ district, edge, width, size, className }) {
  return c.jsx("span", {
    className,
    style: {
      width, flexShrink: 0, background: u.brandSofter,
      borderRight: `3px solid ${edge}`,
      display: "flex", alignItems: "center", justifyContent: "center"
    },
    children: c.jsx("svg", {
      viewBox: "0 0 100 100", width: size, height: size, "aria-hidden": true,
      children: district.icon()
    })
  });
}

// ---------------------------------------------------------------------------
// WideCard : the only ready district, shown big with its chapter names.
// ---------------------------------------------------------------------------
function WideCard({ district, session, onOpen }) {
  const M = R.map;
  const p = liveProgress(session, district);
  const live = district.chapters.filter((ch) => ch.live);
  return c.jsx(CardFrame, {
    onClick: () => onOpen(district),
    label: `${district.name}. ${M.clearedCount(p.cleared, p.live)}. ${M.openTopic}.`,
    className: "kyr-wide-card",
    children: (hover, edge) => [
      c.jsx(IconPanel, { district, edge, width: 200, size: 104, className: "kyr-wide-icon" }, "i"),
      c.jsxs("span", {
        style: { flex: 1, minWidth: 0, padding: "22px 26px", display: "flex", flexDirection: "column", gap: 12 },
        children: [
          c.jsxs("span", {
            style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
            children: [
              c.jsx("span", {
                style: { fontFamily: C.display, fontSize: "clamp(26px, 4vw, 36px)", lineHeight: 1.02, color: u.text },
                children: district.name
              }),
              p.done && c.jsx(Tag, { children: M.doneTag })
            ]
          }),
          district.blurb && c.jsx("span", {
            style: { fontFamily: C.body, fontSize: 16, lineHeight: 1.5, color: u.textDim },
            children: district.blurb
          }),
          c.jsx("span", {
            style: {
              display: "flex", flexDirection: "column", gap: 7,
              borderTop: `2px dashed ${u.borderLight}`, paddingTop: 12
            },
            children: live.map((ch, i) => c.jsxs("span", {
              style: { display: "flex", gap: 12, alignItems: "baseline" },
              children: [
                c.jsx("span", {
                  style: { fontFamily: C.mono, fontSize: 12.5, fontWeight: 700, color: u.brand },
                  children: String(i + 1).padStart(2, "0")
                }),
                c.jsx("span", {
                  style: {
                    fontFamily: C.mono, fontSize: 12.5, fontWeight: 600, letterSpacing: 0.6,
                    color: chapterStats(session, ch.id).cleared ? u.textMuted : u.text
                  },
                  children: chapterName(ch)
                })
              ]
            }, ch.id))
          }),
          c.jsxs("span", {
            style: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: 2 },
            children: [
              c.jsx(FakeButton, {
                kind: p.done ? "quiet" : "filled", hover,
                children: p.done ? M.playAgainLabel : p.touched ? M.continueLabel : M.openNamed(district.name)
              }),
              c.jsx("span", {
                style: { fontFamily: C.mono, fontSize: 12, color: u.textMuted },
                children: M.clearedCount(p.cleared, p.live)
              })
            ]
          })
        ]
      }, "b")
    ]
  });
}

// ---------------------------------------------------------------------------
// ReadyCard : one of several ready districts. Compact on purpose.
// ---------------------------------------------------------------------------
function ReadyCard({ district, session, onOpen, upNext }) {
  const M = R.map;
  const p = liveProgress(session, district);
  const label = p.done ? M.playAgainLabel : upNext ? (p.touched ? M.continueLabel : M.startLabel) : M.openLabel;
  return c.jsx(CardFrame, {
    onClick: () => onOpen(district),
    label: `${district.name}. ${M.clearedCount(p.cleared, p.live)}.${upNext ? ` ${M.upNextTag}.` : ""} ${M.openTopic}.`,
    highlight: upNext,
    children: (hover, edge) => [
      c.jsx(IconPanel, { district, edge, width: 92, size: 54 }, "i"),
      c.jsxs("span", {
        style: { flex: 1, minWidth: 0, padding: "13px 15px", display: "flex", flexDirection: "column", gap: 2 },
        children: [
          c.jsxs("span", {
            style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
            children: [
              c.jsx("span", {
                style: { fontFamily: C.display, fontSize: 17, lineHeight: 1.1, color: u.text },
                children: district.name
              }),
              p.done ? c.jsx(Tag, { children: M.doneTag })
                : upNext ? c.jsx(Tag, { strong: true, children: M.upNextTag })
                : null
            ]
          }),
          c.jsx(ChapterBar, { district, session }),
          c.jsxs("span", {
            style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10 },
            children: [
              c.jsx("span", {
                style: { fontFamily: C.mono, fontSize: 11.5, color: u.textMuted },
                children: M.clearedCount(p.cleared, p.live)
              }),
              c.jsx(FakeButton, {
                kind: p.done ? "quiet" : upNext ? "filled" : "outline", hover,
                children: label
              })
            ]
          })
        ]
      }, "b")
    ]
  });
}

// ---------------------------------------------------------------------------
// SoonTile : a district still being written. Not a button, on purpose: it
// would open an empty screen.
// ---------------------------------------------------------------------------
function SoonTile({ district }) {
  return c.jsxs("div", {
    "aria-label": `${district.name}, ${R.map.soonAria}`,
    style: {
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      padding: "14px 8px", background: u.surfaceWarm,
      border: `2px solid ${u.borderLight}`, borderRadius: 10
    },
    children: [
      c.jsx("svg", {
        viewBox: "0 0 100 100", width: 42, height: 42, "aria-hidden": true,
        style: { filter: "grayscale(0.8)", opacity: 0.55 },
        children: district.icon()
      }),
      c.jsx("div", {
        style: {
          fontFamily: C.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.9,
          color: u.textMuted, textAlign: "center", lineHeight: 1.3
        },
        children: district.name
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// Side column boxes
// ---------------------------------------------------------------------------
function SideBox({ eyebrow, title, blurb, quiet, children }) {
  return c.jsxs("div", {
    style: {
      background: quiet ? u.surfaceWarm : u.surface,
      border: `2px solid ${u.borderLight}`, borderRadius: 12, padding: 18
    },
    children: [
      c.jsx("div", {
        style: {
          fontFamily: C.mono, fontSize: 10.5, fontWeight: 700, letterSpacing: 2,
          color: quiet ? u.textMuted : u.brand
        },
        children: eyebrow
      }),
      c.jsx("div", {
        style: {
          fontFamily: C.display, fontSize: 20, lineHeight: 1.1, margin: "6px 0",
          color: quiet ? u.textDim : u.text, textTransform: "uppercase"
        },
        children: title
      }),
      c.jsx("div", {
        style: { fontFamily: C.body, fontSize: 13.5, lineHeight: 1.45, color: u.textMuted, marginBottom: 12 },
        children: blurb
      }),
      children
    ]
  });
}

function TutorialBox({ onPlay }) {
  return c.jsx(SideBox, {
    eyebrow: R.map.tutorialEyebrow,
    title: R.tutorial.replayLabel,
    blurb: R.tutorial.replayBlurb,
    children: c.jsx(Button, {
      onClick: onPlay, variant: "secondary", size: "sm",
      style: { fontSize: 13 }, children: R.map.tutorialStart
    })
  });
}

// The demo keeps its three-try rules (one page load, three tries, a winner is
// finished rather than out of tries). It just stopped being the loudest thing
// on the page.
function DemoBox({ onPlay, runsUsed = 0, maxRuns = 3, canPlay = true, won = false }) {
  const M = R.map;
  const left = Math.max(0, maxRuns - runsUsed);
  const status = won ? R.demo.wonRunsLabel : left > 0 ? M.demoTriesLeft(left, maxRuns) : M.demoNoTries;
  return c.jsx(SideBox, {
    quiet: true,
    eyebrow: M.demoEyebrow,
    title: won ? R.demo.bannerWonTitle : M.demoTitle,
    blurb: M.demoBlurb,
    children: c.jsxs("div", {
      style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 },
      children: [
        canPlay && c.jsx("button", {
          onClick: onPlay,
          style: {
            background: "none", border: "none", padding: "4px 0", cursor: "pointer",
            fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: u.brand,
            textDecoration: "underline", textUnderlineOffset: 3
          },
          children: M.demoPlayLabel
        }),
        c.jsx("div", {
          style: { fontFamily: C.mono, fontSize: 10.5, letterSpacing: 1, color: u.textMuted },
          children: status
        })
      ]
    })
  });
}

// Layout rules that need screen-size breakpoints, which inline styles cannot do.
const MAP_CSS = `
.kyr-map-body { display: flex; gap: 28px; align-items: flex-start; }
.kyr-map-main { flex: 1 1 auto; min-width: 0; }
.kyr-map-rail { width: 250px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px; padding-top: 26px; }
.kyr-ready-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.kyr-soon-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; }
@media (max-width: 960px) {
  .kyr-map-body { flex-direction: column; align-items: stretch; }
  .kyr-map-rail { width: auto; flex-direction: row; flex-wrap: wrap; padding-top: 0; }
  .kyr-map-rail > * { flex: 1 1 240px; }
  .kyr-soon-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .kyr-ready-grid { grid-template-columns: minmax(0, 1fr); }
  .kyr-soon-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kyr-wide-card { flex-direction: column; }
  .kyr-wide-icon { width: auto !important; height: 110px; border-right: none !important; border-bottom: 3px solid ${u.outline}; }
}
`;

// ---------------------------------------------------------------------------
// MapScreen
// ---------------------------------------------------------------------------
// Districts are fetched from content/ on mount. Three states: loading, failed,
// loaded. The failure state matters more than it looks: content now arrives
// over the network, so "the file is missing or malformed" is a thing a player
// can actually hit, and a blank screen would be the worst possible answer.
//
// The loaded list is handed UP via onDistricts so the engine can hold it and
// pass one district into the district screen. Without that the engine would
// have to fetch the same JSON a second time to know what the player tapped.
//
// The props are unchanged from the old map, so engine.js needs no edit.
export function MapScreen({ session, onOpenDistrict, onHome, onPlayDemo, onPlayTutorial, onDistricts, demoRunsUsed = 0, demoMaxRuns = 3, demoCanPlay = true, demoWon = false }) {
  const M = R.map;
  const [districts, setDistricts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    loadDistricts()
      .then((list) => {
        if (!alive) return;
        const withIcons = list.map(withIcon);
        setDistricts(withIcons);
        if (onDistricts) onDistricts(withIcons);
      })
      .catch((e) => { if (alive) setError(e.message || String(e)); });
    return () => { alive = false; };
  }, []); // eslint-disable-line

  const shell = (children) => c.jsx("div", {
    style: {
      flex: "1 0 auto", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "48px 24px 78px"
    },
    children: c.jsxs("div", {
      style: { width: "100%", maxWidth: 1080 },
      children: [c.jsx("style", { children: MAP_CSS }, "css"), c.jsx("div", { children }, "body")]
    })
  });

  if (error) {
    return shell(c.jsxs("div", {
      style: {
        background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 12,
        boxShadow: U.md, padding: "24px 26px", textAlign: "center"
      },
      children: [
        c.jsx("div", {
          style: { fontFamily: C.display, fontSize: 22, color: u.text, marginBottom: 8 },
          children: M.loadErrorTitle
        }),
        c.jsx("div", {
          style: { fontFamily: C.body, fontSize: 14, color: u.textDim, marginBottom: 18 },
          children: M.loadErrorBody
        }),
        c.jsx(Button, { onClick: onHome, variant: "secondary", size: "sm", children: M.homeLabel })
      ]
    }));
  }

  if (!districts) {
    return shell(c.jsx("div", {
      style: {
        fontFamily: C.mono, fontSize: 12, letterSpacing: 2, color: u.textMuted,
        textAlign: "center", padding: "40px 0"
      },
      children: M.loadingLabel
    }));
  }

  const ready = districts.filter(isReady);
  const soon = districts.filter((d) => !isReady(d));

  // Counter: live chapters only.
  let liveTotal = 0;
  let liveCleared = 0;
  ready.forEach((d) => {
    const p = liveProgress(session, d);
    liveTotal += p.live;
    liveCleared += p.cleared;
  });

  // UP NEXT: first ready district in map order that is not finished.
  const upNext = ready.find((d) => !liveProgress(session, d).done);

  const readyHeading = ready.length === 1 ? M.readyOne
    : soon.length === 0 ? M.readyAll(ready.length)
    : M.readySome(ready.length);

  return shell(c.jsxs("div", {
    children: [
      // Header
      c.jsxs("div", {
        style: {
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          gap: 20, flexWrap: "wrap", marginBottom: 28
        },
        children: [
          c.jsxs("div", { children: [
            c.jsx("div", {
              style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 3, color: u.brand },
              children: M.eyebrow
            }),
            c.jsx("h1", {
              style: {
                fontFamily: C.display, fontSize: 40, letterSpacing: -0.5,
                color: u.text, margin: "6px 0 0", lineHeight: 1.05
              },
              children: M.title
            })
          ] }),
          liveTotal > 0 && c.jsxs("div", {
            style: {
              background: u.surface, border: `2px solid ${u.outline}`,
              borderRadius: 10, padding: "8px 16px", boxShadow: U.sm, textAlign: "center"
            },
            children: [
              c.jsx("div", {
                style: { fontFamily: C.mono, fontSize: 9, letterSpacing: 1.6, color: u.brand },
                children: M.clearedLabel
              }),
              c.jsxs("div", {
                style: { fontFamily: C.mono, fontSize: 20, fontWeight: 700, color: u.text },
                children: [
                  String(liveCleared),
                  c.jsxs("span", {
                    style: { color: u.textMuted, fontSize: 13 },
                    children: [" / ", String(liveTotal)]
                  })
                ]
              })
            ]
          })
        ]
      }),

      // Ready shelf plus side column
      c.jsxs("div", {
        className: "kyr-map-body",
        style: { marginBottom: soon.length ? 36 : 0 },
        children: [
          c.jsxs("div", {
            className: "kyr-map-main",
            children: [
              c.jsx(ShelfLabel, { children: ready.length ? readyHeading : M.noneReadyHeading }),
              ready.length === 0
                ? c.jsx("div", {
                    style: {
                      fontFamily: C.body, fontSize: 14, color: u.textMuted,
                      background: u.surface, border: `2px dashed ${u.borderLight}`,
                      borderRadius: 12, padding: "22px 20px"
                    },
                    children: M.noneReady
                  })
                : ready.length === 1
                  ? c.jsx(WideCard, { district: ready[0], session, onOpen: onOpenDistrict })
                  : c.jsx("div", {
                      className: "kyr-ready-grid",
                      children: ready.map((d) => c.jsx(ReadyCard, {
                        district: d, session, onOpen: onOpenDistrict, upNext: d === upNext
                      }, d.id))
                    }),
              ready.length > 1 && c.jsx(Legend, {})
            ]
          }),
          (onPlayTutorial || onPlayDemo) && c.jsxs("div", {
            className: "kyr-map-rail",
            children: [
              onPlayTutorial && c.jsx(TutorialBox, { onPlay: onPlayTutorial }, "t"),
              onPlayDemo && c.jsx(DemoBox, {
                onPlay: onPlayDemo, runsUsed: demoRunsUsed, maxRuns: demoMaxRuns,
                canPlay: demoCanPlay, won: demoWon
              }, "d")
            ]
          })
        ]
      }),

      // Coming soon shelf. Gone entirely once nothing is left in it.
      soon.length > 0 && c.jsxs("div", {
        children: [
          c.jsx(ShelfLabel, { quiet: true, children: M.soonHeading(soon.length) }),
          c.jsx("div", {
            className: "kyr-soon-grid",
            children: soon.map((d) => c.jsx(SoonTile, { district: d }, d.id))
          })
        ]
      }),

      // Footer
      c.jsxs("div", {
        style: {
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 16, flexWrap: "wrap", marginTop: 26
        },
        children: [
          c.jsx("div", {
            style: {
              fontFamily: C.body, fontSize: 12.5, lineHeight: 1.6,
              color: u.textMuted, maxWidth: 560
            },
            children: M.footer
          }),
          c.jsx(Button, {
            onClick: onHome, variant: "ghost", size: "sm",
            style: { fontSize: 13 }, children: M.homeLabel
          })
        ]
      })
    ]
  }));
}

// Attach the icon component for a district loaded from JSON. Exported because
// the district screen renders the same icon in its header, and the join between
// a district id and its artwork should exist in exactly one place.
export function withIcon(d) {
  return { ...d, icon: ICON_FOR[d.id] || ICONS.allrights };
}
