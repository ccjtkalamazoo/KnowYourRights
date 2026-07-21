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
      "WHAT IS DIFFERENT RIGHT NOW",
      "AT SCHOOL",
      "PARENTS AND NOTIFICATION",
      "JUVENILE COURT AND DETENTION",
      "CHARGED AS AN ADULT",
      "TURNING 17 AND YOUR RECORD"
    ]
  },
  {
    id: "stop", name: "THE STOP", live: false,
    blurb: "Stopped on the street. Are you being held, and what do you have to give?",
    icon: ICONS.stop,
    chapters: [
      "AM I FREE TO GO",
      "REASONABLE SUSPICION",
      "WHAT YOU MUST GIVE",
      "THE PAT DOWN",
      "HOW LONG IT LASTS",
      "WHEN IT BECOMES AN ARREST"
    ]
  },
  {
    id: "arrest", name: "THE ARREST", live: false,
    blurb: "The handcuffs change everything. What is different the moment they go on.",
    icon: ICONS.arrest,
    chapters: [
      "PROBABLE CAUSE",
      "WHAT CHANGES NOW",
      "SEARCH INCIDENT TO ARREST",
      "USE OF FORCE",
      "YOUR PROPERTY",
      "THE FIRST HOURS"
    ]
  },
  {
    id: "saying", name: "WHAT YOU SAY", live: false,
    blurb: "Silence, counsel, and why the words have to be out loud.",
    icon: ICONS.saying,
    chapters: [
      "INVOKING SILENCE",
      "ASKING FOR A LAWYER",
      "WHEN MIRANDA APPLIES",
      "CUSTODY VS CONVERSATION",
      "WHO IS ASKING",
      "WHY TALKING RARELY HELPS"
    ]
  },
  {
    id: "bystander", name: "THE BYSTANDER", live: false,
    blurb: "When it is happening to someone else. Filming, helping, being a passenger.",
    icon: ICONS.bystander,
    chapters: [
      "WATCHING AND RECORDING",
      "BEING A PASSENGER",
      "BEING A WITNESS",
      "HELPING SOMEONE ARRESTED",
      "FINDING AND SUPPORTING THEM",
      "WHEN IT IS AT YOUR HOUSE"
    ]
  },
  {
    id: "jail", name: "JAIL", live: false,
    blurb: "Booking, the phone call, visits, and what pretrial detention actually is.",
    icon: ICONS.jail,
    chapters: [
      "BOOKING",
      "YOUR PHONE CALL",
      "VISITATION AND MAIL",
      "MEDICAL AND GRIEVANCES",
      "MONEY AND TELECOM",
      "WHAT PRETRIAL DETENTION IS"
    ]
  },
  {
    id: "court", name: "THE COURTHOUSE", live: false,
    blurb: "Arraignment, bail, the public defender, and the plea.",
    icon: ICONS.court,
    chapters: [
      "ARRAIGNMENT",
      "BAIL AND PRETRIAL RELEASE",
      "THE PUBLIC DEFENDER",
      "THE PLEA",
      "YOUR HEARING",
      "VERDICT AND SENTENCING"
    ]
  },
  {
    id: "after", name: "AFTER THE CHARGE", live: false,
    blurb: "Probation, fines, your record, and what follows you afterward.",
    icon: ICONS.after,
    chapters: [
      "PROBATION AND PAROLE",
      "FINES AND FEES",
      "YOUR RECORD",
      "EXPUNGEMENT",
      "COLLATERAL CONSEQUENCES",
      "GETTING HELP"
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

// ---------------------------------------------------------------------------
// DistrictCard
// ---------------------------------------------------------------------------
// Printed-paper card: ink border, hard offset shadow, motif band on top. Live
// cards are full contrast and press into their shadow on hover. Coming-soon
// cards are washed back and never move, so "not yet" is legible before you read
// a word.
function DistrictCard({ district, onPlay }) {
  const [hover, setHover] = useState(false);
  const live = district.live;
  const active = live && hover;

  return c.jsxs("button", {
    onClick: live ? onPlay : undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    disabled: !live,
    "aria-label": live
      ? `Play ${district.name}. ${district.blurb}`
      : `${district.name}, coming soon. ${district.chapters.length} chapters planned.`,
    style: {
      textAlign: "left", padding: 0, font: "inherit",
      background: live ? u.surface : u.surfaceWarm,
      border: `2px solid ${live ? u.outline : u.borderLight}`,
      borderRadius: 10,
      boxShadow: live ? (active ? U.md : U.lg) : "none",
      transform: active ? "translate(2px, 2px)" : "translate(0, 0)",
      transition: "transform 0.08s, box-shadow 0.08s",
      cursor: live ? "pointer" : "default",
      overflow: "hidden", position: "relative",
      opacity: live ? 1 : 0.72
    },
    children: [
      // Motif band
      c.jsxs("div", {
        style: {
          position: "relative", height: 96,
          background: live ? u.brandSofter : u.bgWarm,
          borderBottom: `2px solid ${live ? u.outline : u.borderLight}`,
          display: "flex", alignItems: "center", justifyContent: "center"
        },
        children: [
          c.jsx("svg", {
            viewBox: "0 0 100 100", width: 68, height: 68, "aria-hidden": true,
            // The icons carry their own fills, so a coming-soon card cannot be
            // muted by swapping a stroke colour the way a single-path glyph
            // could. Desaturating the whole group is what dims them instead.
            style: live ? undefined : { filter: "grayscale(0.75)", opacity: 0.55 },
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
          c.jsx("div", {
            style: {
              fontFamily: C.body, fontSize: 11.5, lineHeight: 1.45,
              color: u.textMuted, marginTop: 5, minHeight: 33
            },
            children: district.blurb
          }),
          c.jsx("div", {
            style: {
              fontFamily: C.mono, fontSize: 9, letterSpacing: 1.1,
              color: live ? u.brand : u.textMuted, marginTop: 8,
              fontWeight: live ? 700 : 400
            },
            children: live ? "PLAY \u2192" : `${district.chapters.length} CHAPTERS PLANNED`
          })
        ]
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// MapScreen
// ---------------------------------------------------------------------------
// The launcher. Sits between the walkthrough and the quiz.
//
//   onPlayFullDeck : start the existing 15-question run
//   onHome         : back to the start screen
export function MapScreen({ onPlayFullDeck, onHome }) {
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
                  children: "DISTRICTS IN THE WORKS"
                }),
                c.jsxs("div", {
                  style: { fontFamily: C.mono, fontSize: 20, fontWeight: 700, color: u.text },
                  children: [String(DISTRICTS.length), c.jsx("span", {
                    style: { color: u.textMuted, fontSize: 13 },
                    children: ` \u00b7 ${TOTAL_CHAPTERS} CHAPTERS`
                  })]
                })
              ]
            })
          ]
        }),

        // The live entry, on its own row so it is not mistaken for a district
        c.jsxs("div", {
          style: {
            background: u.surface, border: `2px solid ${u.outline}`,
            borderRadius: 12, boxShadow: U.lg, padding: "18px 22px",
            display: "flex", alignItems: "center", gap: 20,
            flexWrap: "wrap", marginBottom: 30
          },
          children: [
            c.jsx("svg", {
              viewBox: "0 0 100 100", width: 60, height: 60, "aria-hidden": true,
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
          children: DISTRICTS.map((d) => c.jsx(DistrictCard, { district: d }, d.id))
        }),

        // Footer note + home
        c.jsxs("div", {
          style: {
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 16, flexWrap: "wrap", marginTop: 26
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
