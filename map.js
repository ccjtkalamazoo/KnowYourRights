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
// The eight districts below are the content roadmap, not playable content. The
// question bank is 72 questions sorted by DIFFICULTY, not by district, so there
// is nothing yet to deal a district-specific deck from. Every district ships as
// COMING SOON.
//
// The one live entry is ALL RIGHTS, which plays the existing 15-question run
// exactly as before. It is deliberately NOT one of the eight districts:
// labeling 72 untagged questions as "THE STOP" would create a data lie that has
// to be undone later when the questions actually get tagged.
//
// ---------------------------------------------------------------------------
// THE RULES THE CONTENT IS BEING WRITTEN AGAINST
// ---------------------------------------------------------------------------
//   * 30 questions in a chapter's bank, 15 dealt per quiz.
//   * 5 to 7 chapters per district. All eight currently sit at 6.
//   * Chapters are SEQUENTIAL inside a district: clear chapter 1 to open 2.
//     Districts themselves are free-choice. That is why chapter order is a
//     content constraint, not just navigation: a chapter may rely on everything
//     before it and must assume nothing after it.
//   * Difficulty tiers are being dropped. Every question in a chapter is
//     eligible for every rung. That change lands in questions.js and rules.js,
//     not here, but it is why the ladder and the SKIP lifeline both need
//     revisiting.
//
// Districts 1 through 3 (JUVENILE, THE STOP, THE ARREST) are the authoring
// priority. The remaining five are ordered but not scheduled.
//
// Ordering note: the first six are roughly chronological through the system.
// THE BYSTANDER and JUVENILE are off-arc; JUVENILE leads anyway because it is
// what applies to the player today.
//
// Not yet owned by any district: searches. They currently sit as chapters
// inside THE STOP, THE ARREST, and THE BYSTANDER. The Fourth Amendment is deep
// enough to carry its own district and is the likeliest ninth.
//
// WHEN THE CONTENT LANDS, the changes are:
//   1. Tag each question in questions.js with a districtId + chapterId.
//   2. Add buildChapterDeck(chapterId) to rules.js alongside buildDeck().
//   3. Flip a district's `live` flag to true here and pass it an onPlay.
//   4. Wire state.js in so cleared chapters drive the card fill states.
// Nothing else in this file has to change.

