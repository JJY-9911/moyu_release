(function () {
  'use strict';

  var CANVAS_W = 1024;
  var CANVAS_H = 576;
  var SKY_H = Math.floor(CANVAS_H * 0.76);
  var BOAT_X = 24;
  var BOAT_Y = SKY_H - 28;
  var DEFAULT_BOAT_SCALE = 5.2;
  var boatScale = DEFAULT_BOAT_SCALE;
  var SCROLL_FALLBACK_MIN_TOP = -32000;
  var cameraWorldTop = 0;
  var SAVE_KEY = 'noah_layout_editor_v1';
  var BUILD_BASE = 'assets/Building/';

  /** 与 houses.json 一致的非 gemini 素材 */
  var ASSET_CATALOG = [
    { category: 'platform', file: 'platformer.webp' },
    { category: 'eave', file: 'gemini/eave/Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Building - Canopy 03.webp' },
    { category: 'eave', file: 'gemini/eave/Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Building - Roof A 04.webp' },
    { category: 'other', file: 'gemini/other/Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Environment - Grass_01-23.webp' },
    { category: 'other', file: 'gemini/other/Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Environment - Grass_01-24.webp' },
    { category: 'other', file: 'gemini/other/Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Environment - Grass_03     .webp' },
    { category: 'other', file: 'gemini/other/Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Environment - Quest Board.webp' }
  ];

  /** 内嵌清单，避免 file:// 下 fetch manifest 失败 */
  var GEMINI_CATALOG = [
    { category: 'wall', file: 'gemini/wall/wall-02.webp' },
    { category: 'wall', file: 'gemini/wall/wall-03.webp' },
    { category: 'wall', file: 'gemini/wall/wall-04.webp' },
    { category: 'door', file: 'gemini/door/door-01.webp' },
    { category: 'door', file: 'gemini/door/door-02.webp' },
    { category: 'door', file: 'gemini/door/door-03.webp' },
    { category: 'window', file: 'gemini/window/window-01.webp' },
    { category: 'window', file: 'gemini/window/window-02.webp' },
    { category: 'window', file: 'gemini/window/window-03.webp' },
    { category: 'window', file: 'gemini/window/window-04.webp' },
    { category: 'eave', file: 'gemini/eave/eave-01.webp' },
    { category: 'eave', file: 'gemini/eave/eave-03.webp' },
    { category: 'eave', file: 'gemini/eave/eave-04.webp' },
    { category: 'other', file: 'gemini/other/other-02.webp' },
    { category: 'other', file: 'gemini/other/other-03.webp' },
    { category: 'other', file: 'gemini/other/other-04.webp' },
    { category: 'other', file: 'gemini/other/other-07.webp' },
    { category: 'other', file: 'gemini/other/other-10.webp' }
  ];
  var CAT_LABEL = {
    platform: '平台', wall: '墙面', edge: '墙边界',
    door: '门', window: '窗', eave: '屋檐', other: '其他'
  };

  var assets = {};
  var canvas, ctx;
  var sprites = [];
  var selectedId = null;
  var nextId = 1;
  var showGuides = true;
  var showRod = true;
  var snapGrid = false;
  var boatSelected = false;
  var drag = null;

  function assetKey(file) {
    return 'b:' + file;
  }

  function imgReady(img) {
    return img && img.complete && (img.naturalWidth > 0 || img.width > 0);
  }

  function imgW(img) {
    return img.naturalWidth || img.width || 1;
  }

  function imgH(img) {
    return img.naturalHeight || img.height || 1;
  }

  function loadImg(key, src, cb) {
    if (assets[key] && imgReady(assets[key])) {
      if (cb) cb(assets[key]);
      return;
    }
    var el = new Image();
    el.onload = function () {
      if (el.decode) {
        el.decode().then(function () { assets[key] = el; if (cb) cb(el); })
          .catch(function () { assets[key] = el; if (cb) cb(el); });
      } else {
        assets[key] = el;
        if (cb) cb(el);
      }
    };
    el.onerror = function () { if (cb) cb(null); };
    el.src = src;
  }

  function ensureBuilding(file, cb) {
    loadImg(assetKey(file), BUILD_BASE + encodeURI(file), cb);
  }

  function getBoatBounds() {
    var boat = assets.boat;
    if (!imgReady(boat)) {
      return { x: BOAT_X, y: BOAT_Y, w: 74 * boatScale, h: 18 * boatScale };
    }
    return {
      x: BOAT_X,
      y: BOAT_Y,
      w: imgW(boat) * boatScale,
      h: imgH(boat) * boatScale
    };
  }

  function clampBoatScale(v) {
    return Math.max(2, Math.min(10, v));
  }

  function setBoatScale(v) {
    boatScale = clampBoatScale(v);
    syncBoatControls();
    render();
  }

  function syncBoatControls() {
    var rounded = Math.round(boatScale * 10) / 10;
    var range = document.getElementById('inpBoatScale');
    var num = document.getElementById('inpBoatScaleNum');
    if (range) range.value = String(rounded);
    if (num) num.value = String(rounded);
  }

  function hitTestBoat(x, y) {
    var b = getBoatBounds();
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  function hitTestBoatHandle(x, y) {
    var b = getBoatBounds();
    var hx = b.x + b.w;
    var hy = b.y + b.h;
    return Math.abs(x - hx) <= 12 && Math.abs(y - hy) <= 12;
  }

  function getBuildZone() {
    var boat = getBoatBounds();
    return {
      x: boat.x + 8,
      y: boat.y - 118,
      w: Math.floor(boat.w * 0.78),
      h: 88
    };
  }

  function getMinCameraWorldTop() {
    var minY = getBoatBounds().y - 120;
    for (var i = 0; i < sprites.length; i++) {
      if (sprites[i].y < minY) minY = sprites[i].y;
    }
    return Math.min(minY - 160, SCROLL_FALLBACK_MIN_TOP);
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

  function canvasPoint(clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * CANVAS_W,
      y: ((clientY - r.top) / r.height) * CANVAS_H + cameraWorldTop
    };
  }

  function snap(v) {
    if (!snapGrid) return v;
    return Math.round(v / 8) * 8;
  }

  function getSprite(id) {
    for (var i = 0; i < sprites.length; i++) {
      if (sprites[i].id === id) return sprites[i];
    }
    return null;
  }

  function defaultSize(file) {
    var img = assets[assetKey(file)];
    if (!imgReady(img)) return { w: 64, h: 64 };
    var nw = imgW(img);
    var nh = imgH(img);
    var maxH = 56;
    if (file.indexOf('platformer') >= 0) maxH = 36;
    else if (file.indexOf('/edge/') >= 0 || file.indexOf('Wall') >= 0) maxH = 90;
    else if (file.indexOf('gemini/wall/') >= 0) maxH = 90;
    else if (file.indexOf('gemini/eave/') >= 0) maxH = 64;
    else if (file.indexOf('gemini/door/') >= 0) maxH = 60;
    else if (file.indexOf('gemini/window/') >= 0) maxH = 60;
    if (nh > maxH) return { w: nw * maxH / nh, h: maxH };
    return { w: nw * 0.45, h: nh * 0.45 };
  }

  function geminiDisplayName(file) {
    var base = file.split('/').pop().replace('.webp', '');
    return base.replace(/-/g, ' ');
  }

  function addSprite(entry, x, y) {
    var size = defaultSize(entry.file);
    var sp = {
      id: 's' + (nextId++),
      category: entry.category,
      file: entry.file,
      x: x != null ? x : CANVAS_W / 2 - size.w / 2,
      y: y != null ? y : SKY_H - 80,
      w: size.w,
      h: size.h,
      flipH: false,
      z: sprites.length,
      note: ''
    };
    sprites.push(sp);
    ensureBuilding(entry.file, function () {
      select(sp.id);
      render();
    });
    select(sp.id);
    render();
  }

  function select(id) {
    selectedId = id;
    boatSelected = false;
    syncInspector();
  }

  function selectBoat() {
    selectedId = null;
    boatSelected = true;
    syncInspector();
  }

  function clearSelection() {
    selectedId = null;
    boatSelected = false;
    syncInspector();
  }

  function syncInspector() {
    var sp = selectedId ? getSprite(selectedId) : null;
    var panel = document.getElementById('selectionPanel');
    var none = document.getElementById('noSelection');
    if (!sp) {
      panel.hidden = true;
      none.hidden = false;
      return;
    }
    none.hidden = true;
    panel.hidden = false;
    document.getElementById('selFile').textContent = '[' + CAT_LABEL[sp.category] + '] ' + sp.file;
    document.getElementById('inpX').value = Math.round(sp.x);
    document.getElementById('inpY').value = Math.round(sp.y);
    document.getElementById('inpW').value = Math.round(sp.w);
    document.getElementById('inpH').value = Math.round(sp.h);
    document.getElementById('inpFlip').checked = sp.flipH;
    document.getElementById('inpNote').value = sp.note || '';
  }

  function applyInspector() {
    var sp = selectedId ? getSprite(selectedId) : null;
    if (!sp) return;
    sp.x = snap(parseFloat(document.getElementById('inpX').value) || 0);
    sp.y = snap(parseFloat(document.getElementById('inpY').value) || 0);
    sp.w = Math.max(8, parseFloat(document.getElementById('inpW').value) || 8);
    sp.h = Math.max(8, parseFloat(document.getElementById('inpH').value) || 8);
    sp.flipH = document.getElementById('inpFlip').checked;
    sp.note = document.getElementById('inpNote').value;
    render();
  }

  function hitTestHandle(sp, x, y) {
    var hx = sp.x + sp.w;
    var hy = sp.y + sp.h;
    return Math.abs(x - hx) <= 10 && Math.abs(y - hy) <= 10;
  }

  function hitTestSprite(x, y) {
    var found = null;
    var sorted = sprites.slice().sort(function (a, b) { return a.z - b.z; });
    for (var i = sorted.length - 1; i >= 0; i--) {
      var sp = sorted[i];
      var x0 = sp.x;
      var x1 = sp.x + sp.w;
      if (x >= x0 && x <= x1 && y >= sp.y && y <= sp.y + sp.h) {
        found = sp;
        break;
      }
    }
    return found;
  }

  function drawGuides() {
    if (!showGuides) return;
    var boat = getBoatBounds();
    var zone = getBuildZone();
    ctx.save();
    ctx.strokeStyle = 'rgba(110, 220, 140, 0.65)';
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(boat.x, boat.y, boat.w, boat.h);
    ctx.fillStyle = 'rgba(140, 80, 180, 0.18)';
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeStyle = 'rgba(180, 120, 220, 0.6)';
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
    ctx.setLineDash([]);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#afa';
    ctx.fillText('船体', boat.x + 4, boat.y - 4);
    ctx.fillStyle = '#daf';
    ctx.fillText('建造区(参考)', zone.x + 4, zone.y + 12);
    ctx.restore();
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

  function drawRodGuide() {
    if (!showRod) return;
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
    ctx.strokeStyle = 'rgba(255, 238, 100, 0.55)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(r.tipX, r.tipY);
    ctx.lineTo(r.tipX + 48, r.tipY - 48);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#fd8';
    ctx.fillText('鱼竿', r.handleX - 4, r.handleY - 8);
    ctx.restore();
  }

  function drawSprite(img, sp) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (sp.flipH) {
      ctx.translate(sp.x, sp.y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -sp.w, 0, sp.w, sp.h);
    } else {
      ctx.drawImage(img, sp.x, sp.y, sp.w, sp.h);
    }
    ctx.restore();
  }

  function drawSprites() {
    var sorted = sprites.slice().sort(function (a, b) { return a.z - b.z; });
    sorted.forEach(function (sp) {
      var img = assets[assetKey(sp.file)];
      if (!imgReady(img)) return;
      drawSprite(img, sp);
    });
  }

  function drawBoatSelection() {
    if (!boatSelected) return;
    var b = getBoatBounds();
    ctx.save();
    ctx.strokeStyle = '#6ef';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#6ef';
    ctx.fillRect(b.x + b.w - 5, b.y + b.h - 5, 10, 10);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#6ef';
    ctx.fillText('船 ×' + Math.round(boatScale * 10) / 10, b.x + 4, b.y - 4);
    ctx.restore();
  }

  function drawSelection() {
    var sp = selectedId ? getSprite(selectedId) : null;
    if (!sp) return;
    var x0 = sp.x;
    ctx.save();
    ctx.strokeStyle = '#ffee44';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, sp.y, sp.w, sp.h);
    var hx = sp.x + sp.w;
    var hy = sp.y + sp.h;
    ctx.fillStyle = '#ffee44';
    ctx.fillRect(hx - 5, hy - 5, 10, 10);
    if (sp.note) {
      ctx.font = '10px monospace';
      ctx.fillStyle = '#ffee44';
      ctx.fillText(sp.note, x0, sp.y - 4);
    }
    ctx.restore();
  }

  function drawScene() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();
    ctx.translate(0, -cameraWorldTop);
    var boat = assets.boat;
    if (imgReady(boat)) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(boat, BOAT_X, BOAT_Y, imgW(boat) * boatScale, imgH(boat) * boatScale);
    }
    drawGuides();
    drawSprites();
    drawRodGuide();
    drawBoatSelection();
    drawSelection();
    ctx.restore();
  }

  function render() {
    drawScene();
  }

  function exportJSON() {
    var data = {
      version: 1,
      canvasW: CANVAS_W,
      canvasH: CANVAS_H,
      boatScale: Math.round(boatScale * 100) / 100,
      cameraWorldTop: Math.round(cameraWorldTop),
      boat: getBoatBounds(),
      buildZone: getBuildZone(),
      sprites: sprites.map(function (sp) {
        return {
          category: sp.category,
          file: sp.file,
          x: Math.round(sp.x),
          y: Math.round(sp.y),
          w: Math.round(sp.w),
          h: Math.round(sp.h),
          flipH: sp.flipH,
          z: sp.z,
          note: sp.note || ''
        };
      })
    };
    return JSON.stringify(data, null, 2);
  }

  function importJSON(text) {
    var data = JSON.parse(text);
    if (!data.sprites || !Array.isArray(data.sprites)) throw new Error('无效格式');
    sprites = data.sprites.map(function (sp, i) {
      return {
        id: 's' + (nextId++),
        category: sp.category || 'other',
        file: sp.file,
        x: sp.x,
        y: sp.y,
        w: sp.w,
        h: sp.h,
        flipH: !!sp.flipH,
        z: sp.z != null ? sp.z : i,
        note: sp.note || ''
      };
    });
    if (data.boatScale != null) {
      boatScale = clampBoatScale(parseFloat(data.boatScale));
      syncBoatControls();
    }
    if (data.boat) {
      if (data.boat.x != null) BOAT_X = data.boat.x;
      if (data.boat.y != null) BOAT_Y = data.boat.y;
    }
    if (data.cameraWorldTop != null) {
      cameraWorldTop = parseFloat(data.cameraWorldTop);
      clampCameraWorldTop();
    }
    selectedId = null;
    boatSelected = false;
    sprites.forEach(function (sp) { ensureBuilding(sp.file); });
    syncInspector();
    render();
  }

  function mergeGeminiCatalog(entries) {
    if (!entries || !entries.length) return;
    var seen = {};
    ASSET_CATALOG.forEach(function (e) { seen[e.file] = true; });
    entries.forEach(function (e) {
      if (!e.file || seen[e.file]) return;
      seen[e.file] = true;
      ASSET_CATALOG.push({
        category: e.category || 'other',
        file: e.file,
        source: 'gemini'
      });
    });
  }

  function initGeminiCatalog() {
    mergeGeminiCatalog(GEMINI_CATALOG);
  }

  function entryMatchesFilter(entry, filter) {
    if (filter === 'gemini') return entry.source === 'gemini';
    if (filter === 'all') return true;
    return entry.category === filter;
  }

  function appendLibraryItem(list, entry) {
    var li = document.createElement('li');
    if (entry.source === 'gemini') li.className = 'gemini-item';
    var short = entry.source === 'gemini'
      ? geminiDisplayName(entry.file)
      : entry.file.split('/').pop().replace('.webp', '').slice(-28);
    var tag = entry.source === 'gemini' ? ' <span class="src">Gemini</span>' : '';
    li.innerHTML = '<span class="cat">' + CAT_LABEL[entry.category] + '</span>' + tag + '<br>' + short;
    li.addEventListener('click', function () {
      ensureBuilding(entry.file, function () {
        addSprite(entry);
      });
    });
    list.appendChild(li);
  }

  function buildLibrary() {
    var list = document.getElementById('assetList');
    var filter = document.getElementById('catFilter').value;
    list.innerHTML = '';
    var gemini = [];
    var base = [];
    ASSET_CATALOG.forEach(function (entry) {
      if (!entryMatchesFilter(entry, filter)) return;
      if (entry.source === 'gemini') gemini.push(entry);
      else base.push(entry);
    });

    function renderEntries(entries) {
      entries.forEach(function (entry) { appendLibraryItem(list, entry); });
    }

    if (filter === 'all' && gemini.length) {
      var head = document.createElement('li');
      head.className = 'section-head';
      head.textContent = 'Gemini 拆分素材 (' + gemini.length + ')';
      list.appendChild(head);
      renderEntries(gemini);
      if (base.length) {
        var head2 = document.createElement('li');
        head2.className = 'section-head';
        head2.textContent = '原版素材 (' + base.length + ')';
        list.appendChild(head2);
      }
      renderEntries(base);
    } else {
      renderEntries(gemini.concat(base));
    }
  }

  function onPointerDown(e) {
    e.preventDefault();
    var p = canvasPoint(e.clientX, e.clientY);
    var sp = hitTestSprite(p.x, p.y);
    if (sp) {
      select(sp.id);
      if (hitTestHandle(sp, p.x, p.y)) {
        drag = { mode: 'resize', id: sp.id, startX: p.x, startY: p.y, ow: sp.w, oh: sp.h };
      } else {
        drag = {
          mode: 'move',
          id: sp.id,
          offX: p.x - sp.x,
          offY: p.y - sp.y
        };
      }
    } else if (hitTestBoat(p.x, p.y)) {
      selectBoat();
      var b = getBoatBounds();
      if (hitTestBoatHandle(p.x, p.y)) {
        drag = { mode: 'boatResize', startX: p.x, startW: b.w };
      }
    } else {
      clearSelection();
    }
    render();
  }

  function onPointerMove(e) {
    if (!drag) return;
    var p = canvasPoint(e.clientX, e.clientY);
    if (drag.mode === 'boatResize') {
      var boat = assets.boat;
      if (!imgReady(boat)) return;
      var newW = Math.max(80, snap(drag.startW + (p.x - drag.startX)));
      setBoatScale(newW / imgW(boat));
      return;
    }
    var sp = getSprite(drag.id);
    if (!sp) return;
    if (drag.mode === 'move') {
      sp.x = snap(p.x - drag.offX);
      sp.y = snap(p.y - drag.offY);
    } else if (drag.mode === 'resize') {
      var dx = p.x - drag.startX;
      var dy = p.y - drag.startY;
      sp.w = Math.max(8, snap(drag.ow + dx));
      sp.h = Math.max(8, snap(drag.oh + dy));
    }
    syncInspector();
    render();
  }

  function onPointerUp() {
    drag = null;
  }

  function setupBoatControls() {
    var range = document.getElementById('inpBoatScale');
    var num = document.getElementById('inpBoatScaleNum');
    function fromRange() {
      setBoatScale(parseFloat(range.value) || DEFAULT_BOAT_SCALE);
    }
    function fromNum() {
      setBoatScale(parseFloat(num.value) || DEFAULT_BOAT_SCALE);
    }
    range.addEventListener('input', fromRange);
    num.addEventListener('input', fromNum);
    num.addEventListener('change', fromNum);
    syncBoatControls();
  }

  function setupInspector() {
    ['inpX', 'inpY', 'inpW', 'inpH', 'inpNote'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', applyInspector);
      document.getElementById(id).addEventListener('input', applyInspector);
    });
    document.getElementById('inpFlip').addEventListener('change', applyInspector);

    document.getElementById('btnDel').addEventListener('click', function () {
      if (!selectedId) return;
      sprites = sprites.filter(function (s) { return s.id !== selectedId; });
      selectedId = null;
      syncInspector();
      render();
    });

    document.getElementById('btnDup').addEventListener('click', function () {
      var sp = selectedId ? getSprite(selectedId) : null;
      if (!sp) return;
      var copy = {
        id: 's' + (nextId++),
        category: sp.category,
        file: sp.file,
        x: sp.x + 12,
        y: sp.y + 12,
        w: sp.w,
        h: sp.h,
        flipH: sp.flipH,
        z: sprites.length,
        note: sp.note
      };
      sprites.push(copy);
      select(copy.id);
      render();
    });

    document.getElementById('btnUp').addEventListener('click', function () {
      var sp = selectedId ? getSprite(selectedId) : null;
      if (!sp) return;
      sp.z += 1;
      render();
    });

    document.getElementById('btnDown').addEventListener('click', function () {
      var sp = selectedId ? getSprite(selectedId) : null;
      if (!sp || sp.z <= 0) return;
      sp.z -= 1;
      render();
    });
  }

  function boot() {
    canvas = document.getElementById('stage');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    ctx = canvas.getContext('2d');

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      applyCameraScroll(e.deltaY);
      render();
    }, { passive: false });
    canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('touchstart', function (e) {
      if (e.touches[0]) onPointerDown(e.touches[0]);
    }, { passive: false });
    window.addEventListener('touchmove', function (e) {
      if (e.touches[0]) onPointerMove(e.touches[0]);
    }, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    document.getElementById('catFilter').addEventListener('change', buildLibrary);

    document.getElementById('chkGuides').addEventListener('change', function (e) {
      showGuides = e.target.checked;
      render();
    });
    document.getElementById('chkRod').addEventListener('change', function (e) {
      showRod = e.target.checked;
      render();
    });
    document.getElementById('chkSnap').addEventListener('change', function (e) {
      snapGrid = e.target.checked;
    });

    document.getElementById('btnClear').addEventListener('click', function () {
      if (!confirm('清空所有已放置素材？')) return;
      sprites = [];
      selectedId = null;
      syncInspector();
      render();
    });

    document.getElementById('btnExport').addEventListener('click', function () {
      var json = exportJSON();
      document.getElementById('jsonOut').value = json;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(function () {
          alert('布局 JSON 已复制到剪贴板');
        }).catch(function () {
          alert('已生成 JSON，请手动复制下方文本框内容');
        });
      }
    });

    document.getElementById('btnImport').addEventListener('click', function () {
      var text = prompt('粘贴布局 JSON：', document.getElementById('jsonOut').value);
      if (!text) return;
      try {
        importJSON(text);
      } catch (err) {
        alert('导入失败：' + err.message);
      }
    });

    document.getElementById('btnSaveLocal').addEventListener('click', function () {
      localStorage.setItem(SAVE_KEY, exportJSON());
      alert('已保存到浏览器本地');
    });

    document.getElementById('btnLoadLocal').addEventListener('click', function () {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        alert('无本地存档');
        return;
      }
      try {
        importJSON(raw);
        document.getElementById('jsonOut').value = raw;
      } catch (err) {
        alert('读取失败：' + err.message);
      }
    });

    window.addEventListener('keydown', function (e) {
      var sp = selectedId ? getSprite(selectedId) : null;
      if (!sp) return;
      var step = e.shiftKey ? 8 : 1;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        sprites = sprites.filter(function (s) { return s.id !== selectedId; });
        selectedId = null;
        syncInspector();
        render();
        e.preventDefault();
      }
      if (e.key === 'ArrowLeft') { sp.x -= step; syncInspector(); render(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { sp.x += step; syncInspector(); render(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { sp.y -= step; syncInspector(); render(); e.preventDefault(); }
      if (e.key === 'ArrowDown') { sp.y += step; syncInspector(); render(); e.preventDefault(); }
    });

    setupBoatControls();
    setupInspector();

    initGeminiCatalog();
    buildLibrary();
    ASSET_CATALOG.forEach(function (entry) {
      ensureBuilding(entry.file);
    });

    if (!localStorage.getItem(SAVE_KEY)) {
      fetch('initial-layout.json')
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          if (data) importJSON(JSON.stringify(data));
        })
        .catch(function () { /* ignore */ });
    }

    loadImg('boat', 'assets/Boat.webp', render);

    setInterval(render, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
