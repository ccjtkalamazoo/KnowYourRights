// Know Your Rights · CCJT
// district.js : the screen for one district.
//
// ---------------------------------------------------------------------------
// WHY THIS IS A SCREEN AND NOT A PANEL
// ---------------------------------------------------------------------------
// Picking a district used to open a chapter list inside the map grid. It was a
// pale slab spanning all four columns, wider than the card that opened it, with
// rows that read like a settings list. It did not look like the rest of the
// game, and it had nowhere to put anything except chapter names.
//
// A whole screen has room for the three things that were missing: what the
// topic actually covers, the legal-advice notice said once instead of twice,
// and the chapters shown in an order a player can see at a glance.
//
// ---------------------------------------------------------------------------
// ORDER IS SHOWN, NOT ENFORCED
// ---------------------------------------------------------------------------
// Nothing is saved, so a locked chapter 2 would be locked again for every new
// player and every refresh: unreachable in practice. Instead the order is drawn
// (numbers, a spine down the left, the first unplayed one marked START HERE),
// and somebody who jumps ahead gets a dialog that recommends the earlier
// chapter and then lets them through anyway. Nobody is ever refused.
//
// ---------------------------------------------------------------------------
// THE STATS ARE HONEST ABOUT BEING SESSION-ONLY
// ---------------------------------------------------------------------------
// Attempts and best score come from state.js and die with the tab. That means
// they read as zero most of the time, which would look broken if the screen did
// not say why. It says why, once, at the bottom. When community numbers exist
// (a nightly aggregate from D1, not a live query) they land in the same row as
// the session numbers, which is why StatRow takes a list rather than two fixed
// values.

import { c, u, C, U, useState, useEffect } from "./theme.js";
import { Button, ConfirmModal } from "./ui.js";
import { chapterStats, districtProgress, firstUnclearedIndex, hasUnclearedBefore } from "./state.js";
import { loadChapterNote } from "./content.js";
import { R } from "./copy.js";

