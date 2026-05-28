// ===== 异魔入侵 - main.js =====

// ===== 兵种数据 =====
const UNIT_DEFS = [
  // Guard - 只攻击阵营（素材大小 3）
  { id:'guard1', name:'前排卫士',   type:'guard',  icon:'assets/monster/guard/Icon9.webp',   hp:10, speed:0.8, dmg:5,  atkInterval:3,   range:0,   cost:6,  sizeScale:2 },
  { id:'guard2', name:'铁甲卫士',   type:'guard',  icon:'assets/monster/guard/Icon15.webp',  hp:16, speed:0.8, dmg:5,  atkInterval:3,   range:0,   cost:7,  sizeScale:2 },
  { id:'guard3', name:'突刺卫士',   type:'guard',  icon:'assets/monster/guard/Icon19.webp',  hp:8,  speed:0.8,   dmg:10, atkInterval:3,   range:0,   cost:6,  sizeScale:2 },
  { id:'guard4', name:'重装卫士',   type:'guard',  icon:'assets/monster/guard/Icon20.webp',  hp:20, speed:0.8, dmg:10, atkInterval:3,   range:0,   cost:9,  sizeScale:2.5 },
  // Rush - 攻击敌人和阵营（素材大小 1）
  { id:'rush1',  name:'突击者',     type:'rush',   icon:'assets/monster/rush/Icon26.webp',   hp:5,  speed:1,   dmg:2,  atkInterval:1,   range:0,   cost:4,  sizeScale:1 },
  { id:'rush2',  name:'快速突击者', type:'rush',   icon:'assets/monster/rush/Icon27.webp',   hp:5,  speed:1,   dmg:1,  atkInterval:1,   range:0,   cost:3,  sizeScale:1 },
  { id:'rush3',  name:'猛烈突击者', type:'rush',   icon:'assets/monster/rush/Icon31.webp',   hp:4,  speed:1,   dmg:3,  atkInterval:1,   range:0,   cost:4,  sizeScale:1 },
  { id:'rush4',  name:'闪电突击者', type:'rush',   icon:'assets/monster/rush/Icon33.webp',   hp:2,  speed:1,   dmg:1,  atkInterval:0.5, range:0,   cost:2,  sizeScale:1 },
  // Range - 攻击敌人和阵营（素材大小 2）
  { id:'range1', name:'远程射手',   type:'range',  icon:'assets/monster/range/Icon4.webp',   hp:1,  speed:0.3,   dmg:2,  atkInterval:4,   range:8,   cost:2,  sizeScale:1 },
  { id:'range2', name:'强力射手',   type:'range',  icon:'assets/monster/range/Icon5.webp',   hp:2,  speed:0.5,   dmg:3,  atkInterval:4,   range:12,  cost:4,  sizeScale:1 },
  { id:'range3', name:'精准射手',   type:'range',  icon:'assets/monster/range/Icon17.webp',  hp:4,  speed:0.7,   dmg:4,  atkInterval:4,   range:5,   cost:3,  sizeScale:1 },
  { id:'range4', name:'连射射手',   type:'range',  icon:'assets/monster/range/Icon22.webp',  hp:3,  speed:0.5, dmg:3,  atkInterval:3,   range:9,   cost:3,  sizeScale:1 },
  // Caster - 范围伤害（素材大小 2）
  { id:'caster1',name:'毒液',     type:'caster', icon:'assets/monster/caster/Icon34.webp', hp:2,  speed:0.5, dmg:2,  atkInterval:1,   range:2,   cost:3, aoeW:2, aoeH:2, sizeScale:1 },
  { id:'caster2',name:'火蜥',     type:'caster', icon:'assets/monster/caster/Icon28.webp', hp:3,  speed:0.5, dmg:4,  atkInterval:1,   range:4,   cost:5, aoeW:3, aoeH:3, sizeScale:1 },
  // Swarm - 召唤小兵（素材大小 1）
  { id:'swarm1', name:'祭司',     type:'swarm',  icon:'assets/monster/swarm/Icon44.webp',  hp:3,  speed:0.2,   dmg:0,  atkInterval:5,   range:0,   cost:5,  sizeScale:1.5,
    summonCount:2, summonHp:1, summonSpeed:1, summonDmg:1, summonInterval:1,
    summonIcon:'assets/monster/swarm/Icon2.webp' },
  { id:'swarm2', name:'虫师',     type:'swarm',  icon:'assets/monster/swarm/Icon29.webp',  hp:3,  speed:0.2,   dmg:0,  atkInterval:10,   range:0,   cost:7,  sizeScale:1.5,
      summonCount:5, summonHp:1, summonSpeed:1, summonDmg:1, summonInterval:1,
      summonIcon:'assets/monster/swarm/Icon42.webp' },
  { id:'swarm3', name:'圣鹿',     type:'swarm',  icon:'assets/monster/swarm/Icon32.webp',  hp:5,  speed:0.2,   dmg:0,  atkInterval:10,   range:0,   cost:8,  sizeScale:1.5,
        summonCount:3, summonHp:4, summonSpeed:1, summonDmg:2, summonInterval:1,
        summonIcon:'assets/monster/swarm/Icon18.webp' },
  { id:'swarm4', name:'地狱犬',     type:'swarm',  icon:'assets/monster/swarm/Icon35.webp',  hp:4,  speed:0.2,   dmg:0,  atkInterval:10,   range:0,   cost:7,  sizeScale:1.5,
          summonCount:3, summonHp:5, summonSpeed:2, summonDmg:1, summonInterval:1,
          summonIcon:'assets/monster/swarm/Icon36.webp' },
  // Turret - 穿透远程攻击（素材大小 2）
  { id:'turret1',name:'攻城器',     type:'turret', icon:'assets/monster/siege/Icon3.webp',   hp:10, speed:0.2, dmg:10, atkInterval:8,   range:12,  cost:7,  sizeScale:2 },
  { id:'turret2',name:'强力攻城器', type:'turret', icon:'assets/monster/siege/Icon8.webp',   hp:10, speed:0.2, dmg:20, atkInterval:10,   range:12,  cost:9,  sizeScale:2 },
  { id:'turret3',name:'摧毁者',     type:'turret', icon:'assets/monster/siege/Icon13.webp',  hp:10, speed:0.2, dmg:50, atkInterval:12,   range:12,  cost:9,  sizeScale:2 },
  { id:'turret4',name:'毁灭者',     type:'turret', icon:'assets/monster/siege/Icon14.webp',  hp:20, speed:0.2, dmg:100, atkInterval:18,   range:12,  cost:14,  sizeScale:2 },
];

const TYPE_LABELS = { guard:'前排', rush:'突击', range:'远程', caster:'法术', swarm:'召唤', turret:'炮塔' };

// ===== 地图常量 =====
const COLS = 8;   // 道路横向格子数
const ROWS = 12;  // 道路纵向格子数（不含炮塔区/HUD区）
const ROAD_COL_START = 0;
const ROAD_COL_END   = COLS - 1;
const CAMP_ROW_START = 10; // 阵营/炮塔区起始行
const ENEMY_SPAWN_ROW = 0;
const MIDLINE_ROW = 5;    // 友军停止前进的行
const ALLY_DEPLOY_ROW = CAMP_ROW_START + 1;
const TURRET_DEPLOY_ROW = CAMP_ROW_START + 0.5;

