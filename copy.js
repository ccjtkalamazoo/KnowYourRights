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
    headline: "Fifteen questions about your rights.",
    headlineAccent: "How many can you get?",
    subtitle: "Real situations. What you can say, what you can refuse, what the law actually is. Three lifelines if you need help."
  },
  playLabel: "Play",
  walkthrough: [
    { key: "safety", type: "safety", title: "READ THIS FIRST", body: "This game teaches your legal rights so you never face a law enforcement encounter with no idea what to do. But knowing a right and safely using it are different things. Sometimes your rights will be violated, and the street is not the place to make that point. Your number one goal is to get home safe. Stay calm, keep your hands visible, follow instructions, and do what you have to do to survive. You fight an unfair stop later, in court, with a lawyer, not in the moment. It is completely fine to get a question wrong here. It is far more dangerous to be in that situation knowing nothing at all." },
    { key: "ladder", type: "ladder", title: "THE LADDER", body: "Each question is worth more than the last. Get all 15 right and you win it all." },
    { key: "questions", type: "questions", title: "THE QUESTIONS", body: "Four choices per question. Pick one, lock it in. Miss one and the game ends." },
    { key: "cards", type: "cards", title: "REVIEW CARDS", body: "After you answer, you find out if you were right, then three cards flip up one at a time: the law behind it, a phrase to remember, and how it plays out in real life. Take a few seconds with each one." },
    { key: "points", type: "points", title: "POINTS", body: "Each review card you read earns a point, up to three per question. Open the Lifelines button during a question to spend points buying back lifelines you have used, so reading pays off when you get stuck later." },
    { key: "fifty", type: "lifeline", lifelineKey: "fifty", title: "50/50", body: "Your lifelines live behind the Lifelines button on the question screen. The first, 50/50, crosses off two wrong answers, leaving the correct one and one other choice. Best when you can narrow it down to two guesses." },
    { key: "jury", type: "lifeline", lifelineKey: "poll", title: "JURY", body: "A panel of other students voted on this question. You see what percentage picked each answer. The crowd is usually right, but not always. Trust it more when the top answer is way ahead." },
    { key: "counsel", type: "lifeline", lifelineKey: "hint", title: "COUNSEL", body: "A lawyer gives you a hint about the question. It won't give away the answer, but it will point you in the right direction. Save this one for when you're truly stuck." },
    { key: "shop", type: "shop", title: "THE SHOP", body: "Spend points in the Lifelines shop. Buy back any lifeline you have used, or buy two extras: a Shield that survives one wrong answer, and a Skip that trades your question for another. When you win, you will see exactly what you used and what you had left." },
    { key: "ready", type: "ready", title: "LET'S GO", body: "Fifteen questions. Five lifelines in the shop. No do-overs." }
  ],
  walkthroughStepPrefix: "Step",
  walkthroughSkipLabel: "Skip walkthrough",
  walkthroughNextLabel: "Next",
  walkthroughPlayLabel: "Play",
  homeButton: "\u2190 Home",
  homeConfirm: { title: "Leave this game?", body: "Your progress will be lost.", leaveLabel: "Leave", stayLabel: "Keep playing" },
  lifelines: {
    fifty: { label: "50/50", shortDesc: "Two wrong answers get crossed off.", fullDesc: "Two of the wrong answers get crossed off, leaving you with the correct one and one other choice. Best when you can narrow it down to two guesses." },
    poll: { label: "JURY", shortDesc: "See how other students answered.", fullDesc: "A panel of other students voted on this same question. You see what percentage picked each answer. Trust it more when the top answer is way ahead.", inGameLabel: "Jury" },
    hint: { label: "COUNSEL", shortDesc: "A lawyer gives you a hint.", fullDesc: "A lawyer gives you a hint about the question. It won't give away the answer, but it will point you in the right direction.", inGameLabel: "Counsel" },
    shield: { label: "SHIELD", shortDesc: "Survive one wrong answer.", fullDesc: "Arm it now. The next time you lock in a wrong answer, the shield takes the hit instead of ending your game, crosses that wrong choice off, and lets you pick again." },
    skip: { label: "SKIP", shortDesc: "Trade this question for another.", fullDesc: "Swaps your current question for a different one of the same difficulty that you haven't seen yet this run." }
  },
  lifelineConfirm: {
    useLabel: "Use it",
    cancelLabel: "Cancel",
    remainingOne: "This is your last one.",
    remainingMany: (e) => `${e} lifelines left after this.`
  },
  q15Choice: { takePrize: "Take the prize", keepGoing: "Keep going" },
  endlessMode: { headerLabel: "BONUS", ladderLabel: "BONUS ROUND" },
  endScreens: {
    won: { headline: "YOU WON", sub: "Fifteen out of fifteen. You actually know this stuff." },
    gameoverLate: { headline: "SO CLOSE", sub: "Almost. Rights are worth getting right. Come back when you want another shot." },
    gameoverEarly: { headline: "GAME OVER", sub: "That's on us if you didn't know. Now you do. Play again when you're ready." },
    endlessEnd: { headline: "CHAMPION", sub: "You won the million and kept going. Not bad at all." },
    endlessChampion: { headline: "LEGEND", sub: "You answered every question in the entire deck. Genuinely legendary." },
    missedQuestionLabel: "The question you missed",
    playAgainLabel: "Play again",
    footerNote: "Each run pulls a fresh set of questions",
    bonusStreakLabel: "Bonus streak"
  },
  cardMeta: [
    { key: "info", label: "THE LAW", icon: "\u2696" },
    { key: "phrase", label: "REMEMBER THIS", icon: "\u201C \u201D" },
    { key: "reallife", label: "IN REAL LIFE", icon: "\uD83D\uDCAC" }
  ],
  verdictContinue: "See what it means \u2192",
  verdictContinueWrong: "Learn why \u2192"
};
