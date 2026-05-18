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
const BASE_ITEM_MATCH_RADIUS = 70;
const HIDE_SECONDS = 15;
const SEEK_SECONDS = 100;

const keys = new Set();
const justPressed = new Set();
let lastTime = performance.now();
let gameStarted = false;
let message = '按开始进入第一回合';
let messageTimer = 0;
let round = 'playerCatHide';
let roundTime = HIDE_SECONDS;
let inspectLeft = 5;
let aiCheckTimer = 0;
let aiTarget = null;
let aiDifficulty = 'medium';
let outcome = null;

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
  { key: 'wallStraight', x: 270, y: 60, w: 40, h: 5, rotation: 270 },
  { key: 'wallStraight', x: 370, y: 170, w: 150, h: 5, rotation: 270 },
  { key: 'wallStraight', x: 120, y: 100, w: 80, h: 5, rotation: 270 },
  { key: 'wallStraight', x: 0, y: 240, w: 200, h: 5, rotation: 270 },
  { key: 'wallStraight', x: 125, y: 150, w: 5, h: 90, rotation: 0 },
  { key: 'wallStraight', x: 115, y: 315, w: 100, h: 5, rotation: 270 },
  { key: 'wallStraight', x: 95, y: 0, w: 5, h: 100, rotation: 0 },
  { key: 'wallStraight', x: 130, y: 150, w: 40, h: 5, rotation: 270 },
  { key: 'wallStraight', x: 0, y: 365, w: 150, h: 5, rotation: 270 },
  { key: 'wallStraight', x: 320, y: 380, w: 5, h: 100, rotation: 0 },
  { key: 'wallStraight', x: 375, y: 380, w: 5, h: 100, rotation: 0 },
  { key: 'wallStraight', x: 300, y: 305, w: 260, h: 5, rotation: 90 },
  { key: 'wallStraight', x: 300, y: 215, w: 5, h: 90, rotation: 0 },
  { key: 'wallStraight', x: 360, y: 215, w: 5, h: 90, rotation: 0 },
  { key: 'wallStraight', x: 305, y: 255, w: 30, h: 5, rotation: 270 },
  { key: 'wallStraight', x: 325, y: 0, w: 5, h: 60, rotation: 0 },
  { key: 'wallStraight', x: 115, y: 370, w: 5, h: 30, rotation: 0 },
  { key: 'wallStraight', x: 115, y: 450, w: 5, h: 30, rotation: 0 },
  { key: 'wallStraight', x: 460, y: 380, w: 100, h: 5, rotation: 270 },
  { key: 'wallStraight', x: 460, y: 420, w: 100, h: 5, rotation: 270 },
  { key: 'wallStraight', x: 375, y: 310, w: 5, h: 30, rotation: 180 },
  { key: 'wallStraight', x: 320, y: 145, w: 50, h: 5, rotation: 270 },
  { key: 'wallStraight', x: 320, y: 150, w: 5, h: 30, rotation: 0 },
  { key: 'wallStraight', x: 365, y: 150, w: 5, h: 30, rotation: 0 },
  { key: 'wallStraight', x: 410, y: 110, w: 5, h: 60, rotation: 0 },
  { key: 'wallStraight', x: 350, y: 110, w: 60, h: 5, rotation: 270 },
  { key: 'wallStraight', x: 345, y: 110, w: 5, h: 20, rotation: 180 },
  { key: 'wallStraight', x: 310, y: 85, w: 250, h: 5, rotation: 270 },
  { key: 'wallStraight', x: 195, y: 150, w: 5, h: 90, rotation: 0 },
  { key: 'wallStraight', x: 165, y: 245, w: 5, h: 70, rotation: 180 },
].map(toWorldWall);


const manualNavNodes = [
  { x: 47, y: 46 },
  { x: 44, y: 190 },
  { x: 100, y: 189 },
  { x: 100, y: 130 },
  { x: 45, y: 129 },
  { x: 232, y: 131 },
  { x: 181, y: 199 },
  { x: 181, y: 199 },
  { x: 181, y: 199 },
  { x: 181, y: 199 },
  { x: 302, y: 133 },
  { x: 235, y: 44 },
  { x: 235, y: 44 },
  { x: 235, y: 44 },
  { x: 119, y: 66 },
  { x: 258, y: 283 },
  { x: 258, y: 283 },
  { x: 262, y: 132 },
  { x: 256, y: 426 },
  { x: 42, y: 288 },
  { x: 134, y: 285 },
  { x: 44, y: 346 },
  { x: 132, y: 352 },
  { x: 132, y: 352 },
  { x: 217, y: 368 },
  { x: 256, y: 426 },
  { x: 122, y: 424 },
  { x: 52, y: 423 },
  { x: 315, y: 348 },
  { x: 377, y: 362 },
  { x: 353, y: 434 },
  { x: 485, y: 341 },
  { x: 429, y: 406 },
  { x: 429, y: 451 },
  { x: 519, y: 454 },
  { x: 513, y: 409 },
  { x: 335, y: 201 },
  { x: 348, y: 280 },
  { x: 347, y: 167 },
  { x: 415, y: 258 },
  { x: 505, y: 230 },
  { x: 542, y: 134 },
  { x: 459, y: 133 },
  { x: 425, y: 102 },
  { x: 348, y: 99 },
  { x: 386, y: 135 },
  { x: 300, y: 77 },
  { x: 454, y: 73 },
  { x: 471, y: 54 },
  { x: 321, y: 66 },
  { x: 296, y: 29 },
  { x: 485, y: 341 },
  { x: 485, y: 341 },
  { x: 235, y: 44 },
  { x: 235, y: 44 },
  { x: 235, y: 44 },
  { x: 263, y: 191 },
  { x: 199, y: 284 },
  { x: 232, y: 131 },
  { x: 181, y: 130 },
].map(toWorldPoint);

