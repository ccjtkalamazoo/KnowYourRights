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
// The districts. Content roadmap.
// ---------------------------------------------------------------------------
// `icon` is an SVG path drawn on a 100x92 viewBox: single stroke, no fill. Line
// art rather than glyphs, so it matches the printed-paper look and adds no icon
// library dependency.
export const DISTRICTS = [
  {
    id: "juvenile", name: "JUVENILE", live: false,
    blurb: "What is different because you are under 17, and what changes when you are not.",
    icon: "M50,20 C58,20 64,26 64,34 C64,42 58,48 50,48 C42,48 36,42 36,34 C36,26 42,20 50,20 M26,78 C26,62 37,54 50,54 C63,54 74,62 74,78",
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
    icon: "M50,20 L50,74 M50,20 C62,20 70,28 70,38 C70,48 62,54 50,54 M26,74 L74,74",
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
    icon: "M28,34 C38,34 46,42 46,52 C46,62 38,70 28,70 C18,70 10,62 10,52 C10,42 18,34 28,34 M72,34 C82,34 90,42 90,52 C90,62 82,70 72,70 C62,70 54,62 54,52 C54,42 62,34 72,34 M28,44 C32,44 36,48 36,52 C36,56 32,60 28,60 M72,44 C68,44 64,48 64,52 C64,56 68,60 72,60 M46,52 L54,52",
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
    icon: "M22,28 L78,28 L78,60 L44,60 L30,72 L30,60 L22,60 Z M38,40 L62,40 M38,50 L54,50",
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
    icon: "M34,30 C41,30 46,35 46,42 C46,49 41,54 34,54 C27,54 22,49 22,42 C22,35 27,30 34,30 M14,80 C14,66 22,58 34,58 C46,58 54,66 54,80 M68,38 C74,38 79,43 79,49 C79,55 74,60 68,60 M60,80 C60,70 63,64 70,64 C79,64 84,71 84,80",
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
    icon: "M20,22 L80,22 L80,78 L20,78 Z M35,22 L35,78 M50,22 L50,78 M65,22 L65,78",
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
    icon: "M50,18 L50,72 M28,32 L72,32 M34,32 L34,64 M50,32 L50,64 M66,32 L66,64 M22,72 L78,72 M28,26 L72,26 L50,14 Z",
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
    icon: "M28,18 L64,18 L74,30 L74,80 L28,80 Z M64,18 L64,30 L74,30 M38,44 L64,44 M38,56 L64,56 M38,68 L54,68",
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
  icon: "M50,16 L78,28 L78,52 C78,68 66,78 50,82 C34,78 22,68 22,52 L22,28 Z M50,34 L50,58 M50,64 L50,66"
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
          position: "relative", height: 88,
          background: live ? u.brandSofter : u.bgWarm,
          borderBottom: `2px solid ${live ? u.outline : u.borderLight}`,
          display: "flex", alignItems: "center", justifyContent: "center"
        },
        children: [
          c.jsx("svg", {
            viewBox: "0 0 100 92", width: 68, height: 62, "aria-hidden": true,
            children: c.jsx("path", {
              d: district.icon, fill: "none",
              stroke: live ? u.outline : u.textMuted,
              strokeWidth: 3.6, strokeLinecap: "round", strokeLinejoin: "round",
              opacity: live ? 0.9 : 0.45
            })
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
              viewBox: "0 0 100 92", width: 54, height: 50, "aria-hidden": true,
              style: { flexShrink: 0 },
              children: c.jsx("path", {
                d: FULL_DECK.icon, fill: "none", stroke: u.outline,
                strokeWidth: 3.6, strokeLinecap: "round", strokeLinejoin: "round"
              })
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
