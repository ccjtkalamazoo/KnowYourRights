// Know Your Rights · CCJT
// district.js : the screen for one district.
//
// ---------------------------------------------------------------------------
// THE LAYOUT (chosen 2026-09-17, draft D4)
// ---------------------------------------------------------------------------
// The version before this stacked five heavy cards: a fold, the legal notice,
// the next chapter, another fold, a note. Every card had the same border and
// shadow, the notice was the loudest thing on the page, and Play was fourth
// from the top. It is now two columns:
//
//   HEADER          Round icon, big name, blurb.
//   LEFT: THE PATH  Every chapter in order down a numbered line. The next
//                   chapter is a big filled card with the only big Play button
//                   on the screen. Every other chapter is a quiet row that can
//                   still be tapped.
//   RIGHT: SIDE     WHAT THIS COVERS as a dropdown (closed by default, because
//                   it matters once and then never again), the legal note in a
//                   softer box, and the session-only note.
//
// On a narrow screen the side column drops below the path.
//
// ---------------------------------------------------------------------------
// ORDER IS SHOWN, NOT ENFORCED
// ---------------------------------------------------------------------------
// Nothing is saved, so a locked chapter 2 would be locked again for every new
// player and every refresh: unreachable in practice. Instead the next chapter
// is the only thing with a filled button, the rows around it are quiet, and
// somebody who jumps ahead gets advice rather than a refusal. The nudge fires
// on Play only.
//
// ---------------------------------------------------------------------------
// THE STATS ARE HONEST ABOUT BEING SESSION-ONLY
// ---------------------------------------------------------------------------
// Attempts and best score come from state.js and die with the tab, so they read
// as empty most of the time. The note in the side column says why, once. When
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
// Hover and the screen-size breakpoints need real CSS. Injected once, guarded
// by id, so importing this module twice cannot duplicate the tag. The id is new
// so an old tag from the previous layout can never apply to this one.
function injectDistrictStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("kyr-district-styles-v2")) return;
  const el = document.createElement("style");
  el.id = "kyr-district-styles-v2";
  el.textContent = `
.kyr-d-body { display: flex; gap: 36px; align-items: flex-start; }
.kyr-d-main { flex: 1 1 auto; min-width: 0; }
.kyr-d-side { width: 340px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; padding-top: 30px; }
.kyr-d-row { transition: transform .1s, box-shadow .1s; }
.kyr-d-row:hover { transform: translate(-1px, -1px); }
.kyr-d-fold:hover { background: ${u.brandSofter} !important; }
@media (max-width: 900px) {
  .kyr-d-body { flex-direction: column; align-items: stretch; gap: 28px; }
  .kyr-d-side { width: auto; padding-top: 0; }
}
@media (max-width: 640px) {
  .kyr-d-shell { padding: 26px 16px 70px !important; }
  .kyr-d-head { gap: 14px !important; margin-bottom: 26px !important; }
  .kyr-d-icon { width: 64px !important; height: 64px !important; }
  .kyr-d-icon svg { width: 40px !important; height: 40px !important; }
  .kyr-d-title { font-size: 30px !important; }
  .kyr-d-blurb { font-size: 14.5px !important; }
  .kyr-d-rail { width: 32px !important; }
  .kyr-d-num { width: 32px !important; height: 32px !important; font-size: 15px !important; }
  .kyr-d-steps { gap: 10px !important; }
  .kyr-d-next { flex-direction: column; align-items: stretch !important; padding: 20px !important; }
  .kyr-d-next-title { font-size: 20px !important; }
  .kyr-d-play { width: 100%; }
  .kyr-d-play > button { width: 100%; }
}`;
  document.head.appendChild(el);
}

