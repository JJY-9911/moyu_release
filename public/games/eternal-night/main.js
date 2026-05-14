(function () {
  'use strict';

  // ===================== CONSTANTS =====================
  var TILE = 16;          // tile size in pixels
  var MAP_W = 80;         // map width in tiles
  var MAP_H = 80;         // map height in tiles
  var VIEW_W = 800;       // canvas width
  var VIEW_H = 600;       // canvas height (4:3)
  var SCALE = 2;          // render scale (16px tile → 32px on screen)

  var TILE_GROUND = 0;
  var TILE_LAVA   = 1;

  // ===================== STATE MACHINE =====================
  // 'title' → 'select' → 'playing'
  var gameState = 'title';

  // ===================== HERO ROSTER =====================
  // Two real characters, each with Idle + Run spritesheets
  var HERO_ROSTER = [
    {
      name: '国王',
      key: 'king',
      color: '#ffdd44',
      desc: '近战战士，坚韧不拔',
      idleFrames: 8,
      runFrames:  8,
      frameW: 160,
      frameH: 111,
      bodyX: 64,   // left edge of body in frame
      bodyY: 51,   // head top Y in frame
      bodyW: 34,   // body width in pixels
      bodyH: 53,   // body height in pixels
      footY: 104,
      displayH: 25
    },
    {
      name: '法师',
      key: 'wizard',
      color: '#88aaff',
      desc: '远程法师，精通魔法',
      idleFrames: 8,
      runFrames:  8,
      frameW: 250,
      frameH: 250,
      bodyX: 109,
      bodyY: 63,
      bodyW: 56,
      bodyH: 103,
      footY: 166,
      displayH: 50
    }
  ];
  var selectedHeroIndex = 0;
  var hoveredHeroIndex  = -1;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = VIEW_W;
    canvas.height = VIEW_H;
    var maxW = window.innerWidth;
    var maxH = window.innerHeight;
    var scale = Math.min(maxW / VIEW_W, maxH / VIEW_H);
    canvas.style.width  = Math.floor(VIEW_W * scale) + 'px';
    canvas.style.height = Math.floor(VIEW_H * scale) + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  // ===================== ASSETS =====================
  var assets = {};
  var loadedCount = 0;
  var totalAssets = 0;

  function loadImg(key, src) {
    totalAssets++;
    var img = new Image();
    img.onload = function () { loadedCount++; if (loadedCount >= totalAssets) onReady(); };
    img.onerror = function () { loadedCount++; console.warn('Failed: ' + src); if (loadedCount >= totalAssets) onReady(); };
    img.src = src;
    assets[key] = img;
  }

  loadImg('ground', 'assets/texture_16px 288.webp');
  loadImg('bat',       'assets/monsters/Bat-IdleFly.png');
  loadImg('skeleton',  'assets/monsters/Skeleton_01_White_Walk.png');
  loadImg('guardian',  'assets/monsters/Old_Guardian_walk.png');
  loadImg('sl',        'assets/monsters/SL_walk.png');
  loadImg('sprout',    'assets/monsters/Sprout_move.png');
  loadImg('necromancer', 'assets/monsters/Necromancer_creativekind-Sheet.png');
  loadImg('fireball', 'assets/All_Fire_Bullet_Pixel_16x16_00.webp');
  loadImg('gem',    'assets/spr_coin_azu.webp');
  // Role sprites
  loadImg('king_idle', 'assets/role/king/Idle.png');
  loadImg('king_run',  'assets/role/king/Run.png');
  loadImg('wizard_idle', 'assets/role/wizard/Idle.png');
  loadImg('wizard_run',  'assets/role/wizard/Run.png');

  // ===================== GAME STATS =====================
  var gameTime  = 0;    // ms elapsed
  var killCount = 0;
  var gold      = 0;
  var level     = 1;
  var exp       = 0;
  var expToNext = 10;   // exp needed for next level

  // EXP curve: each level needs more exp
  function calcExpToNext(lv) {
    return Math.floor(10 * Math.pow(1.35, lv - 1));
  }

  function addExp(amount) {
    exp += amount;
    while (exp >= expToNext) {
      exp -= expToNext;
      level++;
      expToNext = calcExpToNext(level);
    }
  }

  // Item slots (up to 6 active items — placeholder icons for now)
  var ITEM_SLOTS = 6;
  var itemSlots = [
    { name: '火球术', icon: '🔥' },
    null, null, null, null, null
  ];

  // ===================== MAP GENERATION =====================
  var map = [];

  function generateMap() {
    for (var y = 0; y < MAP_H; y++) {
      map[y] = [];
      for (var x = 0; x < MAP_W; x++) {
        map[y][x] = TILE_GROUND;
      }
    }
  }

  // ===================== CAMERA =====================
  var cam = { x: 0, y: 0 };

  function clampCam() {
    var maxX = MAP_W * TILE * SCALE - VIEW_W;
    var maxY = MAP_H * TILE * SCALE - VIEW_H;
    cam.x = Math.floor(Math.max(0, Math.min(cam.x, maxX)));
    cam.y = Math.floor(Math.max(0, Math.min(cam.y, maxY)));
  }

  // ===================== HERO =====================
  var hero = {
    x: (MAP_W / 2) * TILE,
    y: (MAP_H / 2) * TILE,
    speed: 0.8,
    size: TILE * SCALE,
    facingLeft: false,
    moving: false,
    walkTimer: 0,
    bobOffset: 0,
    hp: 100,
    maxHp: 100,
    invincibleTimer: 0,  // brief invincibility after hit
    spriteRow: 0,        // legacy (unused now)
    rosterIndex: 0,      // which HERO_ROSTER entry
    animFrame: 0,
    animTimer: 0,
    animSpeed: 100       // ms per frame
  };

  // ===================== MONSTERS =====================
  var BAT_FRAME_W = 64;   // Bat-IdleFly.png: 576x64, 9 frames of 64x64
  var BAT_FRAME_H = 64;
  var BAT_FRAMES  = 9;
  var BAT_ANIM_SPEED = 80;

  var SKEL_FRAME_W = 96;  // Skeleton_01_White_Walk.png: 960x64, 10 frames of 96x64
  var SKEL_FRAME_H = 64;
  var SKEL_FRAMES  = 10;
  var SKEL_ANIM_SPEED = 100;

  var GUARD_FRAME_W = 120; // Old_Guardian_walk.png: 120x960, vertical, 8 frames
  var GUARD_FRAME_H = 120;
  var GUARD_FRAMES  = 8;
  var GUARD_ANIM_SPEED = 120;

  var SL_FRAME_W = 196;    // SL_walk.png: 196x1568, vertical, 8 frames
  var SL_FRAME_H = 196;
  var SL_FRAMES  = 8;
  var SL_ANIM_SPEED = 110;

  var SPROUT_FRAME_W = 96; // Sprout_move.png: 96x480, vertical, 5 frames
  var SPROUT_FRAME_H = 96;
  var SPROUT_FRAMES  = 5;
  var SPROUT_ANIM_SPEED = 130;

  var NECRO_FRAME_W = 160; // Necromancer sheet: 160x128 per frame
  var NECRO_FRAME_H = 128;
  var NECRO_WALK_ROW    = 0;  // row index for walk animation
  var NECRO_SUMMON_ROW  = 2;  // row index for summon animation
  var NECRO_WALK_FRAMES = 8;
  var NECRO_SUMMON_FRAMES = 13;
  var NECRO_WALK_ANIM_SPEED   = 100;
  var NECRO_SUMMON_ANIM_SPEED = 150;
  var NECRO_SUMMON_INTERVAL   = 10000; // ms between summons
  // Crop to body content (no whitespace)
  var NECRO_WALK_BODY_Y   = 56;  // content start Y within frame (row 0)
  var NECRO_WALK_BODY_H   = 59;
  var NECRO_SUMMON_BODY_Y = 12;
  var NECRO_SUMMON_BODY_H = 103;

  // Monster type definitions
  // vertical: true means frames stacked vertically (srcY = frame * frameH)
  // flipDefault: true means sprite faces left by default (flip when facing right)
  var MONSTER_TYPES = [
    { key: 'bat',        frameW: BAT_FRAME_W,    frameH: BAT_FRAME_H,    frames: BAT_FRAMES,    animSpeed: BAT_ANIM_SPEED,    disp: 28, flipDefault: false, vertical: false },
    { key: 'skeleton',   frameW: SKEL_FRAME_W,   frameH: SKEL_FRAME_H,   frames: SKEL_FRAMES,   animSpeed: SKEL_ANIM_SPEED,   disp: 24, flipDefault: true,  vertical: false },
    { key: 'guardian',   frameW: GUARD_FRAME_W,  frameH: GUARD_FRAME_H,  frames: GUARD_FRAMES,  animSpeed: GUARD_ANIM_SPEED,  disp: 48, flipDefault: true,  vertical: true  },
    { key: 'sl',         frameW: SL_FRAME_W,     frameH: SL_FRAME_H,     frames: SL_FRAMES,     animSpeed: SL_ANIM_SPEED,     disp: 48, flipDefault: true,  vertical: true  },
    { key: 'sprout',     frameW: SPROUT_FRAME_W, frameH: SPROUT_FRAME_H, frames: SPROUT_FRAMES, animSpeed: SPROUT_ANIM_SPEED, disp: 56, flipDefault: true,  vertical: true  },
    { key: 'necromancer',frameW: NECRO_FRAME_W,  frameH: NECRO_FRAME_H,  frames: NECRO_WALK_FRAMES, animSpeed: NECRO_WALK_ANIM_SPEED, disp: 25, flipDefault: true, vertical: false }
  ];

  var MONSTER_DISP = 32;   // default display size (overridden per type)
  var MONSTER_SPEED = 0.4;
  var MONSTER_HP = 1;
  var MONSTER_DAMAGE = 10;
  var MONSTER_HIT_COOLDOWN = 1000;
  var MONSTER_SPAWN_INTERVAL = 2000;
  var MAX_MONSTERS = 30;
  var MONSTER_SLOW_DURATION = 200;

  var monsters = [];
  var spawnTimer = 0;

  // ===================== GEMS =====================
  var GEM_SIZE = 16;
  var GEM_DISP = 12;
  var GEM_FRAMES = 4;
  var GEM_ANIM_SPEED = 120;
  var GEM_ATTRACT_RANGE = 25;  // world units — hero must walk quite close to trigger pull
  var GEM_PICKUP_RANGE = 2;    // world units — must nearly touch to collect
  var GEM_MAX_SPEED = 10;

  var gems = [];
  var gemCount = 0;

  function spawnGem(wx, wy) {
    gems.push({
      x: wx, y: wy,
      onGround: true,
      animFrame: 0,
      animTimer: 0,
      attracted: false,
      attractSpeed: 0,
      attractLockTimer: 800, // ms before attract can trigger
      idleTimer: 0
    });
  }

  function updateGems(dt) {
    var dtS = dt / 16.67; // normalize to 60fps
    for (var i = gems.length - 1; i >= 0; i--) {
      var g = gems[i];

      // Animate frames
      g.animTimer += dt;
      if (g.animTimer >= GEM_ANIM_SPEED) {
        g.animTimer -= GEM_ANIM_SPEED;
        g.animFrame = (g.animFrame + 1) % GEM_FRAMES;
      }

      var dx = hero.x - g.x;
      var dy = hero.y - g.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      // Pickup — only when very close
      if (dist < GEM_PICKUP_RANGE) {
        gemCount++;
        gems.splice(i, 1);
        continue;
      }

      // Count down attract lock regardless of state
      if (g.attractLockTimer > 0) g.attractLockTimer -= dt;

      if (!g.attracted) {
        // ── Phase 1: resting on ground, gentle idle bob ──
        g.idleTimer += dt;

        // Only start attracting after lock expires AND hero walks into range
        if (g.attractLockTimer <= 0 && dist < GEM_ATTRACT_RANGE) {
          g.attracted = true;
          g.attractSpeed = 0.8; // start slow — VS feel
        }
      } else {
        // ── Phase 3: accelerating pull toward hero ──
        // Slow start, then ramp up — matches VS magnet feel
        g.attractSpeed = Math.min(g.attractSpeed * 1.08 + 0.15, GEM_MAX_SPEED);
        g.x += (dx / dist) * g.attractSpeed * dtS;
        g.y += (dy / dist) * g.attractSpeed * dtS;
      }
    }
  }

  function drawGems() {
    var img = assets.gem;
    if (!img || !img.complete) return;
    ctx.imageSmoothingEnabled = false;
    for (var i = 0; i < gems.length; i++) {
      var g = gems[i];
      // Idle bob: gentle float when resting on ground
      var bobY = g.onGround ? Math.sin(g.idleTimer * 0.004) * 2 : 0;
      var sx = Math.floor(g.x * SCALE - cam.x) - GEM_DISP / 2;
      var sy = Math.floor(g.y * SCALE - cam.y) - GEM_DISP / 2 + bobY;
      ctx.save();
      if (g.attracted) {
        // Pulse alpha when being pulled in
        ctx.globalAlpha = 0.85 + Math.sin(Date.now() * 0.025) * 0.15;
      }
      ctx.drawImage(img, g.animFrame * GEM_SIZE, 0, GEM_SIZE, GEM_SIZE,
        sx, sy, GEM_DISP, GEM_DISP);
      ctx.restore();
    }
  }

  // gem count is now shown in drawTopHUD

  function spawnMonster() {
    if (monsters.length >= MAX_MONSTERS) return;

    // Spawn just outside the visible viewport in world coordinates
    var halfW = VIEW_W / SCALE / 2;  // half viewport in world units
    var halfH = VIEW_H / SCALE / 2;
    var pad   = 20;                  // extra margin beyond viewport edge

    var side = Math.floor(Math.random() * 4);
    var wx, wy;

    if (side === 0) {        // top
      wx = hero.x + (Math.random() - 0.5) * (halfW * 2 + pad * 2);
      wy = hero.y - halfH - pad - Math.random() * 20;
    } else if (side === 1) { // right
      wx = hero.x + halfW + pad + Math.random() * 20;
      wy = hero.y + (Math.random() - 0.5) * (halfH * 2 + pad * 2);
    } else if (side === 2) { // bottom
      wx = hero.x + (Math.random() - 0.5) * (halfW * 2 + pad * 2);
      wy = hero.y + halfH + pad + Math.random() * 20;
    } else {                 // left
      wx = hero.x - halfW - pad - Math.random() * 20;
      wy = hero.y + (Math.random() - 0.5) * (halfH * 2 + pad * 2);
    }

    wx = Math.max(0, Math.min(wx, MAP_W * TILE - TILE));
    wy = Math.max(0, Math.min(wy, MAP_H * TILE - TILE));
    wy = Math.max(0, Math.min(wy, MAP_H * TILE - TILE));

    monsters.push({
      x: wx, y: wy,
      hp: MONSTER_HP,
      type: Math.floor(Math.random() * MONSTER_TYPES.length),
      animFrame: 0,
      animTimer: 0,
      walkTimer: 0,
      bobOffset: 0,
      hitCooldown: 0,
      slowTimer: 0,
      facingLeft: false,
      summoning: false,       // necromancer summon state
      summonTimer: NECRO_SUMMON_INTERVAL * (0.5 + Math.random() * 0.5) // stagger first summon
    });
  }

  function updateMonsters(dt) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnMonster();
      spawnTimer = MONSTER_SPAWN_INTERVAL;
    }

    for (var i = monsters.length - 1; i >= 0; i--) {
      var m = monsters[i];

      // Move toward hero (slowed if hit by skill)
      var dx = hero.x - m.x;
      var dy = hero.y - m.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var heroRadius = (hero.size / SCALE) * 0.5;
      var monRadius  = (MONSTER_DISP / SCALE) * 0.5;
      var minHeroDist = heroRadius + monRadius;
      var spd = m.slowTimer > 0 ? 0 : MONSTER_SPEED;
      // Necromancer freezes in place while summoning
      if (MONSTER_TYPES[m.type] && MONSTER_TYPES[m.type].key === 'necromancer' && m.summoning) spd = 0;

      if (dist > minHeroDist) {
        // Only move if not already touching hero
        var moveX = (dx / dist) * spd;
        var moveY = (dy / dist) * spd;
        // Don't overshoot into hero
        var newDist = dist - spd;
        if (newDist < minHeroDist) {
          var clampedSpd = dist - minHeroDist;
          moveX = (dx / dist) * clampedSpd;
          moveY = (dy / dist) * clampedSpd;
        }
        m.x += moveX;
        m.y += moveY;
        m.facingLeft = dx < 0;
      }

      // Sway animation (same as hero)
      if (dist > 2) {
        m.walkTimer += dt;
        m.bobOffset = Math.sin(m.walkTimer * 0.014) * 7;
      } else {
        m.bobOffset *= 0.8;
        if (Math.abs(m.bobOffset) < 0.1) { m.bobOffset = 0; m.walkTimer = 0; }
      }

      // Slow timer
      if (m.slowTimer > 0) m.slowTimer -= dt;

      // Necromancer summon logic
      var isNecro = (MONSTER_TYPES[m.type] && MONSTER_TYPES[m.type].key === 'necromancer');
      if (isNecro) {
        m.summonTimer -= dt;
        if (!m.summoning && m.summonTimer <= 0) {
          m.summoning = true;
          m.animFrame = 0;
          m.animTimer = 0;
        }
      }

      // Animation
      m.animTimer += dt;
      var mType = MONSTER_TYPES[m.type] || MONSTER_TYPES[0];
      var animSpeed = mType.animSpeed;
      var totalFrames = mType.frames;
      if (isNecro && m.summoning) {
        animSpeed = NECRO_SUMMON_ANIM_SPEED;
        totalFrames = NECRO_SUMMON_FRAMES;
      }
      if (m.animTimer >= animSpeed) {
        m.animTimer -= animSpeed;
        m.animFrame++;
        if (m.animFrame >= totalFrames) {
          m.animFrame = 0;
          if (isNecro && m.summoning) {
            // Summon complete — back to walking
            m.summoning = false;
            m.summonTimer = NECRO_SUMMON_INTERVAL;
          }
        }
      }

      // Separation: push away from other monsters to avoid overlap
      var minDist = MONSTER_DISP / SCALE * 0.9;
      for (var j = 0; j < monsters.length; j++) {
        if (j === i) continue;
        var other = monsters[j];
        var sepDx = m.x - other.x;
        var sepDy = m.y - other.y;
        var sepDist = Math.sqrt(sepDx * sepDx + sepDy * sepDy);
        if (sepDist < minDist && sepDist > 0.01) {
          var push = (minDist - sepDist) * 0.15;
          m.x += (sepDx / sepDist) * push;
          m.y += (sepDy / sepDist) * push;
        }
      }

      // Hit cooldown
      if (m.hitCooldown > 0) m.hitCooldown -= dt;

      // Damage hero on contact
      if (hero.invincibleTimer <= 0 && m.hitCooldown <= 0) {
        var heroSize = hero.size / SCALE;
        if (Math.abs(m.x - hero.x) < heroSize * 0.8 && Math.abs(m.y - hero.y) < heroSize * 0.8) {
          hero.hp = Math.max(0, hero.hp - MONSTER_DAMAGE);
          hero.invincibleTimer = 500;
          m.hitCooldown = MONSTER_HIT_COOLDOWN;
        }
      }
    }

    if (hero.invincibleTimer > 0) hero.invincibleTimer -= dt;
  }

  function damageMonster(m, dmg) {
    m.hp -= dmg;
  }

  function drawMonsters() {
    ctx.imageSmoothingEnabled = false;

    for (var i = 0; i < monsters.length; i++) {
      var m = monsters[i];
      var mType = MONSTER_TYPES[m.type] || MONSTER_TYPES[0];
      var img = assets[mType.key];
      if (!img || !img.complete) continue;

      var s = mType.disp * SCALE;
      var sx = Math.floor(m.x * SCALE - cam.x) - s / 2 + TILE * SCALE / 2;
      var sy = Math.floor(m.y * SCALE - cam.y) - s / 2 + TILE * SCALE / 2;

      ctx.save();
      var shouldFlip = mType.flipDefault ? m.facingLeft : !m.facingLeft;
      if (shouldFlip) {
        ctx.translate(sx + s / 2, sy + s / 2);
        ctx.scale(-1, 1);
        ctx.translate(-(sx + s / 2), -(sy + s / 2));
      }
      if (m.slowTimer > 0) ctx.globalAlpha = 0.6;

      var srcX, srcY, srcW, srcH, dw, dh;
      if (mType.key === 'necromancer') {
        var necroRow = m.summoning ? NECRO_SUMMON_ROW  : NECRO_WALK_ROW;
        var bodyY    = m.summoning ? NECRO_SUMMON_BODY_Y : NECRO_WALK_BODY_Y;
        var bodyH    = m.summoning ? NECRO_SUMMON_BODY_H : NECRO_WALK_BODY_H;
        srcX = m.animFrame * NECRO_FRAME_W;
        srcY = necroRow * NECRO_FRAME_H + bodyY;
        srcW = NECRO_FRAME_W;
        srcH = bodyH;
        // Always scale based on walk bodyH so character size stays consistent
        dh = Math.round(s * bodyH / NECRO_WALK_BODY_H);
        dw = Math.round(dh * srcW / srcH);
      } else if (mType.vertical) {
        srcX = 0; srcY = m.animFrame * mType.frameH;
        srcW = mType.frameW; srcH = mType.frameH;
        dw = s; dh = s;
      } else {
        srcX = m.animFrame * mType.frameW; srcY = 0;
        srcW = mType.frameW; srcH = mType.frameH;
        dw = s; dh = s;
      }

      // Center horizontally, bottom-align vertically so feet stay grounded
      var drawX = sx + (s - dw) / 2;
      var drawY = sy + s - dh;  // align bottom edge to sprite bottom
      ctx.drawImage(img, srcX, srcY, srcW, srcH, drawX, drawY, dw, dh);
      ctx.restore();
      // No HP bar for monsters
    }
  }

  // ===================== HUD =====================

  function formatTime(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function drawHeroHpBar() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    var targetH = entry.displayH * SCALE;
    var targetW = Math.round(targetH * entry.bodyW / entry.bodyH);
    var cx = Math.floor(hero.x * SCALE - cam.x) + TILE * SCALE / 2;
    var footY = Math.floor(hero.y * SCALE - cam.y) + TILE * SCALE / 2;

    var barW = Math.max(targetW, 30);
    var barH = 4;
    var barX = cx - barW / 2;
    var barY = footY + 4;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    // Trough
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    // Fill
    var hpRatio = hero.hp / hero.maxHp;
    ctx.fillStyle = hpRatio > 0.6 ? '#22cc55' : hpRatio > 0.3 ? '#ffaa00' : '#ee2222';
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
  }

  function drawTopHUD() {
    var expBarY = 6;
    var expBarH = 20;
    var expBarPad = 12;
    var expBarW = VIEW_W - expBarPad * 2;
    var expRatio = expToNext > 0 ? exp / expToNext : 1;
    var expR = 4; // corner radius
    // Dark trough
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(expBarPad, expBarY, expBarW, expBarH, expR);
    ctx.fill();
    // Blue fill — clip to rounded trough so fill doesn't overflow corners
    ctx.save();
    roundRect(expBarPad, expBarY, expBarW, expBarH, expR);
    ctx.clip();
    var expGrd = ctx.createLinearGradient(expBarPad, 0, expBarPad + expBarW, 0);
    expGrd.addColorStop(0, '#2255cc');
    expGrd.addColorStop(1, '#55aaff');
    ctx.fillStyle = expGrd;
    ctx.fillRect(expBarPad, expBarY, expBarW * expRatio, expBarH);
    ctx.restore();
    // Border
    ctx.strokeStyle = 'rgba(100,160,255,0.7)';
    ctx.lineWidth = 1.5;
    roundRect(expBarPad + 0.5, expBarY + 0.5, expBarW - 1, expBarH - 1, expR);
    ctx.stroke();
    // Level text inside bar, right-aligned with equal padding
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText('LV.' + level, expBarPad + expBarW - expBarH/2 + 1, expBarY + expBarH - 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('LV.' + level, expBarPad + expBarW - expBarH/2, expBarY + expBarH - 6);

    // ── Center: time — below exp bar ──
    var timeY = expBarY + expBarH + 16; // 8px gap below bar
    ctx.font = 'bold 17px Courier New';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(formatTime(gameTime), VIEW_W / 2 + 1, timeY + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(formatTime(gameTime), VIEW_W / 2, timeY);

    // ── Right: level, gold, kills ──
    var rx = VIEW_W - 6;

    // Gold
    ctx.font = '12px Courier New';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(gold + ' 🪙', rx + 1, 31);
    ctx.fillStyle = '#ffdd55';
    ctx.fillText(gold + ' 🪙', rx, 30);

    // Kills
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(killCount + ' ☠', rx + 1, 45);
    ctx.fillStyle = '#ff8888';
    ctx.fillText(killCount + ' ☠', rx, 44);

    // HP bar is drawn below the hero sprite in drawHeroHpBar()
  }

  // Center camera on hero
  function centerCam() {
    cam.x = hero.x * SCALE - VIEW_W / 2;
    cam.y = hero.y * SCALE - VIEW_H / 2;
    clampCam();
  }

  // ===================== INPUT =====================
  var keys = {};
  var mouse = { x: VIEW_W / 2, y: VIEW_H / 2 }; // screen coords
  window.addEventListener('keydown', function (e) { keys[e.code] = true; });
  window.addEventListener('keyup',   function (e) { keys[e.code] = false; });
  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = VIEW_W / rect.width;
    var scaleY = VIEW_H / rect.height;
    mouse.x = (e.clientX - rect.left) * scaleX;
    mouse.y = (e.clientY - rect.top) * scaleY;
    // Update hovered hero on select screen
    if (gameState === 'select') {
      hoveredHeroIndex = getHeroAtPoint(mouse.x, mouse.y);
    }
  });
  canvas.addEventListener('click', function (e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = VIEW_W / rect.width;
    var scaleY = VIEW_H / rect.height;
    var cx = (e.clientX - rect.left) * scaleX;
    var cy = (e.clientY - rect.top) * scaleY;
    handleClick(cx, cy);
  });

  // ===================== TITLE & SELECT SCREENS =====================

  // Layout: 2 heroes, side by side, centered
  var CARD_W = 180, CARD_H = 200;
  var CARD_COLS = 2;
  var CARD_START_X = (VIEW_W - CARD_COLS * CARD_W - (CARD_COLS - 1) * 24) / 2;
  var CARD_START_Y = 120;
  var CARD_GAP = 24;

  function getCardRect(i) {
    var col = i % CARD_COLS;
    var row = Math.floor(i / CARD_COLS);
    return {
      x: CARD_START_X + col * (CARD_W + CARD_GAP),
      y: CARD_START_Y + row * (CARD_H + CARD_GAP),
      w: CARD_W,
      h: CARD_H
    };
  }

  function getHeroAtPoint(px, py) {
    for (var i = 0; i < HERO_ROSTER.length; i++) {
      var r = getCardRect(i);
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
    }
    // Check start button
    var btn = getStartBtnRect();
    if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) return -2;
    return -1;
  }

  function getStartBtnRect() {
    return { x: VIEW_W / 2 - 80, y: VIEW_H / 2 + 60, w: 160, h: 44 };
  }

  function getSelectStartBtnRect() {
    return { x: VIEW_W / 2 - 90, y: VIEW_H - 70, w: 180, h: 44 };
  }

  function handleClick(cx, cy) {
    if (gameState === 'title') {
      var btn = getStartBtnRect();
      if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
        gameState = 'select';
      }
    } else if (gameState === 'select') {
      // Click on a hero card to select
      var idx = -1;
      for (var i = 0; i < HERO_ROSTER.length; i++) {
        var r = getCardRect(i);
        if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
          idx = i;
          break;
        }
      }
      if (idx !== -1) {
        selectedHeroIndex = idx;
      }
      // Click start button
      var sbtn = getSelectStartBtnRect();
      if (cx >= sbtn.x && cx <= sbtn.x + sbtn.w && cy >= sbtn.y && cy <= sbtn.y + sbtn.h) {
        startGame();
      }
    }
  }

  function startGame() {
    // Reset game state
    hero.x = (MAP_W / 2) * TILE;
    hero.y = (MAP_H / 2) * TILE;
    hero.hp = hero.maxHp;
    hero.facingLeft = false;
    hero.moving = false;
    hero.walkTimer = 0;
    hero.bobOffset = 0;
    hero.invincibleTimer = 0;
    hero.spriteRow = 0;
    hero.rosterIndex = selectedHeroIndex;
    hero.animFrame = 0;
    hero.animTimer = 0;
    monsters = [];
    gems = [];
    gemCount = 0;
    spawnTimer = 0;
    skillEffect = null;
    skillCooldown = 0;
    // Reset stats
    gameTime  = 0;
    killCount = 0;
    gold      = 0;
    level     = 1;
    exp       = 0;
    expToNext = calcExpToNext(1);
    generateMap();
    centerCam();
    gameState = 'playing';
  }

  // Particle stars for title bg
  var stars = [];
  for (var _s = 0; _s < 80; _s++) {
    stars.push({ x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, r: Math.random() * 1.5 + 0.3, speed: Math.random() * 0.2 + 0.05 });
  }

  function drawTitleScreen(ts) {
    // Scrolling star background
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#ffffff';
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      st.y += st.speed;
      if (st.y > VIEW_H) { st.y = 0; st.x = Math.random() * VIEW_W; }
      ctx.globalAlpha = 0.5 + Math.sin(ts * 0.002 + i) * 0.3;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Title glow
    var grd = ctx.createRadialGradient(VIEW_W / 2, 200, 10, VIEW_W / 2, 200, 180);
    grd.addColorStop(0, 'rgba(120,60,200,0.35)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 80, VIEW_W, 260);

    // Title text
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px Courier New';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText('ETERNAL', VIEW_W / 2 + 2, 172);
    ctx.fillText('NIGHT',   VIEW_W / 2 + 2, 232);
    var pulse = 0.85 + Math.sin(ts * 0.003) * 0.15;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#cc88ff';
    ctx.fillText('ETERNAL', VIEW_W / 2, 170);
    ctx.fillStyle = '#8844cc';
    ctx.fillText('NIGHT',   VIEW_W / 2, 230);
    ctx.globalAlpha = 1;

    // Subtitle
    ctx.font = '13px Courier New';
    ctx.fillStyle = '#8888aa';
    ctx.fillText('在永恒的黑夜中生存', VIEW_W / 2, 262);

    // Start button
    var btn = getStartBtnRect();
    var btnHover = mouse.x >= btn.x && mouse.x <= btn.x + btn.w && mouse.y >= btn.y && mouse.y <= btn.y + btn.h;
    ctx.fillStyle = btnHover ? 'rgba(160,80,255,0.9)' : 'rgba(100,40,180,0.8)';
    roundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();
    ctx.strokeStyle = btnHover ? '#dd99ff' : '#8844cc';
    ctx.lineWidth = 2;
    roundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Courier New';
    ctx.fillText('开始游戏', VIEW_W / 2, btn.y + 28);

    // Version hint
    ctx.font = '10px Courier New';
    ctx.fillStyle = '#444466';
    ctx.fillText('WASD 移动  ·  技能自动释放', VIEW_W / 2, VIEW_H - 20);
  }

  function drawSelectScreen(ts) {
    // Dark bg
    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Dim stars
    ctx.fillStyle = '#ffffff';
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Header
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Courier New';
    ctx.fillStyle = '#cc88ff';
    ctx.fillText('选择英雄', VIEW_W / 2, 50);
    ctx.font = '12px Courier New';
    ctx.fillStyle = '#666688';
    ctx.fillText('点击选择，再点击「出发」开始冒险', VIEW_W / 2, 74);

    var PREVIEW = 80; // display size of hero preview

    for (var i = 0; i < HERO_ROSTER.length; i++) {
      var h = HERO_ROSTER[i];
      var r = getCardRect(i);
      var isSelected = (i === selectedHeroIndex);
      var isHovered  = (i === hoveredHeroIndex);

      // Card bg
      ctx.fillStyle = isSelected ? 'rgba(120,50,220,0.55)' : isHovered ? 'rgba(80,40,140,0.45)' : 'rgba(20,15,40,0.8)';
      roundRect(r.x, r.y, r.w, r.h, 10);
      ctx.fill();

      // Card border
      ctx.strokeStyle = isSelected ? '#cc88ff' : isHovered ? '#8855cc' : '#332255';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      roundRect(r.x, r.y, r.w, r.h, 10);
      ctx.stroke();

      // Hero sprite preview — exact same logic as drawHero, scaled to card
      var idleImg = assets[h.key + '_idle'];
      var previewFrame = Math.floor(ts / 150) % h.idleFrames;
      var floatY = Math.sin(ts * 0.002 + i * 1.2) * 3;
      // Use displayH to get same proportions as in-game
      var CARD_SCALE = 3; // preview scale factor
      var dh = h.displayH * CARD_SCALE;
      var dw = Math.round(dh * h.bodyW / h.bodyH);
      var footPy = r.y + r.h - 48;
      var px = r.x + (r.w - dw) / 2;
      var py = footPy - dh;
      ctx.imageSmoothingEnabled = false;
      if (idleImg && idleImg.complete) {
        ctx.drawImage(idleImg,
          previewFrame * h.frameW + h.bodyX, h.bodyY,
          h.bodyW, h.bodyH,
          px, py + floatY, dw, dh);
      } else {
        ctx.fillStyle = h.color;
        ctx.fillRect(px, py, dw, dh);
      }

      // Hero name
      ctx.textAlign = 'center';
      ctx.font = isSelected ? 'bold 14px Courier New' : '13px Courier New';
      ctx.fillStyle = isSelected ? '#eeccff' : '#aaaacc';
      ctx.fillText(h.name, r.x + r.w / 2, r.y + r.h - 32);

      // Description
      ctx.font = '10px Courier New';
      ctx.fillStyle = isSelected ? '#cc99ee' : '#666688';
      ctx.fillText(h.desc, r.x + r.w / 2, r.y + r.h - 18);

      // Selected checkmark
      if (isSelected) {
        ctx.font = '11px Courier New';
        ctx.fillStyle = '#cc88ff';
        ctx.fillText('▶ 已选择', r.x + r.w / 2, r.y + r.h - 4);
      }
    }

    // Start button
    var sbtn = getSelectStartBtnRect();
    var sbtnHover = mouse.x >= sbtn.x && mouse.x <= sbtn.x + sbtn.w && mouse.y >= sbtn.y && mouse.y <= sbtn.y + sbtn.h;
    ctx.fillStyle = sbtnHover ? 'rgba(160,80,255,0.95)' : 'rgba(100,40,180,0.85)';
    roundRect(sbtn.x, sbtn.y, sbtn.w, sbtn.h, 8);
    ctx.fill();
    ctx.strokeStyle = sbtnHover ? '#dd99ff' : '#8844cc';
    ctx.lineWidth = 2;
    roundRect(sbtn.x, sbtn.y, sbtn.w, sbtn.h, 8);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('出发 →', VIEW_W / 2, sbtn.y + 28);
  }

  // Helper: rounded rect path
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ===================== SKILL — FIREBALL =====================
  var FIREBALL_FRAMES = [
    {srcX: 448, srcY: 224},
    {srcX: 480, srcY: 224},
    {srcX: 512, srcY: 224},
    {srcX: 544, srcY: 224}
  ];
  var FIREBALL_SIZE = 32;   // source frame size
  var FIREBALL_DISP = 64;   // display size on screen
  var FIREBALL_COOLDOWN = 1000; // ms between casts
  var FIREBALL_ANIM_SPEED = 80; // ms per frame

  // Active skill effect: plays once then disappears
  var skillEffect = null; // {animTimer, animFrame, done, hitSet}
  var skillCooldown = 0;

  function castSkill() {
    skillEffect = { animTimer: 0, animFrame: 0, done: false, hitSet: [] };
  }

  function updateSkillHits() {
    if (!skillEffect || skillEffect.done) return;
    var range = FIREBALL_DISP / SCALE;
    for (var i = monsters.length - 1; i >= 0; i--) {
      var m = monsters[i];
      // Skip if already hit this cast
      if (skillEffect.hitSet.indexOf(m) !== -1) continue;
      var dx = m.x - hero.x;
      var dy = m.y - hero.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < range) {
        var inFront = hero.facingLeft ? dx < 0 : dx > 0;
        if (inFront) {
          skillEffect.hitSet.push(m);
          damageMonster(m, 1);
          m.slowTimer = MONSTER_SLOW_DURATION;
          if (m.hp <= 0) {
            spawnGem(m.x, m.y);
            killCount++;
            gold += 1 + Math.floor(Math.random() * 3);
            addExp(1);
            monsters.splice(i, 1);
          }
        }
      }
    }
  }

  function updateSkill(dt) {
    skillCooldown -= dt;
    if (skillCooldown <= 0) {
      castSkill();
      skillCooldown = FIREBALL_COOLDOWN;
    }

    updateSkillHits(); // check hits every frame during animation

    if (skillEffect && !skillEffect.done) {
      skillEffect.animTimer += dt;
      if (skillEffect.animTimer >= FIREBALL_ANIM_SPEED) {
        skillEffect.animTimer -= FIREBALL_ANIM_SPEED;
        skillEffect.animFrame++;
        if (skillEffect.animFrame >= FIREBALL_FRAMES.length) {
          skillEffect.done = true;
        }
      }
    }
  }

  function drawSkill() {
    if (!skillEffect || skillEffect.done) return;
    var fb = assets.fireball;
    if (!fb || !fb.complete) return;

    var f = FIREBALL_FRAMES[skillEffect.animFrame];
    // Draw alongside hero (to the right if facing right, left if facing left)
    var heroScreenX = hero.x * SCALE - cam.x;
    var heroScreenY = hero.y * SCALE - cam.y;
    var s = hero.size;
    var offsetX = hero.facingLeft ? -FIREBALL_DISP : s;
    var sx = heroScreenX + offsetX;
    var sy = heroScreenY + (s - FIREBALL_DISP) / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (hero.facingLeft) {
      // Flip to match hero direction
      ctx.translate(sx + FIREBALL_DISP / 2, sy + FIREBALL_DISP / 2);
      ctx.scale(-1, 1);
      ctx.translate(-(sx + FIREBALL_DISP / 2), -(sy + FIREBALL_DISP / 2));
    }
    ctx.drawImage(fb, f.srcX, f.srcY, FIREBALL_SIZE, FIREBALL_SIZE, sx, sy, FIREBALL_DISP, FIREBALL_DISP);
    ctx.restore();
  }

  // ===================== UPDATE =====================
  function update(dt) {
    gameTime += dt;
    var dx = 0, dy = 0;
    if (keys['KeyA'] || keys['ArrowLeft'])  dx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
    if (keys['KeyW'] || keys['ArrowUp'])    dy -= 1;
    if (keys['KeyS'] || keys['ArrowDown'])  dy += 1;

    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    hero.moving = (dx !== 0 || dy !== 0);

    // Update facing direction
    if (dx < 0) hero.facingLeft = true;
    if (dx > 0) hero.facingLeft = false;

    hero.x += dx * hero.speed;
    hero.y += dy * hero.speed;

    // Clamp hero to map
    hero.x = Math.max(0, Math.min(hero.x, MAP_W * TILE - TILE));
    hero.y = Math.max(0, Math.min(hero.y, MAP_H * TILE - TILE));

    // Walk bob animation — rotation sway like Vampire Survivors
    if (hero.moving) {
      hero.walkTimer += dt;
      hero.bobOffset = Math.sin(hero.walkTimer * 0.012) * 8;
    } else {
      hero.bobOffset *= 0.8;
      if (Math.abs(hero.bobOffset) < 0.1) { hero.bobOffset = 0; hero.walkTimer = 0; }
    }

    updateSkill(dt);
    updateMonsters(dt);
    updateGems(dt);

    // Hero animation frames
    var rosterEntry = HERO_ROSTER[hero.rosterIndex];
    var totalFrames = hero.moving ? rosterEntry.runFrames : rosterEntry.idleFrames;
    hero.animTimer += dt;
    if (hero.animTimer >= hero.animSpeed) {
      hero.animTimer -= hero.animSpeed;
      hero.animFrame = (hero.animFrame + 1) % totalFrames;
    }

    centerCam();
  }

  // ===================== DRAW =====================
  function drawMap() {
    var tileScreen = TILE * SCALE;
    var startX = Math.max(0, Math.floor(cam.x / tileScreen));
    var startY = Math.max(0, Math.floor(cam.y / tileScreen));
    var endX   = Math.min(MAP_W, Math.ceil((cam.x + VIEW_W) / tileScreen));
    var endY   = Math.min(MAP_H, Math.ceil((cam.y + VIEW_H) / tileScreen));

    ctx.imageSmoothingEnabled = false;

    for (var ty = startY; ty < endY; ty++) {
      for (var tx = startX; tx < endX; tx++) {
        var sx = Math.floor(tx * tileScreen - cam.x);
        var sy = Math.floor(ty * tileScreen - cam.y);
        if (assets.ground && assets.ground.complete) {
          ctx.drawImage(assets.ground, 0, 0, TILE, TILE, sx, sy, tileScreen + 1, tileScreen + 1);
        } else {
          ctx.fillStyle = '#3a5a3a';
          ctx.fillRect(sx, sy, tileScreen + 1, tileScreen + 1);
        }
      }
    }
  }

  function drawHero() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    var imgKey = hero.moving ? entry.key + '_run' : entry.key + '_idle';
    var img = assets[imgKey];

    // Crop to exact body region (bodyX, bodyY, bodyW, bodyH)
    var srcY = entry.bodyY;
    var srcH = entry.bodyH;
    var srcW = entry.bodyW;
    var targetH = entry.displayH * SCALE;
    var targetW = Math.round(targetH * srcW / srcH);

    // Align foot to hero world position center
    var cx = Math.floor(hero.x * SCALE - cam.x) + TILE * SCALE / 2;
    var footScreenY = Math.floor(hero.y * SCALE - cam.y) + TILE * SCALE / 2;
    var sx = cx - targetW / 2;
    var sy = footScreenY - targetH;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (hero.facingLeft) {
      ctx.translate(cx, footScreenY);
      ctx.scale(-1, 1);
      ctx.translate(-cx, -footScreenY);
    }

    if (hero.invincibleTimer > 0 && Math.floor(hero.invincibleTimer / 80) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    if (img && img.complete) {
      ctx.drawImage(img,
        hero.animFrame * entry.frameW + entry.bodyX, srcY,
        srcW, srcH,
        sx, sy, targetW, targetH);
    } else {
      ctx.fillStyle = entry.color;
      ctx.fillRect(sx, sy, targetW, targetH);
    }

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawMap();
    drawGems();
    drawMonsters();
    drawSkill();
    drawHero();
    drawHeroHpBar();
    drawTopHUD();
  }

  // ===================== LOOP =====================
  var lastTime = 0;

  function loop(ts) {
    var dt = ts - lastTime;
    if (dt > 200) dt = 200;
    lastTime = ts;

    if (gameState === 'title') {
      drawTitleScreen(ts);
    } else if (gameState === 'select') {
      drawSelectScreen(ts);
    } else if (gameState === 'playing') {
      update(dt);
      draw();
    }

    requestAnimationFrame(loop);
  }

  // Analyze sprite content bounding box — pass multiple images to get a unified bbox
  function onReady() {
    generateMap();
    centerCam();
    requestAnimationFrame(loop);
  }

})();
