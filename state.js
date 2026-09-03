// Know Your Rights · CCJT
// state.js : session progress.
//
// The progress model lives here so it never leaks into components. Every
// function is pure: they take a session and return a new one, so the engine can
// hold it in React state and nothing else has to know how it is shaped.
//
// ---------------------------------------------------------------------------
// PERSISTENCE: DELIBERATELY NONE
// ---------------------------------------------------------------------------
// Progress lives in memory and dies with the tab. That is a choice, not an
// oversight. Two reasons it works:
//
//   1. Free-roam means a fresh session never forces you to redo anything. You
//      just walk over to a district you have not played yet. There is nothing to
//      "lose" except a record you did not need.
//   2. For a criminal-justice-transparency org, "we store nothing about you" is
//      a feature. It is the honest version of the thing CCJT asks of others.
//
// If persistence is ever added (the strongest argument is unlocked skins, which
// are a weak reward if they evaporate), it belongs HERE and nowhere else: one
// load() on boot, one save() on change, a schema version stamp, and a visible
// reset control. Storing "which cosmetic themes are unlocked" is about as
// innocuous as browser storage gets. Storing "which rights this person keeps
// getting wrong" is not, and should not be written to a shared classroom laptop.
//
// ---------------------------------------------------------------------------
// ORDER IS SHOWN, NOT ENFORCED
// ---------------------------------------------------------------------------
// chapterStatus() below still reports LOCKED for a chapter whose predecessor is
// unfinished, and the district screen deliberately does NOT use it for that.
// Because nothing is saved, a locked chapter 2 would be locked again for every
// new player and every refresh, which in practice means unreachable. So the
// screen shows the order, marks the first unplayed chapter START HERE, and warns
// somebody who jumps ahead. chapterStatus stays because it is the right rule for
// a world with saved progress, and that world may still arrive.

// ---------------------------------------------------------------------------
// Status a chapter or district can be in. Drives how it renders on the map.
// ---------------------------------------------------------------------------
export const STATUS = {
  LOCKED: "locked",       // not reachable yet
  OPEN: "open",           // playable, not yet cleared
  IN_PROGRESS: "progress", // some chapters cleared, not all (districts only)
  CLEARED: "cleared"      // done
};

// A fresh session. Nothing cleared, tutorial pending.
export function newSession() {
  return {
    tutorialCleared: false,
    // districtId -> { chaptersCleared: Set<chapterId> }
    districts: {},
    // chapterId -> { attempts, bestCorrect, deckSize, cleared }
    //
    // One row per chapter actually played this session. Absent means never
    // played, which is why every reader below goes through chapterStats() and
    // gets a zeroed row rather than undefined.
    chapters: {},
    // Stats for the end-of-session scorecard. Session-scoped, never persisted.
    stats: {
      questionsAnswered: 0,
      questionsCorrect: 0,
      lifelinesUsed: 0,
      pointsEarned: 0,
      startedAt: Date.now()
    }
  };
}

// Whether a district can be entered. Everything opens once the tutorial is done.
export function districtStatus(session, district) {
  if (!session.tutorialCleared) return STATUS.LOCKED;
  const cleared = session.districts[district.id]?.chaptersCleared;
  if (!cleared || cleared.size === 0) return STATUS.OPEN;
  if (cleared.size >= district.chapters.length) return STATUS.CLEARED;
  return STATUS.IN_PROGRESS;
}

// Whether a chapter can be played, in a world with saved progress. See the note
// at the top of this file about why the district screen does not gate on it.
export function chapterStatus(session, district, chapterIndex) {
  if (!session.tutorialCleared) return STATUS.LOCKED;
  const cleared = session.districts[district.id]?.chaptersCleared ?? new Set();
  const chapter = district.chapters[chapterIndex];
  if (cleared.has(chapter.id)) return STATUS.CLEARED;
  // Chapter 1 is always open. Any later chapter needs the one before it.
  if (chapterIndex === 0) return STATUS.OPEN;
  const prev = district.chapters[chapterIndex - 1];
  return cleared.has(prev.id) ? STATUS.OPEN : STATUS.LOCKED;
}

