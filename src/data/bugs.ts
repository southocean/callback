// The bug collection, as data.
//
// Board ticket N59. Nam: "This is like the same as easter eggs, but reward a
// different kind of exploration: the developer's dedication ... We basically
// have a collection ... user needs to catch them all pokemon style."
//
// WHY IT IS A SECOND MECHANIC RATHER THAN MORE ACHIEVEMENTS. The side quests
// reward breadth: touch each thing once and the list empties. Nothing in the
// build rewarded going back to the same control a third time to see whether it
// still behaved, which is the actual habit of somebody who tests software for a
// living. So repetition is the mechanic, because repetition is the behaviour
// being flattered.
//
// And they are not all repetition. Nam: "they dont all have to be 4 repeated
// clicks somewhere to find, they can just be obscure crazy ways to get them."
// Three of these have `repeat: 1` and hide behind an act nobody performs by
// accident.
//
// THE POSTURE IS THE OPPOSITE OF THE EGGS'. Off the clock hands the visitor
// every clip they missed (N63); nothing hands over a bug. Nam: "we can be
// generous here, now that we add in the bugs too that we will not be generous
// about." An uncaught bug shows its silhouette and its hint, forever, and that
// is the whole of the help available.
//
// The art is in ui/bugart.ts and the catching is in ../bugs.ts. This file knows
// only what a bug IS.

/**
 * A body plan. One per bug, deliberately: twelve tints of one beetle is not a
 * collection, it is a palette. See ui/bugart.ts for how each is drawn.
 */
export type Plan =
  | 'scarab' | 'hercules' | 'jewel' | 'chafer' | 'weevil' | 'stag'
  | 'longhorn' | 'cicada' | 'swallowtail' | 'birdwing' | 'mantis' | 'leaf';

/**
 * Four colours, and the order is fixed so a silhouette can be produced by
 * passing the same value four times: shell, shell in shadow, body and legs, and
 * one accent for the markings that make a species recognisable.
 */
export type Palette = [string, string, string, string];

/**
 * How hard this one is to turn up, which is entirely a property of its HINT.
 *
 * Nam: "some bugs will be harder to find than others, this is measured in how
 * hard the hint is ... for this, we add a rarity property for these bugs, we
 * show it in the collection too."
 *
 * Worth saying plainly, because it is the whole design: the difficulty is NOT
 * in the trigger. Every one of these is a few presses on something already in
 * front of you, and a visitor told exactly where to press would clear the drawer
 * in two minutes. What varies is how much of the riddle is left to the reader,
 * so rarity is a promise about the hint rather than about the animal, and an
 * empty slot showing "Legendary" is telling the truth about how much work its
 * one sentence is doing.
 */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
};

export interface Bug {
  id: string;
  /** What the toast and the frame label call it. */
  name: string;
  /** The species. Shown only once it has been caught. */
  species: string;
  plan: Plan;
  palette: Palette;
  /**
   * How to find it, and never how many times.
   *
   * Nam: "Including the amount of times you have to do it is way too on the
   * nose, remove that ... Keep pressing the thing that is a picture of wifi.
   * What the heck, this is like giving away exactly where the bug is."
   *
   * He is right twice over. A hint carrying the repeat count turns a discovery
   * into an instruction, and one naming the control turns it into a link. So
   * these are riddles: they say enough that the answer is findable and never
   * enough that it is given, and how much they hold back is what `rarity` is
   * reporting.
   *
   * Shown on the silhouette too, because a collection nobody can finish is a
   * list of things they failed at.
   */
  hint: string;
  rarity: Rarity;
  /** Where it actually was. Shown once caught, and it names the surface. */
  where: string;
  /** The true thing about the animal. Shown once caught. */
  fact: string;
  /**
   * How many times the trigger has to fire. Three is Nam's number and it is the
   * right one: "So you can stumble upon a bug sure, but finding all of them is
   * a different story."
   */
  repeat: number;
}

