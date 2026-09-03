// ---------------------------------------------------------------------------
// content.js : loads districts and chapters from content/ at runtime.
// ---------------------------------------------------------------------------
// The bank used to be a JS object imported at startup. At 1,440 questions that
// would be a ~2.5MB module every visitor downloads to play 15 questions. Now a
// chapter's 30 questions are fetched only when someone picks that chapter.
//
// Two shapes are in play and it is worth being explicit about why:
//
//   AUTHORING shape (content/*.json, see docs/CONTENT.md and the schema) is
//   built for people. Options are objects carrying their own permanent id,
//   explanation, and misconception code. The correct answer is always authored
//   at index 0 so authors never think about placement.
//
//   RUNTIME shape is built for the components, which want parallel arrays and
//   a numeric `correct` index.
//
// toRuntime() converts one into the other at load time. Neither side has to
// bend around the other, and the conversion lives in exactly one place.

const cache = new Map();      // path -> parsed JSON
const chapters = new Map();   // chapterId -> runtime chapter

// Resolve relative to the page, so the game works at a domain root, in a
// subfolder, or opened from a file:// path during local testing.
function url(path) {
  return new URL(path, document.baseURI).href;
}

async function getJSON(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(url(path), { cache: "no-cache" });
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  const data = await res.json();
  cache.set(path, data);
  return data;
}

// ---------------------------------------------------------------------------
// Districts
// ---------------------------------------------------------------------------
// index.json holds the render order; each district's meta.json holds its name,
// blurb, and chapter list. Adding a ninth district is adding a folder and one
// line in index.json, with no component code touched.
export async function loadDistricts() {
  const index = await getJSON("content/index.json");
  const metas = await Promise.all(
    index.districts.map((id) => getJSON(`content/${id}/meta.json`))
  );
  return metas.map((m) => ({
    id: m.districtId,
    name: m.name,
    blurb: m.blurb,
    // What the topic teaches, in the district's own words. Authored in
    // meta.json rather than derived from the chapters, because "what is in
    // here" is a summary somebody writes, not a list a machine can assemble.
    // Optional: a district without one simply does not show the section.
    covers: Array.isArray(m.covers) ? m.covers : [],
    // A district is playable only if it says so AND has at least one live
    // chapter. Two gates because a district can be held back deliberately even
    // once its first chapter passes review.
    live: !!m.live && m.chapters.some((c) => c.live),
    chapters: m.chapters.map((c) => ({
      id: c.id,
      name: c.name,
      // One line describing the chapter, shown on the district screen. It is
      // NOT the chapter's safety note: the note is written for somebody about
      // to answer questions, this is written for somebody deciding whether to.
      // Optional, and the screen simply omits the line when it is missing.
      summary: c.summary || null,
      file: c.file,
      live: !!c.live
    }))
  }));
}

// ---------------------------------------------------------------------------
// Chapters
// ---------------------------------------------------------------------------
export async function loadChapter(districtId, chapter) {
  if (chapters.has(chapter.id)) return chapters.get(chapter.id);
  const raw = await getJSON(`content/${districtId}/${chapter.file}`);
  const runtime = {
    id: raw.chapterId,
    districtId: raw.districtId,
    name: raw.name,
    // Still read, still carried, currently shown nowhere. The district screen
    // replaced it with the shorter meta.json summary, and the pre-round screen
    // it used to appear on is gone. Kept because it is authored content that
    // passed attorney review, and because a future beat before question one is
    // the obvious place for it to come back.
    safetyNote: raw.safetyNote || null,
    reviewedBy: raw.reviewedBy || null,
    questions: (raw.questions || []).map(toRuntime)
  };
  if (runtime.questions.length === 0) {
    throw new Error(`Chapter ${chapter.id} has no questions`);
  }
  chapters.set(chapter.id, runtime);
  return runtime;
}

// Authoring shape -> runtime shape. The correct answer is authored at index 0;
// rules.shuffleOptions() is what randomizes display position, and it permutes
// every parallel array together so option identity survives the shuffle.
//
// NOTE: the tutorial is the one caller whose questions are never passed through
// shuffleOptions, because its tour scripts address answers by position. See
// loadTutorial() at the bottom of this file.
function toRuntime(q) {
  const opts = q.options || [];
  return {
    id: q.id,
    version: q.version,
    q: q.q,
    options: opts.map((o) => o.text),
    correct: Math.max(0, opts.findIndex((o) => o.isCorrect)),
    optionExplanations: opts.map((o) => o.explanation),
    // Permanent per-option ids and misconception codes ride along so analytics
    // can report what was chosen without depending on display position.
    optionIds: opts.map((o) => o.id),
    misconceptions: opts.map((o) => o.misconceptionCode),
    hint: q.hint,
    principle: q.principle,
    safetyNote: q.safetyNote,
    keyPhrase: q.keyPhrase,
    scenario: q.scenario
  };
}

