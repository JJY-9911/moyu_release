(function (global) {
  'use strict';

  var BUILD_BASE = 'assets/Building/';
  var MATERIALS_PER_HOUSE = 10;
  var AUTO_LOOT_INTERVAL_MS = 1000;
  var FLOOR_VIEW_PAD = 160;
  var SATIETY_TICK_MS = 5000;
  var PEOPLE_PER_HOUSE = 2;
  var PROSPERITY_PER_HOUSE = 1;
  var PROSPERITY_PER_PERSON = 5;
  var FISH_SATIETY = 10;
  var PERSON_SPRITE_KEYS = ['people1', 'people2'];

  /** 完整房屋素材；叠放跨度见 house-stack.json */
  var HOUSE_DEFS = [
    { file: '1.webp', w: 160, h: 96, stackSpan: -50 },
    { file: '2.webp', w: 160, h: 96, stackSpan: -64 },
    { file: '3.webp', w: 128, h: 64, stackSpan: -49 },
    { file: '4.webp', w: 128, h: 64, stackSpan: -48 },
    { file: '5.webp', w: 128, h: 96, stackSpan: -59 },
    { file: '6.webp', w: 96, h: 64, stackSpan: -49 },
    { file: '7.webp', w: 128, h: 96, stackSpan: -54 },
    { file: '8.webp', w: 224, h: 96, stackSpan: -60 }
  ];

  var CAST_KIND_WEIGHTS = [
    { kind: 'material', weight: 50 },
    { kind: 'fish', weight: 25 },
    { kind: 'person', weight: 25 }
  ];

  var MAT_LABELS = { material: '建筑材料' };
  var BUILD_COST = { material: 1 };

  var cfg = {
    assets: {},
    getBoatBounds: null,
    imageReady: null,
    assetWidth: null,
    assetHeight: null,
    loadWebp: null,
    showBanner: null,
    drawSpriteStrip: null,
    personSpriteScale: 0.32,
    gameLayout: null,
    deferAssetLoad: false,
    setBoatScale: null,
    setBoatPosition: null
  };

  var layoutMeta = null;
  var houseStackBaseDeckY = null;
  var build = null;
  var autoLootTimer = 0;
  var economyTimer = 0;

  function assetKey(file) {
    return 'b:' + file;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function defaultState() {
    return {
      v: 4,
      materialCount: 0,
      basePieces: [],
      completedFloors: [],
      nextBuildIndex: 1,
      pieces: [],
      prosperity: 0,
      satiety: 50,
      satietyTimer: 0,
      waitingPeople: [],
      nextPersonId: 1
    };
  }

  function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function getBuildZone() {
    if (layoutMeta && layoutMeta.buildZone) return layoutMeta.buildZone;
    return { x: 32, y: 291, w: 479, h: 88 };
  }

  function getBaseDeckY() {
    if (houseStackBaseDeckY != null) return houseStackBaseDeckY;
    return getBuildZone().y;
  }

  function houseDefByFile(file) {
    for (var i = 0; i < HOUSE_DEFS.length; i++) {
      if (HOUSE_DEFS[i].file === file) return HOUSE_DEFS[i];
    }
    return null;
  }

  function stackSpanForDef(def) {
    if (!def) return -96;
    return def.stackSpan != null ? def.stackSpan : -def.h;
  }

  function applyHouseStackData(data) {
    if (!data || !data.houses) return;
    if (data.baseDeckY != null) houseStackBaseDeckY = data.baseDeckY;
    HOUSE_DEFS.forEach(function (h) {
      var entry = data.houses[h.file];
      if (!entry) return;
      if (entry.w != null) h.w = entry.w;
      if (entry.h != null) h.h = entry.h;
      if (entry.stackSpan != null) h.stackSpan = entry.stackSpan;
    });
  }

  function totalPeopleCount() {
    var n = (build.waitingPeople || []).length;
    (build.completedFloors || []).forEach(function (fl) {
      n += fl.occupants || 0;
    });
    return n;
  }

  function housingCapacity() {
    return (build.completedFloors || []).length * PEOPLE_PER_HOUSE;
  }

  function housedPeopleCount() {
    var n = 0;
    (build.completedFloors || []).forEach(function (fl) {
      n += fl.occupants || 0;
    });
    return n;
  }

  function findFloorWithSpace() {
    for (var i = 0; i < (build.completedFloors || []).length; i++) {
      var fl = build.completedFloors[i];
      if ((fl.occupants || 0) < PEOPLE_PER_HOUSE) return fl;
    }
    return null;
  }

  function getFloorSprites(fl) {
    if (fl.sprites && fl.sprites.length) return fl.sprites;
    if (fl.houseFile) {
      return [{
        file: fl.houseFile,
        x: fl.x,
        y: fl.y,
        w: fl.w,
        h: fl.h,
        flipH: false,
        z: fl.buildIndex || 0
      }];
    }
    return [];
  }

  function getPeopleLayout() {
    if (cfg.gameLayout && cfg.gameLayout.people) return cfg.gameLayout.people;
    return {
      onBoat: {
        offsetX: 48, offsetY: -28, stepX: 18, staggerY: 6, staggerEvery: 3,
        stackDy: 8, stackDx: 3, padLeft: 16, padRight: 28, padTop: 36, padBottom: 12
      },
      onHouse: { slotOffset0: -12, slotOffset1: 12, footInset: 0, aboveFoot: 0 }
    };
  }

  function getFloorPeopleAnchor(fl, slotIndex) {
    var sprites = getFloorSprites(fl);
    var minX = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    sprites.forEach(function (sp) {
      minX = Math.min(minX, sp.x);
      maxX = Math.max(maxX, sp.x + sp.w);
      maxY = Math.max(maxY, sp.y + sp.h);
    });
    if (!sprites.length) return { x: 200, y: 300 };
    var cx = (minX + maxX) / 2;
    var ph = getPeopleLayout().onHouse;
    var off = slotIndex === 0 ? ph.slotOffset0 : ph.slotOffset1;
    return { x: cx + off - (ph.footInset || 0), y: maxY - (ph.aboveFoot || 0) };
  }

  function getPersonDrawSize() {
    var scale = cfg.personSpriteScale != null ? cfg.personSpriteScale : 0.32;
    var img = cfg.assets.people1;
    if (cfg.imageReady && cfg.imageReady(img) && cfg.assetHeight) {
      var fh = cfg.assetHeight(img);
      if (fh > 0) return { w: fh * scale, h: fh * scale };
    }
    return { w: 40, h: 40 };
  }

  function getBoatQueueBounds(boat) {
    var pb = getPeopleLayout().onBoat;
    var psz = getPersonDrawSize();
    return {
      left: boat.x + (pb.padLeft != null ? pb.padLeft : 16),
      right: boat.x + boat.w - (pb.padRight != null ? pb.padRight : 28) - psz.w * 0.5,
      top: boat.y + (pb.padTop != null ? pb.padTop : 36),
      bottom: boat.y + boat.h - (pb.padBottom != null ? pb.padBottom : 12)
    };
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  /** 船上排队：横向不超出船体，满列后叠放 */
  function getBoatPeopleAnchor(index) {
    if (!cfg.getBoatBounds) {
      return { x: 120 + (index % 8) * 12, y: 380 - Math.floor(index / 8) * 8 };
    }
    var boat = cfg.getBoatBounds();
    var pb = getPeopleLayout().onBoat;
    var bounds = getBoatQueueBounds(boat);
    var stepX = Math.max(4, pb.stepX || 10);
    var stackDy = pb.stackDy != null ? pb.stackDy : 8;
    var stackDx = pb.stackDx != null ? pb.stackDx : 3;
    var staggerEvery = pb.staggerEvery || 3;
    var staggerY = pb.staggerY || 0;

    var startX = clamp(boat.x + (pb.offsetX || 0), bounds.left, bounds.right);
    var startY = clamp(boat.y + (pb.offsetY || 0), bounds.top, bounds.bottom);
    var slots = Math.max(1, Math.floor((bounds.right - startX) / stepX) + 1);
    if (startX + (slots - 1) * stepX > bounds.right) {
      startX = bounds.left;
      slots = Math.max(1, Math.floor((bounds.right - bounds.left) / stepX) + 1);
    }

    var col = index % slots;
    var layer = Math.floor(index / slots);
    var x = startX + col * stepX + layer * stackDx;
    var y = startY - layer * stackDy - (col % staggerEvery) * staggerY;
    return {
      x: clamp(x, bounds.left, bounds.right),
      y: clamp(y, bounds.top, bounds.bottom)
    };
  }

  function pickPersonSprite() {
    return pickRandom(PERSON_SPRITE_KEYS);
  }

  function addWaitingPerson() {
    var id = build.nextPersonId++;
    var idx = build.waitingPeople.length;
    build.waitingPeople.push({
      id: id,
      boatIndex: idx,
      sprite: pickPersonSprite()
    });
    tryHouseWaitingPeople();
    return { kind: 'person', name: '幸存者' };
  }

  function tryHouseWaitingPeople() {
    var changed = false;
    while (build.waitingPeople.length) {
      var fl = findFloorWithSpace();
      if (!fl) break;
      var person = build.waitingPeople.shift();
      if (!fl.occupantSprites) fl.occupantSprites = [];
      fl.occupantSprites.push(person.sprite || pickPersonSprite());
      fl.occupants = fl.occupantSprites.length;
      build.prosperity += PROSPERITY_PER_PERSON;
      changed = true;
    }
    if (changed && build.waitingPeople.length) {
      build.waitingPeople.forEach(function (p, i) { p.boatIndex = i; });
    }
    return changed;
  }

  function addFishCatch() {
    build.satiety = (build.satiety || 0) + FISH_SATIETY;
    return { kind: 'fish', name: '鱼', satiety: FISH_SATIETY };
  }

  function pickCastKind() {
    var total = 0;
    var i;
    for (i = 0; i < CAST_KIND_WEIGHTS.length; i++) {
      total += CAST_KIND_WEIGHTS[i].weight;
    }
    var roll = Math.random() * total;
    var acc = 0;
    for (i = 0; i < CAST_KIND_WEIGHTS.length; i++) {
      acc += CAST_KIND_WEIGHTS[i].weight;
      if (roll <= acc) return CAST_KIND_WEIGHTS[i].kind;
    }
    return 'material';
  }

  function pickCastItem() {
    var kind = pickCastKind();
    if (kind === 'material') {
      return { kind: 'material', name: '建筑材料' };
    }
    if (kind === 'person') return addWaitingPerson();
    return addFishCatch();
  }

  function castItemCountForProsperity() {
    var p = build.prosperity || 0;
    if (p >= 80) return 0;
    if (p < 10) return 1;
    if (p < 20) return 2;
    if (p < 40) return randInt(3, 5);
    return randInt(5, 10);
  }

  function grantFullHouseMaterials() {
    addMaterial(MATERIALS_PER_HOUSE);
    return MATERIALS_PER_HOUSE;
  }

  function rollCastItems() {
    var items = [];
    var n = castItemCountForProsperity();
    var i;
    for (i = 0; i < n; i++) items.push(pickCastItem());
    var p = build.prosperity || 0;
    if (p >= 40 && p < 80 && Math.random() < 0.2) {
      var count = grantFullHouseMaterials();
      items.push({ kind: 'materialSet', name: '整栋材料', count: count });
    }
    return items;
  }

  function applyCastItem(item) {
    if (!item) return;
    if (item.kind === 'material') addMaterial(1);
  }

  function applyCastItems(items) {
    (items || []).forEach(applyCastItem);
  }

  function rollAutoLootItem() {
    return pickCastItem();
  }

  function tickEconomy(dt) {
    var changed = false;
    build.satietyTimer = (build.satietyTimer || 0) + dt;
    while (build.satietyTimer >= SATIETY_TICK_MS) {
      build.satietyTimer -= SATIETY_TICK_MS;
      var eaters = totalPeopleCount();
      if (eaters > 0) {
        build.satiety = Math.max(0, (build.satiety || 0) - eaters);
        changed = true;
      }
    }

    if ((build.prosperity || 0) >= 80) {
      autoLootTimer += dt;
      while (autoLootTimer >= AUTO_LOOT_INTERVAL_MS) {
        autoLootTimer -= AUTO_LOOT_INTERVAL_MS;
        var loot = rollAutoLootItem();
        if (loot.kind === 'material') addMaterial(1);
        changed = true;
      }
    } else {
      autoLootTimer = 0;
    }
    return changed;
  }

  function ensureAsset(file) {
    if (!file || cfg.deferAssetLoad) return;
    var key = assetKey(file);
    if (cfg.assets[key] && cfg.imageReady(cfg.assets[key])) return;
    if (cfg.loadWebp) cfg.loadWebp(key, BUILD_BASE + encodeURI(file));
  }

  function loadHousesData() {
    return fetch('house-stack.json')
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (data) {
        applyHouseStackData(data);
      })
      .catch(function () { /* 无校准文件时使用 HOUSE_DEFS 默认高度 */ });
  }

  function loadSlotData(done) {
    if (done) done();
    return Promise.resolve();
  }

  function loadInitialLayoutConfig() {
    return fetch('initial-layout.json')
      .then(function (res) {
        if (!res.ok) throw new Error('layout fetch failed');
        return res.json();
      })
      .then(function (layout) {
        layoutMeta = layout;
        build.basePieces = [];
        if (layout.boatScale != null && cfg.setBoatScale) cfg.setBoatScale(layout.boatScale);
        if (layout.boat && cfg.setBoatPosition) {
          cfg.setBoatPosition(layout.boat.x, layout.boat.y);
        }
        rebuildLayout();
      })
      .catch(function () {
        layoutMeta = null;
        build.basePieces = [];
        rebuildLayout();
      });
  }

  function computeNextDeckWorldY() {
    if (!build.completedFloors.length) return getBaseDeckY();
    var last = build.completedFloors[build.completedFloors.length - 1];
    var span = last.spanToNextDeck;
    if (span == null) {
      var lastDef = houseDefByFile(last.houseFile);
      span = stackSpanForDef(lastDef);
    }
    return last.deckWorldY + span;
  }

  function placeRandomHouse() {
    var def = pickRandom(HOUSE_DEFS);
    var zone = getBuildZone();
    var deckWorldY = computeNextDeckWorldY();
    var x = zone.x + Math.max(0, Math.floor((zone.w - def.w) / 2));
    var y = deckWorldY - def.h;
    var sprite = {
      file: def.file,
      x: x,
      y: y,
      w: def.w,
      h: def.h,
      flipH: false,
      z: build.nextBuildIndex
    };

    build.completedFloors.push({
      houseFile: def.file,
      buildIndex: build.nextBuildIndex,
      deckWorldY: deckWorldY,
      spanToNextDeck: stackSpanForDef(def),
      sprites: [sprite],
      occupants: 0
    });

    build.prosperity = (build.prosperity || 0) + PROSPERITY_PER_HOUSE;
    build.nextBuildIndex++;
    ensureAsset(def.file);
    tryHouseWaitingPeople();
    if (cfg.showBanner) {
      cfg.showBanner('房屋完工 · ' + def.file.replace('.webp', ''), 2000);
    }
    rebuildLayout();
    return true;
  }

  function addMaterial(qty) {
    var n = qty || 1;
    build.materialCount = (build.materialCount || 0) + n;
    var built = false;
    while ((build.materialCount || 0) >= MATERIALS_PER_HOUSE) {
      build.materialCount -= MATERIALS_PER_HOUSE;
      placeRandomHouse();
      built = true;
    }
    return built;
  }

  function tickAutoBuild() {
    return false;
  }

  function rebuildLayout() {
    var pieces = [];
    var z = 0;

    (build.basePieces || []).forEach(function (p) {
      pieces.push({
        file: p.file,
        x: p.x,
        y: p.y,
        w: p.w,
        h: p.h,
        flipH: p.flipH,
        z: p.z != null ? p.z : z++,
        role: p.role || 'base'
      });
      ensureAsset(p.file);
    });

    (build.completedFloors || []).forEach(function (fl) {
      getFloorSprites(fl).forEach(function (sp) {
        pieces.push({
          file: sp.file,
          x: sp.x,
          y: sp.y,
          w: sp.w,
          h: sp.h,
          flipH: sp.flipH,
          z: sp.z != null ? sp.z : z++,
          role: fl.houseFile || ('floor-' + fl.buildIndex)
        });
        ensureAsset(sp.file);
      });
    });

    build.pieces = pieces;
  }

  function getRequiredAssetFiles() {
    var seen = {};
    var list = [];
    function add(file) {
      if (!file || seen[file]) return;
      seen[file] = true;
      list.push(file);
    }
    HOUSE_DEFS.forEach(function (d) { add(d.file); });
    (build.basePieces || []).forEach(function (p) { add(p.file); });
    (build.completedFloors || []).forEach(function (fl) {
      getFloorSprites(fl).forEach(function (sp) { add(sp.file); });
    });
    return list;
  }

  function preloadEssentials() {
    HOUSE_DEFS.forEach(function (d) { ensureAsset(d.file); });
  }

  function preloadCatalog() {
    preloadEssentials();
  }

  function draw(ctx) {
    if (!build || !build.pieces) return;
    var sorted = build.pieces.slice().sort(function (a, b) { return a.z - b.z; });
    ctx.imageSmoothingEnabled = false;
    sorted.forEach(function (p) {
      var img = cfg.assets[assetKey(p.file)];
      if (!cfg.imageReady(img)) return;
      ctx.save();
      if (p.flipH) {
        ctx.translate(p.x, p.y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, -p.w, 0, p.w, p.h);
      } else {
        ctx.drawImage(img, p.x, p.y, p.w, p.h);
      }
      ctx.restore();
    });
    drawPeople(ctx);
  }

  function drawPersonSprite(ctx, spriteKey, anchorX, anchorY) {
    var scale = cfg.personSpriteScale != null ? cfg.personSpriteScale : 0.32;
    var img = cfg.assets[spriteKey];
    var ph = 18;
    if (cfg.drawSpriteStrip && img && cfg.imageReady(img)) {
      var fh = cfg.assetHeight(img);
      var dw = fh * scale;
      var dh = fh * scale;
      ph = dh;
      cfg.drawSpriteStrip(
        ctx, img, anchorX - dw / 2, anchorY - dh, dw, dh, performance.now()
      );
      return;
    }
    ctx.fillStyle = '#e03030';
    ctx.fillRect(anchorX - 6, anchorY - ph, 12, ph);
  }

  function drawPeople(ctx) {
    if (!build) return;

    (build.completedFloors || []).forEach(function (fl) {
      var sprites = fl.occupantSprites || [];
      var i;
      for (i = 0; i < sprites.length; i++) {
        var pos = getFloorPeopleAnchor(fl, i);
        drawPersonSprite(ctx, sprites[i], pos.x, pos.y);
      }
    });

    (build.waitingPeople || []).forEach(function (person, i) {
      var pos = getBoatPeopleAnchor(person.boatIndex != null ? person.boatIndex : i);
      drawPersonSprite(
        ctx,
        person.sprite || 'people1',
        pos.x + 6,
        pos.y + 18
      );
    });
  }

  function drawFishFlash(ctx, x, y) {
    ctx.fillStyle = '#3080e0';
    ctx.fillRect(x, y, 14, 10);
  }

  function drawDebug(ctx, showZones) {
    if (!showZones || !build) return;
    build.pieces.forEach(function (p) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 220, 80, 0.85)';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.font = '9px monospace';
      ctx.fillStyle = '#ffee88';
      ctx.fillText(p.role || '', p.x + 2, p.y + 10);
      ctx.restore();
    });
  }

  function getMinPieceY() {
    if (!build || !build.pieces || !build.pieces.length) {
      return getBaseDeckY() - 120;
    }
    var minY = build.pieces[0].y;
    for (var i = 1; i < build.pieces.length; i++) {
      if (build.pieces[i].y < minY) minY = build.pieces[i].y;
    }
    return minY;
  }

  function getMinCameraWorldTop() {
    return getMinPieceY() - FLOOR_VIEW_PAD;
  }

  function getHudStatusText() {
    return '饱腹 ' + Math.round(build.satiety || 0) +
      ' · 总人数 ' + totalPeopleCount() +
      ' · 入住 ' + housedPeopleCount() +
      ' · 层数 ' + (build.completedFloors || []).length +
      ' · 繁荣 ' + (build.prosperity || 0);
  }

  function getStatus() {
    var text = getHudStatusText();
    return {
      platformTiles: 2,
      materials: text,
      floor: text
    };
  }

  function getEconomySnapshot() {
    return {
      prosperity: build.prosperity || 0,
      satiety: Math.round(build.satiety || 0),
      people: totalPeopleCount(),
      housed: housedPeopleCount(),
      floors: (build.completedFloors || []).length,
      capacity: housingCapacity(),
      waiting: (build.waitingPeople || []).length
    };
  }

  function formatCastSummary(items) {
    var mat = 0;
    var person = 0;
    var fish = 0;
    var setBonus = 0;
    (items || []).forEach(function (it) {
      if (it.kind === 'material') mat++;
      else if (it.kind === 'person') person++;
      else if (it.kind === 'fish') fish++;
      else if (it.kind === 'materialSet') setBonus = it.count || MATERIALS_PER_HOUSE;
    });
    var parts = [];
    if (mat) parts.push('建筑材料×' + mat);
    if (person) parts.push('人×' + person);
    if (fish) parts.push('鱼×' + fish);
    if (setBonus) parts.push('整栋材料×' + setBonus);
    return parts.length ? parts.join(' ') : '物品×0';
  }

  function migrateBuildState() {
    if (build.prosperity == null) build.prosperity = 0;
    if (build.satiety == null) build.satiety = 50;
    if (!build.waitingPeople) build.waitingPeople = [];
    if (!build.nextPersonId) build.nextPersonId = 1;
    if (build.satietyTimer == null) build.satietyTimer = 0;
    if (build.materialCount == null) build.materialCount = 0;

    if (build.materialStock) {
      Object.keys(build.materialStock).forEach(function (k) {
        build.materialCount += build.materialStock[k] || 0;
      });
      delete build.materialStock;
    }

    if (build.currentFloor && build.currentFloor.slots) {
      var missing = 0;
      build.currentFloor.slots.forEach(function (s) {
        if (!s.placed) missing++;
      });
      build.materialCount += missing;
      build.currentFloor = null;
    }

    (build.completedFloors || []).forEach(function (fl) {
      if (fl.occupants == null) fl.occupants = 0;
      if (!fl.occupantSprites && fl.occupants > 0) {
        fl.occupantSprites = [];
        var si;
        for (si = 0; si < fl.occupants; si++) {
          fl.occupantSprites.push(pickPersonSprite());
        }
      }
      if (!fl.sprites && fl.houseFile) {
        var def = houseDefByFile(fl.houseFile) || { w: 128, h: 96 };
        fl.sprites = [{
          file: fl.houseFile,
          x: fl.x != null ? fl.x : getBuildZone().x,
          y: fl.y != null ? fl.y : (fl.deckWorldY || getBaseDeckY()) - def.h,
          w: fl.w || def.w,
          h: fl.h || def.h,
          flipH: false,
          z: fl.buildIndex || 0
        }];
      }
    });

    while ((build.materialCount || 0) >= MATERIALS_PER_HOUSE) {
      build.materialCount -= MATERIALS_PER_HOUSE;
      placeRandomHouse();
    }

    build.v = 4;
  }

  function getPieceLog() {
    return (build.pieces || []).map(function (p) {
      return (p.role || p.file) + ' @(' + Math.round(p.x) + ',' + Math.round(p.y) + ')';
    });
  }

  function init(saved) {
    build = saved && (saved.v === 4 || saved.v === 3 || saved.v === 2) ? saved : defaultState();
    migrateBuildState();
    if (!build.basePieces) build.basePieces = [];
    if (!build.completedFloors) build.completedFloors = [];
    if (!build.nextBuildIndex) build.nextBuildIndex = 1;
    return loadInitialLayoutConfig();
  }

  function initGameFresh() {
    build = defaultState();
    return loadInitialLayoutConfig().then(function () {
      if (cfg.showBanner) cfg.showBanner('开始建造方舟', 1600);
    });
  }

  function serialize() {
    return {
      v: 4,
      materialCount: build.materialCount || 0,
      basePieces: build.basePieces,
      completedFloors: build.completedFloors,
      nextBuildIndex: build.nextBuildIndex,
      prosperity: build.prosperity,
      satiety: build.satiety,
      satietyTimer: build.satietyTimer,
      waitingPeople: build.waitingPeople,
      nextPersonId: build.nextPersonId
    };
  }

  function deserialize(data) {
    if (!data || (data.v !== 4 && data.v !== 3 && data.v !== 2)) {
      return initGameFresh();
    }
    build = defaultState();
    build.materialCount = data.materialCount || 0;
    build.materialStock = data.materialStock;
    build.basePieces = [];
    build.completedFloors = data.completedFloors || [];
    build.currentFloor = data.currentFloor || null;
    build.nextBuildIndex = data.nextBuildIndex || 1;
    build.prosperity = data.prosperity || 0;
    build.satiety = data.satiety != null ? data.satiety : 50;
    build.satietyTimer = data.satietyTimer || 0;
    build.waitingPeople = data.waitingPeople || [];
    build.nextPersonId = data.nextPersonId || 1;
    migrateBuildState();
    return loadInitialLayoutConfig();
  }

  function applyBoatConfig(boat) {
    if (!boat) return;
    if (boat.scale != null && cfg.setBoatScale) cfg.setBoatScale(boat.scale);
    if (cfg.setBoatPosition) cfg.setBoatPosition(boat.x, boat.y);
  }

  function resetTest() {
    return initGameFresh();
  }

  function grantRandomMaterial() {
    addMaterial(1);
  }

  function tryAutoBuild() {
    return false;
  }

  function tryAutoBuildOrdered() {
    return false;
  }

  function addMaterialLegacy(type, qty) {
    return addMaterial(qty || 1);
  }

  function grantMaterial(type, qty) {
    return addMaterial(qty || 1);
  }

  function grantMaterialFile() {
    return addMaterial(1);
  }

  function pickFishMaterial() {
    return { file: null, type: 'material', qty: 1, name: '建筑材料' };
  }

  function setPlatformTiles() { rebuildLayout(); }
  function setWallSidePref() { /* v4 不使用 */ }
  function unlockInitialSlots() { /* v4 不使用 */ }

  global.NoahBuilding = {
    configure: function (c) {
      Object.keys(c).forEach(function (k) { cfg[k] = c[k]; });
    },
    loadSlotData: loadSlotData,
    loadHousesData: loadHousesData,
    preloadEssentials: preloadEssentials,
    preloadCatalog: preloadCatalog,
    init: init,
    resetTest: resetTest,
    grantRandomMaterial: grantRandomMaterial,
    addMaterial: addMaterialLegacy,
    tickAutoBuild: tickAutoBuild,
    tryAutoBuild: tryAutoBuild,
    tryAutoBuildOrdered: tryAutoBuildOrdered,
    grantMaterial: grantMaterial,
    grantMaterialFile: grantMaterialFile,
    pickFishMaterial: pickFishMaterial,
    rollCastItems: rollCastItems,
    applyCastItems: applyCastItems,
    formatCastSummary: formatCastSummary,
    getEconomySnapshot: getEconomySnapshot,
    tickEconomy: tickEconomy,
    drawFishFlash: drawFishFlash,
    getRequiredAssetFiles: getRequiredAssetFiles,
    applyBoatConfig: applyBoatConfig,
    initGameFresh: initGameFresh,
    unlockInitialSlots: unlockInitialSlots,
    setPlatformTiles: setPlatformTiles,
    setWallSidePref: setWallSidePref,
    draw: draw,
    drawDebug: drawDebug,
    getStatus: getStatus,
    getPieceLog: getPieceLog,
    getMinPieceY: getMinPieceY,
    getMinCameraWorldTop: getMinCameraWorldTop,
    serialize: serialize,
    deserialize: deserialize,
    MAT_LABELS: MAT_LABELS,
    BUILD_COST: BUILD_COST,
    MATERIALS_PER_HOUSE: MATERIALS_PER_HOUSE
  };
})(window);
