// Know Your Rights · CCJT
// district.js : the screen for one district.
//
// ---------------------------------------------------------------------------
// THE PAGE HAS ONE JOB
// ---------------------------------------------------------------------------
// Make the next chapter obvious, and let everything else be found rather than
// shown. Two folds and one loud card between them:
//
//   WHAT THIS COVERS   folded. Answers "is this topic for me", which matters
//                      once, before the first chapter, and never again.
//   THE NOTICE         open, and deliberately the only terra thing on the page.
//   YOUR NEXT CHAPTER  the only filled button on the screen.
//   ALL CHAPTERS       folded. Everything is reachable, nothing is in the way.
//
// The version before this showed all of it at once and a player had to work out
// that the chapter rows were tappable. Two Play buttons of equal weight was the
// same failure in a different shape: if everything is the answer, nothing is.
//
// ---------------------------------------------------------------------------
// ORDER IS SHOWN, NOT ENFORCED
// ---------------------------------------------------------------------------
// Nothing is saved, so a locked chapter 2 would be locked again for every new
// player and every refresh: unreachable in practice. Instead the next chapter
// is the only thing with a filled button, the list under it is quiet, and
// somebody who opens the list and jumps ahead gets advice rather than a
// refusal. The nudge fires on Play and never on opening the fold, so browsing
// can never trigger it.
//
// ---------------------------------------------------------------------------
// THE STATS ARE HONEST ABOUT BEING SESSION-ONLY
// ---------------------------------------------------------------------------
// Attempts and best score come from state.js and die with the tab, so they read
// as empty most of the time. The line at the bottom says why, once. When
// community numbers exist (a nightly aggregate from D1, not a live query) they
// belong on the chapter rows beside the session ones.

import { c, u, C, U, useState, useEffect } from "./theme.js";
import { Button, ConfirmModal } from "./ui.js";
import { CHAPTER_DECK_SIZE, LIVES_PER_ROUND } from "./rules.js";
import { chapterStats, districtProgress, firstUnclearedIndex, hasUnclearedBefore } from "./state.js";
import { R } from "./copy.js";

// ---------------------------------------------------------------------------
// Styles that cannot be inline
// ---------------------------------------------------------------------------
// Hover and the mobile breakpoint need real CSS. Injected once, guarded by id,
// so importing this module twice cannot duplicate the tag. Everything else on
// the screen stays inline, the same as the rest of the game.
//
// The breakpoint exists because this screen has three fixed-width things (the
// district icon, the play button, the medallions) and a phone is 320-390px
// wide. Without it the header icon ends up alone on its own row with dead space
// beside it, which reads as a bug rather than a layout.
function injectDistrictStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("kyr-district-styles")) return;
  const el = document.createElement("style");
  el.id = "kyr-district-styles";
  el.textContent = `
.kyr-fold-head { transition: transform .1s, box-shadow .1s; }
.kyr-fold-head:hover { transform: translate(-1px, -1px); }
.kyr-chapter-row { transition: transform .1s, box-shadow .1s; }
.kyr-chapter-row:hover { transform: translate(-1px, -1px); }
@media (max-width: 640px) {
  .kyr-district-shell { padding: 26px 16px 70px !important; }
  .kyr-district-icon { width: 62px !important; height: 62px !important; }
  .kyr-district-icon svg { width: 42px !important; height: 42px !important; }
  .kyr-district-head { gap: 14px !important; }
  .kyr-district-title { font-size: 27px !important; }
  .kyr-district-blurb { font-size: 14.5px !important; }
  .kyr-next-card { padding: 18px 18px !important; }
  .kyr-next-play { width: 100% !important; }
  .kyr-next-play > button { width: 100% !important; }
  .kyr-fold-body { padding: 14px 14px !important; }
  .kyr-covers-grid { grid-template-columns: 1fr !important; }
}`;
  document.head.appendChild(el);
}