export const bugs: Bug[] = [
  {
    id: 'goldbug',
    name: 'The Gilded Scarab',
    species: 'Chrysina resplendens',
    plan: 'scarab',
    palette: ['#f6d044', '#b8860b', '#5c4409', '#fff3bf'],
    hint: 'Something has to draw the hand out before it can be swatted.',
    rarity: 'uncommon',
    where: 'The raise-hand control, on the third raise.',
    fact:
      'Its shell is a stack of chitin layers that reflects both circular polarisations, which is why it '
      + 'looks like poured metal and why almost nothing else in nature does.',
    repeat: 3,
  },
  {
    id: 'jewel',
    name: 'The Jewel Beetle',
    species: 'Sternocera aequisignata',
    plan: 'jewel',
    palette: ['#1f9e6e', '#0d5f43', '#0a3327', '#ffd76a'],
    hint: 'Some of those little glyphs report. One only poses. Bother the poser.',
    rarity: 'rare',
    where: 'The system tray on the shared desktop.',
    fact:
      'Its wing cases keep their colour for centuries and were sewn onto textiles as beetlewing embroidery '
      + 'long before anyone made a dye that lasted as long.',
    repeat: 3,
  },
  {
    id: 'birdwing',
    name: 'The Birdwing',
    species: 'Ornithoptera priamus',
    plan: 'birdwing',
    palette: ['#25c07a', '#0e6b45', '#171a1c', '#8ff0c0'],
    hint: 'It comes out when the room applauds, and one clap is not applause.',
    rarity: 'common',
    where: 'The reaction tray in the control bar.',
    fact:
      'The green is structural rather than pigment, so a wing that is emerald from above is brown from the '
      + 'side. One of the largest butterflies alive, and the female is the bigger of the two.',
    repeat: 3,
  },
  {
    id: 'hercules',
    name: 'The Hercules',
    species: 'Dynastes hercules',
    plan: 'hercules',
    palette: ['#cdbb6a', '#8a7a2e', '#2a2320', '#efe3ae'],
    hint: 'The strongest thing here only shows itself when the machine stops being one.',
    rarity: 'legendary',
    where: 'The Start menu on the shared desktop, and its shutdown.',
    fact:
      'The horn is most of its length and it can carry many times its own weight. Its shell changes from '
      + 'olive to black as humidity rises, which makes it a working hygrometer.',
    repeat: 1,
  },
  {
    id: 'cicada',
    name: 'The Splendid Cicada',
    species: 'Tosena splendida',
    plan: 'cicada',
    palette: ['#2f4f7a', '#1a2b45', '#12161c', '#e8eef7'],
    hint: 'Cicadas sing where the words land. Take the words away, and give them back.',
    rarity: 'common',
    where: 'The captions control, three times over.',
    fact:
      'Cicadas sing with tymbals, a pair of ribbed membranes they buckle and release hundreds of times a '
      + 'second. They are among the loudest insects on earth and they have no voice at all.',
    repeat: 3,
  },
  {
    id: 'mantis',
    name: "The Devil's Flower",
    species: 'Idolomantis diabolica',
    plan: 'mantis',
    palette: ['#8fbf5a', '#4d7030', '#2c3a1c', '#f0f4ec'],
    hint: 'It waits with the things that are not gone, only being patient.',
    rarity: 'uncommon',
    where: 'The minimise button on any window on the shared desktop.',
    fact:
      'It spends its life pretending to be a flower and eats what comes to visit. Threatened, it opens the '
      + 'whole display at once, which is a bluff and works.',
    repeat: 3,
  },
  {
    id: 'leaf',
    name: 'The Walking Leaf',
    species: 'Phyllium giganteum',
    plan: 'leaf',
    palette: ['#7fae3f', '#4a6b25', '#31421c', '#d9e8b8'],
    hint: 'A leaf only convinces you while its shape keeps moving. So move a shape.',
    rarity: 'rare',
    where: 'Any window edge on the shared desktop.',
    fact:
      'It is not shaped like a leaf, it is shaped like a chewed leaf, brown edges and all, and it rocks as '
      + 'it walks so the resemblance holds while the wind is on.',
    repeat: 3,
  },
  {
    id: 'weevil',
    name: 'The Rainbow Weevil',
    species: 'Pachyrhynchus orbifer',
    plan: 'weevil',
    palette: ['#1b1f24', '#0e1114', '#0a0c0e', '#3fd0d8'],
    hint: 'It moves in after the tenants have left.',
    rarity: 'uncommon',
    where: 'The close button on the windows of the shared desktop.',
    fact:
      'The spots are photonic crystals with the same internal geometry as an opal. Its shell is so hard '
      + 'that other beetles have evolved to look like it rather than risk being mistaken for edible.',
    repeat: 3,
  },
  {
    id: 'stag',
    name: 'The Stag Beetle',
    species: 'Lucanus cervus',
    plan: 'stag',
    palette: ['#7a4423', '#4a2612', '#241209', '#c98a52'],
    hint: 'Stags wrestle over territory. Shove things out of their place and see who turns up.',
    rarity: 'common',
    where: 'Dragging windows on the shared desktop, three times.',
    fact:
      'The antlers are mandibles, and they are too weak to bite with. They exist to wrestle other males off '
      + 'branches, which is a use for a jaw that cannot chew.',
    repeat: 3,
  },
  {
    id: 'ulysses',
    name: 'The Blue Emperor',
    species: 'Papilio ulysses',
    plan: 'swallowtail',
    palette: ['#2f7ff0', '#12356e', '#0c1016', '#8fc4ff'],
    hint: 'Males will chase any flash of blue, even one that promises a picture and never takes one.',
    rarity: 'common',
    where: 'The camera button, which never asks for a camera.',
    fact:
      'The blue is a lattice of tiny scales bending light rather than any pigment, so it flashes on and off '
      + 'as the wing turns. Males will chase a scrap of blue paper across a field.',
    repeat: 3,
  },
  {
    id: 'chafer',
    name: 'The Rose Chafer',
    species: 'Cetonia aurata',
    plan: 'chafer',
    palette: ['#3fae52', '#1d6b2c', '#12331a', '#eaf6e6'],
    hint: 'Only one thing on that desk tells the truth. Bore it.',
    rarity: 'rare',
    where: 'The clock in the system tray.',
    fact:
      'It flies with its wing cases shut, slipping the flight wings out through a notch at the side, which '
      + 'is why it can take off faster than a beetle its size has any business doing.',
    repeat: 3,
  },
  {
    id: 'longhorn',
    name: 'The Harlequin',
    species: 'Acrocinus longimanus',
    plan: 'longhorn',
    palette: ['#c96a2a', '#7d3a12', '#1c1512', '#f2e4c8'],
    hint: 'Its arms outreach its body, and it wants fresh surfaces to climb. Make some.',
    rarity: 'uncommon',
    where: 'The new-tab button in the emulated Chrome.',
    fact:
      'The forelegs are longer than the whole body. It uses them to walk around tree trunks the way a '
      + 'climber traverses, and the pattern on the back is different on every individual.',
    repeat: 3,
  },
];

export function bugById(id: string): Bug | undefined {
  return bugs.find((b) => b.id === id);
}

/** How many there are to find. Named, because the outro says the number. */
export const BUG_COUNT = bugs.length;