// ---------------------------------------------------------------------------
// The number column on the left of the path
// ---------------------------------------------------------------------------
// A circle per chapter, joined by a line down to the next one. Filled for the
// next chapter and for cleared ones (which show a check instead of a number).
function StepMarker({ index, filled, cleared, dim, last }) {
  return c.jsxs("div", {
    className: "kyr-d-rail",
    "aria-hidden": true,
    style: { width: 44, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" },
    children: [
      c.jsx("div", {
        className: "kyr-d-num",
        style: {
          width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
          background: filled ? u.brand : u.surface,
          border: `2px solid ${dim ? u.borderLight : u.outline}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: C.display, fontSize: 19, lineHeight: 1,
          color: filled ? u.textOnDark : dim ? u.textMuted : u.text
        },
        children: cleared ? "\u2713" : String(index + 1)
      }),
      !last && c.jsx("div", {
        style: { width: 3, flex: 1, minHeight: 12, background: u.borderLight, borderRadius: 2, margin: "6px 0" }
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// NextCard : the one thing to do on this page.
// ---------------------------------------------------------------------------
// Brand fill, the heaviest shadow, the only big button.
function NextCard({ chapter, index, total, onPlay }) {
  const D = R.district;
  return c.jsxs("div", {
    className: "kyr-d-next",
    style: {
      flex: 1, minWidth: 0,
      background: u.brand, border: `3px solid ${u.outline}`, borderRadius: 16,
      boxShadow: U.lg, padding: "24px 26px",
      display: "flex", alignItems: "center", gap: 24
    },
    children: [
      c.jsxs("div", {
        style: { flex: 1, minWidth: 0 },
        children: [
          c.jsx("div", {
            style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 2.2, fontWeight: 700, color: u.textOnDark },
            children: `${D.nextLabel} \u00B7 ${D.nextCounter(index + 1, total)}`
          }),
          c.jsx("div", {
            className: "kyr-d-next-title",
            style: { fontFamily: C.display, fontSize: 24, lineHeight: 1.15, color: u.textOnDark, margin: "8px 0 0" },
            children: chapter.name
          }),
          chapter.summary && c.jsx("div", {
            style: { fontFamily: C.body, fontSize: 15, lineHeight: 1.5, color: u.textOnDark, marginTop: 8, fontWeight: 500 },
            children: chapter.summary
          })
        ]
      }),
      c.jsxs("div", {
        className: "kyr-d-play",
        style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 },
        children: [
          c.jsx(Button, {
            onClick: onPlay, variant: "secondary", size: "md",
            style: { fontSize: 22, padding: "15px 38px" },
            children: D.playLabel
          }),
          c.jsx("div", {
            style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 1, color: u.textOnDark, fontWeight: 700 },
            children: D.playMeta(CHAPTER_DECK_SIZE, LIVES_PER_ROUND)
          })
        ]
      })
    ]
  });
}

// Shown above the path once every live chapter is cleared.
function TopicComplete() {
  const D = R.district;
  return c.jsxs("div", {
    style: {
      background: u.brandSofter, border: `3px solid ${u.brand}`, borderRadius: 14,
      boxShadow: U.md, padding: "20px 24px", marginBottom: 20
    },
    children: [
      c.jsx("div", {
        style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 2.4, color: u.brand, fontWeight: 700, marginBottom: 6 },
        children: D.doneLabel
      }),
      c.jsx("div", {
        style: { fontFamily: C.display, fontSize: 22, color: u.text, lineHeight: 1.15, marginBottom: 6 },
        children: D.doneTitle
      }),
      c.jsx("p", {
        style: { fontFamily: C.body, fontSize: 14.5, lineHeight: 1.55, color: u.textDim, margin: 0, fontWeight: 500 },
        children: D.doneBody
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// ChapterRow : every chapter that is not the next one.
// ---------------------------------------------------------------------------
// Quiet by design, but the whole row is still a button.
function ChapterRow({ chapter, session, onPlay }) {
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
    flex: 1, minWidth: 0,
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
    textAlign: "left", font: "inherit",
    background: u.surface,
    border: `2px solid ${playable && hover ? u.outline : u.borderLight}`,
    borderRadius: 12, padding: "14px 20px",
    boxShadow: playable && hover ? U.sm : "none",
    opacity: playable ? 1 : 0.7
  };

  const inner = [
    c.jsxs("span", {
      style: { display: "block", minWidth: 0 },
      children: [
        c.jsx("span", {
          style: {
            display: "block", fontFamily: C.mono, fontSize: 14, letterSpacing: 0.5,
            fontWeight: 700, color: playable ? u.text : u.textDim, lineHeight: 1.35
          },
          children: chapter.name
        }),
        c.jsx("span", {
          style: {
            display: "block", fontFamily: C.mono, fontSize: 11, letterSpacing: 1,
            color: u.textMuted, fontWeight: 700, marginTop: 4, textTransform: "uppercase"
          },
          children: statLine
        })
      ]
    }, "text"),
    c.jsx("span", {
      style: {
        flexShrink: 0, whiteSpace: "nowrap", fontFamily: C.mono, fontSize: 13, fontWeight: 700,
        color: playable ? u.textDim : u.textMuted
      },
      children: playable ? D.chapterPlayLabel : D.soonLabel
    }, "cta")
  ];

  if (!playable) {
    return c.jsx("div", { style: { ...box, cursor: "default" }, children: inner });
  }
  return c.jsx("button", {
    className: "kyr-d-row",
    onClick: onPlay,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    "aria-label": `Play ${chapter.name}`,
    style: { ...box, cursor: "pointer", WebkitTapHighlightColor: "transparent" },
    children: inner
  });
}

// ---------------------------------------------------------------------------
// CoversFold : WHAT THIS COVERS, as a dropdown.
// ---------------------------------------------------------------------------
// One box. The plus badge turns into a minus when open, and the list unfolds
// inside the same box under a dashed line.
function CoversFold({ items }) {
  const [open, setOpen] = useState(false);
  const D = R.district;
  return c.jsxs("div", {
    style: {
      background: u.surface, border: `2px solid ${u.outline}`, borderRadius: 12,
      boxShadow: U.sm, overflow: "hidden"
    },
    children: [
      c.jsxs("button", {
        className: "kyr-d-fold",
        onClick: () => setOpen((v) => !v),
        "aria-expanded": open,
        style: {
          width: "100%", display: "flex", alignItems: "center", gap: 14,
          padding: "15px 18px", background: u.surface, border: "none",
          textAlign: "left", font: "inherit", cursor: "pointer",
          WebkitTapHighlightColor: "transparent", transition: "background .12s"
        },
        children: [
          c.jsxs("span", {
            "aria-hidden": true,
            style: {
              flexShrink: 0, position: "relative", width: 30, height: 30,
              borderRadius: 7, background: u.brand, border: `2px solid ${u.outline}`,
              display: "flex", alignItems: "center", justifyContent: "center"
            },
            children: [
              c.jsx("span", { style: { position: "absolute", width: 14, height: 3, background: u.textOnDark, borderRadius: 1 } }, "h"),
              c.jsx("span", { style: { position: "absolute", width: 3, height: 14, background: u.textOnDark, borderRadius: 1, opacity: open ? 0 : 1, transition: "opacity .18s" } }, "v")
            ]
          }),
          c.jsxs("span", {
            style: { flex: 1, minWidth: 0, display: "block" },
            children: [
              c.jsx("span", {
                style: { display: "block", fontFamily: C.mono, fontSize: 12.5, letterSpacing: 1.6, fontWeight: 700, color: u.text },
                children: D.coversLabel
              }),
              c.jsx("span", {
                style: { display: "block", fontFamily: C.body, fontSize: 13, color: u.textMuted, marginTop: 2, fontWeight: 500 },
                children: open ? D.coversCloseHint : D.coversHint(items.length)
              })
            ]
          })
        ]
      }),
      open && c.jsx("div", {
        style: {
          borderTop: `2px dashed ${u.borderLight}`, padding: "14px 18px 18px",
          display: "flex", flexDirection: "column", gap: 9,
          animation: "ts-fade-in 0.25s ease-out"
        },
        children: items.map((line, i) => c.jsxs("div", {
          style: { display: "flex", gap: 10, alignItems: "flex-start" },
          children: [
            c.jsx("span", {
              "aria-hidden": true,
              style: { flexShrink: 0, width: 7, height: 7, borderRadius: 2, marginTop: 7, background: u.brand }
            }),
            c.jsx("span", {
              style: { fontFamily: C.body, fontSize: 14, lineHeight: 1.45, color: u.textDim, fontWeight: 500 },
              children: line
            })
          ]
        }, i))
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// Notice : the legal note, softer than before.
// ---------------------------------------------------------------------------
// Still the only terra on the page, so it is easy to find, but it no longer
// outweighs the chapter card.
function Notice() {
  const N = R.district.notice;
  return c.jsxs("div", {
    style: {
      background: u.terraSoft, border: `2px solid ${u.terra}`, borderRadius: 12,
      padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start"
    },
    children: [
      c.jsxs("svg", {
        "aria-hidden": true,
        width: 24, height: 24, viewBox: "0 0 24 24", fill: "none",
        stroke: u.terra, strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round",
        style: { flexShrink: 0 },
        children: [
          c.jsx("path", { d: "M12 3v18" }, 0),
          c.jsx("path", { d: "M5 7h14" }, 1),
          c.jsx("path", { d: "M5 7l-3 7h6z" }, 2),
          c.jsx("path", { d: "M19 7l-3 7h6z" }, 3),
          c.jsx("path", { d: "M8 21h8" }, 4)
        ]
      }),
      c.jsxs("div", {
        style: { minWidth: 0 },
        children: [
          c.jsx("div", {
            style: { fontFamily: C.display, fontSize: 15.5, color: u.terra, lineHeight: 1.2, marginBottom: 5 },
            children: N.title
          }),
          c.jsxs("p", {
            style: { fontFamily: C.body, fontSize: 13.5, lineHeight: 1.5, color: u.text, margin: 0, fontWeight: 500 },
            children: [N.body, " ", c.jsx("strong", { children: N.emphasis })]
          })
        ]
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// DistrictScreen
// ---------------------------------------------------------------------------
// Props are unchanged from the old screen, so engine.js needs no edit.
export function DistrictScreen({ district, session, onPlayChapter, onBack }) {
  const [nudge, setNudge] = useState(null); // { chapter, index }
  const D = R.district;

  useEffect(() => { injectDistrictStyles(); }, []);

  const prog = districtProgress(session, district);
  const nextIdx = firstUnclearedIndex(session, district);
  const chapters = district.chapters;

  // Play is where the order check happens, and it only fires when there is a
  // LIVE uncleared chapter earlier in the list.
  const requestPlay = (chapter, index) => {
    if (hasUnclearedBefore(session, district, index)) setNudge({ chapter, index });
    else onPlayChapter(district, chapter);
  };

  const nudgeTarget = nudge
    ? chapters.slice(0, nudge.index).filter((ch) => ch.live)
        .find((ch) => !chapterStats(session, ch.id).cleared)
    : null;

  return c.jsxs("div", {
    className: "kyr-d-shell",
    style: { flex: "1 0 auto", display: "flex", justifyContent: "center", padding: "40px 24px 78px" },
    children: [
      c.jsxs("div", { style: { width: "100%", maxWidth: 1080 }, children: [

        // Back
        c.jsx("button", {
          onClick: onBack,
          style: {
            background: "none", border: "none", padding: "6px 0", marginBottom: 22,
            cursor: "pointer", fontFamily: C.mono, fontSize: 13, fontWeight: 700,
            letterSpacing: 1, color: u.brand, textTransform: "uppercase"
          },
          children: D.backLabel
        }),

        // Header
        c.jsxs("div", {
          className: "kyr-d-head",
          style: { display: "flex", alignItems: "center", gap: 24, marginBottom: 38 },
          children: [
            district.icon && c.jsx("div", {
              className: "kyr-d-icon",
              style: {
                flexShrink: 0, width: 104, height: 104, borderRadius: "50%",
                background: u.brandSofter, border: `3px solid ${u.outline}`,
                boxShadow: U.sm, display: "flex", alignItems: "center", justifyContent: "center"
              },
              children: c.jsx("svg", { viewBox: "0 0 100 100", width: 66, height: 66, "aria-hidden": true, children: district.icon() })
            }),
            c.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
              c.jsx("h1", {
                className: "kyr-d-title",
                style: { fontFamily: C.display, fontSize: 48, letterSpacing: -0.5, color: u.text, margin: 0, lineHeight: 1 },
                children: district.name
              }),
              district.blurb && c.jsx("p", {
                className: "kyr-d-blurb",
                style: { fontFamily: C.body, fontSize: 16.5, lineHeight: 1.5, color: u.textDim, fontWeight: 500, margin: "10px 0 0", maxWidth: 640 },
                children: district.blurb
              })
            ] })
          ]
        }),

        c.jsxs("div", {
          className: "kyr-d-body",
          children: [

            // Left: the path
            c.jsxs("div", {
              className: "kyr-d-main",
              children: [
                c.jsx("div", {
                  style: { fontFamily: C.mono, fontSize: 11, letterSpacing: 2.4, fontWeight: 700, color: u.brand, marginBottom: 14 },
                  children: D.pathLabel(prog.cleared, prog.total)
                }),
                nextIdx < 0 && c.jsx(TopicComplete, {}),
                c.jsx("div", {
                  children: chapters.map((ch, i) => {
                    const isNext = i === nextIdx;
                    const cleared = chapterStats(session, ch.id).cleared;
                    const last = i === chapters.length - 1;
                    return c.jsxs("div", {
                      className: "kyr-d-steps",
                      style: { display: "flex", gap: 18, alignItems: "stretch" },
                      children: [
                        c.jsx(StepMarker, { index: i, filled: isNext || cleared, cleared, dim: !ch.live, last }),
                        c.jsx("div", {
                          style: { flex: 1, minWidth: 0, display: "flex", paddingBottom: last ? 0 : (isNext ? 22 : 12) },
                          children: isNext
                            ? c.jsx(NextCard, {
                                chapter: ch, index: i, total: prog.total,
                                onPlay: () => requestPlay(ch, i)
                              })
                            : c.jsx(ChapterRow, {
                                chapter: ch, session, onPlay: () => requestPlay(ch, i)
                              })
                        })
                      ]
                    }, ch.id);
                  })
                })
              ]
            }),

            // Right: covers, notice, session note
            c.jsxs("div", {
              className: "kyr-d-side",
              children: [
                district.covers && district.covers.length > 0 && c.jsx(CoversFold, { items: district.covers }),
                c.jsx(Notice, {}),
                c.jsx("p", {
                  style: { fontFamily: C.body, fontSize: 12.5, lineHeight: 1.5, color: u.textMuted, margin: 0, fontWeight: 500 },
                  children: D.sessionNote
                })
              ]
            })
          ]
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
          if (typeof window !== "undefined") window.scrollTo(0, 0);
          onPlayChapter(district, t);
        }
      })
    ]
  });
}
