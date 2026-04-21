(function() {
  'use strict';

  // ============================================================
  // CONFIG
  // ============================================================
  var EVOLUTION_STAGES = [
    { name: '实习鱼',     size: 12, color: '#88bbdd', fin: '#6699bb', belly: '#aaddee', desc: '只知道吃', evoNeed: 10 },
    { name: '沙丁鱼',     size: 15, color: '#5599bb', fin: '#447799', belly: '#77bbdd', desc: '成群结队，没有主见', evoNeed: 10 },
    { name: '躺平咸鱼',   size: 19, color: '#9988bb', fin: '#776699', belly: '#bbaadd', desc: '完全躺平，不会抢吃的，只会喝马尿和国窖', evoNeed: 10 },
    { name: '带薪摸鱼王', size: 24, color: '#bb7799', fin: '#995577', belly: '#dd99bb', desc: '不吃不喝不生育', evoNeed: 10 },
    { name: '锦鲤',       size: 29, color: '#ee7755', fin: '#cc5533', belly: '#ffaa88', desc: '全靠运气吃饭，别的鱼进化时自动升0.5级', evoNeed: 10 },
    { name: '电鳗',       size: 35, color: '#ddcc33', fin: '#bbaa11', belly: '#ffee66', desc: '攻击同事，被碰到的鱼会弹飞', evoNeed: 10 },
    { name: '量子鱼',     size: 41, color: '#9955ee', fin: '#7733cc', belly: '#bb88ff', desc: '既在摸鱼也在工作，常常消失', evoNeed: 10 },
    { name: '摸鱼之神',   size: 48, color: '#ee33ee', fin: '#cc11cc', belly: '#ff77ff', desc: '老板也无法约束，貌似既不升级也不进化，有待研究', evoNeed: -2 },
    { name: '鲲',         size: 60, color: '#33eedd', fin: '#11ccbb', belly: '#77ffee', desc: '一开始只想摸鱼，最后吞噬世界', evoNeed: 0 }
  ];

  var EARNING_DEFS = [
    { id: 'cursor',  name: '自动光标',  perTick: 1,   baseCost: 0,    priceGrowth: 0,    maxCount: 1,  visible: false },
    { id: 'pickaxe', name: '金矿镐',    perTick: 3,    baseCost: 10,   priceGrowth: 0.25, maxCount: 20, visible: true },
    { id: 'factory', name: '金币工厂',  perTick: 25,   baseCost: 500,  priceGrowth: 0.3,  maxCount: 10, visible: true },
    { id: 'bank',    name: '金币银行',  perTick: 200,  baseCost: 5000, priceGrowth: 0.4,  maxCount: 10,  visible: true }
  ];

  // 喂鱼设施：自动投喂，可购买多个
  var FEED_DEFS = [
    { id: 'booger', name: '鼻屎', baseCost: 15,  priceGrowth: 0.20, maxCount: 100, interval: 8,  type: 'target', levelUp: 1,   effectGrowth: 0,   desc: '每8秒投放，吃到的鱼升1级' },
    { id: 'pee',    name: '马尿', baseCost: 60,  priceGrowth: 0.30, maxCount: 100, interval: 20,  type: 'all',    levelUp: 0.1, extraPerUnit: 0.01, desc: '每30秒投放，所有鱼升0.10级' },
    { id: 'liquor', name: '国窖', baseCost: 500, priceGrowth: 0.40, maxCount: 100, interval: 30,  type: 'all',    levelUp: 0.3, extraPerUnit: 0.03, desc: '每40秒投放，所有鱼升0.30级' },
    { id: 'pill',   name: '魔丸', baseCost: 99000, priceGrowth: 0.5, maxCount: 100,  interval: 40, type: 'target', levelUp: 0,   effectGrowth: 0,   desc: '每60秒投放，吃到的鱼生一只鱼', special: 'birth' },
    { id: 'orb',    name: '灵珠', baseCost: 999000, priceGrowth: 0.5, maxCount: 100,  interval: 90, type: 'target', levelUp: 0,   effectGrowth: 0,   desc: '每90秒投放，吃到的鱼进化一次', special: 'evolve' }
  ];

  // 特殊道具：手动使用
  var SPECIAL_DEFS = [
    { id: 'chicken',name: '🐔酱味大鸡', cost: 500, type: 'click-fish', desc: '点击指定鱼退化一阶' },
    { id: 'gauntlet',name:'🧤无限手套', cost: 2000, type: 'instant', desc: '消灭一半的鱼(摸鱼之神免疫)' }
  ];

  // FOOD_DEFS 兼容旧逻辑
  var FOOD_DEFS = SPECIAL_DEFS;

  // ============================================================
  // LAYOUT — hexagonal pond boundary (as ratios of canvas)
  // 6 vertices of the hex, clockwise from top
  // ============================================================
  var BG_W = 2112, BG_H = 1952;
  var HEX_VERTS = [
    { x: 0.500, y: 0.070 },  // top
    { x: 0.940, y: 0.310 },  // top-right
    { x: 0.940, y: 0.700 },  // bottom-right
    { x: 0.500, y: 0.940 },  // bottom
    { x: 0.060, y: 0.700 },  // bottom-left
    { x: 0.060, y: 0.310 }   // top-left
  ];

  var CW, CH, SCALE;
  // Hex verts in pixel coords (recalculated on resize)
  var hexPx = [];

  // Images
  var bgImg = new Image(); bgImg.src = 'assets/bg.webp';
  var pickaxImg = new Image(); pickaxImg.src = 'assets/pickax.webp';
  var factoryImg = new Image(); factoryImg.src = 'assets/factory.webp';
  var bankImg = new Image(); bankImg.src = 'assets/bank.webp';

  // Fish sprites (fish1.webp = evo 0, fish9.webp = evo 8)
  var fishImgs = [];
  for (var fi = 1; fi <= 9; fi++) {
    var img = new Image();
    img.src = 'assets/fish' + fi + '.webp';
    fishImgs.push(img);
  }


  // ============================================================
  // STATE
  // ============================================================
  var state = {
    gold: 0,
    earnings: { cursor: 1 },
    feedFacilities: {},
    inventory: {},
    selectedFood: null,
    fishes: [],
    pondOverlay: null,
    pondOverlayTimer: 0
  };

  var feedAnims = [];
  var bubblePopups = [];
  var ripples = [];
  var debugInfiniteGold = false; // test toggle

  // ============================================================
  // HELPERS
  // ============================================================
  function formatNum(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Math.floor(n).toString();
  }

  function shade(hex, amt) {
    var r = Math.max(0, Math.min(255, parseInt(hex.slice(1,3),16) + amt));
    var g = Math.max(0, Math.min(255, parseInt(hex.slice(3,5),16) + amt));
    var b = Math.max(0, Math.min(255, parseInt(hex.slice(5,7),16) + amt));
    return '#' + [r,g,b].map(function(c){return c.toString(16).padStart(2,'0');}).join('');
  }

  // Point-in-polygon (hex)
  function isInHex(px, py) {
    var inside = false;
    var vs = hexPx;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      var xi = vs[i].x, yi = vs[i].y;
      var xj = vs[j].x, yj = vs[j].y;
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  // Push a point back inside the hex if it's outside
  function clampToHex(rx, ry) {
    // Simple approach: if outside, push toward center
    var cx = 0.5, cy = 0.5;
    var testX = rx * CW, testY = ry * CH;
    if (isInHex(testX, testY)) return { x: rx, y: ry };
    // Binary search toward center
    var lo = 0, hi = 1;
    for (var i = 0; i < 10; i++) {
      var mid = (lo + hi) / 2;
      var mx = cx + (rx - cx) * mid;
      var my = cy + (ry - cy) * mid;
      if (isInHex(mx * CW, my * CH)) { lo = mid; } else { hi = mid; }
    }
    var f = lo;
    return { x: cx + (rx - cx) * f, y: cy + (ry - cy) * f };
  }

  // ============================================================
  // CANVAS
  // ============================================================
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');

  function resizeCanvas() {
    // On desktop: canvas is a square sized to fit viewport height minus padding
    // On mobile: canvas fills width
    var isMobile = window.innerWidth <= 768;
    var side;
    if (isMobile) {
      side = window.innerWidth - 8;
    } else {
      side = Math.min(window.innerWidth - 440, window.innerHeight - 56);
      side = Math.max(300, side);
    }
    CW = side; CH = side;
    canvas.width = CW; canvas.height = CH;
    canvas.style.width = CW + 'px';
    canvas.style.height = CH + 'px';
    SCALE = Math.max(CW / BG_W, CH / BG_H);
    hexPx = HEX_VERTS.map(function(v) { return { x: v.x * CW, y: v.y * CH }; });
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);


  // ============================================================
  // FISH — 2D on hex plane (ratio coords 0-1)
  // ============================================================
  function createFish(evoIndex) {
    // Spawn near center
    var a = Math.random() * Math.PI * 2;
    var r = Math.random() * 0.2;
    return {
      evoIndex: evoIndex || 0, level: 1,
      rx: 0.5 + Math.cos(a) * r,
      ry: 0.5 + Math.sin(a) * r,
      vx: (Math.random() - 0.5) * 0.002,
      vy: (Math.random() - 0.5) * 0.002,
      tx: null, ty: null,
      birthCooldown: 0
    };
  }

  function updateFish(fish) {
    if (fish.tx !== null) {
      var dx = fish.tx - fish.rx, dy = fish.ty - fish.ry;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.015) {
        fish.tx = null; fish.ty = null;
        fish.vx = (Math.random() - 0.5) * 0.002;
        fish.vy = (Math.random() - 0.5) * 0.002;
        return true;
      }
      var spd = 0.004 + fish.evoIndex * 0.0003;
      fish.vx = (dx / dist) * spd;
      fish.vy = (dy / dist) * spd;
    } else {
      if (Math.random() < 0.008) {
        fish.vx = (Math.random() - 0.5) * 0.002;
        fish.vy = (Math.random() - 0.5) * 0.002;
      }
    }

    fish.rx += fish.vx;
    fish.ry += fish.vy;

    // Keep inside hex
    if (!isInHex(fish.rx * CW, fish.ry * CH)) {
      fish.rx -= fish.vx * 1.5;
      fish.ry -= fish.vy * 1.5;
      fish.vx *= -0.6; fish.vy *= -0.6;
      var c = clampToHex(fish.rx, fish.ry);
      fish.rx = c.x; fish.ry = c.y;
    }

    if (fish.birthCooldown > 0) fish.birthCooldown--;
    return false;
  }

  // ============================================================
  // FISH COLLISION (2D)
  // ============================================================
  function getFishRadius(fish) {
    var evo = EVOLUTION_STAGES[fish.evoIndex];
    return (evo.size + Math.floor(fish.level * 0.25)) * 0.4 / 800;
  }

  function resolveCollisions() {
    var fishes = state.fishes.slice(0, MAX_FISH_VISIBLE);
    for (var i = 0; i < fishes.length; i++) {
      for (var j = i + 1; j < fishes.length; j++) {
        var a = fishes[i], b = fishes[j];
        var dx = a.rx - b.rx, dy = a.ry - b.ry;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var minD = getFishRadius(a) + getFishRadius(b);
        if (dist < minD && dist > 0.0001) {
          var overlap = (minD - dist) * 0.5;
          var nx = dx / dist, ny = dy / dist;
          a.rx += nx * overlap; a.ry += ny * overlap;
          b.rx -= nx * overlap; b.ry -= ny * overlap;

          // 电鳗(5) knocks other fish away hard
          var knockA = 0.0002, knockB = 0.0002;
          if (a.evoIndex === 5) knockB = 0.003;
          if (b.evoIndex === 5) knockA = 0.003;

          a.vx += nx * knockA; a.vy += ny * knockA;
          b.vx -= nx * knockB; b.vy -= ny * knockB;
        }
      }
    }
  }

  // ============================================================
  // DRAW FISH — using sprite images
  // ============================================================
  function drawFish(ctx, fish) {
    var evo = EVOLUTION_STAGES[fish.evoIndex];
    var baseScale = CW / 800;
    var s = (evo.size + Math.floor(fish.level * 0.25)) * baseScale;
    var x = Math.round(fish.rx * CW), y = Math.round(fish.ry * CH);
    var left = fish.vx < 0;

    var img = fishImgs[fish.evoIndex];
    if (img && img.complete && img.naturalWidth > 0) {
      // Draw sprite, scaled to fish size
      var aspect = img.naturalWidth / img.naturalHeight;
      var drawW = s * 2 * aspect;
      var drawH = s * 2;

      ctx.save();
      ctx.translate(x, y);
      if (left) ctx.scale(-1, 1);

      // Shadow
      ctx.fillStyle = 'rgba(0,20,60,0.12)';
      ctx.beginPath();
      ctx.ellipse(0, drawH * 0.35, drawW * 0.35, drawH * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glow for evo >= 5
      if (fish.evoIndex >= 5) {
        ctx.shadowColor = evo.color;
        ctx.shadowBlur = 16 * baseScale;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.shadowBlur = 0;
      ctx.restore();

      // Level label
      var fontSize = Math.max(9, Math.floor(s / 3));
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + fontSize + 'px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('Lv' + Math.floor(fish.level), x, y - s - 2);
    } else {
      // Fallback: simple colored rect while loading
      ctx.fillStyle = evo.color;
      ctx.fillRect(x - s/2, y - s/4, s, s/2);
    }
  }


  // ============================================================
  // DRAW SCENE
  // ============================================================
  function drawScene(ctx) {
    ctx.clearRect(0, 0, CW, CH);
    if (bgImg.complete && bgImg.naturalWidth > 0) {
      var dw = BG_W * SCALE, dh = BG_H * SCALE;
      ctx.drawImage(bgImg, (CW - dw) / 2, (CH - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = '#0a0a2a';
      ctx.fillRect(0, 0, CW, CH);
    }

    // Pond overlay (liquid food)
    if (state.pondOverlay && state.pondOverlayTimer > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(hexPx[0].x, hexPx[0].y);
      for (var i = 1; i < hexPx.length; i++) ctx.lineTo(hexPx[i].x, hexPx[i].y);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = state.pondOverlay;
      ctx.fillRect(0, 0, CW, CH);
      ctx.restore();
      state.pondOverlayTimer--;
      if (state.pondOverlayTimer <= 0) state.pondOverlay = null;
    }

    // Ripples
    ripples = ripples.filter(function(rp) {
      rp.r += 0.8; rp.alpha -= 0.01;
      if (rp.alpha <= 0) return false;
      ctx.strokeStyle = 'rgba(150,200,255,' + rp.alpha + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(rp.px, rp.py, rp.r, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    });
  }

  // ============================================================
  // DRAW BUILDINGS on hex floor (bottom area)
  // ============================================================
  function getBuildingSlots() {
    var slots = [];
    var col = 0, row = 0, maxCols = 7;
    var spacing = 0.065;
    var startX = 0.27, startY = 0.72;

    EARNING_DEFS.forEach(function(def) {
      if (!def.visible) return;
      var count = state.earnings[def.id] || 0;
      for (var i = 0; i < count; i++) {
        slots.push({
          id: def.id,
          rx: startX + col * spacing,
          ry: startY + row * spacing,
          perTick: def.perTick,
          index: i
        });
        col++;
        if (col >= maxCols) { col = 0; row++; }
      }
    });
    return slots;
  }

  function drawBuildings(ctx) {
    var slots = getBuildingSlots();
    var bSize = 28 * (CW / 800);
    var t = Date.now();

    slots.forEach(function(slot) {
      var img = null;
      if (slot.id === 'pickaxe') img = pickaxImg;
      else if (slot.id === 'factory') img = factoryImg;
      else if (slot.id === 'bank') img = bankImg;
      if (!img || !img.complete) return;

      var px = slot.rx * CW, py = slot.ry * CH;
      ctx.save();
      ctx.translate(px, py);

      if (slot.id === 'pickaxe') {
        var swing = Math.sin(t / 400 + slot.index * 1.5) * 0.2;
        ctx.rotate(swing);
      }

      ctx.globalAlpha = 0.9;
      ctx.drawImage(img, -bSize/2, -bSize, bSize, bSize);
      ctx.restore();
    });
  }

  // ============================================================
  // DRAW FOOD ITEMS
  // ============================================================
  function drawFoodItem(ctx, anim) {
    var x = Math.round(anim.px), y = Math.round(anim.py);
    var bs = CW / 800;
    var p = Math.round(3 * bs);
    if (anim.foodId === 'booger') {
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(x-p*2, y-p*2, p*4, p*4);
      ctx.fillStyle = '#AA8830';
      ctx.fillRect(x-p, y-p, p*2, p);
    } else if (anim.foodId === 'pill') {
      ctx.fillStyle = '#FF69B4';
      ctx.fillRect(x-p*3, y-p, p*3, p*2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y-p, p*3, p*2);
    } else if (anim.foodId === 'orb') {
      ctx.fillStyle = '#9370DB';
      ctx.beginPath(); ctx.arc(x, y, p*3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(200,180,255,0.6)';
      ctx.beginPath(); ctx.arc(x-p, y-p, p*1.5, 0, Math.PI*2); ctx.fill();
    }
  }

  // ============================================================
  // BUBBLE POPUPS (float upward)
  // ============================================================
  function drawBubbles(ctx) {
    var fontSize = Math.max(10, Math.round(12 * CW / 800));
    bubblePopups = bubblePopups.filter(function(bp) {
      bp.timer--;
      bp.py -= 1.2;
      bp.px += Math.sin(Date.now() / 200 + bp.seed) * 0.4;
      if (bp.timer <= 0) return false;
      var alpha = bp.timer < 20 ? bp.timer / 20 : 1;
      ctx.save();
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = 'rgba(150,200,255,0.5)';
      ctx.beginPath();
      ctx.arc(bp.px, bp.py, fontSize * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold ' + fontSize + 'px Courier New';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(bp.text, bp.px, bp.py);
      ctx.restore();
      return true;
    });
  }


  // ============================================================
  // EARNING LOGIC
  // ============================================================
  function calcPerTick() {
    var total = 0;
    EARNING_DEFS.forEach(function(e) { total += (state.earnings[e.id]||0) * e.perTick; });
    return total;
  }

  function getEarningCost(def) {
    var owned = state.earnings[def.id] || 0;
    if (def.baseCost === 0) return 0;
    return Math.floor(def.baseCost * Math.pow(1 + def.priceGrowth, owned));
  }

  function earningTick() {
    var perTick = calcPerTick();
    if (perTick <= 0) return;

    // Cursor: bubble from random position
    if (state.earnings.cursor) {
      bubblePopups.push({
        px: (0.3 + Math.random() * 0.4) * CW,
        py: (0.6 + Math.random() * 0.2) * CH,
        text: '+1', timer: 80, seed: Math.random() * 100
      });
    }

    // Buildings: bubble from each
    var slots = getBuildingSlots();
    slots.forEach(function(slot) {
      bubblePopups.push({
        px: slot.rx * CW + (Math.random()-0.5) * 10,
        py: slot.ry * CH - 10,
        text: '+' + slot.perTick, timer: 80, seed: Math.random() * 100
      });
    });

    state.gold += perTick;
    updateGoldDisplay();
  }

  // 将鱼随机分配到不同食物上争抢
  function assignFishToFood(foodAnims) {
    if (foodAnims.length === 0) return;
    var chasers = state.fishes.filter(function(f) {
      return f.evoIndex !== 2 && f.evoIndex !== 3 && f.evoIndex !== 4 && f.evoIndex !== 7;
    });
    if (chasers.length === 0) return;

    // 打乱鱼的顺序
    for (var i = chasers.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = chasers[i]; chasers[i] = chasers[j]; chasers[j] = tmp;
    }

    // 轮流分配：每条鱼分配到一个食物
    chasers.forEach(function(f, idx) {
      var target = foodAnims[idx % foodAnims.length];
      f.tx = target.rx; f.ty = target.ry;
    });
  }

  // ========== 自动投喂 ==========
  function autoFeedOne(def) {
    if (state.fishes.length === 0) return;
    var count = state.feedFacilities[def.id] || 0;
    if (count <= 0) return;

    if (def.type === 'target') {
      var newFoodAnims = [];
      for (var i = 0; i < count; i++) {
        var a = Math.random() * Math.PI * 2;
        var r = 0.1 + Math.random() * 0.25;
        var rx = 0.5 + Math.cos(a) * r;
        var ry = 0.5 + Math.sin(a) * r;
        var c = clampToHex(rx, ry);
        var px = c.x * CW, py = c.y * CH;
        ripples.push({ px: px, py: py, r: 2, alpha: 0.7 });

        var foodId = def.special === 'birth' ? 'pill' : def.special === 'evolve' ? 'orb' : def.id;
        var timer = 600; // 10秒后消失
        var anim = { px: px, py: py, rx: c.x, ry: c.y, timer: timer, foodId: foodId };
        feedAnims.push(anim);
        newFoodAnims.push(anim);
      }
      assignFishToFood(newFoodAnims);
    } else if (def.type === 'all') {
      var effect = def.levelUp + (def.extraPerUnit || 0) * (count - 1);
      state.fishes.forEach(function(f, fi) {
        if (f.evoIndex === 3 || f.evoIndex === 4 || f.evoIndex === 7) return;
        if (f.evoIndex === 6 && Math.random() < 0.05) {
          var idx = state.fishes.indexOf(f);
          if (idx !== -1) state.fishes.splice(idx, 1);
          return;
        }
        f.level += effect;
        // 只对可见鱼显示气泡
        if (fi < MAX_FISH_VISIBLE) {
          var label = '+' + effect.toFixed(2);
          bubblePopups.push({
            px: f.rx * CW + (Math.random()-0.5) * 6,
            py: f.ry * CH - 10,
            text: label, timer: 70, seed: Math.random() * 100
          });
        }
        if (Math.floor(f.level) >= 10) checkBirth(f);
      });
      if (def.pondColor) {
        state.pondOverlay = def.pondColor;
        state.pondOverlayTimer = 60;
      }
      for (var ri = 0; ri < 2; ri++) {
        ripples.push({
          px: (0.3 + Math.random()*0.4) * CW,
          py: (0.3 + Math.random()*0.4) * CH,
          r: 0, alpha: 0.4
        });
      }
    }
    renderFishInfo();
  }

  // ============================================================
  // FEEDING LOGIC
  // ============================================================
  function feedAtPosition(px, py) {
    var foodId = state.selectedFood;
    if (!foodId) return;
    if (!state.inventory[foodId] || state.inventory[foodId] <= 0) {
      state.selectedFood = null; renderInventory(); return;
    }
    var foodDef = FOOD_DEFS.find(function(f) { return f.id === foodId; });
    if (!foodDef) return;
    state.inventory[foodId]--;
    if (state.inventory[foodId] <= 0) { delete state.inventory[foodId]; state.selectedFood = null; }

    ripples.push({ px: px, py: py, r: 2, alpha: 0.7 });

    if (foodDef.type === 'target' && foodDef.solid) {
      var rx = px / CW, ry = py / CH;
      feedAnims.push({ px: px, py: py, rx: rx, ry: ry, timer: 150, foodId: foodId });
      state.fishes.forEach(function(f) {
        // 躺平咸鱼(2) won't chase solid food
        if (f.evoIndex === 2) return;
        // 带薪摸鱼王(3) won't chase any food
        if (f.evoIndex === 3) return;
        // 锦鲤(4) won't chase food
        if (f.evoIndex === 4) return;
        // 摸鱼之神(7) won't chase food
        if (f.evoIndex === 7) return;
        f.tx = rx; f.ty = ry;
      });
    } else if (foodDef.type === 'all') {
      var lvlUp = foodId === 'liquor' ? 3 : 1;
      state.fishes.forEach(function(f) {
        // 带薪摸鱼王(3) doesn't eat or drink
        if (f.evoIndex === 3) return;
        // 锦鲤(4) immune to feeding
        if (f.evoIndex === 4) return;
        // 摸鱼之神(7) immune to feeding
        if (f.evoIndex === 7) return;
        // 量子鱼(6): 5% chance to disappear
        if (f.evoIndex === 6) {
          if (Math.random() < 0.05) {
            var idx = state.fishes.indexOf(f);
            if (idx !== -1) state.fishes.splice(idx, 1);
            return;
          }
        }
        f.level += lvlUp;
        checkBirth(f);
      });
      state.pondOverlay = foodDef.pondColor;
      state.pondOverlayTimer = 180;
      for (var ri = 0; ri < 4; ri++) {
        ripples.push({
          px: (0.3 + Math.random()*0.4) * CW,
          py: (0.3 + Math.random()*0.4) * CH,
          r: 0, alpha: 0.5
        });
      }
    }
    renderInventory(); renderFishInfo(); saveGame();
  }

  function applyFoodEffect(foodId, fish) {
    var evoIdx = fish.evoIndex;

    // Chicken is handled via click-fish, not here

    // 躺平咸鱼(2): doesn't eat solid food
    if (evoIdx === 2 && (foodId === 'booger' || foodId === 'pill' || foodId === 'orb')) return;
    // 带薪摸鱼王(3): doesn't eat anything
    if (evoIdx === 3) return;
    // 锦鲤(4): doesn't eat anything
    if (evoIdx === 4) return;
    // 摸鱼之神(7): immune to all feeding
    if (evoIdx === 7) return;

    // 量子鱼(6): 5% chance to disappear on any feeding
    if (evoIdx === 6) {
      if (Math.random() < 0.05) {
        var idx = state.fishes.indexOf(fish);
        if (idx !== -1) state.fishes.splice(idx, 1);
        renderFishInfo();
        return;
      }
    }

    if (foodId === 'booger') {
      fish.level += 1;
      checkBirth(fish);
    } else if (foodId === 'pill') {
      var baby = createFish(fish.evoIndex);
      baby.rx = fish.rx + (Math.random()-0.5)*0.04;
      baby.ry = fish.ry + (Math.random()-0.5)*0.04;
      state.fishes.push(baby);
    } else if (foodId === 'orb') {
      if (fish.evoIndex < EVOLUTION_STAGES.length - 1) { fish.evoIndex++; fish.level = 1; onFishEvolved(); }
    }
    renderFishInfo();
  }

  // Called when any fish evolves — 锦鲤 gains 1 level
  function onFishEvolved() {
    state.fishes.forEach(function(f) {
      if (f.evoIndex === 4) { // 锦鲤
        f.level += 0.5;
        if (Math.floor(f.level) >= 10) checkBirth(f);
      }
    });
  }

  var MAX_FISH_VISIBLE = 100;

  function checkBirth(fish) {
    if (Math.floor(fish.level) >= 10) {
      var baby = createFish(fish.evoIndex);
      baby.rx = fish.rx + (Math.random()-0.5)*0.04;
      baby.ry = fish.ry + (Math.random()-0.5)*0.04;
      state.fishes.push(baby);
      fish.level = fish.level - Math.floor(fish.level) + 1;
    }
  }

  // Manual evolve: consume 10 fish of type X to create 1 fish of type X+1
  function canEvolve(evoIdx) {
    var evo = EVOLUTION_STAGES[evoIdx];
    if (evoIdx >= EVOLUTION_STAGES.length - 1) return false;
    // 摸鱼之神(7): only when ALL fish on screen are 摸鱼之神 and count >= 10
    if (evoIdx === 7) {
      var godCount = 0;
      var totalCount = state.fishes.length;
      state.fishes.forEach(function(f) { if (f.evoIndex === 7) godCount++; });
      return godCount >= 10 && godCount === totalCount;
    }
    if (evo.evoNeed <= 0) return false;
    var count2 = 0;
    state.fishes.forEach(function(f) { if (f.evoIndex === evoIdx) count2++; });
    return count2 >= evo.evoNeed;
  }

  function doEvolve(evoIdx) {
    if (!canEvolve(evoIdx)) return;

    // 打断所有鱼的争抢
    state.fishes.forEach(function(f) { f.tx = null; f.ty = null; });

    if (evoIdx === 7) {
      // 摸鱼之神 → 鲲: consume all 10
      state.fishes = state.fishes.filter(function(f) { return f.evoIndex !== 7; });
      state.fishes.push(createFish(8));
      onFishEvolved();
      renderFishInfo();
      saveGame();
      return;
    }

    var need = EVOLUTION_STAGES[evoIdx].evoNeed;
    var removed = 0;
    state.fishes = state.fishes.filter(function(f) {
      if (f.evoIndex === evoIdx && removed < need) { removed++; return false; }
      return true;
    });
    state.fishes.push(createFish(evoIdx + 1));
    onFishEvolved();
    renderFishInfo();
    saveGame();
  }

  // Remove old auto-merge — replaced by manual evolve
  function checkMerge() {
    // No-op: auto merge removed in v5
  }


  // ============================================================
  // UI PANELS
  // ============================================================
  function updateGoldDisplay() {
    document.getElementById('goldNum').textContent = formatNum(state.gold);
    document.getElementById('perSec').textContent = '+' + formatNum(calcPerTick()) + '/3s';
  }

  function renderEarnings() {
    var html = '';
    EARNING_DEFS.forEach(function(e) {
      var owned = state.earnings[e.id] || 0;
      var cost = getEarningCost(e);
      var atMax = owned >= e.maxCount;
      var canBuy = !atMax && (state.gold >= cost || debugInfiniteGold);
      var costLabel = atMax ? '已满' : (cost === 0 && owned === 0 ? '免费' : formatNum(cost) + '🪙');
      html += '<button class="shop-btn" data-earn="' + e.id + '"' + (canBuy || (cost === 0 && owned === 0) ? '' : ' disabled') + '>'
        + '<span>' + e.name + ' <span class="owned">x' + owned + '/' + e.maxCount + '</span>'
        + '<span class="desc">每3秒+' + e.perTick + '金币</span></span>'
        + '<span class="cost">' + costLabel + '</span></button>';
    });
    document.getElementById('earningList').innerHTML = html;
  }

  function getFeedCost(def) {
    var owned = state.feedFacilities[def.id] || 0;
    return Math.floor(def.baseCost * Math.pow(1 + def.priceGrowth, owned));
  }

  function renderFoodShop() {
    var html = '';
    FEED_DEFS.forEach(function(f) {
      var owned = state.feedFacilities[f.id] || 0;
      var cost = getFeedCost(f);
      var atMax = owned >= f.maxCount;
      var canBuy = !atMax && (state.gold >= cost || debugInfiniteGold);
      var costLabel = atMax ? '已满' : formatNum(cost) + '🪙';
      // 动态描述：马尿/国窖显示当前实际效果
      var desc = f.desc;
      if (f.type === 'all' && owned > 0) {
        var effect = f.levelUp + (f.extraPerUnit || 0) * (owned - 1);
        desc = '每' + f.interval + '秒投放，所有鱼升' + effect.toFixed(2) + '级';
      }
      html += '<button class="shop-btn" data-feed="' + f.id + '"' + (canBuy ? '' : ' disabled') + '>'
        + '<span>' + f.name + ' <span class="owned">x' + owned + '/' + f.maxCount + '</span>'
        + '<span class="desc">' + desc + '</span></span>'
        + '<span class="cost">' + costLabel + '</span></button>';
    });
    document.getElementById('foodList').innerHTML = html;
  }

  function renderSpecialShop() {
    var html = '';
    SPECIAL_DEFS.forEach(function(f) {
      var canBuy = state.gold >= f.cost || debugInfiniteGold;
      html += '<button class="shop-btn" data-special="' + f.id + '"' + (canBuy ? '' : ' disabled') + '>'
        + '<span>' + f.name + ' <span class="desc">' + f.desc + '</span></span>'
        + '<span class="cost">' + formatNum(f.cost) + '🪙</span></button>';
    });
    document.getElementById('specialList').innerHTML = html;
  }

  function renderInventory() {
    var html = '', hasItems = false;
    FOOD_DEFS.forEach(function(f) {
      var count = state.inventory[f.id] || 0;
      if (count > 0) {
        hasItems = true;
        var sel = state.selectedFood === f.id ? ' selected' : '';
        html += '<div class="inv-item' + sel + '" data-inv="' + f.id + '">'
          + f.name + ' <span class="count">x' + count + '</span></div>';
      }
    });
    if (!hasItems) html = '<div style="color:#555;font-size:11px;padding:6px">空空如也</div>';
    document.getElementById('inventory').innerHTML = html;
  }

  function renderFishInfo() {
    var counts = {};
    state.fishes.forEach(function(f) {
      if (!counts[f.evoIndex]) counts[f.evoIndex] = { count: 0, levels: [] };
      counts[f.evoIndex].count++; counts[f.evoIndex].levels.push(f.level);
    });
    var html = '<div class="fish-row"><span>总数: ' + state.fishes.length + '</span></div>';
    html += '<div class="fish-row rule-hint">所有鱼满10级后会生下一条相同的鱼</div>';
    html += '<div class="fish-row rule-hint">想办法养出鲲吧！</div>';

    EVOLUTION_STAGES.forEach(function(evo, i) {
      if (!counts[i]) return;
      var avg = Math.floor(counts[i].levels.reduce(function(a,b){return a+b;},0) / counts[i].count);
      html += '<div class="fish-row"><span class="evo">' + evo.name + ' x' + counts[i].count + '</span>'
        + '<span class="lvl">Lv' + avg + '</span></div>';
      html += '<div class="fish-desc">' + evo.desc + '</div>';

      // Evolve button
      if (i < EVOLUTION_STAGES.length - 1 && evo.evoNeed !== 0) {
        var can = canEvolve(i);
        var label = '';
        if (evo.evoNeed === -1) {
          label = '满10级自动进化';
        } else if (evo.evoNeed === -2) {
          var gc = counts[i].count, tc = state.fishes.length;
          label = '场上只有摸鱼之神且≥10条 (' + gc + '条, 场上共' + tc + '条)';
        } else {
          label = '进化 (' + counts[i].count + '/' + evo.evoNeed + ')';
        }
        html += '<button class="evo-btn' + (can ? ' ready' : '') + '" data-evo="' + i + '"' + (can ? '' : ' disabled') + '>'
          + '⬆ ' + label + '</button>';
      }
    });
    document.getElementById('fishInfo').innerHTML = html;
  }

  // ============================================================
  // GAME LOOP
  // ============================================================
  function gameLoop() {
    drawScene(ctx);
    drawBuildings(ctx);

    feedAnims = feedAnims.filter(function(anim) {
      // timer=-1 表示不自动消失（鼻屎），只能被鱼吃掉
      if (anim.timer > 0) anim.timer--;
      drawFoodItem(ctx, anim);
      return anim.timer !== 0;
    });

    // 只对前 MAX_FISH_VISIBLE 条鱼做移动、碰撞、渲染
    var visibleFishes = state.fishes.slice(0, MAX_FISH_VISIBLE);

    visibleFishes.forEach(function(fish) {
      var reached = updateFish(fish);
      if (reached) {
        for (var i = feedAnims.length - 1; i >= 0; i--) {
          var a = feedAnims[i];
          var dx = fish.rx - a.rx, dy = fish.ry - a.ry;
          if (Math.sqrt(dx*dx + dy*dy) < 0.04) {
            applyFoodEffect(a.foodId, fish);
            feedAnims.splice(i, 1);
            if (feedAnims.length > 0) {
              var remaining = feedAnims.filter(function(fa) { return fa.timer !== 0; });
              if (remaining.length > 0) {
                var next = remaining[Math.floor(Math.random() * remaining.length)];
                fish.tx = next.rx; fish.ty = next.ry;
              }
            }
            break;
          }
        }
      }
    });

    resolveCollisions();
    visibleFishes.forEach(function(fish) { drawFish(ctx, fish); });
    drawBubbles(ctx);

    if (state.selectedFood) {
      var fd = FOOD_DEFS.find(function(f) { return f.id === state.selectedFood; });
      var hs = Math.max(12, Math.round(14 * CW / 800));
      ctx.font = hs + 'px Courier New';
      ctx.fillStyle = 'rgba(255,215,0,0.85)';
      ctx.textAlign = 'center';
      var hintText = fd.type === 'click-fish' ? '点击要使用的鱼: ' + fd.name : '点击水面投喂: ' + fd.name;
      ctx.fillText(hintText, CW * 0.5, CH * 0.06);
    }

    requestAnimationFrame(gameLoop);
  }

  // ============================================================
  // SAVE / LOAD
  // ============================================================
  var SAVE_KEY = 'gamehub_feed_fish_v8';

  function saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        gold: state.gold, earnings: state.earnings, feedFacilities: state.feedFacilities,
        inventory: state.inventory,
        fishes: state.fishes.map(function(f) {
          return { evoIndex: f.evoIndex, level: f.level, rx: f.rx, ry: f.ry };
        })
      }));
    } catch(e) {}
  }

  function loadGame() {
    try {
      var data = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (data) {
        state.gold = data.gold || 0;
        state.earnings = data.earnings || { cursor: 1 };
        state.feedFacilities = data.feedFacilities || {};
        state.inventory = data.inventory || {};
        if (data.fishes && data.fishes.length > 0) {
          state.fishes = data.fishes.map(function(fd) {
            var f = createFish(fd.evoIndex);
            f.level = fd.level; f.rx = fd.rx; f.ry = fd.ry;
            return f;
          });
        }
      }
    } catch(e) {}
  }

  // ============================================================
  // EVENTS
  // ============================================================
  document.getElementById('earningList').addEventListener('click', function(e) {
    var btn = e.target.closest('.shop-btn');
    if (!btn || btn.disabled) return;
    var id = btn.dataset.earn;
    var def = EARNING_DEFS.find(function(d) { return d.id === id; });
    if (!def) return;
    var cost = getEarningCost(def);
    var owned = state.earnings[id] || 0;
    if (owned >= def.maxCount) return;
    if (cost > 0 && state.gold < cost && !debugInfiniteGold) return;
    if (!debugInfiniteGold) state.gold -= cost; state.earnings[id] = owned + 1;
    updateGoldDisplay(); renderEarnings(); saveGame();
  });

  document.getElementById('foodList').addEventListener('click', function(e) {
    var btn = e.target.closest('.shop-btn');
    if (!btn || btn.disabled) return;
    var id = btn.dataset.feed;
    var def = FEED_DEFS.find(function(d) { return d.id === id; });
    if (!def) return;
    var owned = state.feedFacilities[id] || 0;
    if (owned >= def.maxCount) return;
    var cost = getFeedCost(def);
    if (cost > 0 && state.gold < cost && !debugInfiniteGold) return;
    if (!debugInfiniteGold) state.gold -= cost;
    state.feedFacilities[id] = owned + 1;
    updateGoldDisplay(); renderFoodShop(); saveGame();
  });

  document.getElementById('specialList').addEventListener('click', function(e) {
    var btn = e.target.closest('.shop-btn');
    if (!btn || btn.disabled) return;
    var id = btn.dataset.special;
    var def = SPECIAL_DEFS.find(function(d) { return d.id === id; });
    if (!def || (state.gold < def.cost && !debugInfiniteGold)) return;
    if (!debugInfiniteGold) state.gold -= def.cost;
    state.inventory[id] = (state.inventory[id]||0) + 1;
    updateGoldDisplay(); renderSpecialShop(); renderInventory(); saveGame();
  });

  document.getElementById('inventory').addEventListener('click', function(e) {
    var item = e.target.closest('.inv-item');
    if (!item) return;
    var id = item.dataset.inv;

    // Gauntlet: instant use, snap half the fish
    if (id === 'gauntlet') {
      if (!confirm('使用无限手套？将随机消灭一半的鱼（摸鱼之神免疫）')) return;
      state.inventory[id]--;
      if (state.inventory[id] <= 0) delete state.inventory[id];

      // Snap: each non-摸鱼之神 fish has 50% chance to be removed
      state.fishes = state.fishes.filter(function(f) {
        if (f.evoIndex === 7) return true; // 摸鱼之神 immune
        return Math.random() > 0.5;
      });

      // Visual: pond flashes
      state.pondOverlay = 'rgba(200,150,0,0.4)';
      state.pondOverlayTimer = 120;

      renderInventory(); renderFishInfo(); saveGame();
      return;
    }

    state.selectedFood = (state.selectedFood === id) ? null : id;
    renderInventory();
  });

  // Evolve button handler
  document.getElementById('fishInfo').addEventListener('click', function(e) {
    var btn = e.target.closest('.evo-btn');
    if (!btn || btn.disabled) return;
    var evoIdx = parseInt(btn.dataset.evo);
    doEvolve(evoIdx);
  });

  document.getElementById('resetBtn').addEventListener('click', function() {
    if (!confirm('确定要重置游戏吗？所有进度将丢失！')) return;
    localStorage.removeItem(SAVE_KEY); location.reload();
  });

  document.getElementById('debugBtn').addEventListener('click', function() {
    debugInfiniteGold = !debugInfiniteGold;
    this.classList.toggle('active', debugInfiniteGold);
    this.textContent = debugInfiniteGold ? '🧪 无限金币 ON' : '🧪 无限金币';
    renderEarnings(); renderFoodShop(); renderSpecialShop();
  });

  canvas.addEventListener('click', function(e) {
    var rect = canvas.getBoundingClientRect();
    var px = (e.clientX - rect.left) * (CW / rect.width);
    var py = (e.clientY - rect.top) * (CH / rect.height);
    if (!isInHex(px, py)) return;
    if (!state.selectedFood) return;

    var foodDef = FOOD_DEFS.find(function(f) { return f.id === state.selectedFood; });
    if (!foodDef) return;

    // Click-fish type: find nearest fish and apply directly
    if (foodDef.type === 'click-fish') {
      var foodId = state.selectedFood;
      if (!state.inventory[foodId] || state.inventory[foodId] <= 0) {
        state.selectedFood = null; renderInventory(); return;
      }
      var clickRx = px / CW, clickRy = py / CH;
      var nearest = null, nearDist = Infinity;
      state.fishes.forEach(function(f) {
        var dx = f.rx - clickRx, dy = f.ry - clickRy;
        var d = Math.sqrt(dx*dx + dy*dy);
        if (d < nearDist) { nearDist = d; nearest = f; }
      });
      if (nearest && nearDist < 0.06) {
        state.inventory[foodId]--;
        if (state.inventory[foodId] <= 0) { delete state.inventory[foodId]; state.selectedFood = null; }
        // Apply chicken effect: devolve
        if (foodId === 'chicken' && nearest.evoIndex > 0) {
          nearest.evoIndex--;
          nearest.level = 1;
        }
        ripples.push({ px: px, py: py, r: 2, alpha: 0.7 });
        renderInventory(); renderFishInfo(); saveGame();
      }
      return;
    }

    feedAtPosition(px, py);
  });

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    loadGame();
    if (state.fishes.length === 0) state.fishes.push(createFish(0));
    if (!state.earnings.cursor) state.earnings.cursor = 1;
    updateGoldDisplay(); renderEarnings(); renderFoodShop(); renderSpecialShop(); renderInventory(); renderFishInfo();
    setInterval(earningTick, 3000);
    // 每种喂鱼设施独立定时器
    FEED_DEFS.forEach(function(def) {
      setInterval(function() { autoFeedOne(def); }, def.interval * 1000);
    });
    setInterval(function() { checkMerge(); renderFishInfo(); }, 5000);
    setInterval(function() { renderEarnings(); renderFoodShop(); renderSpecialShop(); }, 1000);
    setInterval(saveGame, 30000);
    gameLoop();
  }

  init();
})();