const manualNavEdges = [
  [1, 2],
  [2, 3],
  [0, 4],
  [4, 1],
  [3, 4],
  [7, 6],
  [8, 7],
  [9, 8],
  [12, 11],
  [13, 12],
  [13, 5],
  [14, 3],
  [16, 15],
  [17, 10],
  [19, 20],
  [19, 21],
  [21, 20],
  [23, 22],
  [23, 21],
  [24, 23],
  [25, 18],
  [24, 25],
  [25, 26],
  [26, 27],
  [28, 25],
  [16, 24],
  [16, 28],
  [16, 25],
  [25, 29],
  [29, 30],
  [31, 32],
  [32, 33],
  [33, 34],
  [36, 37],
  [37, 38],
  [38, 39],
  [39, 40],
  [40, 41],
  [41, 42],
  [42, 43],
  [43, 44],
  [46, 47],
  [47, 48],
  [48, 49],
  [49, 50],
  [29, 31],
  [51, 31],
  [52, 51],
  [46, 49],
  [53, 13],
  [54, 53],
  [55, 54],
  [55, 17],
  [1, 3],
  [4, 2],
  [56, 17],
  [36, 56],
  [56, 46],
  [46, 10],
  [10, 56],
  [56, 24],
  [24, 28],
  [28, 26],
  [26, 24],
  [24, 29],
  [29, 32],
  [28, 29],
  [30, 28],
  [35, 32],
  [35, 29],
  [29, 52],
  [52, 28],
  [3, 0],
  [57, 56],
  [16, 57],
  [16, 56],
  [16, 10],
  [16, 5],
  [5, 56],
  [56, 55],
  [58, 5],
  [3, 59],
  [59, 58],
  [9, 59],
  [56, 59],
  [58, 17],
  [10, 44],
  [10, 45],
];
const manualBaseItems = [
  { type: 'bed', x: 45, y: 40 },
  { type: 'bed', x: 160, y: 210 },
  { type: 'bed', x: 220, y: 30 },
  { type: 'bed', x: 55, y: 270 },
  { type: 'bed', x: 470, y: 20 },
  { type: 'bed', x: 470, y: 145 },
  { type: 'sofa', x: 25, y: 215 },
  { type: 'sofa', x: 515, y: 455 },
  { type: 'sofa', x: 55, y: 455 },
  { type: 'sofa', x: 145, y: 390 },
  { type: 'sofa', x: 270, y: 395 },
  { type: 'sofa', x: 155, y: 465 },
  { type: 'sofa', x: 180, y: 465 },
  { type: 'sofa', x: 205, y: 465 },
  { type: 'sofa', x: 270, y: 465 },
  { type: 'table', x: 70, y: 195 },
  { type: 'table', x: 55, y: 350 },
  { type: 'table', x: 55, y: 420 },
  { type: 'table', x: 180, y: 420 },
  { type: 'table', x: 200, y: 420 },
  { type: 'table', x: 220, y: 420 },
  { type: 'table', x: 330, y: 425 },
  { type: 'table', x: 330, y: 450 },
  { type: 'table', x: 275, y: 25 },
  { type: 'table', x: 110, y: 35 },
  { type: 'table', x: 180, y: 60 },
  { type: 'table', x: 180, y: 75 },
  { type: 'table', x: 430, y: 75 },
  { type: 'table', x: 450, y: 75 },
  { type: 'table', x: 465, y: 75 },
  { type: 'table', x: 400, y: 130 },
  { type: 'table', x: 345, y: 160 },
  { type: 'table', x: 310, y: 280 },
  { type: 'table', x: 180, y: 255 },
  { type: 'table', x: 180, y: 270 },
  { type: 'chair', x: 70, y: 170 },
  { type: 'chair', x: 180, y: 395 },
  { type: 'chair', x: 195, y: 395 },
  { type: 'chair', x: 240, y: 420 },
  { type: 'chair', x: 35, y: 420 },
  { type: 'chair', x: 55, y: 335 },
  { type: 'chair', x: 180, y: 290 },
  { type: 'chair', x: 205, y: 270 },
  { type: 'chair', x: 335, y: 280 },
  { type: 'chair', x: 345, y: 180 },
  { type: 'chair', x: 400, y: 155 },
  { type: 'chair', x: 440, y: 55 },
  { type: 'chair', x: 460, y: 55 },
  { type: 'chair', x: 305, y: 25 },
  { type: 'chair', x: 485, y: 455 },
  { type: 'chair', x: 445, y: 320 },
  { type: 'chair', x: 465, y: 320 },
  { type: 'chair', x: 485, y: 320 },
  { type: 'chair', x: 555, y: 335 },
  { type: 'chair', x: 555, y: 360 },
  { type: 'chair', x: 480, y: 375 },
  { type: 'bonsai', x: 10, y: 125 },
  { type: 'bonsai', x: 25, y: 125 },
  { type: 'bonsai', x: 45, y: 125 },
  { type: 'bonsai', x: 145, y: 260 },
  { type: 'bonsai', x: 145, y: 280 },
  { type: 'bonsai', x: 145, y: 300 },
  { type: 'bonsai', x: 220, y: 300 },
  { type: 'bonsai', x: 305, y: 385 },
  { type: 'bonsai', x: 305, y: 405 },
  { type: 'bonsai', x: 300, y: 425 },
  { type: 'bonsai', x: 310, y: 455 },
  { type: 'bonsai', x: 370, y: 370 },
  { type: 'bonsai', x: 500, y: 395 },
  { type: 'bonsai', x: 545, y: 410 },
  { type: 'bonsai', x: 385, y: 445 },
  { type: 'bonsai', x: 405, y: 465 },
  { type: 'bonsai', x: 415, y: 220 },
  { type: 'bonsai', x: 415, y: 245 },
  { type: 'bonsai', x: 440, y: 265 },
  { type: 'bonsai', x: 465, y: 270 },
  { type: 'bonsai', x: 485, y: 250 },
  { type: 'bonsai', x: 485, y: 225 },
  { type: 'bonsai', x: 315, y: 240 },
  { type: 'bonsai', x: 150, y: 145 },
  { type: 'bonsai', x: 195, y: 115 },
  { type: 'bonsai', x: 210, y: 230 },
  { type: 'bonsai', x: 210, y: 190 },
  { type: 'bonsai', x: 515, y: 155 },
  { type: 'bonsai', x: 425, y: 125 },
  { type: 'bonsai', x: 425, y: 155 },
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
const NAV_CLEARANCE = 18;

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
  inspectQueue: [],
  dangerZone: null,
  suspiciousZone: null,
  inspectedIds: new Set(),
  chaseDelay: 0,
  navPath: [],
  navTargetKey: '',
  stuckTimer: 0,
  lastDogX: aiDog.x,
  lastDogY: aiDog.y,
  lastCatX: playerCat.x,
  lastCatY: playerCat.y,
};