// ===== 透视地图参数（逻辑分辨率 755×1240）=====
// 道路梯形：顶部窄（远处），底部宽（近处）
const MAP_W = 755;
const MAP_H = 1240;
const ROAD_TOP_Y    = 0;          // 道路顶部 y
const ROAD_BOT_Y    = 1240;       // 道路底部 y（延伸到画幅底部）
const ROAD_TOP_LEFT = 190;        // 道路顶部左边 x
const ROAD_TOP_RIGHT= 565;        // 道路顶部右边 x（顶宽 375px ≈ 50%）
const ROAD_BOT_LEFT = 20;         // 道路底部左边 x
const ROAD_BOT_RIGHT= 735;        // 道路底部右边 x（底宽 715px ≈ 95%）
const TURRET_ZONE_Y = 1240;       // 不再使用，保留兼容
const TURRET_ZONE_H = 0;
const HUD_ZONE_Y    = 1240;       // 不再绘制 HUD 遮罩

// 根据行号(0~ROWS)计算该行在梯形内的 y 坐标和左右边界
function rowToY(row) {
  return ROAD_TOP_Y + (ROAD_BOT_Y - ROAD_TOP_Y) * (row / ROWS);
}
function rowToLeftX(row) {
  const t = row / ROWS;
  return ROAD_TOP_LEFT + (ROAD_BOT_LEFT - ROAD_TOP_LEFT) * t;
}
function rowToRightX(row) {
  const t = row / ROWS;
  return ROAD_TOP_RIGHT + (ROAD_BOT_RIGHT - ROAD_TOP_RIGHT) * t;
}

// 单位格子坐标 → 像素坐标（透视映射）
function gridToPixel(col, row) {
  const y = rowToY(row + 0.5);
  const lx = rowToLeftX(row + 0.5);
  const rx = rowToRightX(row + 0.5);
  const x = lx + (rx - lx) * ((col + 0.5) / COLS);
  return { x, y };
}

// 单位在该行的格子宽度（用于缩放大小）
function gridCellWidth(row) {
  return (rowToRightX(row + 0.5) - rowToLeftX(row + 0.5)) / COLS;
}
function gridCellHeight() {
  return (ROAD_BOT_Y - ROAD_TOP_Y) / ROWS;
}

const UNIT_COL_MIN = ROAD_COL_START + 0.4;
const UNIT_COL_MAX = ROAD_COL_END - 0.4;

function unitFootprintRadius(u) {
  return gridCellWidth(u.row) * 0.45 * (u.sizeScale || 1);
}

function clampUnitGrid(u) {
  u.col = Math.max(UNIT_COL_MIN, Math.min(UNIT_COL_MAX, u.col));
  if (u.side === 'ally') {
    if (u.type === 'turret') return;
    const minRow = u.isSummon ? ENEMY_SPAWN_ROW : MIDLINE_ROW;
    if (u.row < minRow) u.row = minRow;
  } else if (u.row > CAMP_ROW_START - 0.5) {
    u.row = CAMP_ROW_START - 0.5;
  }
}

function pickSpawnPosition(units, baseRow, sizeScale) {
  const rowOffsets = [0, 0.4, 0.8, -0.35];
  let best = { col: ROAD_COL_START + 1, row: baseRow, score: -1 };
  const minWant = unitFootprintRadius({ row: baseRow, sizeScale }) * 1.6;

  for (const dr of rowOffsets) {
    const row = baseRow + dr;
    for (let c = ROAD_COL_START + 1; c < ROAD_COL_END; c++) {
      const { x, y } = gridToPixel(c, row);
      let minD = Infinity;
      for (const u of units) {
        if (u.dead) continue;
        if (Math.abs(u.row - row) > 2.2) continue;
        minD = Math.min(minD, Math.hypot(x - u.px(), y - u.py()));
      }
      const score = minD === Infinity ? 9999 : minD;
      if (score > best.score) best = { col: c, row, score };
    }
  }
  if (best.score < minWant) {
    best.row = baseRow + (Math.random() - 0.5) * 0.9;
    best.col = UNIT_COL_MIN + Math.random() * (UNIT_COL_MAX - UNIT_COL_MIN);
  }
  return best;
}

function resolveUnitOverlap(a, b, dt) {
  if (a.dead || b.dead || a.id === b.id) return;
  if (a.type === 'turret' || b.type === 'turret') return;

  let dx = a.px() - b.px();
  let dy = a.py() - b.py();
  let dist = Math.hypot(dx, dy);
  if (dist < 1) {
    const seed = (a.id * 13 + b.id * 7) % 360;
    const rad = (seed * Math.PI) / 180;
    dx = Math.cos(rad);
    dy = Math.sin(rad);
    dist = 1;
  }

  const minDist = (unitFootprintRadius(a) + unitFootprintRadius(b)) * 0.92;
  if (dist >= minDist) return;

  const overlap = (minDist - dist) / dist;
  const cellW = gridCellWidth((a.row + b.row) / 2);
  const cellH = gridCellHeight();
  const push = Math.min(overlap * 2.8 * dt, overlap * 0.45);
  const colPush = (dx * push) / cellW;
  const rowPush = (dy * push) / cellH * 0.4;

  a.col += colPush;
  a.row += rowPush;
  b.col -= colPush;
  b.row -= rowPush;
}

function applyUnitSeparation(units, dt) {
  const list = units.filter(u => !u.dead && u.type !== 'turret');
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      resolveUnitOverlap(list[i], list[j], dt);
    }
  }
  for (const u of list) clampUnitGrid(u);
}

// ===== Canvas =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const canvasWrapper = document.getElementById('canvasWrapper');
const LOGIC_W = MAP_W;
const LOGIC_H = MAP_H;

function disableSmoothing(context) {
  context.imageSmoothingEnabled = false;
  if ('webkitImageSmoothingEnabled' in context) context.webkitImageSmoothingEnabled = false;
  if ('mozImageSmoothingEnabled' in context) context.mozImageSmoothingEnabled = false;
}

function crispDraw(context, img, dx, dy, dw, dh, sx, sy, sw, sh) {
  const x = Math.round(dx);
  const y = Math.round(dy);
  const w = Math.max(1, Math.round(dw));
  const h = Math.max(1, Math.round(dh));
  if (sx !== undefined) {
    context.drawImage(
      img,
      Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh),
      x, y, w, h
    );
  } else {
    context.drawImage(img, x, y, w, h);
  }
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(LOGIC_W * dpr);
  canvas.height = Math.round(LOGIC_H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  disableSmoothing(ctx);
}
window.addEventListener('resize', () => { resizeCanvas(); resizePortalCanvas(); });
resizeCanvas();

function cw() { return LOGIC_W / COLS; }
function ch() { return (ROAD_BOT_Y - ROAD_TOP_Y) / ROWS; }

// ===== 图片缓存 =====
const IMGS = {};
function getImg(src) {
  if (IMGS[src]) return IMGS[src];
  const cache = window.__imageCache || {};
  const el = new Image();
  el.src = cache[src] || src;
  IMGS[src] = el;
  return el;
}