// ---------------------------------------------------------------------------
// Per-chapter session stats
// ---------------------------------------------------------------------------
// Always returns a row, so callers never branch on undefined. A chapter nobody
// has touched reads as zero attempts, which is exactly what should render.
export function chapterStats(session, chapterId) {
  const row = session.chapters?.[chapterId];
  return {
    attempts: row?.attempts ?? 0,
    bestCorrect: row?.bestCorrect ?? 0,
    deckSize: row?.deckSize ?? 0,
    cleared: !!row?.cleared
  };
}

// Record a finished round. Called once per round that ends, win or lose.
//
// `cleared` means the player reached the end of the deck with lives left. It
// does NOT mean every answer was right, which is the rule lives introduced: a
// finished round is a finished round. Returns a NEW session.
export function recordChapterRun(session, districtId, chapterId, { correct = 0, deckSize = 0, cleared = false } = {}) {
  const prev = chapterStats(session, chapterId);
  const next = {
    attempts: prev.attempts + 1,
    bestCorrect: Math.max(prev.bestCorrect, correct),
    // The last deck size wins. It only changes if the deck rules change
    // mid-session, and showing a best score against a stale total would be
    // worse than showing it against the current one.
    deckSize: deckSize || prev.deckSize,
    cleared: prev.cleared || !!cleared
  };
  const withChapter = {
    ...session,
    chapters: { ...(session.chapters ?? {}), [chapterId]: next }
  };
  // Clearing a chapter is also a district-level fact, so the two stay in step
  // rather than the map and the district screen disagreeing about progress.
  return cleared ? clearChapter(withChapter, districtId, chapterId) : withChapter;
}

// Record a cleared chapter. Returns a NEW session object (never mutates).
export function clearChapter(session, districtId, chapterId) {
  const prev = session.districts[districtId]?.chaptersCleared ?? new Set();
  const next = new Set(prev);
  next.add(chapterId);
  return {
    ...session,
    districts: {
      ...session.districts,
      [districtId]: { chaptersCleared: next }
    }
  };
}

export function clearTutorial(session) {
  return { ...session, tutorialCleared: true };
}

// ---------------------------------------------------------------------------
// District-level numbers for the district screen header.
// ---------------------------------------------------------------------------
// `attempted` counts chapters started at all, cleared or not, so a screen can
// say "1 of 2 chapters cleared, 2 tried" without doing arithmetic itself.
// `percent` is over LIVE chapters only: counting coming-soon chapters in the
// denominator would cap a player at a number they cannot move.
export function districtProgress(session, district) {
  const live = district.chapters.filter((ch) => ch.live);
  const total = live.length;
  let cleared = 0, attempted = 0, attempts = 0;
  live.forEach((ch) => {
    const s = chapterStats(session, ch.id);
    if (s.cleared) cleared += 1;
    if (s.attempts > 0) attempted += 1;
    attempts += s.attempts;
  });
  return {
    total,
    cleared,
    attempted,
    attempts,
    percent: total === 0 ? 0 : Math.round((cleared / total) * 100)
  };
}

// The chapter to point somebody at: the first live one they have not cleared.
// Returns -1 when everything live is done, which the screen reads as "nothing
// left to start" rather than defaulting to chapter 1 again.
export function firstUnclearedIndex(session, district) {
  return district.chapters.findIndex(
    (ch) => ch.live && !chapterStats(session, ch.id).cleared
  );
}

// Is there an uncleared live chapter BEFORE this one? This is the whole basis
// of the out-of-order nudge. It answers "has this player skipped something",
// and it ignores coming-soon chapters, because a gap the content has not filled
// yet is not the player skipping anything.
export function hasUnclearedBefore(session, district, chapterIndex) {
  return district.chapters
    .slice(0, chapterIndex)
    .some((ch) => ch.live && !chapterStats(session, ch.id).cleared);
}

// Overall completion, 0..1. This is what the map's gray-to-color fill reads from.
export function completion(session, districts) {
  const total = districts.reduce((n, d) => n + d.chapters.length, 0);
  if (total === 0) return 0;
  const done = districts.reduce(
    (n, d) => n + (session.districts[d.id]?.chaptersCleared?.size ?? 0),
    0
  );
  return done / total;
}