const aiCatBrain = {
  hideTarget: null,
  navPath: [],
  navTargetKey: '',
  stuckTimer: 0,
  lastX: aiCat.x,
  lastY: aiCat.y,
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
  };
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
  if (!keys.has(key)) justPressed.add(key);
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
  pickManualSpawnPoints();
  items = generateItems();
  Object.assign(playerCat, makeEntity('cat', spawnPoints.playerCat.x, spawnPoints.playerCat.y));
  Object.assign(aiDog, makeEntity('dog', spawnPoints.aiDog.x, spawnPoints.aiDog.y));
  Object.assign(playerDog, makeEntity('dog', spawnPoints.playerDog.x, spawnPoints.playerDog.y));
  Object.assign(aiCat, makeEntity('cat', spawnPoints.aiCat.x, spawnPoints.aiCat.y));
  inspectLeft = 5;
  warmNavigationCache();
  resetAiDogBrain();
  resetAiCatBrain();
  startPlayerCatRound();
}

function pickManualSpawnPoints() {
  const shuffled = shuffle(manualNavNodes);
  spawnKeys.forEach((key, i) => {
    const pt = shuffled[i % shuffled.length] || { x: MAP / 2, y: MAP / 2 };
    spawnPoints[key].x = pt.x;
    spawnPoints[key].y = pt.y;
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
  const created = [];
  shuffle(manualBaseItems).forEach((base, index) => {
    const item = placeItem(base, created, index);
    if (item) created.push(item);
  });

  return created;
}

function placeItem(base, existing, index) {
  const typeName = base.type;
  const type = itemTypes[typeName];
  if (!type) return null;
  const wallRects = getWallCollisionRects();
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const imgKey = type.keys.includes(base.imgKey) ? base.imgKey : choice(type.keys);
    const size = getSpriteSize(imgKey);
    const variantScale = random(0.88, 1.16);
    const w = size.w * variantScale;
    const h = size.h * variantScale;
    const radius = 150 + attempt * 1.5;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    const x = clamp(base.x + Math.cos(angle) * dist, w / 2 + 60, MAP - w / 2 - 60);
    const y = clamp(base.y + Math.sin(angle) * dist, h / 2 + 60, MAP - h / 2 - 60);
    const item = {
      id: `${typeName}-${index}-${attempt}`,
      type: typeName,
      label: type.label,
      imgKey,
      x,
      y,
      w,
      h,
      scale: variantScale,
      angle: Number.isFinite(base.angle) ? base.angle : (Math.random() < 0.5 ? 0 : Math.PI / 2),
      region: 'manual',
      baseIndex: index,
      plannedX: base.x,
      plannedY: base.y,
    };
    if (!spawnSafeZones.some((rect) => rectOverlap(itemRect(item, 18), rect)) &&
        !existing.some((other) => rectOverlap(itemRect(item, 18), itemRect(other, 18))) &&
        !wallRects.some((rect) => rectOverlap(itemRect(item), rect))) {
      return item;
    }
  }
  return null;
}

function update(dt) {
  if (!gameStarted || outcome) return;

  roundTime -= dt;
  messageTimer = Math.max(0, messageTimer - dt);
  const human = getHuman();

  if (round === 'playerCatHide') {
    updateHuman(human, dt);
    updateAiDog(dt, playerCat);
    if (roundTime <= 0) startPlayerCatSeek();
  } else if (round === 'playerCatSeek') {
    updateHuman(human, dt);
    updateAiDog(dt, playerCat);
    if (catCaughtByDog(playerCat, aiDog, true)) endGame(false, '电脑狗找到了你，狗方获胜。');
    if (roundTime <= 0) startPlayerDogRound();
  } else if (round === 'playerDogWait') {
    updateAiCatHide(dt);
    if (roundTime <= 0) startPlayerDogSeek();
  } else if (round === 'playerDogSeek') {
    updateHuman(human, dt);
    if (catCaughtByDog(aiCat, playerDog, false)) endGame(true, '你撞到了没有伪装的电脑猫，玩家获胜。');
    if (roundTime <= 0) startPlayerCatRound();
  }

  justPressed.clear();
}

function updateHuman(entity, dt) {
  const speed = getSpeed(entity);
  moveEntity(entity, inputVector(), speed * dt);
  handleInteract(entity);
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
  if (target && !entity.disguised && entity.disguiseChance) {
    entity.disguised = true;
    entity.disguiseItem = target;
    entity.angle = target.angle;
    entity.disguiseChance = false;
    entity.canRestore = false;
    showMessage(`你伪装成了${target.label}。`, 2);
  }
}

function updateAiDog(dt, cat) {
  if (round === 'playerCatHide') return;

  aiCheckTimer -= dt;
  const dog = aiDog;
  const catMoved = distance({ x: aiDogBrain.lastCatX, y: aiDogBrain.lastCatY }, cat) > 4;
  const seesCat = dogCanCurrentlySeeCat(dog, cat);

  if (seesCat && !cat.disguised) {
    setAiMode('chase', cat);
  } else if (seesCat && catMoved) {
    if (aiDifficulty === 'easy') {
      aiDogBrain.chaseDelay += dt;
      if (aiDogBrain.chaseDelay >= 1) setAiMode('chase', cat);
    } else {
      setAiMode('chase', cat);
    }
  } else if (seesCat && cat.disguised) {
    prepareAiInspection(dog, cat);
  } else {
    aiDogBrain.chaseDelay = 0;
  }

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
    if (distance(dog, aiDogBrain.inspectTarget) < INSPECT_RADIUS && aiCheckTimer <= 0) {
      resolveAiInspection(cat);
    }
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
    inspectQueue: [],
    dangerZone: null,
    suspiciousZone: null,
    inspectedIds: new Set(),
    chaseDelay: 0,
    navPath: [],
    navTargetKey: '',
    stuckTimer: 0,
    lastDogX: aiDog.x,
    lastDogY: aiDog.y,
    lastCatX: playerCat.x,
    lastCatY: playerCat.y,
  });
}

