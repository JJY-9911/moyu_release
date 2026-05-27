(function () {
  'use strict';

  var CANVAS_W = 1024;
  var CANVAS_H = 576;
  var SKY_H = Math.floor(CANVAS_H * 0.76);
  var WATER_H = CANVAS_H - SKY_H;
  var BOAT_X = 24;
  var BOAT_Y = SKY_H - 28;
  var BOAT_SCALE = 5.2;
  var cameraWorldTop = 0;

  var assets = {};
  var canvas, ctx;
  var showDebug = true;

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

  function getBoatBounds() {
    var boat = assets.boat;
    var bw = imageReady(boat) ? assetWidth(boat) * BOAT_SCALE : 74 * BOAT_SCALE;
    var bh = imageReady(boat) ? assetHeight(boat) * BOAT_SCALE : 18 * BOAT_SCALE;
    return { x: BOAT_X, y: BOAT_Y, w: bw, h: bh };
  }

  function loadAsset(key, src, cb) {
    var img = new Image();
    img.onload = function () {
      if (img.decode) {
        img.decode().then(function () { assets[key] = img; if (cb) cb(); })
          .catch(function () { assets[key] = img; if (cb) cb(); });
      } else {
        assets[key] = img;
        if (cb) cb();
      }
    };
    img.onerror = function () { if (cb) cb(); };
    img.src = src;
  }

  function loadWebpForBuilding(key, src) {
    loadAsset(key, src, null);
  }

  function clampCameraWorldTop() {
    var minTop = window.NoahBuilding.getMinCameraWorldTop
      ? window.NoahBuilding.getMinCameraWorldTop()
      : -32000;
    if (cameraWorldTop < minTop) cameraWorldTop = minTop;
    if (cameraWorldTop > 0) cameraWorldTop = 0;
  }

  function applyCameraScroll(deltaY) {
    if (!deltaY) return;
    cameraWorldTop += deltaY;
    clampCameraWorldTop();
  }

  function drawScene() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();
    ctx.translate(0, -cameraWorldTop);

    var boat = assets.boat;
    if (imageReady(boat)) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(boat, BOAT_X, BOAT_Y, assetWidth(boat) * BOAT_SCALE, assetHeight(boat) * BOAT_SCALE);
    }

    window.NoahBuilding.draw(ctx);
    if (showDebug) window.NoahBuilding.drawDebug(ctx, true);
    ctx.restore();
  }

  function refreshUI() {
    clampCameraWorldTop();
    var st = window.NoahBuilding.getStatus();
    document.getElementById('statusBox').textContent =
      '平台段数: ' + st.platformTiles + '\n' +
      '库存: ' + (st.materials || '无') + '\n' +
      '当前: ' + st.floor;
    document.getElementById('logBox').textContent = window.NoahBuilding.getPieceLog().join('\n') || '(无构件)';
    drawScene();
  }

  function logAction(msg) {
    var box = document.getElementById('statusBox');
    var prev = box.textContent;
    box.textContent = '▶ ' + msg + '\n\n' + prev;
  }

  function initMatButtons() {
    var grid = document.getElementById('matButtons');
    var labels = window.NoahBuilding.MAT_LABELS;
    var costs = window.NoahBuilding.BUILD_COST;
    Object.keys(labels).forEach(function (type) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn';
      btn.textContent = labels[type] + ' (需' + costs[type] + ')';
      btn.addEventListener('click', function () {
        window.NoahBuilding.addMaterial(type, costs[type]);
        logAction('+' + labels[type] + ' ×' + costs[type]);
        refreshUI();
      });
      grid.appendChild(btn);
    });
  }

  function setupControls() {
    document.getElementById('btnRandomMat').addEventListener('click', function () {
      window.NoahBuilding.grantRandomMaterial();
      logAction('随机材料');
      refreshUI();
    });

    document.getElementById('btnRandomBuild').addEventListener('click', function () {
      window.NoahBuilding.grantRandomMaterial();
      window.NoahBuilding.tryAutoBuild();
      logAction('随机材料并自动建造');
      refreshUI();
    });

    document.getElementById('btnAutoStep').addEventListener('click', function () {
      window.NoahBuilding.tryAutoBuild();
      logAction('自动建造一步');
      refreshUI();
    });

    document.getElementById('btnAutoAll').addEventListener('click', function () {
      var n = 0;
      while (window.NoahBuilding.tryAutoBuild() && n < 30) n++;
      logAction('连续建造 ' + n + ' 步');
      refreshUI();
    });

    document.querySelectorAll('[data-tiles]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.NoahBuilding.setPlatformTiles(parseInt(btn.getAttribute('data-tiles'), 10));
        logAction('平台段数 → ' + btn.getAttribute('data-tiles'));
        refreshUI();
      });
    });

    document.querySelectorAll('[data-wall]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-wall');
        window.NoahBuilding.setWallSidePref(v === 'random' ? null : v);
        logAction('墙面偏好 → ' + v);
        refreshUI();
      });
    });

    document.getElementById('chkDebug').addEventListener('change', function (e) {
      showDebug = e.target.checked;
      refreshUI();
    });

    document.getElementById('btnReset').addEventListener('click', function () {
      window.NoahBuilding.resetTest();
      logAction('已重置');
      refreshUI();
    });
  }

  function boot() {
    canvas = document.getElementById('preview');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    ctx = canvas.getContext('2d');

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      applyCameraScroll(e.deltaY);
      drawScene();
    }, { passive: false });

    window.NoahBuilding.configure({
      assets: assets,
      getBoatBounds: getBoatBounds,
      imageReady: imageReady,
      assetWidth: assetWidth,
      assetHeight: assetHeight,
      loadWebp: loadWebpForBuilding,
      showBanner: function () { /* 测试工具不用横幅 */ }
    });

    var pending = 0;
    function done() {
      pending--;
      if (pending > 0) return;
      window.NoahBuilding.loadSlotData(function () {
        window.NoahBuilding.preloadEssentials();
        window.NoahBuilding.preloadCatalog();
        window.NoahBuilding.resetTest();
        initMatButtons();
        setupControls();
        refreshUI();
        setInterval(drawScene, 400);
      });
    }

    ['assets/Boat.webp'].forEach(function (src) {
      pending++;
      loadAsset(src, src, done);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