// ---------------------------------------------------------------------------
// The demo pool
// ---------------------------------------------------------------------------
// content/demo.json is a list of question IDs, not questions. The chapter files
// stay the single source of truth: fix a typo in juvenile.01.003 and the demo
// picks it up, because the demo never holds a copy of anything.
//
// An ID carries its own address. "juvenile.01.003" is district juvenile,
// chapter juvenile.01, so the loader can find any question from its ID alone
// and this keeps working when the demo pulls from more than one district.
//
// The result is shaped exactly like a chapter, which is the point: buildDeck,
// buildEndlessDeck, and the SKIP lifeline all take it without knowing it is
// not one. The only differences are a null safetyNote (the demo shows no
// pre-round screen) and a pool larger than 30.
let demoCache = null;

export async function loadDemo() {
  if (demoCache) return demoCache;
  const spec = await getJSON("content/demo/questions.json");
  const wanted = spec.questions || [];
  if (wanted.length === 0) throw new Error("The demo file has no questions");

  // Two accepted shapes, so the demo can be its own writing or a pull from the
  // chapters without the loader caring which:
  //   AUTHORED  questions is a list of full question objects, written for the
  //             demo and standing on their own with no chapter around them.
  //   BY ID     questions is a list of id strings resolved against the chapter
  //             files, which stay the single source of truth for those.
  const authored = typeof wanted[0] !== "string";
  let questions;

  if (authored) {
    questions = wanted.map(toRuntime);
  } else {
    // An id carries its own address: "juvenile.01.003" is district juvenile,
    // chapter juvenile.01, so any question is findable from its id alone.
    const byChapter = new Map();
    wanted.forEach((qid) => {
      const [districtId, chapterNum] = qid.split(".");
      byChapter.set(`${districtId}.${chapterNum}`, districtId);
    });
    const index = new Map();
    for (const [chapterId, districtId] of byChapter) {
      const meta = await getJSON(`content/${districtId}/meta.json`);
      const ref = (meta.chapters || []).find((ch) => ch.id === chapterId);
      if (!ref) throw new Error(`Demo refers to ${chapterId}, which is not in ${districtId}/meta.json`);
      const raw = await getJSON(`content/${districtId}/${ref.file}`);
      (raw.questions || []).forEach((q) => index.set(q.id, q));
    }
    // A missing id is a content bug, not something to paper over: silently
    // dealing a shorter deck would hide it until somebody counted.
    const missing = wanted.filter((qid) => !index.has(qid));
    if (missing.length) {
      throw new Error(`Demo list has ${missing.length} id(s) not in the chapters: ${missing.slice(0, 5).join(", ")}`);
    }
    questions = wanted.map((qid) => toRuntime(index.get(qid)));
  }

  // Shaped exactly like a chapter, which is the point: buildDeck, the SKIP
  // lifeline and the rest take it without knowing it is not one. safetyNote is
  // null because the demo shows no pre-round screen.
  demoCache = {
    id: spec.chapterId || "demo",
    districtId: spec.districtId || "demo",
    name: spec.name || "DEMO",
    safetyNote: null,
    reviewedBy: spec.reviewedBy || null,
    isDemo: true,
    questions
  };
  return demoCache;
}

// ---------------------------------------------------------------------------
// The tutorial
// ---------------------------------------------------------------------------
// Shaped like a chapter so buildTutorialDeck and every screen take it without
// knowing it is not one. The difference is `tour`: each question carries its own
// step script, which rides through untouched because toRuntime does not know
// about it and does not need to.
//
// The tutorial is the ONE deck that is never shuffled, in either sense. The
// questions come in file order and each question's options stay where they were
// written, because the tour scripts address answers by position ("tap
// answer-2"). rules.buildTutorialDeck is what enforces that; this loader just
// has to not undo it.
//
// Deliberately NOT cached the way chapters are. Somebody replaying the tutorial
// should get the current file, and five questions is not worth holding onto.
export async function loadTutorial() {
  const raw = await getJSON("content/tutorial/questions.json");
  const questions = (raw.questions || []).map((q) => ({
    ...toRuntime(q),
    tour: q.tour || [],
    // Tutorial-only. A wrong pick on this question strikes the option out and
    // lets the player go again instead of spending a life and revealing the
    // answer. See the retry branch in engine.onLockIn.
    retryOnWrong: !!q.retryOnWrong
  }));
  if (questions.length === 0) throw new Error("The tutorial file has no questions");
  return {
    id: raw.chapterId || "tutorial",
    districtId: raw.districtId || "tutorial",
    name: raw.name || "TUTORIAL",
    // No pre-round screen in the tutorial, so no chapter-level safety note. The
    // safety brief is its own full screen immediately before this.
    safetyNote: null,
    reviewedBy: raw.reviewedBy || null,
    isTutorial: true,
    questions
  };
}

// Testing aid: drop caches so a reload picks up edited JSON.
export function clearContentCache() {
  cache.clear();
  chapters.clear();
  demoCache = null;
}