function setAiMode(mode, target = null) {
  aiDogBrain.mode = mode;
  if (mode === 'chase') aiDogBrain.inspectTarget = null;
  if (target) aiTarget = target;
}

function moveAiDogToward(target, dt) {
  if (!target) return;
  const waypoint = getNavigationWaypoint(aiDog, target, aiDogBrain, aiDogBrain.mode);
  const desired = { x: waypoint.x - aiDog.x, y: waypoint.y - aiDog.y };
  const len = Math.hypot(desired.x, desired.y) || 1;
  moveEntity(aiDog, { x: desired.x / len, y: desired.y / len }, getSpeed(aiDog) * dt);

  const moved = distance(aiDog, { x: aiDogBrain.lastDogX, y: aiDogBrain.lastDogY });
  aiDogBrain.stuckTimer = moved < 0.5 ? aiDogBrain.stuckTimer + dt : 0;
  aiDogBrain.lastDogX = aiDog.x;
  aiDogBrain.lastDogY = aiDog.y;

  if (aiDogBrain.navPath.length && distance(aiDog, aiDogBrain.navPath[0]) < 34) {
    aiDogBrain.navPath.shift();
  }
  if (aiDogBrain.stuckTimer > 1.2) {
    aiDogBrain.navPath = [];
    aiDogBrain.navTargetKey = '';
    aiDogBrain.patrolTarget = null;
    aiDogBrain.stuckTimer = 0;
  }
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

  return brain.navPath[0] || target;
}

