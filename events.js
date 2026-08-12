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

// ---------------------------------------------------------------------------
// Option identity
// ---------------------------------------------------------------------------
// THE INDEX PASSED IN HERE IS THE DISPLAY INDEX (0 = the option rendered first
// on screen), not the authored one. That distinction is what the first version
// of this function got wrong, and it silently destroyed every option-level
// number collected before this fix.
//
// rules.shuffleOptions() permutes optionIds by the SAME order it permutes the
// visible text, so by the time a question reaches the screen optionIds is
// ALREADY in display order. optionIds[displayIndex] is therefore the permanent
// id of the option the player actually tapped. The old code indexed it with the
// authored index, which un-shuffled an already-shuffled array and returned a
// real-looking id belonging to a different option. It was right only by chance,
// roughly one time in four, which is why the collected data showed every letter
// appearing as both correct and incorrect.
//
// The legacy fallback still needs the authored position, because a legacy
// question has no ids and its letter is defined by authoring order. order[]
// maps display index to authored index, so that conversion happens here.
export function optionId(q, displayIndex) {
  if (q.optionIds && q.optionIds[displayIndex]) return q.optionIds[displayIndex];
  const qid = questionId(q);
  const authored = q.order ? q.order[displayIndex] : displayIndex;
  return qid + "." + "abcd"[authored];
}

// The misconception code for a displayed option, same indexing rule as above.
// Carried ON the event rather than joined from content later, deliberately: if
// a code is renamed or merged next year, rows keep the code that was true at the
// moment the player answered.
export function optionMisconception(q, displayIndex) {
  if (!q.misconceptions) return null;
  return q.misconceptions[displayIndex] || null;
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
    ended: false,              // session_end is emitted at most once
  };
  track("session_start", {
    viewport: viewportClass(),
    soundOn: !!soundOn,
  });
  if (typeof window !== "undefined") {
    session.flushTimer = setInterval(flush, FLUSH_MS);
    // Three listeners, one outcome. pagehide is the reliable one on desktop and
    // on iOS; visibilitychange catches the phone being locked or the app being
    // switched away from, which on some mobile browsers is the LAST event before
    // the page is discarded without pagehide ever firing; beforeunload covers
    // older desktop browsers. endSession() is idempotent, so whichever arrives
    // first wins and the rest are no-ops. Before this, 13 of 96 sessions ended
    // with no close event and no totalMs at all.
    window.addEventListener("pagehide", () => endSession("pagehide"));
    window.addEventListener("beforeunload", () => endSession("beforeunload"));
    document.addEventListener("visibilitychange", onVisibility);
  }
  return session.id;
}

function now() {
  return (typeof performance !== "undefined" ? performance.now() : Date.now());
}

// Close the session and get the buffer out. Safe to call repeatedly: only the
// first call emits, because a tab close can fire two or three of the listeners
// above and a doubled session_end would corrupt every duration query.
function endSession(reason) {
  if (!session || session.ended) return;
  session.ended = true;
  track("session_end", { reason, totalMs: Math.round(now() - session.t0) });
  flush(true);
}

// Tab switches are a data-quality signal (DESIGN.md 5): recorded as bare
// events, weighted later, never labelled cheating anywhere. Going hidden is also
// the last safe moment to send on mobile, so the buffer goes out too.
function onVisibility() {
  if (!session) return;
  const hidden = document.visibilityState === "hidden";
  track("visibility", { hidden });
  if (hidden) flush(true);
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

// displayIndex is the on-screen position the player tapped. Everything that
// needs the authored identity resolves it through optionId/optionMisconception,
// which own that conversion so no caller has to think about it.
export function trackAnswer(q, { displayIndex, correct, exposure, msToFirstSelect, msToLock, selectionChanges, lifelinesUsed, removedDisplayIndices }) {
  track("answer", {
    qid: questionId(q),
    oid: optionId(q, displayIndex),
    // The misconception this choice represents, null on the correct answer.
    // This is the field that makes a wrong answer specifically identified
    // rather than just wrong.
    mis: optionMisconception(q, displayIndex),
    correct: !!correct,
    exposure: exposure || 1,
    msToFirstSelect: msToFirstSelect ?? null,
    msToLock: msToLock ?? null,
    selectionChanges: selectionChanges || 0,
    // Category axis (DESIGN.md 5): unaided / hint-assisted / reduced-field is
    // derived downstream from this ordered list, not stored as a judgment here.
    lifelinesUsed: lifelinesUsed || [],
    removed: (removedDisplayIndices || []).map((i) => optionId(q, i)),
  });
}

export function trackLifeline(q, name, detail = {}) {
  track("lifeline", { qid: questionId(q), lifeline: name, ...detail });
}

export function trackShop(action, detail = {}) {
  track("shop", { action, ...detail });
}

// Fired once per card VIEWED, on the way out of that card, whether the answer
// was right or wrong. Previously this only fired when a point was redeemed,
// which meant a wrong answer produced no card events at all even though the
// player sat and read all three. The teaching was happening; the measurement
// was not. `correct` rides along so "did they read harder after getting it
// wrong" is one query rather than a join.
export function trackReviewCard(q, cardIndex, { dwellMs, redeemed, skipped, correct }) {
  track("review_card", {
    qid: questionId(q), card: cardIndex,
    dwellMs: dwellMs ?? null, redeemed: !!redeemed, skipped: !!skipped,
    correct: typeof correct === "boolean" ? correct : null,
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
        mis: e.mis || "", correct: e.correct ?? "", exposure: e.exposure ?? "", ms: e.at,
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
