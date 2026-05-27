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

  function assetKey(file) {
    return 'b:' + file;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function defaultState() {
    return {
      v: 2,
      materialStock: {},
      basePieces: [],
      completedFloors: [],
      currentFloor: null,
      nextBuildIndex: 1,
      pieces: []
    };
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

  function loadInitialLayoutPieces() {
    return fetch('initial-layout.json')
      .then(function (res) {
        if (!res.ok) throw new Error('layout fetch failed');
        return res.json();
      })
      .then(function (layout) {
        build.basePieces = (layout.sprites || []).map(function (sp) {
          return {
            file: sp.file,
            x: sp.x,
            y: sp.y,
            w: sp.w,
            h: sp.h,
            flipH: !!sp.flipH,
            z: sp.z != null ? sp.z : 0,
            role: 'base'
          };
        });
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
      sprites: sprites
    });

    build.currentFloor = null;
    build.nextBuildIndex++;
    if (cfg.showBanner) {
      cfg.showBanner('第' + (build.nextBuildIndex - 1) + ' 层完工', 2000);
    }
    rebuildLayout();
    return true;
  }

  /** 每 3 秒：无序遍历本层缺料位，有库存则消耗并显示 doing 占位 */
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
      ensureAsset(DOING_FILE);
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
      build.currentFloor.slots.forEach(function (slot) {
        if (!slot.placed) return;
        pieces.push({
          file: DOING_FILE,
          x: slot.x,
          y: slot.y,
          w: slot.w,
          h: slot.h,
          flipH: slot.flipH,
          z: slot.z != null ? slot.z : z++,
          role: 'doing'
        });
        ensureAsset(DOING_FILE);
      });
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
      materials: '库存种类 ' + Object.keys(build.materialStock || {}).length +
        ' · 件数 ' + stockCount,
      floor: cur
        ? ('建造中 ' + cur.templateId + ' · 进度 ' +
          cur.slots.filter(function (s) { return s.placed; }).length + '/' + cur.slots.length)
        : ('下一层序号 ' + build.nextBuildIndex + ' · 已完成 ' + build.completedFloors.length)
    };
  }

  function getPieceLog() {
    return (build.pieces || []).map(function (p) {
      return (p.role || p.file) + ' @(' + Math.round(p.x) + ',' + Math.round(p.y) + ')';
    });
  }

  function init(saved) {
    build = saved && saved.v === 2 ? saved : defaultState();
    if (!build.materialStock) build.materialStock = {};
    if (!build.basePieces) build.basePieces = [];
    if (!build.completedFloors) build.completedFloors = [];
    if (!build.nextBuildIndex) build.nextBuildIndex = 1;
    return loadHousesData().then(function () {
      if (!build.basePieces.length) return loadInitialLayoutPieces();
      rebuildLayout();
    });
  }

  function initGameFresh() {
    build = defaultState();
    build.nextBuildIndex = 1;
    return loadHousesData().then(loadInitialLayoutPieces).then(function () {
      if (cfg.showBanner) cfg.showBanner('开始建造方舟', 1600);
    });
  }

  function serialize() {
    return {
      v: 2,
      materialStock: build.materialStock,
      basePieces: build.basePieces,
      completedFloors: build.completedFloors,
      currentFloor: build.currentFloor,
      nextBuildIndex: build.nextBuildIndex
    };
  }

  function deserialize(data) {
    if (!data || data.v !== 2) {
      return initGameFresh();
    }
    build = defaultState();
    build.materialStock = data.materialStock || {};
    build.basePieces = data.basePieces || [];
    build.completedFloors = data.completedFloors || [];
    build.currentFloor = data.currentFloor || null;
    build.nextBuildIndex = data.nextBuildIndex || 1;
    return loadHousesData().then(function () {
      if (!build.basePieces.length) return loadInitialLayoutPieces();
      rebuildLayout();
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
