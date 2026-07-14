// Know Your Rights · CCJT
// map.js : the district map. NOT BUILT YET.
//
// This file is a placeholder so the module structure is complete and there is an
// obvious home for the map when we build it. Nothing imports it yet.
//
// ---------------------------------------------------------------------------
// WHAT THIS IS FOR
// ---------------------------------------------------------------------------
// The map is not decoration and it is not a level-select screen. It is the
// curriculum's structure made visible: districts trace the arc a person actually
// moves through in the justice system, and being able to see the whole thing is
// itself part of what the game teaches.
//
// It also solves a real product problem. Because there is no saved progress, the
// map is what makes a fresh session fine: you can walk to any district you have
// not played, in any order, so nothing is ever lost and nothing is ever a
// forced replay.
//
// ---------------------------------------------------------------------------
// DECIDED
// ---------------------------------------------------------------------------
//   * Two levels: an OVERVIEW of districts, and a DETAIL map inside each one
//     showing that district's chapters.
//   * Coded SVG, not commissioned art. The map has to grow as chapters are
//     added, and a hand-painted image cannot. Vector also stays crisp at any
//     zoom, which matters for the phone case below.
//   * Hand-drawn style for the world (wobbly ink lines, loose fills) with BOLD
//     CLEAN type for every label. Charm in the scene, legibility in the words.
//   * Chapter markers are map pins, not circles.
//   * The map starts MUTED and fills with color as districts are cleared. This
//     is the session's meta-reward, and it needs no saved data to work.
//   * Desktop shows the whole map at rest. Phone gets pinch-zoom and pan, opening
//     at a fit-to-screen view. Panning a map is not the same thing as scrolling a
//     form, so this does not violate the no-scroll rule, which is about the quiz.
//
// ---------------------------------------------------------------------------
// STILL OPEN
// ---------------------------------------------------------------------------
//   * The actual district list and their chapters. This is the content spine and
//     everything waits on it.
//   * The tutorial's ten questions. Highest-stakes content decision in the whole
//     project, because it is the only thing every single player is guaranteed to
//     see.

export const PLACEHOLDER = true;
