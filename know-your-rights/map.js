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
// (5 easy, 5 medium, 5 hard) exactly as before. It is deliberately NOT one of
// the eight districts: labeling 72 untagged questions as "THE CORNER" would
// create a data lie that has to be undone later when the questions actually get
// tagged.
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
    id: "school", name: "THE SCHOOL", live: false,
    blurb: "Lockers, backpacks, phones, the office.",
    icon: "M20,44 L50,26 L80,44 L80,70 L20,70 Z M44,70 L44,54 L56,54 L56,70",
    chapters: ["THE LOCKER", "YOUR PHONE", "THE OFFICE", "THE HALLWAY", "THE RESOURCE OFFICER"]
  },
  {
    id: "porch", name: "THE PORCH", live: false,
    blurb: "A knock at the door. Warrants and consent.",
    icon: "M18,46 L50,22 L82,46 M26,46 L26,72 L74,72 L74,46 M42,72 L42,52 L58,52 L58,72",
    chapters: ["THE KNOCK", "THE WARRANT", "SAYING NO", "WHO CAN CONSENT", "HOT PURSUIT", "AFTER THEY LEAVE"]
  },
  {
    id: "downtown", name: "DOWNTOWN", live: false,
    blurb: "Filming, protesting, being in public.",
    icon: "M22,72 L22,30 L44,30 L44,72 M52,72 L52,18 L74,18 L74,72 M28,40 L38,40 M28,52 L38,52 M58,30 L68,30 M58,44 L68,44",
    chapters: ["RECORDING POLICE", "THE PROTEST", "DISPERSAL ORDERS", "PRESS AND BYSTANDERS", "AFTER THE ARREST"]
  },
  {
    id: "road", name: "THE ROAD", live: false,
    blurb: "Pulled over. License, searches, consent.",
    icon: "M16,66 L84,66 M16,52 L28,52 M40,52 L60,52 M72,52 L84,52 M30,38 L44,26 L62,26 L70,38 L70,48 L30,48 Z",
    chapters: ["PULLED OVER", "STEP OUT", "SEARCH MY CAR", "PASSENGERS", "THE K9", "THE TICKET"]
  },
  {
    id: "corner", name: "THE CORNER", live: false,
    blurb: "Stopped on the street. Do you give your name?",
    icon: "M50,20 L50,74 M50,20 C62,20 70,28 70,38 C70,48 62,54 50,54 M26,74 L74,74",
    chapters: ["THE STOP", "AM I FREE TO GO", "YOUR NAME", "THE PAT DOWN", "THE QUESTIONS", "YOUR POCKETS", "WALKING AWAY"]
  },
  {
    id: "station", name: "THE STATION", live: false,
    blurb: "Arrest, booking, Miranda, a phone call.",
    icon: "M50,20 L76,30 L76,50 C76,64 64,74 50,78 C36,74 24,64 24,50 L24,30 Z M40,48 L47,56 L62,40",
    chapters: ["THE ARREST", "MIRANDA", "THE INTERVIEW", "YOUR CALL", "BOOKING", "THE LAWYER", "GETTING OUT"]
  },
  {
    id: "court", name: "THE COURTHOUSE", live: false,
    blurb: "Arraignment, bail, having a lawyer.",
    icon: "M50,18 L50,72 M28,32 L72,32 M34,32 L34,64 M50,32 L50,64 M66,32 L66,64 M22,72 L78,72 M28,26 L72,26 L50,14 Z",
    chapters: ["ARRAIGNMENT", "BAIL", "THE PUBLIC DEFENDER", "THE PLEA", "YOUR HEARING", "THE RECORD"]
  },
  {
    id: "commons", name: "THE COMMONS", live: false,
    blurb: "Complaints, records, pushing back.",
    icon: "M50,74 L50,44 M50,44 C36,44 26,34 26,22 C40,22 50,32 50,44 M50,44 C64,44 74,34 74,22 C60,22 50,32 50,44 M32,74 L68,74",
    chapters: ["THE COMPLAINT", "BODY CAMERA", "PUBLIC RECORDS", "THE REVIEW BOARD", "EXPUNGEMENT"]
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
