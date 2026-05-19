const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const difficultyButtons = Array.from(document.querySelectorAll('[data-difficulty]'));

const MAP = 2000;
const SOURCE_W = 562;
const SOURCE_H = 482;
const VIEW_H = 450;
const VIEW_W = VIEW_H * (16 / 9);
const PLAYER_SIZE = 46;
const PLAYER_COLLISION_RADIUS = 13;
const DISGUISE_RADIUS = 96;
const INSPECT_RADIUS = 90;
const CATCH_RADIUS = 56;
const DOG_VISION_RANGE = 360;
const ITEM_SPAWN_MIN_RATIO = 1;
const ITEM_SPAWN_MAX_RATIO = 1;
const HIDE_SECONDS = 15;
const SEEK_SECONDS = 60;
const DESTROY_GOALS = { easy: 6, medium: 12, hard: 20 };
const DESTROY_RADIUS = DISGUISE_RADIUS;
const DESTROY_HOLD_SECONDS = 3;
const DESTROY_TAP_MAX_SECONDS = 0.35;
const FOOTPRINT_TRIGGER_AT = 30;
const FOOTPRINT_STEP = 0.5;
const FOOTPRINT_BURST_DURATION = 4;
const FOOTPRINT_LIFETIME = 4;
const FOOTPRINT_MOVE_MIN = 12;
const CAT_ALERT_DURATION = 1.6;
const DISTANCE_ALERT_EPSILON = 3;
const FOOTPRINT_ARRIVAL_RADIUS = 40;

const keys = new Set();
const justPressed = new Set();
let lastTime = performance.now();
let gameStarted = false;
let message = '按开始进入第一回合';
let messageTimer = 0;
let debugNavigation = true;
let debugWallCollision = true;
let round = 'playerCatHide';
let roundTime = HIDE_SECONDS;
let inspectLeft = 5;
let aiCheckTimer = 0;
let aiTarget = null;
let aiDifficulty = 'medium';
let outcome = null;
let playerCatDestroyed = 0;
let aiCatDestroyed = 0;
let footprints = [];
let destroyHold = { itemId: null, progress: 0, wasHolding: false };
const catDistanceTracking = {
  playerCat: { last: Infinity, alertUntil: 0 },
  aiCat: { last: Infinity, alertUntil: 0 },
};

const images = {};
const assetPaths = {
  cat: 'assets/cat.webp',
  dog: 'assets/dog.webp',
  map: 'assets/map.png',
  land: 'assets/land.webp',
  wallCorner: 'assets/wall/walls_0002_Layer-3.webp',
  wallStraight: 'assets/wall/walls_0003_Layer-4.webp',
  bed1: 'assets/bed/objects_house_0034_Layer-35.webp',
  bed2: 'assets/bed/objects_house_0035_Layer-36.webp',
  bed3: 'assets/bed/objects_house_0037_Layer-38.webp',
  sofa1: 'assets/sofa/objects_house_0000_Layer-1.webp',
  sofa2: 'assets/sofa/objects_house_0008_Layer-9.webp',
  sofa3: 'assets/sofa/objects_house_0029_Layer-30.webp',
  table1: 'assets/table/objects_house_0048_Layer-49.webp',
  table2: 'assets/table/objects_house_0050_Layer-51.webp',
  table3: 'assets/table/objects_house_0052_Layer-53.webp',
  table4: 'assets/table/objects_house_0059_Layer-60.webp',
  chair1: 'assets/chair/objects_house_0023_Layer-24.webp',
  chair2: 'assets/chair/objects_house_0029_Layer-30.webp',
  bonsai1: 'assets/bonsai/objects_house_0055_Layer-56.webp',
  bonsai2: 'assets/bonsai/objects_house_0056_Layer-57.webp',
};

Object.entries(assetPaths).forEach(([key, src]) => {
  const img = new Image();
  img.src = src;
  images[key] = img;
});

const toWorldWall = (wall) => ({
  ...wall,
  x: wall.x / SOURCE_W * MAP,
  y: wall.y / SOURCE_H * MAP,
  w: wall.w / SOURCE_W * MAP,
  h: wall.h / SOURCE_H * MAP,
});

const toWorldPoint = (point) => ({
  ...point,
  x: point.x / SOURCE_W * MAP,
  y: point.y / SOURCE_H * MAP,
});

const manualWalls = [
  { key: 'wallStraight', x: 160, y: 0, w: 5, h: 100, rotation: 0 },
  { key: 'wallStraight', x: 265, y: 0, w: 5, h: 100, rotation: 0 },
  { key: 'wallStraight', x: 270, y: 60, w: 40, h: 5, rotation: 90 },
  { key: 'wallStraight', x: 370, y: 170, w: 150, h: 5, rotation: 90 },
  { key: 'wallStraight', x: 120, y: 100, w: 80, h: 5, rotation: 90 },
  { key: 'wallStraight', x: 0, y: 200, w: 200, h: 5, rotation: 90 },
  { key: 'wallStraight', x: 125, y: 150, w: 5, h: 50, rotation: 0 },
  { key: 'wallStraight', x: 105, y: 275, w: 100, h: 5, rotation: 90 },
  { key: 'wallStraight', x: 95, y: 0, w: 5, h: 100, rotation: 0 },
  { key: 'wallStraight', x: 130, y: 150, w: 40, h: 5, rotation: 90 },
  { key: 'wallStraight', x: 0, y: 365, w: 150, h: 5, rotation: 90 },
  { key: 'wallStraight', x: 320, y: 380, w: 5, h: 100, rotation: 0 },
  { key: 'wallStraight', x: 375, y: 380, w: 5, h: 100, rotation: 0 },
  { key: 'wallStraight', x: 300, y: 305, w: 260, h: 5, rotation: 90 },
  { key: 'wallStraight', x: 300, y: 215, w: 5, h: 90, rotation: 0 },
  { key: 'wallStraight', x: 360, y: 215, w: 5, h: 90, rotation: 0 },
  { key: 'wallStraight', x: 305, y: 255, w: 30, h: 5, rotation: 90 },
  { key: 'wallStraight', x: 325, y: 0, w: 5, h: 60, rotation: 0 },
  { key: 'wallStraight', x: 115, y: 370, w: 5, h: 30, rotation: 0 },
  { key: 'wallStraight', x: 115, y: 450, w: 5, h: 30, rotation: 0 },
  { key: 'wallStraight', x: 460, y: 380, w: 100, h: 5, rotation: 90 },
  { key: 'wallStraight', x: 460, y: 420, w: 100, h: 5, rotation: 90 },
  { key: 'wallStraight', x: 375, y: 310, w: 5, h: 30, rotation: 180 },
  { key: 'wallStraight', x: 320, y: 145, w: 50, h: 5, rotation: 90 },
  { key: 'wallStraight', x: 320, y: 150, w: 5, h: 30, rotation: 0 },
  { key: 'wallStraight', x: 365, y: 150, w: 5, h: 30, rotation: 0 },
  { key: 'wallStraight', x: 410, y: 110, w: 5, h: 60, rotation: 0 },
  { key: 'wallStraight', x: 350, y: 110, w: 60, h: 5, rotation: 90 },
  { key: 'wallStraight', x: 345, y: 110, w: 5, h: 20, rotation: 180 },
  { key: 'wallStraight', x: 310, y: 85, w: 250, h: 5, rotation: 90 },
  { key: 'wallStraight', x: 200, y: 150, w: 5, h: 90, rotation: 0 },
  { key: 'wallStraight', x: 160, y: 205, w: 5, h: 70, rotation: 180 },
].map(toWorldWall);

const manualNavNodes = [
  { x: 255, y: 135 },
  { x: 160, y: 405 },
  { x: 435, y: 365 },
  { x: 535, y: 200 },
  { x: 535, y: 105 },
  { x: 285, y: 100 },
  { x: 110, y: 135 },
  { x: 345, y: 200 },
  { x: 255, y: 200 },
  { x: 255, y: 340 },
  { x: 65, y: 435 },
  { x: 75, y: 330 },
  { x: 350, y: 350 },
  { x: 300, y: 400 },
  { x: 230, y: 440 },
  { x: 195, y: 380 },
  { x: 450, y: 460 },
  { x: 495, y: 370 },
  { x: 55, y: 140 },
  { x: 75, y: 45 },
  { x: 45, y: 190 },
  { x: 105, y: 180 },
  { x: 200, y: 80 },
  { x: 315, y: 75 },
  { x: 395, y: 75 },
  { x: 315, y: 30 },
  { x: 395, y: 30 },
  { x: 520, y: 75 },
  { x: 485, y: 30 },
  { x: 110, y: 280 },
  { x: 55, y: 290 },
  { x: 185, y: 135 },
  { x: 180, y: 200 },
  { x: 115, y: 60 },
  { x: 345, y: 285 },
  { x: 400, y: 250 },
  { x: 400, y: 200 },
  { x: 505, y: 255 },
  { x: 350, y: 440 },
].map(toWorldPoint);

const manualNavMainEdges = [
  [4, 5],
  [0, 5],
  [0, 8],
  [7, 8],
  [3, 4],
  [9, 8],
  [11, 9],
  [12, 9],
  [12, 2],
  [9, 15],
  [15, 1],
  [6, 18],
  [5, 23],
  [23, 24],
  [24, 27],
  [31, 6],
  [31, 0],
  [7, 36],
  [36, 3],
];

const manualNavAuxEdges = [
  [1, 10],
  [13, 9],
  [14, 15],
  [16, 2],
  [2, 17],
  [18, 19],
  [19, 20],
  [21, 18],
  [6, 21],
  [0, 22],
  [23, 25],
  [27, 28],
  [26, 24],
  [29, 11],
  [11, 30],
  [31, 32],
  [33, 6],
  [34, 7],
  [35, 36],
  [37, 3],
  [38, 12],
];


function forEachManualNavEdge(callback) {
  manualNavMainEdges.forEach(([from, to]) => callback(from, to, 'main'));
  manualNavAuxEdges.forEach(([from, to]) => callback(from, to, 'aux'));
}