const TURRET_LASER_IMG = 'assets/monster/siege/3_3.webp';
const TURRET_LASER_FRAMES = 6; // 576×96 → 6×96 帧
const HIT_EFFECT_FRAMES = Array.from({ length: 10 }, (_, i) => `assets/attack/Explosion_${i + 1}.webp`);
const LAND_DECOR_ASSETS = [
  'assets/land/tree_1.webp',
  'assets/land/tree_2.webp',
  'assets/land/tree_3.webp',
  'assets/land/tree_7.webp',
  'assets/land/tree_8.webp',
  'assets/land/greenery_1.webp',
  'assets/land/greenery_2.webp',
  'assets/land/greenery_3.webp',
  'assets/land/greenery_4.webp',
  'assets/land/greenery_9.webp',
  'assets/land/decor_6.webp',
  'assets/land/building_1.webp',
  'assets/land/building_2.webp',
  'assets/land/building_3.webp',
  'assets/land/building_4.webp',
  'assets/land/building_5.webp',
];
const LAND_DECORATIONS = [
  { src:'assets/land/tree_2.webp', side:'left',  y:60,   w:84,  offset:18 },
  { src:'assets/land/greenery_9.webp', side:'right', y:88,   w:56,  offset:12 },
  { src:'assets/land/greenery_2.webp', side:'left',  y:135,  w:34,  offset:54 },
  { src:'assets/land/building_3.webp', side:'right', y:170,  w:86,  offset:24 },
  { src:'assets/land/greenery_1.webp', side:'left',  y:230,  w:42,  offset:18 },
  { src:'assets/land/decor_6.webp', side:'right', y:258,  w:46,  offset:62 },
  { src:'assets/land/tree_1.webp', side:'right', y:330,  w:92,  offset:8 },
  { src:'assets/land/decor_6.webp', side:'left',  y:390,  w:54,  offset:28 },
  { src:'assets/land/greenery_4.webp', side:'right', y:430,  w:44,  offset:46 },
  { src:'assets/land/building_5.webp', side:'left',  y:510,  w:112, offset:22 },
  { src:'assets/land/greenery_3.webp', side:'right', y:575,  w:50,  offset:16 },
  { src:'assets/land/tree_3.webp', side:'left',  y:630,  w:66,  offset:58 },
  { src:'assets/land/tree_7.webp', side:'right', y:720,  w:82,  offset:14 },
  { src:'assets/land/greenery_4.webp', side:'left',  y:785,  w:50,  offset:20 },
  { src:'assets/land/building_4.webp', side:'right', y:795,  w:88,  offset:72 },
  { src:'assets/land/building_2.webp', side:'right', y:885,  w:130, offset:18 },
  { src:'assets/land/tree_3.webp', side:'left',  y:980,  w:72,  offset:10 },
  { src:'assets/land/greenery_9.webp', side:'left',  y:1045, w:58,  offset:72 },
  { src:'assets/land/greenery_2.webp', side:'right', y:1100, w:38,  offset:24 },
  { src:'assets/land/tree_8.webp', side:'left',  y:1125, w:96,  offset:0 },
  { src:'assets/land/building_1.webp', side:'right', y:1128, w:118, offset:58 },
];

// 预加载
[
  'assets/land/bg.webp',
  'assets/land/road.webp',
  'assets/land/road_l.webp',
  'assets/land/road_r.webp',
  ...LAND_DECOR_ASSETS,
  'assets/monster/Icon39.webp','assets/Portal1_Idle.webp',
  'assets/10.webp',
  'assets/11.webp',
  'assets/20.webp',
  ...HIT_EFFECT_FRAMES,
  ...Array.from({length:8},(_,i)=>`assets/fire/Fire Spell_Frame_0${i+1}.webp`),
  ...Array.from({length:10},(_,i)=>`assets/monster/caster/attack/Explosion_${i+1}.webp`),
  ...UNIT_DEFS.map(u=>u.icon),
  ...UNIT_DEFS.filter(u=>u.summonIcon).map(u=>u.summonIcon),
  TURRET_LASER_IMG,
].forEach(getImg);

// ===== Portal 点击区 =====
const portalCanvas = document.getElementById('portalCanvas');
const portalCtx = portalCanvas.getContext('2d');
let portalFrame = 0;
const PORTAL_TOTAL_FRAMES = 4; // 384/96 = 4帧
const PORTAL_CSS = 88;

function resizePortalCanvas() {
  const dpr = window.devicePixelRatio || 1;
  portalCanvas.width = Math.round(PORTAL_CSS * dpr);
  portalCanvas.height = Math.round(PORTAL_CSS * dpr);
  portalCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  disableSmoothing(portalCtx);
}

function drawPortal() {
  const pImg = getImg('assets/Portal1_Idle.webp');
  if (!pImg.complete || !pImg.naturalWidth) {
    // 图片未加载完，等加载完再画
    pImg.onload = drawPortal;
    return;
  }
  const fw = Math.floor(pImg.naturalWidth / PORTAL_TOTAL_FRAMES);
  const fh = pImg.naturalHeight;
  portalCtx.clearRect(0, 0, PORTAL_CSS, PORTAL_CSS);
  crispDraw(portalCtx, pImg, 0, 0, PORTAL_CSS, PORTAL_CSS, portalFrame * fw, 0, fw, fh);
}
resizePortalCanvas();

// ===== 特效系统 =====
const effects = [];
const projectiles = []; // 飞行火球（远程兵）
const laserBeams = [];  // 炮塔激光（仅表现 + 已在发射时结算伤害）

function addFireEffect(x, y, size) {
  effects.push({ type:'fire', x, y, size: size||60, frame:0, maxFrames:8, timer:0, interval:0.06 });
}
function addExplosionEffect(x, y, size) {
  effects.push({ type:'explosion', x, y, size: size||80, frame:0, maxFrames:10, timer:0, interval:0.05 });
}

// 发射直线飞行火球
// pierce: false = 碰到第一个敌人消失；true = 穿透，飞出画幅消失
// game 引用用于碰撞检测
function fireProjectile(fromX, fromY, size, dmg, pierce, gameRef) {
  projectiles.push({
    x: fromX, y: fromY,
    dirX: 0, dirY: -1,       // 朝正上方
    size: size || 40,
    speed: 1.0,
    dmg,
    pierce,
    gameRef,
    hitIds: new Set(),        // 已命中的单位 id（穿透时避免重复伤害）
    frame: 0,
    frameTimer: 0,
    frameInterval: 0.06,
    totalFrames: 8,
  });
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];

    // 推进帧动画
    p.frameTimer += dt;
    if (p.frameTimer >= p.frameInterval) {
      p.frameTimer -= p.frameInterval;
      p.frame = (p.frame + 1) % p.totalFrames;
    }

    // 直线移动
    const pixelSpeed = p.speed * gridCellHeight() * dt;
    p.x += p.dirX * pixelSpeed;
    p.y += p.dirY * pixelSpeed;

    // 飞出画幅则销毁
    if (p.y < -p.size || p.y > LOGIC_H + p.size ||
        p.x < -p.size || p.x > LOGIC_W + p.size) {
      projectiles.splice(i, 1);
      continue;
    }

    // 碰撞检测：遍历敌人
    const enemies = p.gameRef ? p.gameRef.enemies : [];
    let hit = false;
    for (const e of enemies) {
      if (e.dead) continue;
      if (p.hitIds.has(e.id)) continue;
      const ex = e.px(), ey = e.py();
      const hitRadius = (p.size + gridCellWidth(e.row) * 0.5) * 0.5;
      const dx = p.x - ex, dy = p.y - ey;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        e.takeDamage(p.dmg);
        p.hitIds.add(e.id);
        if (!p.pierce) { hit = true; break; }
      }
    }
    if (hit) {
      projectiles.splice(i, 1);
    }
  }
}

function drawProjectiles() {
  for (const p of projectiles) {
    const n = String(p.frame + 1).padStart(2, '0');
    const fireImg = getImg(`assets/fire/Fire Spell_Frame_${n}.webp`);
    if (!fireImg.complete || !fireImg.naturalWidth) continue;
    const s = p.size;
    ctx.save();
    disableSmoothing(ctx);
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.rotate(Math.PI / 2);
    const rs = Math.round(s);
    crispDraw(ctx, fireImg, -rs / 2, -rs / 2, rs, rs);
    ctx.restore();
  }
}

