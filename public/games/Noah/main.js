(function () {
  'use strict';

  var CANVAS_W = 1024;
  var CANVAS_H = 576;
  var SAVE_KEY = 'gamehub_noah_v1';

  var GRAVITY = 520;
  var CAST_SPEED = 340;
  var WATER_DECEL = 180;
  var METER_SCALE = 0.04;
  var RANGE_ANIM_MS = 900;
  var DEPTH_ANIM_MS = 900;

  var SKY_H = Math.floor(CANVAS_H * 0.76);
  var WATER_H = CANVAS_H - SKY_H;
  var BUILD_BASE = 'assets/Building/';
  var BOAT_X = 24;
  var BOAT_Y = SKY_H - 28;
  var BOAT_SCALE = 5.2;
  var DECK_TOP = SKY_H - 118;
  var SCROLL_FALLBACK_MIN_TOP = -32000;
  var cameraWorldTop = 0;
  var assets = {};
  var loadTotal = 0;
  var loadDone = 0;
  var pendingLoads = {};
  var assetsReady = false;
  var bootTimeout = null;

  var state = {
    phase: 'aim',
    pointerAngle: 45,
    pointerDir: 1,
    lastResult: null,
    resultTimer: 0,
    bannerText: '',
    bannerTimer: 0
  };

  var canvas, ctx, $loading;
  var IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  var HAS_BITMAP_LOADER = IS_SAFARI && typeof fetch === 'function' && typeof createImageBitmap === 'function';

  function assetWidth(img) {
    if (!img) return 0;
    return img.naturalWidth || img.width || 0;
  }

  function assetHeight(img) {
    if (!img) return 0;
    return img.naturalHeight || img.height || 0;
  }

  function imageReady(img) {
    if (!img) return false;
    if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) {
      return img.width > 0 && img.height > 0;
    }
    return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
  }

  function buildingAssetKey(file) {
    return 'b:' + file;
  }

  function applyBoatLayout(data) {
    if (!data) return;
    if (data.boatScale != null) BOAT_SCALE = data.boatScale;
    if (data.boat) {
      if (data.boat.x != null) BOAT_X = data.boat.x;
      if (data.boat.y != null) BOAT_Y = data.boat.y;
    }
    if (data.cameraWorldTop != null) cameraWorldTop = data.cameraWorldTop;
    DECK_TOP = (data.buildZone && data.buildZone.y != null)
      ? data.buildZone.y - 10
      : BOAT_Y - 118;
  }

  function matLabel(type) {
    if (window.NoahBuilding && window.NoahBuilding.MAT_LABELS) {
      return window.NoahBuilding.MAT_LABELS[type] || type;
    }
    return type;
  }

  function getBoatBounds() {
    var boat = assets.boat;
    var bw = imageReady(boat) ? assetWidth(boat) * BOAT_SCALE : 74 * BOAT_SCALE;
    var bh = imageReady(boat) ? assetHeight(boat) * BOAT_SCALE : 18 * BOAT_SCALE;
    return { x: BOAT_X, y: BOAT_Y, w: bw, h: bh };
  }

  function getRodBase() {
    var boat = getBoatBounds();
    return {
      handleX: boat.x + boat.w - 42,
      handleY: boat.y - 12,
      tipX: boat.x + boat.w - 24,
      tipY: boat.y - 38
    };
  }

  function getHookOrigin() {
    var r = getRodBase();
    return { x: r.tipX, y: r.tipY };
  }

  function getCastButtonRect() {
    var r = getRodBase();
    return { x: r.handleX - 54, y: r.handleY - 8, w: 72, h: 30 };
  }

  function loadWebpAsset(key, src, onDone) {
    function done(asset) {
      if (asset) assets[key] = asset;
      if (onDone) onDone();
    }

    function loadViaImage() {
      var img = new Image();
      img.onload = function () {
        if (!imageReady(img)) {
          done(null);
          return;
        }
        if (img.decode) {
          img.decode().then(function () { done(img); }).catch(function () { done(img); });
        } else {
          done(img);
        }
      };
      img.onerror = function () { done(null); };
      img.src = src;
    }

    if (HAS_BITMAP_LOADER) {
      fetch(src)
        .then(function (res) {
          if (!res.ok) throw new Error('fetch failed');
          return res.blob();
        })
        .then(createImageBitmap)
        .then(function (bmp) { done(bmp); })
        .catch(loadViaImage);
      return;
    }

    loadViaImage();
  }

  function checkLoadComplete() {
    if (assetsReady) return;
    if (loadTotal > 0 && loadDone >= loadTotal) onAssetsReady();
    else if (loadTotal === 0) onAssetsReady();
  }

  function loadWebp(key, src) {
    if (assets[key] && imageReady(assets[key])) return;
    if (pendingLoads[key]) return;
    pendingLoads[key] = true;
    loadTotal++;
    loadWebpAsset(key, src, function () {
      pendingLoads[key] = false;
      loadDone++;
      var bar = document.getElementById('loadingBar');
      if (bar && loadTotal > 0) {
        bar.style.width = Math.round((loadDone / loadTotal) * 100) + '%';
      }
      checkLoadComplete();
    });
  }

  function loadWebpIfNeeded(key, src) {
    if (assets[key] && imageReady(assets[key])) return;
    loadWebp(key, src);
  }

  function preloadBuildingAssets() {
    if (!window.NoahBuilding) return;
    window.NoahBuilding.getRequiredAssetFiles().forEach(function (file) {
      loadWebpIfNeeded(buildingAssetKey(file), BUILD_BASE + encodeURI(file));
    });
  }

  function loadAllAssets() {
    loadTotal = 0;
    loadDone = 0;
    pendingLoads = {};
    loadWebp('boat', 'assets/Boat.webp');
    preloadBuildingAssets();
    checkLoadComplete();
  }

  function setupBuilding() {
    if (!window.NoahBuilding) return;
    window.NoahBuilding.configure({
      assets: assets,
      getBoatBounds: getBoatBounds,
      imageReady: imageReady,
      assetWidth: assetWidth,
      assetHeight: assetHeight,
      loadWebp: function (key, src) {
        loadWebpIfNeeded(key, src);
      },
      showBanner: showBanner,
      setBoatScale: function (scale) {
        BOAT_SCALE = scale;
      },
      setBoatPosition: function (x, y) {
        if (x != null) BOAT_X = x;
        if (y != null) BOAT_Y = y;
        DECK_TOP = BOAT_Y - 118;
      }
    });
  }

  function simulateCast(angleDeg) {
    var rad = (angleDeg * Math.PI) / 180;
    var vx = CAST_SPEED * Math.cos(rad);
    var vy = -CAST_SPEED * Math.sin(rad);

    if (vy >= -1) {
      return { rangePx: 0, depthPx: 0, rangeM: 0, depthM: 0 };
    }

    var flightTime = (-2 * vy) / GRAVITY;
    var rangePx = Math.abs(vx) * flightTime;
    var entryVy = Math.abs(vy);
    var depthPx = (entryVy * entryVy) / (2 * WATER_DECEL);

    return {
      rangePx: rangePx,
      depthPx: depthPx,
      rangeM: Math.round(rangePx * METER_SCALE * 10) / 10,
      depthM: Math.round(depthPx * METER_SCALE * 10) / 10
    };
  }

  function pickMaterial() {
    if (window.NoahBuilding && window.NoahBuilding.rollCastItems) {
      return window.NoahBuilding.rollCastItems();
    }
    return [{ kind: 'material', name: '材料' }];
  }

  function formatCatchLabel(items) {
    if (window.NoahBuilding && window.NoahBuilding.formatCastSummary) {
      return window.NoahBuilding.formatCastSummary(items);
    }
    return '物品';
  }

  function getMinCameraWorldTop() {
    if (window.NoahBuilding && typeof window.NoahBuilding.getMinCameraWorldTop === 'function') {
      return window.NoahBuilding.getMinCameraWorldTop();
    }
    return SCROLL_FALLBACK_MIN_TOP;
  }

  function clampCameraWorldTop() {
    var minTop = getMinCameraWorldTop();
    if (cameraWorldTop < minTop) cameraWorldTop = minTop;
    if (cameraWorldTop > 0) cameraWorldTop = 0;
  }

  function applyCameraScroll(deltaY) {
    if (!deltaY) return;
    cameraWorldTop += deltaY;
    clampCameraWorldTop();
  }

  function showBanner(text, duration) {
    state.bannerText = text;
    state.bannerTimer = duration || 2000;
  }

  function easeOutCubic(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return 1 - Math.pow(1 - t, 3);
  }

  function formatMeters(value) {
    return Math.round(value * 10) / 10;
  }

  function getResultAnim(result) {
    var elapsed = result.elapsed || 0;
    var sim = result.sim;
    var rangeT = Math.min(1, elapsed / RANGE_ANIM_MS);
    var depthT = elapsed <= RANGE_ANIM_MS
      ? 0
      : Math.min(1, (elapsed - RANGE_ANIM_MS) / DEPTH_ANIM_MS);
    var rangeEase = easeOutCubic(rangeT);
    var depthEase = easeOutCubic(depthT);
    return {
      rangeM: formatMeters(sim.rangeM * rangeEase),
      depthM: formatMeters(sim.depthM * depthEase),
      rangePx: sim.rangePx * rangeEase,
      depthPx: sim.depthPx * depthEase,
      rangeDone: rangeT >= 1,
      depthStarted: elapsed >= RANGE_ANIM_MS
    };
  }

  function resultBannerText(result) {
    var anim = getResultAnim(result);
    var catchName = result.items ? formatCatchLabel(result.items) : '';
    var depthPart = anim.depthStarted
      ? ' · 深度 ' + anim.depthM + 'm'
      : '';
    return '距离 ' + anim.rangeM + 'm' + depthPart + ' · 获得 ' + catchName;
  }

  function applyCatch(items) {
    if (!window.NoahBuilding || !items || !items.length) return;
    if (window.NoahBuilding.applyCastItems) {
      window.NoahBuilding.applyCastItems(items);
    }
    preloadBuildingAssets();
    clampCameraWorldTop();
    saveGame();
  }

  function castLine() {
    if (state.phase !== 'aim') return;
    var angle = state.pointerAngle;
    var sim = simulateCast(angle);
    var items = pickMaterial();

    state.phase = 'result';
    state.lastResult = {
      angle: angle,
      sim: sim,
      items: items,
      elapsed: 0
    };
    state.resultTimer = RANGE_ANIM_MS + DEPTH_ANIM_MS + 1200;

    applyCatch(items);
    showBanner(resultBannerText(state.lastResult), state.resultTimer);
  }

  function updatePointer(dt) {
    if (state.phase !== 'aim') return;
    var speed = 42;
    state.pointerAngle += state.pointerDir * speed * (dt / 1000);
    if (state.pointerAngle >= 90) {
      state.pointerAngle = 90;
      state.pointerDir = -1;
    } else if (state.pointerAngle <= 0) {
      state.pointerAngle = 0;
      state.pointerDir = 1;
    }
  }

  function updateResult(dt) {
    if (state.phase !== 'result') return;
    if (state.lastResult) {
      state.lastResult.elapsed = (state.lastResult.elapsed || 0) + dt;
      if (state.bannerTimer > 0) {
        state.bannerText = resultBannerText(state.lastResult);
      }
    }
    state.resultTimer -= dt;
    if (state.resultTimer <= 0) {
      state.phase = 'aim';
      state.lastResult = null;
    }
  }

  function updateBanner(dt) {
    if (state.bannerTimer <= 0) return;
    state.bannerTimer -= dt;
    if (state.bannerTimer <= 0) state.bannerText = '';
  }

  function drawBuilding() {
    if (window.NoahBuilding) window.NoahBuilding.draw(ctx);
  }

  function drawHud() {
    if (!window.NoahBuilding || !window.NoahBuilding.getEconomySnapshot) return;
    var eco = window.NoahBuilding.getEconomySnapshot();
    ctx.save();
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(
      '繁荣 ' + eco.prosperity + ' · 饱食 ' + eco.satiety +
        ' · 人口 ' + eco.people + '/' + eco.capacity,
      CANVAS_W - 12,
      CANVAS_H - 14
    );
    if (eco.prosperity >= 80) {
      ctx.fillStyle = '#ffe080';
      ctx.fillText('自动打捞中', CANVAS_W - 12, CANVAS_H - 30);
    }
    ctx.restore();
  }

  function drawCatchFlashes() {
    if (state.phase !== 'result' || !state.lastResult || !state.lastResult.items) return;
    var boat = getBoatBounds();
    var fishN = 0;
    state.lastResult.items.forEach(function (it) {
      if (it.kind === 'fish') fishN++;
    });
    if (!fishN || !window.NoahBuilding || !window.NoahBuilding.drawFishFlash) return;
    var i;
    for (i = 0; i < fishN; i++) {
      window.NoahBuilding.drawFishFlash(ctx, boat.x + 60 + i * 20, boat.y - 40);
    }
  }

  function drawBoat() {
    var boat = assets.boat;
    if (!imageReady(boat)) {
      ctx.fillStyle = '#6ecf9a';
      ctx.beginPath();
      ctx.ellipse(BOAT_X + 200, SKY_H + 6, 220, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    var w = assetWidth(boat) * BOAT_SCALE;
    var h = assetHeight(boat) * BOAT_SCALE;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(boat, BOAT_X, BOAT_Y, w, h);
  }

  function drawRod() {
    var r = getRodBase();
    ctx.save();
    ctx.strokeStyle = '#5c3d1e';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r.handleX, r.handleY);
    ctx.lineTo(r.tipX, r.tipY);
    ctx.stroke();
    ctx.fillStyle = '#8b6914';
    ctx.beginPath();
    ctx.arc(r.handleX, r.handleY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPointer() {
    var hook = getHookOrigin();
    var angle = state.phase === 'result' && state.lastResult
      ? state.lastResult.angle
      : state.pointerAngle;
    var rad = (angle * Math.PI) / 180;
    var len = 72;
    var ex = hook.x + Math.cos(rad) * len;
    var ey = hook.y - Math.sin(rad) * len;

    ctx.save();
    ctx.strokeStyle = state.phase === 'aim' ? '#ffee66' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hook.x, hook.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    ctx.arc(ex, ey, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 13px Courier New';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText(Math.round(angle) + '°', hook.x - 32, hook.y - 10);
    ctx.restore();
  }

  function drawResultMarkers() {
    if (!state.lastResult) return;
    var hook = getHookOrigin();
    var anim = getResultAnim(state.lastResult);
    var rad = (state.lastResult.angle * Math.PI) / 180;
    var endX = hook.x + Math.cos(rad) * Math.min(anim.rangePx, CANVAS_W - hook.x);
    var waterY = SKY_H + 8;

    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hook.x, hook.y);
    ctx.lineTo(endX, waterY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = 'bold 14px Courier New';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(anim.rangeM + ' m', (hook.x + endX) / 2, waterY - 12);
    if (anim.depthStarted) {
      ctx.fillText(anim.depthM + ' m', endX, waterY + anim.depthPx * 0.12 + 18);
    }
    ctx.restore();
  }

  function drawCastButton() {
    var b = getCastButtonRect();
    var disabled = state.phase !== 'aim';
    var pulse = state.phase === 'aim' ? 0.85 + Math.sin(Date.now() * 0.006) * 0.15 : 1;

    ctx.save();
    ctx.globalAlpha = disabled ? 0.45 : pulse;
    ctx.fillStyle = 'rgba(40, 30, 20, 0.55)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#f0e0a8';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);

    ctx.font = 'bold 15px Courier New';
    ctx.fillStyle = '#fff8d0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText('出杆', b.x + b.w / 2, b.y + b.h / 2 + 1);
    ctx.restore();
  }

  function drawBanner() {
    if (!state.bannerText) return;
    var alpha = Math.min(1, state.bannerTimer / 400);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 13px Courier New';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 5;
    ctx.fillText(state.bannerText, CANVAS_W / 2, 28);
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();
    ctx.translate(0, -cameraWorldTop);
    drawBoat();
    drawBuilding();
    drawCatchFlashes();
    drawRod();
    drawPointer();
    if (state.phase === 'result') drawResultMarkers();
    drawCastButton();
    ctx.restore();
    drawHud();
    drawBanner();
  }

  function canvasPoint(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((clientY - rect.top) / rect.height) * CANVAS_H + cameraWorldTop
    };
  }

  function onCanvasClick(e) {
    var p = canvasPoint(e.clientX, e.clientY);
    if (hitCastButton(p.x, p.y)) {
      castLine();
    }
  }

  function hitCastButton(x, y) {
    var b = getCastButtonRect();
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  function saveGame() {
    try {
      var payload = {
        boatScale: BOAT_SCALE,
        boat: { x: BOAT_X, y: BOAT_Y },
        cameraWorldTop: cameraWorldTop
      };
      if (window.NoahBuilding) payload.building = window.NoahBuilding.serialize();
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (err) { /* ignore */ }
  }

  function loadGame() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      applyBoatLayout(data);
      return !!(data.building && window.NoahBuilding);
    } catch (err) {
      return false;
    }
  }

  function restoreBuildingSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return window.NoahBuilding.initGameFresh();
      var data = JSON.parse(raw);
      if (data.building) return window.NoahBuilding.deserialize(data.building);
      return window.NoahBuilding.initGameFresh();
    } catch (err) {
      return window.NoahBuilding.initGameFresh();
    }
  }

  var lastTime = 0;
  function loop(ts) {
    var dt = ts - lastTime;
    if (dt > 80) dt = 80;
    lastTime = ts;
    updatePointer(dt);
    updateResult(dt);
    updateBanner(dt);
    var needSave = false;
    if (window.NoahBuilding && window.NoahBuilding.tickEconomy(dt)) {
      needSave = true;
    }
    if (window.NoahBuilding && window.NoahBuilding.tickAutoBuild(dt)) {
      preloadBuildingAssets();
      clampCameraWorldTop();
      needSave = true;
    }
    if (needSave) saveGame();
    render();
    requestAnimationFrame(loop);
  }

  function onAssetsReady() {
    if (assetsReady) return;
    assetsReady = true;
    if (bootTimeout) {
      clearTimeout(bootTimeout);
      bootTimeout = null;
    }
    if ($loading.classList.contains('hidden')) return;
    clampCameraWorldTop();
    $loading.classList.add('hidden');
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function bootstrapGame() {
    return fetch('initial-layout.json')
      .then(function (res) {
        if (!res.ok) throw new Error('layout fetch failed');
        return res.json();
      })
      .then(function (layout) {
        applyBoatLayout(layout);
        return afterSlotsReady();
      })
      .catch(function () {
        applyBoatLayout({ boatScale: 8.3, boat: { x: 24, y: 409 } });
        return afterSlotsReady();
      });
  }

  function afterSlotsReady() {
    if (!window.NoahBuilding) return Promise.resolve();
    var load = window.NoahBuilding.loadHousesData || window.NoahBuilding.loadSlotData;
    return load.call(window.NoahBuilding).then(function () {
      window.NoahBuilding.configure({ deferAssetLoad: true });
      setupBuilding();
      if (loadGame()) return restoreBuildingSave();
      return window.NoahBuilding.initGameFresh();
    }).then(function () {
      window.NoahBuilding.configure({ deferAssetLoad: false });
      preloadBuildingAssets();
      clampCameraWorldTop();
    });
  }

  function init() {
    canvas = document.getElementById('gameCanvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    ctx = canvas.getContext('2d');
    $loading = document.getElementById('loadingScreen');

    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      applyCameraScroll(e.deltaY);
    }, { passive: false });
    canvas.addEventListener('touchend', function (e) {
      e.preventDefault();
      if (e.changedTouches.length) {
        var t = e.changedTouches[0];
        onCanvasClick({ clientX: t.clientX, clientY: t.clientY });
      }
    });

    bootTimeout = setTimeout(function () {
      if (!assetsReady) onAssetsReady();
    }, 8000);

    bootstrapGame()
      .then(function () {
        loadAllAssets();
      })
      .catch(function () {
        loadAllAssets();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
