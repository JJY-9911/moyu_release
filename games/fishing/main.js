(function() {
  'use strict';

  // ===================== CONSTANTS =====================
  // origbig.png is the SKY/DISTANT background only
  // Scene elements (ground, water, hut, dock, boat) are drawn on top using tiles and sprites
  var SCALE = 2;
  var FRAME_W = 48;
  var FRAME_H = 48;
  var TILE_SIZE = 32;
  var CANVAS_W = 576;
  var CANVAS_H = 324;
  var CHAR_SCALE = 2.5;

  // Scene layout (in origbig pixel coords, 576×324)
  var GROUND_TOP = 292;       // 324 - 32 = 画面底部一格
  var WATER_TOP = 292;        // same Y as ground so they align horizontally
  var GROUND_LEFT = -200;
  var GROUND_RIGHT = 310;     // x where shoreline ends, water begins
  var DOCK_Y = 280;           // 码头面板在地面上方一点
  var DOCK_START_X = 200;
  var DOCK_END_X = 370;
  var DOCK_H = 8;
  var HUT_X = 210;
  var HUT_Y = 185;
  var BARREL1_X = 170;
  var BARREL1_Y = 200;
  var BARREL2_X = 185;
  var BARREL2_Y = 193;
  var BOAT_X = 340;
  var BOAT_Y = 274;           // 292 - 18 = 船底贴水面顶部
  // 角色实际绘制高度 = FRAME_H * CHAR_SCALE = 48 * 2.5 = 120 屏幕像素
  // 地面顶部屏幕 Y = GROUND_TOP * SCALE = 292 * 2 = 584
  // 角色 Y（世界坐标）需要让绘制底部对齐地面顶部
  // drawCharacter 用 worldToScreen: screenY = worldY * SCALE, 绘制高度 = FRAME_H * CHAR_SCALE
  // 所以 worldY * SCALE + FRAME_H * CHAR_SCALE = GROUND_TOP * SCALE
  // worldY = GROUND_TOP - FRAME_H * CHAR_SCALE / SCALE
  var CHAR_GROUND_Y = GROUND_TOP - FRAME_H * CHAR_SCALE / SCALE;  // 角色脚底对齐地面顶部
  var WORLD_LEFT = -200;
  var WORLD_RIGHT = 560;

  // Fish species
  var FISH_LIST = [
    { id:'f01', name:'鲫鱼',   rarity:'common',    price:10,  icon:1,  desc:'最常见的淡水鱼' },
    { id:'f02', name:'鲤鱼',   rarity:'common',    price:15,  icon:2,  desc:'生命力顽强的鱼' },
    { id:'f03', name:'草鱼',   rarity:'common',    price:12,  icon:3,  desc:'喜欢吃水草' },
    { id:'f04', name:'鲈鱼',   rarity:'common',    price:18,  icon:4,  desc:'肉质鲜美' },
    { id:'f05', name:'金鱼',   rarity:'rare',      price:50,  icon:5,  desc:'闪闪发光的观赏鱼' },
    { id:'f06', name:'河豚',   rarity:'rare',      price:65,  icon:6,  desc:'圆滚滚的毒鱼' },
    { id:'f07', name:'鳗鱼',   rarity:'rare',      price:80,  icon:7,  desc:'滑溜溜的长鱼' },
    { id:'f08', name:'剑鱼',   rarity:'epic',      price:200, icon:8,  desc:'锋利的长嘴' },
    { id:'f09', name:'龙鱼',   rarity:'epic',      price:300, icon:9,  desc:'传说中的龙之鱼' },
    { id:'f10', name:'翻车鱼', rarity:'epic',      price:250, icon:10, desc:'巨大的海洋鱼' },
    { id:'f11', name:'金龙鱼', rarity:'legendary', price:800, icon:11, desc:'黄金色的神鱼' },
    { id:'f12', name:'海神鱼', rarity:'legendary', price:1200,icon:12, desc:'传说中的海神坐骑' }
  ];

  var RARITY_WEIGHTS = { common: 100, rare: 30, epic: 8, legendary: 2 };
  var RARITY_ORDER = ['common','rare','epic','legendary'];
  var RARITY_LABELS = { common:'普通', rare:'稀有', epic:'史诗', legendary:'传说' };
  var RARITY_COLORS = { common:'#aaaaaa', rare:'#4a9eff', epic:'#b44aff', legendary:'#ffaa00' };

  var ROD_UPGRADES = [
    { level:1, cost:0,    name:'木竿' },
    { level:2, cost:200,  name:'竹竿' },
    { level:3, cost:800,  name:'碳素竿' },
    { level:4, cost:3000, name:'传说之竿' }
  ];

  var BACKPACK_UPGRADES = [
    { capacity:10, cost:0 },
    { capacity:15, cost:300 },
    { capacity:20, cost:1000 },
    { capacity:25, cost:3000 },
    { capacity:30, cost:8000 }
  ];

  var SAVE_KEY = 'gamehub_fishing_v2';

  // ===================== ASSET LOADING =====================
  var assets = {};
  var totalAssets = 0;
  var loadedAssets = 0;

  function loadImage(key, src) {
    totalAssets++;
    var img = new Image();
    img.onload = function() {
      loadedAssets++;
      updateLoadingBar();
      if (loadedAssets >= totalAssets) onAllAssetsLoaded();
    };
    img.onerror = function() {
      console.warn('Failed to load: ' + src);
      loadedAssets++;
      updateLoadingBar();
      if (loadedAssets >= totalAssets) onAllAssetsLoaded();
    };
    img.src = src;
    assets[key] = img;
  }

  function updateLoadingBar() {
    var bar = document.getElementById('loadingBar');
    if (bar) bar.style.width = Math.round((loadedAssets / totalAssets) * 100) + '%';
  }

  function loadAllAssets() {
    var base = 'assets/';
    loadImage('idle',      base + 'Fisherman_idle.png');
    loadImage('walk',      base + 'Fisherman_walk.png');
    loadImage('hook',      base + 'Fisherman_hook.png');
    loadImage('fish',      base + 'Fisherman_fish.png');
    loadImage('row',       base + 'Fisherman_row.png');
    loadImage('water',     base + 'Water.png');
    loadImage('hut',       base + 'Fishing_hut.png');
    loadImage('boat',      base + 'Boat.png');
    loadImage('barrel1',   base + 'Fishbarrel1.png');
    loadImage('barrel2',   base + 'Fishbarrel4.png');
    loadImage('tile02',    base + 'tile/Tile_02.png');
    loadImage('tile32',    base + 'tile/Tile_32.png');
    loadImage('tile33',    base + 'tile/Tile_33.png');
    loadImage('tile34',    base + 'tile/Tile_34.png');
    loadImage('origbig',   base + 'origbig.png');
    for (var i = 1; i <= 12; i++) {
      var num = i < 10 ? '0' + i : '' + i;
      loadImage('icon' + num, base + 'icons/Icons_' + num + '.png');
    }
  }

  // ===================== GAME STATE =====================
  var state = {
    gameState: 'idle',       // idle, walking, casting, waiting, biting, reeling, caught, rowing
    playerX: 150,            // world X position — 路面中间
    playerY: CHAR_GROUND_Y,  // world Y position
    facingLeft: false,
    velX: 0,
    gold: 0,
    rodLevel: 1,
    backpack: [],
    backpackCapacity: 10,
    codex: [],
    currentFish: null,
    inBoat: false,
    boatX: BOAT_X,

    // Animation
    animFrame: 0,
    animTimer: 0,
    animSpeed: 150,          // ms per frame

    // Fishing
    fishTimer: 0,
    biteTimeout: 0,
    baitX: 0,
    baitY: 0,
    lineShake: 0,
    castProgress: 0,

    // Camera
    cameraX: 0,

    // Water animation
    waterOffset: 0,

    // Effects
    splashParticles: [],
    catchDisplay: null,      // {fish, timer}
    exclamation: null        // {timer}
  };

  // ===================== DOM REFS =====================
  var canvas, ctx;
  var $goldNum, $rodInfo, $backpackCount, $backpackGrid;
  var $codexProgress, $codexList, $upgradePanel;
  var $tooltip, $toast, $canvasHint, $loadingScreen;

  // ===================== INPUT =====================
  var keys = {};
  var mouseDown = false;
  var mouseCanvasX = 0;
  var mouseCanvasY = 0;

  // ===================== SPRITE HELPERS =====================
  var CHAR_PIVOT_X = 16; // 角色身体中心在帧中的X偏移（原始像素）

  function drawSpriteFrame(img, frameIndex, frameCount, dx, dy, flipped) {
    var fw = img.width / frameCount;
    var fh = img.height;
    var sx = frameIndex * fw;
    var dw = fw * CHAR_SCALE;
    var dh = fh * CHAR_SCALE;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (flipped) {
      var pivotScreen = dx + CHAR_PIVOT_X * CHAR_SCALE;
      ctx.translate(pivotScreen, 0);
      ctx.scale(-1, 1);
      ctx.translate(-pivotScreen, 0);
      ctx.drawImage(img, sx, 0, fw, fh, dx, dy, dw, dh);
    } else {
      ctx.drawImage(img, sx, 0, fw, fh, dx, dy, dw, dh);
    }
    ctx.restore();
  }

  // ===================== SCENE RENDERING =====================
  function worldToScreen(wx, wy) {
    return {
      x: (wx - state.cameraX) * SCALE,
      y: wy * SCALE
    };
  }

  function drawBackground() {
    var bg = assets.origbig;
    if (!bg) return;
    // 背景始终铺满画布，不随相机移动
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bg, 0, 0, bg.width, bg.height, 0, 0, canvas.width, canvas.height);
  }

  function drawGround() {
    var tile = assets.tile02;
    if (!tile) return;
    var ts = TILE_SIZE;
    for (var gx = GROUND_LEFT; gx < GROUND_RIGHT; gx += ts) {
      var screenX = Math.round((gx - state.cameraX) * SCALE);
      ctx.drawImage(tile, screenX, GROUND_TOP * SCALE, ts * SCALE + 1, ts * SCALE);
    }
  }

  function drawWaterTiles() {
    var waterImg = assets.water;
    if (!waterImg) return;
    var ts = 32;
    // Water.png 是 96×96 = 3×3 的 32×32 帧，用时间切换帧实现动画
    var frameCol = Math.floor(Date.now() / 300) % 3; // 每300ms切换一帧
    var frameRow = 0;
    var srcX = frameCol * ts;
    var srcY = frameRow * ts;
    for (var wx = GROUND_RIGHT; wx < GROUND_RIGHT + 400; wx += ts) {
      var screenX = Math.round((wx - state.cameraX) * SCALE);
      ctx.drawImage(waterImg, srcX, srcY, ts, ts, screenX, WATER_TOP * SCALE, ts * SCALE + 1, ts * SCALE);
    }
  }

  function drawDock() {
    var dsx = DOCK_START_X * SCALE;
    var dex = DOCK_END_X * SCALE;
    var dy = DOCK_Y * SCALE;
    var dh = DOCK_H * SCALE;
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(dsx, dy, dex - dsx, dh);
    ctx.fillStyle = '#6B4C0A';
    for (var px = DOCK_START_X; px < DOCK_END_X; px += 12) {
      ctx.fillRect(px * SCALE, dy, 1 * SCALE, dh);
    }
    ctx.fillStyle = '#A08030';
    ctx.fillRect(dsx, dy, dex - dsx, 2);
    ctx.fillStyle = '#6B4C0A';
    var posts = [DOCK_START_X + 15, DOCK_START_X + 60, DOCK_END_X - 15];
    for (var i = 0; i < posts.length; i++) {
      ctx.fillRect(posts[i] * SCALE, dy + dh, 4 * SCALE, 30 * SCALE);
    }
  }

  var HUT_SCALE = 2.6;  // 房屋缩放倍数

  function drawHut() {
    var hutImg = assets.hut;
    if (!hutImg) return;
    var w = hutImg.width * HUT_SCALE;
    var h = hutImg.height * HUT_SCALE;
    var screenX = (HUT_X - state.cameraX) * SCALE;
    ctx.drawImage(hutImg, screenX, HUT_Y * SCALE, w, h);
  }

  function drawBarrels() {
    var b1 = assets.barrel1;
    var b2 = assets.barrel2;
    if (b1) ctx.drawImage(b1, BARREL1_X * SCALE, BARREL1_Y * SCALE, b1.width * SCALE * 2, b1.height * SCALE * 2);
    if (b2) ctx.drawImage(b2, BARREL2_X * SCALE, BARREL2_Y * SCALE, b2.width * SCALE * 2, b2.height * SCALE * 2);
  }

  function drawBoat() {
    var boatImg = assets.boat;
    if (!boatImg) return;
    var bx = state.inBoat ? state.boatX : BOAT_X;
    var by = BOAT_Y + Math.sin(Date.now() * 0.002) * 1;
    var screenX = (bx - state.cameraX) * SCALE;
    ctx.drawImage(boatImg, screenX, by * SCALE, boatImg.width * SCALE * 1.5, boatImg.height * SCALE * 1.5);
  }

  function drawCharacter() {
    var img, frameCount, frame;
    var gs = state.gameState;

    // 选择精灵表和帧数
    if (state.inBoat && gs === 'rowing') {
      img = assets.row;
      frameCount = 4;
    } else if (gs === 'walking') {
      img = assets.walk;
      frameCount = 6;
    } else if (gs === 'casting' || gs === 'waiting' || gs === 'biting') {
      // 抛竿 + 等待 + 咬钩 = Fisherman_fish
      img = assets.fish;
      frameCount = 4;
    } else if (gs === 'reeling') {
      // 收杆 = Fisherman_hook
      img = assets.hook;
      frameCount = 6;
    } else if (state.inBoat) {
      img = assets.row;
      frameCount = 4;
    } else {
      // idle + caught 都用 idle
      img = assets.idle;
      frameCount = 4;
    }

    if (!img) return;
    frame = state.animFrame % frameCount;

    // 根据状态决定具体帧
    if (gs === 'casting') {
      // 顺序播放 fish 动画帧
      frame = Math.min(state.animFrame, frameCount - 1);
    } else if (gs === 'waiting') {
      // 循环播放 fish 动画（持竿等待）
      frame = state.animFrame % frameCount;
    } else if (gs === 'biting') {
      // 循环播放 fish 动画（咬钩抖动）
      frame = state.animFrame % frameCount;
    } else if (gs === 'reeling') {
      // 顺序播放 hook 动画帧
      frame = Math.min(state.animFrame, frameCount - 1);
    }

    var pos = worldToScreen(state.playerX, state.playerY);
    drawSpriteFrame(img, frame, frameCount, pos.x, pos.y, state.facingLeft);

    // 咬钩时显示感叹号
    if (gs === 'biting' && state.exclamation) {
      ctx.save();
      ctx.font = 'bold ' + (14 * SCALE) + 'px Courier New';
      ctx.fillStyle = '#ff4444';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 2;
      var ex = pos.x + FRAME_W * SCALE / 2;
      var ey = pos.y - 8 * SCALE + Math.sin(Date.now() * 0.01) * 3;
      ctx.fillText('!', ex, ey);
      ctx.restore();
    }
  }

  function drawFishingLine() {
    var gs = state.gameState;
    if (gs !== 'waiting' && gs !== 'biting' && gs !== 'reeling' && gs !== 'casting') return;

    // Rod tip position (relative to character)
    var rodTipWorldX = state.playerX + (state.facingLeft ? 5 : FRAME_W - 5);
    var rodTipWorldY = state.playerY + 10;
    var rodTip = worldToScreen(rodTipWorldX, rodTipWorldY);

    var baitScreen = worldToScreen(state.baitX, state.baitY);

    // Bezier control point for line droop
    var midX = (rodTip.x + baitScreen.x) / 2;
    var dist = Math.abs(baitScreen.x - rodTip.x);
    var droop = dist * 0.3;
    if (gs === 'biting') droop += Math.sin(Date.now() * 0.02) * 5 * SCALE;
    var cpY = Math.max(rodTip.y, baitScreen.y) + droop;

    ctx.save();
    ctx.strokeStyle = '#c8c8c8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rodTip.x, rodTip.y);
    ctx.quadraticCurveTo(midX, cpY, baitScreen.x, baitScreen.y);
    ctx.stroke();

    // Bobber
    if (gs === 'waiting' || gs === 'biting') {
      var bobY = baitScreen.y + (gs === 'biting' ? Math.sin(Date.now() * 0.015) * 4 : 0);
      ctx.fillStyle = '#ff3333';
      ctx.beginPath();
      ctx.arc(baitScreen.x, bobY, 3 * SCALE, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(baitScreen.x, bobY - 2 * SCALE, 2 * SCALE, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSplashParticles() {
    for (var i = state.splashParticles.length - 1; i >= 0; i--) {
      var p = state.splashParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 16;
      if (p.life <= 0) {
        state.splashParticles.splice(i, 1);
        continue;
      }
      var sp = worldToScreen(p.x, p.y);
      ctx.fillStyle = 'rgba(180,228,240,' + (p.life / p.maxLife) + ')';
      ctx.fillRect(sp.x, sp.y, 2 * SCALE, 2 * SCALE);
    }
  }

  function drawCatchDisplay() {
    if (!state.catchDisplay) return;
    state.catchDisplay.timer -= 16;
    if (state.catchDisplay.timer <= 0) {
      state.catchDisplay = null;
      return;
    }
    var fish = state.catchDisplay.fish;
    var alpha = Math.min(1, state.catchDisplay.timer / 500);
    var floatY = -20 + (1 - state.catchDisplay.timer / 2000) * -15;

    var pos = worldToScreen(state.playerX + FRAME_W / 2, state.playerY + floatY);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Fish icon
    var iconKey = 'icon' + (fish.icon < 10 ? '0' + fish.icon : '' + fish.icon);
    var iconImg = assets[iconKey];
    if (iconImg) {
      ctx.drawImage(iconImg, pos.x - 16 * SCALE, pos.y - 16 * SCALE, 32 * SCALE, 32 * SCALE);
    }

    // Fish name
    ctx.font = 'bold ' + (6 * SCALE) + 'px Courier New';
    ctx.textAlign = 'center';
    ctx.fillStyle = RARITY_COLORS[fish.rarity] || '#fff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText(fish.name, pos.x, pos.y + 20 * SCALE);

    ctx.restore();
  }

  function drawInteractionPrompt() {
    var gs = state.gameState;
    if (gs !== 'idle' && gs !== 'walking') return;

    // Near dock end - show fishing prompt
    var nearDock = state.playerX >= DOCK_START_X - 5 && state.playerX <= DOCK_END_X + 5 &&
                   !state.inBoat && state.playerY <= DOCK_Y + 10;
    // Near boat
    var nearBoat = Math.abs(state.playerX + FRAME_W / 2 - BOAT_X - 37) < 25 && !state.inBoat;
    // In boat
    var inBoatIdle = state.inBoat && (gs === 'idle');

    if (nearDock && state.playerX > DOCK_END_X - 20) {
      drawPromptText('E: 钓鱼', state.playerX + FRAME_W / 2, state.playerY - 10);
    }
    if (nearBoat && !state.inBoat) {
      drawPromptText('E: 上船', BOAT_X + 37, BOAT_Y - 10);
    }
    if (inBoatIdle) {
      drawPromptText('E: 钓鱼 / Q: 下船', state.playerX + FRAME_W / 2, state.playerY - 10);
    }
  }

  function drawPromptText(text, wx, wy) {
    var pos = worldToScreen(wx, wy);
    ctx.save();
    ctx.font = (5 * SCALE) + 'px Courier New';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,200,0.9)';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText(text, pos.x, pos.y);
    ctx.restore();
  }

  // ===================== CAMERA =====================
  function updateCamera() {
    // 用精灵实际视觉宽度的中心来跟随
    var spriteWorldW = FRAME_W * CHAR_SCALE / SCALE;
    var targetX = state.playerX + spriteWorldW / 2 - CANVAS_W / 2;
    targetX = Math.max(WORLD_LEFT, Math.min(targetX, WORLD_RIGHT - CANVAS_W));
    state.cameraX = targetX;
  }

  // ===================== PLAYER CONTROLLER =====================
  var MOVE_SPEED = 1.2;
  var BOAT_SPEED = 1.0;

  function isOnGround(px) {
    return px + FRAME_W / 2 < GROUND_RIGHT + 5;
  }

  function isOnDock(px) {
    var cx = px + FRAME_W / 2;
    return cx >= DOCK_START_X && cx <= DOCK_END_X + 5;
  }

  function getGroundYAt(px) {
    // 角色脚底对齐地面顶部（精灵底部有几像素空白，补偿 +4）
    return GROUND_TOP - FRAME_H * CHAR_SCALE / SCALE;
  }

  function updatePlayer(dt) {
    var gs = state.gameState;

    // Can't move while fishing
    if (gs === 'casting' || gs === 'waiting' || gs === 'biting' || gs === 'reeling' || gs === 'caught') return;

    var moveLeft = keys['KeyA'] || keys['ArrowLeft'];
    var moveRight = keys['KeyD'] || keys['ArrowRight'];
    var interact = keys['KeyE'];
    var exitBoat = keys['KeyQ'];

    // In boat mode
    if (state.inBoat) {
      if (moveLeft || moveRight) {
        state.gameState = 'rowing';
        var dir = moveRight ? 1 : -1;
        state.facingLeft = dir < 0;
        state.boatX += dir * BOAT_SPEED;
        // Clamp boat to water area
        state.boatX = Math.max(GROUND_RIGHT + 5, Math.min(state.boatX, WORLD_RIGHT - 80));
        state.playerX = state.boatX + 10;
        state.playerY = BOAT_Y - FRAME_H + 18;
      } else {
        if (gs === 'rowing') state.gameState = 'idle';
      }

      // Exit boat
      if (exitBoat) {
        keys['KeyQ'] = false;
        state.inBoat = false;
        state.playerX = GROUND_RIGHT - 10;
        state.playerY = getGroundYAt(state.playerX);
        state.gameState = 'idle';
        return;
      }

      // Fish from boat
      if (interact && (gs === 'idle' || gs === 'rowing')) {
        keys['KeyE'] = false;
        startFishing(true);
        return;
      }
      return;
    }

    // Walking on ground
    if (moveLeft || moveRight) {
      var dir = moveRight ? 1 : -1;
      var wantFace = (dir < 0);
      
      // 如果方向和当前朝向不同，先转身不移动
      if (state.facingLeft !== wantFace) {
        state.facingLeft = wantFace;
        state.gameState = 'idle';
      } else {
        var newX = state.playerX + dir * MOVE_SPEED;
        if (newX < WORLD_LEFT) newX = WORLD_LEFT;
        if (newX + FRAME_W > GROUND_RIGHT + 15) newX = GROUND_RIGHT + 15 - FRAME_W;
        state.playerX = newX;
        state.playerY = getGroundYAt(newX);
        state.gameState = 'walking';
      }
    } else {
      if (gs === 'walking') state.gameState = 'idle';
    }

    // Interact
    if (interact) {
      keys['KeyE'] = false;
      var cx = state.playerX + FRAME_W / 2;

      // Near water edge - fish
      if (cx > GROUND_RIGHT - 50) {
        startFishing(false);
        return;
      }

      // Near boat - enter boat
      if (Math.abs(cx - (BOAT_X + 37)) < 50 && !state.inBoat) {
        state.inBoat = true;
        state.boatX = BOAT_X;
        state.playerX = state.boatX + 10;
        state.playerY = BOAT_Y - FRAME_H + 18;
        state.gameState = 'idle';
        return;
      }
    }
  }

  // ===================== FISHING SYSTEM =====================
  function startFishing(fromBoat) {
    state.gameState = 'casting';
    state.animFrame = 0;
    state.animTimer = 0;
    state.castProgress = 0;
    state.facingLeft = false; // face water

    // Track depth zone for fish selection
    state.fishingFromBoat = fromBoat;
  }

  function spawnSplash(wx, wy) {
    for (var i = 0; i < 8; i++) {
      state.splashParticles.push({
        x: wx, y: wy,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2 - 1,
        life: 400 + Math.random() * 300,
        maxLife: 700
      });
    }
  }

  function getDepthZone(baitX) {
    var waterWidth = WORLD_RIGHT - GROUND_RIGHT;
    var dist = baitX - GROUND_RIGHT;
    var ratio = dist / waterWidth;
    return ratio > 0.4 ? 'deep' : 'shallow';
  }

  function adjustWeights(baseWeights, zone) {
    var w = {
      common: baseWeights.common,
      rare: baseWeights.rare,
      epic: baseWeights.epic,
      legendary: baseWeights.legendary
    };
    if (zone === 'deep') {
      w.common *= 0.6;
      w.rare *= 1.8;
      w.epic *= 2.5;
      w.legendary *= 3.0;
    }
    return w;
  }

  function getRodAdjustedWeights(rodLevel) {
    var w = {
      common: RARITY_WEIGHTS.common,
      rare: RARITY_WEIGHTS.rare,
      epic: RARITY_WEIGHTS.epic,
      legendary: RARITY_WEIGHTS.legendary
    };
    var bonus = (rodLevel - 1) * 0.25;
    w.rare *= (1 + bonus);
    w.epic *= (1 + bonus * 1.5);
    w.legendary *= (1 + bonus * 2);
    return w;
  }

  function selectFish(rodLevel, depthZone) {
    var weights = getRodAdjustedWeights(rodLevel);
    weights = adjustWeights(weights, depthZone);

    // Build weighted pool
    var pool = [];
    for (var i = 0; i < FISH_LIST.length; i++) {
      var f = FISH_LIST[i];
      var w = weights[f.rarity] || 0;
      pool.push({ fish: f, weight: w });
    }
    var total = 0;
    for (var j = 0; j < pool.length; j++) total += pool[j].weight;
    var roll = Math.random() * total;
    var acc = 0;
    for (var k = 0; k < pool.length; k++) {
      acc += pool[k].weight;
      if (roll <= acc) return pool[k].fish;
    }
    return pool[pool.length - 1].fish;
  }

  function updateFishing(dt) {
    var gs = state.gameState;

    if (gs === 'casting') {
      state.castProgress += dt;
      if (state.castProgress >= 600) {
        // 抛竿动画完成 → 等待咬钩
        state.gameState = 'waiting';
        state.fishTimer = 0;
        state.biteTimeout = 2000 + Math.random() * 6000;
        state.animFrame = 0;
      }
      return;
    }

    if (gs === 'waiting') {
      state.fishTimer += dt;
      if (state.fishTimer >= state.biteTimeout) {
        // 鱼咬钩了！
        state.gameState = 'biting';
        state.fishTimer = 0;
        state.exclamation = { timer: 2500 };
        var zone = state.fishingFromBoat ? 'deep' : 'shallow';
        state.currentFish = selectFish(state.rodLevel, zone);
      }
      return;
    }

    if (gs === 'biting') {
      state.fishTimer += dt;
      if (state.exclamation) {
        state.exclamation.timer -= dt;
        if (state.exclamation.timer <= 0) state.exclamation = null;
      }
      // 超时 → 鱼跑了
      if (state.fishTimer >= 2500) {
        showToast('鱼跑了！');
        resetFishing();
      }
      return;
    }

    if (gs === 'reeling') {
      state.fishTimer += dt;
      // hook 动画 6 帧 × 120ms = 720ms，给 800ms 播完
      if (state.fishTimer >= 800) {
        // 收杆完成 → 获得鱼 → 直接回 idle
        catchFish();
      }
      return;
    }
  }

  function reelIn() {
    if (state.gameState !== 'biting') return;
    state.gameState = 'reeling';
    state.fishTimer = 0;
    state.animFrame = 0;
    state.exclamation = null;
    state.lineShake = 0;
  }

  function catchFish() {
    var fish = state.currentFish;
    if (!fish) { resetFishing(); return; }

    // 直接回 idle
    var added = addFish(fish.id);
    unlockFish(fish.id);

    if (added) {
      showToast('钓到了 ' + fish.name + '！');
    } else {
      showToast('背包已满！' + fish.name + ' 逃走了');
    }

    state.catchDisplay = { fish: fish, timer: 2000 };
    renderAllUI();
    saveGame();
    resetFishing();
  }

  function resetFishing() {
    state.gameState = state.inBoat ? 'idle' : 'idle';
    state.currentFish = null;
    state.fishTimer = 0;
    state.lineShake = 0;
    state.exclamation = null;
    state.animFrame = 0;
  }

  // ===================== BACKPACK =====================
  function addFish(fishId) {
    // Check if already in backpack (stack)
    for (var i = 0; i < state.backpack.length; i++) {
      if (state.backpack[i].fishId === fishId) {
        state.backpack[i].quantity++;
        return true;
      }
    }
    // New slot
    if (state.backpack.length >= state.backpackCapacity) return false;
    state.backpack.push({ fishId: fishId, quantity: 1 });
    return true;
  }

  function sellFish(fishId) {
    for (var i = 0; i < state.backpack.length; i++) {
      if (state.backpack[i].fishId === fishId) {
        var fish = getFishById(fishId);
        if (!fish) return;
        var earned = fish.price * state.backpack[i].quantity;
        state.gold += earned;
        state.backpack.splice(i, 1);
        showToast('+' + earned + ' 金币');
        renderAllUI();
        saveGame();
        return;
      }
    }
  }

  function sellAll() {
    if (state.backpack.length === 0) return;
    var total = 0;
    for (var i = 0; i < state.backpack.length; i++) {
      var fish = getFishById(state.backpack[i].fishId);
      if (fish) total += fish.price * state.backpack[i].quantity;
    }
    state.gold += total;
    state.backpack = [];
    showToast('+' + total + ' 金币');
    renderAllUI();
    saveGame();
  }

  function getBackpackUsed() {
    return state.backpack.length;
  }

  function getFishById(id) {
    for (var i = 0; i < FISH_LIST.length; i++) {
      if (FISH_LIST[i].id === id) return FISH_LIST[i];
    }
    return null;
  }

  function renderBackpack() {
    var grid = $backpackGrid;
    grid.innerHTML = '';
    for (var i = 0; i < state.backpackCapacity; i++) {
      var cell = document.createElement('div');
      cell.className = 'bp-cell';
      if (i < state.backpack.length) {
        var slot = state.backpack[i];
        var fish = getFishById(slot.fishId);
        if (fish) {
          cell.className += ' occupied';
          var iconKey = 'icon' + (fish.icon < 10 ? '0' + fish.icon : '' + fish.icon);
          var img = document.createElement('img');
          img.src = assets[iconKey] ? assets[iconKey].src : '';
          img.alt = fish.name;
          cell.appendChild(img);
          var qty = document.createElement('span');
          qty.className = 'qty';
          qty.textContent = slot.quantity;
          cell.appendChild(qty);

          // Tooltip + sell on click
          (function(f, s) {
            cell.addEventListener('mouseenter', function(e) {
              showTooltip(e, '<span class="rarity-' + f.rarity + '">' + f.name + '</span><br>' +
                RARITY_LABELS[f.rarity] + ' · ' + f.price + '金/条<br>数量: ' + s.quantity +
                '<br><i>点击卖出</i>');
            });
            cell.addEventListener('mouseleave', hideTooltip);
            cell.addEventListener('click', function() { sellFish(f.id); });
          })(fish, slot);
        }
      }
      grid.appendChild(cell);
    }
    $backpackCount.textContent = getBackpackUsed() + '/' + state.backpackCapacity;
  }

  // ===================== CODEX =====================
  function unlockFish(fishId) {
    if (state.codex.indexOf(fishId) === -1) {
      state.codex.push(fishId);
    }
  }

  function isUnlocked(fishId) {
    return state.codex.indexOf(fishId) !== -1;
  }

  function getCodexProgress() {
    return { unlocked: state.codex.length, total: FISH_LIST.length };
  }

  function renderCodex() {
    var list = $codexList;
    list.innerHTML = '';
    var groups = {};
    for (var i = 0; i < FISH_LIST.length; i++) {
      var f = FISH_LIST[i];
      if (!groups[f.rarity]) groups[f.rarity] = [];
      groups[f.rarity].push(f);
    }
    for (var r = 0; r < RARITY_ORDER.length; r++) {
      var rarity = RARITY_ORDER[r];
      var fishes = groups[rarity];
      if (!fishes) continue;
      var header = document.createElement('span');
      header.className = 'rarity-group-header rarity-' + rarity;
      header.textContent = RARITY_LABELS[rarity];
      list.appendChild(header);
      for (var j = 0; j < fishes.length; j++) {
        var fish = fishes[j];
        var unlocked = isUnlocked(fish.id);
        var item = document.createElement('span');
        item.className = 'codex-item' + (unlocked ? '' : ' locked');
        var iconKey = 'icon' + (fish.icon < 10 ? '0' + fish.icon : '' + fish.icon);
        var img = document.createElement('img');
        img.src = assets[iconKey] ? assets[iconKey].src : '';
        item.appendChild(img);
        var nameSpan = document.createElement('span');
        nameSpan.className = 'rarity-' + fish.rarity;
        nameSpan.textContent = unlocked ? fish.name : '???';
        item.appendChild(nameSpan);
        if (unlocked) {
          (function(f) {
            item.addEventListener('mouseenter', function(e) {
              showTooltip(e, '<span class="rarity-' + f.rarity + '">' + f.name + '</span><br>' +
                f.desc + '<br>售价: ' + f.price + ' 金');
            });
            item.addEventListener('mouseleave', hideTooltip);
          })(fish);
        }
        list.appendChild(item);
      }
    }
    var prog = getCodexProgress();
    $codexProgress.textContent = prog.unlocked + '/' + prog.total;
  }

  // ===================== UPGRADES =====================
  function getRodUpgradeCost() {
    if (state.rodLevel >= ROD_UPGRADES.length) return -1;
    return ROD_UPGRADES[state.rodLevel].cost;
  }

  function getBackpackUpgradeCost() {
    for (var i = 0; i < BACKPACK_UPGRADES.length; i++) {
      if (BACKPACK_UPGRADES[i].capacity === state.backpackCapacity) {
        if (i + 1 < BACKPACK_UPGRADES.length) return BACKPACK_UPGRADES[i + 1].cost;
        return -1;
      }
    }
    return -1;
  }

  function upgradeRod() {
    var cost = getRodUpgradeCost();
    if (cost < 0) { showToast('已满级'); return false; }
    if (state.gold < cost) { showToast('金币不足'); return false; }
    state.gold -= cost;
    state.rodLevel++;
    showToast('升级到 ' + ROD_UPGRADES[state.rodLevel - 1].name + '！');
    renderAllUI();
    saveGame();
    return true;
  }

  function expandBackpack() {
    var cost = getBackpackUpgradeCost();
    if (cost < 0) { showToast('已满级'); return false; }
    if (state.gold < cost) { showToast('金币不足'); return false; }
    state.gold -= cost;
    state.backpackCapacity += 5;
    showToast('背包扩容到 ' + state.backpackCapacity + ' 格！');
    renderAllUI();
    saveGame();
    return true;
  }

  function renderUpgradePanel() {
    var panel = $upgradePanel;
    panel.innerHTML = '';

    // Rod upgrade
    var rodCost = getRodUpgradeCost();
    var rodBtn = document.createElement('button');
    rodBtn.className = 'shop-btn';
    if (rodCost < 0) {
      rodBtn.textContent = '🎣 ' + ROD_UPGRADES[state.rodLevel - 1].name + ' (MAX)';
      rodBtn.disabled = true;
    } else {
      rodBtn.innerHTML = '🎣 升级 → ' + ROD_UPGRADES[state.rodLevel].name +
        ' <span class="cost">' + rodCost + '金</span>';
      rodBtn.disabled = state.gold < rodCost;
      rodBtn.addEventListener('click', upgradeRod);
    }
    panel.appendChild(rodBtn);

    // Backpack upgrade
    var bpCost = getBackpackUpgradeCost();
    var bpBtn = document.createElement('button');
    bpBtn.className = 'shop-btn';
    if (bpCost < 0) {
      bpBtn.textContent = '🎒 背包 ' + state.backpackCapacity + '格 (MAX)';
      bpBtn.disabled = true;
    } else {
      bpBtn.innerHTML = '🎒 扩容 → ' + (state.backpackCapacity + 5) + '格' +
        ' <span class="cost">' + bpCost + '金</span>';
      bpBtn.disabled = state.gold < bpCost;
      bpBtn.addEventListener('click', expandBackpack);
    }
    panel.appendChild(bpBtn);
  }

  // ===================== SAVE / LOAD =====================
  function getDefaultState() {
    return {
      gold: 0,
      rodLevel: 1,
      backpack: [],
      backpackCapacity: 10,
      codex: []
    };
  }

  function saveGame() {
    try {
      var data = {
        gold: state.gold,
        rodLevel: state.rodLevel,
        backpack: state.backpack,
        backpackCapacity: state.backpackCapacity,
        codex: state.codex
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch(e) { /* silent */ }
  }

  function loadGame() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      var def = getDefaultState();
      state.gold = typeof data.gold === 'number' ? data.gold : def.gold;
      state.rodLevel = typeof data.rodLevel === 'number' ? Math.min(Math.max(data.rodLevel, 1), 4) : def.rodLevel;
      state.backpack = Array.isArray(data.backpack) ? data.backpack : def.backpack;
      state.backpackCapacity = typeof data.backpackCapacity === 'number' ? data.backpackCapacity : def.backpackCapacity;
      state.codex = Array.isArray(data.codex) ? data.codex : def.codex;
    } catch(e) {
      // Corrupted save, use defaults
    }
  }

  function resetGame() {
    if (!confirm('确定要重置所有进度吗？')) return;
    localStorage.removeItem(SAVE_KEY);
    var def = getDefaultState();
    state.gold = def.gold;
    state.rodLevel = def.rodLevel;
    state.backpack = def.backpack;
    state.backpackCapacity = def.backpackCapacity;
    state.codex = def.codex;
    state.gameState = 'idle';
    state.inBoat = false;
    state.playerX = 150;
    state.playerY = CHAR_GROUND_Y;
    state.boatX = BOAT_X;
    resetFishing();
    renderAllUI();
    showToast('已重置');
  }

  // ===================== UI HELPERS =====================
  function showToast(msg) {
    $toast.textContent = msg;
    $toast.style.display = 'block';
    $toast.style.animation = 'none';
    void $toast.offsetWidth;
    $toast.style.animation = 'toastFade 2s ease forwards';
    setTimeout(function() { $toast.style.display = 'none'; }, 2100);
  }

  function showTooltip(e, html) {
    $tooltip.innerHTML = html;
    $tooltip.style.display = 'block';
    var x = e.clientX + 12;
    var y = e.clientY + 12;
    if (x + 200 > window.innerWidth) x = e.clientX - 210;
    if (y + 100 > window.innerHeight) y = e.clientY - 110;
    $tooltip.style.left = x + 'px';
    $tooltip.style.top = y + 'px';
  }

  function hideTooltip() {
    $tooltip.style.display = 'none';
  }

  function updateGoldDisplay() {
    $goldNum.textContent = state.gold;
  }

  function updateRodInfo() {
    var rod = ROD_UPGRADES[state.rodLevel - 1];
    $rodInfo.textContent = '🎣 ' + rod.name + ' Lv.' + state.rodLevel;
  }

  function renderAllUI() {
    updateGoldDisplay();
    updateRodInfo();
    renderBackpack();
    renderCodex();
    renderUpgradePanel();
  }

  // ===================== ANIMATION UPDATE =====================
  function updateAnimation(dt) {
    state.animTimer += dt;
    var speed = state.animSpeed;
    if (state.gameState === 'walking' || state.gameState === 'rowing') speed = 120;
    if (state.gameState === 'casting') speed = 100;
    if (state.gameState === 'caught') speed = 200;

    if (state.animTimer >= speed) {
      state.animTimer -= speed;
      state.animFrame++;
    }
  }

  // ===================== DAY/NIGHT CYCLE =====================
  // 游戏1分钟 = 现实1秒，1天 = 1440秒 = 24分钟
  var DAY_LENGTH = 1440 * 1000; // 1440秒（毫秒）
  var dayTime = 0.333; // 从早上8点开始（8/24）
  var gameMinutes = 480; // 从 08:00 开始（8小时 × 60分钟）

  function updateDayNight(dt) {
    dayTime = (dayTime + dt / DAY_LENGTH) % 1;
    gameMinutes += dt / 1000; // 1秒现实 = 1分钟游戏
  }

  function getGameTimeString() {
    var totalMin = Math.floor(gameMinutes) % 1440;
    var hours = Math.floor(totalMin / 60) % 24;
    var mins = totalMin % 60;
    return (hours < 10 ? '0' : '') + hours + ':' + (mins < 10 ? '0' : '') + mins;
  }

  function drawGameTime() {
    ctx.save();
    ctx.font = 'bold ' + (8 * SCALE) + 'px Courier New';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText('🕐 ' + getGameTimeString(), 8 * SCALE, 12 * SCALE);
    ctx.restore();
  }

  function drawDayNightOverlay() {
    // 根据 dayTime 计算遮罩颜色和透明度
    // 0.0~0.1  黎明（粉紫 → 无）
    // 0.1~0.4  白天（无遮罩）
    // 0.4~0.55 黄昏（无 → 橙色）
    // 0.55~0.7 傍晚（橙色 → 深蓝）
    // 0.7~0.9  夜晚（深蓝）
    // 0.9~1.0  黎明前（深蓝 → 粉紫）
    var t = dayTime;
    var r = 0, g = 0, b = 0, a = 0;

    if (t < 0.1) {
      // 黎明 → 白天
      var p = t / 0.1;
      r = 150 - p * 150; g = 100 - p * 100; b = 180 - p * 180; a = 0.15 * (1 - p);
    } else if (t < 0.4) {
      // 白天，无遮罩
      a = 0;
    } else if (t < 0.55) {
      // 白天 → 黄昏
      var p = (t - 0.4) / 0.15;
      r = 255 * p; g = 150 * p; b = 50 * p; a = 0.2 * p;
    } else if (t < 0.7) {
      // 黄昏 → 夜晚
      var p = (t - 0.55) / 0.15;
      r = 255 * (1 - p) + 20 * p;
      g = 150 * (1 - p) + 20 * p;
      b = 50 * (1 - p) + 60 * p;
      a = 0.2 + p * 0.3;
    } else if (t < 0.9) {
      // 夜晚
      r = 20; g = 20; b = 60; a = 0.5;
    } else {
      // 夜晚 → 黎明
      var p = (t - 0.9) / 0.1;
      r = 20 + p * 130; g = 20 + p * 80; b = 60 + p * 120; a = 0.5 - p * 0.35;
    }

    if (a > 0.01) {
      ctx.fillStyle = 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ',' + a.toFixed(3) + ')';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ===================== GAME LOOP =====================
  var lastTime = 0;

  function gameLoop(timestamp) {
    var dt = timestamp - lastTime;
    if (dt > 200) dt = 200; // clamp
    lastTime = timestamp;

    // Update
    updatePlayer(dt);
    updateFishing(dt);
    updateAnimation(dt);
    updateCamera();
    updateDayNight(dt);

    // Render — layer order: sky bg → hut → boat → water → ground → character → UI → day/night overlay
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawHut();
    drawBoat();
    drawWaterTiles();
    drawGround();
    drawCharacter();
    drawGameTime();
    drawCatchDisplay();
    drawInteractionPrompt();

    requestAnimationFrame(gameLoop);
  }

  // ===================== INPUT HANDLERS =====================
  function setupInput() {
    document.addEventListener('keydown', function(e) {
      keys[e.code] = true;

      // Reel in on Space or click during biting
      if ((e.code === 'Space' || e.code === 'Enter') && state.gameState === 'biting') {
        reelIn();
      }
    });

    document.addEventListener('keyup', function(e) {
      keys[e.code] = false;
    });

    canvas.addEventListener('click', function(e) {
      // If biting, reel in on click
      if (state.gameState === 'biting') {
        reelIn();
        return;
      }

      // If idle/walking near dock or in boat, start fishing on click
      var gs = state.gameState;
      if (gs === 'idle' || gs === 'walking') {
        if (state.inBoat) {
          startFishing(true);
        } else if (state.playerX + FRAME_W / 2 > GROUND_RIGHT - 50) {
          startFishing(false);
        }
      }
    });

    // Sell all button
    document.getElementById('sellAllBtn').addEventListener('click', sellAll);

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetGame);
  }

  // ===================== CANVAS RESIZE =====================
  function resizeCanvas() {
    // Use origbig dimensions × SCALE for crisp pixel art
    canvas.width = CANVAS_W * SCALE;
    canvas.height = CANVAS_H * SCALE;
    ctx.imageSmoothingEnabled = false;
  }

  // ===================== INIT =====================
  function onAllAssetsLoaded() {
    // Hide loading screen
    $loadingScreen.classList.add('hidden');

    // Load save
    loadGame();

    // Set initial position
    state.playerY = getGroundYAt(state.playerX);

    // Render UI
    renderAllUI();

    // Start game loop
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    $goldNum = document.getElementById('goldNum');
    $rodInfo = document.getElementById('rodInfo');
    $backpackCount = document.getElementById('backpackCount');
    $backpackGrid = document.getElementById('backpackGrid');
    $codexProgress = document.getElementById('codexProgress');
    $codexList = document.getElementById('codexList');
    $upgradePanel = document.getElementById('upgradePanel');
    $tooltip = document.getElementById('tooltip');
    $toast = document.getElementById('toast');
    $canvasHint = document.getElementById('canvasHint');
    $loadingScreen = document.getElementById('loadingScreen');

    resizeCanvas();
    setupInput();
    loadAllAssets();

    // Safety timeout — force start after 5 seconds even if some assets fail
    setTimeout(function() {
      if ($loadingScreen && !$loadingScreen.classList.contains('hidden')) {
        console.warn('Loading timeout — forcing game start');
        onAllAssetsLoaded();
      }
    }, 5000);
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