// 炮塔：从炮位垂直向上、长度 attackRange 的线段上瞬间结算伤害（穿透）
function applyTurretLaserDamage(beamX, yBottom, turretRow, beamLen, dmg, gameRef) {
  const yTop = yBottom - beamLen;
  for (const e of gameRef.enemies) {
    if (e.dead) continue;
    const ex = e.px(), ey = e.py();
    if (ey < yTop || ey > yBottom) continue;
    const halfHit =
      (gridCellWidth(turretRow) * 0.35 + gridCellWidth(e.row) * (e.sizeScale || 1) * 0.42);
    if (Math.abs(ex - beamX) > halfHit) continue;
    e.takeDamage(dmg);
  }
}

function spawnTurretLaserVisual(beamX, yBottom, row, beamLen) {
  laserBeams.push({
    x: beamX,
    yBottom,
    row,
    len: beamLen,
    frame: 0,
    frameTimer: 0,
    frameInterval: 0.055,
    maxFrames: TURRET_LASER_FRAMES,
  });
}

function fireTurretLaser(fromX, fromY, row, attackRange, dmg, gameRef) {
  applyTurretLaserDamage(fromX, fromY, row, attackRange, dmg, gameRef);
  spawnTurretLaserVisual(fromX, fromY, row, attackRange);
}

function updateLaserBeams(dt) {
  for (let i = laserBeams.length - 1; i >= 0; i--) {
    const b = laserBeams[i];
    b.frameTimer += dt;
    if (b.frameTimer >= b.frameInterval) {
      b.frameTimer -= b.frameInterval;
      b.frame++;
      if (b.frame >= b.maxFrames) laserBeams.splice(i, 1);
    }
  }
}

function drawLaserBeams() {
  const img = getImg(TURRET_LASER_IMG);
  if (!img.complete || !img.naturalWidth) return;
  const fw = Math.floor(img.naturalWidth / TURRET_LASER_FRAMES);
  const fh = img.naturalHeight;
  for (const b of laserBeams) {
    const drawW = Math.round(gridCellWidth(b.row) * 0.55);
    const top = Math.round(b.yBottom - b.len);
    const beamH = Math.round(b.len);
    ctx.save();
    ctx.globalAlpha = 0.94;
    disableSmoothing(ctx);
    crispDraw(ctx, img, Math.round(b.x) - drawW / 2, top, drawW, beamH, b.frame * fw, 0, fw, fh);
    ctx.restore();
  }
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.timer += dt;
    if (e.timer >= e.interval) {
      e.timer -= e.interval;
      e.frame++;
      if (e.frame >= e.maxFrames) { effects.splice(i, 1); }
    }
  }
}

function drawEffects() {
  for (const e of effects) {
    let src;
    if (e.type === 'fire') {
      const n = String(e.frame + 1).padStart(2, '0');
      src = `assets/fire/Fire Spell_Frame_${n}.webp`;
    } else {
      src = `assets/monster/caster/attack/Explosion_${e.frame + 1}.webp`;
    }
    const img = getImg(src);
    if (img.complete && img.naturalWidth) {
      const size = Math.round(e.size || 80);
      crispDraw(ctx, img, e.x - size / 2, e.y - size / 2, size, size);
    }
  }
}


// ===== 单位类 =====
let unitIdCounter = 0;

class Unit {
  constructor(def, col, row, side) {
    this.id = ++unitIdCounter;
    this.def = def;
    this.type = def.type;
    this.side = side; // 'ally' | 'enemy'
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.speed = def.speed;
    this.dmg = def.dmg;
    this.atkInterval = def.atkInterval;
    this.range = def.range || 0;
    this.icon = def.icon || 'assets/monster/Icon39.webp';
    // 位置（格子坐标，浮点）
    this.col = col;
    this.row = row;
    // 攻击计时
    this.atkTimer = 0;
    // 召唤计时
    this.summonTimer = 0;
    // 是否停止移动
    this.stopped = false;
    // 是否是召唤物
    this.isSummon = def.isSummon || false;
    // 死亡标记
    this.dead = false;
    // 受击特效
    this.hitEffectFrame = -1;
    this.hitEffectTimer = 0;
    // 尺寸倍数（boss/精英更大）
    this.sizeScale = def.sizeScale || 1;
  }

  // 格子中心像素坐标（透视映射）
  px() { return gridToPixel(this.col, this.row).x; }
  py() { return gridToPixel(this.col, this.row).y; }