// ---------------------------------------------------------------------------
// Fold : the disclosure card used twice on this page.
// ---------------------------------------------------------------------------
// A plus badge that becomes a minus, and a tap bar across the whole bottom edge
// of the card. Two affordances for one action, deliberately: the badge reads at
// a glance and the bar is a target nobody can miss on a phone.
//
// When open the head loses its bottom corners and its shadow, and the body
// carries them instead, so the two read as one card unfolding rather than a
// panel appearing underneath.
function Fold({ open, onToggle, label, hint, rightSlot, children }) {
  const [hover, setHover] = useState(false);
  return c.jsxs("div", {
    style: { marginBottom: 0 },
    children: [
      c.jsxs("button", {
        className: "kyr-fold-head",
        onClick: onToggle,
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        "aria-expanded": open,
        style: {
          display: "block", width: "100%", padding: 0, font: "inherit", textAlign: "left",
          background: u.surface, border: `2px solid ${u.outline}`,
          borderRadius: open ? "12px 12px 0 0" : 12,
          boxShadow: open ? "none" : (hover ? U.lg : U.md),
          overflow: "hidden", cursor: "pointer",
          WebkitTapHighlightColor: "transparent"
        },
        children: [
          c.jsxs("span", {
            style: { display: "flex", alignItems: "center", gap: 16, padding: "18px 20px 15px" },
            children: [
              // The plus. Two bars, and the vertical one hides when open, which
              // is a minus. Drawn rather than typed so it lines up exactly.
              c.jsxs("span", {
                "aria-hidden": true,
                style: {
                  flexShrink: 0, position: "relative", width: 34, height: 34,
                  borderRadius: 7, background: u.brand, border: `2px solid ${u.outline}`,
                  display: "flex", alignItems: "center", justifyContent: "center"
                },
                children: [
                  c.jsx("span", { style: { position: "absolute", width: 16, height: 3, background: u.textOnDark, borderRadius: 1 } }, "h"),
                  c.jsx("span", { style: { position: "absolute", width: 3, height: 16, background: u.textOnDark, borderRadius: 1, opacity: open ? 0 : 1, transition: "opacity .18s" } }, "v")
                ]
              }),
              c.jsxs("span", {
                style: { flex: 1, minWidth: 0, display: "block" },
                children: [
                  c.jsx("span", {
                    style: { display: "block", fontFamily: C.mono, fontSize: 13, letterSpacing: 1.8, color: u.text, fontWeight: 700 },
                    children: label
                  }),
                  hint && c.jsx("span", {
                    style: { display: "block", fontFamily: C.body, fontSize: 13, color: u.textMuted, marginTop: 3, fontWeight: 500 },
                    children: hint
                  })
                ]
              }),
              rightSlot
            ]
          }),
          c.jsx("span", {
            style: {
              display: "block", background: u.mustardSoft, borderTop: `2px solid ${u.outline}`,
              padding: "10px 20px", fontFamily: C.mono, fontSize: 12, letterSpacing: 1.5,
              fontWeight: 700, color: u.text, textAlign: "center"
            },
            children: open ? R.district.foldClose : R.district.foldOpen
          })
        ]
      }),
      open && c.jsx("div", {
        className: "kyr-fold-body",
        style: {
          border: `2px solid ${u.outline}`, borderTop: "none",
          borderRadius: "0 0 12px 12px", background: u.surface,
          boxShadow: U.md, padding: "18px 20px",
          animation: "ts-fade-in 0.25s ease-out"
        },
        children
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// Notice : the legal-advice card.
// ---------------------------------------------------------------------------
// It used to be a pale card saying "before you start", which announced that a
// notice followed and taught people to skip it. Now the headline is the point
// and the body gives a reason rather than a formula, because a reason gets
// read.
//
// Terra, and the only terra on the page, so the eye lands on it. The scales
// mark keeps it about law rather than danger. It sits directly above the play
// button on purpose: last thing read before the thing they came to press.
function Notice() {
  const N = R.district.notice;
  return c.jsxs("div", {
    style: {
      background: u.terraSoft, border: `3px solid ${u.terra}`, borderRadius: 12,
      boxShadow: U.lg, padding: "20px 22px", margin: "22px 0",
      display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap"
    },
    children: [
      c.jsx("span", {
        "aria-hidden": true,
        style: {
          flexShrink: 0, width: 44, height: 44, borderRadius: "50%",
          background: u.surface, border: `3px solid ${u.terra}`,
          display: "flex", alignItems: "center", justifyContent: "center"
        },
        children: c.jsxs("svg", {
          width: 24, height: 24, viewBox: "0 0 24 24", fill: "none",
          stroke: u.terra, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round",
          children: [
            c.jsx("path", { d: "M12 3v18" }, 0),
            c.jsx("path", { d: "M5 7h14" }, 1),
            c.jsx("path", { d: "M5 7l-3 7h6z" }, 2),
            c.jsx("path", { d: "M19 7l-3 7h6z" }, 3),
            c.jsx("path", { d: "M8 21h8" }, 4)
          ]
        })
      }),
      c.jsxs("div", {
        style: { flex: "1 1 300px", minWidth: 240 },
        children: [
          c.jsx("div", {
            style: { fontFamily: C.display, fontSize: 20, color: u.terra, lineHeight: 1.15, marginBottom: 10 },
            children: N.title
          }),
          c.jsx("p", {
            style: { fontFamily: C.body, fontSize: 14.5, lineHeight: 1.6, color: u.text, margin: 0, fontWeight: 500 },
            children: N.body
          }),
          c.jsx("p", {
            style: { fontFamily: C.body, fontSize: 14.5, lineHeight: 1.6, color: u.text, margin: "8px 0 0", fontWeight: 700 },
            children: N.emphasis
          })
        ]
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// NextChapter : the one thing to do on this page.
// ---------------------------------------------------------------------------
// Brand fill, the heaviest shadow on the screen, and the only filled button.
// Same shape as the demo banner on the map, so a player who has met one already
// knows what this is.
//
// The eyebrow says YOUR NEXT CHAPTER rather than CHAPTER 1, because it
// describes where the player is rather than what the content is. That keeps
// working at chapter 4 of 6, and it makes the order feel like a path instead of
// a rule.
function NextChapter({ chapter, index, total, onPlay }) {
  const D = R.district;
  return c.jsxs("div", {
    className: "kyr-next-card",
    style: {
      background: u.brand, border: `3px solid ${u.outline}`, borderRadius: 14,
      boxShadow: U.lg, padding: "24px 26px", marginBottom: 14
    },
    children: [
      c.jsxs("div", {
        style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
        children: [
          c.jsx("span", {
            style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 2.6, color: u.textOnDark, fontWeight: 700 },
            children: D.nextLabel
          }),
          c.jsx("span", { "aria-hidden": true, style: { flex: 1, height: 2, background: u.textOnDark, opacity: 0.35, borderRadius: 1 } }),
          c.jsx("span", {
            style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 1.4, color: u.textOnDark, opacity: 0.8, fontWeight: 700 },
            children: D.nextCounter(index + 1, total)
          })
        ]
      }),
      c.jsxs("div", {
        style: { display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" },
        children: [
          c.jsxs("div", {
            style: { flex: "1 1 280px", minWidth: 220 },
            children: [
              c.jsx("div", {
                style: { fontFamily: C.mono, fontSize: 16, letterSpacing: 0.6, fontWeight: 700, color: u.textOnDark, lineHeight: 1.3 },
                children: chapter.name
              }),
              chapter.summary && c.jsx("div", {
                style: { fontFamily: C.body, fontSize: 14, lineHeight: 1.55, color: u.textOnDark, opacity: 0.9, marginTop: 8, maxWidth: 440, fontWeight: 500 },
                children: chapter.summary
              })
            ]
          }),
          c.jsxs("div", {
            className: "kyr-next-play",
            style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 7 },
            children: [
              c.jsx(Button, {
                onClick: onPlay, variant: "secondary", size: "md",
                style: { fontSize: 19, padding: "15px 34px" },
                children: D.playLabel
              }),
              c.jsx("div", {
                style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 1.3, color: u.textOnDark, opacity: 0.8, fontWeight: 700 },
                children: D.playMeta(CHAPTER_DECK_SIZE, LIVES_PER_ROUND)
              })
            ]
          })
        ]
      })
    ]
  });
}

// Shown in place of NextChapter once every live chapter is cleared. A player who
// finished should be told so, not handed a fourth invitation to start something.
function TopicComplete() {
  const D = R.district;
  return c.jsxs("div", {
    className: "kyr-next-card",
    style: {
      background: u.brandSofter, border: `3px solid ${u.outline}`, borderRadius: 14,
      boxShadow: U.lg, padding: "22px 26px", marginBottom: 14
    },
    children: [
      c.jsx("div", {
        style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 2.6, color: u.brand, fontWeight: 700, marginBottom: 8 },
        children: D.doneLabel
      }),
      c.jsx("div", {
        style: { fontFamily: C.display, fontSize: 22, color: u.text, lineHeight: 1.15, marginBottom: 8 },
        children: D.doneTitle
      }),
      c.jsx("p", {
        style: { fontFamily: C.body, fontSize: 14.5, lineHeight: 1.6, color: u.textDim, margin: 0, fontWeight: 500, maxWidth: 520 },
        children: D.doneBody
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// ChapterRow : one line in the ALL CHAPTERS fold.
// ---------------------------------------------------------------------------
// Quiet by design. The whole row is the target, and Play is text rather than a
// filled button, so nothing here competes with the gold card above.
function ChapterRow({ chapter, index, session, isNext, onPlay }) {
  const [hover, setHover] = useState(false);
  const stats = chapterStats(session, chapter.id);
  const playable = chapter.live;
  const D = R.district;

  let statLine;
  if (!playable) statLine = D.soonBody;
  else if (stats.attempts === 0) statLine = D.notPlayedLabel;
  else {
    const bits = [D.attemptsLabel(stats.attempts)];
    if (stats.deckSize) bits.push(D.bestLabel(stats.bestCorrect, stats.deckSize));
    if (stats.cleared) bits.push(D.clearedLabel);
    statLine = bits.join(" \u00B7 ");
  }

  const box = {
    display: "flex", alignItems: "center", gap: 14, width: "100%",
    textAlign: "left", font: "inherit",
    background: u.surface,
    border: `2px solid ${playable ? u.outline : u.borderLight}`,
    borderRadius: 10,
    boxShadow: playable ? (hover ? U.md : U.sm) : "none",
    padding: "14px 16px", flexWrap: "wrap",
    opacity: playable ? 1 : 0.75
  };

  const inner = [
    c.jsx("span", {
      "aria-hidden": true,
      style: {
        flexShrink: 0, width: 34, height: 34, borderRadius: "50%",
        background: stats.cleared || isNext ? u.brand : u.surface,
        border: `2px solid ${playable ? u.outline : u.borderLight}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: C.display, fontSize: 16, lineHeight: 1,
        color: stats.cleared || isNext ? u.textOnDark : (playable ? u.text : u.textMuted)
      },
      children: stats.cleared ? "\u2713" : String(index + 1)
    }, "num"),
    c.jsxs("span", {
      style: { flex: "1 1 220px", minWidth: 180, display: "block" },
      children: [
        c.jsx("span", {
          style: {
            display: "block", fontFamily: C.mono, fontSize: 12.5, letterSpacing: 0.6,
            fontWeight: 700, color: playable ? u.text : u.textDim, lineHeight: 1.35
          },
          children: chapter.name
        }),
        c.jsx("span", {
          style: {
            display: "block", fontFamily: C.mono, fontSize: 11, letterSpacing: 1.2,
            color: u.textMuted, fontWeight: 700, marginTop: 4, textTransform: "uppercase"
          },
          children: statLine
        })
      ]
    }, "text"),
    c.jsx("span", {
      style: {
        flexShrink: 0, fontFamily: C.mono, fontSize: 12, fontWeight: 700,
        letterSpacing: 1.4, textTransform: "uppercase",
        color: !playable ? u.textMuted : isNext ? u.brand : u.textDim
      },
      children: playable ? D.chapterPlayLabel : D.soonLabel
    }, "cta")
  ];

  if (!playable) {
    return c.jsx("div", { style: { ...box, cursor: "default" }, children: inner });
  }
  return c.jsx("button", {
    className: "kyr-chapter-row",
    onClick: () => onPlay(chapter, index),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    "aria-label": `Play ${chapter.name}`,
    style: { ...box, cursor: "pointer", WebkitTapHighlightColor: "transparent" },
    children: inner
  });
}

// ---------------------------------------------------------------------------
// DistrictScreen
// ---------------------------------------------------------------------------
export function DistrictScreen({ district, session, onPlayChapter, onBack }) {
  const [coversOpen, setCoversOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [nudge, setNudge] = useState(null); // { chapter, index }
  const D = R.district;

  useEffect(() => { injectDistrictStyles(); }, []);

  const prog = districtProgress(session, district);
  const nextIdx = firstUnclearedIndex(session, district);
  const nextChapter = nextIdx >= 0 ? district.chapters[nextIdx] : null;

  // Play is where the order check happens, and it only fires when there is a
  // LIVE uncleared chapter earlier in the list. A gap the content has not filled
  // yet is not the player skipping anything, and the next chapter itself can
  // never trigger it.
  const requestPlay = (chapter, index) => {
    if (hasUnclearedBefore(session, district, index)) setNudge({ chapter, index });
    else onPlayChapter(district, chapter);
  };

  const nudgeTarget = nudge
    ? district.chapters.slice(0, nudge.index).filter((ch) => ch.live)
        .find((ch) => !chapterStats(session, ch.id).cleared)
    : null;

  // The progress pips in the ALL CHAPTERS head. Live chapters only, because a
  // coming-soon square would be a hole the player cannot fill.
  const pips = district.chapters.filter((ch) => ch.live).map((ch) => {
    const done = chapterStats(session, ch.id).cleared;
    return c.jsx("span", {
      style: {
        width: 14, height: 14, borderRadius: 3,
        background: done ? u.brand : u.surface,
        border: `2px solid ${done ? u.outline : u.brandSoft}`
      }
    }, ch.id);
  });

  return c.jsxs("div", {
    className: "kyr-district-shell",
    style: { flex: "1 0 auto", display: "flex", justifyContent: "center", padding: "40px 24px 78px" },
    children: [
      c.jsxs("div", { style: { width: "100%", maxWidth: 860 }, children: [

        c.jsx("div", { style: { marginBottom: 20 }, children:
          c.jsx(Button, { onClick: onBack, variant: "secondary", size: "sm", style: { fontSize: 13 }, children: D.backLabel })
        }),

        // Header. The icon is the main thing tying this screen to the card the
        // player just tapped on the map.
        c.jsxs("div", {
          className: "kyr-district-head",
          style: { display: "flex", alignItems: "flex-start", gap: 22, flexWrap: "wrap", marginBottom: 24 },
          children: [
            district.icon && c.jsx("div", {
              className: "kyr-district-icon",
              style: {
                flexShrink: 0, width: 92, height: 92, borderRadius: 12,
                background: u.brandSofter, border: `2px solid ${u.outline}`,
                boxShadow: U.md, display: "flex", alignItems: "center", justifyContent: "center"
              },
              children: c.jsx("svg", { viewBox: "0 0 100 100", width: 62, height: 62, "aria-hidden": true, children: district.icon() })
            }),
            c.jsxs("div", { style: { flex: "1 1 320px", minWidth: 240 }, children: [
              c.jsx("h1", {
                className: "kyr-district-title",
                style: { fontFamily: C.display, fontSize: 34, letterSpacing: -0.5, color: u.text, margin: 0, lineHeight: 1.02 },
                children: district.name
              }),
              c.jsx("p", {
                className: "kyr-district-blurb",
                style: { fontFamily: C.body, fontSize: 15.5, lineHeight: 1.6, color: u.textDim, fontWeight: 500, margin: "10px 0 0", maxWidth: 520 },
                children: district.blurb
              })
            ] })
          ]
        }),

        district.covers && district.covers.length > 0 && c.jsx(Fold, {
          open: coversOpen,
          onToggle: () => setCoversOpen((v) => !v),
          label: D.coversLabel,
          hint: D.coversHint(district.covers.length),
          children: c.jsx("div", {
            className: "kyr-covers-grid",
            style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "9px 22px" },
            children: district.covers.map((line, i) => c.jsxs("div", {
              style: { display: "flex", gap: 10, alignItems: "flex-start" },
              children: [
                c.jsx("span", {
                  "aria-hidden": true,
                  style: { flexShrink: 0, width: 7, height: 7, borderRadius: 2, marginTop: 7, background: u.brand, border: `1px solid ${u.outline}` }
                }),
                c.jsx("span", {
                  style: { fontFamily: C.body, fontSize: 14.5, lineHeight: 1.5, color: u.textDim, fontWeight: 500 },
                  children: line
                })
              ]
            }, i))
          })
        }),

        c.jsx(Notice, {}),

        nextChapter
          ? c.jsx(NextChapter, {
              chapter: nextChapter, index: nextIdx, total: prog.total,
              onPlay: () => requestPlay(nextChapter, nextIdx)
            })
          : c.jsx(TopicComplete, {}),

        c.jsx(Fold, {
          open: listOpen,
          onToggle: () => setListOpen((v) => !v),
          label: D.allChaptersLabel,
          hint: D.allChaptersHint(prog.total, prog.cleared),
          rightSlot: c.jsx("span", {
            "aria-hidden": true,
            style: { flexShrink: 0, display: "flex", gap: 5, alignItems: "center" },
            children: pips
          }),
          children: c.jsx("div", {
            style: { display: "flex", flexDirection: "column", gap: 10 },
            children: district.chapters.map((ch, i) => c.jsx(ChapterRow, {
              chapter: ch, index: i, session, isNext: i === nextIdx, onPlay: requestPlay
            }, ch.id))
          })
        }),

        c.jsx("p", {
          style: { fontFamily: C.body, fontSize: 12.5, lineHeight: 1.6, color: u.textMuted, margin: "20px 0 0", maxWidth: 560, fontWeight: 500 },
          children: D.sessionNote
        })

      ] }),

      nudge && nudgeTarget && c.jsx(ConfirmModal, {
        title: D.orderTitle,
        body: D.orderBody(nudgeTarget.name),
        primaryLabel: D.orderPrimary,
        secondaryLabel: D.orderSecondary,
        primaryVariant: "primary",
        onPrimary: () => { const n = nudge; setNudge(null); onPlayChapter(district, n.chapter); },
        onSecondary: () => {
          const t = nudgeTarget;
          setNudge(null);
          setListOpen(false);
          if (typeof window !== "undefined") window.scrollTo(0, 0);
          onPlayChapter(district, t);
        }
      })
    ]
  });
}