function prepareAiInspection(dog, cat) {
  if (aiDogBrain.mode === 'inspect' && aiDogBrain.inspectTarget) return;
  const visibleTargets = getInspectionTargetsAround(dog, DOG_VISION_RANGE, cat);
  const candidates = getInspectionCandidates(visibleTargets, cat);
  if (!candidates.length) return;
  aiDogBrain.inspectQueue = candidates;
  aiDogBrain.inspectTarget = candidates[0];
  aiDogBrain.mode = 'inspect';
}

function getInspectionCandidates(visibleTargets, cat) {
  if (aiDifficulty === 'hard') {
    const abnormal = visibleTargets
      .filter((item) => isAbnormalInspectionTarget(item))
      .filter((item) => !aiDogBrain.inspectedIds.has(getInspectionMemoryKey(item)));
    if (abnormal.length) return abnormal.sort((a, b) => distance(a, aiDog) - distance(b, aiDog));
  }

  const unfinished = aiDogBrain.inspectQueue
    .filter((item) => visibleTargets.some((target) => sameInspectionTarget(target, item)));
  if (unfinished.length && aiDifficulty !== 'easy') return unfinished;

  const shuffled = visibleTargets
    .filter((item) => aiDifficulty === 'easy' || !aiDogBrain.inspectedIds.has(getInspectionMemoryKey(item)))
    .sort(() => Math.random() - 0.5);
  const disguiseTarget = getCatDisguiseInspectionTarget(cat);
  if (disguiseTarget && Math.random() < 0.24) shuffled.unshift(disguiseTarget);
  return uniqueInspectionTargets(shuffled).slice(0, aiDifficulty === 'easy' ? 2 : 4);
}

function resolveAiInspection(cat) {
  aiCheckTimer = 1.2;
  const checked = aiDogBrain.inspectTarget;
  aiDogBrain.inspectedIds.add(getInspectionMemoryKey(checked));
  if (isCatDisguiseInspectionTarget(checked, cat)) {
    endGame(false, '电脑狗查验了你的伪装，狗方获胜。');
    return;
  }

  rememberAiDangerZone(checked, cat);
  aiDogBrain.inspectQueue = aiDogBrain.inspectQueue.filter((item) => !sameInspectionTarget(item, checked));
  aiDogBrain.inspectTarget = aiDogBrain.inspectQueue[0] || null;
  aiDogBrain.mode = aiDogBrain.inspectTarget ? 'inspect' : 'patrol';
}

function rememberAiDangerZone(checkedItem, cat) {
  if (aiDifficulty === 'easy' || !checkedItem) return;
  const targetsInVision = getInspectionTargetsAround(aiDog, DOG_VISION_RANGE, cat);
  const remainingIds = targetsInVision
    .filter((item) => !sameInspectionTarget(item, checkedItem))
    .map(getInspectionMemoryKey);
  const zone = {
    x: aiDog.x,
    y: aiDog.y,
    itemCount: targetsInVision.length,
    remainingIds: new Set(remainingIds),
  };

  aiDogBrain.dangerZone = zone;
}

