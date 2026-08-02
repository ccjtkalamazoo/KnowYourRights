// ---------------------------------------------------------------------------
// events.js : anonymous gameplay event collection.
// ---------------------------------------------------------------------------
// The measurement layer designed in docs/DESIGN.md sections 4 and 5. Everything
// here is intentionally boring: plain JSON events, a client-side buffer, batched
// sends. The privacy posture is structural, not aspirational:
//
//   - Session ID is a random UUID per RUN, not per device. Nothing persists
//     across visits. A returning player is indistinguishable from a new one.
//   - No wall-clock timestamps. Durations and a monotonic sequence number only.
//   - No device fingerprinting. Viewport class and sound state are the only
//     environment facts, both coarse.
//   - No free text, ever.
//
// ENDPOINT is null until the Cloudflare ingest Worker exists. With a null
// endpoint every event still flows through the same code paths (so the
// instrumentation is exercised and bugs surface now), but flush() drops the
// batch instead of sending. Set ENDPOINT to the Worker URL and collection is
// live with no other change.

export const SCHEMA_VERSION = 1;

// The ingest Worker URL. Set to null to turn collection off: events still flow
// through every code path (so the instrumentation stays exercised) but flush()
// drops the batch instead of sending it.
const ENDPOINT = "https://kyr-ingest.ccjtkalamazoo.workers.dev/";

// Flush when the buffer reaches this many events, or on the interval, or on
// pagehide, whichever comes first. Batching is what keeps a classroom to a
// handful of requests per minute.
const FLUSH_AT = 25;
const FLUSH_MS = 30000;

// ---------------------------------------------------------------------------
// Question identity (interim)
// ---------------------------------------------------------------------------
// The content design gives every question a permanent id (stop.03.007). The
// legacy 72-question bank predates that and has none, so until content moves to
// JSON, identity is a stable hash of the question text. Same text = same id
// across sessions, which is what aggregation needs. When real ids land, events
// carry those instead and qv (question version) starts meaning schema version;
// the "legacy:" prefix marks rows from this era so analysis can segment them.
export function questionId(q) {
  if (q.id) return q.id; // real content ids win the moment they exist
  let h = 5381;
  const s = q.q || "";
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return "legacy:" + h.toString(36);
}

// Option identity: authored content gives every option a permanent id
// (stop.03.007.a) that survives rewording and the display shuffle. Those ride
// through on the question as optionIds. The legacy fallback derives one from
// the question id plus the authored position.
export function optionId(q, authoredIndex) {
  if (q.optionIds && q.optionIds[authoredIndex]) return q.optionIds[authoredIndex];
  const qid = questionId(q);
  return qid + "." + "abcd"[authoredIndex];
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
let session = null;

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for old WebViews: random hex. Still per-run, still meaningless.
  return "s-" + Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join("-");
}

function viewportClass() {
  if (typeof window === "undefined") return "unknown";
  const w = window.innerWidth;
  if (w < 480) return "phone";
  if (w < 920) return "tablet";
  return "desktop";
}

export function beginSession({ soundOn } = {}) {
  session = {
    id: uuid(),
    seq: 0,                    // monotonic event counter; order without wall-clock
    t0: now(),                 // session start on the monotonic clock
    buffer: [],
    exposures: new Map(),      // questionId -> times shown this session
    flushTimer: null,
    mode: null,                // "ladder" | "endless" | later "chapter" | "tutorial"
  };
  track("session_start", {
    viewport: viewportClass(),
    soundOn: !!soundOn,
  });
  if (typeof window !== "undefined") {
    session.flushTimer = setInterval(flush, FLUSH_MS);
    // pagehide fires on tab close, navigation, and app switch on mobile; it is
    // the last reliable moment to get the buffer out. sendBeacon survives the
    // page dying, a normal fetch would not.
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
  }
  return session.id;
}

function now() {
  return (typeof performance !== "undefined" ? performance.now() : Date.now());
}

function onPageHide() {
  track("session_end", { reason: "pagehide", totalMs: Math.round(now() - session.t0) });
  flush(true);
}

// Tab switches are a data-quality signal (DESIGN.md 5): recorded as bare
// events, weighted later, never labelled cheating anywhere.
function onVisibility() {
  if (!session) return;
  track("visibility", { hidden: document.visibilityState === "hidden" });
}