  // 与另一单位的像素距离
  distTo(other) {
    const dx = this.px() - other.px();
    const dy = this.py() - other.py();
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 1单位攻击范围 = 小兵在当前行的显示尺寸
  rangeInPixels(row) {
    return gridCellWidth(row ?? this.row) * 0.85;
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    this.hitEffectFrame = 0;
    this.hitEffectTimer = 0;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  update(dt, game) {
    if (this.dead) return;
    this._updateHitEffect(dt);

    if (this.type === 'turret') {
      this._updateTurret(dt, game);
      return;
    }
    if (this.type === 'swarm') {
      this._updateSwarm(dt, game);
      return;
    }
    if (this.type === 'caster') {
      this._updateCaster(dt, game);
      return;
    }
    if (this.type === 'range') {
      this._updateRange(dt, game);
      return;
    }
    // guard / rush / summon
    this._updateMelee(dt, game);
  }

  _updateMelee(dt, game) {
    if (this.side === 'ally') {
      const target = this._findNearest(game.enemies);
      const meleeRange = this.rangeInPixels() * Math.max(this.range, 1.5);
      if (target && this.distTo(target) <= meleeRange) {
        // 射程内有敌人，停下攻击
        this._meleeAttack(dt, target, game);
      } else {
        // 召唤物继续向前推进；普通友军不超过中线。
        const stopRow = this.isSummon ? ENEMY_SPAWN_ROW : MIDLINE_ROW;
        if (this.row > stopRow) {
          this.row -= this.speed * dt;
          if (this.row < stopRow) this.row = stopRow;
        }
      }
    } else {
      // 敌军：优先攻击士兵，没人拦截时才攻击阵营。
      const campRow = CAMP_ROW_START;
      const blocker = this._findNearest(game.allies);
      const meleeRange = this.rangeInPixels() * 1.5;
      if (blocker && this.distTo(blocker) <= meleeRange) {
        this._meleeAttack(dt, blocker, game);
      } else if (blocker && blocker.row >= this.row - 0.5 && this.row < Math.min(blocker.row, campRow + 1)) {
        this.row += this.speed * dt;
      } else if (this.row < campRow - 1) {
        this.row += this.speed * dt;
      } else {
        this.atkTimer += dt;
        if (this.atkTimer >= this.atkInterval) {
          this.atkTimer = 0;
          game.camp.takeDamage(this.dmg);
        }
      }
    }
  }

  _updateRange(dt, game) {
    if (this.side === 'ally') {
      if (this._moveIntoField(dt, ALLY_DEPLOY_ROW)) return;
      const target = this._findNearest(game.enemies);
      const attackRange = this.rangeInPixels() * this.range;
      if (target && this.distTo(target) <= attackRange) {
        // 射程内有敌人，停下射击
        this.atkTimer += dt;
        if (this.atkTimer >= this.atkInterval) {
          this.atkTimer = 0;
          fireProjectile(this.px(), this.py(), gridCellWidth(this.row) * 0.6, this.dmg, false, game);
        }
      } else {
        // 没有射程内敌人，继续前进，但不超过中线
        if (this.row > MIDLINE_ROW) {
          this.row -= this.speed * dt;
          if (this.row < MIDLINE_ROW) this.row = MIDLINE_ROW;
        }
      }
    } else {
      // 敌军远程：优先攻击士兵，没人可打时才攻击阵营。
      const campRow = CAMP_ROW_START;
      const target = this._findNearest(game.allies);
      const attackRange = this.rangeInPixels() * this.range;
      if (target && this.distTo(target) <= attackRange) {
        this.atkTimer += dt;
        if (this.atkTimer >= this.atkInterval) {
          this.atkTimer = 0;
          target.takeDamage(this.dmg);
          addFireEffect(target.px(), target.py(), gridCellWidth(target.row));
        }
      } else if (target && target.row >= this.row - 0.5 && this.row < Math.min(target.row, campRow)) {
        this.row += this.speed * dt;
      } else if (this.row < campRow - this.range) {
        this.row += this.speed * dt;
      } else {
        this.atkTimer += dt;
        if (this.atkTimer >= this.atkInterval) {
          this.atkTimer = 0;
          game.camp.takeDamage(this.dmg);
        }
      }
    }
  }

  _updateCaster(dt, game) {
    if (this.side === 'ally') {
      if (this._moveIntoField(dt, ALLY_DEPLOY_ROW)) return;
      const target = this._findNearest(game.enemies);
      const attackRange = this.rangeInPixels() * this.range;
      if (target && this.distTo(target) <= attackRange) {
        // 射程内有敌人，停下施法
        this.atkTimer += dt;
        if (this.atkTimer >= this.atkInterval) {
          this.atkTimer = 0;
          const aoeW = this.def.aoeW || 2;
          const aoeH = this.def.aoeH || 2;
          for (const e of game.enemies) {
            if (Math.abs(e.col - target.col) <= aoeW/2 && Math.abs(e.row - target.row) <= aoeH/2) {
              e.takeDamage(this.dmg);
            }
          }
          addExplosionEffect(target.px(), target.py(), gridCellWidth(target.row) * 2);
        }
      } else {
        // 没有射程内敌人，继续前进，但不超过中线
        if (this.row > MIDLINE_ROW) {
          this.row -= this.speed * dt;
          if (this.row < MIDLINE_ROW) this.row = MIDLINE_ROW;
        }
      }
    }
  }

  _updateSwarm(dt, game) {
    if (this.side === 'ally') {
      // 召唤类：移动到中线停止，驻守召唤
      if (this.row > MIDLINE_ROW) {
        this.row -= this.speed * dt;
        if (this.row < MIDLINE_ROW) this.row = MIDLINE_ROW;
      }
      this.summonTimer += dt;
      if (this.summonTimer >= this.def.atkInterval) {
        this.summonTimer = 0;
        const count = this.def.summonCount || 5;
        for (let i = 0; i < count; i++) {
          const sr = this.row - 0.6 - i * 0.22;
          const slot = pickSpawnPosition(game.allies, sr, 1);
          const sc = slot.col;
          const summonDef = {
            id: 'summon_' + this.id + '_' + i,
            name: '小兵', type: 'rush', isSummon: true,
            icon: this.def.summonIcon || 'assets/monster/swarm/Icon42.webp',
            hp: this.def.summonHp || 1,
            speed: this.def.summonSpeed || 2,
            dmg: this.def.summonDmg || 1,
            atkInterval: this.def.summonInterval || 1,
            range: 0, cost: 0,
            sizeScale: 1,
          };
          game.allies.push(new Unit(summonDef, sc, slot.row, 'ally'));
        }
      }
    }
  }

  _updateTurret(dt, game) {
    if (this.side !== 'ally') return;
    if (this._moveIntoField(dt, TURRET_DEPLOY_ROW)) return;
    const target = this._findNearest(game.enemies);
    // 攻城类射程：固定为道路高度的 range/10 比例，不随透视缩放
    const attackRange = (ROAD_BOT_Y - ROAD_TOP_Y) * (this.range / 10);
    if (target && this.distTo(target) <= attackRange) {
      // 射程内有敌人，停下射击
      this.atkTimer += dt;
      if (this.atkTimer >= this.atkInterval) {
        this.atkTimer = 0;
        fireTurretLaser(this.px(), this.py(), this.row, attackRange, this.dmg, game);
      }
    } else {
      // 没有射程内敌人，前进到中线
      if (this.row > MIDLINE_ROW) {
        this.row -= this.speed * dt;
        if (this.row < MIDLINE_ROW) this.row = MIDLINE_ROW;
      }
    }
  }

  _moveIntoField(dt, targetRow) {
    if (this.side !== 'ally' || this.row <= targetRow) return false;
    this.row -= this.speed * dt;
    if (this.row < targetRow) this.row = targetRow;
    return true;
  }

  _findNearest(units) {
    let best = null, bestDist = Infinity;
    for (const u of units) {
      if (u.dead) continue;
      const d = this.distTo(u);
      if (d < bestDist) { bestDist = d; best = u; }
    }
    return best;
  }

  _updateHitEffect(dt) {
    if (this.hitEffectFrame < 0) return;
    this.hitEffectTimer += dt;
    if (this.hitEffectTimer < 0.045) return;
    this.hitEffectTimer -= 0.045;
    this.hitEffectFrame++;
    if (this.hitEffectFrame >= HIT_EFFECT_FRAMES.length) {
      this.hitEffectFrame = -1;
      this.hitEffectTimer = 0;
    }
  }

  _meleeAttack(dt, target, game) {
    this.atkTimer += dt;
    if (this.atkTimer >= this.atkInterval) {
      this.atkTimer = 0;
      target.takeDamage(this.dmg);
    }
  }

  draw() {
    if (this.dead) return;
    const { x, y } = gridToPixel(this.col, this.row);
    const cellW = gridCellWidth(this.row);
    const scale = this.sizeScale || 1;
    const size = Math.round(cellW * 0.85 * scale);

    const img = getImg(this.icon);
    if (img.complete && img.naturalWidth) {
      ctx.save();
      disableSmoothing(ctx);
      crispDraw(ctx, img, x - size / 2, y - size / 2, size, size);
      ctx.restore();
    } else {
      ctx.fillStyle = this.side === 'ally' ? '#3498db' : '#e74c3c';
      ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    }

    if (this.hitEffectFrame >= 0) {
      const hitImg = getImg(HIT_EFFECT_FRAMES[this.hitEffectFrame]);
      if (hitImg.complete && hitImg.naturalWidth) {
        const effectSize = Math.round(size * 1.35);
        crispDraw(ctx, hitImg, x - effectSize / 2, y - effectSize / 2, effectSize, effectSize);
      }
    }

    // 血条
    if (this.hp < this.maxHp) {
      const bw = size;
      const bh = 4;
      const bx = Math.round(x - size / 2);
      const by = Math.round(y - size / 2 - 6);
      ctx.fillStyle = '#333';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = this.side === 'ally' ? '#2ecc71' : '#e74c3c';
      ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), bh);
    }
  }
}


// ===== 阵营 =====
class Camp {
  constructor() {
    this.maxHp = 500;
    this.hp = 500;
    this.destroyed = false;
  }
  takeDamage(dmg) {
    this.hp = Math.max(0, this.hp - dmg);
    if (this.hp <= 0) this.destroyed = true;
    updateCampHpUI();
  }
}

function updateCampHpUI() {
  if (!game) return;
  const pct = game.camp.hp / game.camp.maxHp * 100;
  document.getElementById('campHpFill').style.width = pct + '%';
  document.getElementById('campHpText').textContent = `${game.camp.hp}/${game.camp.maxHp}`;
}