// ---------------------------------------------------------------------------
// SectionLabel : the small mono heading used above each block.
// ---------------------------------------------------------------------------
// Same treatment as the map's dividers, so this screen reads as part of the
// same product: mono, wide letter spacing, a rule running off to the right.
function SectionLabel({ children }) {
  return c.jsxs("div", {
    style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 },
    children: [
      c.jsx("span", {
        style: {
          fontFamily: C.mono, fontSize: 10, letterSpacing: 2.4,
          color: u.textMuted, whiteSpace: "nowrap", fontWeight: 700
        },
        children
      }),
      c.jsx("span", {
        "aria-hidden": true,
        style: { flex: 1, height: 2, background: u.borderLight, borderRadius: 1 }
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// CoversList : what the topic teaches.
// ---------------------------------------------------------------------------
// Authored in the district's meta.json. This is the thing a parent or a teacher
// looks for and the map had nowhere to put. Rendered as a real list with small
// brand markers rather than bullets, so it matches the ink-and-paper look.
function CoversList({ items }) {
  if (!items || items.length === 0) return null;
  return c.jsxs("div", { style: { marginBottom: 26 }, children: [
    c.jsx(SectionLabel, { children: R.district.coversLabel }),
    c.jsx("ul", {
      style: {
        listStyle: "none", margin: 0, padding: 0,
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "8px 22px"
      },
      children: items.map((line, i) => c.jsxs("li", {
        style: { display: "flex", gap: 10, alignItems: "flex-start" },
        children: [
          c.jsx("span", {
            "aria-hidden": true,
            style: {
              flexShrink: 0, width: 7, height: 7, borderRadius: 2, marginTop: 7,
              background: u.brand, border: `1px solid ${u.outline}`
            }
          }),
          c.jsx("span", {
            style: { fontFamily: C.body, fontSize: 14.5, lineHeight: 1.5, color: u.textDim, fontWeight: 500 },
            children: line
          })
        ]
      }, i))
    })
  ] });
}

// ---------------------------------------------------------------------------
// DisclaimerCard : the legal-advice notice, said once.
// ---------------------------------------------------------------------------
// It used to appear here AND again in a red box on the pre-round screen, which
// is how one screen ended up with two warnings saying nearly the same thing.
// Now it lives here, quietly, in the same card style as everything else. Red is
// reserved for the safety brief, which is about physical safety and is a
// genuinely different kind of warning.
function DisclaimerCard() {
  return c.jsx("div", {
    style: {
      background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 12,
      boxShadow: U.sm, padding: "16px 20px", marginBottom: 26
    },
    children: c.jsxs("div", { style: { display: "flex", gap: 14, alignItems: "flex-start" }, children: [
      c.jsx("span", {
        "aria-hidden": true,
        style: {
          flexShrink: 0, width: 28, height: 28, borderRadius: "50%",
          background: u.mustardSoft, border: `2px solid ${u.outline}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: C.display, fontSize: 15, color: u.text, lineHeight: 1
        },
        children: "i"
      }),
      c.jsxs("div", { children: [
        c.jsx("div", {
          style: {
            fontFamily: C.mono, fontSize: 10, letterSpacing: 1.6, fontWeight: 700,
            color: u.textMuted, marginBottom: 6
          },
          children: R.disclaimer.title
        }),
        c.jsx("div", {
          style: { fontFamily: C.body, fontSize: 13.5, lineHeight: 1.55, color: u.textDim, fontWeight: 500 },
          children: R.disclaimer.lines.join(" ")
        })
      ] })
    ] })
  });
}

// ---------------------------------------------------------------------------
// StatRow : the session numbers on a chapter card.
// ---------------------------------------------------------------------------
// Takes a list so community numbers can slot in beside the session ones later
// without this component changing shape.
function StatRow({ items }) {
  if (!items.length) return null;
  return c.jsx("div", {
    style: { display: "flex", gap: 14, flexWrap: "wrap", alignItems: "baseline" },
    children: items.map((t, i) => c.jsx("span", {
      style: {
        fontFamily: C.mono, fontSize: 9.5, letterSpacing: 1.2, fontWeight: 700,
        textTransform: "uppercase", color: u.textMuted
      },
      children: t
    }, i))
  });
}

// ---------------------------------------------------------------------------
// ChapterCard
// ---------------------------------------------------------------------------
// Collapsed it is a number, a name, the session stats and a chevron. Expanded
// it also shows that chapter's own safety note and the Start button, which is
// what retired the pre-round screen: the note now sits where the decision is
// being made instead of on a screen of its own after it.
//
// The note is fetched on expand rather than up front, because reading it costs
// a chapter file and drawing this screen should not download every chapter in
// the district.
function ChapterCard({ district, chapter, index, session, expanded, onToggle, onStart }) {
  const [note, setNote] = useState(null);
  const [noteState, setNoteState] = useState("idle"); // idle | loading | done | failed
  const stats = chapterStats(session, chapter.id);
  const startIdx = firstUnclearedIndex(session, district);
  const isStart = index === startIdx;
  const playable = chapter.live;

  useEffect(() => {
    if (!expanded || !playable || noteState !== "idle") return;
    let alive = true;
    setNoteState("loading");
    loadChapterNote(district.id, chapter)
      .then((n) => { if (alive) { setNote(n); setNoteState("done"); } })
      .catch(() => { if (alive) setNoteState("failed"); });
    return () => { alive = false; };
  }, [expanded, playable]); // eslint-disable-line

  const statItems = [];
  if (!playable) {
    // Nothing to report about a chapter that does not exist yet.
  } else if (stats.attempts === 0) {
    statItems.push(R.district.notPlayedLabel);
  } else {
    statItems.push(R.district.attemptsLabel(stats.attempts));
    if (stats.deckSize) statItems.push(R.district.bestLabel(stats.bestCorrect, stats.deckSize));
    if (stats.cleared) statItems.push(R.district.clearedLabel);
  }

  // The number medallion. Gold when cleared or when this is the one to start,
  // quiet otherwise, hollow for coming soon. Same circular treatment as the
  // review-card pips and the tutorial link, so it belongs.
  const medallion = c.jsx("span", {
    "aria-hidden": true,
    style: {
      flexShrink: 0, width: 38, height: 38, borderRadius: "50%",
      background: !playable ? u.surfaceWarm : (stats.cleared || isStart) ? u.brand : u.surface,
      border: `2px solid ${playable ? u.outline : u.borderLight}`,
      boxShadow: playable ? U.sm : "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: C.display, fontSize: 17, lineHeight: 1,
      color: !playable ? u.textMuted : (stats.cleared || isStart) ? u.textOnDark : u.text
    },
    children: stats.cleared ? "\u2713" : String(index + 1)
  });

  const header = c.jsxs(playable ? "button" : "div", {
    onClick: playable ? () => onToggle(expanded ? null : chapter.id) : undefined,
    "aria-expanded": playable ? expanded : undefined,
    "aria-label": playable
      ? `${chapter.name}. Chapter ${index + 1}. ${expanded ? "Hide" : "Show"} details.`
      : `${chapter.name}, coming soon.`,
    style: {
      display: "flex", alignItems: "center", gap: 16, width: "100%",
      textAlign: "left", font: "inherit", background: "transparent",
      border: "none", padding: "16px 18px",
      cursor: playable ? "pointer" : "default",
      WebkitTapHighlightColor: "transparent"
    },
    children: [
      medallion,
      c.jsxs("span", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }, children: [
        c.jsxs("span", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }, children: [
          c.jsx("span", {
            style: {
              fontFamily: C.mono, fontSize: 12, letterSpacing: 0.8, fontWeight: 700,
              color: playable ? u.text : u.textDim
            },
            children: chapter.name
          }),
          isStart && playable && c.jsx("span", {
            style: {
              fontFamily: C.mono, fontSize: 8.5, letterSpacing: 1.4, fontWeight: 700,
              color: u.textOnDark, background: u.brand,
              border: `2px solid ${u.outline}`, borderRadius: 5, padding: "2px 7px"
            },
            children: R.district.startHereLabel
          }),
          !playable && c.jsx("span", {
            style: {
              fontFamily: C.mono, fontSize: 8.5, letterSpacing: 1.4, fontWeight: 700,
              color: u.textMuted, background: u.surface,
              border: `2px solid ${u.borderLight}`, borderRadius: 5, padding: "2px 7px"
            },
            children: R.district.soonLabel
          })
        ] }),
        c.jsx(StatRow, { items: statItems })
      ] }),
      playable && c.jsx("span", {
        "aria-hidden": true,
        style: {
          flexShrink: 0, fontFamily: C.mono, fontSize: 13, fontWeight: 700,
          color: u.textMuted, transform: expanded ? "rotate(180deg)" : "none",
          transition: "transform 0.15s"
        },
        children: "\u2304"
      })
    ]
  });

  let body = null;
  if (!playable) {
    body = c.jsx("div", {
      style: { padding: "0 18px 16px 72px", fontFamily: C.body, fontSize: 13.5, lineHeight: 1.55, color: u.textMuted, fontWeight: 500 },
      children: R.district.soonBody
    });
  } else if (expanded) {
    body = c.jsxs("div", {
      style: {
        padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 16,
        animation: "ts-fade-in 0.25s ease-out"
      },
      children: [
        c.jsxs("div", {
          style: {
            background: u.surfaceHigh, border: `2px solid ${u.borderLight}`,
            borderRadius: 10, padding: "14px 16px"
          },
          children: [
            c.jsx("div", {
              style: {
                fontFamily: C.mono, fontSize: 9.5, letterSpacing: 1.5, fontWeight: 700,
                color: u.textMuted, marginBottom: 6
              },
              children: R.district.noteHeading
            }),
            c.jsx("p", {
              style: { fontFamily: C.body, fontSize: 14, lineHeight: 1.6, color: u.text, margin: 0, fontWeight: 500 },
              children: noteState === "loading" ? R.district.noteLoading
                : noteState === "failed" ? R.district.noteFailed
                : (note || R.district.noteFailed)
            })
          ]
        }),
        c.jsxs("div", { style: { display: "flex", gap: 12, flexWrap: "wrap" }, children: [
          c.jsx(Button, {
            onClick: () => onStart(chapter, index), variant: "primary", size: "md",
            children: R.district.playLabel
          }),
          c.jsx(Button, {
            onClick: () => onToggle(null), variant: "ghost", size: "sm",
            style: { fontSize: 13 }, children: R.district.closeLabel
          })
        ] })
      ]
    });
  }

  return c.jsxs("div", {
    style: {
      background: playable ? u.surface : u.surfaceWarm,
      border: `2px solid ${playable ? u.outline : u.borderLight}`,
      borderRadius: 12,
      boxShadow: playable ? (expanded ? U.lg : U.md) : "none",
      opacity: playable ? 1 : 0.82,
      overflow: "hidden",
      transition: "box-shadow 0.12s"
    },
    children: [header, body]
  });
}

// ---------------------------------------------------------------------------
// OrderNudge : the out-of-order dialog.
// ---------------------------------------------------------------------------
// Fires on Start, never on opening a chapter card, so reading about a chapter
// can never trigger it. The primary action is playing anyway, because that is
// what the player asked for and this is advice rather than a gate.
function OrderNudge({ targetName, onAnyway, onGoThere }) {
  return c.jsx(ConfirmModal, {
    title: R.district.orderTitle,
    body: R.district.orderBody(targetName),
    primaryLabel: R.district.orderPrimary,
    secondaryLabel: R.district.orderSecondary,
    primaryVariant: "primary",
    onPrimary: onAnyway,
    onSecondary: onGoThere
  });
}

// ---------------------------------------------------------------------------
// DistrictScreen
// ---------------------------------------------------------------------------
export function DistrictScreen({ district, session, onPlayChapter, onBack }) {
  const [expanded, setExpanded] = useState(null);
  const [nudge, setNudge] = useState(null); // { chapter, index }
  const prog = districtProgress(session, district);
  const startIdx = firstUnclearedIndex(session, district);

  // Start is where the order check happens, and it only fires when there is a
  // LIVE uncleared chapter earlier in the list. A gap the content has not
  // filled yet is not the player skipping anything.
  const requestStart = (chapter, index) => {
    if (hasUnclearedBefore(session, district, index)) setNudge({ chapter, index });
    else onPlayChapter(district, chapter);
  };

  const nudgeTarget = nudge
    ? district.chapters.slice(0, nudge.index).filter((ch) => ch.live)
        .find((ch) => !chapterStats(session, ch.id).cleared)
    : null;

  return c.jsxs("div", {
    style: {
      flex: "1 0 auto", display: "flex", justifyContent: "center",
      padding: "40px 24px 78px"
    },
    children: [
      c.jsxs("div", { style: { width: "100%", maxWidth: 860 }, children: [
        // Back sits above everything, on its own, so leaving is the first thing
        // findable on the screen rather than something at the bottom.
        c.jsx("div", { style: { marginBottom: 20 }, children:
          c.jsx(Button, { onClick: onBack, variant: "secondary", size: "sm", style: { fontSize: 13 }, children: R.district.backLabel })
        }),

        // Header: the district's own icon, its name, its blurb, and the
        // progress tile. Reusing the map's icon is the main thing tying this
        // screen to the card the player just tapped.
        c.jsxs("div", {
          style: {
            display: "flex", alignItems: "flex-start", gap: 22,
            flexWrap: "wrap", marginBottom: 26
          },
          children: [
            district.icon && c.jsx("div", {
              style: {
                flexShrink: 0, width: 92, height: 92, borderRadius: 12,
                background: u.brandSofter, border: `2px solid ${u.outline}`,
                boxShadow: U.md, display: "flex", alignItems: "center", justifyContent: "center"
              },
              children: c.jsx("svg", {
                viewBox: "0 0 100 100", width: 62, height: 62, "aria-hidden": true,
                children: district.icon()
              })
            }),
            c.jsxs("div", { style: { flex: "1 1 320px", minWidth: 260 }, children: [
              c.jsx("h1", {
                style: {
                  fontFamily: C.display, fontSize: "clamp(30px, 5vw, 44px)",
                  letterSpacing: -0.5, color: u.text, margin: 0, lineHeight: 1.02
                },
                children: district.name
              }),
              c.jsx("p", {
                style: {
                  fontFamily: C.body, fontSize: 15.5, lineHeight: 1.6,
                  color: u.textDim, fontWeight: 500, margin: "10px 0 0", maxWidth: 520
                },
                children: district.blurb
              })
            ] }),
            c.jsxs("div", {
              style: {
                background: u.surface, border: `2px solid ${u.outline}`,
                borderRadius: 10, padding: "10px 18px", boxShadow: U.sm, textAlign: "center"
              },
              children: [
                c.jsx("div", {
                  style: { fontFamily: C.mono, fontSize: 9, letterSpacing: 1.6, color: u.brand, fontWeight: 700 },
                  children: R.district.progressLabel
                }),
                c.jsxs("div", {
                  style: { fontFamily: C.mono, fontSize: 22, fontWeight: 700, color: u.text, lineHeight: 1.2 },
                  children: [
                    String(prog.cleared),
                    c.jsxs("span", { style: { color: u.textMuted, fontSize: 14 }, children: [" / ", String(prog.total)] })
                  ]
                }),
                // The bar reads over LIVE chapters only. Counting coming-soon
                // ones would cap a player at a number they cannot move.
                c.jsx("div", {
                  "aria-hidden": true,
                  style: {
                    marginTop: 6, height: 8, borderRadius: 2, width: 96,
                    background: u.surfaceWarm, border: `2px solid ${u.outline}`, overflow: "hidden"
                  },
                  children: c.jsx("div", {
                    style: { width: `${prog.percent}%`, height: "100%", background: u.brand, transition: "width 0.3s" }
                  })
                }),
                c.jsxs("div", {
                  style: { fontFamily: C.mono, fontSize: 9, letterSpacing: 1.2, color: u.textMuted, fontWeight: 700, marginTop: 5 },
                  children: [String(prog.percent), "%"]
                })
              ]
            })
          ]
        }),

        c.jsx(CoversList, { items: district.covers }),
        c.jsx(DisclaimerCard, {}),

        c.jsx(SectionLabel, { children: R.district.chaptersLabel }),
        c.jsx("div", {
          style: { display: "flex", flexDirection: "column", gap: 12 },
          children: district.chapters.map((ch, i) => c.jsx(ChapterCard, {
            district, chapter: ch, index: i, session,
            expanded: expanded === ch.id,
            onToggle: setExpanded,
            onStart: requestStart
          }, ch.id))
        }),

        // Said once, at the bottom. A player who sees "not played yet" after a
        // refresh should be able to find out why without guessing.
        c.jsx("p", {
          style: {
            fontFamily: C.body, fontSize: 12.5, lineHeight: 1.6, color: u.textMuted,
            margin: "22px 0 0", maxWidth: 560
          },
          children: R.district.sessionNote
        })
      ] }),

      nudge && nudgeTarget && c.jsx(OrderNudge, {
        targetName: nudgeTarget.name,
        onAnyway: () => { const n = nudge; setNudge(null); onPlayChapter(district, n.chapter); },
        onGoThere: () => {
          setNudge(null);
          setExpanded(nudgeTarget.id);
          if (typeof window !== "undefined") window.scrollTo(0, 0);
        }
      })
    ]
  });
}

// The chapter to point somebody at, exported so the map can label a card with
// it later if that turns out to be useful. Nothing calls it yet.
export function startHereIndex(session, district) {
  return firstUnclearedIndex(session, district);
}