function getAiPatrolTarget() {
  const target = aiDogBrain.patrolTarget;
  if (target && distance(aiDog, target) > 70 && Math.random() > 0.01) return target;

  if (aiDifficulty !== 'easy' && aiDogBrain.dangerZone) {
    const currentCount = getInspectionTargetsAround(aiDogBrain.dangerZone, DOG_VISION_RANGE, playerCat).length;
    if (currentCount === aiDogBrain.dangerZone.itemCount) {
      if (resumeDangerZoneInspection(playerCat)) return aiDogBrain.inspectTarget;
      aiDogBrain.patrolTarget = randomPointNear(aiDogBrain.dangerZone, 140);
      return aiDogBrain.patrolTarget;
    }
    if (aiDifficulty === 'hard' && currentCount < aiDogBrain.dangerZone.itemCount) {
      aiDogBrain.suspiciousZone = {
        x: aiDogBrain.dangerZone.x,
        y: aiDogBrain.dangerZone.y,
        r: getSpeed({ disguised: true, kind: 'cat' }) * HIDE_SECONDS,
      };
    }
    aiDogBrain.dangerZone = null;
    aiDogBrain.inspectQueue = [];
    aiDogBrain.inspectTarget = null;
  }

  if (aiDifficulty === 'hard') {
    if (aiDogBrain.suspiciousZone) {
      aiDogBrain.patrolTarget = randomPointNear(aiDogBrain.suspiciousZone, aiDogBrain.suspiciousZone.r);
      return aiDogBrain.patrolTarget;
    }
    aiDogBrain.patrolTarget = getDenseItemAreaTarget();
    return aiDogBrain.patrolTarget;
  }

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

function sameInspectionTarget(a, b) {
  return getInspectionMemoryKey(a) === getInspectionMemoryKey(b);
}

function isCatDisguiseInspectionTarget(target, cat) {
  if (!target || !cat.disguised || !cat.disguiseItem) return false;
  if (target.id !== cat.disguiseItem.id) return false;
  return target.isDisguiseCandidate || distance(target, cat) < INSPECT_RADIUS;
}

function resumeDangerZoneInspection(cat) {
  const zone = aiDogBrain.dangerZone;
  if (!zone || !zone.remainingIds || !zone.remainingIds.size) return false;
  const candidates = getInspectionTargetsAround(zone, DOG_VISION_RANGE, cat)
    .filter((item) => zone.remainingIds.has(getInspectionMemoryKey(item)))
    .filter((item) => !aiDogBrain.inspectedIds.has(getInspectionMemoryKey(item)))
    .sort((a, b) => distance(a, aiDog) - distance(b, aiDog));
  if (!candidates.length) return false;
  aiDogBrain.inspectQueue = candidates;
  aiDogBrain.inspectTarget = candidates[0];
  aiDogBrain.mode = 'inspect';
  return true;
}

function getRandomPatrolPoint() {
  for (let i = 0; i < 40; i += 1) {
    const x = random(100, MAP - 100);
    const y = random(100, MAP - 100);
    if (isNavigationPointClear(x, y)) return { x, y };
  }
  return { x: MAP / 2, y: MAP / 2 };
}

function randomPointNear(center, radius) {
  for (let i = 0; i < 24; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    const point = {
      x: clamp(center.x + Math.cos(angle) * dist, 40, MAP - 40),
      y: clamp(center.y + Math.sin(angle) * dist, 40, MAP - 40),
    };
    if (isNavigationPointClear(point.x, point.y)) return point;
  }
  return getRandomPatrolPoint();
}

function getDenseItemAreaTarget() {
  if (!items.length) return getRandomPatrolPoint();
  return items
    .map((item) => ({ x: item.x, y: item.y, count: items.filter((other) => distance(item, other) < 320).length }))
    .sort((a, b) => b.count - a.count)[0];
}

function getAbnormalItems() {
  return getInspectionTargetsAround(aiDog, DOG_VISION_RANGE, playerCat)
    .filter((item) => isAbnormalInspectionTarget(item));
}

function isAbnormalInspectionTarget(item) {
  if (!item) return false;
  if (item.isDisguiseCandidate) return true;
  return !isBasePlannedItem(item);
}

function isBasePlannedItem(item) {
  return Number.isInteger(item.baseIndex) &&
    item.type === manualBaseItems[item.baseIndex]?.type &&
    distance(item, { x: item.plannedX, y: item.plannedY }) <= BASE_ITEM_MATCH_RADIUS;
}

function resetAiCatBrain() {
  Object.assign(aiCatBrain, {
    hideTarget: null,
    navPath: [],
    navTargetKey: '',
    stuckTimer: 0,
    lastX: aiCat.x,
    lastY: aiCat.y,
  });
}

function updateAiCatHide(dt) {
  if (!aiCatBrain.hideTarget || aiCat.disguised) return;
  const waypoint = getNavigationWaypoint(aiCat, aiCatBrain.hideTarget, aiCatBrain, 'hide');
  const desired = { x: waypoint.x - aiCat.x, y: waypoint.y - aiCat.y };
  const len = Math.hypot(desired.x, desired.y) || 1;
  moveEntity(aiCat, { x: desired.x / len, y: desired.y / len }, getSpeed(aiCat) * dt);

  if (aiCatBrain.navPath.length && distance(aiCat, aiCatBrain.navPath[0]) < 30) {
    aiCatBrain.navPath.shift();
  }

  const moved = distance(aiCat, { x: aiCatBrain.lastX, y: aiCatBrain.lastY });
  aiCatBrain.stuckTimer = moved < 0.5 ? aiCatBrain.stuckTimer + dt : 0;
  aiCatBrain.lastX = aiCat.x;
  aiCatBrain.lastY = aiCat.y;
  if (aiCatBrain.stuckTimer > 1.2) {
    aiCatBrain.navPath = [];
    aiCatBrain.navTargetKey = '';
    aiCatBrain.stuckTimer = 0;
  }
}

function findNavigationPath(start, goal) {
  const graph = getNavigationGraph();
  const baseNodes = graph.nodes;
  const nodes = [{ x: start.x, y: start.y }, ...baseNodes, { x: goal.x, y: goal.y }];
  const startIndex = 0;
  const goalIndex = nodes.length - 1;
  const graphOffset = 1;
  const adjacency = Array.from({ length: nodes.length }, () => []);

  graph.edges.forEach((edges, index) => {
    adjacency[index + graphOffset] = edges.map((edge) => ({
      to: edge.to + graphOffset,
      cost: edge.cost,
    }));
  });

  if (canTravelDirect(start, goal)) {
    adjacency[startIndex].push({ to: goalIndex, cost: distance(start, goal) });
  }

  baseNodes.forEach((node, index) => {
    const nodeIndex = index + graphOffset;
    if (canTravelDirect(start, node)) {
      const cost = distance(start, node);
      adjacency[startIndex].push({ to: nodeIndex, cost });
      adjacency[nodeIndex].push({ to: startIndex, cost });
    }
    if (canTravelDirect(goal, node)) {
      const cost = distance(goal, node);
      adjacency[goalIndex].push({ to: nodeIndex, cost });
      adjacency[nodeIndex].push({ to: goalIndex, cost });
    }
  });

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
    if (current === -1 || current === goalIndex) break;
    visited.add(current);

    adjacency[current].forEach((edge) => {
      if (visited.has(edge.to)) return;
      const cost = dist[current] + edge.cost;
      if (cost < dist[edge.to]) {
        dist[edge.to] = cost;
        prev[edge.to] = current;
      }
    });
  }

  if (!Number.isFinite(dist[goalIndex])) {
    const nearest = getNearestReachableNavNode(start, goal);
    return nearest ? [nearest] : [];
  }

  const path = [];
  for (let i = goalIndex; i !== -1 && i !== startIndex; i = prev[i]) {
    path.unshift(nodes[i]);
  }
  return path;
}

