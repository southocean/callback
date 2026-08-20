// The narrative, and an honest argument about it.
//
// Nam's own framing: "I'm a challenger. I've completed all the side quests —
// only the main story is left: working at Google, and getting cast for
// Robinson." He asked for it to be built in, and also asked for the case
// against it. Both are here, because a design document that only argues one
// side is not a design document.
//
// What shipped is a synthesis, and the reasoning is set out below so he can
// overrule it. It is his CV.

export interface Take {
  heading: string;
  body: string;
}

export const original = {
  label: 'What Nam proposed',
  quote:
    'I am a challenger. I have completed all the side quests — game dev, research, C++, comedy, acting, ' +
    'jiu-jitsu, a zombie walk. Only the main story is left: working at Google, and getting cast for Robinson.',
  note:
    'Game-dev framing, dream framing. It is charming, it is unmistakably his voice, and it is the most ' +
    'memorable thing anyone said during the whole build.',
};

export const pros: Take[] = [
  {
    heading: 'It fixes the shape of the CV',
    body:
      'This is the strongest argument and it is not the obvious one. The CV looks scattered — front-end lead, ' +
      'C++ on signing hardware, optimisation research, a sales detour, stand-up comedy. Read as a career ladder ' +
      'that is a liability. Read as side quests it becomes deliberate range, which is what it actually was. The ' +
      'metaphor does real work: it converts the single biggest weakness of the document into the point of it.',
  },
  {
    heading: 'It is authentically his',
    body:
      'He is a game developer. Quest structure is not a costume borrowed to seem interesting — it is the ' +
      'vocabulary of the thing he has spent seven years building. A borrowed metaphor reads as a gimmick; a ' +
      'native one reads as a person.',
  },
  {
    heading: 'Form and content agree',
    body:
      'The side-quest framing and the achievements mechanic reinforce each other. The visitor is not told he ' +
      'thinks in quests — they are handed one and they complete it. That is the difference between a claim and ' +
      'a demonstration, which is the thesis of this entire artifact.',
  },
  {
    heading: 'Interviewers remember stories',
    body:
      'Nobody recalls the fourth bullet of the third role. A panel that has read two hundred CVs will remember ' +
      'the one that was a call, and the one where the applicant had been trying to get onto Robinson.',
  },
];

export const cons: Take[] = [
  {
    heading: '"Working at Google is my dream" is the single riskiest sentence available',
    body:
      'It centres the applicant\'s wish instead of the team\'s problem, and this company\'s hiring culture is ' +
      'specifically allergic to it — prestige-seeking reads as a poor signal for mission fit. Interviewers have ' +
      'heard it thousands of times, always from the least prepared candidates. It is the one line that makes a ' +
      'strong application sound junior.',
  },
  {
    heading: 'It quietly devalues seven years of real work',
    body:
      'If this job is the main story, everything before it was a tutorial level. That is the opposite of the ' +
      'argument the CV needs to make, which is that a specific decade of specific work produced a person who ' +
      'already solves this specific problem. Do not describe your own experience as preparation.',
  },
  {
    heading: 'Robinson and the job cannot be co-equal goals',
    body:
      'In the same sentence, they read as two trophies rather than one career and one hobby. The joke is ' +
      'genuinely good and it humanises him — it just cannot sit at the same altitude as the role, or the role ' +
      'stops sounding like work he wants to do.',
  },
  {
    heading: '"I completed all the side quests" is self-congratulatory without receipts',
    body:
      'A challenger frame invites the reader to check the claim. Stated flatly it is a boast; attached to ' +
      'evidence it is a summary. It has to arrive after the proof, never before it.',
  },
  {
    heading: 'The referral carries the risk',
    body:
      'A friend inside the team is putting his name on this. If the loudest note is a dream rather than a ' +
      'record, his credibility is riding on a vibe. That was review R5, and it applies to the narrative too.',
  },
];

export const shipped = {
  label: 'What shipped, and why',
  body:
    'The game framing stays, in full. The prestige framing does not. One change carries almost all of it: the ' +
    'main quest is the problem, not the company. Four people on four networks who all have to see the same ' +
    'thing at the same instant — that is the boss fight, and it is a thing about the work rather than a thing ' +
    'about the logo. The side quests stay exactly as he wrote them, because they are the good part, and the ' +
    'achievements make them literal. Robinson survives as what it is: a hobby line in Off the clock, told as a ' +
    'joke against himself, which is where it is funniest and where it costs nothing.',
  keeps: [
    'Challenger energy, side quests, achievements, easter eggs — the whole game layer.',
    'Robinson, demoted from life goal to punchline, which improves it.',
    'The range-not-scatter reframe, which is the genuinely valuable idea in his version.',
  ],
  drops: [
    '"Working at Google is my dream" as the stated motive.',
    'Any suggestion that the last ten years were a run-up to this.',
    'The claim of completion arriving before the evidence for it.',
  ],
};

export const alternative = {
  label: 'The alternative, if he wants a different bet',
  name: 'The specialist who did not notice',
  body:
    'No game metaphor at all. The story is that he spent seven years accidentally becoming the exact person ' +
    'this team needs and only recently worked out that the job existed. Four players on four networks, a ' +
    'renderer embedded in a web page, a resync that must not lose the room — he was already solving the video ' +
    'call problem, minus the video. Quieter, harder to dismiss, no prestige risk, and it survives a sceptical ' +
    'reader better than anything with a metaphor in it.',
  cost:
    'It is also less memorable, and memorable was the brief. It gives up the reframe that turns a scattered CV ' +
    'into deliberate range, and it gives up the reason the achievements exist. Recommended if the panel skews ' +
    'conservative or if the referrer wants the safest possible thing attached to his name — a switch, not a ' +
    'rewrite: the copy lives in one data module.',
};

export const verdict =
  'Ship the game layer, cut the dream framing, keep Robinson as a joke. It is the version where the metaphor ' +
  'does work rather than asking for something — and it is the only version where the last seven years are the ' +
  'main story instead of the tutorial.';