const manualBaseItems = [
  { type: 'bed', imgKey: 'bed1', x: 45, y: 40, angle: 0 },
  { type: 'bed', imgKey: 'bed3', x: 145, y: 40, angle: 0 },
  { type: 'bed', imgKey: 'bed2', x: 440, y: 25, angle: 0 },
  { type: 'bed', imgKey: 'bed1', x: 70, y: 215, angle: Math.PI },
  { type: 'table', imgKey: 'table1', x: 465, y: 145, angle: Math.PI },
  { type: 'table', imgKey: 'table2', x: 415, y: 410, angle: Math.PI },
  { type: 'table', imgKey: 'table4', x: 170, y: 235, angle: Math.PI * 1.5 },
  { type: 'table', imgKey: 'table4', x: 215, y: 365, angle: Math.PI * 1.5 },
  { type: 'table', imgKey: 'table4', x: 250, y: 365, angle: Math.PI * 1.5 },
  { type: 'table', imgKey: 'table4', x: 215, y: 400, angle: Math.PI * 1.5 },
  { type: 'table', imgKey: 'table4', x: 250, y: 400, angle: Math.PI * 1.5 },
  { type: 'table', imgKey: 'table4', x: 150, y: 450, angle: Math.PI * 1.5 },
  { type: 'table', imgKey: 'table4', x: 170, y: 470, angle: Math.PI },
  { type: 'table', imgKey: 'table4', x: 200, y: 470, angle: Math.PI },
  { type: 'table', imgKey: 'table4', x: 330, y: 440, angle: Math.PI * 1.5 },
  { type: 'table', imgKey: 'table4', x: 370, y: 440, angle: Math.PI / 2 },
  { type: 'table', imgKey: 'table4', x: 350, y: 470, angle: Math.PI },
  { type: 'chair', imgKey: 'chair1', x: 70, y: 265, angle: Math.PI },
  { type: 'table', imgKey: 'table3', x: 445, y: 255, angle: Math.PI },
  { type: 'table', imgKey: 'table3', x: 145, y: 170, angle: Math.PI * 1.5 },
  { type: 'table', imgKey: 'table2', x: 285, y: 45, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 465, y: 60, angle: Math.PI },
  { type: 'bonsai', imgKey: 'bonsai1', x: 35, y: 220, angle: Math.PI },
  { type: 'bonsai', imgKey: 'bonsai1', x: 100, y: 220, angle: Math.PI },
  { type: 'bonsai', imgKey: 'bonsai1', x: 15, y: 105, angle: Math.PI },
  { type: 'bonsai', imgKey: 'bonsai2', x: 45, y: 105, angle: Math.PI },
  { type: 'bonsai', imgKey: 'bonsai1', x: 75, y: 385, angle: Math.PI },
  { type: 'bonsai', imgKey: 'bonsai1', x: 100, y: 385, angle: Math.PI },
  { type: 'bonsai', imgKey: 'bonsai2', x: 45, y: 385, angle: Math.PI },
  { type: 'bonsai', imgKey: 'bonsai2', x: 15, y: 385, angle: Math.PI },
  { type: 'chair', imgKey: 'chair2', x: 115, y: 15, angle: Math.PI * 1.5 },
  { type: 'chair', imgKey: 'chair2', x: 20, y: 185, angle: Math.PI },
  { type: 'chair', imgKey: 'chair2', x: 315, y: 240, angle: Math.PI * 1.5 },
  { type: 'chair', imgKey: 'chair2', x: 345, y: 165, angle: 0 },
  { type: 'chair', imgKey: 'chair2', x: 445, y: 220, angle: 0 },
  { type: 'chair', imgKey: 'chair1', x: 445, y: 290, angle: Math.PI },
  { type: 'chair', imgKey: 'chair1', x: 480, y: 255, angle: Math.PI / 2 },
  { type: 'chair', imgKey: 'chair2', x: 415, y: 380, angle: 0 },
  { type: 'chair', imgKey: 'chair2', x: 190, y: 400, angle: Math.PI * 1.5 },
  { type: 'chair', imgKey: 'chair2', x: 275, y: 365, angle: Math.PI * 1.5 },
  { type: 'chair', imgKey: 'chair1', x: 180, y: 445, angle: 0 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 215, y: 225, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 285, y: 240, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 285, y: 275, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 320, y: 285, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 545, y: 405, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 480, y: 405, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 545, y: 320, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 545, y: 355, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 390, y: 320, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 415, y: 320, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 15, y: 415, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 15, y: 445, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 15, y: 470, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 50, y: 420, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 80, y: 420, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai1', x: 60, y: 455, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai2', x: 20, y: 355, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai2', x: 45, y: 355, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai2', x: 70, y: 355, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai2', x: 95, y: 355, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai2', x: 120, y: 355, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai2', x: 435, y: 155, angle: Math.PI * 1.5 },
  { type: 'bonsai', imgKey: 'bonsai2', x: 495, y: 155, angle: Math.PI * 1.5 },
  { type: 'table', imgKey: 'table1', x: 220, y: 15, angle: Math.PI / 2 },
  { type: 'table', imgKey: 'table1', x: 220, y: 55, angle: Math.PI / 2 },
  { type: 'sofa', imgKey: 'sofa1', x: 185, y: 35, angle: Math.PI * 1.5 },
  { type: 'sofa', imgKey: 'sofa1', x: 345, y: 30, angle: Math.PI * 1.5 },
  { type: 'sofa', imgKey: 'sofa2', x: 525, y: 25, angle: Math.PI / 2 },
  { type: 'sofa', imgKey: 'sofa2', x: 385, y: 285, angle: Math.PI },
  { type: 'sofa', imgKey: 'sofa3', x: 490, y: 340, angle: Math.PI / 2 },
  { type: 'sofa', imgKey: 'sofa2', x: 30, y: 315, angle: Math.PI * 1.5 },
  { type: 'sofa', imgKey: 'sofa1', x: 150, y: 290, angle: 0 },
  { type: 'bed', imgKey: 'bed2', x: 510, y: 455, angle: Math.PI / 2 },
].map(toWorldPoint);


const itemTypes = {
  bed: { label: '床', keys: ['bed1', 'bed2', 'bed3'] },
  sofa: { label: '沙发', keys: ['sofa1', 'sofa2', 'sofa3'] },
  table: { label: '桌子', keys: ['table1', 'table2', 'table3', 'table4'] },
  chair: { label: '椅子', keys: ['chair1', 'chair2'] },
  bonsai: { label: '盆栽', keys: ['bonsai1', 'bonsai2'] },
};
const spriteProfiles = {
  "bed1": {
    "width": 130,
    "hitbox": {
      "x": -66,
      "y": -95,
      "w": 132,
      "h": 190
    },
    "source": {
      "w": 630,
      "h": 919
    }
  },
  "bed2": {
    "width": 150,
    "hitbox": {
      "x": -74,
      "y": -107,
      "w": 148,
      "h": 213
    },
    "source": {
      "w": 631,
      "h": 918
    }
  },
  "bed3": {
    "width": 77,
    "hitbox": {
      "x": -37,
      "y": -108,
      "w": 76,
      "h": 216
    },
    "source": {
      "w": 324,
      "h": 920
    }
  },
  "sofa1": {
    "width": 128,
    "hitbox": {
      "x": -64,
      "y": -31,
      "w": 129,
      "h": 60
    },
    "source": {
      "w": 613,
      "h": 286
    }
  },
  "sofa2": {
    "width": 128,
    "hitbox": {
      "x": -64,
      "y": -56,
      "w": 127,
      "h": 113
    },
    "source": {
      "w": 319,
      "h": 283
    }
  },
  "sofa3": {
    "width": 128,
    "hitbox": {
      "x": -57,
      "y": -53,
      "w": 116,
      "h": 113
    },
    "source": {
      "w": 218,
      "h": 219
    }
  },
  "table1": {
    "width": 90,
    "hitbox": {
      "x": -38,
      "y": -34,
      "w": 76,
      "h": 68
    },
    "source": {
      "w": 519,
      "h": 430
    }
  },
  "table2": {
    "width": 90,
    "hitbox": {
      "x": -38,
      "y": -34,
      "w": 76,
      "h": 68
    },
    "source": {
      "w": 519,
      "h": 431
    }
  },
  "table3": {
    "width": 90,
    "hitbox": {
      "x": -41,
      "y": -43,
      "w": 83,
      "h": 85
    },
    "source": {
      "w": 316,
      "h": 314
    }
  },
  "table4": {
    "width": 90,
    "hitbox": {
      "x": -45,
      "y": -14,
      "w": 92,
      "h": 29
    },
    "source": {
      "w": 1057,
      "h": 290
    }
  },
  "chair1": {
    "width": 62,
    "hitbox": {
      "x": -24,
      "y": -26,
      "w": 48,
      "h": 52
    },
    "source": {
      "w": 212,
      "h": 218
    }
  },
  "chair2": {
    "width": 62,
    "hitbox": {
      "x": -24,
      "y": -26,
      "w": 48,
      "h": 52
    },
    "source": {
      "w": 218,
      "h": 219
    }
  },
  "bonsai1": {
    "width": 62,
    "hitbox": {
      "x": -22,
      "y": -25,
      "w": 43,
      "h": 48
    },
    "source": {
      "w": 423,
      "h": 408
    }
  },
  "bonsai2": {
    "width": 62,
    "hitbox": {
      "x": -20,
      "y": -21,
      "w": 37,
      "h": 41
    },
    "source": {
      "w": 440,
      "h": 472
    }
  },
  "cat": {
    "width": 46,
    "hitbox": {
      "x": -13,
      "y": -7,
      "w": 26,
      "h": 20
    },
    "source": {
      "w": 288,
      "h": 48
    }
  },
  "dog": {
    "width": 46,
    "hitbox": {
      "x": -13,
      "y": -7,
      "w": 26,
      "h": 20
    },
    "source": {
      "w": 288,
      "h": 48
    }
  }
};

const WALL_THICKNESS = 34;
const WALL_STRAIGHT_NATIVE_W = 99;
const WALL_STRAIGHT_NATIVE_H = 340;
const WALL_CORNER_NATIVE_SIZE = 341;
const WALL_TILE_OVERLAP = 3;
const NAV_CLEARANCE = PLAYER_COLLISION_RADIUS + 2;
const STUCK_NET_THRESHOLD = 8;
const STUCK_TIMEOUT_SECONDS = 1.2;
const STUCK_SIDESTEP_DISTANCE = 50;
const STUCK_SIDESTEP_STEP = 8;

let items = [];

const spawnKeys = ['playerCat', 'playerDog', 'aiDog', 'aiCat'];
const spawnPoints = Object.fromEntries(spawnKeys.map((key, index) => {
  const point = manualNavNodes[index % manualNavNodes.length] || { x: MAP / 2, y: MAP / 2 };
  return [key, { x: point.x, y: point.y }];
}));

const playerCat = makeEntity('cat', spawnPoints.playerCat.x, spawnPoints.playerCat.y);
const aiDog = makeEntity('dog', spawnPoints.aiDog.x, spawnPoints.aiDog.y);
const playerDog = makeEntity('dog', spawnPoints.playerDog.x, spawnPoints.playerDog.y);
const aiCat = makeEntity('cat', spawnPoints.aiCat.x, spawnPoints.aiCat.y);

let spawnSafeZones = makeSpawnSafeZones();

let wallCollisionRectsCache = null;
let navNodesCache = null;
let navGraphCache = null;

const aiDogBrain = {
  mode: 'patrol',
  patrolTarget: null,
  inspectTarget: null,
  clueTarget: null,
  clueTimer: 0,
  navPath: [],
  navTargetKey: '',
  stuckTimer: 0,
  stuckAnchorX: aiDog.x,
  stuckAnchorY: aiDog.y,
  lastCatX: playerCat.x,
  lastCatY: playerCat.y,
  footprintTarget: null,
};

const aiCatBrain = {
  hideTarget: null,
  sabotageTarget: null,
  destroyCooldown: 0,
  destroyHold: 0,
  destroyItemId: null,
  navPath: [],
  navTargetKey: '',
  stuckTimer: 0,
  stuckAnchorX: aiCat.x,
  stuckAnchorY: aiCat.y,
  dogSenseTimer: 0,
  pauseTimer: 0,
  freezeAfterDisguise: false,
  needsInitialDisguise: false,
};

function makeEntity(kind, x, y) {
  return {
    kind,
    x,
    y,
    r: PLAYER_COLLISION_RADIUS,
    dir: 1,
    frame: 0,
    disguised: false,
    disguiseItem: null,
    angle: 0,
    disguiseChance: true,
    canRestore: false,
    footprintSpawned: false,
    footprintBurstLeft: 0,
    footprintStepTimer: 0,
    footprintLastSpawnX: x,
    footprintLastSpawnY: y,
  };
}

function resetCatFootprintState(cat) {
  cat.footprintSpawned = false;
  cat.footprintBurstLeft = 0;
  cat.footprintStepTimer = 0;
  cat.footprintLastSpawnX = cat.x;
  cat.footprintLastSpawnY = cat.y;
}

function catMovedEnoughForFootprint(cat) {
  return distance(cat, { x: cat.footprintLastSpawnX, y: cat.footprintLastSpawnY }) >= FOOTPRINT_MOVE_MIN;
}

function getRoundElapsed() {
  if (round === 'playerCatHide' || round === 'playerDogWait') return HIDE_SECONDS - roundTime;
  if (round === 'playerCatSeek' || round === 'playerDogSeek') return SEEK_SECONDS - roundTime;
  return 0;
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resize);
resize();

window.addEventListener('keydown', (event) => {
  const key = normalizeKey(event.key);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(event.key)) {
    event.preventDefault();
  }
  if (!keys.has(key)) {
    justPressed.add(key);
    if (key === 'n') {
      debugNavigation = !debugNavigation;
      showMessage(debugNavigation ? '导航调试：开' : '导航调试：关', 1.2);
    }
    if (key === 'b') {
      debugWallCollision = !debugWallCollision;
      showMessage(debugWallCollision ? '墙壁碰撞：开' : '墙壁碰撞：关', 1.2);
    }
  }
  keys.add(key);
});

