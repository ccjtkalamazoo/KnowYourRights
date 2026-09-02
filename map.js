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
// CURRENT STATE: SHELL, DELIBERATELY
// ---------------------------------------------------------------------------
// The districts below are the content roadmap. Every district that is not
// marked live in its meta.json ships as COMING SOON. The demo banner above them
// is the one thing on this screen that is actually playable today.
//
// ---------------------------------------------------------------------------
// THE RULES THE CONTENT IS BEING WRITTEN AGAINST
// ---------------------------------------------------------------------------
//   * 30 questions in a chapter's bank, 15 dealt per quiz. The demo deals 5.
//   * Chapters are SEQUENTIAL inside a district: clear chapter 1 to open 2.
//     Districts themselves are free-choice. That is why chapter order is a
//     content constraint, not just navigation: a chapter may rely on everything
//     before it and must assume nothing after it.
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
// The map reads all of that at runtime.

import { c, u, C, U, useState, useEffect } from "./theme.js";
import { Button } from "./ui.js";
import { STATUS, newSession, chapterStatus, districtStatus, completion } from "./state.js";
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
  // COURTROOM: the judge's bench seen from the gallery, with a gavel resting on
  // it. Deliberately an interior, so it does not read as a second version of the
  // `court` icon above, which is the building from outside.
  courtroom: () => [
    c.jsx("circle", { cx: 50, cy: 46, r: 37, fill: GSOFT }, 0),
    c.jsx("path", { d: "M36,20 L64,20 C68,20 70,23 70,27 L70,52 L30,52 L30,27 C30,23 32,20 36,20 Z", fill: GBRIGHT, stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round" }, 1),
    c.jsx("rect", { x: 12, y: 52, width: 76, height: 10, rx: 2, fill: PAPER, stroke: INK, strokeWidth: 4.5 }, 2),
    c.jsx("path", { d: "M18,62 L82,62 L82,86 L18,86 Z", fill: PAPER, stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round" }, 3),
    c.jsx("path", { d: "M34,62 L34,86 M50,62 L50,86 M66,62 L66,86", fill: "none", stroke: INK, strokeWidth: 3.2 }, 4),
    c.jsx("rect", { x: 19, y: 40, width: 17, height: 9, rx: 3, fill: GOLD, stroke: INK, strokeWidth: 3.4 }, 5),
    c.jsx("path", { d: "M36,45 L52,49", fill: "none", stroke: INK, strokeWidth: 4, strokeLinecap: "round" }, 6),
    c.jsx("path", { d: "M6,88 L94,88", fill: "none", stroke: INK, strokeWidth: 4.5, strokeLinecap: "round" }, 7)
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
  courtroom: ICONS.courtroom,
  juvenile: ICONS.juvenile,
  stop: ICONS.stop,
  arrest: ICONS.arrest,
  saying: ICONS.saying,
  bystander: ICONS.bystander,
  jail: ICONS.jail,
  court: ICONS.court,
  after: ICONS.after,
};

const SESSION = newSession();

// Palette for the four chapter states. Segment fill + border per state.
function stateColors(status) {
  switch (status) {
    case STATUS.CLEARED:     return { fill: u.brand,       border: u.outline, text: u.textOnDark };
    case STATUS.IN_PROGRESS: return { fill: u.mustard,     border: u.outline, text: u.text };
    case STATUS.OPEN:        return { fill: u.surface,     border: u.brand,   text: u.brand };   // "next up"
    default:                 return { fill: u.surfaceWarm, border: u.borderLight, text: u.textMuted }; // locked
  }
}

// ---------------------------------------------------------------------------
// ChapterBar : the row of segments under a district name, one per chapter.
// ---------------------------------------------------------------------------
function ChapterBar({ district }) {
  return c.jsx("div", {
    style: { display: "flex", gap: 3, marginTop: 10 },
    children: district.chapters.map((ch, i) => {
      const st = stateColors(chapterStatus(SESSION, district, i));
      return c.jsx("span", {
        style: {
          flex: 1, height: 10, borderRadius: 2,
          background: st.fill, border: `2px solid ${st.border}`
        }
      }, ch.id);
    })
  });
}

// ---------------------------------------------------------------------------
// DistrictCard
// ---------------------------------------------------------------------------
// Printed-paper card: ink border, hard offset shadow, scene icon on top, then a
// chapter segment bar and an X/Y count. Selecting a card (hover on desktop, tap
// on touch) raises it AND surfaces its chapter list in the panel below the grid,
// so the same interaction works with or without a pointer.
function DistrictCard({ district, selected, onSelect }) {
  const live = district.live;
  const dc = district.chapters.filter(
    (_, i) => chapterStatus(SESSION, district, i) === STATUS.CLEARED
  ).length;
  const total = district.chapters.length;
  const active = selected;

  return c.jsxs("button", {
    // Selecting a district does not start a run. It reveals that district's
    // chapters in the panel below, and a chapter is what you actually play.
    onClick: () => onSelect(district.id),
    onMouseEnter: () => onSelect(district.id),
    "aria-label": live
      ? `${district.name}. ${total} chapters. Show chapters.`
      : `${district.name}, coming soon. ${total} chapters planned. ${district.blurb}`,
    style: {
      textAlign: "left", padding: 0, font: "inherit",
      background: live ? u.surface : u.surfaceWarm,
      border: `2px solid ${live || active ? u.outline : u.borderLight}`,
      borderRadius: 10,
      boxShadow: active ? U.lg : (live ? U.md : "none"),
      transform: active ? "translate(-2px, -2px)" : "translate(0, 0)",
      transition: "transform 0.1s cubic-bezier(.34,1.3,.64,1), box-shadow 0.1s",
      cursor: "pointer", overflow: "hidden", position: "relative",
      opacity: live ? 1 : 0.82
    },
    children: [
      // Motif band
      c.jsxs("div", {
        style: {
          position: "relative", height: 96,
          background: live ? u.brandSofter : u.bgWarm,
          borderBottom: `2px solid ${live || active ? u.outline : u.borderLight}`,
          display: "flex", alignItems: "center", justifyContent: "center"
        },
        children: [
          c.jsx("svg", {
            viewBox: "0 0 100 100", width: 62, height: 62, "aria-hidden": true,
            style: live ? undefined : { filter: "grayscale(0.75)", opacity: 0.6 },
            children: district.icon()
          }),
          !live && c.jsx("div", {
            style: {
              position: "absolute", top: 8, right: 8,
              background: u.surface, border: `2px solid ${u.borderLight}`,
              borderRadius: 5, padding: "2px 7px",
              fontFamily: C.mono, fontSize: 8.5, fontWeight: 700,
              letterSpacing: 1.2, color: u.textMuted
            },
            children: "SOON"
          })
        ]
      }),
      // Body
      c.jsxs("div", {
        style: { padding: "11px 12px 12px" },
        children: [
          c.jsx("div", {
            style: {
              fontFamily: C.mono, fontSize: 11.5, fontWeight: 700,
              letterSpacing: 0.9, color: live ? u.text : u.textDim
            },
            children: district.name
          }),
          c.jsx(ChapterBar, { district }),
          c.jsxs("div", {
            style: {
              display: "flex", justifyContent: "space-between",
              alignItems: "baseline", marginTop: 9
            },
            children: [
              c.jsxs("span", {
                style: {
                  fontFamily: C.mono, fontSize: 9, letterSpacing: 1.1,
                  color: u.textMuted
                },
                children: [String(total), " CHAPTERS"]
              }),
              c.jsxs("span", {
                style: {
                  fontFamily: C.mono, fontSize: 12, fontWeight: 700,
                  letterSpacing: 1, color: dc >= total && total ? u.brand : u.text
                },
                children: [String(dc), " / ", String(total)]
              })
            ]
          })
        ]
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// ChapterPanel : the detail strip below the grid.
// ---------------------------------------------------------------------------
// Shows the selected district's blurb and its chapters. Driven by selection,
// which is set on hover (desktop) or tap (touch), so it is not a hover-only
// feature that dies on phones.
//
// This is also where a chapter is CHOSEN. A district is not itself playable:
// it holds several chapters and you play one of them, so the chapter tags
// are buttons once a chapter is live and plain tags while it is not.
function ChapterPanel({ district, onPlayChapter }) {
  return c.jsx("div", {
    style: {
      marginTop: 20, background: u.surface, border: `2px solid ${u.outline}`,
      borderRadius: 10, padding: "14px 16px", boxShadow: U.md, minHeight: 92
    },
    children: district
      ? c.jsxs("div", { children: [
          c.jsxs("div", {
            style: {
              display: "flex", justifyContent: "space-between",
              alignItems: "baseline", gap: 14, flexWrap: "wrap"
            },
            children: [
              c.jsx("div", {
                style: { fontFamily: C.display, fontSize: 17, color: u.text },
                children: district.name
              }),
              c.jsxs("div", {
                style: {
                  fontFamily: C.mono, fontSize: 10, letterSpacing: 1.2, color: u.brand
                },
                children: [String(district.chapters.length), " CHAPTERS"]
              })
            ]
          }),
          c.jsx("div", {
            style: {
              fontFamily: C.body, fontSize: 13, color: u.textDim, marginTop: 4
            },
            children: district.blurb
          }),
          c.jsx("div", {
            style: { display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" },
            children: district.chapters.map((ch, i) => {
              const st = stateColors(chapterStatus(SESSION, district, i));
              const playable = ch.live;
              const inner = [
                c.jsx("span", {
                  style: { opacity: 0.7, fontWeight: 700 },
                  children: String(i + 1).padStart(2, "0")
                }, "n"),
                ch.name
              ];
              const style = {
                display: "inline-flex", alignItems: "center", gap: 6,
                fontFamily: C.mono, fontSize: 9, letterSpacing: 0.8,
                background: st.fill, color: st.text,
                border: `2px solid ${st.border}`, borderRadius: 5,
                padding: "4px 8px", textAlign: "left"
              };
              return playable
                ? c.jsx("button", {
                    onClick: () => onPlayChapter && onPlayChapter(district, ch),
                    style: {
                      ...style, cursor: "pointer", boxShadow: U.sm,
                      WebkitTapHighlightColor: "transparent"
                    },
                    "aria-label": `Play ${ch.name}`,
                    children: inner
                  }, ch.id)
                : c.jsx("span", { style, children: inner }, ch.id);
            })
          })
        ] })
      : c.jsx("div", {
          style: {
            fontFamily: C.mono, fontSize: 11, letterSpacing: 1.2,
            color: u.textMuted, paddingTop: 14
          },
          children: "SELECT A DISTRICT TO SEE ITS CHAPTERS"
        })
  });
}

// ---------------------------------------------------------------------------
// Legend : what the segment colours mean.
// ---------------------------------------------------------------------------
function Legend() {
  const items = [
    ["CLEARED", u.brand, u.outline],
    ["IN PROGRESS", u.mustard, u.outline],
    ["NEXT UP", u.surface, u.brand],
    ["LOCKED", u.surfaceWarm, u.borderLight]
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
// DemoBanner : the one thing on this screen that is actually playable.
// ---------------------------------------------------------------------------
// Everything else on the map is a roadmap. This is not, so it does not look
// like the district cards at all: full width, brand fill, the heaviest shadow
// on the page, and the only large button. A player should not have to read
// anything to know where to click.
//
// The round counter is the honest part. Three rounds per page load, and the
// banner says how many are left rather than letting a player discover the cap
// by being refused.
function DemoBanner({ onPlay, runsUsed = 0, maxRuns = 3, canPlay = true, won = false }) {
  const D = R.demo;
  const left = Math.max(0, maxRuns - runsUsed);
  return c.jsxs("div", {
    className: "kyr-demo-banner",
    style: {
      background: canPlay ? u.brand : u.surfaceWarm,
      border: `3px solid ${u.outline}`,
      borderRadius: 14,
      boxShadow: U.lg,
      padding: "22px 26px",
      marginBottom: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 22,
      flexWrap: "wrap"
    },
    children: [
      c.jsxs("div", { style: { flex: "1 1 300px", minWidth: 240 }, children: [
        c.jsx("div", {
          style: {
            fontFamily: C.mono, fontSize: 10, letterSpacing: 2.6, fontWeight: 700,
            color: canPlay ? u.textOnDark : u.textMuted, opacity: canPlay ? 0.85 : 1
          },
          children: canPlay ? D.eyebrow : "DEMO"
        }),
        c.jsx("div", {
          style: {
            fontFamily: C.display, fontSize: "clamp(28px, 5vw, 40px)", lineHeight: 1.02,
            letterSpacing: -0.5, margin: "6px 0 8px",
            color: canPlay ? u.textOnDark : u.text
          },
          children: canPlay ? D.title : won ? D.bannerWonTitle : D.outOfRunsHeadline
        }),
        c.jsx("div", {
          style: {
            fontFamily: C.body, fontSize: 14, lineHeight: 1.55, fontWeight: 500,
            maxWidth: 460, color: canPlay ? u.textOnDark : u.textDim,
            opacity: canPlay ? 0.9 : 1
          },
          children: canPlay ? D.blurb : won ? D.bannerWonBlurb : D.outOfRunsSub
        })
      ] }),
      c.jsxs("div", {
        style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
        children: [
          c.jsx(Button, {
            onClick: onPlay, variant: "secondary", size: "md", disabled: !canPlay,
            style: { fontSize: 20, padding: "16px 34px" },
            children: D.playLabel
          }),
          c.jsx("div", {
            style: {
              fontFamily: C.mono, fontSize: 10, letterSpacing: 1.6, fontWeight: 700,
              color: canPlay ? u.textOnDark : u.textMuted, opacity: canPlay ? 0.8 : 1
            },
            // A winner is not out of rounds, they are finished. Never show a count
            // that implies turns they were owed and did not get.
            children: won ? D.wonRunsLabel : left > 0 ? `${left} of ${maxRuns} rounds left` : "no rounds left"
          })
        ]
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// TutorialLink : a way back into the guided tour.
// ---------------------------------------------------------------------------
// The tutorial normally runs once, straight after the safety brief, and then
// nobody sees it again. This is for the two cases that leaves out: somebody who
// tapped Skip and then wished they had not, and the second kid at the table who
// arrived after the first one had already been through it.
//
// Deliberately quiet. It is a text row under the demo banner, not a second big
// button: a player who already knows how to play should not have to read past
// something loud to get to the game.
function TutorialLink({ onPlay }) {
  const [hover, setHover] = useState(false);
  return c.jsxs("button", {
    onClick: onPlay,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    className: "kyr-tutorial-link",
    "aria-label": `${R.tutorial.replayLabel}. ${R.tutorial.replayBlurb}`,
    style: {
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      background: hover ? u.surface : "transparent",
      border: `2px solid ${hover ? u.outline : u.borderLight}`,
      borderRadius: 10, padding: "10px 14px", marginBottom: 26,
      cursor: "pointer", textAlign: "left", font: "inherit",
      boxShadow: hover ? U.sm : "none",
      transition: "background 0.12s, border-color 0.12s, box-shadow 0.12s",
      WebkitTapHighlightColor: "transparent"
    },
    children: [
      c.jsx("span", {
        "aria-hidden": true,
        style: {
          flexShrink: 0, width: 26, height: 26, borderRadius: "50%",
          border: `2px solid ${u.outline}`, background: u.mustardSoft,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: C.display, fontSize: 14, color: u.text, lineHeight: 1
        },
        children: "?"
      }),
      c.jsxs("span", { style: { display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }, children: [
        c.jsx("span", {
          style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 1.4, fontWeight: 700, color: u.text, textTransform: "uppercase" },
          children: R.tutorial.replayLabel
        }),
        c.jsx("span", {
          style: { fontFamily: C.body, fontSize: 12.5, color: u.textMuted, fontWeight: 500 },
          children: R.tutorial.replayBlurb
        })
      ] })
    ]
  });
}

// ---------------------------------------------------------------------------
// MapScreen
// ---------------------------------------------------------------------------
// Districts are fetched from content/ on mount. Three states: loading, failed,
// loaded. The failure state matters more than it looks: content now arrives
// over the network, so "the file is missing or malformed" is a thing a player
// can actually hit, and a blank screen would be the worst possible answer.
export function MapScreen({ onPlayChapter, onHome, onPlayDemo, onPlayTutorial, demoRunsUsed = 0, demoMaxRuns = 3, demoCanPlay = true, demoWon = false }) {
  const [districts, setDistricts] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let alive = true;
    loadDistricts()
      .then((list) => { if (alive) setDistricts(list.map(withIcon)); })
      .catch((e) => { if (alive) setError(e.message || String(e)); });
    return () => { alive = false; };
  }, []);

  const shell = (children) => c.jsx("div", {
    style: {
      flex: "1 0 auto", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "48px 24px 78px"
    },
    children: c.jsx("div", { style: { width: "100%", maxWidth: 940 }, children })
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
          children: "THE MAP DID NOT LOAD"
        }),
        c.jsx("div", {
          style: { fontFamily: C.body, fontSize: 14, color: u.textDim, marginBottom: 18 },
          children: "Something went wrong fetching the districts. Check your connection and try again."
        }),
        c.jsx(Button, { onClick: onHome, variant: "secondary", size: "sm", children: "\u2190 Home" })
      ]
    }));
  }

  if (!districts) {
    return shell(c.jsx("div", {
      style: {
        fontFamily: C.mono, fontSize: 12, letterSpacing: 2, color: u.textMuted,
        textAlign: "center", padding: "40px 0"
      },
      children: "LOADING THE MAP\u2026"
    }));
  }

  const totalChapters = districts.reduce((n, d) => n + d.chapters.length, 0);
  const clearedChapters = Math.round(completion(SESSION, districts) * totalChapters);
  const selectedDistrict = districts.find((d) => d.id === selected) || null;
  const anyLive = districts.some((d) => d.live);

  return shell(c.jsxs("div", {
    children: [
      // Header
      c.jsxs("div", {
        style: {
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          gap: 20, flexWrap: "wrap", marginBottom: 26
        },
        children: [
          c.jsxs("div", { children: [
            c.jsx("div", {
              style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 3, color: u.brand },
              children: "CHOOSE WHERE TO START"
            }),
            c.jsx("h1", {
              style: {
                fontFamily: C.display, fontSize: 40, letterSpacing: -0.5,
                color: u.text, margin: "6px 0 0", lineHeight: 1.05
              },
              children: "THE MAP"
            })
          ] }),
          c.jsxs("div", {
            style: {
              background: u.surface, border: `2px solid ${u.outline}`,
              borderRadius: 10, padding: "8px 16px", boxShadow: U.sm, textAlign: "center"
            },
            children: [
              c.jsx("div", {
                style: { fontFamily: C.mono, fontSize: 9, letterSpacing: 1.6, color: u.brand },
                children: "CHAPTERS CLEARED"
              }),
              c.jsxs("div", {
                style: { fontFamily: C.mono, fontSize: 20, fontWeight: 700, color: u.text },
                children: [
                  String(clearedChapters),
                  c.jsxs("span", {
                    style: { color: u.textMuted, fontSize: 13 },
                    children: [" / ", String(totalChapters)]
                  })
                ]
              })
            ]
          })
        ]
      }),

      // The demo sits ABOVE the roadmap, in full colour, at full width. The
      // districts below it are deliberately quiet. That contrast is the whole
      // instruction: the loud thing is the thing to play, and everything else
      // is a roadmap you are looking at, not choosing from.
      onPlayDemo && c.jsx(DemoBanner, {
        onPlay: onPlayDemo, runsUsed: demoRunsUsed, maxRuns: demoMaxRuns, canPlay: demoCanPlay, won: demoWon
      }),

      // Directly under it, quietly, the way back into the tutorial.
      onPlayTutorial && c.jsx(TutorialLink, { onPlay: onPlayTutorial }),

      // Roadmap divider. Wording follows the content: while nothing is live it
      // says so plainly rather than implying the map is playable.
      c.jsxs("div", {
        style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
        children: [
          c.jsx("span", {
            style: {
              fontFamily: C.mono, fontSize: 10, letterSpacing: 2.4,
              color: u.textMuted, whiteSpace: "nowrap"
            },
            children: anyLive ? "PICK A DISTRICT" : "QUESTIONS BEING WRITTEN"
          }),
          c.jsx("span", {
            "aria-hidden": true,
            style: { flex: 1, height: 2, background: u.borderLight, borderRadius: 1 }
          })
        ]
      }),

      // District grid
      c.jsx("div", {
        className: "kyr-map-grid",
        style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
        children: districts.map((d) => c.jsx(DistrictCard, {
          district: d,
          selected: selected === d.id,
          onSelect: setSelected
        }, d.id))
      }),

      // Chapter detail panel: also where a chapter is chosen.
      c.jsx(ChapterPanel, { district: selectedDistrict, onPlayChapter }),

      c.jsx(Legend, {}),

      // Footer note + home
      c.jsxs("div", {
        style: {
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 16, flexWrap: "wrap", marginTop: 22
        },
        children: [
          c.jsx("div", {
            style: {
              fontFamily: C.body, fontSize: 12.5, lineHeight: 1.6,
              color: u.textMuted, maxWidth: 520
            },
            children: anyLive
              ? "Each district is a moment where rights come up. Pick a chapter to play it."
              : "Each district is a moment where rights come up. The questions for these are being written and attorney reviewed now."
          }),
          c.jsx(Button, {
            onClick: onHome, variant: "ghost", size: "sm",
            style: { fontSize: 13 }, children: "\u2190 Home"
          })
        ]
      })
    ]
  }));
}

// Attach the icon component for a district loaded from JSON.
function withIcon(d) {
  return { ...d, icon: ICON_FOR[d.id] || ICONS.allrights };
}