// ===== 气势系统 =====
class MoraleSystem {
  constructor() {
    this.value = 0;
    this.clickGain = 1;       // 每次点击获得的气势
    this.upgradeCost = 40;    // 当前升级所需气势
  }
  add(n) {
    this.value += n;
    this._updateUI();
  }
  spend(n) {
    if (this.value >= n) { this.value -= n; this._updateUI(); return true; }
    return false;
  }
  // 升级：消耗 upgradeCost 气势，clickGain+1，upgradeCost *= 1.5
  upgrade() {
    if (this.value < this.upgradeCost) return false;
    this.value -= this.upgradeCost;
    this.clickGain += 1;
    this.upgradeCost = Math.ceil(this.upgradeCost * 1.5);
    this._updateUI();
    return true;
  }
  _updateUI() {
    document.getElementById('moraleValue').textContent = this.value;

    // 升级按钮
    const upgradeBtn = document.getElementById('upgradeBtn');
    const upgradeCostEl = document.getElementById('upgradeCost');
    if (upgradeBtn) {
      upgradeCostEl.textContent = `${this.value}/${this.upgradeCost}`;
      upgradeBtn.classList.toggle('active', this.value >= this.upgradeCost);
    }

    // 派遣按钮：有可负担的兵种时高亮
    const deployBtn = document.getElementById('deployBtn');
    if (deployBtn && game) {
      const canDeploy = game.selectedDefs.some(d => d.cost <= this.value);
      deployBtn.classList.toggle('active', canDeploy);
      const minCost = game.selectedDefs.length ? Math.min(...game.selectedDefs.map(d => d.cost)) : 0;
      document.getElementById('deployCost').textContent = minCost ? `消耗${minCost}+` : '未选择';
    }
  }
}

// ===== 敌人兵种定义 =====
const ENEMY_DEFS = {
  minion: {
    id: 'minion', name: '小兵', type: 'rush',
    icon: 'assets/monster/Icon39.webp',
    hp: 3, speed: 0.2, dmg: 1, atkInterval: 1, range: 1, cost: 1,
    sizeScale: 1,
  },
  fast: {
    id: 'fast', name: '快速兵', type: 'rush',
    icon: 'assets/monster/Icon6.webp',
    hp: 2, speed: 0.7, dmg: 0.5, atkInterval: 1, range: 1, cost: 2,
    sizeScale: 1,
  },
  shield: {
    id: 'shield', name: '盾兵', type: 'guard',
    icon: 'assets/monster/Icon30.webp',
    hp: 20, speed: 0.2, dmg: 2, atkInterval: 1.5, range: 1, cost: 4,
    sizeScale: 1.5,
  },
  elite: {
    id: 'elite', name: '精英兵', type: 'rush',
    icon: 'assets/monster/Icon38.webp',
    hp: 15, speed: 0.5, dmg: 3, atkInterval: 1, range: 1, cost: 8,
    sizeScale: 1.5,
  },
  boss1: {
    id: 'boss1', name: 'Boss', type: 'guard',
    icon: 'assets/monster/Icon24.webp',
    hp: 150, speed: 0.1, dmg: 10, atkInterval: 2, range: 1, cost: 20,
    sizeScale: 2,
  },
  boss2: {
    id: 'boss2', name: 'Boss2', type: 'guard',
    icon: 'assets/monster/Icon12.webp',
    hp: 200, speed: 0.1, dmg: 20, atkInterval: 2, range: 1, cost: 20,
    sizeScale: 2,
  },
    boss3: {
    id: 'boss3', name: 'Boss3', type: 'guard',
    icon: 'assets/monster/Icon7.webp',
    hp: 500, speed: 0.1, dmg: 30, atkInterval: 1, range: 1, cost: 20,
    sizeScale: 3,
  },
    boss4: {
    id: 'boss4', name: 'Boss4', type: 'guard',
    icon: 'assets/monster/Icon45.webp',
    hp: 1000, speed: 0.1, dmg: 50, atkInterval: 2, range: 1, cost: 20,
    sizeScale:8,
  }
};

// 阶段权重表
function getEnemyWeights(elapsed) {
  if (elapsed < 60) {
    return [
      { def: ENEMY_DEFS.minion, w: 90 },
      { def: ENEMY_DEFS.fast,   w: 10 },
    ];
  } else if (elapsed < 180) {
    return [
      { def: ENEMY_DEFS.minion, w: 50 },
      { def: ENEMY_DEFS.fast,   w: 25 },
      { def: ENEMY_DEFS.shield, w: 20 },
      { def: ENEMY_DEFS.elite,  w:  5 },
    ];
  } else {
    return [
      { def: ENEMY_DEFS.minion, w: 25 },
      { def: ENEMY_DEFS.fast,   w: 30 },
      { def: ENEMY_DEFS.shield, w: 20 },
      { def: ENEMY_DEFS.elite,  w: 20 },
      { def: ENEMY_DEFS.boss1,  w:  2 },
      { def: ENEMY_DEFS.boss2,  w:  1 },
      { def: ENEMY_DEFS.boss3,  w:  1 },
      { def: ENEMY_DEFS.boss4,  w:  1 },
    ];
  }
}

function pickEnemyDef(elapsed) {
  const weights = getEnemyWeights(elapsed);
  const total = weights.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const entry of weights) {
    r -= entry.w;
    if (r <= 0) return entry.def;
  }
  return weights[0].def;
}

// ===== 主游戏对象 =====
let game = null;

class Game {
  constructor(selectedDefs) {
    this.selectedDefs = selectedDefs; // 当前已拥有的阵容，最多6个
    this.allies = [];
    this.enemies = [];
    this.camp = new Camp();
    this.morale = new MoraleSystem();
    this.paused = false;
    this.over = false;
    this.won = false;
    this.elapsed = 0; // 游戏时间（秒）
    this.pressureAccum = 0; // 压力值累积
    this.moraleSpawnTimer = 0; // 气势自动召唤计时（保留字段，已不使用）
    this.nextChoiceMinute = 1; // 每存活1分钟触发一次3选1，最多到第5分钟
    this.lastTime = null;
    this.rafId = null;

    // 不在开始时自动派遣，等玩家手动点击派遣按钮
  }

  _spawnInitialAllies() {
    for (let i = 0; i < this.selectedDefs.length; i++) {
      const def = this.selectedDefs[i];
      const row = def.type === 'turret' ? CAMP_ROW_START + 0.5 : MIDLINE_ROW + 1 + (i % 3) * 0.55;
      const slot = pickSpawnPosition(this.allies, row, def.sizeScale || 1);
      this.allies.push(new Unit(def, slot.col, def.type === 'turret' ? row : slot.row, 'ally'));
    }
  }