import { c, u, C, U, useState } from "./theme.js";
import { Button } from "./ui.js";
import { STATUS, newSession, chapterStatus, districtStatus, completion } from "./state.js";

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
// The districts. Content roadmap.
// ---------------------------------------------------------------------------
// `icon` is an SVG path drawn on a 100x92 viewBox: single stroke, no fill. Line
// art rather than glyphs, so it matches the printed-paper look and adds no icon
// library dependency.
export const DISTRICTS = [
  {
    id: "juvenile", name: "JUVENILE", live: false,
    blurb: "What is different because you are under 17, and what changes when you are not.",
    icon: ICONS.juvenile,
    chapters: [
      { id: "juvenile.01", name: "WHAT IS DIFFERENT RIGHT NOW" },
      { id: "juvenile.02", name: "AT SCHOOL" },
      { id: "juvenile.03", name: "PARENTS AND NOTIFICATION" },
      { id: "juvenile.04", name: "JUVENILE COURT AND DETENTION" },
      { id: "juvenile.05", name: "CHARGED AS AN ADULT" },
      { id: "juvenile.06", name: "TURNING 17 AND YOUR RECORD" }
    ]
  },
  {
    id: "stop", name: "THE STOP", live: false,
    blurb: "Stopped on the street. Are you being held, and what do you have to give?",
    icon: ICONS.stop,
    chapters: [
      { id: "stop.01", name: "AM I FREE TO GO" },
      { id: "stop.02", name: "REASONABLE SUSPICION" },
      { id: "stop.03", name: "WHAT YOU MUST GIVE" },
      { id: "stop.04", name: "THE PAT DOWN" },
      { id: "stop.05", name: "HOW LONG IT LASTS" },
      { id: "stop.06", name: "WHEN IT BECOMES AN ARREST" }
    ]
  },
  {
    id: "arrest", name: "THE ARREST", live: false,
    blurb: "The handcuffs change everything. What is different the moment they go on.",
    icon: ICONS.arrest,
    chapters: [
      { id: "arrest.01", name: "PROBABLE CAUSE" },
      { id: "arrest.02", name: "WHAT CHANGES NOW" },
      { id: "arrest.03", name: "SEARCH INCIDENT TO ARREST" },
      { id: "arrest.04", name: "USE OF FORCE" },
      { id: "arrest.05", name: "YOUR PROPERTY" },
      { id: "arrest.06", name: "THE FIRST HOURS" }
    ]
  },
  {
    id: "saying", name: "WHAT YOU SAY", live: false,
    blurb: "Silence, counsel, and why the words have to be out loud.",
    icon: ICONS.saying,
    chapters: [
      { id: "saying.01", name: "INVOKING SILENCE" },
      { id: "saying.02", name: "ASKING FOR A LAWYER" },
      { id: "saying.03", name: "WHEN MIRANDA APPLIES" },
      { id: "saying.04", name: "CUSTODY VS CONVERSATION" },
      { id: "saying.05", name: "WHO IS ASKING" },
      { id: "saying.06", name: "WHY TALKING RARELY HELPS" }
    ]
  },
  {
    id: "bystander", name: "THE BYSTANDER", live: false,
    blurb: "When it is happening to someone else. Filming, helping, being a passenger.",
    icon: ICONS.bystander,
    chapters: [
      { id: "bystander.01", name: "WATCHING AND RECORDING" },
      { id: "bystander.02", name: "BEING A PASSENGER" },
      { id: "bystander.03", name: "BEING A WITNESS" },
      { id: "bystander.04", name: "HELPING SOMEONE ARRESTED" },
      { id: "bystander.05", name: "FINDING AND SUPPORTING THEM" },
      { id: "bystander.06", name: "WHEN IT IS AT YOUR HOUSE" }
    ]
  },
  {
    id: "jail", name: "JAIL", live: false,
    blurb: "Booking, the phone call, visits, and what pretrial detention actually is.",
    icon: ICONS.jail,
    chapters: [
      { id: "jail.01", name: "BOOKING" },
      { id: "jail.02", name: "YOUR PHONE CALL" },
      { id: "jail.03", name: "VISITATION AND MAIL" },
      { id: "jail.04", name: "MEDICAL AND GRIEVANCES" },
      { id: "jail.05", name: "MONEY AND TELECOM" },
      { id: "jail.06", name: "WHAT PRETRIAL DETENTION IS" }
    ]
  },
  {
    id: "court", name: "THE COURTHOUSE", live: false,
    blurb: "Arraignment, bail, the public defender, and the plea.",
    icon: ICONS.court,
    chapters: [
      { id: "court.01", name: "ARRAIGNMENT" },
      { id: "court.02", name: "BAIL AND PRETRIAL RELEASE" },
      { id: "court.03", name: "THE PUBLIC DEFENDER" },
      { id: "court.04", name: "THE PLEA" },
      { id: "court.05", name: "YOUR HEARING" },
      { id: "court.06", name: "VERDICT AND SENTENCING" }
    ]
  },
  {
    id: "after", name: "AFTER THE CHARGE", live: false,
    blurb: "Probation, fines, your record, and what follows you afterward.",
    icon: ICONS.after,
    chapters: [
      { id: "after.01", name: "PROBATION AND PAROLE" },
      { id: "after.02", name: "FINES AND FEES" },
      { id: "after.03", name: "YOUR RECORD" },
      { id: "after.04", name: "EXPUNGEMENT" },
      { id: "after.05", name: "COLLATERAL CONSEQUENCES" },
      { id: "after.06", name: "GETTING HELP" }
    ]
  }
];

// The one playable entry. Not a district: it deals from the whole bank by
// difficulty, which is what the game does today.
export const FULL_DECK = {
  id: "all", name: "ALL RIGHTS",
  blurb: "Fifteen questions pulled from everything we have so far.",
  icon: ICONS.allrights,
};

const TOTAL_CHAPTERS = DISTRICTS.reduce((n, d) => n + d.chapters.length, 0);

