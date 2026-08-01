// Know Your Rights · CCJT
// questions.js : pure data. No logic, no components, no imports.
//
//   QUESTIONS : the question bank, keyed by difficulty tier.
//   R         : every piece of user-facing copy in the game.
//
// Keeping all the words in one place means copy edits never touch component
// code, and it is where a glossary or translations would slot in later.
//
// ---------------------------------------------------------------------------
// QUESTION SHAPE
// ---------------------------------------------------------------------------
//   q                  the question stem
//   options[4]         the four answers. Index 0 is ALWAYS correct in the source
//                      data; the deck builder shuffles positions at runtime, so
//                      authors never think about placement.
//   correct            always 0 in source (see above)
//   hint               shown by the COUNSEL lifeline. Points toward the answer
//                      without giving it away.
//   optionExplanations each wrong option gets a sentence naming the MISCONCEPTION
//                      it represents. Index 0 (the correct answer) is null.
//                      This is the heart of the design: a wrong answer is not
//                      just wrong, it is a named false belief. It is also what
//                      makes the game a measurement instrument, since wrong-answer
//                      rates map to specific false beliefs people actually hold.
//   principle          the "THE LAW" review card. The full explanation.
//   keyPhrase          the "REMEMBER THIS" review card. { quote, gloss }
//   scenario           the "IN REAL LIFE" review card. { setup, lines[], note }
//
// ---------------------------------------------------------------------------
// AUTHORING RULES (load-bearing, not style preferences)
// ---------------------------------------------------------------------------
//   * Safety first. Anything touching a live encounter says: comply now,
//     challenge later. The street is not where you win a bad stop.
//   * Distractors are real misconceptions, never filler.
//   * Roughly a sixth-grade reading level.
//   * No em dashes.
//   * Correct answer at index 0. Always.
//
// Attorney review is a hard launch gate before any student sees these.

