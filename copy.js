// Know Your Rights · CCJT
// copy.js : every piece of user-facing copy in the game. No logic, no imports.
//
// Split out of the old questions.js, which held the copy and the question bank
// together. Those are different kinds of content with different editors: copy
// is code and changes with the interface, questions are JSON under content/ and
// change with the law. Keeping them apart means a wording tweak never risks the
// bank, and a translation pass has one file to work from.

export const R = {
  presenter: "",
  title: "KNOW YOUR RIGHTS",
  hero: {
    headline: "Questions about your rights.",
    headlineAccent: "How many can you get?",
    subtitle: "Real situations. What you can say, what you can refuse, what the law actually is. Three lives per round, and four lifelines if you need help."
  },
  playLabel: "Play",
  // The walkthrough is due a rework into something interactive. What changed
  // here is only subtraction: the four slides about lifelines and points
  // described features that no longer exist, and a tutorial that teaches a
  // thing the game does not do is worse than no tutorial. Six slides now.
  walkthrough: [
    { key: "safety", type: "safety", title: "READ THIS FIRST", body: "This game teaches your legal rights so you never face a law enforcement encounter with no idea what to do. But knowing a right and safely using it are different things. Sometimes your rights will be violated, and the street is not the place to make that point. Your number one goal is to get home safe. Stay calm, keep your hands visible, follow instructions, and do what you have to do to survive. You fight an unfair stop later, in court, with a lawyer, not in the moment. It is completely fine to get a question wrong here. It is far more dangerous to be in that situation knowing nothing at all." },
    { key: "questions", type: "questions", title: "THE QUESTIONS", body: "Four choices per question. Pick one, lock it in. Then you find out whether you were right." },
    { key: "lives", type: "lives", title: "THREE LIVES", body: "You start every round with three lives. Get one wrong and you lose a life, but you keep going. Lose all three and the round is over. You do not have to be perfect, and nobody expects you to be." },
    { key: "ladder", type: "ladder", title: "THE LADDER", body: "Every right answer moves you up. A wrong one costs a life and leaves you where you are." },
    { key: "cards", type: "cards", title: "REVIEW CARDS", body: "After every answer, right or wrong, three cards come up one at a time: the law behind it, a phrase to remember, and how it plays out in real life. Take a few seconds with each one. This is the part that actually matters." },
    { key: "points", type: "points", title: "POINTS", body: "Get a question right and each review card you read is worth a point, three per question. Get it wrong and you still see all three cards, because that is when you need them most, but there is no point in it. Points are the only way to buy help." },
    { key: "shop", type: "shop", title: "THE SHOP", body: "Tap SHOP during a question to spend points. 50/50 crosses off two wrong answers. JURY shows how other students voted. COUNSEL gives you a hint. SKIP trades your question for a different one. The first three are free once each; after that, and for SKIP, you pay." },
    { key: "ready", type: "ready", title: "LET'S GO", body: "Three lives. Four lifelines. No do-overs on the round itself." }
  ],
  walkthroughStepPrefix: "Step",
  walkthroughSkipLabel: "Skip walkthrough",
  walkthroughNextLabel: "Next",
  walkthroughPlayLabel: "Play",
  homeButton: "\u2190 Home",
  homeConfirm: { title: "Leave this game?", body: "Your progress will be lost.", leaveLabel: "Leave", stayLabel: "Keep playing" },
  // Lives, which replaced both the one-miss-and-out rule and the SHIELD
  // lifeline. Wording avoids "you failed" language throughout: a lost life is a
  // cost, not a verdict.
  lives: {
    label: "Lives",
    lostOne: "That one cost you a life.",
    lastOne: "One life left. Take your time.",
    outOfLives: "That was your last life.",
    remaining: (n) => n === 1 ? "1 life left" : `${n} lives left`
  },
  // The four surviving lifelines. SHIELD is gone: it survived one wrong answer,
  // which is now the standing rule three times over, and selling somebody a
  // thing they already have for free is how a shop loses trust.
  lifelines: {
    fifty: { label: "50/50", shortDesc: "Two wrong answers get crossed off.", fullDesc: "Two of the wrong answers get crossed off, leaving you with the correct one and one other choice. Best when you can narrow it down to two guesses." },
    poll: { label: "JURY", shortDesc: "See how other students answered.", fullDesc: "A panel of other students voted on this same question. You see what percentage picked each answer. Trust it more when the top answer is way ahead.", inGameLabel: "Jury" },
    hint: { label: "COUNSEL", shortDesc: "A lawyer gives you a hint.", fullDesc: "A lawyer gives you a hint about the question. It won't give away the answer, but it will point you in the right direction.", inGameLabel: "Counsel" },
    skip: { label: "SKIP", shortDesc: "Trade this question for another.", fullDesc: "Swaps your current question for a different one from this chapter that you have not seen yet this run. Costs a life nothing, but it does cost points." }
  },
  lifelineConfirm: {
    useLabel: "Use it",
    cancelLabel: "Cancel",
    remainingOne: "This is your last free one.",
    remainingMany: (e) => `${e} free lifelines left after this.`
  },
  shop: {
    title: "LIFELINES",
    blurb: "The first three are free once each. Buy any of them back, or buy a SKIP, with points from reading review cards after a right answer.",
    ptsLabel: "PTS",
    closeLabel: "Close",
    openLabel: "SHOP",
    readyLabel: "READY",
    armedLabel: "ARMED",
    useLabel: "Use",
    freeState: "Ready to use, free",
    buyState: (p) => `Buy for ${p} pts`,
    buyBackState: (p) => `Buy back for ${p} pts`,
    needState: (p) => `Need ${p} pts`
  },
  q15Choice: { takePrize: "Take the prize", keepGoing: "Keep going" },
  endlessMode: { headerLabel: "BONUS", ladderLabel: "BONUS ROUND" },
  endScreens: {
    won: { headline: "ROUND DONE", sub: "You made it to the end. That is the whole set." },
    gameoverLate: { headline: "SO CLOSE", sub: "Three lives gone, and you got a long way first. Come back when you want another shot." },
    gameoverEarly: { headline: "OUT OF LIVES", sub: "That's on us if you didn't know. Now you do. Play again when you're ready." },
    endlessEnd: { headline: "CHAMPION", sub: "You cleared the round and kept going. Not bad at all." },
    endlessChampion: { headline: "LEGEND", sub: "You answered every question in the entire deck. Genuinely legendary." },
    missedQuestionLabel: "The ones you missed",
    scoreLabel: (right, wrong) => `${right} right, ${wrong} wrong`,
    playAgainLabel: "Play again",
    footerNote: "Each run pulls a fresh set of questions",
    bonusStreakLabel: "Bonus streak"
  },
  cardMeta: [
    { key: "info", label: "THE LAW", icon: "\u2696" },
    { key: "phrase", label: "REMEMBER THIS", icon: "\u201C \u201D" },
    { key: "reallife", label: "IN REAL LIFE", icon: "\uD83D\uDCAC" }
  ],
  // The review cards. The acknowledgment beat survives from the no-points
  // version because the pause is what makes somebody look at the card. What
  // came back is the reward on the same tap: on a right answer "I understand"
  // is also worth a point. On a wrong answer the cards are identical and the
  // tap is identical, there is just nothing to bank.
  review: {
    acknowledgeLabel: "I understand",
    acknowledgeScoringLabel: "I understand  +1",
    acknowledgedLabel: "Got it",
    acknowledgedScoringLabel: "Point earned",
    readingLabel: "Reading\u2026",
    acknowledgeFirstLabel: "Tap I understand",
    noPointsNote: "Review \u00B7 no points on a miss",
    pointsOfLabel: (n, of) => `${n} of ${of}`,
    allEarnedLabel: "All earned!",
    pointsLabel: "Points",
    skipLabel: "Skip \u2192",
    skipLabelScoring: "Skip Review (no points) \u2192",
    skipConfirmTitle: "Skip the review?",
    skipConfirmBody: "This is the part that explains why the answer is what it is, and you will not get the points.",
    skipConfirmPrimary: "Skip anyway",
    skipConfirmSecondary: "Keep reading"
  },
  // Shown once per session, on the pre-round screen, above that chapter's own
  // safety note. Session-scoped because nothing is ever stored on the device.
  disclaimer: {
    title: "BEFORE YOU START",
    lines: [
      "This game teaches how rights generally work. It is not legal advice.",
      "Laws change, and some rules are different from state to state.",
      "If something real is happening to you, talk to a lawyer about your own situation."
    ],
    button: "Got it"
  },
  // The demo. Everything a player sees in the event build lives here.
  // No safety note and no pre-round screen: the walkthrough's first slide is
  // the safety brief, and repeating it at a table where somebody is standing
  // next to the player buys nothing.
  demo: {
    eyebrow: "START HERE",
    title: "PLAY THE DEMO",
    blurb: "Five quick questions about your rights, shuffled every time. Three lives. The rest of the map is still being written.",
    playLabel: "Play now",
    runLabel: (n, of) => `Round ${n} of ${of}`,
    tryAgainLabel: "Try again",
    introHeadline: "THREE TRIES",
    notPlayedLabel: "not played",
    notNeededLabel: "not needed",
    wonBestOn: (r) => `You cleared it on round ${r}, so that is your turn done, at the top.`,
    wonRunsLabel: "you cleared it",
    bannerWonTitle: "ALL FIVE",
    bannerWonBlurb: "You got all five. Show your screen to get your prize.",
    introSub: (n) => `Five questions, three lives, ${n} tries. Your best round is the one that counts.`,
    introStartLabel: "Start",
    outOfRunsHeadline: "THANKS FOR PLAYING",
    outOfRunsSub: "That was all three. Show this screen to get your prize.",
    outOfRunsBest: (n) => `Your best score was ${n} out of 5.`,
    outOfRunsFooter: "Check back over the coming months. We are adding more topics and more questions for you to learn.",
    wonHeadline: "ALL FIVE",
    wonSub: "Five out of five. Nobody needs to tell you your rights.",
    roundHeadline: "END OF THE ROUND",
    // The line the player reads first. Right and wrong, plainly, with no
    // mention of lives: how many are left is a mechanic mid-round and noise
    // once the round is over.
    scoreSummary: (right, wrong) => `You got ${right} right and ${wrong} wrong.`,
    scoreboardTitle: "How your rounds went",
    roundWord: "Round",
    correctWord: "right",
    wrongWord: "wrong",
    bestLabel: "Best round",
    tierLabel: "Prize level",
    // Retuned for a five-question round. The old tiers (15/10/5) were written
    // against a fifteen-question deck and would all read as "not there yet".
    tiers: [
      { at: 5, name: "ALL FIVE" },
      { at: 4, name: "MADE FOUR" },
      { at: 3, name: "MADE THREE" }
    ],
    noTier: "Not there yet",
    reachedLabel: (n) => `You got ${n} right.`,
    reachedAll: "You got all five right.",
    loadErrorTitle: "THE DEMO DID NOT LOAD",
    loadErrorBody: "Its questions could not be fetched. Check the connection and try again."
  },
  safetyHeading: "GETTING HOME SAFE COMES FIRST",
  roundStart: "Start the round \u2192",
  verdictContinue: "See what it means \u2192",
  verdictContinueWrong: "Learn why \u2192"
};
