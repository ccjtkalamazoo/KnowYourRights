// Know Your Rights · CCJT
// state.js : session progress. Not wired into the game yet.
//
// This is the spine the chapters/districts system will hang on. It is written
// now, empty, so that when we build the map there is an obvious place for the
// progress model to live instead of it leaking into components.
//
// ---------------------------------------------------------------------------
// THE DESIGN IT SERVES
// ---------------------------------------------------------------------------
// A tutorial district gates everything: 10 fixed questions, in a fixed order,
// with only the A/B/C/D positions shuffled. Everyone who plays learns those ten
// things, because you cannot reach the rest of the map without them.
//
// Clearing the tutorial opens the whole map. From there you travel freely
// between districts, in any order. Inside a district, chapters unlock in
// sequence: clear chapter 1 to open chapter 2, and so on. Districts are about
// CHOICE (which topic do I care about); chapters are about SEQUENCE (build the
// knowledge in order).
//
// ---------------------------------------------------------------------------
// PERSISTENCE: DELIBERATELY NONE, FOR NOW
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

// Whether a chapter can be played. Chapters go in order inside their district.
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