// A fresh, empty session. Progress is never persisted (see state.js), so the map
// reads from a new session every mount: today that means the tutorial is not
// cleared and every district reads LOCKED. When a district goes live and the
// session model is wired through, the same code lights up automatically.
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
// Fills with gold as chapters clear. While a district is coming-soon every
// segment reads locked, which is honest: it shows the shape of what is coming.
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
function DistrictCard({ district, selected, onSelect, onPlay }) {
  const live = district.live;
  const dc = district.chapters.filter(
    (_, i) => chapterStatus(SESSION, district, i) === STATUS.CLEARED
  ).length;
  const total = district.chapters.length;
  const active = selected;

  return c.jsxs("button", {
    onClick: () => { onSelect(district.id); if (live && onPlay) onPlay(); },
    onMouseEnter: () => onSelect(district.id),
    "aria-label": live
      ? `Play ${district.name}. ${district.blurb}`
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
// Shows the selected district's blurb and every chapter as a state-coloured tag.
// Driven by selection, which is set on hover (desktop) or tap (touch), so it is
// not a hover-only feature that dies on phones.
function ChapterPanel({ district }) {
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
              return c.jsxs("span", {
                style: {
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontFamily: C.mono, fontSize: 9, letterSpacing: 0.8,
                  background: st.fill, color: st.text,
                  border: `2px solid ${st.border}`, borderRadius: 5,
                  padding: "4px 8px"
                },
                children: [
                  c.jsxs("span", {
                    style: { opacity: 0.7, fontWeight: 700 },
                    children: [String(i + 1).padStart(2, "0")]
                  }),
                  ch.name
                ]
              }, ch.id);
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
// MapScreen
// ---------------------------------------------------------------------------
export function MapScreen({ onPlayFullDeck, onHome }) {
  const [selected, setSelected] = useState(null);
  const clearedChapters = Math.round(completion(SESSION, DISTRICTS) * TOTAL_CHAPTERS);
  const selectedDistrict = DISTRICTS.find((d) => d.id === selected) || null;

  return c.jsx("div", {
    style: {
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "48px 24px 78px"
    },
    children: c.jsxs("div", {
      style: { width: "100%", maxWidth: 940 },
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
                      children: [" / ", String(TOTAL_CHAPTERS)]
                    })
                  ]
                })
              ]
            })
          ]
        }),

        // Live entry
        c.jsxs("div", {
          style: {
            background: u.surface, border: `2px solid ${u.outline}`,
            borderRadius: 12, boxShadow: U.lg, padding: "18px 22px",
            display: "flex", alignItems: "center", gap: 20,
            flexWrap: "wrap", marginBottom: 30
          },
          children: [
            c.jsx("svg", {
              viewBox: "0 0 100 100", width: 56, height: 56, "aria-hidden": true,
              style: { flexShrink: 0 },
              children: FULL_DECK.icon()
            }),
            c.jsxs("div", { style: { flex: "1 1 260px", minWidth: 0 }, children: [
              c.jsxs("div", {
                style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
                children: [
                  c.jsx("span", {
                    style: {
                      fontFamily: C.display, fontSize: 22, letterSpacing: 1,
                      color: u.text, textTransform: "uppercase"
                    },
                    children: FULL_DECK.name
                  }),
                  c.jsx("span", {
                    style: {
                      fontFamily: C.mono, fontSize: 8.5, fontWeight: 700, letterSpacing: 1.2,
                      background: u.brand, color: u.textOnDark,
                      border: `2px solid ${u.outline}`, borderRadius: 5, padding: "2px 7px"
                    },
                    children: "OPEN NOW"
                  })
                ]
              }),
              c.jsx("div", {
                style: {
                  fontFamily: C.body, fontSize: 13.5, lineHeight: 1.55,
                  color: u.textDim, marginTop: 5
                },
                children: FULL_DECK.blurb
              })
            ] }),
            c.jsx(Button, {
              onClick: onPlayFullDeck, variant: "primary", size: "md",
              style: { flexShrink: 0 }, children: "Play"
            })
          ]
        }),

        // Roadmap divider
        c.jsxs("div", {
          style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
          children: [
            c.jsx("span", {
              style: {
                fontFamily: C.mono, fontSize: 10, letterSpacing: 2.4,
                color: u.textMuted, whiteSpace: "nowrap"
              },
              children: "DISTRICTS COMING SOON"
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
          children: DISTRICTS.map((d) => c.jsx(DistrictCard, {
            district: d,
            selected: selected === d.id,
            onSelect: setSelected
          }, d.id))
        }),

        // Chapter detail panel (hover on desktop, tap on touch)
        c.jsx(ChapterPanel, { district: selectedDistrict }),

        // Legend
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
              children: "Each district is a place where rights actually come up. The questions for these are being written and attorney reviewed now."
            }),
            c.jsx(Button, {
              onClick: onHome, variant: "ghost", size: "sm",
              style: { fontSize: 13 }, children: "\u2190 Home"
            })
          ]
        })
      ]
    })
  });
}