window.addEventListener('keyup', (event) => {
  keys.delete(normalizeKey(event.key));
});

startBtn.addEventListener('click', () => {
  overlay.classList.add('hidden');
  resetGame();
});

difficultyButtons.forEach((button) => {
  button.addEventListener('click', () => {
    aiDifficulty = button.dataset.difficulty;
    difficultyButtons.forEach((item) => item.classList.toggle('selected', item === button));
  });
});

function normalizeKey(key) {
  if (key === 'ArrowUp') return 'w';
  if (key === 'ArrowDown') return 's';
  if (key === 'ArrowLeft') return 'a';
  if (key === 'ArrowRight') return 'd';
  return key.toLowerCase();
}

function resetGame() {
  gameStarted = true;
  outcome = null;
  invalidateNavigationCache();
  pickManualSpawnPoints();
  items = generateItems();
  Object.assign(playerCat, makeEntity('cat', spawnPoints.playerCat.x, spawnPoints.playerCat.y));
  Object.assign(aiDog, makeEntity('dog', spawnPoints.aiDog.x, spawnPoints.aiDog.y));
  Object.assign(playerDog, makeEntity('dog', spawnPoints.playerDog.x, spawnPoints.playerDog.y));
  Object.assign(aiCat, makeEntity('cat', spawnPoints.aiCat.x, spawnPoints.aiCat.y));
  [playerCat, aiDog, playerDog, aiCat].forEach((entity) => ensureEntityClear(entity));
  inspectLeft = 5;
  playerCatDestroyed = 0;
  aiCatDestroyed = 0;
  footprints = [];
  destroyHold = { itemId: null, progress: 0, wasHolding: false };
  resetCatDistanceTracking();
  warmNavigationCache();
  resetAiDogBrain();
  resetAiCatBrain();
  startPlayerCatRound();
}

function isSpawnPointClear(x, y, navigationItems = items) {
  const pad = PLAYER_COLLISION_RADIUS + 2;
  const probe = { x: x - pad, y: y - pad, w: pad * 2, h: pad * 2 };
  if (x <= pad || x >= MAP - pad || y <= pad || y >= MAP - pad) return false;
  if (getWallCollisionRects().some((rect) => rectOverlap(probe, rect))) return false;
  return !navigationItems.some((item) => rectOverlap(probe, itemHitRect(item)));
}

function resolveSpawnPoint(point, navigationItems = items) {
  if (isSpawnPointClear(point.x, point.y, navigationItems)) {
    return { x: point.x, y: point.y };
  }
  for (let radius = 24; radius <= 140; radius += 24) {
    for (let step = 0; step < 8; step += 1) {
      const angle = (Math.PI * 2 * step) / 8;
      const x = clamp(point.x + Math.cos(angle) * radius, PLAYER_COLLISION_RADIUS, MAP - PLAYER_COLLISION_RADIUS);
      const y = clamp(point.y + Math.sin(angle) * radius, PLAYER_COLLISION_RADIUS, MAP - PLAYER_COLLISION_RADIUS);
      if (isSpawnPointClear(x, y, navigationItems)) return { x, y };
    }
  }
  return getRandomPatrolPoint();
}

function ensureEntityClear(entity, preferred = entity) {
  if (!collides(entity, entity)) return;
  const point = resolveSpawnPoint(preferred, items);
  entity.x = point.x;
  entity.y = point.y;
}

function getSpawnNavNodePool() {
  const spawnReady = manualNavNodes.filter((node) => isSpawnPointClear(node.x, node.y, []));
  if (spawnReady.length >= spawnKeys.length) return spawnReady;
  const navReady = manualNavNodes.filter((node) => isNavigationPointClear(node.x, node.y, []));
  return navReady.length ? navReady : manualNavNodes;
}

function pickManualSpawnPoints() {
  invalidateNavigationCache();
  const shuffled = shuffle(getSpawnNavNodePool());
  const used = [];
  const minSpawnDist = 180;

  spawnKeys.forEach((key) => {
    let point = null;
    for (const candidate of shuffled) {
      const resolved = resolveSpawnPoint(candidate, []);
      if (used.some((other) => distance(other, resolved) < minSpawnDist)) continue;
      point = resolved;
      used.push(resolved);
      break;
    }
    if (!point) {
      for (const candidate of shuffled) {
        point = resolveSpawnPoint(candidate, []);
        break;
      }
    }
    if (!point) point = getRandomPatrolPoint();
    spawnPoints[key].x = point.x;
    spawnPoints[key].y = point.y;
  });
  spawnSafeZones = makeSpawnSafeZones();
}

function makeSpawnSafeZones() {
  return spawnKeys.map((key) => ({
    x: spawnPoints[key].x - 150,
    y: spawnPoints[key].y - 150,
    w: 300,
    h: 300,
  }));
}