// ---------------------------------------------------------------------------
// Core recording
// ---------------------------------------------------------------------------
export function track(type, payload = {}) {
  if (!session) return;
  session.buffer.push({
    v: SCHEMA_VERSION,
    sid: session.id,
    seq: session.seq++,
    // Milliseconds since session start: sequencing and duration math without
    // ever storing when, on the clock, a specific person played.
    at: Math.round(now() - session.t0),
    type,
    ...payload,
  });
  if (session.buffer.length >= FLUSH_AT) flush();
}

export function flush(useBeacon = false) {
  if (!session || session.buffer.length === 0) return;
  const batch = session.buffer;
  session.buffer = [];
  if (!ENDPOINT) return; // collection not live yet; the pipeline above still ran
  const body = JSON.stringify({ v: SCHEMA_VERSION, events: batch });
  try {
    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, body);
    } else if (typeof fetch !== "undefined") {
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch (e) { /* collection is best-effort; the game never breaks over it */ }
}

// ---------------------------------------------------------------------------
// Gameplay helpers (the vocabulary engine.js speaks)
// ---------------------------------------------------------------------------

export function trackModeStart(mode, deck, context = {}) {
  if (!session) return;
  session.mode = mode;
  // The dealt deck IS the received/not-received record: these question ids were
  // served this run; everything else in the chapter was not.
  track("deck_dealt", { mode, ...context, questionIds: deck.map(questionId) });
}

// Called when a question is shown. Returns the exposure number (1st, 2nd, 3rd
// viewing this session), which the answer event carries so "first answer vs
// third" is a query, not a reconstruction.
export function trackQuestionShown(q, level) {
  if (!session) return 1;
  const qid = questionId(q);
  const n = (session.exposures.get(qid) || 0) + 1;
  session.exposures.set(qid, n);
  track("question_shown", { qid, level, exposure: n });
  return n;
}

export function trackAnswer(q, { authoredIndex, correct, exposure, msToFirstSelect, msToLock, selectionChanges, lifelinesUsed, removedAuthoredIndices }) {
  track("answer", {
    qid: questionId(q),
    oid: optionId(q, authoredIndex),
    correct: !!correct,
    exposure: exposure || 1,
    msToFirstSelect: msToFirstSelect ?? null,
    msToLock: msToLock ?? null,
    selectionChanges: selectionChanges || 0,
    // Category axis (DESIGN.md 5): unaided / hint-assisted / reduced-field is
    // derived downstream from this ordered list, not stored as a judgment here.
    lifelinesUsed: lifelinesUsed || [],
    removed: (removedAuthoredIndices || []).map((i) => optionId(q, i)),
  });
}

export function trackLifeline(q, name, detail = {}) {
  track("lifeline", { qid: questionId(q), lifeline: name, ...detail });
}

export function trackShop(action, detail = {}) {
  track("shop", { action, ...detail });
}

export function trackReviewCard(q, cardIndex, { dwellMs, redeemed, skipped }) {
  track("review_card", {
    qid: questionId(q), card: cardIndex,
    dwellMs: dwellMs ?? null, redeemed: !!redeemed, skipped: !!skipped,
  });
}

export function trackRunEnd(outcome, { level, mode }) {
  // outcome: "won" | "lost" | "walked" | "abandoned"
  track("run_end", { outcome, level, mode });
}

export function trackNav(where) {
  track("nav", { where });
}

// Test/debug access to the live buffer and session. Not used by the game.
export function _debug() {
  return session ? { id: session.id, buffered: session.buffer.slice(), exposures: new Map(session.exposures) } : null;
}

// Exposed on window deliberately. Anyone can open the console and see exactly
// what this game records about them, which is the honest version of a privacy
// claim: not "trust us", but "look for yourself". Nothing here is sensitive,
// it is the visitor's own anonymous session buffer.
if (typeof window !== "undefined") {
  window.KYR_EVENTS = {
    dump: () => {
      const d = _debug();
      if (!d) return "No session yet.";
      console.table(d.buffered.map((e) => ({
        seq: e.seq, type: e.type, qid: e.qid || "", oid: e.oid || "",
        correct: e.correct ?? "", exposure: e.exposure ?? "", ms: e.at,
      })));
      return d.buffered;
    },
    session: () => (_debug() || {}).id || "none",
    raw: () => (_debug() || {}).buffered || [],
    // Force a send now instead of waiting for the buffer to fill or the
    // interval to fire. Testing only; the game never calls this.
    send: async () => {
      const n = (_debug() || { buffered: [] }).buffered.length;
      if (!ENDPOINT) return "Collection is off (ENDPOINT is null).";
      if (n === 0) return "Nothing buffered. Play a question first.";
      flush();
      return "Sent " + n + " event(s). Check the Network tab or your D1 table.";
    },
  };
}
