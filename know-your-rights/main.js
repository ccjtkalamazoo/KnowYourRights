// Know Your Rights · CCJT
// main.js : the entry point. This is the file index.html loads.
//
// Its only job is to mount the app. Everything else lives in the modules it
// pulls in. Keeping this file tiny means the app's wiring is visible at a glance:
//
//   theme.js      design tokens, the React runtime, the stylesheet
//   questions.js  the question bank + all user-facing copy
//   rules.js      the ladder, deck building, lifeline prices, jury simulation
//   audio.js      the two procedural sound engines
//   ui.js         shared components (Button, Shell, ConfirmModal, ...)
//   engine.js     the quiz screens and the state machine
//   map.js        (coming) the district map
//   state.js      (coming) session progress and unlocks
//
// Load order does not matter; ES modules resolve their own dependency graph.

import { c, qc } from "./theme.js";
import { App } from "./engine.js";

const rootEl = typeof document !== "undefined" ? document.getElementById("root") : null;

if (rootEl) {
  const root = qc(rootEl);
  root.render(c.jsx(App, {}));
}