  start() {
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(t => this._loop(t));
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  _loop(timestamp) {
    if (this.over) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (!this.paused) {
      this.elapsed += dt;
      this._update(dt);
    }

    this._draw();
    this.rafId = requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    // 更新计时器UI
    this._updateTimerUI();
    this._maybeOpenMinuteChoice();

    // 敌军生成
    this._spawnEnemies(dt);

    // 更新所有单位
    for (const u of this.allies)  u.update(dt, this);
    for (const u of this.enemies) u.update(dt, this);

    // 清理死亡单位
    this.allies  = this.allies.filter(u => !u.dead);
    this.enemies = this.enemies.filter(u => !u.dead);

    applyUnitSeparation(this.allies, dt);
    applyUnitSeparation(this.enemies, dt);

    // 更新特效
    updateEffects(dt);
    updateProjectiles(dt);
    updateLaserBeams(dt);

    // 检查游戏结束
    if (this.camp.destroyed) {
      this._endGame(false);
    }
  }

  _spawnEnemies(dt) {
    // 每秒压力 = 1 + 0.02 × 游戏时间
    const basePressure = 1 + 0.01 * this.elapsed;
    // 玩家战力 = 点击收益 × 0.6 + 场上友军数 × 0.4
    const playerPower = this.morale.clickGain * 0.6 + this.allies.length * 0.4;
    // 最终压力（每秒）
    const finalPressure = basePressure * (0.8 + playerPower / 50);
    // 本帧累积压力
    this.pressureAccum += finalPressure * dt;

    // 每积累1点压力生成一个敌人，兵种完全由权重随机决定
    while (this.pressureAccum >= 1) {
      this.pressureAccum -= 1;
      this._spawnOneEnemy(pickEnemyDef(this.elapsed));
    }
  }

  _spawnOneEnemy(def) {
    const sizeScale = def.sizeScale || 1;
    const baseRow = ENEMY_SPAWN_ROW + Math.random() * 1.1;
    const slot = pickSpawnPosition(this.enemies, baseRow, sizeScale);
    const enemyDef = { ...def };
    const unit = new Unit(enemyDef, slot.col, slot.row, 'enemy');
    unit.sizeScale = sizeScale;
    this.enemies.push(unit);
  }

  _spawnAlly(def) {
    const row = def.type === 'turret' ? TURRET_DEPLOY_ROW : ALLY_DEPLOY_ROW;
    const sizeScale = def.sizeScale || 1;
    const slot = def.type === 'turret'
      ? { col: pickSpawnPosition(this.allies, row, sizeScale).col, row }
      : pickSpawnPosition(this.allies, row, sizeScale);
    this.allies.push(new Unit(def, slot.col, slot.row, 'ally'));
  }

  addUnitDef(def) {
    if (this.selectedDefs.length >= 6) return false;
    if (this.selectedDefs.some(d => d.id === def.id)) return false;
    this.selectedDefs.push(def);
    this.morale._updateUI();
    return true;
  }

  _maybeOpenMinuteChoice() {
    if (this.paused || this.over) return;
    if (this.nextChoiceMinute >= 6 || this.selectedDefs.length >= 6) return;
    if (this.elapsed < this.nextChoiceMinute * 60) return;

    const minute = this.nextChoiceMinute;
    this.nextChoiceMinute += 1;
    this.paused = true;
    openChoiceScreen({
      title: `存活${minute}分钟`,
      subtitle: `选择1名士兵加入阵容（${this.selectedDefs.length}/6）`,
      excludeIds: this.selectedDefs.map(d => d.id),
      onChoose: (def) => {
        this.addUnitDef(def);
        closeChoiceScreen();
        this.paused = false;
      },
      onEmpty: () => {
        closeChoiceScreen();
        this.paused = false;
      }
    });
  }

  _updateTimerUI() {
    const s = Math.floor(this.elapsed);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    document.getElementById('gameTimer').textContent =
      String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
  }

  _draw() {
    ctx.clearRect(0, 0, LOGIC_W, LOGIC_H);
    this._drawMap();
    // 先画友军，再画敌军，再画特效
    for (const u of this.allies)  u.draw();
    for (const u of this.enemies) u.draw();
    drawProjectiles();
    drawLaserBeams();
    drawEffects();
    this._drawCampZone();
  }

  _drawMap() {
    disableSmoothing(ctx);
    const W = LOGIC_W;
    const H = LOGIC_H;

    const drawTiled = (img, tileSize, fallback) => {
      if (img.complete && img.naturalWidth) {
        disableSmoothing(ctx);
        for (let ty = 0; ty < H; ty += tileSize) {
          for (let tx = 0; tx < W; tx += tileSize) {
            ctx.drawImage(img, tx, ty, tileSize, tileSize);
          }
        }
      } else {
        ctx.fillStyle = fallback;
        ctx.fillRect(0, 0, W, H);
      }
    };

    const drawTrapezoidTile = (img, topLeft, topRight, botRight, botLeft, fallback) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(topLeft, ROAD_TOP_Y);
      ctx.lineTo(topRight, ROAD_TOP_Y);
      ctx.lineTo(botRight, ROAD_BOT_Y);
      ctx.lineTo(botLeft, ROAD_BOT_Y);
      ctx.closePath();
      ctx.clip();
      drawTiled(img, 64, fallback);
      ctx.restore();
    };

    const drawEdgeTiles = (img, side, edgeW, fallback) => {
      if (!img.complete || !img.naturalWidth) {
        ctx.save();
        ctx.beginPath();
        if (side === 'left') {
          ctx.moveTo(ROAD_TOP_LEFT, ROAD_TOP_Y);
          ctx.lineTo(ROAD_TOP_LEFT + edgeW, ROAD_TOP_Y);
          ctx.lineTo(ROAD_BOT_LEFT + edgeW, ROAD_BOT_Y);
          ctx.lineTo(ROAD_BOT_LEFT, ROAD_BOT_Y);
        } else {
          ctx.moveTo(ROAD_TOP_RIGHT - edgeW, ROAD_TOP_Y);
          ctx.lineTo(ROAD_TOP_RIGHT, ROAD_TOP_Y);
          ctx.lineTo(ROAD_BOT_RIGHT, ROAD_BOT_Y);
          ctx.lineTo(ROAD_BOT_RIGHT - edgeW, ROAD_BOT_Y);
        }
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = fallback;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        return;
      }

      // 边缘素材只能横向出现一次；按小横切片贴到斜边，避免底部宽时重复出多条边。
      const sliceH = 8;
      for (let y = ROAD_TOP_Y; y < ROAD_BOT_Y; y += sliceH) {
        const h = Math.min(sliceH, ROAD_BOT_Y - y);
        const t0 = (y - ROAD_TOP_Y) / (ROAD_BOT_Y - ROAD_TOP_Y);
        const t1 = (y + h - ROAD_TOP_Y) / (ROAD_BOT_Y - ROAD_TOP_Y);
        const left0 = ROAD_TOP_LEFT + (ROAD_BOT_LEFT - ROAD_TOP_LEFT) * t0;
        const left1 = ROAD_TOP_LEFT + (ROAD_BOT_LEFT - ROAD_TOP_LEFT) * t1;
        const right0 = ROAD_TOP_RIGHT + (ROAD_BOT_RIGHT - ROAD_TOP_RIGHT) * t0;
        const right1 = ROAD_TOP_RIGHT + (ROAD_BOT_RIGHT - ROAD_TOP_RIGHT) * t1;
        const sx = 0;
        const sy = y % img.naturalHeight;
        const sw = img.naturalWidth;
        const sh = Math.min(h, img.naturalHeight - sy);
        const x0 = side === 'left' ? left0 : right0 - edgeW;
        const x1 = side === 'left' ? left1 : right1 - edgeW;
        const dx = Math.min(x0, x1);
        const dw = Math.max(x0, x1) - dx + edgeW;

        ctx.save();
        ctx.beginPath();
        if (side === 'left') {
          ctx.moveTo(left0, y);
          ctx.lineTo(left0 + edgeW, y);
          ctx.lineTo(left1 + edgeW, y + h);
          ctx.lineTo(left1, y + h);
        } else {
          ctx.moveTo(right0 - edgeW, y);
          ctx.lineTo(right0, y);
          ctx.lineTo(right1, y + h);
          ctx.lineTo(right1 - edgeW, y + h);
        }
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, sx, sy, sw, sh, dx, y, dw, h);
        ctx.restore();
      }
    };

