// The Quiet Gallery — tuning constants. One place for every number the
// rest of the game reads, so balancing is editing this file, not the logic.
export const TILE = 40;
export const COLS = 23;
export const ROWS = 15;

// How a step of simulation advances (seconds).
export const STEP = 1 / 60;

// Player movement (pixels per second).
export const PLAYER = {
  walkSpeed: 150,
  sneakSpeed: 72,
  radius: 11,
  // Standing in a shadow tile multiplies how fast a guard's meter fills.
  shadowFactor: 0.3,
  // Sneaking (Shift held) multiplies the fill rate too.
  sneakFactor: 0.55,
};

// Guard movement (pixels per second).
export const GUARD = {
  patrolSpeed: 58,
  chaseSpeed: 118,
  investigateSpeed: 88,
  radius: 12,
  // Vision cone: how far a guard can see, and how wide the cone is.
  viewRange: 175,
  viewHalfAngle: Math.PI / 4.6,
  // Detection fills 0..100; the fill per second at point-blank range in
  // bright light while the player walks.
  detectPerSecond: 95,
  // How far away a running player's footsteps carry.
  hearRange: 110,
  // How far a thrown coin's clink carries.
  coinHearRange: 230,
  // Seconds a guard stares at the spot it lost you before giving up.
  searchSeconds: 3.2,
  // Seconds of no line of sight before the alarm cools down.
  calmSeconds: 2.5,
};

// Detection meter thresholds.
export const DETECT = {
  // At this meter the nearest guard turns suspicious and comes to look.
  suspiciousAt: 45,
  // At this meter the alarm sounds and every guard chases.
  alarmAt: 100,
  // The meter drains this fast per second while no guard can see you.
  drainPerSecond: 26,
};

// Coins the player can throw to distract guards.
export const COIN = {
  maxCarried: 3,
  throwSpeed: 260,
  // How long a coin sits ringing on the floor before it is spent.
  ringSeconds: 4,
};

// What the level asks for.
export const GOAL = {
  artifactsToWin: 3,
};