function warmNavigationCache() {
  getWallCollisionRects();
  getNavigationGraph();
}

function getNavigationGraph() {
  if (navGraphCache) return navGraphCache;

  const nodes = getNavigationNodes();
  const edges = nodes.map(() => []);
  manualNavEdges.forEach(([from, to]) => {
    const a = nodes[from];
    const b = nodes[to];
    if (!a || !b || !canTravelDirect(a, b)) return;
    const cost = distance(a, b);
    edges[from].push({ to, cost });
    edges[to].push({ to: from, cost });
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
  const steps = Math.max(2, Math.ceil(length / 24));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    if (!isNavigationPointClear(x, y)) return false;
  }
  return true;
}

function isNavigationPointClear(x, y) {
  const probe = {
    x: x - NAV_CLEARANCE,
    y: y - NAV_CLEARANCE,
    w: NAV_CLEARANCE * 2,
    h: NAV_CLEARANCE * 2,
  };
  if (x <= NAV_CLEARANCE || x >= MAP - NAV_CLEARANCE || y <= NAV_CLEARANCE || y >= MAP - NAV_CLEARANCE) return false;
  return !getWallCollisionRects().some((rect) => rectOverlap(probe, rect));
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

function collides(entity, sourceEntity = entity) {
  const circleRect = { x: entity.x - entity.r, y: entity.y - entity.r, w: entity.r * 2, h: entity.r * 2 };
  if (getWallCollisionRects().some((rect) => rectOverlap(circleRect, rect))) return true;
  if (items.some((item) => {
    if (sourceEntity.disguised && sourceEntity.disguiseItem && item.id === sourceEntity.disguiseItem.id) return false;
    return rectOverlap(circleRect, itemHitRect(item, -10));
  })) return true;
  return getDisguiseCollisionRects(sourceEntity).some((rect) => rectOverlap(circleRect, rect));
}

function getSpeed(entity) {
  if (entity.disguised) return 52;
  return entity.kind === 'dog' ? 104 : 78;
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
  aiDogBrain.mode = 'patrol';
  aiDogBrain.inspectTarget = null;
  aiDogBrain.inspectQueue = [];
  aiDogBrain.chaseDelay = 0;
  aiDogBrain.lastCatX = playerCat.x;
  aiDogBrain.lastCatY = playerCat.y;
  aiTarget = null;
  showMessage('你是猫：15 秒内寻找家具，按 Enter 伪装。', 3);
}

function startPlayerCatSeek() {
  round = 'playerCatSeek';
  roundTime = SEEK_SECONDS;
  aiTarget = null;
  showMessage('电脑狗开始搜寻，坚持 100 秒即可进入下一局。', 3);
}

function startPlayerDogRound() {
  round = 'playerDogWait';
  roundTime = HIDE_SECONDS;
  inspectLeft = 5;
  Object.assign(aiCat, makeEntity('cat', spawnPoints.aiCat.x, spawnPoints.aiCat.y));
  aiCat.disguised = false;
  aiCat.disguiseItem = null;
  aiCat.disguiseChance = true;
  resetAiCatBrain();
  aiCatBrain.hideTarget = choice(items.filter((item) => item.type !== 'bed' || item.region !== 'living'));
  showMessage('你是狗：电脑猫正在躲藏，15 秒后开始搜寻。', 3);
}

function startPlayerDogSeek() {
  const target = aiCatBrain.hideTarget || choice(items.filter((item) => item.type !== 'bed' || item.region !== 'living'));
  if (distance(aiCat, target) > DISGUISE_RADIUS) {
    aiCat.x = target.x;
    aiCat.y = target.y;
  }
  aiCat.disguised = true;
  aiCat.disguiseItem = target;
  aiCat.angle = target.angle;
  aiCat.disguiseChance = false;
  round = 'playerDogSeek';
  roundTime = SEEK_SECONDS;
  showMessage('开始抓猫：靠近可疑家具按 Enter 查验。', 3);
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
  drawItems(human);
  drawEntity(aiCat, human, camX, camY, viewW, viewH);
  drawEntity(playerCat, human, camX, camY, viewW, viewH);
  drawEntity(aiDog, human, camX, camY, viewW, viewH);
  drawEntity(playerDog, human, camX, camY, viewW, viewH);
  drawDogAlert(aiDog, playerCat);
  drawDogAlert(playerDog, aiCat);
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
  return { x: wall.x, y: wall.y, w: wall.w, h: wall.h };
}

function getDisguiseCollisionRects(sourceEntity) {
  return [playerCat, aiCat, playerDog, aiDog]
    .filter((actor) => actor !== sourceEntity && actor.disguised && actor.disguiseItem)
    .map((actor) => itemHitRect({ ...actor.disguiseItem, x: actor.x, y: actor.y }));
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
  const near = nearestItem(human, round === 'playerDogSeek' ? INSPECT_RADIUS : DISGUISE_RADIUS);
  items.forEach((item) => {
    const isNear = near && near.id === item.id;
    if (isNear && (round === 'playerCatHide' || round === 'playerDogSeek')) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = round === 'playerDogSeek' ? '#ffdd66' : '#67ffe0';
      const rect = itemHitRect(item, 14);
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
    drawItemSprite(item);
  });
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
    const rect = itemHitRect({ ...entity.disguiseItem, x: entity.x, y: entity.y });
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

function drawDogAlert(dog, cat) {
  if (!dogCanCurrentlySeeCat(dog, cat)) return;

  ctx.save();
  ctx.translate(dog.x, dog.y - PLAYER_SIZE - 16);
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
  ctx.fillStyle = 'rgba(12, 14, 22, 0.76)';
  ctx.fillRect(16, 16, Math.min(520, w - 32), 96);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.strokeRect(16, 16, Math.min(520, w - 32), 96);
  ctx.fillStyle = '#f8f1df';
  ctx.font = '700 20px Trebuchet MS, Arial';
  ctx.fillText(title, 32, 48);
  ctx.font = '15px Trebuchet MS, Arial';
  ctx.fillStyle = '#d9ccb9';
  const time = Math.max(0, Math.ceil(roundTime));
  const inspect = round === 'playerDogSeek' ? `  查验：${inspectLeft}/5` : '';
  ctx.fillText(`剩余时间：${time}s  电脑难度：${difficultyLabel}${inspect}`, 32, 75);
  ctx.fillText(getHint(), 32, 98);

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
    if (playerCat.disguised && playerCat.canRestore) return 'Enter 恢复猫形态，之后可重新伪装；Q/E 旋转伪装物';
    if (playerCat.disguised) return '已伪装，Q/E 可转向，躲到不显眼的位置';
    return '靠近发光家具按 Enter 伪装';
  }
  if (round === 'playerCatSeek' && !playerCat.disguised && playerCat.disguiseChance) return '还没伪装：靠近家具仍可按 Enter 伪装，但别被狗碰到';
  if (round === 'playerDogSeek') return '小地图在右上角，靠近可疑家具按 Enter 查验';
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
  ctx.fillStyle = '#80a0ff';
  ctx.beginPath();
  ctx.arc(x + human.x * s, y + human.y * s, 5, 0, Math.PI * 2);
  ctx.fill();
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
  return {
    x: item.x + hitbox.x * scale - pad,
    y: item.y + hitbox.y * scale - pad,
    w: hitbox.w * scale + pad * 2,
    h: hitbox.h * scale + pad * 2,
  };
}

function itemRect(item, pad = 0) {
  return { x: item.x - item.w / 2 - pad, y: item.y - item.h / 2 - pad, w: item.w + pad * 2, h: item.h + pad * 2 };
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