function shuffle(values) {
  const result = values.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateItems() {
  const pickedIndices = manualBaseItems.map((_, index) => index);
  const spawnCount = Math.max(1, Math.round(manualBaseItems.length * random(ITEM_SPAWN_MIN_RATIO, ITEM_SPAWN_MAX_RATIO)));
  const selected = pickedIndices.slice(0, Math.min(spawnCount, manualBaseItems.length));
  const created = [];
  selected.forEach((baseIndex) => {
    const item = createPlannedBaseItem(manualBaseItems[baseIndex], baseIndex, created);
    if (item) created.push(item);
  });
  return created;
}

function createPlannedBaseItem(base, baseIndex, existing) {
  const type = itemTypes[base.type];
  if (!type) return null;

  const imgKey = type.keys.includes(base.imgKey) ? base.imgKey : choice(type.keys);
  const size = getSpriteSize(imgKey);
  const item = {
    id: `base-${baseIndex}`,
    type: base.type,
    label: type.label,
    imgKey,
    x: base.x,
    y: base.y,
    w: size.w,
    h: size.h,
    scale: 1,
    angle: Number.isFinite(base.angle) ? base.angle : 0,
    region: 'planned',
    baseIndex,
  };
  const wallRects = getWallCollisionRects();
  if (spawnSafeZones.some((rect) => rectOverlap(itemRect(item, 18), rect))) return null;
  if (existing.some((other) => rectOverlap(itemRect(item, 18), itemRect(other, 18)))) return null;
  if (wallRects.some((rect) => rectOverlap(itemRect(item), rect))) return null;
  return item;
}

function navCorridorProbe(x, y, radius = NAV_CLEARANCE) {
  return {
    x: x - radius,
    y: y - radius,
    w: radius * 2,
    h: radius * 2,
  };
}

function update(dt) {
  if (!gameStarted || outcome) return;

  roundTime -= dt;
  messageTimer = Math.max(0, messageTimer - dt);
  const human = getHuman();

  updateFootprints(dt);

  if (round === 'playerCatHide') {
    updateHuman(human, dt);
    updateCatFootprints(playerCat, dt);
    updateAiDog(dt, playerCat);
    if (roundTime <= 0) startPlayerCatSeek();
  } else if (round === 'playerCatSeek') {
    updateHuman(human, dt);
    updateCatFootprints(playerCat, dt);
    updateCatDistanceAlert(aiDog, playerCat, dt);
    updateAiDog(dt, playerCat);
    if (catCaughtByDog(playerCat, aiDog, true)) endGame(false, '电脑狗找到了你，狗方获胜。');
    if (roundTime <= 0) startPlayerDogRound();
  } else if (round === 'playerDogWait') {
    updateAiCatHide(dt);
    if (roundTime <= 0) startPlayerDogSeek();
  } else if (round === 'playerDogSeek') {
    updateHuman(human, dt);
    updateCatFootprints(aiCat, dt);
    updateCatDistanceAlert(playerDog, aiCat, dt);
    updateAiCatSeek(dt);
    if (catCaughtByDog(aiCat, playerDog, false)) endGame(true, '你撞到了没有伪装的电脑猫，玩家获胜。');
    if (roundTime <= 0) startPlayerCatRound();
  }

  justPressed.clear();
}

function updateHuman(entity, dt) {
  const speed = getSpeed(entity);
  moveEntity(entity, inputVector(), speed * dt);
  handleInteract(entity);
  if (entity.kind === 'cat') handleDestroy(entity, true, dt);
  if (entity.disguised) {
    if (justPressed.has('q')) entity.angle -= Math.PI / 2;
    if (justPressed.has('e')) entity.angle += Math.PI / 2;
  }
}

function inputVector() {
  let x = 0;
  let y = 0;
  if (keys.has('a')) x -= 1;
  if (keys.has('d')) x += 1;
  if (keys.has('w')) y -= 1;
  if (keys.has('s')) y += 1;
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function handleInteract(entity) {
  if (!justPressed.has('enter')) return;

  if (round === 'playerDogSeek') {
    inspectLeft -= 1;
    const target = nearestItem(playerDog, INSPECT_RADIUS);
    if (target && aiCat.disguised && aiCat.disguiseItem && target.id === aiCat.disguiseItem.id) {
      endGame(true, '查验成功！电脑猫被你找出来了。');
    } else if (inspectLeft <= 0) {
      if (aiCat.disguised) {
        showMessage('查验次数用光，电脑猫仍在伪装，交换身份进入下一局。', 2.4);
        startPlayerCatRound();
      } else {
        showMessage('查验失败，次数已用完。继续靠碰撞寻找没有伪装的猫。', 3.2);
      }
    } else {
      showMessage(`查验失败，剩余 ${inspectLeft} 次。`, 1.8);
    }
    return;
  }

  const playerCanDisguise = round === 'playerCatHide' || round === 'playerCatSeek';
  if (!playerCanDisguise) return;

  if (entity.disguised && entity.canRestore) {
    entity.disguised = false;
    entity.disguiseItem = null;
    entity.canRestore = false;
    entity.disguiseChance = true;
    showMessage('已恢复猫形态，本回合可以重新伪装一次。', 2);
    return;
  }

  const target = nearestItem(entity, DISGUISE_RADIUS);
  const nearDestroyable = target && isDestroyableItem(target);
  if (target && !entity.disguised && entity.disguiseChance && !nearDestroyable) {
    applyDisguise(entity, target);
  }
}

function updateAiDog(dt, cat) {
  if (round === 'playerCatHide') return;

  aiCheckTimer = Math.max(0, aiCheckTimer - dt);
  const dog = aiDog;
  const catMoved = distance({ x: aiDogBrain.lastCatX, y: aiDogBrain.lastCatY }, cat) > 4;
  const seesCat = dogCanCurrentlySeeCat(dog, cat);

  if (seesCat && cat.disguised) {
    const track = catDistanceTracking[getCatTrackingKey(cat)];
    track.alertUntil = performance.now() / 1000 + CAT_ALERT_DURATION;
  }

  if (seesCat && (!cat.disguised || catMoved)) {
    setAiMode('chase', cat);
  } else if (aiDifficulty === 'easy' && seesCat && cat.disguised) {
    prepareAiRandomInspection(dog, cat);
  } else if (aiDogBrain.mode === 'chase' || aiDogBrain.mode === 'inspect') {
    aiDogBrain.mode = 'patrol';
    aiDogBrain.inspectTarget = null;
  }

  updateAiDogClueIntent(dt, cat);
  updateAiDogFootprintIntent(dog);

  if (aiDogBrain.mode === 'chase') {
    aiTarget = cat;
    moveAiDogToward(cat, dt);
    if (cat.disguised && distance(dog, cat) < INSPECT_RADIUS && aiCheckTimer <= 0) {
      aiCheckTimer = 0.9;
      endGame(false, '电脑狗追上并查验了移动中的伪装物，狗方获胜。');
    }
  } else if (aiDogBrain.mode === 'inspect' && aiDogBrain.inspectTarget) {
    aiTarget = aiDogBrain.inspectTarget;
    moveAiDogToward(aiDogBrain.inspectTarget, dt);
    if (canInspectItem(dog, aiDogBrain.inspectTarget) && aiCheckTimer <= 0) {
      resolveAiRandomInspection(cat);
    }
  } else if (aiDogBrain.mode === 'clue' && aiDogBrain.clueTarget) {
    aiTarget = aiDogBrain.clueTarget;
    moveAiDogToward(aiDogBrain.clueTarget, dt);
    if (distance(dog, aiDogBrain.clueTarget) <= 200) {
      aiDogBrain.mode = 'patrol';
      aiDogBrain.clueTarget = null;
      aiDogBrain.patrolTarget = null;
    }
  } else if (aiDogBrain.mode === 'footprint' && aiDogBrain.footprintTarget) {
    aiTarget = aiDogBrain.footprintTarget;
    moveAiDogToward(aiDogBrain.footprintTarget, dt);
  } else {
    const patrolTarget = getAiPatrolTarget();
    aiTarget = patrolTarget;
    moveAiDogToward(patrolTarget, dt);
  }

  aiDogBrain.lastCatX = cat.x;
  aiDogBrain.lastCatY = cat.y;
}

function resetAiDogBrain() {
  aiTarget = null;
  aiCheckTimer = 0;
  Object.assign(aiDogBrain, {
    mode: 'patrol',
    patrolTarget: null,
    inspectTarget: null,
    clueTarget: null,
    clueTimer: 0,
    navPath: [],
    navTargetKey: '',
    stuckTimer: 0,
    stuckAnchorX: aiDog.x,
    stuckAnchorY: aiDog.y,
    lastCatX: playerCat.x,
    lastCatY: playerCat.y,
    footprintTarget: null,
  });
}

function setAiMode(mode, target = null) {
  aiDogBrain.mode = mode;
  if (mode === 'chase' || mode === 'footprint' || mode === 'clue') aiDogBrain.inspectTarget = null;
  if (target) aiTarget = target;
}

function getActiveFootprints() {
  const now = performance.now() / 1000;
  return footprints.filter((mark) => mark.until > now);
}

function getNearestActiveFootprint(from, marks = getActiveFootprints()) {
  if (!marks.length) return null;
  return marks.reduce((best, mark) => (distance(from, mark) < distance(from, best) ? mark : best), marks[0]);
}

function isSameFootprintMark(a, b) {
  if (!a || !b) return false;
  return Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
}

function isFootprintMarkActive(mark, marks = getActiveFootprints()) {
  return marks.some((entry) => isSameFootprintMark(entry, mark));
}

function updateAiDogFootprintIntent(dog) {
  if (aiDifficulty === 'easy' || round !== 'playerCatSeek') return;
  if (aiDogBrain.mode === 'chase' || aiDogBrain.mode === 'inspect') return;

  const active = getActiveFootprints();

  if (!active.length) {
    aiDogBrain.footprintTarget = null;
    if (aiDogBrain.mode === 'footprint') {
      aiDogBrain.mode = 'patrol';
      aiDogBrain.patrolTarget = null;
    }
    return;
  }

  aiDogBrain.footprintTarget = getNearestActiveFootprint(dog, active);
  if (!aiDogBrain.footprintTarget) return;

  if (aiDifficulty === 'hard' && distance(dog, aiDogBrain.footprintTarget) <= 100) {
    aiDogBrain.mode = 'patrol';
    aiDogBrain.patrolTarget = null;
    return;
  }

  aiDogBrain.mode = 'footprint';
}

function updateAiDogClueIntent(dt, cat) {
  if (aiDifficulty === 'easy' || round !== 'playerCatSeek') return;
  const interval = aiDifficulty === 'hard' ? 15 : 20;
  aiDogBrain.clueTimer = Math.max(0, aiDogBrain.clueTimer - dt);

  if (aiDogBrain.clueTimer <= 0) {
    aiDogBrain.clueTimer = interval;
    aiDogBrain.clueTarget = { x: cat.x, y: cat.y };
    if (aiDogBrain.mode === 'patrol' || aiDogBrain.mode === 'clue') {
      aiDogBrain.mode = 'clue';
      aiDogBrain.patrolTarget = null;
    }
  }
}

function moveAiDogToward(target, dt) {
  if (!target) return;
  const moveTarget = isNavigableItem(target) ? getItemApproachPoint(aiDog, target) : target;
  const waypoint = getNavigationWaypoint(aiDog, moveTarget, aiDogBrain, aiDogBrain.mode);
  const desired = { x: waypoint.x - aiDog.x, y: waypoint.y - aiDog.y };
  const len = Math.hypot(desired.x, desired.y) || 1;
  const moveDir = { x: desired.x / len, y: desired.y / len };
  moveEntity(aiDog, moveDir, getSpeed(aiDog) * dt);

  if (aiDogBrain.navPath.length && distance(aiDog, aiDogBrain.navPath[0]) < 34) {
    aiDogBrain.navPath.shift();
  }
  updateAiStuckRecovery(aiDog, aiDogBrain, dt, moveDir);
}

function isNavigableItem(target) {
  return Boolean(target && target.imgKey && Number.isFinite(target.x) && Number.isFinite(target.y));
}

function getItemApproachPoint(entity, item) {
  const rect = itemHitRect(item, 6);
  const nearestX = clamp(entity.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(entity.y, rect.y, rect.y + rect.h);
  const dx = entity.x - nearestX;
  const dy = entity.y - nearestY;
  const len = Math.hypot(dx, dy) || 1;
  const standOff = Math.max(24, INSPECT_RADIUS - entity.r - 10);
  return {
    x: clamp(nearestX + (dx / len) * standOff, entity.r, MAP - entity.r),
    y: clamp(nearestY + (dy / len) * standOff, entity.r, MAP - entity.r),
  };
}

function canInspectItem(entity, item) {
  if (!item) return false;
  if (distance(entity, item) < INSPECT_RADIUS) return true;
  return distancePointToRect(entity, itemHitRect(item)) < INSPECT_RADIUS;
}

function distancePointToRect(point, rect) {
  const nearestX = clamp(point.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(point.y, rect.y, rect.y + rect.h);
  return Math.hypot(point.x - nearestX, point.y - nearestY);
}

function getNavigationWaypoint(entity, target, brain, modeKey) {
  if (canTravelDirect(entity, target)) {
    brain.navPath = [];
    brain.navTargetKey = '';
    return target;
  }

  const targetKey = `${Math.round(target.x / 20)}:${Math.round(target.y / 20)}:${modeKey}`;
  if (brain.navTargetKey !== targetKey || !brain.navPath.length) {
    brain.navPath = findNavigationPath(entity, target);
    brain.navTargetKey = targetKey;
  }

  return brain.navPath[0] || getNearestReachableNavNode(entity, target) || target;
}

function prepareAiRandomInspection(dog, cat) {
  if (aiDogBrain.mode === 'inspect' && aiDogBrain.inspectTarget) return;
  const visibleTargets = getInspectionTargetsAround(dog, DOG_VISION_RANGE, cat);
  if (!visibleTargets.length) return;
  aiDogBrain.inspectTarget = choice(visibleTargets);
  aiDogBrain.mode = 'inspect';
}

function resolveAiRandomInspection(cat) {
  aiCheckTimer = 1.2;
  const checked = aiDogBrain.inspectTarget;
  if (isCatDisguiseInspectionTarget(checked, cat)) {
    endGame(false, '电脑狗查验了你的伪装，狗方获胜。');
    return;
  }
  aiDogBrain.inspectTarget = null;
  aiDogBrain.mode = 'patrol';
}

function getAiPatrolTarget() {
  const target = aiDogBrain.patrolTarget;
  if (target && distance(aiDog, target) > 70) return target;

  aiDogBrain.patrolTarget = getRandomPatrolPoint();
  return aiDogBrain.patrolTarget;
}

function getItemsAround(point, radius) {
  return items.filter((item) => distance(point, item) <= radius);
}

function getInspectionTargetsAround(point, radius, cat) {
  const targets = getItemsAround(point, radius);
  const disguiseTarget = getCatDisguiseInspectionTarget(cat);
  if (disguiseTarget && distance(point, disguiseTarget) <= radius) {
    targets.unshift(disguiseTarget);
  }
  return uniqueInspectionTargets(targets);
}

function getCatDisguiseInspectionTarget(cat) {
  if (!cat || !cat.disguised || !cat.disguiseItem) return null;
  return {
    ...cat.disguiseItem,
    x: cat.x,
    y: cat.y,
    angle: cat.angle,
    isDisguiseCandidate: true,
  };
}

function uniqueInspectionTargets(targets) {
  const seen = new Set();
  return targets.filter((target) => {
    const key = getInspectionMemoryKey(target);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getInspectionMemoryKey(target) {
  if (!target) return '';
  if (target.isDisguiseCandidate) return `disguise:${target.id}`;
  return `item:${target.id}`;
}

function isCatDisguiseInspectionTarget(target, cat) {
  if (!target || !cat.disguised || !cat.disguiseItem) return false;
  if (target.id !== cat.disguiseItem.id) return false;
  return target.isDisguiseCandidate || distance(target, cat) < INSPECT_RADIUS;
}


function getRandomPatrolPoint() {
  for (let i = 0; i < 40; i += 1) {
    const x = random(100, MAP - 100);
    const y = random(100, MAP - 100);
    if (isNavigationPointClear(x, y)) return { x, y };
  }
  return { x: MAP / 2, y: MAP / 2 };
}

function resetAiCatBrain() {
  Object.assign(aiCatBrain, {
    hideTarget: null,
    sabotageTarget: null,
    destroyCooldown: 0,
    destroyHold: 0,
    destroyItemId: null,
    navPath: [],
    navTargetKey: '',
    stuckTimer: 0,
    stuckAnchorX: aiCat.x,
    stuckAnchorY: aiCat.y,
    dogSenseTimer: 0,
    pauseTimer: 0,
    freezeAfterDisguise: false,
    needsInitialDisguise: aiDifficulty === 'easy',
  });
}

function getDestroyGoal() {
  return DESTROY_GOALS[aiDifficulty] || DESTROY_GOALS.medium;
}

function resetCatDistanceTracking() {
  catDistanceTracking.playerCat.last = Infinity;
  catDistanceTracking.playerCat.alertUntil = 0;
  catDistanceTracking.aiCat.last = Infinity;
  catDistanceTracking.aiCat.alertUntil = 0;
}

function getCatTrackingKey(cat) {
  return cat === playerCat ? 'playerCat' : 'aiCat';
}

function updateCatDistanceAlert(dog, cat, dt) {
  const key = getCatTrackingKey(cat);
  const track = catDistanceTracking[key];
  const dist = distance(dog, cat);
  if (dist < track.last - DISTANCE_ALERT_EPSILON) {
    track.alertUntil = performance.now() / 1000 + CAT_ALERT_DURATION;
  }
  track.last = dist;
}

function isCatAlertActive(cat) {
  const track = catDistanceTracking[getCatTrackingKey(cat)];
  return performance.now() / 1000 < track.alertUntil;
}

function spawnFootprint(cat) {
  footprints.push({
    x: cat.x,
    y: cat.y,
    until: performance.now() / 1000 + FOOTPRINT_LIFETIME,
  });
}

function updateCatFootprints(cat, dt) {
  if (!cat.footprintSpawned) {
    if (getRoundElapsed() < FOOTPRINT_TRIGGER_AT) return;
    cat.footprintSpawned = true;
    cat.footprintBurstLeft = FOOTPRINT_BURST_DURATION;
    cat.footprintStepTimer = 0;
    cat.footprintLastSpawnX = cat.x;
    cat.footprintLastSpawnY = cat.y;
  }

  if (cat.footprintBurstLeft <= 0) return;

  cat.footprintBurstLeft -= dt;
  cat.footprintStepTimer -= dt;
  while (cat.footprintBurstLeft > 0 && cat.footprintStepTimer <= 0) {
    if (catMovedEnoughForFootprint(cat)) {
      spawnFootprint(cat);
      cat.footprintLastSpawnX = cat.x;
      cat.footprintLastSpawnY = cat.y;
    }
    cat.footprintStepTimer += FOOTPRINT_STEP;
  }
}

function updateFootprints(dt) {
  const now = performance.now() / 1000;
  footprints = footprints.filter((mark) => mark.until > now);
}

function applyDisguise(entity, target) {
  entity.disguised = true;
  entity.disguiseItem = target;
  entity.angle = target.angle;
  entity.disguiseChance = false;
  entity.canRestore = false;
  showMessage(`你伪装成了${target.label}。`, 2);
}

function tryDisguiseOnTap(entity) {
  if (entity.disguised || !entity.disguiseChance) return;
  const target = nearestItem(entity, DISGUISE_RADIUS);
  if (!target) return;
  applyDisguise(entity, target);
}

function completeDestroy(target, isPlayerCat) {
  destroyMapItem(target);
  if (!isPlayerCat) {
    aiCatDestroyed += 1;
    const goal = getDestroyGoal();
    if (aiCatDestroyed >= goal) {
      endGame(false, `电脑猫破坏了 ${goal} 件物品，猫方获胜。`);
    }
    return;
  }
  playerCatDestroyed += 1;
  const goal = getDestroyGoal();
  if (playerCatDestroyed >= goal) {
    endGame(true, `你破坏了 ${goal} 件物品，猫方获胜！`);
    return;
  }
  showMessage(`破坏了${target.label}（${playerCatDestroyed}/${goal}）`, 1.6);
}

function handleDestroy(entity, isPlayerCat, dt) {
  if (!isPlayerCat || (round !== 'playerCatHide' && round !== 'playerCatSeek')) {
    destroyHold = { itemId: null, progress: 0, wasHolding: false };
    return;
  }

  const target = nearestItem(entity, DESTROY_RADIUS);
  const canDestroy = target && isDestroyableItem(target);

  if (!keys.has('enter')) {
    if (destroyHold.wasHolding && destroyHold.progress > 0 && destroyHold.progress < DESTROY_TAP_MAX_SECONDS) {
      tryDisguiseOnTap(entity);
    }
    destroyHold = { itemId: null, progress: 0, wasHolding: false };
    return;
  }

  if (!canDestroy) {
    destroyHold = { itemId: null, progress: 0, wasHolding: false };
    return;
  }

  destroyHold.wasHolding = true;
  if (destroyHold.itemId !== target.id) {
    destroyHold.itemId = target.id;
    destroyHold.progress = 0;
  }

  destroyHold.progress += dt;
  if (destroyHold.progress >= DESTROY_HOLD_SECONDS) {
    completeDestroy(target, true);
    destroyHold = { itemId: null, progress: 0, wasHolding: false };
  }
}

function getDestroyHoldVisual() {
  if (destroyHold.itemId && destroyHold.progress > 0) {
    const item = items.find((entry) => entry.id === destroyHold.itemId);
    if (item) {
      return { item, progress: Math.min(1, destroyHold.progress / DESTROY_HOLD_SECONDS) };
    }
  }
  if (aiCatBrain.destroyItemId && aiCatBrain.destroyHold > 0) {
    const item = items.find((entry) => entry.id === aiCatBrain.destroyItemId);
    if (item) {
      return { item, progress: Math.min(1, aiCatBrain.destroyHold / DESTROY_HOLD_SECONDS) };
    }
  }
  return null;
}

function isDestroyableItem(item) {
  return Boolean(item && itemTypes[item.type]);
}

function destroyMapItem(item) {
  [playerCat, aiCat].forEach((cat) => {
    if (cat.disguised && cat.disguiseItem && cat.disguiseItem.id === item.id) {
      cat.disguised = false;
      cat.disguiseItem = null;
      cat.disguiseChance = true;
    }
  });
  items = items.filter((other) => other.id !== item.id);
  invalidateNavigationCache();
}

function pickAiSabotageTarget() {
  return pickNearestItemBy(aiCat, isDestroyableItem);
}

function pickNearestItemBy(origin, predicate = () => true) {
  const candidates = items.filter(predicate);
  if (!candidates.length) return null;
  return candidates.sort((a, b) => distance(origin, a) - distance(origin, b))[0] || null;
}

function pickAiDisguiseTargetAwayFromDog() {
  if (!items.length) return null;
  const currentDogDist = distance(aiCat, playerDog);
  const safer = items
    .filter((item) => distance(item, playerDog) > currentDogDist + 24)
    .sort((a, b) => distance(aiCat, a) - distance(aiCat, b));
  if (safer.length) return safer[0];

  return items
    .slice()
    .sort((a, b) => distance(playerDog, b) - distance(playerDog, a))[0] || null;
}

function setAiCatDisguise(target) {
  if (!target) return;
  aiCat.disguised = true;
  aiCat.disguiseItem = target;
  aiCat.angle = target.angle;
  aiCat.disguiseChance = false;
  aiCat.canRestore = false;
  aiCatBrain.hideTarget = null;
  aiCatBrain.navPath = [];
  aiCatBrain.navTargetKey = '';
}

function getAiCatThreatConfig() {
  if (aiDifficulty === 'hard') return { interval: 5, dangerDistance: 200 };
  if (aiDifficulty === 'medium') return { interval: 10, dangerDistance: 200 };
  return null;
}

function updateAiCatSeek(dt) {
  aiCatBrain.destroyCooldown = Math.max(0, aiCatBrain.destroyCooldown - dt);
  aiCatBrain.pauseTimer = Math.max(0, aiCatBrain.pauseTimer - dt);

  if (aiDifficulty === 'easy' && isCatAlertActive(aiCat)) {
    aiCatBrain.pauseTimer = Math.max(aiCatBrain.pauseTimer, 1);
  }

  const threatConfig = getAiCatThreatConfig();
  if (threatConfig) {
    aiCatBrain.dogSenseTimer -= dt;
    if (aiCatBrain.dogSenseTimer <= 0) {
      aiCatBrain.dogSenseTimer = threatConfig.interval;
      if (distance(aiCat, playerDog) < threatConfig.dangerDistance) {
        const disguiseTarget = pickAiDisguiseTargetAwayFromDog();
        if (disguiseTarget) {
          aiCatBrain.hideTarget = disguiseTarget;
          aiCatBrain.freezeAfterDisguise = true;
          aiCat.disguised = false;
          aiCat.disguiseItem = null;
          aiCat.disguiseChance = true;
          aiCatBrain.sabotageTarget = null;
          aiCatBrain.navPath = [];
          aiCatBrain.navTargetKey = '';
        }
      }
    }
  }

  if (aiCatBrain.needsInitialDisguise && !aiCat.disguised) {
    if (!aiCatBrain.hideTarget) aiCatBrain.hideTarget = pickNearestItemBy(aiCat);
    updateAiCatHide(dt);
    if (aiCat.disguised) aiCatBrain.needsInitialDisguise = false;
    return;
  }

  if (aiCatBrain.hideTarget && !aiCat.disguised) {
    updateAiCatHide(dt);
    if (aiCatBrain.freezeAfterDisguise && aiCat.disguised) return;
  }

  if (aiCatBrain.freezeAfterDisguise && aiCat.disguised) return;
  if (aiCatBrain.pauseTimer > 0) return;

  const nearTarget = nearestItem(aiCat, DESTROY_RADIUS);
  if (nearTarget && isDestroyableItem(nearTarget) && aiCatBrain.destroyCooldown <= 0) {
    if (aiCatBrain.destroyItemId !== nearTarget.id) {
      aiCatBrain.destroyItemId = nearTarget.id;
      aiCatBrain.destroyHold = 0;
    }
    aiCatBrain.destroyHold += dt;
    if (aiCatBrain.destroyHold >= DESTROY_HOLD_SECONDS) {
      completeDestroy(nearTarget, false);
      aiCatBrain.destroyHold = 0;
      aiCatBrain.destroyItemId = null;
      aiCatBrain.destroyCooldown = 1.1;
    }
    return;
  }

  aiCatBrain.destroyHold = 0;
  aiCatBrain.destroyItemId = null;

  if (aiCatBrain.destroyCooldown > 0.35) return;

  aiCatBrain.sabotageTarget = pickAiSabotageTarget();
  const target = aiCatBrain.sabotageTarget;
  if (!target) return;

  if (distance(aiCat, target) <= DESTROY_RADIUS + 8) return;

  const waypoint = getNavigationWaypoint(aiCat, target, aiCatBrain, 'sabotage');
  const desired = { x: waypoint.x - aiCat.x, y: waypoint.y - aiCat.y };
  const len = Math.hypot(desired.x, desired.y) || 1;
  const moveDir = { x: desired.x / len, y: desired.y / len };
  moveEntity(aiCat, moveDir, getSpeed(aiCat) * dt * 0.55);

  if (aiCatBrain.navPath.length && distance(aiCat, aiCatBrain.navPath[0]) < 30) {
    aiCatBrain.navPath.shift();
  }
  updateAiStuckRecovery(aiCat, aiCatBrain, dt, moveDir);
}

function updateAiCatHide(dt) {
  if (!aiCatBrain.hideTarget || aiCat.disguised) return;
  const waypoint = getNavigationWaypoint(aiCat, aiCatBrain.hideTarget, aiCatBrain, 'hide');
  const desired = { x: waypoint.x - aiCat.x, y: waypoint.y - aiCat.y };
  const len = Math.hypot(desired.x, desired.y) || 1;
  const moveDir = { x: desired.x / len, y: desired.y / len };
  moveEntity(aiCat, moveDir, getSpeed(aiCat) * dt);

  if (aiCatBrain.navPath.length && distance(aiCat, aiCatBrain.navPath[0]) < 30) {
    aiCatBrain.navPath.shift();
  }

  if (distance(aiCat, aiCatBrain.hideTarget) <= DISGUISE_RADIUS) {
    setAiCatDisguise(aiCatBrain.hideTarget);
    aiCatBrain.needsInitialDisguise = false;
    return;
  }

  updateAiStuckRecovery(aiCat, aiCatBrain, dt, moveDir);
}

function findNavigationPath(start, goal) {
  if (canTravelDirect(start, goal)) return [goal];

  const graph = getNavigationGraph();
  const nodes = graph.nodes;
  const mainNodeIndices = getMainNodeIndices();

  const firstMainIndex = pickNearestReachableMainNodeIndex(start, goal, mainNodeIndices, nodes);
  if (firstMainIndex === -1) {
    const nearest = getNearestReachableNavNode(start, goal);
    return nearest ? [nearest] : [];
  }

  const firstMainNode = nodes[firstMainIndex];
  const path = [firstMainNode];

  const mainSearch = runDijkstra(nodes, graph.edges, firstMainIndex, (edge) => edge.type === 'main');
  const secondMainIndex = pickNearestAuxLinkedMainNodeIndex(goal, mainNodeIndices, graph.edges, mainSearch.dist);
  if (secondMainIndex === -1) {
    const nearest = getNearestReachableNavNode(start, goal);
    return nearest ? [nearest] : path;
  }

  const mainPathIndices = buildPathIndices(mainSearch.prev, firstMainIndex, secondMainIndex);
  mainPathIndices.forEach((index) => path.push(nodes[index]));

  if (canTravelDirect(nodes[secondMainIndex], goal)) {
    path.push(goal);
    return path;
  }

  const auxSearch = runDijkstra(
    nodes,
    graph.edges,
    secondMainIndex,
    (edge, from) => edge.type === 'aux' && (from === secondMainIndex || !mainNodeIndices.has(from))
  );
  const auxTargetIndex = pickNearestAuxNodeIndex(goal, auxSearch.dist, mainNodeIndices, nodes);
  if (auxTargetIndex === -1) {
    const nearest = getNearestReachableNavNode(start, goal);
    return nearest ? [nearest] : path;
  }

  const auxPathIndices = buildPathIndices(auxSearch.prev, secondMainIndex, auxTargetIndex);
  auxPathIndices.forEach((index) => path.push(nodes[index]));
  path.push(goal);
  return path;
}

function getMainNodeIndices() {
  const mainNodeIndices = new Set();
  manualNavMainEdges.forEach(([from, to]) => {
    mainNodeIndices.add(from);
    mainNodeIndices.add(to);
  });
  return mainNodeIndices;
}

function pickNearestReachableMainNodeIndex(start, goal, mainNodeIndices, nodes) {
  const candidates = [...mainNodeIndices].filter((index) => {
    const node = nodes[index];
    return node && canTravelDirect(start, node);
  });
  if (!candidates.length) return -1;
  candidates.sort((a, b) => {
    const byGoal = distance(nodes[a], goal) - distance(nodes[b], goal);
    if (Math.abs(byGoal) > 0.001) return byGoal;
    return distance(start, nodes[a]) - distance(start, nodes[b]);
  });
  return candidates[0];
}

function pickNearestAuxLinkedMainNodeIndex(goal, mainNodeIndices, edges, mainDist) {
  const candidates = [...mainNodeIndices].filter((index) => {
    if (!Number.isFinite(mainDist[index])) return false;
    return edges[index].some((edge) => edge.type === 'aux');
  });
  if (!candidates.length) return -1;
  const nodes = getNavigationNodes();
  candidates.sort((a, b) => {
    const byGoal = distance(nodes[a], goal) - distance(nodes[b], goal);
    if (Math.abs(byGoal) > 0.001) return byGoal;
    return mainDist[a] - mainDist[b];
  });
  return candidates[0];
}

function pickNearestAuxNodeIndex(goal, auxDist, mainNodeIndices, nodes) {
  const candidates = nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node, index }) => Number.isFinite(auxDist[index]) && !mainNodeIndices.has(index) && canTravelDirect(node, goal));
  if (!candidates.length) return -1;
  candidates.sort((a, b) => {
    const byGoal = distance(a.node, goal) - distance(b.node, goal);
    if (Math.abs(byGoal) > 0.001) return byGoal;
    return auxDist[a.index] - auxDist[b.index];
  });
  return candidates[0].index;
}

function runDijkstra(nodes, adjacency, startIndex, edgeFilter = null) {
  const dist = new Array(nodes.length).fill(Infinity);
  const prev = new Array(nodes.length).fill(-1);
  const visited = new Set();
  dist[startIndex] = 0;

  while (visited.size < nodes.length) {
    let current = -1;
    let best = Infinity;
    for (let i = 0; i < nodes.length; i += 1) {
      if (!visited.has(i) && dist[i] < best) {
        best = dist[i];
        current = i;
      }
    }
    if (current === -1) break;
    visited.add(current);

    adjacency[current].forEach((edge) => {
      if (edgeFilter && !edgeFilter(edge, current)) return;
      if (visited.has(edge.to)) return;
      const cost = dist[current] + edge.cost;
      if (cost < dist[edge.to]) {
        dist[edge.to] = cost;
        prev[edge.to] = current;
      }
    });
  }

  return { dist, prev };
}

function buildPathIndices(prev, startIndex, endIndex) {
  if (startIndex === endIndex) return [];
  const path = [];
  for (let i = endIndex; i !== -1 && i !== startIndex; i = prev[i]) {
    path.unshift(i);
  }
  return path;
}

function invalidateNavigationCache() {
  navGraphCache = null;
  wallCollisionRectsCache = null;
}

function warmNavigationCache() {
  getWallCollisionRects();
  getNavigationGraph();
}

function getNavigationGraph() {
  if (navGraphCache) return navGraphCache;

  const nodes = getNavigationNodes();
  const edges = nodes.map(() => []);
  forEachManualNavEdge((from, to, type) => {
    const a = nodes[from];
    const b = nodes[to];
    if (!a || !b || !canTravelDirect(a, b)) return;
    const cost = distance(a, b);
    edges[from].push({ to, cost, type });
    edges[to].push({ to: from, cost, type });
  });

  navGraphCache = { nodes, edges };
  return navGraphCache;
}

function getNavigationNodes() {
  if (navNodesCache) return navNodesCache;
  navNodesCache = manualNavNodes;
  return navNodesCache;
}

function getNearestReachableNavNode(start, goal) {
  return getNavigationNodes()
    .filter((node) => canTravelDirect(start, node))
    .sort((a, b) => distance(a, goal) - distance(b, goal))[0] || null;
}

function canTravelDirect(a, b) {
  const length = distance(a, b);
  const steps = Math.max(2, Math.ceil(length / 20));
  const probeRadius = Math.max(NAV_CLEARANCE, (a.r || PLAYER_COLLISION_RADIUS) + 2);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    if (!isNavigationPointClear(x, y, items, probeRadius)) return false;
  }
  return true;
}

function isNavigationPointClear(x, y, navigationItems = items, probeRadius = NAV_CLEARANCE) {
  const probe = navCorridorProbe(x, y, probeRadius);
  const border = probeRadius;
  if (x <= border || x >= MAP - border || y <= border || y >= MAP - border) return false;
  if (getWallCollisionRects().some((rect) => rectOverlap(probe, rect))) return false;
  return !navigationItems.some((item) => rectOverlap(probe, itemHitRect(item)));
}

function moveEntity(entity, dir, amount) {
  if (!dir.x && !dir.y) return;
  const nx = clamp(entity.x + dir.x * amount, entity.r, MAP - entity.r);
  const ny = clamp(entity.y + dir.y * amount, entity.r, MAP - entity.r);
  const movedX = { ...entity, x: nx };
  if (!collides(movedX, entity)) entity.x = nx;
  const movedY = { ...entity, y: ny };
  if (!collides(movedY, entity)) entity.y = ny;
  if (Math.abs(dir.x) > 0.05) entity.dir = dir.x > 0 ? 1 : -1;
  entity.frame += amount / 80;
}

function resetStuckAnchor(brain, entity) {
  brain.stuckTimer = 0;
  brain.stuckAnchorX = entity.x;
  brain.stuckAnchorY = entity.y;
}

function updateAiStuckRecovery(entity, brain, dt, moveDir) {
  if (!Number.isFinite(brain.stuckAnchorX) || !Number.isFinite(brain.stuckAnchorY)) {
    resetStuckAnchor(brain, entity);
    return;
  }

  const netMoved = distance(entity, { x: brain.stuckAnchorX, y: brain.stuckAnchorY });
  if (netMoved >= STUCK_NET_THRESHOLD) {
    resetStuckAnchor(brain, entity);
    return;
  }

  brain.stuckTimer += dt;
  if (brain.stuckTimer <= STUCK_TIMEOUT_SECONDS) return;

  applyRandomSidestep(entity, STUCK_SIDESTEP_DISTANCE, moveDir);
  resetStuckAnchor(brain, entity);
}

function applyRandomSidestep(entity, totalDistance, moveDir) {
  let baseAngle;
  if (moveDir && Math.hypot(moveDir.x, moveDir.y) > 0.05) {
    baseAngle = Math.atan2(moveDir.y, moveDir.x);
  } else {
    baseAngle = Math.random() * Math.PI * 2;
  }
  const side = Math.random() < 0.5 ? 1 : -1;
  const angle = baseAngle + side * (Math.PI / 2);
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };

  let remaining = totalDistance;
  while (remaining > 0) {
    const chunk = Math.min(STUCK_SIDESTEP_STEP, remaining);
    moveEntity(entity, dir, chunk);
    remaining -= chunk;
  }
}

function collides(entity, sourceEntity = entity) {
  const circleRect = { x: entity.x - entity.r, y: entity.y - entity.r, w: entity.r * 2, h: entity.r * 2 };
  if (getWallCollisionRects().some((rect) => rectOverlap(circleRect, rect))) return true;
  if (items.some((item) => {
    if (sourceEntity.disguised && sourceEntity.disguiseItem && item.id === sourceEntity.disguiseItem.id) return false;
    return rectOverlap(circleRect, itemHitRect(item, 0));
  })) return true;
  return getDisguiseCollisionRects(sourceEntity).some((rect) => rectOverlap(circleRect, rect));
}

function getSpeed(entity) {
  if (entity.disguised) return 52;
  return entity.kind === 'dog' ? 156 : 78;
}

function catCaughtByDog(cat, dog, allowDisguisedCheck) {
  if (cat.disguised) return allowDisguisedCheck ? false : false;
  return distance(cat, dog) < CATCH_RADIUS;
}

function startPlayerCatRound() {
  round = 'playerCatHide';
  roundTime = HIDE_SECONDS;
  playerCat.disguiseChance = !playerCat.disguised;
  playerCat.canRestore = playerCat.disguised;
  resetCatFootprintState(playerCat);
  resetCatDistanceTracking();
  catDistanceTracking.playerCat.last = distance(aiDog, playerCat);
  resetAiDogBrain();
  aiTarget = null;
  showMessage(`你是猫：Enter 伪装，长按 Enter 3 秒破坏物品（目标 ${getDestroyGoal()} 件）。`, 3.2);
}

function startPlayerCatSeek() {
  round = 'playerCatSeek';
  roundTime = SEEK_SECONDS;
  catDistanceTracking.playerCat.last = distance(aiDog, playerCat);
  aiTarget = null;
  showMessage('电脑狗开始搜寻：躲开追捕，或破坏足够物品获胜。', 3);
}

function startPlayerDogRound() {
  round = 'playerDogWait';
  roundTime = HIDE_SECONDS;
  inspectLeft = 5;
  Object.assign(aiCat, makeEntity('cat', spawnPoints.aiCat.x, spawnPoints.aiCat.y));
  ensureEntityClear(aiCat);
  aiCat.disguised = false;
  aiCat.disguiseItem = null;
  aiCat.disguiseChance = true;
  resetAiCatBrain();
  if (aiDifficulty === 'easy') {
    aiCatBrain.hideTarget = pickNearestItemBy(aiCat);
  }
  showMessage('你是狗：电脑猫正在躲藏，15 秒后开始搜寻。', 3);
}

function startPlayerDogSeek() {
  round = 'playerDogSeek';
  roundTime = SEEK_SECONDS;
  resetCatFootprintState(aiCat);
  resetCatDistanceTracking();
  catDistanceTracking.aiCat.last = distance(playerDog, aiCat);
  aiCatBrain.sabotageTarget = null;
  aiCatBrain.destroyCooldown = 0;
  aiCatBrain.destroyHold = 0;
  aiCatBrain.destroyItemId = null;
  aiCatBrain.dogSenseTimer = 0;
  aiCatBrain.pauseTimer = 0;
  showMessage('开始抓猫：Enter 查验，留意足迹与猫头上的感叹号。', 3);
}

function endGame(win, text) {
  outcome = win ? 'win' : 'lose';
  message = text;
  messageTimer = 999;
  overlay.querySelector('h1').textContent = win ? '你赢了！' : '游戏结束';
  overlay.querySelector('p').textContent = `${text} 点击按钮重新开始。`;
  startBtn.textContent = '重新开始';
  overlay.classList.remove('hidden');
}

function getHuman() {
  return round === 'playerDogSeek' || round === 'playerDogWait' ? playerDog : playerCat;
}

function nearestItem(entity, radius) {
  let nearest = null;
  let nearestDist = Infinity;
  items.forEach((item) => {
    const d = Math.hypot(entity.x - item.x, entity.y - item.y);
    if (d < radius + Math.max(item.w, item.h) / 2 && d < nearestDist) {
      nearest = item;
      nearestDist = d;
    }
  });
  return nearest;
}

function draw() {
  const w = innerWidth;
  const h = innerHeight;
  ctx.clearRect(0, 0, w, h);

  const human = getHuman();
  const scale = Math.min(w / VIEW_W, h / VIEW_H);
  const viewW = w / scale;
  const viewH = h / scale;
  const camX = clamp(human.x - viewW / 2, 0, MAP - viewW);
  const camY = clamp(human.y - viewH / 2, 0, MAP - viewH);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-camX, -camY);
  drawWorld();
  drawWallCollisionDebug();
  drawItems(human);
  drawEntity(aiCat, human, camX, camY, viewW, viewH);
  drawEntity(playerCat, human, camX, camY, viewW, viewH);
  drawEntity(aiDog, human, camX, camY, viewW, viewH);
  drawEntity(playerDog, human, camX, camY, viewW, viewH);
  drawFootprints();
  drawCatAlert(playerCat);
  drawCatAlert(aiCat);
  drawNavigationDebug();
  ctx.restore();

  if (round === 'playerDogWait') drawBlindfold(w, h);
  drawHud(w, h);
  if (round === 'playerDogSeek') drawMinimap(w, h, human);
}

function drawWorld() {
  drawLand();
  drawWallTrim();
}

function drawLand() {
  const land = images.land;
  if (land && land.complete && land.width) {
    const pattern = ctx.createPattern(land, 'repeat');
    ctx.fillStyle = pattern || '#d8b48f';
  } else {
    ctx.fillStyle = '#d8b48f';
  }
  ctx.fillRect(0, 0, MAP, MAP);
}

function drawWallTrim() {
  getEnvironmentWalls().forEach(drawWallSegment);
  manualWalls.forEach(drawManualWall);
  drawEnvironmentCorners();
}

function drawWallCollisionDebug() {
  if (!debugWallCollision) return;

  const rects = getWallCollisionRects();
  ctx.save();
  ctx.fillStyle = 'rgba(255, 72, 72, 0.28)';
  ctx.strokeStyle = 'rgba(255, 120, 80, 0.92)';
  ctx.lineWidth = 2;
  rects.forEach((rect) => {
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  ctx.restore();
}

function drawNavigationDebug() {
  if (!debugNavigation) return;

  const nodes = getNavigationNodes();
  ctx.save();

  forEachManualNavEdge((from, to, kind) => {
    const a = nodes[from];
    const b = nodes[to];
    if (!a || !b) return;
    const passable = canTravelDirect(a, b);
    const isMain = kind === 'main';
    if (passable) {
      ctx.strokeStyle = isMain ? 'rgba(80, 200, 255, 0.88)' : 'rgba(255, 176, 72, 0.9)';
      ctx.setLineDash(isMain ? [] : [10, 7]);
    } else {
      ctx.strokeStyle = 'rgba(255, 72, 88, 0.92)';
      ctx.setLineDash([12, 8]);
    }
    ctx.lineWidth = isMain ? 3 : 2.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  if (aiDogBrain.navPath.length) {
    ctx.strokeStyle = 'rgba(232, 96, 255, 0.95)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(aiDog.x, aiDog.y);
    aiDogBrain.navPath.forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.stroke();
    aiDogBrain.navPath.forEach((point, index) => {
      ctx.fillStyle = index === 0 ? '#ff66ff' : 'rgba(200, 80, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(point.x, point.y, index === 0 ? 11 : 7, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const waypoint = aiDogBrain.navPath[0];
  if (waypoint) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(aiDog.x, aiDog.y);
    ctx.lineTo(waypoint.x, waypoint.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  nodes.forEach((node, index) => {
    ctx.fillStyle = '#50b4ff';
    ctx.strokeStyle = '#10131a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(node.x, node.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8f1df';
    ctx.font = 'bold 14px Trebuchet MS, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index), node.x, node.y);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

function getWallCollisionRects() {
  if (wallCollisionRectsCache) return wallCollisionRectsCache;
  wallCollisionRectsCache = getEnvironmentWalls()
    .flatMap(wallSegmentCollisionRects)
    .concat(manualWalls.map(manualWallHitRect));
  return wallCollisionRectsCache;
}

function wallSegmentCollisionRects(segment) {
  const pieces = segment.door
    ? subtractIntervals(segment.start, segment.end, [segment.door])
    : [{ start: segment.start, end: segment.end }];
  return pieces
    .filter((piece) => piece.end - piece.start >= WALL_THICKNESS * 0.75)
    .map((piece) => wallPieceRect(segment, piece));
}

function wallPieceRect(segment, piece) {
  if (segment.orientation === 'h') {
    return {
      x: piece.start,
      y: segment.pos - WALL_THICKNESS / 2,
      w: piece.end - piece.start,
      h: WALL_THICKNESS,
    };
  }

  return {
    x: segment.pos - WALL_THICKNESS / 2,
    y: piece.start,
    w: WALL_THICKNESS,
    h: piece.end - piece.start,
  };
}

function manualWallHitRect(wall) {
  const cx = wall.x + wall.w / 2;
  const cy = wall.y + wall.h / 2;
  const thickness = WALL_THICKNESS;
  // wall.w/h are the editor placement AABB (already axis-aligned), not pre-rotation sprite size.
  const horizontal = wall.w >= wall.h;

  if (horizontal) {
    return {
      x: cx - wall.w / 2,
      y: cy - thickness / 2,
      w: wall.w,
      h: thickness,
    };
  }

  return {
    x: cx - thickness / 2,
    y: cy - wall.h / 2,
    w: thickness,
    h: wall.h,
  };
}

function getDisguiseCollisionRects(sourceEntity) {
  return [playerCat, aiCat, playerDog, aiDog]
    .filter((actor) => actor !== sourceEntity && actor.disguised && actor.disguiseItem)
    .map((actor) => itemHitRect({ ...actor.disguiseItem, x: actor.x, y: actor.y, angle: actor.angle }));
}

function getEnvironmentWalls() {
  return [
    { orientation: 'h', pos: 0, start: 0, end: MAP },
    { orientation: 'h', pos: MAP, start: 0, end: MAP },
    { orientation: 'v', pos: 0, start: 0, end: MAP },
    { orientation: 'v', pos: MAP, start: 0, end: MAP },
  ];
}

function subtractIntervals(start, end, gaps) {
  const pieces = [];
  let cursor = start;
  gaps
    .slice()
    .sort((a, b) => a.start - b.start)
    .forEach((gap) => {
      if (gap.start > cursor) pieces.push({ start: cursor, end: gap.start });
      cursor = Math.max(cursor, gap.end);
    });
  if (cursor < end) pieces.push({ start: cursor, end });
  return pieces;
}

function drawWallSegment(segment) {
  const pieces = segment.door
    ? subtractIntervals(segment.start, segment.end, [segment.door])
    : [{ start: segment.start, end: segment.end }];

  pieces.forEach((piece) => {
    if (piece.end - piece.start < WALL_THICKNESS * 0.75) return;
    drawStraightWall(piece.start, piece.end, segment.pos, segment.orientation);
  });
}

function drawStraightWall(start, end, pos, orientation) {
  const tileLength = getStraightWallLength();
  for (let cursor = start; cursor < end; cursor += tileLength - WALL_TILE_OVERLAP) {
    const len = Math.min(tileLength, end - cursor);
    const center = cursor + len / 2;
    if (orientation === 'h') {
      drawImageFit(images.wallStraight, center, pos, WALL_THICKNESS, len, Math.PI / 2);
    } else {
      drawImageFit(images.wallStraight, pos, center, WALL_THICKNESS, len, 0);
    }
  }
}

function drawManualWall(wall) {
  const img = images[wall.key];
  const rotation = normalizeRotation(wall.rotation || 0);
  const cx = wall.x + wall.w / 2;
  const cy = wall.y + wall.h / 2;
  const drawW = (rotation === 90 || rotation === 270) ? wall.h : wall.w;
  const drawH = (rotation === 90 || rotation === 270) ? wall.w : wall.h;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation * Math.PI / 180);
  if (img && img.complete && img.width) {
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  } else {
    ctx.fillStyle = wall.key === 'wallCorner' ? '#8a6a32' : '#6f5630';
    ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
  }
  ctx.restore();
}

function normalizeRotation(rotation) {
  return ((Math.round(rotation / 90) * 90) % 360 + 360) % 360;
}

function getWallScale() {
  const wall = images.wallStraight;
  const sourceWidth = wall && wall.width ? wall.width : WALL_STRAIGHT_NATIVE_W;
  return WALL_THICKNESS / sourceWidth;
}

function getStraightWallLength() {
  const wall = images.wallStraight;
  const sourceHeight = wall && wall.height ? wall.height : WALL_STRAIGHT_NATIVE_H;
  return sourceHeight * getWallScale();
}

function getCornerWallSize() {
  const corner = images.wallCorner;
  const sourceSize = corner && corner.width ? corner.width : WALL_CORNER_NATIVE_SIZE;
  return sourceSize * getWallScale();
}

function drawEnvironmentCorners() {
  drawRectCorners({ x: 0, y: 0, w: MAP, h: MAP });
}

function drawRectCorners(rect) {
  drawCornerWall(rect.x, rect.y, 0);
  drawCornerWall(rect.x + rect.w, rect.y, Math.PI / 2);
  drawCornerWall(rect.x + rect.w, rect.y + rect.h, Math.PI);
  drawCornerWall(rect.x, rect.y + rect.h, -Math.PI / 2);
}

function drawCornerWall(x, y, angle) {
  const img = images.wallCorner;
  const size = getCornerWallSize();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (img && img.complete && img.width) {
    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      -WALL_THICKNESS / 2,
      -WALL_THICKNESS / 2,
      size,
      size,
    );
  } else {
    ctx.fillStyle = '#8a6a32';
    ctx.fillRect(-WALL_THICKNESS / 2, -WALL_THICKNESS / 2, size, WALL_THICKNESS);
    ctx.fillRect(-WALL_THICKNESS / 2, -WALL_THICKNESS / 2, WALL_THICKNESS, size);
  }
  ctx.restore();
}

function drawItems(human) {
  const inspectRound = round === 'playerDogSeek';
  const catRound = round === 'playerCatHide' || round === 'playerCatSeek';
  const radius = inspectRound ? INSPECT_RADIUS : DESTROY_RADIUS;
  const near = nearestItem(human, radius);
  items.forEach((item) => {
    const isNear = near && near.id === item.id;
    if (isNear && (catRound || inspectRound)) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = inspectRound ? '#ffdd66' : '#67ffe0';
      const rect = itemHitRect(item, 14);
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
    drawItemSprite(item);
  });

  const destroying = getDestroyHoldVisual();
  if (destroying) drawDestroyProgress(destroying.item, destroying.progress);
}

function drawDestroyProgress(item, progress) {
  const rect = itemHitRect(item, 10);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const radius = Math.max(rect.w, rect.h) * 0.34 + 12;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 90, 70, 0.28)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ff5a46';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();
  ctx.fillStyle = 'rgba(20, 12, 10, 0.72)';
  ctx.font = '700 15px Trebuchet MS, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.ceil((1 - progress) * DESTROY_HOLD_SECONDS)}s`, cx, cy);
  ctx.restore();
}

function drawItemSprite(item) {
  drawImageFit(images[item.imgKey], item.x, item.y, item.w, item.h, item.angle);
}

function drawEntity(entity, human, camX, camY, viewW, viewH) {
  const visible = entity === human ||
    round === 'playerCatHide' ||
    round === 'playerDogSeek' ||
    (entity.x > camX - 80 && entity.x < camX + viewW + 80 && entity.y > camY - 80 && entity.y < camY + viewH + 80);

  if (!visible) return;
  if (entity === aiCat && round !== 'playerDogSeek') return;
  if (entity === playerDog && round !== 'playerDogSeek' && round !== 'playerDogWait') return;
  if (entity === aiDog && round !== 'playerCatSeek' && round !== 'playerCatHide') return;
  if (entity === playerCat && round !== 'playerCatSeek' && round !== 'playerCatHide') return;

  if (entity.disguised && entity.disguiseItem) {
    drawImageFit(images[entity.disguiseItem.imgKey], entity.x, entity.y, entity.disguiseItem.w, entity.disguiseItem.h, entity.angle);
    const rect = itemHitRect({ ...entity.disguiseItem, x: entity.x, y: entity.y, angle: entity.angle });
    if (entity === human) drawRing(entity.x, entity.y, Math.max(rect.w, rect.h) / 2, '#67ffe0');
    return;
  }

  const img = images[entity.kind];
  const frames = 6;
  const frame = Math.floor(entity.frame) % frames;
  const fw = img.width ? img.width / frames : 40;
  const fh = img.height || 24;
  ctx.save();
  ctx.translate(entity.x, entity.y);
  ctx.scale(entity.dir, 1);
  if (img.complete && img.width) {
    ctx.drawImage(img, frame * fw, 0, fw, fh, -PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
  } else {
    ctx.fillStyle = entity.kind === 'cat' ? '#ff8f38' : '#314ac9';
    ctx.beginPath();
    ctx.arc(0, 0, entity.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (entity === human) drawRing(entity.x, entity.y, PLAYER_SIZE / 2 + 8, entity.kind === 'cat' ? '#ffb268' : '#80a0ff');
}

function drawCatAlert(cat) {
  if (!isCatAlertActive(cat)) return;
  const activeCat = (cat === playerCat && (round === 'playerCatHide' || round === 'playerCatSeek')) ||
    (cat === aiCat && round === 'playerDogSeek');
  if (!activeCat) return;

  const anchorY = cat.disguised && cat.disguiseItem
    ? cat.y - Math.max(cat.disguiseItem.w, cat.disguiseItem.h) / 2 - 18
    : cat.y - PLAYER_SIZE - 16;

  ctx.save();
  ctx.translate(cat.x, anchorY);
  ctx.fillStyle = '#ffdf4d';
  ctx.strokeStyle = '#3b2500';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3b2500';
  ctx.font = '700 24px Trebuchet MS, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', 0, 1);
  ctx.restore();
}

function drawFootprints() {
  const showPlayerCatMarks = round === 'playerCatSeek';
  const showAiCatMarks = round === 'playerDogSeek';
  if (!showPlayerCatMarks && !showAiCatMarks) return;
  if (!footprints.length) return;

  const now = performance.now() / 1000;
  footprints.forEach((mark) => {
    const life = (mark.until - now) / FOOTPRINT_LIFETIME;
    if (life <= 0) return;
    ctx.save();
    ctx.globalAlpha = 0.2 + life * 0.55;
    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath();
    ctx.ellipse(mark.x - 8, mark.y + 6, 9, 5, -0.4, 0, Math.PI * 2);
    ctx.ellipse(mark.x + 8, mark.y + 6, 9, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function dogCanCurrentlySeeCat(dog, cat) {
  const activePair = (dog === aiDog && cat === playerCat && round === 'playerCatSeek') ||
    (dog === playerDog && cat === aiCat && round === 'playerDogSeek');
  if (!activePair) return false;
  return distance(dog, cat) <= DOG_VISION_RANGE;
}

function drawRing(x, y, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawImageFit(img, x, y, w, h, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (img && img.complete && img.width) {
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    ctx.fillStyle = '#9b7a56';
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }
  ctx.restore();
}

function drawHud(w, h) {
  const difficultyLabel = { easy: '低', medium: '中', hard: '高' }[aiDifficulty];
  const title = {
    playerCatHide: '你是猫：躲藏',
    playerCatSeek: '你是猫：躲避电脑狗',
    playerDogWait: '你是狗：等待电脑猫躲藏',
    playerDogSeek: '你是狗：搜寻电脑猫',
  }[round];

  ctx.save();
  const hudHeight = round === 'playerCatHide' || round === 'playerCatSeek' || round === 'playerDogSeek' ? 118 : 96;
  ctx.fillStyle = 'rgba(12, 14, 22, 0.76)';
  ctx.fillRect(16, 16, Math.min(560, w - 32), hudHeight);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.strokeRect(16, 16, Math.min(560, w - 32), hudHeight);
  ctx.fillStyle = '#f8f1df';
  ctx.font = '700 20px Trebuchet MS, Arial';
  ctx.fillText(title, 32, 48);
  ctx.font = '15px Trebuchet MS, Arial';
  ctx.fillStyle = '#d9ccb9';
  const time = Math.max(0, Math.ceil(roundTime));
  const inspect = round === 'playerDogSeek' ? `  查验：${inspectLeft}/5` : '';
  const destroyProgress = round === 'playerCatHide' || round === 'playerCatSeek'
    ? `  破坏：${playerCatDestroyed}/${getDestroyGoal()}`
    : round === 'playerDogSeek'
      ? `  电脑破坏：${aiCatDestroyed}/${getDestroyGoal()}`
      : '';
  ctx.fillText(`剩余时间：${time}s  电脑难度：${difficultyLabel}${inspect}${destroyProgress}`, 32, 75);
  ctx.fillText(getHint(), 32, 98);
  if (debugWallCollision || debugNavigation) {
    ctx.fillStyle = '#9ed4ff';
    ctx.font = '13px Trebuchet MS, Arial';
    let debugHint = '';
    if (debugWallCollision) debugHint += '墙壁碰撞 [B]  红框=不可通行区域';
    if (debugNavigation) debugHint += `${debugHint ? '  |  ' : ''}导航调试 [N]  蓝实线=主路  橙虚线=辅路  红虚线=阻断  紫线=狗路径`;
    ctx.fillText(debugHint, 32, hudHeight + 8);
  }

  if (messageTimer > 0) {
    ctx.fillStyle = 'rgba(12, 14, 22, 0.82)';
    ctx.fillRect(w / 2 - 260, h - 76, 520, 42);
    ctx.fillStyle = '#fff2c8';
    ctx.font = '16px Trebuchet MS, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, w / 2, h - 49);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function drawBlindfold(w, h) {
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function getHint() {
  if (round === 'playerCatHide') {
    if (playerCat.disguised && playerCat.canRestore) return 'Enter 恢复猫形态；长按 Enter 3 秒破坏；Q/E 旋转伪装物';
    if (playerCat.disguised) return '已伪装：长按 Enter 3 秒破坏家具，Q/E 转向，狗靠近时头上会出现感叹号';
    return '靠近家具：点按 Enter 伪装，长按 Enter 3 秒破坏';
  }
  if (round === 'playerCatSeek' && !playerCat.disguised && playerCat.disguiseChance) {
    return '点按 Enter 伪装、长按 Enter 破坏；狗靠近时头上会出现感叹号';
  }
  if (round === 'playerCatSeek') return '躲开追捕或破坏足够物品；狗靠近时头上会出现感叹号';
  if (round === 'playerDogSeek') return '小地图在右上角；Enter 查验，留意足迹与猫头上的感叹号';
  if (round === 'playerDogWait') return '电脑猫躲藏时你不能移动，准备开始搜寻';
  return '远离电脑狗，伪装时保持自然';
}

function drawMinimap(w, h, human) {
  const size = Math.min(190, w * 0.24);
  const x = w - size - 18;
  const y = 18;
  const s = size / MAP;

  ctx.save();
  ctx.fillStyle = 'rgba(11, 13, 20, 0.78)';
  ctx.fillRect(x - 8, y - 8, size + 16, size + 16);
  ctx.fillStyle = '#f3cfb8';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#3a2a1e';
  manualWalls.forEach((wall) => ctx.fillRect(x + wall.x * s, y + wall.y * s, Math.max(1, wall.w * s), Math.max(1, wall.h * s)));
  if (debugNavigation) {
    const nodes = getNavigationNodes();
    ctx.lineWidth = 1;
    forEachManualNavEdge((from, to, kind) => {
      const a = nodes[from];
      const b = nodes[to];
      if (!a || !b) return;
      const passable = canTravelDirect(a, b);
      const isMain = kind === 'main';
      ctx.strokeStyle = passable
        ? (isMain ? 'rgba(80, 200, 255, 0.9)' : 'rgba(255, 176, 72, 0.9)')
        : 'rgba(255, 72, 88, 0.9)';
      ctx.setLineDash(passable && !isMain ? [4, 3] : []);
      ctx.beginPath();
      ctx.moveTo(x + a.x * s, y + a.y * s);
      ctx.lineTo(x + b.x * s, y + b.y * s);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.fillStyle = '#50b4ff';
    nodes.forEach((node, index) => {
      ctx.beginPath();
      ctx.arc(x + node.x * s, y + node.y * s, 2.5, 0, Math.PI * 2);
      ctx.fill();
      if (index % 5 === 0) {
        ctx.fillStyle = '#f8f1df';
        ctx.font = '8px Arial';
        ctx.fillText(String(index), x + node.x * s + 3, y + node.y * s - 2);
        ctx.fillStyle = '#50b4ff';
      }
    });
  }
  ctx.fillStyle = '#80a0ff';
  ctx.beginPath();
  ctx.arc(x + human.x * s, y + human.y * s, 5, 0, Math.PI * 2);
  ctx.fill();
  if (footprints.length) {
    const now = performance.now() / 1000;
    ctx.fillStyle = 'rgba(139, 90, 43, 0.85)';
    footprints.forEach((mark) => {
      if (mark.until <= now) return;
      ctx.beginPath();
      ctx.arc(x + mark.x * s, y + mark.y * s, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.restore();
}

function drawMiniRects(rects, x, y, s, color) {
  ctx.fillStyle = color;
  rects.forEach((rect) => ctx.fillRect(x + rect.x * s, y + rect.y * s, rect.w * s, rect.h * s));
}

function showMessage(text, seconds) {
  message = text;
  messageTimer = seconds;
}

function getSpriteProfile(imgKey) {
  return spriteProfiles[imgKey] || { width: 80, source: { w: 80, h: 80 }, hitbox: { x: -35, y: -35, w: 70, h: 70 } };
}

function getSpriteSize(imgKey) {
  const profile = getSpriteProfile(imgKey);
  const img = images[imgKey];
  const sourceW = img && img.width ? img.width : profile.source.w;
  const sourceH = img && img.height ? img.height : profile.source.h;
  const width = profile.width;
  return { w: width, h: width * (sourceH / sourceW) };
}

function itemHitRect(item, pad = 0) {
  const profile = getSpriteProfile(item.imgKey);
  const base = getSpriteSize(item.imgKey);
  const scale = item.w / base.w;
  const hitbox = profile.hitbox;
  return rotatedLocalRectBounds(item, {
    x: hitbox.x * scale - pad,
    y: hitbox.y * scale - pad,
    w: hitbox.w * scale + pad * 2,
    h: hitbox.h * scale + pad * 2,
  });
}

function itemRect(item, pad = 0) {
  return rotatedLocalRectBounds(item, {
    x: -item.w / 2 - pad,
    y: -item.h / 2 - pad,
    w: item.w + pad * 2,
    h: item.h + pad * 2,
  });
}

function rotatedLocalRectBounds(item, rect) {
  const angle = Number.isFinite(item.angle) ? item.angle : 0;
  if (!angle) {
    return {
      x: item.x + rect.x,
      y: item.y + rect.y,
      w: rect.w,
      h: rect.h,
    };
  }
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x + rect.w, y: rect.y + rect.h },
    { x: rect.x, y: rect.y + rect.h },
  ].map((point) => ({
    x: item.x + point.x * cos - point.y * sin,
    y: item.y + point.x * sin + point.y * cos,
  }));
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function choice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
setTimeout(warmNavigationCache, 0);