export const QUESTIONS = {
  easy: [
    {
      q: "A police officer starts asking you questions. What actually turns on your right to stay silent?",
      options: ["Saying out loud that you're staying silent", "Just going quiet, that counts as using the right", "Answering the small questions but not the big ones", "Telling them only your side so they understand"],
      correct: 0,
      hint: "A right the officer can't tell you're using doesn't protect you yet. How do you make it clear?",
      optionExplanations: [null, "This is the big one people get wrong. Courts have said going quiet by itself does NOT count (Berghuis v. Thompkins). You have to say it out loud.", "There's no 'safe' half-answer. Once you start talking, what you say can be used. Silence is all-or-nothing, and you have to claim it.", "Telling 'your side' feels smart but it's still talking, and it can be used against you. Say you're staying silent instead."],
      principle: "Weird but true: staying quiet doesn't legally count as using your right. In Berghuis v. Thompkins, someone stayed silent for hours, then spoke, and that statement was used against them. Saying the words out loud is what switches the protection on. Say it calmly, keep your hands visible, and stay polite while you do.",
      keyPhrase: { quote: "\"I'm going to stay silent.\"", gloss: "Say it out loud, stay calm. Silence alone doesn't count." },
      scenario: { setup: "An officer starts firing off questions.", lines: [{ label: "OFFICER", text: "Where were you tonight?" }, { label: "YOU (calm)", text: "I'm choosing to stay silent." }], note: "Say it once, keep it respectful, and let a lawyer handle the rest later." }
    },
    {
      q: "Which sentence most clearly tells police you want a lawyer?",
      options: ["\"I want a lawyer.\"", "\"I don't really want to talk right now.\"", "\"Maybe I should get a lawyer?\"", "\"I can't afford a lawyer, so never mind.\""],
      correct: 0,
      hint: "The power is in being crystal clear, not polite or unsure. Which one leaves zero doubt?",
      optionExplanations: [null, "Soft and unsure reads as maybe, not a request. It doesn't clearly ask for a lawyer the way plain words do.", "The word 'maybe' is the problem. The Supreme Court (Davis v. United States) said an unsure request doesn't count.", "Lots of people think no money means no lawyer. Not true. If you can't afford one, the court gives you one for free. Ask anyway."],
      principle: "The Supreme Court (Davis v. United States) said a wobbly request doesn't count. Police can keep questioning after 'maybe' or 'do I?' Only a clear statement flips the switch. Say it plainly and calmly, then stop talking. You don't need to argue or explain why.",
      keyPhrase: { quote: "\"I want a lawyer.\"", gloss: "Clear words, no 'maybe,' no question mark. Then go quiet." },
      scenario: { setup: "The officer keeps pushing for a quick answer.", lines: [{ label: "OFFICER", text: "Just tell me what happened, quick." }, { label: "YOU (calm)", text: "I want a lawyer." }], note: "Say it clearly once. If questions continue anyway, stay silent and wait." }
    },
    {
      q: "An officer asks, \"Mind if I search your bag?\" What can you say?",
      options: ["That you don't consent to the search", "Yes, since you have nothing to hide anyway", "Nothing, because they can search whenever they want", "Yes, but only your outside pockets"],
      correct: 0,
      hint: "They're asking permission for a reason. But how you say no matters as much as saying it.",
      optionExplanations: [null, "The 'nothing to hide' idea gets people to give up a right for no reason. Saying no isn't about hiding, it's your right, and it protects you later.", "People think police can always search. Not true. A question means they're asking, and you can say no.", "Agreeing to 'just a little' is still agreeing. You can decline the whole thing calmly."],
      principle: "Saying no to a search is your legal right, and once you consent they can look through whatever you agreed to. Refusing calmly is not resisting. Say it once, keep your hands where they can be seen, and don't physically block them. If they search anyway, your clear objection is what a lawyer uses to challenge it later.",
      keyPhrase: { quote: "\"I don't consent to searches.\"", gloss: "Polite, clear, legal to say. Then let it go and stay calm." },
      scenario: { setup: "An officer points at your backpack.", lines: [{ label: "OFFICER", text: "Mind if I check your bag?" }, { label: "YOU (calm)", text: "I don't consent to a search." }], note: "If they search anyway, don't fight it. Your objection helps a lawyer challenge it later." }
    },
    {
      q: "You're stopped on the sidewalk and not sure if you can go. What's the smartest question to ask?",
      options: ["\"Am I free to leave?\"", "\"Why are you stopping me?\"", "\"What did I do wrong?\"", "\"Can I just go now?\""],
      correct: 0,
      hint: "You want one clean piece of information: are you being held, or not? Which question gets that, calmly?",
      optionExplanations: [null, "Demanding a reason feels bold, but it starts an argument and still doesn't tell you if you're being held. Ask if you can leave instead.", "This assumes you're in trouble and invites them to question you about it. You don't want to open that door before you know if you're even detained.", "Asking softly for permission is weaker than it sounds. It reads as pleading, and a vague 'can I go?' may not get you a clear answer the way 'am I free to leave?' does."],
      principle: "There are two situations: a consensual encounter (you can walk) and a detention (you can't). This calm question tells you which one you're in. If they say you're free, you can go. If not, you stay, stay calm, and save the fight for court. Asking politely keeps the moment from escalating.",
      keyPhrase: { quote: "\"Am I free to leave?\"", gloss: "One calm question tells you if you can walk or should stay." },
      scenario: { setup: "It's late and an officer stops you on your way home.", lines: [{ label: "YOU (calm)", text: "Am I free to leave?" }, { label: "IF YES", text: "Calmly walk away." }, { label: "IF NO", text: "Stay, stay calm, ask for a parent or lawyer." }], note: "Either way, keep your hands visible and your voice level." }
    },
    {
      q: "The stop feels completely unfair and you're sure the police have no reason. What's the smartest thing to do?",
      options: ["Stay calm, keep hands visible, and challenge it later in court", "Pull away, since the stop is illegal anyway", "Record it and refuse to move until they explain", "Explain the law to them so they realize they're wrong"],
      correct: 0,
      hint: "Being right doesn't make the street safe. Where do you actually win an unfair stop, on the sidewalk or later?",
      optionExplanations: [null, "Many people think an illegal stop means they can resist. It doesn't. Pulling away is its own crime and it's dangerous. Comply now, win later.", "Refusing to move can turn a stop into an arrest and raise the danger. You can remember details, but keep yourself safe first.", "Being right doesn't help you on the street, and arguing can escalate fast. Save the law for court, where it actually counts."],
      principle: "There's a hard truth in criminal law: you might beat the rap, but you can't beat the ride. Resisting is its own charge even when the stop was wrong, and on the street the risk to your safety is real, especially for people of color. The move is to survive the moment: stay calm, comply, remember details, and let a lawyer challenge the stop later, where you can actually win.",
      keyPhrase: { quote: "Survive now. Win it in court.", gloss: "An unfair stop is fought later, safely, not on the street." },
      scenario: { setup: "The stop feels wrong and you know they've got nothing.", lines: [{ label: "STAY CALM", text: "Hands visible. Don't run. Don't pull away." }, { label: "REMEMBER", text: "Badge and car numbers. What was said." }, { label: "LATER", text: "A lawyer challenges an unlawful stop in court." }], note: "Your safety comes first. Being right is worth nothing if the moment turns dangerous." }
    },
    {
      q: "You're a passenger in a car that gets pulled over in Michigan. What does the law require of YOU?",
      options: ["Not much, though handing over ID if asked can keep things calm", "The same license and paperwork the driver has to show", "Whatever the officer asks for, or you can be arrested", "Your name and address, always, by law"],
      correct: 0,
      hint: "The driver's duties aren't automatically yours. But the smartest move also weighs safety, not just what's required.",
      optionExplanations: [null, "People assume everyone in the car has the driver's duties. Only the driver must show a license. A passenger's rules are different.", "You can't be arrested just for not answering a passenger's questions in Michigan. But refusing can raise tension, so weigh your safety.", "Many think you must always give your name. In Michigan, a passenger generally doesn't have to, unless there's real suspicion of a crime."],
      principle: "Michigan is not a stop-and-identify state, so a passenger generally doesn't have to show ID or give a name unless there's specific suspicion of a crime. That's your right. But standing on it can escalate a stop, and that risk falls harder on people of color. Knowing you don't legally have to is different from deciding it's safe to refuse in the moment. You can hand over ID to keep things calm and still stay silent on everything else.",
      keyPhrase: { quote: "Know the right, read the room.", gloss: "A passenger's ID isn't legally required, but safety comes first." },
      scenario: { setup: "You're riding shotgun when the car gets pulled over.", lines: [{ label: "OFFICER", text: "I need ID from everyone." }, { label: "YOU (calm)", text: "[decide what's safe; you can stay silent on questions either way]" }], note: "You have the right to decline. You also have the right to choose safety. Both are real." }
    },
    {
      q: "Immigration officers knock on your door. What's the smartest first move?",
      options: ["Keep the door closed and ask them to show a warrant", "Open the door, since you have to cooperate with ICE", "Step outside to talk so you don't seem like you're hiding", "Answer their questions to prove your status"],
      correct: 0,
      hint: "Opening the door can count as saying yes. What lets you find out what they have without giving anything up?",
      optionExplanations: [null, "People think they must open up. You don't. Opening the door can even count as letting them in. Talk through it first.", "Stepping out gives up your home's protection and can lead to arrest. Stay inside with the door shut.", "You don't have to answer questions about your status, and doing so can hurt you. You have the right to stay silent, whatever your status."],
      principle: "Your home has the strongest privacy protection in the law. Opening the door, or stepping out, can be treated as letting officers in. You can speak calmly through a closed door and ask them to show a warrant first. If they force entry anyway, do not physically resist. Say you don't consent, stay silent, and let a lawyer challenge it. Staying safe matters more than winning the doorway.",
      keyPhrase: { quote: "Talk through the door, stay calm.", gloss: "Don't open it. Ask for a warrant. Don't physically resist if they push in." },
      scenario: { setup: "Loud knocking, voices identifying as immigration officers.", lines: [{ label: "OFFICER", text: "Open up, we need to talk." }, { label: "YOU (calm)", text: "I don't consent to entry. Slide any warrant under the door." }, { label: "IF THEY FORCE IN", text: "Don't resist. Stay silent. Ask for a lawyer." }], note: "You have the right to stay silent and ask for a lawyer, whatever your status." }
    },
    {
      q: "You want to film police making an arrest on a public sidewalk. When are you allowed to?",
      options: ["As long as you keep back and don't interfere", "Only if you have the officers' permission", "Only from your own porch or property", "Yes, and you can walk right up to get a clear shot"],
      correct: 0,
      hint: "The key is a public place and staying out of the way. Their permission was never the deciding factor.",
      optionExplanations: [null, "You don't need permission. Filming police doing public work in public is protected.", "You don't have to be on your own property. A public sidewalk is fine.", "Getting close is the real danger and it can count as interfering. Keep back, stay safe, and you're still protected."],
      principle: "Courts across the country treat filming police doing their public job in public as First Amendment protected, and Michigan recording law is on solid ground when there's no reasonable expectation of privacy. The real limit is simple and safety-based: keep a clear distance, don't get in the way, and don't reach or make sudden moves. If an officer tells you to step back, step back and keep recording from farther away.",
      keyPhrase: { quote: "Film from a safe distance.", gloss: "Public place, public duties, protected. Keep back and keep still." },
      scenario: { setup: "Officers are arresting someone across the street.", lines: [{ label: "YOU CAN", text: "Stand back on the sidewalk and record." }, { label: "IF TOLD TO STEP BACK", text: "Move back calmly and keep filming." }], note: "Recording is protected. Interfering, or sudden moves, are not worth the risk." }
    },
    {
      q: "An officer says \"we can do this the easy way if you just tell me what happened.\" What can you say?",
      options: ["That you're staying silent and want a lawyer", "Nothing, you have to answer once they say that", "Everything, because cooperating gets you off easier", "Just enough to seem helpful, then stop"],
      correct: 0,
      hint: "A friendly-sounding push is still a push. Does the wording change your rights?",
      optionExplanations: [null, "The 'easy way' line is a trick, not a rule. You can still say you're staying silent.", "This is a common belief: that talking gets you a break. It usually just gives them more to use. You can decline, calmly.", "There's no safe amount to say. A little talking can still hurt you. Stay silent and ask for a lawyer."],
      principle: "Officers are allowed to sound friendly and suggest talking will help. That's a technique, not a legal rule. Your right to stay silent and ask for a lawyer works no matter how the question is dressed up. Say the words calmly, then stop. Being quiet is not being difficult, and you don't owe an explanation for using your rights.",
      keyPhrase: { quote: "\"I'm staying silent. I want a lawyer.\"", gloss: "Friendly phrasing doesn't change your rights. Stay calm." },
      scenario: { setup: "The officer leans in with a calm, reassuring tone.", lines: [{ label: "OFFICER", text: "Come on, just help me understand." }, { label: "YOU (calm)", text: "I'm going to stay silent, and I want a lawyer." }], note: "A softer tone is still questioning. The same calm words protect you." }
    },
    {
      q: "A police officer asks to come inside your home to \"just talk.\" What can you do?",
      options: ["Ask if they have a warrant and keep the door shut", "Let them in, since saying no makes you look guilty", "Let them in, because they can come in anyway", "Step outside and close the door behind you to talk"],
      correct: 0,
      hint: "Your home is the place the law protects most. What forces an officer to have real paperwork first?",
      optionExplanations: [null, "Saying no does NOT make you look guilty. It's a normal, legal choice, and it keeps the decision with a judge.", "People think police can always enter. Usually they can't without a warrant or your yes. A request means you can decline.", "Stepping outside gives up your home's protection. You can talk through the door instead, and keep it shut."],
      principle: "The Fourth Amendment gives your home the strongest protection there is. Police generally need a warrant signed by a judge, or your consent, to come inside. Saying no to entry is completely legal and doesn't make you look guilty. Do it calmly through the door. If they enter anyway, don't physically resist; say you don't consent and let a lawyer sort it out. Your safety is the priority.",
      keyPhrase: { quote: "\"Do you have a warrant?\"", gloss: "Without one you can keep the door shut. Stay calm about it." },
      scenario: { setup: "An officer on your porch asks to step inside.", lines: [{ label: "OFFICER", text: "Mind if I come in to talk?" }, { label: "YOU (calm)", text: "I don't consent. Do you have a warrant?" }], note: "Saying no is your right. If they come in anyway, don't resist; challenge it later." }
    },
    {
      q: "You're walking down the street in Michigan and an officer asks your name. Do you have to give it?",
      options: ["Not just because they ask, unless they suspect a crime", "Yes, you always have to give your name to police", "Yes, or you can be arrested for hiding it", "Only if you're under 18"],
      correct: 0,
      hint: "Michigan is different from what TV shows. What has to be true before you owe them a name?",
      optionExplanations: [null, "Many people think you must always give your name. In lots of states that's true, but not Michigan on the street.", "You can't be arrested just for not giving your name to police who lack a real reason to suspect you.", "Age isn't the rule here. It's about whether they have reasonable suspicion of a crime."],
      principle: "Michigan is not a stop-and-identify state. On foot, if police don't have reasonable suspicion you committed a crime, you generally don't have to give your name. That's genuinely different from many other states people see on TV. Knowing the right is one thing; using it safely is another, so stay calm, keep it polite, and weigh whether refusing is worth escalating the moment.",
      keyPhrase: { quote: "Michigan doesn't force your name.", gloss: "No stop-and-identify law here, unless there's real suspicion." },
      scenario: { setup: "You're walking home and an officer asks who you are.", lines: [{ label: "OFFICER", text: "What's your name?" }, { label: "YOU (calm)", text: "Am I free to leave, or am I being detained?" }], note: "Different states have different rules. In Michigan, on foot, a name usually isn't required." }
    },
    {
      q: "Your cousin in another state says you always have to show ID to police. Is that true in Michigan?",
      options: ["Not always here; Michigan's rules are different from many states", "Yes, it's the same law in every state", "Yes, federal law makes it the same everywhere", "Only big cities have different rules"],
      correct: 0,
      hint: "ID rules are set state by state. What works in one place can be wrong next door.",
      optionExplanations: [null, "ID rules aren't the same everywhere. Each state sets its own, and Michigan doesn't have a general one.", "There's no single federal ID-on-demand law for street stops. States differ, and Michigan is on the lighter side.", "It's a state rule, not a city one. The difference is Michigan versus other states, not big city versus small town."],
      principle: "Stop-and-identify rules are set state by state, and Michigan does not have a general one. That means advice from a relative in another state can be confidently wrong here. Being confidently wrong is risky, because you might refuse when you shouldn't or comply when you didn't have to. Learn your own state's rule, and either way, stay calm in the moment.",
      keyPhrase: { quote: "ID rules are state by state.", gloss: "What's true elsewhere may not be true in Michigan." },
      scenario: { setup: "You're comparing notes with family from out of state.", lines: [{ label: "COUSIN", text: "You always have to show ID, that's the law." }, { label: "TRUTH", text: "Not generally in Michigan, on foot, without suspicion." }], note: "About two dozen states have stop-and-identify laws. Michigan is not one of them." }
    },
    {
      q: "An officer is asking you questions and you're not sure you have to stay. What's the smartest thing to say?",
      options: ["\"Am I free to leave?\"", "\"I don't have to tell you anything, ever.\"", "\"You can't talk to me without a reason.\"", "\"I'll answer if you tell me why first.\""],
      correct: 0,
      hint: "You want one clean fact: can you walk, or not? Which line gets it without starting a fight?",
      optionExplanations: [null, "That's a challenge, not a question, and it can escalate things. Ask calmly whether you can leave instead.", "Arguing about whether they can talk to you starts a fight. A calm question gets you information.", "Bargaining invites back-and-forth. Just ask plainly if you're free to go."],
      principle: "Asking 'am I free to leave?' calmly is the single best move when you're unsure. It tells you which situation you're in without arguing. If they say yes, you can go. If they say no, you're detained, so stay, stay calm, and save any dispute for later. A calm question keeps the encounter from heating up.",
      keyPhrase: { quote: "\"Am I free to leave?\"", gloss: "The calm question that tells you if you can walk." },
      scenario: { setup: "The questions keep coming and you want to know where you stand.", lines: [{ label: "YOU (calm)", text: "Am I free to leave?" }, { label: "IF YES", text: "You can go, calmly." }, { label: "IF NO", text: "You're detained. Stay calm, stay silent." }], note: "One calm question, either answer, keeps you safer than arguing." }
    },
    {
      q: "An officer asks to search your bag and you know it's clean. What's the smart move?",
      options: ["You can still say you don't consent; it's your right", "Let them, since you have nothing to hide", "Let them, or it looks like you're guilty", "Open it yourself to speed things up"],
      correct: 0,
      hint: "Saying no isn't about hiding anything. Why might you decline even when you're clean?",
      optionExplanations: [null, "The 'nothing to hide' idea gets people to give up a right for no reason. Declining isn't about hiding; it's your right, and it protects you.", "Refusing a search is normal and legal. It can't be used to say you're guilty.", "Opening it yourself is consenting. You can keep it closed and calmly decline."],
      principle: "You can refuse consent to a search even when you have nothing to hide, and refusing is not evidence of guilt. The 'nothing to hide' belief is one of the most common reasons people give up a protection they had. Saying no calmly, once, keeps your rights intact for a lawyer to use later. Don't physically block or grab your bag; just state that you don't consent.",
      keyPhrase: { quote: "\"I don't consent to searches.\"", gloss: "Saying no isn't hiding. It's your right, clean bag or not." },
      scenario: { setup: "An officer points at your bag and asks to look.", lines: [{ label: "OFFICER", text: "Mind if I take a look?" }, { label: "YOU (calm)", text: "I don't consent to a search." }], note: "If they search anyway, don't resist. Your calm 'no' helps later." }
    },
    {
      q: "Can police use the fact that you refused a search to say you're guilty?",
      options: ["No, refusing a search can't be used as proof of guilt", "Yes, only guilty people say no", "Yes, refusing counts against you in court", "Only if you refuse in an angry way"],
      correct: 0,
      hint: "If saying no could prove guilt, the right to say no would be worthless. So what must be true?",
      optionExplanations: [null, "The 'only guilty people refuse' idea is exactly the myth that makes people give up the right. It's false.", "Your refusal isn't evidence against you. A right you get punished for using wouldn't be a right.", "Tone doesn't turn a lawful 'no' into proof of guilt. Just keep it calm to stay safe."],
      principle: "Refusing a search cannot be used as evidence that you're guilty. If it could, the right to refuse would mean nothing. This is worth knowing because the fear of 'looking guilty' is the main reason people consent to searches they could have declined. Say no calmly and it stays your protected choice. Keeping a level tone isn't about the law; it's about staying safe.",
      keyPhrase: { quote: "Saying no isn't proof of guilt.", gloss: "A right you'd be punished for using wouldn't be a right." },
      scenario: { setup: "You worry that declining will look bad.", lines: [{ label: "THE FEAR", text: "Refusing makes me look guilty." }, { label: "THE TRUTH", text: "Refusal can't be used as evidence of guilt." }], note: "Decline calmly. It's a protected choice, not an admission." }
    },
    {
      q: "An officer walks up and starts chatting with no sign you did anything. What can you do?",
      options: ["Politely decline to answer and walk away", "Nothing, you have to answer once they start", "Answer everything so you don't seem rude", "Wait until they say you can go"],
      correct: 0,
      hint: "If they have no suspicion, this is the lightest kind of contact. What does that let you do?",
      optionExplanations: [null, "A big myth: that any officer talking to you means you're being held. With no suspicion, you can decline and go.", "Politeness isn't a legal duty to answer. You can be respectful and still decline.", "You don't have to wait for permission in a consensual chat. That's what makes it consensual."],
      principle: "When an officer talks to you with no suspicion, that's a consensual encounter: you can decline to answer and walk away. Most people treat every police contact as a detention they're stuck in, but that's not the case. You can find out which situation you're in by asking calmly if you're free to leave. Stay polite and calm; you can exercise the right without being confrontational.",
      keyPhrase: { quote: "No suspicion means you can go.", gloss: "A consensual chat isn't a detention. You can decline." },
      scenario: { setup: "An officer strikes up a conversation for no clear reason.", lines: [{ label: "YOU (calm)", text: "Am I free to leave?" }, { label: "IF YES", text: "You can decline to answer and walk on." }], note: "Not every police contact is a detention. Ask calmly to find out." }
    },
    {
      q: "What does an officer need to actually arrest you?",
      options: ["Probable cause, a higher bar than a brief stop needs", "Just a hunch that you might have done something", "Nothing, they can arrest anyone anytime", "Only your refusal to answer questions"],
      correct: 0,
      hint: "An arrest is the most serious tier, so it needs the strongest reason. More than a stop needs.",
      optionExplanations: [null, "A hunch is too weak for an arrest. That's closer to what a brief stop needs, and even that needs specific facts.", "They can't arrest anyone anytime. An arrest needs probable cause, a real, higher standard.", "Refusing to answer questions isn't grounds for arrest by itself. Silence is your right."],
      principle: "An arrest requires probable cause, a higher bar than the reasonable suspicion needed for a brief stop. Probable cause means facts strong enough to reasonably believe you committed a crime. Knowing this tells you how serious the situation is. But remember: even an arrest you believe is wrong is not fought on the street. Comply, stay calm, keep your hands visible, and challenge it later with a lawyer.",
      keyPhrase: { quote: "Arrest needs probable cause.", gloss: "A higher bar than a brief stop. Fight a bad one in court." },
      scenario: { setup: "You're being taken into custody.", lines: [{ label: "ARREST", text: "Needs probable cause, the higher bar." }, { label: "YOU", text: "Stay calm. Ask for a lawyer. Don't resist." }], note: "Even a wrong arrest is challenged later, not on the street." }
    },
    {
      q: "On TV, police read rights the second they cuff someone. Is that when Miranda is actually required?",
      options: ["No, only before they question you while you're in custody", "Yes, they must read it the moment cuffs go on", "Yes, or the arrest doesn't count", "Only if you ask them to read it"],
      correct: 0,
      hint: "Miranda protects you from pressured questioning. So what has to be happening, not just the cuffs?",
      optionExplanations: [null, "The handcuffs myth is huge, straight from TV. Cuffs alone don't trigger Miranda. Questioning in custody does.", "An arrest is still valid even if no one reads Miranda. Miranda is about questioning, not the arrest itself.", "You don't have to ask for it. It's required only before custodial questioning, whether you ask or not."],
      principle: "Miranda warnings are required only before custodial interrogation: you have to be both in custody and being questioned. Police are not required to read them the instant they arrest you, or at all if they don't question you. TV makes people think the cuffs trigger it. What actually matters is the questioning. Knowing this keeps you from assuming your rights were 'violated' when they weren't, and from missing when they actually are.",
      keyPhrase: { quote: "Custody plus questioning.", gloss: "Not the cuffs. Miranda is about being questioned in custody." },
      scenario: { setup: "You're arrested and no one reads you anything.", lines: [{ label: "NOT A TRIGGER", text: "Handcuffs by themselves." }, { label: "TRIGGER", text: "Being questioned while in custody." }], note: "If they don't question you, they may never need to read Miranda." }
    },
    {
      q: "You're being questioned in custody and want it to stop. What works best?",
      options: ["Clearly say you're staying silent and want a lawyer", "Just stop talking and hope they quit", "Answer a little, then go quiet", "Wait for them to offer you a lawyer"],
      correct: 0,
      hint: "A right you use out loud works better than one you keep in your head. What makes it clear?",
      optionExplanations: [null, "Just going quiet is weaker than saying it. Courts have said you generally need to clearly invoke the right.", "A little answering can still be used against you, and it muddies your invocation. Say it clearly and stop.", "They usually won't offer. You have to ask clearly for a lawyer."],
      principle: "To stop custodial questioning, clearly say you're staying silent and that you want a lawyer, then stop answering. Just going quiet is weaker, and courts have said an unclear invocation may not count. Saying it plainly and calmly is the switch. You don't have to argue or explain; a short, clear statement does the work, and then silence protects you.",
      keyPhrase: { quote: "Say it clearly, then stop.", gloss: "Invoke silence and a lawyer out loud. Don't half-answer." },
      scenario: { setup: "The questions keep coming and you want them to end.", lines: [{ label: "YOU (calm)", text: "I'm staying silent, and I want a lawyer." }, { label: "THEN", text: "Stop answering. Don't get drawn back in." }], note: "A clear statement is the switch. Silence keeps it on." }
    },
    {
      q: "Is it legal to record police doing their job out in public?",
      options: ["Yes, you have a First Amendment right to record them in public", "No, filming police is against the law", "Only news reporters can legally record police", "Only if the officers say it's okay"],
      correct: 0,
      hint: "Courts have treated this like press freedom for regular people. So who does the right belong to?",
      optionExplanations: [null, "A widespread myth: that recording police is a crime. Courts across the country protect filming them in public.", "It isn't limited to reporters. Ordinary people have the same right to record in public.", "You don't need their permission. The right doesn't depend on the officers agreeing."],
      principle: "You have a First Amendment right to record police doing their public duties in public. Courts across the country treat this as protected, basically press freedom for everyone, not just reporters. This applies whether you're a bystander or recording your own stop. The limit is about safety and interference, not permission. Keep back, don't get in the way, and don't make sudden moves.",
      keyPhrase: { quote: "Recording police is protected.", gloss: "Public duties in public. Not just for reporters." },
      scenario: { setup: "You see officers working and want to film.", lines: [{ label: "YOU CAN", text: "Record from a safe distance in public." }, { label: "LIMIT", text: "Don't interfere or crowd the scene." }], note: "Keep back and stay still. The right is real; interfering isn't protected." }
    },
    {
      q: "Police knock and want to come in. Do you have to open the door?",
      options: ["Generally no, not without a warrant signed by a judge", "Yes, you always have to open up for police", "Yes, or it counts as resisting", "Only if you're the one they're looking for"],
      correct: 0,
      hint: "Your home has the strongest protection there is. What forces the door open?",
      optionExplanations: [null, "A common belief: that a knock means you must open up. Usually you don't, not without a judge's warrant or your consent.", "Not opening the door isn't resisting. You can talk through it and stay calm.", "Even if they're looking for you, the warrant question still decides whether they can enter."],
      principle: "You generally don't have to open your door unless police have a warrant signed by a judge. Your home carries the strongest privacy protection in the law. You can talk calmly through a closed door and ask them to show the warrant first. If they force entry anyway, don't physically resist; say you don't consent, stay silent, and let a lawyer challenge it. Your safety comes before winning the doorway.",
      keyPhrase: { quote: "No judge's warrant, no duty to open.", gloss: "Talk through the door. Don't resist if they force in." },
      scenario: { setup: "There's a knock and police want to enter.", lines: [{ label: "YOU (calm)", text: "Do you have a warrant signed by a judge?" }, { label: "IF NO", text: "You can keep the door shut." }, { label: "IF THEY FORCE IN", text: "Don't resist. Say you don't consent." }], note: "Saying no isn't resisting. Safety comes before the doorway." }
    },
    {
      q: "If you stay silent when police question you, can that silence be used to prove you're guilty?",
      options: ["No, using your right to silence can't be treated as guilt", "Yes, staying quiet makes you look guilty in court", "Yes, only guilty people stay silent", "Only if you stay silent the whole time"],
      correct: 0,
      hint: "If using a right could prove guilt, it wouldn't really be a right. So what must be true?",
      optionExplanations: [null, "The 'silence looks guilty' fear is exactly what makes people talk when they shouldn't. Using the right can't be treated as guilt.", "The 'only guilty people stay silent' idea is a myth. Innocent people use the right all the time, and it's protected.", "How long you stay silent doesn't change it. Properly invoked, your silence isn't evidence of guilt."],
      principle: "Using your right to remain silent generally cannot be treated as evidence that you're guilty. If it could, the right would be worthless. The fear that silence 'looks guilty' is one of the main reasons people talk themselves into trouble. Invoke the right clearly and calmly, then let it protect you. Staying calm and polite while you do it also keeps the encounter safer.",
      keyPhrase: { quote: "Silence isn't guilt.", gloss: "Using the right can't be turned into evidence against you." },
      scenario: { setup: "You worry that not answering will look bad.", lines: [{ label: "THE FEAR", text: "Staying silent looks guilty." }, { label: "THE TRUTH", text: "Properly invoked, silence isn't evidence of guilt." }], note: "Invoke it clearly and calmly, then let it protect you." }
    },
    {
      q: "You're just a bystander watching police work in public. Can you record it?",
      options: ["Yes, bystanders can record police doing public duties", "No, only the person being stopped can record", "No, bystanders have to keep walking", "Only if you know the person being stopped"],
      correct: 0,
      hint: "The right protects documenting police in public. Does it require you to be involved?",
      optionExplanations: [null, "Some think only the person involved can film. Bystanders have the right to record police in public too.", "You don't have to keep moving. You can stand at a safe distance and record.", "Knowing the person doesn't matter. Any bystander can record police doing public work."],
      principle: "Bystanders have the right to record police performing their public duties in public, not just the people directly involved. You can stand at a safe distance and film. The limit is the same for everyone: don't interfere or crowd the scene, and follow lawful orders to step back while you keep recording from farther away. Keeping your distance protects both the footage and you.",
      keyPhrase: { quote: "Bystanders can record too.", gloss: "You don't have to be involved to film police in public." },
      scenario: { setup: "You come across officers making an arrest.", lines: [{ label: "YOU CAN", text: "Record from a safe distance as a bystander." }, { label: "LIMIT", text: "Don't crowd or interfere." }], note: "Keep back. The right is real; interfering isn't protected." }
    },
    {
      q: "Police push into your home even though you said no and saw no warrant. What's the safe move?",
      options: ["Don't physically resist; say you don't consent and challenge it later", "Physically block them, since they had no warrant", "Fight back because your rights were violated", "Chase them out of the house"],
      correct: 0,
      hint: "Being right doesn't make the moment safe. Where do you actually win an illegal entry?",
      optionExplanations: [null, "Many think a rights violation means they can physically stop it. It doesn't, and resisting is dangerous. Say no, then challenge it later.", "Fighting back can get you hurt and can add charges, even if the entry was wrong. Stay calm.", "Physically confronting officers is dangerous and can create new charges. The place to win is court."],
      principle: "Even if police enter your home wrongly, without a warrant and against your 'no,' the safe move is not to physically resist. Resisting is dangerous and can add new charges, even when the entry was illegal. State clearly that you don't consent, stay calm, keep your hands visible, remember the details, and let a lawyer challenge the entry later. You might be completely right, and you still win it in court, not in the doorway.",
      keyPhrase: { quote: "Don't fight the entry.", gloss: "Say you don't consent, stay safe, challenge it later." },
      scenario: { setup: "Officers force their way in despite your refusal.", lines: [{ label: "YOU (calm)", text: "I don't consent to this." }, { label: "THEN", text: "Don't resist. Remember details. Call a lawyer." }], note: "Even a wrong entry is challenged in court, not the doorway." }
    }
  ],
  medium: [
    {
      q: "You get pulled over while driving. What are you actually required to hand the officer?",
      options: ["License, registration, and proof of insurance", "Your phone, unlocked, if they ask to see it", "Answers about where you're going and why", "Nothing, you can refuse everything as a driver"],
      correct: 0,
      hint: "Think about the documents that come with the privilege of driving, not your messages or your plans.",
      optionExplanations: [null, "Your phone is private. Police generally need a warrant (Riley v. California). Driving doesn't change that.", "People feel they must explain their night. You don't. Hand over the documents and you can still stay silent on questions.", "The 'refuse everything' idea is a myth for drivers. Driving is a licensed privilege, so the three documents are required."],
      principle: "Driving is a licensed privilege, so the state can require your three documents. Reach for them slowly, tell the officer what you're doing before you move, and keep your hands visible the whole time. Your right to stay silent doesn't disappear behind the wheel, so hand over the docs and you can still decline to chat. Calm movements keep the stop from escalating.",
      keyPhrase: { quote: "License, registration, insurance.", gloss: "Hand those over slowly. You can stay silent on everything else." },
      scenario: { setup: "Lights flash behind you. You pull over and lower the window.", lines: [{ label: "YOU (calm)", text: "My license is in my pocket, I'm reaching for it now." }, { label: "OFFICER", text: "Where are you headed?" }, { label: "YOU", text: "I'd rather not answer that." }], note: "Announce before you reach. Keep hands where they can be seen." }
    },
    {
      q: "Police arrest someone and want to look through their phone. What do they almost always need first?",
      options: ["A warrant", "Nothing, because arrest lets them search everything on you", "Your passcode, which you have to give them", "Nothing, once it's unlocked they can keep looking"],
      correct: 0,
      hint: "Your phone holds your whole life. The Supreme Court treated it differently from your pockets.",
      optionExplanations: [null, "This is the key myth: that arrest opens up your whole phone. It doesn't. Riley v. California says a phone generally needs its own warrant.", "You don't have to hand over your passcode just because they ask. You can say you don't consent.", "Even if it's unlocked, they generally can't dig through it without a warrant. You can still say you don't consent."],
      principle: "In Riley v. California (2014), the Supreme Court unanimously said police can't scroll through your phone like they check your pockets; they generally need a warrant. Chief Justice Roberts wrote 'get a warrant.' You can decline to unlock it calmly. Don't hand it over or fight over it physically; just say you don't consent and let a lawyer handle any dispute.",
      keyPhrase: { quote: "Get a warrant.", gloss: "The Supreme Court's answer for phone searches. Decline calmly." },
      scenario: { setup: "You've been arrested and an officer holds your locked phone.", lines: [{ label: "OFFICER", text: "Unlock your phone for me." }, { label: "YOU (calm)", text: "I don't consent to a search of my phone." }], note: "Say it once. Don't physically grab for the phone; let a lawyer challenge it." }
    },
    {
      q: "Can a principal search your backpack at school without a warrant?",
      options: ["Yes, if they have reasonable suspicion you broke a rule or law", "No, school staff need a warrant just like police", "No, they can never search a student's private bag", "Yes, they can search any student any time for any reason"],
      correct: 0,
      hint: "School is a special zone. The bar for staff is lower than for police, but it isn't zero.",
      optionExplanations: [null, "People think school rules match street rules. They don't. Schools use a LOWER bar called reasonable suspicion (New Jersey v. T.L.O.).", "Some think a backpack is fully off-limits. It isn't. With a real, specific reason tied to a rule, staff can search it.", "It's also not a free-for-all. Staff need a specific reason, not a random hunch. You can calmly say you don't consent."],
      principle: "Schools use a lower bar called reasonable suspicion (New Jersey v. T.L.O.): a specific reason tied to a rule violation, not a random hunch. You can calmly say you don't consent, which preserves a challenge if it turns out there was no real suspicion. But don't physically block or grab your bag back. State your objection, stay calm, and let it be sorted out afterward.",
      keyPhrase: { quote: "Schools use reasonable suspicion.", gloss: "Lower bar than police. Object calmly, don't physically resist." },
      scenario: { setup: "You're called to the office and the principal points at your bag.", lines: [{ label: "PRINCIPAL", text: "Empty out your bag." }, { label: "YOU (calm)", text: "I don't consent to a search." }, { label: "WHAT HAPPENS", text: "They can still search on reasonable suspicion." }], note: "Your calm objection protects you later if they had no real suspicion." }
    },
    {
      q: "You see police arresting someone in a public park. Can you record it on your phone?",
      options: ["Yes, as long as you don't interfere", "No, recording police is illegal", "Only if you stay totally silent while filming", "Only if the officers give you the okay"],
      correct: 0,
      hint: "Sunlight and accountability. Courts protect this, with one common-sense, safety-based limit.",
      optionExplanations: [null, "This is a widespread myth. Courts have upheld the right to record police doing public work in public.", "Michigan is generally fine with recording in public. You don't have to be silent. Just keep back and don't interfere.", "You don't need their permission. The right doesn't depend on the officers agreeing."],
      principle: "Federal courts across the country protect filming government workers doing public duties in public. It's press freedom for regular people. The limit is safety and non-interference: keep back, don't block anyone, and don't make sudden movements toward the scene. If ordered to step back, do it calmly and keep recording from a safe distance. The footage matters most if you're still safe.",
      keyPhrase: { quote: "You can record. Keep back.", gloss: "Public arrest, public street, protected. Don't interfere." },
      scenario: { setup: "You watch officers making an arrest in a public park.", lines: [{ label: "YOU CAN", text: "Stand back a safe distance and film." }, { label: "IF TOLD TO MOVE", text: "Step back calmly, keep filming." }], note: "Keep your distance. Filming is protected; getting close is a risk not worth taking." }
    },
    {
      q: "An SRO waves you over to talk about a fight. What's the smart move first?",
      options: ["Ask for a parent or lawyer before answering", "Explain everything, an SRO is just school staff", "Talk freely, since it's off the record at school", "Answer fast to show you have nothing to hide"],
      correct: 0,
      hint: "One person in the building carries a badge. What does that change about your words?",
      optionExplanations: [null, "The big misunderstanding: that an SRO is like a teacher. They're a sworn police officer. What you say can go to court.", "Nothing an SRO hears is 'off the record.' The school setting feels casual, but the legal side isn't. Ask for support first.", "The 'nothing to hide' feeling gets people talking fast. Slow down. Ask for a parent or lawyer before you answer."],
      principle: "A School Resource Officer feels like part of the school, but they're a sworn police officer who can arrest you and file real charges. Anything you say can end up in court. Stay calm and polite, don't run or argue, and ask for a parent or a lawyer before you answer questions. Being respectful and quiet is the safe move; you're not in trouble for asking for support.",
      keyPhrase: { quote: "An SRO is a police officer.", gloss: "Not a teacher or counselor. Ask for a parent or lawyer, calmly." },
      scenario: { setup: "The School Resource Officer calls you over about a fight.", lines: [{ label: "SRO", text: "Come with me. Let's talk about that fight." }, { label: "YOU (calm)", text: "I'd like to talk to my parent or a lawyer first." }], note: "The first SRO program started in Flint, Michigan, in the 1950s." }
    },
    {
      q: "Officers at your door say they have a warrant. What tells you it can actually authorize entry?",
      options: ["It's signed by a judge and names your address or a person there", "Any officer signed it, so it must be real", "It has an official government seal or logo", "They said the word 'warrant,' so you have to open up"],
      correct: 0,
      hint: "A warrant's power comes from a neutral judge checking it. Who has to sign?",
      optionExplanations: [null, "This is the key mix-up. An officer's own signature makes it administrative, which doesn't force entry. A judge's signature is what counts.", "A seal or logo doesn't make it a judge's warrant. Look for the judge's signature and your name or address.", "Just hearing 'warrant' isn't enough. You can ask to read it first, through the window or under the door."],
      principle: "A judicial warrant is signed by a judge, names a person or place, and can authorize entry. An administrative or immigration warrant (ICE Forms I-200 or I-205) is signed by an officer, not a judge, and doesn't by itself authorize forced entry into your home. Ask calmly to read it through the window or under the door. If they enter anyway, do not physically resist; state that you don't consent and let a lawyer challenge it.",
      keyPhrase: { quote: "Judge's signature makes it real.", gloss: "Officer-signed paper is administrative. Don't resist regardless." },
      scenario: { setup: "Agents hold up a document and demand you open up.", lines: [{ label: "YOU (calm)", text: "Slide it under the door so I can read it." }, { label: "CHECK FOR", text: "A judge's signature and your name or address." }, { label: "IF THEY ENTER ANYWAY", text: "Don't resist. Say you don't consent." }], note: "Only a judge-signed warrant authorizes entry. Your safety still comes first." }
    },
    {
      q: "During a traffic stop, an officer says \"step out of the car for me.\" What does the law say?",
      options: ["You generally have to step out, but you keep the right to stay silent and refuse searches", "You can refuse to get out of the car", "Once you're out, you have to answer their questions", "Stepping out means you agreed to let them search"],
      correct: 0,
      hint: "Two things at once: a lawful order to move, and your right to control your words and your stuff.",
      optionExplanations: [null, "People think they can refuse to exit. Courts say officers can order you out during a lawful stop (Mimms/Wilson). Follow it, calmly.", "Getting out doesn't mean you have to talk. You can stand outside and stay silent.", "Stepping out is NOT saying yes to a search. You can still clearly say you don't consent."],
      principle: "The Supreme Court (Pennsylvania v. Mimms, extended to passengers in Maryland v. Wilson) said officers can order people out during a lawful stop for safety. That's a lawful command, so follow it, move slowly, and keep your hands visible. Stepping out is not consent to anything. You keep your right to stay silent and to refuse a search. Comply with the order, hold onto the rights.",
      keyPhrase: { quote: "Step out, stay silent.", gloss: "Follow the order to exit. Keep your words and consent." },
      scenario: { setup: "You're pulled over and the officer asks you to get out.", lines: [{ label: "OFFICER", text: "Step out of the car, please." }, { label: "YOU (calm)", text: "[steps out slowly] I don't consent to a search, and I'm staying silent." }], note: "Getting out is lawful to require. Move slowly, hands visible." }
    },
    {
      q: "ICE agents show up at a workplace. Where can they go without a judicial warrant?",
      options: ["Only public areas, not private back rooms or offices", "Anywhere inside, once they're through the front door", "Wherever a manager says they can go", "Nowhere, they can't even enter the public lobby"],
      correct: 0,
      hint: "Think about the lobby anyone can walk into versus the locked staff-only areas.",
      optionExplanations: [null, "Being in the public part doesn't open the private part. Private rooms need a judge's warrant or someone's yes.", "A manager can't sign away everyone's rights to private space. A judicial warrant is what's needed for the back.", "It's not the opposite extreme either. They can be in public areas like a lobby. The protection is for private spaces."],
      principle: "A workplace has public areas (a lobby, a dining room) and private ones (kitchens, offices, staff-only rooms). Without a judicial warrant signed by a judge, or consent, immigration agents can be in public areas but not private ones. Staff can calmly say a space is private and ask for a judicial warrant, without physically blocking anyone. Knowing the line, and stating it calmly, is the safe move.",
      keyPhrase: { quote: "Public areas yes, private no.", gloss: "Private spaces need a judge-signed warrant. State it calmly." },
      scenario: { setup: "Agents enter the front and ask to go into the back.", lines: [{ label: "STAFF (calm)", text: "This area is private. Do you have a judicial warrant?" }, { label: "IF ADMINISTRATIVE", text: "They can stay in public areas, not the private back." }], note: "State the line calmly. Don't physically block; let a lawyer follow up." }
    },
    {
      q: "The safest, clearest recording right in Michigan is recording what?",
      options: ["Police doing their job in public", "Any conversation, as long as you don't share it", "Two strangers talking, if you're just nearby", "A private meeting, as long as one person there agreed"],
      correct: 0,
      hint: "The rock-solid version is about public officials in public, where no one expects privacy.",
      optionExplanations: [null, "People think keeping it private makes any recording okay. Not so. What matters is whose talk it is and where.", "Recording strangers' private talk you're not part of can be eavesdropping, a felony. Public officials in public is the safe ground.", "Michigan's rules on private conversations are messy and risky. Stick to the clear one: police, doing public work, in public."],
      principle: "The safest, most settled recording right in Michigan is filming police doing public duties in public, where there's no reasonable expectation of privacy. Michigan's rules about recording private conversations are more contested and can carry felony risk on the wrong side, so the reliable ground is public officials in public. When you record police, keep back, don't interfere, and follow lawful orders to step away while you keep filming from a safe distance.",
      keyPhrase: { quote: "Public officials, public place.", gloss: "The rock-solid recording right. Keep your distance." },
      scenario: { setup: "You want to safely exercise your right to record.", lines: [{ label: "SOLID GROUND", text: "Filming police in public, from a safe distance." }, { label: "RISKY", text: "Secretly recording a private conversation you're not in." }], note: "Public recording is protected. Private-conversation recording is legally murky, so avoid it." }
    },
    {
      q: "A police officer on the street asks for your name and ID in Michigan. When are you legally required to give it?",
      options: ["When they have reasonable suspicion you committed a crime", "Anytime an officer asks, you must show ID", "Only if you're actually holding an ID on you", "Never, you can always refuse to identify yourself"],
      correct: 0,
      hint: "Michigan doesn't make you show ID for no reason, but the safe move also weighs how the moment feels.",
      optionExplanations: [null, "This is the common myth: that you must show ID whenever asked. In Michigan, on foot, usually you don't, unless there's real suspicion.", "Whether you happen to have ID on you isn't the legal test. Reasonable suspicion, driving, or arrest are what change it.", "'Never' is too strong and can get you in trouble. With reasonable suspicion, or when driving or arrested, you do have to. Weigh safety too."],
      principle: "Michigan is not a stop-and-identify state, so on foot you generally don't have to show ID just because an officer asks. That changes with reasonable suspicion of a crime, or if you're driving or lawfully arrested. Asking 'am I free to leave?' calmly tells you which situation you're in. Knowing you can decline is different from deciding it's safe to; refusing can escalate a stop, and that risk isn't equal across races. Read the moment and put your safety first.",
      keyPhrase: { quote: "Know the right, choose safety.", gloss: "Not required on foot without suspicion, but escalation is real." },
      scenario: { setup: "You're walking home and an officer asks for ID.", lines: [{ label: "YOU (calm)", text: "Am I free to leave, or am I being detained?" }, { label: "IF FREE", text: "You can decline and walk on, calmly." }], note: "Driving and lawful arrest are the clear exceptions. Otherwise, weigh safety." }
    },
    {
      q: "You're the driver in a Michigan traffic stop. What ID do you have to show?",
      options: ["Your license, registration, and proof of insurance", "Nothing, since Michigan has no stop-and-identify law", "Only your name spoken out loud", "Whatever the officer demands, or it's obstruction"],
      correct: 0,
      hint: "The 'no stop-and-identify' rule is for people on foot. Driving is a different deal.",
      optionExplanations: [null, "People over-correct here. The no-ID rule is for pedestrians. Driving is a licensed privilege with real duties.", "Speaking your name isn't enough as a driver. You must produce the three documents.", "It's not unlimited. You owe the three driving documents, but you can still stay silent on questions."],
      principle: "Driving is a licensed privilege, so a driver must show license, registration, and proof of insurance on request. This is one of the clear exceptions to Michigan's no-stop-and-identify rule. Hand the documents over, but announce before you reach for them and keep your hands visible; your right to stay silent on other questions still applies.",
      keyPhrase: { quote: "Drivers show the three documents.", gloss: "License, registration, insurance. Then you can stay silent." },
      scenario: { setup: "You're pulled over and the officer asks for your paperwork.", lines: [{ label: "YOU (calm)", text: "My license is in my wallet, I'm reaching for it now." }, { label: "OFFICER", text: "Where are you coming from?" }, { label: "YOU", text: "I'd rather not say." }], note: "Announce before you reach. The documents are required; conversation isn't." }
    },
    {
      q: "You're a passenger in a car that's pulled over in Michigan. Do you have to show ID?",
      options: ["Generally no, unless they suspect you of a separate crime", "Yes, everyone in the car must hand over ID", "Yes, because the driver got pulled over", "Only if you're sitting in the front seat"],
      correct: 0,
      hint: "The driver's duty comes from driving. You weren't driving. What changes that for you?",
      optionExplanations: [null, "A common myth: that a stop pulls everyone's ID in. A passenger's rules are separate from the driver's.", "The driver's stop doesn't create an ID duty for passengers. That takes separate suspicion of you.", "Where you sit doesn't matter. What matters is whether there's suspicion you did something."],
      principle: "A passenger generally doesn't have to identify themselves just because the driver was stopped. That takes separate, specific suspicion that the passenger committed a crime. You can calmly ask if you're free to leave. As always, knowing you can decline is different from deciding it's safe to in the moment, so read the situation and put your safety first.",
      keyPhrase: { quote: "The stop is the driver's, not yours.", gloss: "A passenger's ID isn't owed without separate suspicion." },
      scenario: { setup: "The car you're riding in gets pulled over.", lines: [{ label: "OFFICER", text: "ID from everyone." }, { label: "YOU (calm)", text: "Am I free to leave?" }], note: "You have the right to decline. You also have the right to choose calm. Both are real." }
    },
    {
      q: "What has to be true before Michigan police can require your name during a street stop?",
      options: ["They need reasonable suspicion you committed a crime", "Nothing, they can require it anytime", "They just have to be in uniform", "You have to be near where a crime happened, that's enough"],
      correct: 0,
      hint: "It's the same bar that lets them stop you at all. A hunch or a location isn't enough.",
      optionExplanations: [null, "They can't require it anytime. Without reasonable suspicion, a name request on the street isn't a requirement.", "A uniform doesn't create the power. Reasonable suspicion of a crime does.", "Just being near a crime scene isn't automatically reasonable suspicion about you specifically."],
      principle: "Even where identifying yourself could matter, it starts with reasonable suspicion: specific facts suggesting you committed a crime, not a hunch, not just your location. Without that, a street name-request in Michigan generally isn't a requirement. Asking 'am I being detained?' calmly helps you learn whether that bar has been met. Whatever the answer, keep it calm.",
      keyPhrase: { quote: "Reasonable suspicion comes first.", gloss: "Specific facts about you, not a hunch or a location." },
      scenario: { setup: "An officer stops you and wants your name.", lines: [{ label: "YOU (calm)", text: "Am I being detained, or am I free to go?" }, { label: "THE ANSWER", text: "Tells you if they've met the bar to hold you." }], note: "Reasonable suspicion is specific facts, not a feeling or a neighborhood." }
    },
    {
      q: "Do police always need a warrant signed by a judge before they can search anything?",
      options: ["No, there are real exceptions like probable cause or plain view", "Yes, no warrant means no search, ever", "Yes, unless you're already in jail", "No, they can search anything anytime they want"],
      correct: 0,
      hint: "The warrant is the rule, but the law carved out some specific exceptions. It's in between the two extremes.",
      optionExplanations: [null, "This over-corrects. A warrant is the default, but exceptions exist, so 'never without a warrant' is a myth.", "Being in jail isn't the dividing line. The exceptions are things like probable cause, plain view, and arrest.", "It's also not anything-goes. The exceptions are specific, not unlimited. Your consent still matters."],
      principle: "A warrant is the general rule, but the law allows searches without one in specific situations: probable cause, plain view, a search connected to a lawful arrest, and the automobile exception. So 'they can never search without a warrant' is false, and so is 'they can search anything.' The truth is in between. Either way, you can still calmly say you don't consent, which preserves a challenge later.",
      keyPhrase: { quote: "Warrant is the rule, with exceptions.", gloss: "Probable cause, plain view, arrest, cars. Not unlimited." },
      scenario: { setup: "You're wondering when a search is even allowed.", lines: [{ label: "DEFAULT", text: "A warrant from a judge." }, { label: "EXCEPTIONS", text: "Probable cause, plain view, arrest, cars." }], note: "You can say 'I don't consent' either way; it preserves your challenge." }
    },
    {
      q: "An officer says \"I can just get a warrant anyway, so you might as well let me search.\" What's true?",
      options: ["You can still decline; make them actually get the warrant", "You should consent, since a warrant is coming regardless", "Consent, because refusing is illegal once they say that", "It doesn't matter, the result is the same either way"],
      correct: 0,
      hint: "Saying they'll get a warrant isn't the same as having one. What do you make them do?",
      optionExplanations: [null, "This is a common pressure tactic. If they truly could get a warrant, let them. You don't have to hand over the right.", "Refusing is never illegal just because they claim a warrant is coming. Declining is your right.", "It's not the same. If you consent, you gave up the search fight. If they get a warrant, a judge reviewed it first."],
      principle: "Officers are allowed to say they'll 'just get a warrant' to get you to agree. But saying it isn't having it. If they really can get one, that's fine, let them, because then a neutral judge reviewed it. If you consent instead, you gave up that check for nothing. Decline calmly, once, and don't argue further; let the process play out.",
      keyPhrase: { quote: "A promise isn't a warrant.", gloss: "Make them get it. Consenting gives up the judge's check." },
      scenario: { setup: "The officer pressures you by saying a warrant is easy.", lines: [{ label: "OFFICER", text: "I'll just get a warrant anyway." }, { label: "YOU (calm)", text: "Then I'll wait. I don't consent." }], note: "If a warrant really is coming, letting them get it costs you nothing." }
    },
    {
      q: "What does an officer need before they can detain you, meaning hold you so you can't leave?",
      options: ["Reasonable suspicion of a specific crime", "Nothing, they can hold anyone for any reason", "Just a feeling that something's off", "Permission from their supervisor"],
      correct: 0,
      hint: "It's a real, named legal bar. A vague feeling isn't quite enough.",
      optionExplanations: [null, "The idea that police can hold anyone for any reason is a common fear, but detentions need reasonable suspicion.", "A raw feeling isn't enough. Reasonable suspicion means specific facts they can point to.", "It's not about a supervisor's okay. It's about having specific facts suggesting a crime."],
      principle: "To detain you, an officer needs reasonable suspicion: specific facts suggesting you're involved in a crime, not a hunch and not 'any reason.' A detention (a Terry stop) means you're not free to leave, but you're not under arrest. Knowing this helps you tell which tier you're in. Whatever the situation, the safe move is the same: stay calm, comply, and challenge any overreach later.",
      keyPhrase: { quote: "Detention needs reasonable suspicion.", gloss: "Specific facts about a crime, not a hunch or 'any reason.'" },
      scenario: { setup: "An officer is keeping you from leaving.", lines: [{ label: "DETENTION", text: "Needs reasonable suspicion of a crime." }, { label: "YOU (calm)", text: "Am I being detained?" }], note: "A detention holds you briefly; it isn't an arrest. Rights still apply." }
    },
    {
      q: "Is looking nervous, or being in a high-crime area, enough by itself for police to detain you?",
      options: ["No, that alone generally isn't reasonable suspicion", "Yes, nervousness is proof enough", "Yes, being in a bad area is enough on its own", "Only if you're also young"],
      correct: 0,
      hint: "Reasonable suspicion needs specific facts about you. Are a feeling and a location specific enough?",
      optionExplanations: [null, "People think nerves give police a reason. Being nervous alone generally isn't reasonable suspicion.", "A neighborhood's reputation isn't a fact about you. Location alone generally isn't enough to detain you.", "Your age isn't the missing piece. It still takes specific facts suggesting you did something."],
      principle: "Being nervous, or standing in a high-crime area, generally isn't enough by itself to justify detaining you. Reasonable suspicion has to be built on specific facts about you and your conduct, not a feeling or a neighborhood's reputation. Courts have pushed back on stops built only on those things. Still, this is decided later in court, not argued on the street, so stay calm in the moment and raise it afterward.",
      keyPhrase: { quote: "Nerves and location aren't enough.", gloss: "Reasonable suspicion needs specific facts about you." },
      scenario: { setup: "You're told you 'looked nervous' in a 'bad area.'", lines: [{ label: "NOT ENOUGH", text: "Nervousness or the neighborhood, alone." }, { label: "LATER", text: "A lawyer can challenge a stop built on only that." }], note: "This is a court argument, not a roadside one. Stay calm now." }
    },
    {
      q: "If police forget to read Miranda before questioning you in custody, what usually happens?",
      options: ["Those statements may be thrown out, but the case isn't automatically dismissed", "The whole case gets dismissed automatically", "Nothing, Miranda doesn't really matter", "You automatically win and can sue"],
      correct: 0,
      hint: "The remedy is about the statements they got, not the entire case. What specifically gets excluded?",
      optionExplanations: [null, "The 'case gets thrown out' belief is one of the most common myths. The remedy is usually just suppressing those statements.", "It does matter. Statements from a Miranda violation can be suppressed, which can weaken a case.", "A Miranda slip doesn't automatically win your case or create a lawsuit. It affects those statements."],
      principle: "If police question you in custody without Miranda, the usual remedy is that those specific statements can be suppressed, kept out of evidence. It does not automatically dismiss the whole case; other evidence can still be used. The 'they forgot to read my rights so my case is dropped' belief comes from TV and sets people up for disappointment. The real value of Miranda is knowing to stay silent and ask for a lawyer.",
      keyPhrase: { quote: "Suppressed, not dismissed.", gloss: "A Miranda slip can exclude statements, not end the case." },
      scenario: { setup: "You realize they questioned you without a warning.", lines: [{ label: "MYTH", text: "The case gets thrown out." }, { label: "REALITY", text: "Those statements may be suppressed." }], note: "Other evidence can still be used. Silence protects you best." }
    },
    {
      q: "After arrest, an officer asks your name and address to book you. Is that the kind of questioning Miranda covers?",
      options: ["Generally no, routine booking questions usually aren't interrogation", "Yes, every question after arrest needs Miranda first", "No, because Miranda never applies after arrest", "Only if they write your answers down"],
      correct: 0,
      hint: "Miranda is about questions designed to get you to incriminate yourself. Is your address one of those?",
      optionExplanations: [null, "People think every post-arrest question needs a warning. Routine booking (name, address) generally isn't interrogation.", "Miranda can apply after arrest, but only to interrogation, not basic booking details.", "Whether they write it down doesn't decide it. It's about whether the question seeks to incriminate you."],
      principle: "Routine booking questions, like your name and address, generally are not the kind of interrogation Miranda covers, because they aren't designed to get you to incriminate yourself. So not every question after arrest needs a warning first. This matters because it helps you tell normal processing from actual questioning about the case, which is where staying silent and asking for a lawyer really counts.",
      keyPhrase: { quote: "Booking isn't interrogation.", gloss: "Name and address are routine; case questions are different." },
      scenario: { setup: "You're being booked and asked basic details.", lines: [{ label: "ROUTINE", text: "Name, address, date of birth." }, { label: "INTERROGATION", text: "Questions about the alleged crime." }], note: "Save your silence and lawyer request for case questions." }
    },
    {
      q: "An officer tells you to stop filming, but you're back on the sidewalk not interfering. What's true?",
      options: ["They generally can't order you to stop just for filming", "You must stop the second an officer tells you to", "You can only keep filming if you're silent", "You have to stop unless you're a journalist"],
      correct: 0,
      hint: "They can manage real interference, but can they ban filming just because they dislike it?",
      optionExplanations: [null, "A common belief: that any order to stop is binding. If you're not interfering, disliking the camera isn't a lawful reason to make you stop.", "Being silent isn't required. You can keep filming as long as you're not interfering.", "The right isn't limited to journalists. Ordinary people keep it too."],
      principle: "Officers can make you step back if you're genuinely interfering or creating a safety hazard, but they generally can't order you to stop recording just because they dislike being filmed. If you're lawfully present and not interfering, the right holds. That said, there's real personal risk in refusing an officer's order in the moment, so a common safe move is to step back as told and keep recording from farther away rather than argue.",
      keyPhrase: { quote: "Filming isn't interfering.", gloss: "They can manage real interference, not ban the camera." },
      scenario: { setup: "You're recording from a safe distance and told to stop.", lines: [{ label: "OFFICER", text: "Turn that off." }, { label: "SAFE MOVE", text: "Step back and keep recording from farther away." }], note: "The right is real, but you weigh the risk of refusing in the moment." }
    },
    {
      q: "Can you record your OWN traffic stop or encounter, not just other people's?",
      options: ["Yes, the right covers recording your own encounter too", "No, you can only film other people's stops", "No, recording your own stop is always illegal", "Only if a passenger does the filming, not you"],
      correct: 0,
      hint: "The right protects documenting police in public. Does it stop applying just because the stop is yours?",
      optionExplanations: [null, "Some think the right only covers filming others. It also covers documenting your own encounter.", "Recording your own stop isn't automatically illegal. The public-recording right still applies.", "It doesn't matter who holds the phone. The right covers your own encounter."],
      principle: "The right to record police covers your own encounter, not just other people's. You can document your own traffic stop or street stop. The same limits apply: don't interfere, keep your hands visible, and tell the officer what you're doing before you reach for your phone, since sudden movements during a stop are dangerous. Mounting the phone or setting it down in view can be safer than holding it up.",
      keyPhrase: { quote: "You can film your own stop.", gloss: "The right isn't just for filming others." },
      scenario: { setup: "You're pulled over and want a record of it.", lines: [{ label: "YOU (calm)", text: "I'm turning on my phone to record, it's in the cupholder." }, { label: "THEN", text: "Keep hands visible; don't reach suddenly." }], note: "Announce the move. A mounted or set-down phone avoids sudden reaches." }
    },
    {
      q: "Police say they have a warrant but you can't see it. What can you ask?",
      options: ["Ask them to slip it under the door or hold it to the window", "Nothing, you have to take their word for it", "Nothing, asking to see it is illegal", "Only your lawyer can ask to see it"],
      correct: 0,
      hint: "You don't have to open the door to read a piece of paper. How do you check it stays safe?",
      optionExplanations: [null, "You don't have to just believe them. You can ask to read it without opening up.", "Asking to see a warrant isn't illegal. It's a reasonable thing to request.", "You can ask yourself. You don't need a lawyer present to request to see the warrant."],
      principle: "You don't have to take their word that they have a warrant. You can calmly ask them to slip it under the door or hold it up to a window so you can read it, without opening the door, since opening it can count as consent. Check for a judge's signature and the right name or address. Staying calm and keeping the door shut while you verify is both your right and the safer move.",
      keyPhrase: { quote: "Read it before you open.", gloss: "Under the door or at the window. Opening can be consent." },
      scenario: { setup: "They claim a warrant but you haven't seen it.", lines: [{ label: "YOU (calm)", text: "Please slide it under the door so I can read it." }, { label: "CHECK", text: "Judge's signature, your name or address." }], note: "Opening the door can count as letting them in. Verify first." }
    },
    {
      q: "Police are at your door with no warrant. Why might just opening the door be risky?",
      options: ["Opening it or inviting them in can count as consenting to entry", "It doesn't matter, an open door changes nothing", "Because it's illegal to open your own door to police", "Because they can then arrest you for opening it"],
      correct: 0,
      hint: "Consent doesn't have to be spoken. What might your actions say for you?",
      optionExplanations: [null, "People think talking at an open door is harmless. Opening up or inviting them in can be treated as consent to enter.", "It's not illegal to open your door. The point is that opening it can be read as consent.", "Opening the door isn't itself an arrestable act. The risk is that it can count as letting them in."],
      principle: "Consent doesn't have to be spoken; your actions can show it. Opening the door wide, stepping aside, or inviting officers in can be treated as consenting to entry, which gives up the protection you had. That's why talking through a closed door, or stepping outside and closing it behind you, can protect you better. If you're not sure, keep the door shut, stay calm, and ask to see a warrant first.",
      keyPhrase: { quote: "Your actions can be consent.", gloss: "Opening up can count as letting them in. Keep it shut." },
      scenario: { setup: "You're deciding whether to open the door to talk.", lines: [{ label: "RISKY", text: "Opening wide or inviting them in." }, { label: "SAFER", text: "Talk through the door, or step out and close it." }], note: "Consent can be an action, not just a word. Keep the door shut." }
    },
    {
      q: "Can police search your car without a warrant if they have a strong reason to think there's evidence inside?",
      options: ["Yes, the 'automobile exception' allows it on probable cause", "No, cars always need a warrant like a house does", "No, they can never search a car without your yes", "Yes, they can search any car for any reason"],
      correct: 0,
      hint: "Cars move, so the law treats them differently from homes. What does that difference allow?",
      optionExplanations: [null, "A common myth: that a car is protected like a house. Because cars move, police can search on probable cause without a warrant.", "It's not true that they can never search without your consent. Probable cause is enough for a car.", "It's also not anything-goes. They need probable cause, a real reason, not just any reason."],
      principle: "Because cars can be driven away, the law treats them differently from homes. Under the automobile exception, police can search a vehicle without a warrant if they have probable cause to believe it contains evidence of a crime. So 'they always need a warrant for my car' is a myth, and so is 'they can search any car anytime.' They need a real reason. You can still calmly say you don't consent, which preserves a challenge if the reason was weak.",
      keyPhrase: { quote: "Cars move, so the rule bends.", gloss: "Probable cause lets police search a car without a warrant." },
      scenario: { setup: "Officers want to search your car during a stop.", lines: [{ label: "AUTOMOBILE EXCEPTION", text: "Probable cause, no warrant needed." }, { label: "YOU (calm)", text: "I don't consent to a search." }], note: "Saying 'no' preserves a challenge if their reason was thin." }
    }
  ],
  hard: [
    {
      q: "After you clearly say \"I want a lawyer,\" what are police supposed to do?",
      options: ["Stop questioning you until a lawyer is there", "Keep going, since asking doesn't really make them stop", "Only stop once you're formally under arrest", "Keep asking until you prove you can afford a lawyer"],
      correct: 0,
      hint: "A clear request is a hard stop, not a pause. And whether you can pay isn't the point.",
      optionExplanations: [null, "Some give up because they think asking does nothing. A clear request is supposed to stop questioning (Edwards v. Arizona). Keep silent if it doesn't.", "The right kicks in during custody questioning, not only at a formal arrest. You don't have to wait to be 'officially' arrested.", "Money never matters. If you can't afford one, the court gives you a lawyer for free. Ask anyway."],
      principle: "When you clearly invoke your right to a lawyer, questioning is supposed to stop until one arrives (Edwards v. Arizona). But 'supposed to' isn't a guarantee; if they keep asking anyway, you don't have to answer. Stay calm, repeat that you're staying silent, and don't get pulled back into talking. A lawyer can later challenge anything they got after your request. Your words start the protection; your silence keeps it.",
      keyPhrase: { quote: "Say it clearly, then stay quiet.", gloss: "It doesn't depend on arrest, age, or ability to pay." },
      scenario: { setup: "You're in an interview room and you've asked for a lawyer.", lines: [{ label: "YOU (calm)", text: "I want a lawyer." }, { label: "SUPPOSED TO", text: "Questioning stops until a lawyer is present." }, { label: "IF IT DOESN'T", text: "Stay silent. Don't get drawn back in." }], note: "Your words are the switch. Ability to pay never matters." }
    },
    {
      q: "What's the real difference between being \"detained\" and being \"arrested\"?",
      options: ["Detention is a short stop on reasonable suspicion; arrest is custody on probable cause", "They mean the same thing, just different words", "Being detained means you've basically been found guilty", "You only have rights once you're arrested, not detained"],
      correct: 0,
      hint: "Think about two dials: how strong the officer's reason is, and how far your freedom is taken.",
      optionExplanations: [null, "People treat them as the same. They're not. Different reasons are required and different levels of custody.", "Neither one means guilty. Guilt is decided later, in court, not on the street.", "Big myth: that rights only start at arrest. Your rights, silence, refusing searches, asking for a lawyer, work during a detention too."],
      principle: "A detention is a brief investigative stop that needs reasonable suspicion. An arrest is being taken into custody and needs probable cause, a higher bar. Your rights (stay silent, refuse searches, ask for a lawyer) work during both. Knowing which one you're in helps you stay calm and make good choices, but either way the move is the same: comply with lawful commands, keep your hands visible, and save any dispute for court.",
      keyPhrase: { quote: "Detained = short stop. Arrested = custody.", gloss: "Your rights work in both. Stay calm in both." },
      scenario: { setup: "An officer is holding you and you're unsure how serious it is.", lines: [{ label: "DETAINED", text: "Reasonable suspicion. Held briefly." }, { label: "ARRESTED", text: "Probable cause. Taken into custody." }], note: "Stay silent, refuse searches, ask for a lawyer, and stay calm in either one." }
    },
    {
      q: "Police on the street usually need \"probable cause\" to search you. What lower standard lets a school official search a student?",
      options: ["Reasonable suspicion", "The same probable cause the police need", "Your permission before they can look", "Proof strong enough to prove you guilty"],
      correct: 0,
      hint: "It's the same lower bar from the T.L.O. case: more than a guess, less than courtroom certainty.",
      optionExplanations: [null, "People assume schools need what police need. They actually need LESS: reasonable suspicion, a lower bar.", "Your yes isn't required if staff have reasonable suspicion. You can still object calmly, which matters later.", "They don't need courtroom-level proof to search. That's a higher bar than even police use. Schools sit lower."],
      principle: "The Supreme Court decided in T.L.O. that schools sit between total freedom and full police search authority. Because students are at school all day, the rules bend, but not to zero: staff need reasonable suspicion, specific facts tied to a rule violation. You can calmly say you don't consent, which preserves a later challenge, without physically resisting the search itself.",
      keyPhrase: { quote: "Reasonable suspicion.", gloss: "Specific facts, not a random hunch. Object calmly." },
      scenario: { setup: "A school official wants to search you and you're unsure what they need.", lines: [{ label: "STREET (POLICE)", text: "Probable cause. A solid reason." }, { label: "SCHOOL (STAFF)", text: "Reasonable suspicion. Facts, but a lower bar." }], note: "New Jersey v. T.L.O. (1985) set the lower school standard." }
    },
    {
      q: "When are police actually required to read you the \"Miranda\" rights?",
      options: ["When you're in custody AND being questioned", "The moment handcuffs go on, every time", "Anytime an officer talks to you at all", "Only after you've already been charged"],
      correct: 0,
      hint: "It takes two things happening together, not just one. Cuffs alone aren't the trigger.",
      optionExplanations: [null, "The handcuffs myth is huge. Cuffs alone don't trigger Miranda. It takes custody AND questioning together.", "Not every chat triggers it. A casual conversation isn't custody questioning, and what you volunteer can still count.", "Miranda is about questioning before and during a case, not after you're charged. It protects you at the questioning stage."],
      principle: "Miranda (Miranda v. Arizona, 1966) protects you when police pressure could be too much: specifically when you're in custody AND being questioned. Both parts must be true. Here's the safety piece: anything you volunteer, even before any warning, can still count. So the smart habit in any police encounter is to stay calm, keep it brief, and use your words to invoke silence rather than to explain yourself.",
      keyPhrase: { quote: "Custody + questioning = Miranda.", gloss: "Both at once. What you volunteer still counts." },
      scenario: { setup: "You're wondering when those TV-style rights must be read.", lines: [{ label: "CASUAL CHAT", text: "No Miranda required. What you say can still count." }, { label: "CUSTODY + QUESTIONS", text: "Miranda required. Where 'I want a lawyer' matters most." }], note: "In J.D.B. v. North Carolina, the Court said a kid's age counts too." }
    },
    {
      q: "In Michigan today, at what age is someone automatically treated as an adult in the criminal system for most crimes?",
      options: ["18", "17", "16", "21"],
      correct: 0,
      hint: "Michigan changed this on October 1, 2021. It used to be a year younger.",
      optionExplanations: [null, "17 was the OLD rule, and it's exactly what Michigan changed on October 1, 2021. Lots of people still think it's 17.", "16 is too low. The line is 18 as of the 2021 'Raise the Age' law.", "21 is for other things, like alcohol. The adult criminal age is 18."],
      principle: "Michigan raised the age to 18 in 2021 because research shows teen brains are still developing. Juvenile court focuses on rehabilitation: counseling, education, second chances, and records that can often be sealed. Adult convictions can follow you for life. This is exactly why staying calm and asking for a parent or lawyer matters so much when you're young: the stakes of what you say are high, and support helps protect your future.",
      keyPhrase: { quote: "Michigan: 18 is adult.", gloss: "Raised from 17 on October 1, 2021." },
      scenario: { setup: "You want to know when the system treats you as a full adult in Michigan.", lines: [{ label: "BEFORE OCT 2021", text: "17-year-olds went straight to adult court." }, { label: "NOW", text: "17-year-olds go through juvenile court." }], note: "Juvenile court can seal your record. Adult court means a conviction that follows you." }
    },
    {
      q: "What's the core legal difference between an ICE administrative warrant and a judicial warrant?",
      options: ["An administrative warrant is officer-signed; a judicial warrant is judge-signed and can authorize entry", "They're the same thing with two different names", "An administrative warrant is the stronger of the two", "A signed warrant of any kind lets them into your home"],
      correct: 0,
      hint: "Ask who reviews it: the agency checking its own work, or a neutral judge.",
      optionExplanations: [null, "People treat all 'warrants' as equal. They aren't. Only a judge-signed one carries the neutral review that can force home entry.", "It's backwards. A judicial warrant, checked by a judge, is the stronger one over your home. Officer-signed paper isn't.", "The dangerous myth: that any warrant opens your door. An officer-signed administrative warrant generally does not."],
      principle: "A judicial warrant is signed by a neutral judge and can authorize entry into a home. An administrative warrant (ICE Forms I-200 or I-205) is signed by an immigration officer, not a judge, and traditionally does not authorize forced home entry. The whole value of a warrant is a neutral party checking it. Knowing the difference lets you calmly ask to see the signature. And if agents enter anyway, the safe move is always the same: don't physically resist, state that you don't consent, and call a lawyer.",
      keyPhrase: { quote: "Judge-signed vs. officer-signed.", gloss: "Only judge-signed forces entry. Don't resist either way." },
      scenario: { setup: "You're handed a document and told it authorizes entry.", lines: [{ label: "LOOK AT", text: "The signature line and the header." }, { label: "JUDICIAL", text: "Court name, judge's signature, your address." }, { label: "ADMINISTRATIVE", text: "'Homeland Security,' officer signature." }], note: "Check who signed. Your safety comes before winning the doorway." }
    },
    {
      q: "Under Arizona v. Gant, when can police search your car after arresting you during a traffic stop?",
      options: ["Only if you could reach the passenger area, or they expect evidence of that crime is inside", "Anytime they arrest someone in the car", "Never, an arrest never lets them search a car", "Only with a brand-new warrant every single time"],
      correct: 0,
      hint: "The old rule let them search almost automatically. The Court narrowed it to two reasons.",
      optionExplanations: [null, "The old belief was that any arrest = automatic car search. Gant cut that back to two narrow reasons.", "It's not never, either. Gant kept two situations where the search is allowed. Say 'I don't consent' and let a lawyer sort it.", "Gant doesn't require a fresh warrant each time. It defines when the arrest itself can justify the search."],
      principle: "Arizona v. Gant (2009) narrowed car searches after arrest to two situations: you could actually reach the passenger area, or it's reasonable to believe evidence of the crime you're arrested for is inside. Once you're cuffed in a patrol car, that logic usually disappears. But the roadside is not the place to argue this doctrine. Say 'I don't consent' once, clearly, keep your hands visible, and let your lawyer make the Gant argument in court.",
      keyPhrase: { quote: "Say 'I don't consent,' then let it go.", gloss: "Gant is argued in court by a lawyer, not roadside." },
      scenario: { setup: "You've been arrested and secured, and officers move toward your car.", lines: [{ label: "YOU (calm, once)", text: "I don't consent to a search." }, { label: "THEN", text: "Stay quiet. Don't argue the law roadside." }], note: "Stating your objection once preserves the challenge. Arguing it there does not." }
    },
    {
      q: "Police get consent to search your bag, then start going through a locked phone inside it. What's the key limit on consent searches?",
      options: ["A search can't go past what you agreed to", "Saying yes to one thing means yes to everything you own", "Once you say yes, you can never take it back", "Your yes also covers other people's stuff nearby"],
      correct: 0,
      hint: "Consent is a door you open only so wide. Did agreeing to the bag say anything about the phone?",
      optionExplanations: [null, "The myth: one yes opens everything. Not true. Yes to a bag isn't yes to a locked phone. Each thing has its own privacy.", "You CAN take consent back, or set limits up front. It's not a one-way switch. Say it calmly, once.", "Your yes only covers your things. It doesn't reach someone else's separate, private property."],
      principle: "A consent search is limited to what a reasonable person would understand you agreed to. Saying yes to a bag isn't yes to a locked phone inside it, and Riley treats phones as needing their own warrant. You can also set limits up front or calmly withdraw consent. But keep it to one clear sentence; the roadside isn't the place to argue scope doctrine. State the limit calmly, then let a lawyer challenge anything found beyond it.",
      keyPhrase: { quote: "You set the scope, calmly.", gloss: "Consent covers only what you agreed to. Say it once." },
      scenario: { setup: "You agreed to a bag search and they pull out your phone.", lines: [{ label: "YOU (calm)", text: "I consented to the bag, not my phone." }, { label: "WHY", text: "A phone generally needs its own warrant (Riley)." }], note: "Name the limit once. Don't grab the phone or argue; let a lawyer follow up." }
    },
    {
      q: "A roommate lets police into a shared apartment. Whose spaces can that consent cover?",
      options: ["Shared areas, but generally not your separate private room", "The whole place, since they live there too", "Nothing, a roommate can never let police in", "Only the roommate's own bedroom, nowhere shared"],
      correct: 0,
      hint: "Someone can open doors to spaces they share and control. Can they open a door that's only yours?",
      optionExplanations: [null, "People assume a roommate can open everything. They can consent to shared space they control, but usually not your private room.", "It's not nothing, either. A roommate can let officers into the shared living areas they actually use.", "Shared areas ARE covered by a roommate's yes. The line is about who controls the space, not just their own room."],
      principle: "A person can consent to a search of areas they share and control (common authority). A roommate can let officers into shared living spaces, but generally can't authorize a search of your separate, private bedroom they don't use. The line follows who actually controls the space. If this comes up, you can calmly say a room is yours and private, but don't physically block a door; state it once and let a lawyer sort out whether the consent was valid.",
      keyPhrase: { quote: "They open only their own doors.", gloss: "Shared areas yes; your private room generally no." },
      scenario: { setup: "Your roommate waves officers inside.", lines: [{ label: "COVERED", text: "The living room and kitchen you share." }, { label: "USUALLY NOT", text: "Your separate, private bedroom." }], note: "State calmly that a room is yours. Don't block the door; let a lawyer follow up." }
    },
    {
      q: "In Michigan, if you're carrying a concealed pistol with a CPL and get pulled over, what does the law require?",
      options: ["Immediately tell the officer you're carrying, keep hands visible, and show your CPL and ID", "Wait for the officer to ask if you have a weapon", "Say nothing, since you have the right to stay silent", "Only mention it if they decide to search you"],
      correct: 0,
      hint: "The statute's keyword is 'immediately.' And with a gun present, how you move matters as much as what you say.",
      optionExplanations: [null, "Waiting to be asked misses the law's word: 'immediately.' You disclose up front, before they ask.", "This is the dangerous mix-up. The usual 'stay silent' advice does NOT apply here. Michigan law requires you to disclose the gun.", "Waiting until a search is far too late, and with a gun present, silence about it is risky. Disclose immediately, hands on the wheel."],
      principle: "This is a rare place where Michigan law requires you to speak first: a CPL holder who is carrying must immediately disclose it to the officer and show the CPL and a state ID on request (MCL 28.425f). Because a firearm is present, this is also the most safety-critical moment in any stop. Keep both hands on the wheel, say clearly and early that you have a CPL and are carrying, tell the officer where it is, and never reach toward it. Announce before you move, and follow every instruction exactly. Getting this right is about survival, not just the law.",
      keyPhrase: { quote: "Say it immediately, hands on the wheel.", gloss: "Disclose up front, don't reach, follow every instruction." },
      scenario: { setup: "You're a CPL holder carrying when you get pulled over.", lines: [{ label: "YOU (hands on wheel)", text: "Officer, I have a CPL and I'm carrying. It's on my right hip." }, { label: "THEN", text: "Wait for instructions. Don't reach for anything." }, { label: "MOVE", text: "Announce before every movement." }], note: "Disclosure is required immediately. With a gun present, calm hands save lives." }
    },
    {
      q: "In Michigan, is refusing to give your name, by itself, the crime of 'obstruction'?",
      options: ["No, refusing alone is generally not obstruction", "Yes, refusing to identify is always obstruction", "Yes, if the officer feels disrespected", "Only if you refuse more than once"],
      correct: 0,
      hint: "Obstruction usually needs more than just quietly declining. What would actually have to happen?",
      optionExplanations: [null, "A widespread fear, but simply declining to give your name is generally not obstruction in Michigan.", "An officer's feelings don't create a crime. Obstruction needs actual interference, not hurt feelings.", "Repeating a lawful 'no' doesn't turn it into a crime. Declining is declining."],
      principle: "In Michigan, quietly declining to give your name is generally not obstruction by itself. Obstruction usually involves actively interfering, lying to police, or physically resisting, not simply staying silent. That said, refusing can still escalate an encounter, and escalation carries real risk. The safe move is to know your right, stay calm, and decide in the moment whether using it is worth the tension.",
      keyPhrase: { quote: "Silence isn't obstruction.", gloss: "Declining your name isn't a crime; interfering or lying is." },
      scenario: { setup: "An officer warns that not answering is 'obstruction.'", lines: [{ label: "OFFICER", text: "Give me your name or that's obstruction." }, { label: "YOU (calm)", text: "Am I being detained?" }], note: "Declining alone generally isn't a crime, but staying calm keeps you safest." }
    },
    {
      q: "Immigration officers hand you a form and tell you to sign it. What's the safe move?",
      options: ["Don't sign anything until you've talked to a lawyer", "Sign it quickly to cooperate and speed things up", "Sign it, since refusing is against the law", "Sign only if you don't understand it"],
      correct: 0,
      hint: "A signature can give things away that are hard to undo. What do you want before you commit to one?",
      optionExplanations: [null, "A common and costly mistake: signing to seem cooperative. Some forms give up your chance to stay. Talk to a lawyer first.", "Refusing to sign is not a crime. You're allowed to wait for a lawyer before signing anything.", "Signing something you don't understand is the most dangerous version. If anything, that's the strongest reason to wait for a lawyer."],
      principle: "Signing a form for immigration officers can waive important rights, including in some cases your chance to fight to stay. People often sign to seem cooperative or to make the moment end faster, and that can cause harm that's hard to undo. You have the right to say you won't sign anything until you speak with a lawyer. Stay calm and polite, don't lie or present false documents, and keep your right to stay silent whatever your status.",
      keyPhrase: { quote: "Don't sign without a lawyer.", gloss: "A signature can waive your rights. Wait for legal help." },
      scenario: { setup: "Officers push a document at you and want a signature.", lines: [{ label: "OFFICER", text: "Just sign here and we're done." }, { label: "YOU (calm)", text: "I won't sign anything without a lawyer." }], note: "Signing can give up rights that are hard to get back. Wait." }
    },
    {
      q: "During a stop, an officer pats down the outside of your clothes. How far does that let them go?",
      options: ["Just a pat for weapons; not a full dig through pockets and bags", "All the way into every pocket and bag you have", "Anywhere, since you were stopped", "Nowhere, a pat-down is never allowed"],
      correct: 0,
      hint: "A frisk has a specific, narrow purpose. What are they actually allowed to be looking for?",
      optionExplanations: [null, "People think a pat-down opens everything. It doesn't. A frisk is a limited outer-clothing check for weapons.", "Being stopped doesn't turn a frisk into a full search. That needs more, like probable cause or consent.", "A pat-down IS allowed on reasonable suspicion you're armed. It's just limited to weapons."],
      principle: "A frisk is a limited pat-down of your outer clothing for weapons, allowed when an officer reasonably suspects you're armed and dangerous (Terry v. Ohio). It is narrower than a full search: it doesn't automatically let them dig through pockets and bags. If it goes further than a weapons pat, you can calmly say you don't consent to a search. Don't physically resist; state it and let a lawyer challenge the rest.",
      keyPhrase: { quote: "A frisk is a weapons pat, not a dig.", gloss: "Outer clothing for weapons. A full search needs more." },
      scenario: { setup: "The officer starts patting the outside of your jacket.", lines: [{ label: "ALLOWED", text: "A pat for weapons on reasonable suspicion." }, { label: "IF IT GOES FURTHER", text: "Say calmly: I don't consent to a search." }], note: "State the limit once. Don't grab their hands; let a lawyer follow up." }
    },
    {
      q: "If you say yes to a search and they find something, can it just get thrown out later?",
      options: ["Usually no; consenting can waive the protection you had", "Yes, anything found always gets thrown out anyway", "Yes, if you change your mind afterward", "Only if you were nervous when you said yes"],
      correct: 0,
      hint: "Consent is powerful. Once you open that door, what happens to the challenge you could have made?",
      optionExplanations: [null, "A dangerous myth: that a search can always be undone later. Consenting can waive the very challenge you'd need.", "Changing your mind after they've searched usually doesn't undo a search you agreed to.", "Being nervous doesn't automatically undo consent. That's why the calm 'no' up front matters so much."],
      principle: "Consent is powerful and often can't be taken back after the fact. If you agree to a search, you may waive the challenge a lawyer could have made if you'd refused. That's why the clear, calm 'I don't consent' up front matters so much: it keeps your options open. You can also set limits before agreeing, or withdraw consent before they act, but once they've searched on your yes, it's hard to undo.",
      keyPhrase: { quote: "Yes can't always be undone.", gloss: "Consenting may waive the challenge you'd otherwise have." },
      scenario: { setup: "You're tempted to just say yes to get it over with.", lines: [{ label: "IF YOU CONSENT", text: "You may give up the fight over the search." }, { label: "IF YOU DECLINE", text: "A lawyer can challenge it later." }], note: "The calm 'no' up front is what preserves your options." }
    },
    {
      q: "Does asking \"Am I free to leave?\" make you look guilty?",
      options: ["No, it's a smart, neutral question anyone can ask", "Yes, only guilty people ask that", "Yes, it annoys police and counts against you", "Only if you ask before they finish talking"],
      correct: 0,
      hint: "This question just gets you information. Does getting information imply anything about guilt?",
      optionExplanations: [null, "The 'only guilty people ask' idea keeps people from using a useful question. Anyone can ask it.", "Whether it annoys an officer doesn't make it evidence. It's a lawful, neutral question.", "Timing doesn't turn a neutral question into guilt. Just ask it calmly."],
      principle: "Asking 'am I free to leave?' doesn't make you look guilty; it's a neutral question that gets you the one fact you need. The worry that it seems suspicious is exactly what stops people from using it, which leaves them unsure whether they can walk away. Ask it calmly and respectfully. It isn't evidence of anything, and it helps you make a safe, informed choice.",
      keyPhrase: { quote: "Asking isn't admitting.", gloss: "It's a neutral question, not a sign of guilt." },
      scenario: { setup: "You hesitate to ask because you don't want to seem guilty.", lines: [{ label: "THE WORRY", text: "Asking makes me look guilty." }, { label: "THE TRUTH", text: "It's a neutral question that just gets you facts." }], note: "Ask calmly. It tells you which situation you're in, nothing more." }
    },
    {
      q: "You blurt something out without being asked, before any Miranda warning. Can it be used?",
      options: ["Yes, statements you volunteer can be used even without Miranda", "No, nothing counts until they read your rights", "No, only written statements count", "Only if a second officer heard it too"],
      correct: 0,
      hint: "Miranda covers answers to questioning. What about things you say when nobody asked?",
      optionExplanations: [null, "A big misunderstanding: that nothing counts pre-Miranda. Things you volunteer, not in response to questioning, can be used.", "Spoken statements count too. There's no rule that only written ones matter.", "It doesn't take two officers. One hearing you volunteer something is enough."],
      principle: "Miranda covers answers to police questioning while you're in custody. It does not protect things you volunteer on your own, so a statement you blurt out without being asked can generally be used against you, even before any warning. This is why the safest habit in any encounter is to keep quiet and let your words be about invoking your rights, not filling silence or explaining yourself.",
      keyPhrase: { quote: "Volunteered words still count.", gloss: "Miranda covers questioning, not things you say on your own." },
      scenario: { setup: "Waiting in the back of a patrol car, you start talking.", lines: [{ label: "MIRANDA COVERS", text: "Answers to their questioning." }, { label: "NOT COVERED", text: "Things you say on your own, unprompted." }], note: "The safe habit: stay quiet unless you're invoking a right." }
    },
    {
      q: "Police take your phone during an arrest. Can they scroll through it and delete your video?",
      options: ["Generally no; they need a warrant to search it and can't force deletion", "Yes, once they hold it they can look through everything", "Yes, they can delete anything they don't like", "Only if the video shows them clearly"],
      correct: 0,
      hint: "Even if they lawfully hold the phone, what's inside it got special protection from the Supreme Court.",
      optionExplanations: [null, "People assume holding the phone means reading it. Riley v. California says the contents generally need their own warrant.", "Forcing you to delete footage isn't allowed. They can't destroy your recording.", "What the video shows doesn't change the rule. The contents are protected either way."],
      principle: "Even if police lawfully take your phone during an arrest, they generally can't search its contents without a warrant (Riley v. California), and they can't force you to delete footage. Seizing the device and searching what's inside are two different things. If this happens, don't physically fight over the phone; say clearly that you don't consent to a search, and let a lawyer challenge anything improper later.",
      keyPhrase: { quote: "Holding it isn't reading it.", gloss: "Phone contents need a warrant. They can't force deletion." },
      scenario: { setup: "During an arrest an officer takes your phone.", lines: [{ label: "THEY CAN", text: "Hold the device as part of the arrest." }, { label: "THEY GENERALLY CAN'T", text: "Search inside it without a warrant, or delete video." }], note: "Say you don't consent. Don't grab the phone; let a lawyer follow up." }
    },
    {
      q: "Officers say they have a warrant. What kind actually lets them into your home?",
      options: ["A search or arrest warrant signed by a judge, with the right details", "Any document with the word 'warrant' on it", "An ICE or administrative warrant", "A warrant an officer signed themselves"],
      correct: 0,
      hint: "The magic isn't the word 'warrant.' It's who reviewed and signed it.",
      optionExplanations: [null, "Just seeing 'warrant' isn't enough. It has to be judge-signed with the right name or place.", "An ICE or administrative warrant is signed by an officer, not a judge, and doesn't authorize home entry by itself.", "An officer's own signature makes it administrative. That generally can't force entry into your home."],
      principle: "Only a warrant signed by a judge, a search warrant for the listed place and items, or an arrest warrant for a person believed to be inside, authorizes entry into your home. An ICE detainer or administrative removal order is signed by an officer, not a judge, and does not authorize entry without your consent. Ask them to slip it under the door or hold it to the window so you can check who signed it. If they enter anyway, don't resist; challenge it later.",
      keyPhrase: { quote: "A judge's signature is the key.", gloss: "Search or arrest warrant, judge-signed. Not administrative." },
      scenario: { setup: "Agents hold up a paper and demand entry.", lines: [{ label: "ASK", text: "Slide it under the door to read." }, { label: "LOOK FOR", text: "A judge's signature and your name or address." }, { label: "IF ADMINISTRATIVE", text: "It doesn't authorize entry. Don't consent." }], note: "Check the signature. Your safety comes before the doorway." }
    },
    {
      q: "A detention (a brief stop) is supposed to be short. What can make it turn into something bigger?",
      options: ["It can become an arrest if police develop probable cause", "It automatically becomes an arrest after five minutes", "It can never become an arrest, it's just a stop", "It becomes an arrest only if you ask to leave"],
      correct: 0,
      hint: "A stop and an arrest are different tiers. What has to grow for one to become the other?",
      optionExplanations: [null, "There's no magic clock. A stop doesn't flip to arrest just because time passed. It's about the level of proof.", "A stop can absolutely lead to an arrest. It's not frozen as 'just a stop' forever.", "Asking to leave doesn't create an arrest. What matters is whether police gain probable cause."],
      principle: "A detention is meant to be a brief investigative stop on reasonable suspicion. It can turn into an arrest if, during the stop, police develop probable cause: enough facts to reasonably believe you committed a crime. It's the level of proof that changes the tier, not a stopwatch. Knowing this helps you understand the situation, but the safe move stays the same in both: stay calm, comply, and challenge overreach later.",
      keyPhrase: { quote: "Proof grows, tier changes.", gloss: "A stop becomes an arrest when probable cause appears." },
      scenario: { setup: "A brief stop is dragging on and getting more serious.", lines: [{ label: "STOP", text: "Reasonable suspicion, brief." }, { label: "BECOMES ARREST", text: "When probable cause develops." }], note: "It's about proof, not a clock. Stay calm through either." }
    },
    {
      q: "You mumble \"maybe I should talk to a lawyer.\" Does that stop the questioning?",
      options: ["Not reliably; courts have said the request must be clear", "Yes, any mention of a lawyer stops everything", "Yes, but only if you say it twice", "No, asking for a lawyer never stops questioning"],
      correct: 0,
      hint: "The switch is being unmistakable. Does 'maybe' leave any doubt?",
      optionExplanations: [null, "People think any mention counts. Courts (Davis v. US) said an unclear, 'maybe' request may not require police to stop.", "Repeating a vague statement doesn't fix the vagueness. Say it clearly the first time.", "A clear request IS supposed to stop questioning. The problem here is only that 'maybe' isn't clear."],
      principle: "A request for a lawyer has to be clear and unambiguous to reliably stop questioning. The Supreme Court (Davis v. United States) said police don't have to stop for a wishy-washy 'maybe I should get a lawyer.' So say it plainly: 'I want a lawyer,' then stop talking. This is a place where the exact words matter. A calm, clear statement does the work; a hesitant one may not.",
      keyPhrase: { quote: "No 'maybe.' Say it plainly.", gloss: "A clear request stops questioning; a vague one may not." },
      scenario: { setup: "You're unsure how to phrase your request.", lines: [{ label: "TOO VAGUE", text: "\"Maybe I should get a lawyer?\"" }, { label: "CLEAR", text: "\"I want a lawyer.\"" }], note: "Say it plainly, then go quiet. The words matter here." }
    },
    {
      q: "You're recording police in public in Michigan, and it captures their voices. Is the audio a problem?",
      options: ["Generally no; there's no privacy expectation for police work in public", "Yes, recording anyone's voice is always illegal in Michigan", "Yes, you need each officer to agree to the audio", "Only if you post the audio online"],
      correct: 0,
      hint: "Michigan's audio rules turn on a reasonable expectation of privacy. Do officers have that while working in public?",
      optionExplanations: [null, "People fear Michigan's eavesdropping law bans all audio. But public police work has no reasonable expectation of privacy.", "You don't need each officer's okay. In public, doing public duties, there's no privacy expectation to protect.", "Whether you post it doesn't change the recording's legality. The public setting is what matters."],
      principle: "Michigan's eavesdropping law protects private conversations, ones where people have a reasonable expectation of privacy. Police doing their public duties in public generally don't have that expectation, so capturing their audio while you lawfully record them is generally fine. This is the clear, safe ground. Recording other people's genuinely private conversations is the risky side, so stick to public officials in public and keep your distance.",
      keyPhrase: { quote: "Public work, no privacy expectation.", gloss: "Audio of police in public is generally fine in Michigan." },
      scenario: { setup: "Your video of an arrest picks up the officers talking.", lines: [{ label: "PUBLIC DUTIES", text: "No reasonable expectation of privacy." }, { label: "SO", text: "The audio is generally fine." }], note: "Private conversations are the risky side. Public police work isn't." }
    },
    {
      q: "Police are at your door without a warrant and want to talk. How can stepping outside affect things?",
      options: ["Stepping out and closing the door can limit what they can access", "Stepping outside lets them search your whole home", "It makes no difference where you stand", "It automatically counts as inviting them in"],
      correct: 0,
      hint: "Where the conversation happens can change what's in reach. What does closing the door behind you do?",
      optionExplanations: [null, "Some fear stepping out opens the house. It's closer to the opposite: closing the door behind you can narrow their access.", "Where you stand does matter. Talking at an open door, or inviting them in, is what risks giving up access.", "Stepping out and closing the door is different from inviting them in. It can actually protect the inside of your home."],
      principle: "If police are at your door without a warrant, stepping outside and closing the door behind you can narrow what they can access, because you're not exposing or inviting them into the home. Opening the door wide or inviting them in can do the opposite. This is a judgment call, and safety comes first, but understanding it helps you avoid accidentally consenting to entry. When unsure, keeping the door shut and talking through it is simplest.",
      keyPhrase: { quote: "Close the door behind you.", gloss: "Stepping out can limit access; inviting in gives it up." },
      scenario: { setup: "You decide to talk to officers at the door.", lines: [{ label: "NARROWS ACCESS", text: "Step out, close the door behind you." }, { label: "RISKS ACCESS", text: "Open the door wide or invite them in." }], note: "When unsure, keep the door shut and talk through it." }
    },
    {
      q: "An officer lawfully stops you and sees something illegal sitting out in the open. What can they do?",
      options: ["Seize it under the 'plain view' rule, no separate warrant needed", "Nothing, they still need a warrant for anything they see", "Nothing, unless you admit it's yours", "Search your whole house because of it"],
      correct: 0,
      hint: "If it's already visible and they're lawfully there, the privacy argument gets weaker. What does that allow?",
      optionExplanations: [null, "People assume everything needs a warrant. If police are lawfully present and something illegal is in plain view, they can seize it.", "Whether you admit it's yours isn't the test. Plain view is about it being visible while they're lawfully there.", "One item in plain view doesn't unlock a whole-house search. Plain view is about what's actually visible."],
      principle: "Under the plain view rule, if an officer is lawfully in a spot and sees something obviously illegal sitting out in the open, they can seize it without a separate warrant. The key is that they're lawfully there and the item is actually visible. This is one of the real exceptions to the warrant rule. It's a good reason not to leave things in open view, and a reminder that the warrant rule has limits you should know.",
      keyPhrase: { quote: "In the open, lawfully seen.", gloss: "Plain view lets police seize visible, obvious contraband." },
      scenario: { setup: "During a lawful stop, something illegal is sitting in view.", lines: [{ label: "PLAIN VIEW", text: "Lawfully present plus clearly visible." }, { label: "RESULT", text: "They can seize it without a new warrant." }], note: "This is a real exception. What's out in the open isn't private." }
    },
    {
      q: "During a lawful stop, an officer asks to search you 'just to be safe.' Do you have to agree?",
      options: ["No; you can decline, and the stop alone doesn't authorize a full search", "Yes, a lawful stop means you must allow a search", "Yes, 'to be safe' makes it required", "No, but only if you're completely silent otherwise"],
      correct: 0,
      hint: "A lawful stop and a full search are different things. Does one automatically include the other?",
      optionExplanations: [null, "Big myth: that being lawfully stopped means you must consent to a search. It doesn't. You can decline.", "'To be safe' is persuasion, not law. A stop by itself doesn't require you to allow a full search.", "You don't have to be silent to decline a search. You can calmly say you don't consent regardless."],
      principle: "A lawful stop does not automatically authorize a full search of you. An officer may do a limited weapons frisk if they reasonably suspect you're armed, but for a full search they generally need consent, probable cause, or another exception. You can calmly decline consent. 'Just to be safe' is a persuasion phrase, not a legal requirement. Say you don't consent, once, and don't physically resist; let a lawyer sort out the rest.",
      keyPhrase: { quote: "A stop isn't a search.", gloss: "Being stopped doesn't mean you must allow a full search." },
      scenario: { setup: "You're lawfully stopped and asked to allow a search.", lines: [{ label: "OFFICER", text: "Let me search you, just to be safe." }, { label: "YOU (calm)", text: "I don't consent to a search." }], note: "A frisk for weapons is different. Say your 'no' once, calmly." }
    }
  ],
  expert: []
};


// ---------------------------------------------------------------------------
// R : all user-facing copy
// ---------------------------------------------------------------------------
// R.questions points at the bank above; that is how the engine reaches it.

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
  verdictContinueWrong: "Learn why \u2192",
  questions: QUESTIONS
};
