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
  var BG_BASE = 'assets/bg/';
  var BG_SCROLL_PX_PER_SEC = 10;
  var FISHMAN_SCALE = 0.4;
  var PERSON_SPRITE_SCALE = 0.32;
  var gameLayout = null;
  var BOAT_X = 24;
  var BOAT_Y = SKY_H - 28;
  /** 布局目标船宽；大图素材（>256px 宽）按此自动算缩放，不再用旧版 8.3 精灵倍率 */
  var BOAT_LAYOUT_TARGET_W = 614.2;
  var BOAT_LARGE_ART_MIN_W = 256;
  var BOAT_SCALE = 0.44;
  var DECK_TOP = SKY_H - 118;
  var SCROLL_FALLBACK_MIN_TOP = -32000;
  var cameraWorldTop = 0;
  var bgScrollX = 0;
  var bgScrollLayers = [];
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

  function isLargeBoatArt(img) {
    return imageReady(img) && assetWidth(img) > BOAT_LARGE_ART_MIN_W;
  }

  function getBoatScale() {
    var boat = assets.boat;
    if (!imageReady(boat)) return BOAT_SCALE;
    if (isLargeBoatArt(boat)) {
      return BOAT_LAYOUT_TARGET_W / assetWidth(boat);
    }
    return BOAT_SCALE;
  }

  function syncBoatScaleFromAsset() {
    var boat = assets.boat;
    if (!isLargeBoatArt(boat)) return;
    BOAT_SCALE = BOAT_LAYOUT_TARGET_W / assetWidth(boat);
  }

  function applyBoatLayout(data) {
    if (!data) return;
    if (data.boatScale != null && !isLargeBoatArt(assets.boat)) {
      BOAT_SCALE = data.boatScale;
    }
    if (data.boat) {
      if (data.boat.x != null) BOAT_X = data.boat.x;
      if (data.boat.y != null) BOAT_Y = data.boat.y;
    }
    if (data.cameraWorldTop != null) cameraWorldTop = data.cameraWorldTop;
    syncBoatScaleFromAsset();
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
    var scale = getBoatScale();
    var bw = imageReady(boat) ? assetWidth(boat) * scale : 74 * scale;
    var bh = imageReady(boat) ? assetHeight(boat) * scale : 18 * scale;
    return { x: BOAT_X, y: BOAT_Y, w: bw, h: bh };
  }

  function getRodLayout() {
    if (gameLayout && gameLayout.rod) return gameLayout.rod;
    return { handleFromRight: 42, handleFromTop: -12, tipFromRight: 24, tipFromTop: -38 };
  }

  function getFishmanLayout() {
    if (gameLayout && gameLayout.fishman) return gameLayout.fishman;
    return { scale: 0.4, anchorXRatio: -0.72, anchorYOffset: 6 };
  }

  function getRodBase() {
    var boat = getBoatBounds();
    var r = getRodLayout();
    return {
      handleX: boat.x + boat.w - r.handleFromRight,
      handleY: boat.y + r.handleFromTop,
      tipX: boat.x + boat.w - r.tipFromRight,
      tipY: boat.y + r.tipFromTop
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

  function getResetButtonRect() {
    return { x: 12, y: CANVAS_H - 48, w: 72, h: 30 };
  }

  /** 出杆按钮：世界坐标（随船） */
  function getCastButtonWorldRect() {
    return getCastButtonRect();
  }

  /** 出杆按钮：屏幕坐标（不随镜头滚动） */
  function getCastButtonScreenRect() {
    var b = getCastButtonWorldRect();
    return {
      x: b.x,
      y: b.y - cameraWorldTop,
      w: b.w,
      h: b.h
    };
  }

  function canvasScreenPoint(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((clientY - rect.top) / rect.height) * CANVAS_H
    };
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
      if (key === 'boat') syncBoatScaleFromAsset();
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

  function bgTileKey(layerId, tileFile) {
    return 'bg:' + layerId + '/' + tileFile;
  }

  function defaultBgLayersManifest() {
    return {
      scrollPxPerSec: 10,
      layers: [
        { id: 'Ocean_1', tiles: ['1.png', '2.png', '3.png'] },
        { id: 'Ocean_2', tiles: ['2.png', '3.png', '4.png'] },
        { id: 'Ocean_3', tiles: ['1 16.37.29.png', '2.png', '3.png', '4.png'] },
        { id: 'Ocean_4', tiles: ['1 16.37.34.png', '2.png', '3.png', '4.png'] },
        { id: 'Ocean_5', tiles: ['1 16.37.39.png', '2.png', '3.png', '4.png'] },
        { id: 'Ocean_6', tiles: ['1 16.37.44.png', '2.png', '3.png', '4.png'] },
        { id: 'Ocean_7', tiles: ['1 16.37.48.png', '2.png', '3.png', '4.png', '5.png'] },
        { id: 'Ocean_8', tiles: ['1 16.37.53.png', '2.png', '3.png', '4.png', '5.png'] }
      ]
    };
  }

  function loadBgLayersManifest() {
    return fetch(BG_BASE + 'layers.json')
      .then(function (res) {
        if (!res.ok) return defaultBgLayersManifest();
        return res.json();
      })
      .catch(function () {
        return defaultBgLayersManifest();
      })
      .then(function (data) {
        bgScrollLayers = data.layers || [];
        if (data.scrollPxPerSec != null) BG_SCROLL_PX_PER_SEC = data.scrollPxPerSec;
      });
  }

  function loadBgScrollAssets() {
    bgScrollLayers.forEach(function (layer) {
      (layer.tiles || []).forEach(function (tile) {
        loadWebp(bgTileKey(layer.id, tile), BG_BASE + layer.id + '/' + encodeURI(tile));
      });
    });
  }

  function loadAllAssets() {
    loadTotal = 0;
    loadDone = 0;
    pendingLoads = {};
    loadWebp('boat', 'assets/Boat.webp');
    loadWebp('bg1', BG_BASE + '1.webp');
    loadBgScrollAssets();
    loadWebp('fishman', 'assets/fishman.webp');
    loadWebp('people1', 'assets/people1.webp');
    loadWebp('people2', 'assets/people2.webp');
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
      },
      drawSpriteStrip: function (c, img, x, y, dw, dh, timeMs) {
        if (window.NoahSprites) {
          window.NoahSprites.drawStrip(c, img, x, y, dw, dh, timeMs, assetWidth, assetHeight);
        }
      },
      personSpriteScale: PERSON_SPRITE_SCALE,
      gameLayout: gameLayout
    });
  }

  function loadGameLayout() {
    return fetch('game-layout.json')
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        gameLayout = data;
        var fm = getFishmanLayout();
        if (fm.scale != null) FISHMAN_SCALE = fm.scale;
        if (window.NoahBuilding) {
          window.NoahBuilding.configure({ gameLayout: gameLayout });
        }
      })
      .catch(function () { /* optional */ });
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
      '饱腹 ' + eco.satiety +
        ' · 总人数 ' + eco.people +
        ' · 入住 ' + eco.housed +
        ' · 层数 ' + eco.floors +
        ' · 繁荣 ' + eco.prosperity,
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

  function updateBackground(dt) {
    bgScrollX += BG_SCROLL_PX_PER_SEC * (dt / 1000);
  }

  function drawBgStatic() {
    var img = assets.bg1;
    if (!imageReady(img)) {
      ctx.fillStyle = '#e8c878';
      ctx.fillRect(0, 0, CANVAS_W, SKY_H);
      ctx.fillStyle = '#3a7ab8';
      ctx.fillRect(0, SKY_H, CANVAS_W, WATER_H);
      return;
    }
    var nw = assetWidth(img);
    var nh = assetHeight(img);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, nw, nh, 0, 0, CANVAS_W, CANVAS_H);
  }

  function getBgLayerImages(layer) {
    var tiles = layer.tiles || [];
    var imgs = [];
    var t;
    for (t = 0; t < tiles.length; t++) {
      var img = assets[bgTileKey(layer.id, tiles[t])];
      if (!imageReady(img)) return null;
      imgs.push(img);
    }
    return imgs.length ? imgs : null;
  }

  /** 各 Ocean_* 为一组：tiles[0] 底层，后续叠在上；各组横向首尾相接，整条带一起左移 */
  function buildBgScrollStrip() {
    var segments = [];
    var totalW = 0;
    var li;
    for (li = 0; li < bgScrollLayers.length; li++) {
      var imgs = getBgLayerImages(bgScrollLayers[li]);
      if (!imgs) return null;
      var ref = imgs[0];
      var nw = assetWidth(ref);
      var nh = assetHeight(ref);
      if (!nw || !nh) return null;
      var dw = nw * (CANVAS_H / nh);
      segments.push({ imgs: imgs, w: dw, nw: nw, nh: nh });
      totalW += dw;
    }
    return totalW > 0 ? { segments: segments, totalW: totalW } : null;
  }

  function drawBgScrollingWorld(scrollX) {
    var strip = buildBgScrollStrip();
    if (!strip) return;
    var offset = ((scrollX % strip.totalW) + strip.totalW) % strip.totalW;
    var originX = -offset;
    ctx.imageSmoothingEnabled = false;
    while (originX < CANVAS_W) {
      var segX = 0;
      var si;
      for (si = 0; si < strip.segments.length; si++) {
        var seg = strip.segments[si];
        var x = originX + segX;
        if (x + seg.w > 0 && x < CANVAS_W) {
          var ti;
          for (ti = 0; ti < seg.imgs.length; ti++) {
            var img = seg.imgs[ti];
            ctx.drawImage(img, 0, 0, seg.nw, seg.nh, x, 0, seg.w, CANVAS_H);
          }
        }
        segX += seg.w;
      }
      originX += strip.totalW;
    }
  }

  function drawBackground() {
    drawBgStatic();
    drawBgScrollingWorld(bgScrollX);
  }

  function drawBoat() {
    var boat = assets.boat;
    if (!imageReady(boat)) {
      ctx.fillStyle = '#6ecf9a';
      ctx.beginPath();
      var b = getBoatBounds();
      ctx.ellipse(b.x + b.w * 0.5, b.y + b.h * 0.55, b.w * 0.45, b.h * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    var scale = getBoatScale();
    var w = assetWidth(boat) * scale;
    var h = assetHeight(boat) * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(boat, BOAT_X, BOAT_Y, w, h);
  }

  function drawFishman() {
    var img = assets.fishman;
    if (!imageReady(img) || !window.NoahSprites) return;
    var r = getRodBase();
    var fm = getFishmanLayout();
    var sc = fm.scale != null ? fm.scale : FISHMAN_SCALE;
    var fh = assetHeight(img);
    var dw = fh * sc;
    var dh = fh * sc;
    var x = r.handleX + dw * (fm.anchorXRatio != null ? fm.anchorXRatio : -0.72);
    var y = r.handleY - dh + (fm.anchorYOffset != null ? fm.anchorYOffset : 6);
    window.NoahSprites.drawStrip(
      ctx, img, x, y, dw, dh, performance.now(), assetWidth, assetHeight
    );
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

  function drawResetButton() {
    var b = getResetButtonRect();
    ctx.save();
    ctx.fillStyle = 'rgba(60, 24, 24, 0.65)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#e8a0a0';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    ctx.font = 'bold 14px Courier New';
    ctx.fillStyle = '#ffe8e8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText('重制', b.x + b.w / 2, b.y + b.h / 2 + 1);
    ctx.restore();
  }

  function drawCastButton() {
    var b = getCastButtonScreenRect();
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
    drawBackground();
    ctx.save();
    ctx.translate(0, -cameraWorldTop);
    drawBoat();
    drawBuilding();
    drawCatchFlashes();
    drawFishman();
    drawRod();
    drawPointer();
    if (state.phase === 'result') drawResultMarkers();
    ctx.restore();
    drawCastButton();
    drawResetButton();
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
    var screen = canvasScreenPoint(e.clientX, e.clientY);
    if (hitResetButton(screen.x, screen.y)) {
      resetGameProgress();
      return;
    }
    if (hitCastButton(screen.x, screen.y)) {
      castLine();
    }
  }

  function hitCastButton(x, y) {
    var b = getCastButtonScreenRect();
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  function hitResetButton(x, y) {
    var b = getResetButtonRect();
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  function resetGameProgress() {
    if (!confirm('确定要重制吗？将清空所有建造、材料与进度。')) return;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (err) { /* ignore */ }
    cameraWorldTop = 0;
    state.phase = 'aim';
    state.lastResult = null;
    state.resultTimer = 0;
    state.bannerText = '';
    state.bannerTimer = 0;
    if (!window.NoahBuilding) return;
    window.NoahBuilding.initGameFresh().then(function () {
      preloadBuildingAssets();
      clampCameraWorldTop();
      showBanner('进度已重制', 2000);
      saveGame();
    });
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
    updateBackground(dt);
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
    return loadGameLayout().then(function () {
      return fetch('initial-layout.json');
    })
      .then(function (res) {
        if (!res.ok) throw new Error('layout fetch failed');
        return res.json();
      })
      .then(function (layout) {
        applyBoatLayout(layout);
        return afterSlotsReady();
      })
      .catch(function () {
        applyBoatLayout({ boatScale: 0.44, boat: { x: 24, y: 409 } });
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
        return loadBgLayersManifest();
      })
      .then(function () {
        loadAllAssets();
      })
      .catch(function () {
        loadBgLayersManifest().then(function () {
          loadAllAssets();
        });
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
