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
    // A district is playable only if it says so AND has at least one live
    // chapter. Two gates because a district can be held back deliberately even
    // once its first chapter passes review.
    live: !!m.live && m.chapters.some((c) => c.live),
    chapters: m.chapters.map((c) => ({
      id: c.id, name: c.name, file: c.file, live: !!c.live
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
    // One safety note per chapter, shown before the round rather than on every
    // question. The risk of using a right differs by setting, so it is chapter
    // level and not global.
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
  const spec = await getJSON("content/demo.json");
  const wanted = spec.questions || [];

  // Group the wanted IDs by chapter so each chapter file is fetched once.
  const byChapter = new Map(); // chapterId -> districtId
  wanted.forEach((qid) => {
    const [districtId, chapterNum] = qid.split(".");
    byChapter.set(`${districtId}.${chapterNum}`, districtId);
  });

  // meta.json is what maps a chapter id to its filename, so a renamed file
  // never has to be chased into a second place.
  const index = new Map(); // questionId -> authored question
  for (const [chapterId, districtId] of byChapter) {
    const meta = await getJSON(`content/${districtId}/meta.json`);
    const ref = (meta.chapters || []).find((ch) => ch.id === chapterId);
    if (!ref) throw new Error(`Demo refers to ${chapterId}, which is not in ${districtId}/meta.json`);
    const raw = await getJSON(`content/${districtId}/${ref.file}`);
    (raw.questions || []).forEach((q) => index.set(q.id, q));
  }

  // A missing ID is a content bug, not a runtime condition to paper over: it
  // means the demo list and the chapters disagree, and silently dealing 44
  // questions would hide that until someone counted.
  const missing = wanted.filter((qid) => !index.has(qid));
  if (missing.length) {
    throw new Error(`Demo list has ${missing.length} id(s) not found in the chapters: ${missing.slice(0, 5).join(", ")}`);
  }

  demoCache = {
    id: "demo",
    districtId: "demo",
    name: spec.name || "DEMO",
    safetyNote: null,
    reviewedBy: null,
    isDemo: true,
    questions: wanted.map((qid) => toRuntime(index.get(qid)))
  };
  return demoCache;
}

// Testing aid: drop caches so a reload picks up edited JSON.
export function clearContentCache() {
  cache.clear();
  chapters.clear();
  demoCache = null;
}
