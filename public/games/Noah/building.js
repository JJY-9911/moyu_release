(function (global) {
  'use strict';

  var BUILD_BASE = 'assets/Building/';
  var DOING_FILE = 'doing.webp';
  var AUTO_BUILD_INTERVAL_MS = 3000;
  var FLOOR_VIEW_PAD = 160;

  var MAT_LABELS = {
    platform: '平台板',
    wall: '墙面',
    edge: '墙边界',
    door: '门',
    window: '窗',
    eave: '屋檐',
    other: '装饰'
  };

  var BUILD_COST = {
    platform: 1,
    wall: 1,
    edge: 1,
    door: 1,
    window: 1,
    eave: 1,
    other: 1
  };

  var cfg = {
    assets: {},
    getBoatBounds: null,
    imageReady: null,
    assetWidth: null,
    assetHeight: null,
    loadWebp: null,
    showBanner: null,
    deferAssetLoad: false,
    setBoatScale: null,
    setBoatPosition: null
  };

  var housesData = null;
  var housesReady = false;
  var fishableFiles = [];
  var completeTemplates = [];

  var build = null;
  var autoBuildTimer = 0;
  var economyTimer = 0;
  var autoLootTimer = 0;
  var SATIETY_TICK_MS = 5000;
  var AUTO_LOOT_INTERVAL_MS = 1000;
  var PEOPLE_PER_HOUSE = 2;
  var PROSPERITY_PER_HOUSE = 1;
  var PROSPERITY_PER_PERSON = 5;
  var FISH_SATIETY = 10;
  /** 单次掉落种类权重：建筑材料需凑齐特定组合，故大幅提高材料占比 */
  var CAST_KIND_WEIGHTS = [
    { kind: 'material', weight: 70 },
    { kind: 'fish', weight: 15 },
    { kind: 'person', weight: 15 }
  ];

  function assetKey(file) {
    return 'b:' + file;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function defaultState() {
    return {
      v: 3,
      materialStock: {},
      basePieces: [],
      completedFloors: [],
      currentFloor: null,
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

  function getFloorPeopleAnchor(fl, slotIndex) {
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    (fl.sprites || []).forEach(function (sp) {
      minX = Math.min(minX, sp.x);
      minY = Math.min(minY, sp.y);
      maxX = Math.max(maxX, sp.x + sp.w);
      maxY = Math.max(maxY, sp.y + sp.h);
    });
    if (!fl.sprites || !fl.sprites.length) {
      return { x: 200, y: 300 };
    }
    var cx = (minX + maxX) / 2;
    var cy = maxY - 18;
    var off = slotIndex === 0 ? -12 : 12;
    return { x: cx + off - 6, y: cy - 14 };
  }

  function getBoatPeopleAnchor(index) {
    if (!cfg.getBoatBounds) {
      return { x: 120 + index * 16, y: 380 };
    }
    var boat = cfg.getBoatBounds();
    return {
      x: boat.x + 48 + index * 18,
      y: boat.y - 28 - (index % 3) * 6
    };
  }

  function addWaitingPerson() {
    var id = build.nextPersonId++;
    var idx = build.waitingPeople.length;
    build.waitingPeople.push({ id: id, boatIndex: idx });
    tryHouseWaitingPeople();
    return { kind: 'person', name: '幸存者' };
  }

  function tryHouseWaitingPeople() {
    var changed = false;
    while (build.waitingPeople.length) {
      var fl = findFloorWithSpace();
      if (!fl) break;
      build.waitingPeople.shift();
      fl.occupants = (fl.occupants || 0) + 1;
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

  /** 优先掉落本层仍缺的具体建材，减少重复无用材料 */
  function pickNeededMaterialFile() {
    if (build.currentFloor && build.currentFloor.slots) {
      var needed = [];
      build.currentFloor.slots.forEach(function (s) {
        if (!s.placed && s.file) needed.push(s.file);
      });
      if (needed.length) return pickRandom(needed);
    }
    return pickFishMaterial().file;
  }

  function pickCastItem() {
    var kind = pickCastKind();
    if (kind === 'material') {
      var file = pickNeededMaterialFile();
      return { kind: 'material', file: file, name: '材料' };
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

  function grantFullFloorMaterialSet() {
    var files = [];
    if (build.currentFloor) {
      build.currentFloor.slots.forEach(function (s) { files.push(s.file); });
    } else if (completeTemplates.length) {
      var tpl = pickRandom(completeTemplates);
      (tpl.sprites || []).forEach(function (s) { files.push(s.file); });
    }
    files.forEach(function (f) { addStock(f, 1); });
    return files.length;
  }

  function rollCastItems() {
    var items = [];
    var n = castItemCountForProsperity();
    var i;
    for (i = 0; i < n; i++) items.push(pickCastItem());
    var p = build.prosperity || 0;
    if (p >= 40 && p < 80 && Math.random() < 0.2) {
      var count = grantFullFloorMaterialSet();
      items.push({ kind: 'materialSet', name: '整层材料', count: count });
    }
    return items;
  }

  function applyCastItem(item) {
    if (!item) return;
    if (item.kind === 'material' && item.file) {
      grantMaterialFile(item.file, 1);
    }
  }

  function applyCastItems(items) {
    (items || []).forEach(function (item) {
      if (item.kind === 'material') applyCastItem(item);
    });
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
        if (loot.kind === 'material' && loot.file) grantMaterialFile(loot.file, 1);
        changed = true;
      }
    } else {
      autoLootTimer = 0;
    }
    return changed;
  }

  function cloneSprite(sp, deckWorldY) {
    return {
      category: sp.category,
      file: sp.file,
      x: sp.x,
      y: (deckWorldY != null ? deckWorldY : 0) + sp.y,
      w: sp.w,
      h: sp.h,
      flipH: !!sp.flipH,
      z: sp.z != null ? sp.z : 0,
      note: sp.note || ''
    };
  }

  function ensureAsset(file) {
    if (!file || cfg.deferAssetLoad) return;
    var key = assetKey(file);
    if (cfg.assets[key] && cfg.imageReady(cfg.assets[key])) return;
    if (cfg.loadWebp) cfg.loadWebp(key, BUILD_BASE + encodeURI(file));
  }

  function loadHousesData() {
    if (housesReady && housesData) return Promise.resolve();
    return fetch('houses.json')
      .then(function (res) {
        if (!res.ok) throw new Error('houses fetch failed');
        return res.json();
      })
      .then(function (data) {
        housesData = data;
        housesReady = true;
        var seen = {};
        fishableFiles = [];
        completeTemplates = (data.templates || []).filter(function (t) {
          return t.complete !== false;
        });
        (data.templates || []).forEach(function (t) {
          (t.sprites || []).forEach(function (sp) {
            if (!sp.file || seen[sp.file]) return;
            seen[sp.file] = true;
            fishableFiles.push(sp.file);
          });
        });
        fishableFiles.sort();
      })
      .catch(function () {
        housesReady = true;
        housesData = { meta: { buildZone: { y: 291 } }, templates: [] };
        fishableFiles = [];
        completeTemplates = [];
      });
  }

  function loadSlotData(done) {
    return loadHousesData().then(function () {
      if (done) done();
    });
  }

  /** 仅读取船体/建造区配置；开局船上不预置任何建筑素材 */
  function loadInitialLayoutConfig() {
    return fetch('initial-layout.json')
      .then(function (res) {
        if (!res.ok) throw new Error('layout fetch failed');
        return res.json();
      })
      .then(function (layout) {
        build.basePieces = [];
        if (layout.boatScale != null && cfg.setBoatScale) cfg.setBoatScale(layout.boatScale);
        if (layout.boat && cfg.setBoatPosition) {
          cfg.setBoatPosition(layout.boat.x, layout.boat.y);
        }
        rebuildLayout();
      })
      .catch(function () {
        build.basePieces = [];
        rebuildLayout();
      });
  }

  function getBaseDeckY() {
    if (housesData && housesData.meta && housesData.meta.buildZone) {
      return housesData.meta.buildZone.y;
    }
    return 291;
  }

  function computeNextDeckWorldY() {
    if (!build.completedFloors.length) return getBaseDeckY();
    var last = build.completedFloors[build.completedFloors.length - 1];
    var span = last.spanToNextDeck != null ? last.spanToNextDeck : -110;
    return last.deckWorldY + span;
  }

  function templateById(id) {
    for (var i = 0; i < completeTemplates.length; i++) {
      if (completeTemplates[i].id === id) return completeTemplates[i];
    }
    return null;
  }

  function startNextFloor() {
    if (!completeTemplates.length) return false;
    if (build.currentFloor) return false;

    var template = pickRandom(completeTemplates);
    var deckWorldY = computeNextDeckWorldY();
    var slots = (template.sprites || []).map(function (sp, idx) {
      return {
        id: template.id + '-' + idx,
        category: sp.category,
        file: sp.file,
        x: sp.x,
        y: deckWorldY + sp.y,
        w: sp.w,
        h: sp.h,
        flipH: !!sp.flipH,
        z: sp.z != null ? sp.z : idx,
        placed: false
      };
    });

    build.currentFloor = {
      templateId: template.id,
      templateIndex: template.index,
      buildIndex: build.nextBuildIndex,
      deckWorldY: deckWorldY,
      spanToNextDeck: template.spanToNextDeck,
      slots: slots
    };

    if (cfg.showBanner) {
      cfg.showBanner('开始建造 · ' + template.id, 1800);
    }
    rebuildLayout();
    return true;
  }

  function countStock(file) {
    return build.materialStock[file] || 0;
  }

  function spendStock(file) {
    if (!build.materialStock[file]) return false;
    build.materialStock[file]--;
    if (build.materialStock[file] <= 0) delete build.materialStock[file];
    return true;
  }

  function addStock(file, qty) {
    build.materialStock[file] = (build.materialStock[file] || 0) + (qty || 1);
    ensureAsset(file);
  }

  function allSlotsPlaced(floor) {
    for (var i = 0; i < floor.slots.length; i++) {
      if (!floor.slots[i].placed) return false;
    }
    return floor.slots.length > 0;
  }

  /** 当前层房屋整体占位（单张 doing.webp 覆盖范围） */
  function getFloorBounds(floor) {
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    var maxZ = 0;
    floor.slots.forEach(function (s) {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.w);
      maxY = Math.max(maxY, s.y + s.h);
      if (s.z > maxZ) maxZ = s.z;
    });
    if (!floor.slots.length) {
      return { x: 0, y: 0, w: 1, h: 1, z: 0 };
    }
    return {
      x: minX,
      y: minY,
      w: Math.max(1, maxX - minX),
      h: Math.max(1, maxY - minY),
      z: maxZ
    };
  }

  function finalizeCurrentFloor() {
    var floor = build.currentFloor;
    if (!floor || !allSlotsPlaced(floor)) return false;

    var sprites = floor.slots.map(function (slot) {
      return {
        file: slot.file,
        x: slot.x,
        y: slot.y,
        w: slot.w,
        h: slot.h,
        flipH: slot.flipH,
        z: slot.z,
        category: slot.category
      };
    });

    build.completedFloors.push({
      templateId: floor.templateId,
      buildIndex: floor.buildIndex,
      deckWorldY: floor.deckWorldY,
      spanToNextDeck: floor.spanToNextDeck,
      sprites: sprites,
      occupants: 0
    });

    build.prosperity = (build.prosperity || 0) + PROSPERITY_PER_HOUSE;
    build.currentFloor = null;
    build.nextBuildIndex++;
    tryHouseWaitingPeople();
    if (cfg.showBanner) {
      cfg.showBanner('第' + (build.nextBuildIndex - 1) + ' 层完工', 2000);
    }
    rebuildLayout();
    return true;
  }

  /** 每 3 秒：无序遍历本层缺料位，有库存则消耗材料（视觉仅用一张 doing 覆盖整层） */
  function runAutoBuildTraversal() {
    if (!housesReady) return false;
    var changed = false;

    if (!build.currentFloor) {
      if (startNextFloor()) return true;
      return false;
    }

    var floor = build.currentFloor;
    if (allSlotsPlaced(floor)) {
      return finalizeCurrentFloor();
    }

    var order = floor.slots.map(function (_, i) { return i; });
    for (var j = order.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = order[j];
      order[j] = order[k];
      order[k] = tmp;
    }

    var i;
    for (i = 0; i < order.length; i++) {
      var slot = floor.slots[order[i]];
      if (slot.placed) continue;
      if (countStock(slot.file) < 1) continue;
      spendStock(slot.file);
      slot.placed = true;
      changed = true;
      break;
    }

    if (changed && allSlotsPlaced(floor)) {
      finalizeCurrentFloor();
      return true;
    }

    if (changed) rebuildLayout();
    return changed;
  }

  function tickAutoBuild(dt) {
    autoBuildTimer += dt;
    if (autoBuildTimer < AUTO_BUILD_INTERVAL_MS) return false;
    autoBuildTimer -= AUTO_BUILD_INTERVAL_MS;
    return runAutoBuildTraversal();
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
      (fl.sprites || []).forEach(function (sp) {
        pieces.push({
          file: sp.file,
          x: sp.x,
          y: sp.y,
          w: sp.w,
          h: sp.h,
          flipH: sp.flipH,
          z: sp.z != null ? sp.z : z++,
          role: fl.templateId
        });
        ensureAsset(sp.file);
      });
    });

    if (build.currentFloor) {
      var bounds = getFloorBounds(build.currentFloor);
      pieces.push({
        file: DOING_FILE,
        x: bounds.x,
        y: bounds.y,
        w: bounds.w,
        h: bounds.h,
        flipH: false,
        z: bounds.z + 1,
        role: 'doing'
      });
      ensureAsset(DOING_FILE);
    }

    build.pieces = pieces;
  }

  function pickFishMaterial() {
    if (!fishableFiles.length) {
      return { file: null, type: 'other', qty: 1, name: '建筑材料' };
    }
    var file = pickRandom(fishableFiles);
    var cat = 'other';
    if (file.indexOf('/wall/') >= 0) cat = 'wall';
    else if (file.indexOf('/door/') >= 0) cat = 'door';
    else if (file.indexOf('/window/') >= 0) cat = 'window';
    else if (file.indexOf('/eave/') >= 0) cat = 'eave';
    else if (file === 'platformer.webp') cat = 'platform';
    return { file: file, type: cat, qty: 1, name: '建筑材料' };
  }

  function grantMaterial(type, qty) {
    if (!fishableFiles.length) return false;
    var file = null;
    var i;
    for (i = 0; i < fishableFiles.length; i++) {
      if (type === 'platform' && fishableFiles[i] === 'platformer.webp') {
        file = fishableFiles[i];
        break;
      }
      if (fishableFiles[i].indexOf('/' + type + '/') >= 0) {
        file = fishableFiles[i];
        break;
      }
    }
    if (!file) file = pickRandom(fishableFiles);
    addStock(file, qty || 1);
    return true;
  }

  function grantMaterialFile(file, qty) {
    if (!file) return false;
    if (fishableFiles.indexOf(file) < 0) return false;
    addStock(file, qty || 1);
    return true;
  }

  function getRequiredAssetFiles() {
    var seen = {};
    var list = [];
    function add(file) {
      if (!file || seen[file]) return;
      seen[file] = true;
      list.push(file);
    }
    add(DOING_FILE);
    fishableFiles.forEach(add);
    (build.basePieces || []).forEach(function (p) { add(p.file); });
    (build.completedFloors || []).forEach(function (fl) {
      (fl.sprites || []).forEach(function (sp) { add(sp.file); });
    });
    if (build.currentFloor) {
      build.currentFloor.slots.forEach(function (s) { add(s.file); });
    }
    return list;
  }

  function preloadEssentials() {
    ensureAsset(DOING_FILE);
    ensureAsset('platformer.webp');
    fishableFiles.forEach(ensureAsset);
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

  function drawPeople(ctx) {
    if (!build) return;
    var pw = 12;
    var ph = 18;

    (build.completedFloors || []).forEach(function (fl) {
      var occ = fl.occupants || 0;
      var i;
      for (i = 0; i < occ; i++) {
        var pos = getFloorPeopleAnchor(fl, i);
        ctx.fillStyle = '#e03030';
        ctx.fillRect(pos.x, pos.y, pw, ph);
      }
    });

    (build.waitingPeople || []).forEach(function (person, i) {
      var pos = getBoatPeopleAnchor(person.boatIndex != null ? person.boatIndex : i);
      ctx.fillStyle = '#e03030';
      ctx.fillRect(pos.x, pos.y, pw, ph);
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

  function getStatus() {
    var stockCount = 0;
    Object.keys(build.materialStock || {}).forEach(function (k) {
      stockCount += build.materialStock[k];
    });
    var cur = build.currentFloor;
    return {
      platformTiles: 2,
      materials: '库存 ' + stockCount + ' · 繁荣 ' + (build.prosperity || 0) +
        ' · 饱食 ' + Math.round(build.satiety || 0) +
        ' · 人口 ' + totalPeopleCount() + '/' + housingCapacity(),
      floor: cur
        ? ('建造中 ' + cur.templateId + ' · 进度 ' +
          cur.slots.filter(function (s) { return s.placed; }).length + '/' + cur.slots.length)
        : ('下一层序号 ' + build.nextBuildIndex + ' · 已完成 ' + build.completedFloors.length)
    };
  }

  function getEconomySnapshot() {
    return {
      prosperity: build.prosperity || 0,
      satiety: Math.round(build.satiety || 0),
      people: totalPeopleCount(),
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
      else if (it.kind === 'materialSet') setBonus = it.count || 1;
    });
    var parts = [];
    if (mat) parts.push('材料×' + mat);
    if (person) parts.push('人×' + person);
    if (fish) parts.push('鱼×' + fish);
    if (setBonus) parts.push('整层材料×' + setBonus);
    return parts.length ? parts.join(' ') : '物品×0';
  }

  function migrateBuildState() {
    if (build.prosperity == null) build.prosperity = 0;
    if (build.satiety == null) build.satiety = 50;
    if (!build.waitingPeople) build.waitingPeople = [];
    if (!build.nextPersonId) build.nextPersonId = 1;
    if (build.satietyTimer == null) build.satietyTimer = 0;
    (build.completedFloors || []).forEach(function (fl) {
      if (fl.occupants == null) fl.occupants = 0;
    });
  }

  function getPieceLog() {
    return (build.pieces || []).map(function (p) {
      return (p.role || p.file) + ' @(' + Math.round(p.x) + ',' + Math.round(p.y) + ')';
    });
  }

  function init(saved) {
    build = saved && (saved.v === 3 || saved.v === 2) ? saved : defaultState();
    migrateBuildState();
    if (!build.materialStock) build.materialStock = {};
    if (!build.basePieces) build.basePieces = [];
    if (!build.completedFloors) build.completedFloors = [];
    if (!build.nextBuildIndex) build.nextBuildIndex = 1;
    build.v = 3;
    return loadHousesData().then(function () {
      return loadInitialLayoutConfig();
    });
  }

  function initGameFresh() {
    build = defaultState();
    build.materialStock = {};
    build.basePieces = [];
    build.completedFloors = [];
    build.currentFloor = null;
    build.nextBuildIndex = 1;
    build.prosperity = 0;
    build.satiety = 50;
    build.waitingPeople = [];
    build.nextPersonId = 1;
    build.satietyTimer = 0;
    return loadHousesData().then(loadInitialLayoutConfig).then(function () {
      if (cfg.showBanner) cfg.showBanner('开始建造方舟', 1600);
    });
  }

  function serialize() {
    return {
      v: 3,
      materialStock: build.materialStock,
      basePieces: build.basePieces,
      completedFloors: build.completedFloors,
      currentFloor: build.currentFloor,
      nextBuildIndex: build.nextBuildIndex,
      prosperity: build.prosperity,
      satiety: build.satiety,
      satietyTimer: build.satietyTimer,
      waitingPeople: build.waitingPeople,
      nextPersonId: build.nextPersonId
    };
  }

  function deserialize(data) {
    if (!data || (data.v !== 3 && data.v !== 2)) {
      return initGameFresh();
    }
    build = defaultState();
    build.materialStock = data.materialStock || {};
    build.basePieces = [];
    build.completedFloors = data.completedFloors || [];
    build.currentFloor = data.currentFloor || null;
    build.nextBuildIndex = data.nextBuildIndex || 1;
    build.prosperity = data.prosperity || 0;
    build.satiety = data.satiety != null ? data.satiety : 50;
    build.satietyTimer = data.satietyTimer || 0;
    build.waitingPeople = data.waitingPeople || [];
    build.nextPersonId = data.nextPersonId || 1;
    build.v = 3;
    migrateBuildState();
    return loadHousesData().then(function () {
      return loadInitialLayoutConfig();
    });
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
    var item = pickFishMaterial();
    if (item.file) addStock(item.file, 1);
    runAutoBuildTraversal();
  }

  function tryAutoBuild() {
    return runAutoBuildTraversal();
  }

  function tryAutoBuildOrdered() {
    return runAutoBuildTraversal();
  }

  function addMaterial(type, qty) {
    return grantMaterial(type, qty);
  }

  function setPlatformTiles() { rebuildLayout(); }
  function setWallSidePref() { /* v2 不使用 */ }
  function unlockInitialSlots() { /* v2 不使用 */ }

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
    addMaterial: addMaterial,
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
    BUILD_COST: BUILD_COST
  };
})(window);