    const drawLandDecorations = () => {
      for (const decor of LAND_DECORATIONS) {
        const img = getImg(decor.src);
        if (!img.complete || !img.naturalWidth) continue;

        const boundary =
          decor.side === 'left'
            ? ROAD_TOP_LEFT + (ROAD_BOT_LEFT - ROAD_TOP_LEFT) * (decor.y / ROAD_BOT_Y)
            : ROAD_TOP_RIGHT + (ROAD_BOT_RIGHT - ROAD_TOP_RIGHT) * (decor.y / ROAD_BOT_Y);
        const w = decor.w;
        const h = w * (img.naturalHeight / img.naturalWidth);
        const x =
          decor.side === 'left'
            ? boundary - decor.offset - w
            : boundary + decor.offset;

        disableSmoothing(ctx);
        crispDraw(ctx, img, x, decor.y, w, h);
      }
    };

    // 1. 道路外区域使用 land/bg.webp
    drawTiled(getImg('assets/land/bg.webp'), 128, '#2d5a27');
    drawLandDecorations();

    // 2. 道路拆为左边缘 / 中间 / 右边缘三段
    const edgeW = 64;
    const topInnerLeft = ROAD_TOP_LEFT + edgeW;
    const topInnerRight = ROAD_TOP_RIGHT - edgeW;
    const botInnerLeft = ROAD_BOT_LEFT + edgeW;
    const botInnerRight = ROAD_BOT_RIGHT - edgeW;

    drawTrapezoidTile(
      getImg('assets/land/road.webp'),
      topInnerLeft,
      topInnerRight,
      botInnerRight,
      botInnerLeft,
      '#c8a882'
    );
    drawEdgeTiles(getImg('assets/land/road_l.webp'), 'left', edgeW, '#8b6b4c');
    drawEdgeTiles(getImg('assets/land/road_r.webp'), 'right', edgeW, '#8b6b4c');

    // 3. 中线指示（虚线）
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,100,0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    const midY = rowToY(MIDLINE_ROW);
    const midL = rowToLeftX(MIDLINE_ROW);
    const midR = rowToRightX(MIDLINE_ROW);
    ctx.beginPath();
    ctx.moveTo(midL, midY);
    ctx.lineTo(midR, midY);
    ctx.stroke();
    ctx.restore();
  }

  _drawCampZone() {
    // 交战区延伸到底部，无需额外绘制
  }

  _endGame(won) {
    this.over = true;
    this.won = won;
    const screen = document.getElementById('gameOverScreen');
    const title  = document.getElementById('gameOverTitle');
    const msg    = document.getElementById('gameOverMsg');
    title.textContent = won ? '胜利！' : '阵营沦陷';
    title.className = 'game-over-title ' + (won ? 'win' : 'lose');
    const m = Math.floor(this.elapsed / 60);
    const s = Math.floor(this.elapsed % 60);
    msg.textContent = `坚守时间：${m}分${s}秒`;
    screen.style.display = 'flex';
  }
}


// ===== UI 系统 =====

function pickRandomDefs(defs, count) {
  const shuffled = defs.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function createUnitChoiceCard(def, onChoose) {
  const card = document.createElement('div');
  card.className = 'unit-card';
  card.dataset.id = def.id;

  const cost = document.createElement('div');
  cost.className = 'card-cost';
  cost.textContent = def.cost;

  const typeTag = document.createElement('div');
  typeTag.className = 'card-type type-' + def.type;
  typeTag.textContent = TYPE_LABELS[def.type] || def.type;

  const imgWrap = document.createElement('div');
  imgWrap.className = 'card-img-wrap';
  const img = document.createElement('img');
  img.alt = def.name;
  const cache = window.__imageCache || {};
  img.src = cache[def.icon] || def.icon;
  img.onerror = () => { img.src = def.icon; };
  imgWrap.appendChild(img);

  const name = document.createElement('div');
  name.className = 'card-name';
  name.textContent = def.name;

  const dmg = document.createElement('div');
  dmg.className = 'card-dmg';
  dmg.textContent = def.dmg;

  card.appendChild(cost);
  card.appendChild(typeTag);
  card.appendChild(imgWrap);
  card.appendChild(name);
  card.appendChild(dmg);
  card.addEventListener('click', () => onChoose(def));
  return card;
}

// 选兵前置界面：开局随机3选1
function initPrepScreen() {
  const pool = document.getElementById('unitPool');
  pool.innerHTML = '';

  const choices = pickRandomDefs(UNIT_DEFS, 3);
  for (const def of choices) {
    pool.appendChild(createUnitChoiceCard(def, (chosenDef) => {
      document.getElementById('prepScreen').style.display = 'none';
      startGame([chosenDef]);
    }));
  }
}

function openChoiceScreen({ title, subtitle, excludeIds = [], onChoose, onEmpty }) {
  const screen = document.getElementById('choiceScreen');
  const pool = document.getElementById('choicePool');
  const titleEl = document.getElementById('choiceTitle');
  const subtitleEl = document.getElementById('choiceSubtitle');
  const excluded = new Set(excludeIds);
  const available = UNIT_DEFS.filter(d => !excluded.has(d.id));
  const choices = pickRandomDefs(available, 3);

  pool.innerHTML = '';
  titleEl.textContent = title;
  subtitleEl.textContent = subtitle;

  if (choices.length === 0) {
    if (onEmpty) onEmpty();
    return;
  }

  for (const def of choices) {
    pool.appendChild(createUnitChoiceCard(def, onChoose));
  }
  screen.style.display = 'grid';
}

function closeChoiceScreen() {
  document.getElementById('choiceScreen').style.display = 'none';
}

// ===== HUD 操作栏：按压反馈（pointer，兼容触摸） =====
function bindHudPressFeedback(el) {
  if (!el) return;
  const cls = 'is-pressing';
  const rm = () => el.classList.remove(cls);
  const add = (e) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    el.classList.add(cls);
  };
  el.addEventListener('pointerdown', add);
  el.addEventListener('pointerup', rm);
  el.addEventListener('pointercancel', rm);
  el.addEventListener('lostpointercapture', rm);
}

// ===== 点击区 =====
function initClickArea() {
  const clickBtn = document.getElementById('clickBtn');
  bindHudPressFeedback(clickBtn);
  clickBtn.addEventListener('click', () => {
    if (!game || game.over) return;
    game.morale.add(game.morale.clickGain);
    portalFrame = (portalFrame + 1) % PORTAL_TOTAL_FRAMES;
    drawPortal();
  });

  bindHudPressFeedback(document.getElementById('upgradeBtn'));
  bindHudPressFeedback(document.getElementById('deployBtn'));

  document.getElementById('upgradeBtn').addEventListener('click', () => {
    if (!game || game.over || game.paused) return;
    game.morale.upgrade();
  });

  document.getElementById('deployBtn').addEventListener('click', () => {
    if (!game || game.over || game.paused) return;
    const affordable = game.selectedDefs.filter(d => d.cost <= game.morale.value);
    if (affordable.length === 0) return;
    const def = affordable[Math.floor(Math.random() * affordable.length)];
    if (game.morale.spend(def.cost)) {
      game._spawnAlly(def);
    }
  });

  document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('gameOverScreen').style.display = 'none';
    if (game) game.stop();
    game = null;
    document.getElementById('prepScreen').style.display = 'grid';
    initPrepScreen();
  });
}

// ===== 启动游戏 =====
function startGame(selectedDefs) {
  if (game) game.stop();
  laserBeams.length = 0;
  game = new Game(selectedDefs);
  updateCampHpUI();
  game.morale._updateUI();
  game.start();
}

// ===== 初始化 =====
function init() {
  resizeCanvas();
  resizePortalCanvas();
  drawPortal();
  initClickArea();
  initPrepScreen();

  // 通知加载完成
  if (typeof window.__onGameReady === 'function') {
    window.__onGameReady();
  }
}

// 等待DOM和图片就绪
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
