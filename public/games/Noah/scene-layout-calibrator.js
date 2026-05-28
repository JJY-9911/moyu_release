/**
 * 场景布局校准（船 / 鱼竿 / 钓鱼人 / 建造区 / 人）
 * 由 house-stack-calibrator.html 在「场景布局」模式下加载
 */
(function (root) {
  'use strict';

  var CANVAS_W = 1024;
  var CANVAS_H = 576;
  var BOAT_TARGET_W = 614.2;

  var defaultLayout = function () {
    return {
      version: 1,
      boat: { x: -12, y: 213 },
      boatTargetWidth: BOAT_TARGET_W,
      rod: {
        handleFromRight: 149,
        handleFromTop: 116,
        tipFromRight: 74,
        tipFromTop: 91
      },
      fishman: {
        scale: 0.4,
        anchorXRatio: -0.44,
        anchorYOffset: 18
      },
      people: {
        onBoat: {
          offsetX: 200, offsetY: 180, stepX: 10, staggerY: 6, staggerEvery: 3,
          stackDy: 8, stackDx: 3, padLeft: 16, padRight: 28, padTop: 36, padBottom: 12
        },
        onHouse: { slotOffset0: -12, slotOffset1: 12, footInset: 0, aboveFoot: 0 }
      }
    };
  };

  var canvasRef = null;
  var ctx = null;

  var state = {
    layout: defaultLayout(),
    buildZone: { x: 32, y: 291, w: 479, h: 88 },
    baseDeckY: 392,
    sampleHouse: '1.webp',
    images: {},
    loadStatus: '加载中…',
    selected: 'boat',
    drag: null
  };

  var HOUSE_DEFS = [
    { file: '1.webp', w: 160, h: 96, stackSpan: -50 },
    { file: '8.webp', w: 224, h: 96, stackSpan: -60 }
  ];

  function $(id) { return document.getElementById(id); }

  function imgW(img) { return img ? (img.naturalWidth || img.width || 0) : 0; }
  function imgH(img) { return img ? (img.naturalHeight || img.height || 0) : 0; }
  function ready(img) { return img && imgW(img) > 0 && imgH(img) > 0; }

  function getBoatScale() {
    var boat = state.images.boat;
    if (!ready(boat)) return 0.44;
    var nw = imgW(boat);
    return nw > 256 ? BOAT_TARGET_W / nw : 0.44;
  }

  function getBoatBounds() {
    var boat = state.images.boat;
    var sc = getBoatScale();
    var w = ready(boat) ? imgW(boat) * sc : 614;
    var h = ready(boat) ? imgH(boat) * sc : 335;
    return {
      x: state.layout.boat.x,
      y: state.layout.boat.y,
      w: w,
      h: h
    };
  }

  function getRodPoints() {
    var b = getBoatBounds();
    var r = state.layout.rod;
    return {
      handleX: b.x + b.w - r.handleFromRight,
      handleY: b.y + r.handleFromTop,
      tipX: b.x + b.w - r.tipFromRight,
      tipY: b.y + r.tipFromTop
    };
  }

  function getFishmanDraw() {
    var img = state.images.fishman;
    var rod = getRodPoints();
    var fh = imgH(img) || 128;
    var sc = state.layout.fishman.scale;
    var dw = fh * sc;
    var dh = fh * sc;
    var fx = state.layout.fishman.anchorXRatio;
    return {
      x: rod.handleX + dw * fx,
      y: rod.handleY - dh + state.layout.fishman.anchorYOffset,
      w: dw,
      h: dh
    };
  }

  function getSampleHouseDef() {
    var i;
    for (i = 0; i < HOUSE_DEFS.length; i++) {
      if (HOUSE_DEFS[i].file === state.sampleHouse) return HOUSE_DEFS[i];
    }
    return HOUSE_DEFS[0];
  }

  function getSampleHousePlacement() {
    var def = getSampleHouseDef();
    var zone = state.buildZone;
    var deck = state.baseDeckY;
    var x = zone.x + Math.max(0, Math.floor((zone.w - def.w) / 2));
    return { def: def, x: x, y: deck - def.h, w: def.w, h: def.h, deckY: deck };
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function getBoatQueueBounds(boat) {
    var p = state.layout.people.onBoat;
    var halfW = 20;
    return {
      left: boat.x + (p.padLeft != null ? p.padLeft : 16),
      right: boat.x + boat.w - (p.padRight != null ? p.padRight : 28) - halfW,
      top: boat.y + (p.padTop != null ? p.padTop : 36),
      bottom: boat.y + boat.h - (p.padBottom != null ? p.padBottom : 12)
    };
  }

  function getBoatPeopleAnchor(index) {
    var boat = getBoatBounds();
    var p = state.layout.people.onBoat;
    var bounds = getBoatQueueBounds(boat);
    var stepX = Math.max(4, p.stepX || 10);
    var stackDy = p.stackDy != null ? p.stackDy : 8;
    var stackDx = p.stackDx != null ? p.stackDx : 3;
    var startX = clamp(boat.x + (p.offsetX || 0), bounds.left, bounds.right);
    var startY = clamp(boat.y + (p.offsetY || 0), bounds.top, bounds.bottom);
    var slots = Math.max(1, Math.floor((bounds.right - startX) / stepX) + 1);
    if (startX + (slots - 1) * stepX > bounds.right) {
      startX = bounds.left;
      slots = Math.max(1, Math.floor((bounds.right - bounds.left) / stepX) + 1);
    }
    var col = index % slots;
    var layer = Math.floor(index / slots);
    return {
      x: clamp(startX + col * stepX + layer * stackDx, bounds.left, bounds.right),
      y: clamp(startY - layer * stackDy - (col % (p.staggerEvery || 3)) * (p.staggerY || 0),
        bounds.top, bounds.bottom)
    };
  }

  function getHousePeopleAnchor(housePl, slotIndex) {
    var p = state.layout.people.onHouse;
    var cx = housePl.x + housePl.w / 2;
    var footY = housePl.y + housePl.h;
    var off = slotIndex === 0 ? p.slotOffset0 : p.slotOffset1;
    return {
      x: cx + off - p.footInset,
      y: footY - p.aboveFoot
    };
  }

  function loadImg(key, src, cb) {
    var img = new Image();
    img.onload = function () {
      state.images[key] = img;
      if (cb) cb();
    };
    img.onerror = function () {
      console.warn('scene calibrator: failed', src);
      if (cb) cb();
    };
    img.src = src;
  }

  function setInput(id, value) {
    var el = $(id);
    if (el) el.value = value;
  }

  function bindNum(id, applyFn) {
    var el = $(id);
    if (!el) return;
    el.addEventListener('input', function () {
      applyFn(parseFloat(el.value));
      render(canvasRef);
    });
  }

  function syncPanelFromState() {
    var L = state.layout;
    var b = getBoatBounds();
    var rod = getRodPoints();
    var fm = getFishmanDraw();
    setInput('inpBoatX', Math.round(L.boat.x));
    setInput('inpBoatY', Math.round(L.boat.y));
    setInput('inpRodHR', L.rod.handleFromRight);
    setInput('inpRodHT', L.rod.handleFromTop);
    setInput('inpRodTR', L.rod.tipFromRight);
    setInput('inpRodTT', L.rod.tipFromTop);
    setInput('inpFmScale', L.fishman.scale);
    setInput('inpFmAX', L.fishman.anchorXRatio);
    setInput('inpFmAY', L.fishman.anchorYOffset);
    setInput('inpBzX', state.buildZone.x);
    setInput('inpBzY', state.buildZone.y);
    setInput('inpBzW', state.buildZone.w);
    setInput('inpBzH', state.buildZone.h);
    setInput('inpBaseDeck', state.baseDeckY);
    var pb = L.people.onBoat;
    setInput('inpPbX', pb.offsetX);
    setInput('inpPbY', pb.offsetY);
    setInput('inpPbStep', pb.stepX);
    setInput('inpPh0', L.people.onHouse.slotOffset0);
    setInput('inpPh1', L.people.onHouse.slotOffset1);
    setInput('inpPhFoot', L.people.onHouse.aboveFoot);
    if ($('sceneHint')) {
      $('sceneHint').textContent =
        state.loadStatus + ' · 船 ' + Math.round(b.w) + '×' + Math.round(b.h) +
        ' · 握柄(' + Math.round(rod.handleX) + ',' + Math.round(rod.handleY) + ')';
    }
    updateExportPreview();
  }

  function buildExport() {
    return {
      gameLayout: state.layout,
      houseStack: {
        version: 1,
        baseDeckY: state.baseDeckY,
        buildZone: state.buildZone,
        houses: root.StackCalibratorExport
          ? root.StackCalibratorExport.getHouses()
          : {}
      },
      initialLayout: {
        version: 1,
        canvasW: CANVAS_W,
        canvasH: CANVAS_H,
        boatScale: getBoatScale(),
        boat: { x: state.layout.boat.x, y: state.layout.boat.y },
        buildZone: state.buildZone,
        sprites: []
      }
    };
  }

  function updateExportPreview() {
    var out = $('jsonOut');
    if (out) out.value = JSON.stringify(buildExport(), null, 2);
  }

  function drawSprite(img, x, y, w, h, alpha) {
    if (!ready(img)) return;
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }

  var PERSON_PREVIEW_SCALE = 0.32;

  function drawStrip(img, x, y, dw, dh) {
    if (!ready(img)) return;
    var fh = imgH(img);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, fh, fh, x, y, dw, dh);
  }

  function drawPersonAtFoot(img, footX, footY) {
    var fh = imgH(img) || 128;
    var dw = fh * PERSON_PREVIEW_SCALE;
    var dh = fh * PERSON_PREVIEW_SCALE;
    if (ready(img)) {
      drawStrip(img, footX - dw / 2, footY - dh, dw, dh);
    } else {
      drawPlaceholder(footX - dw / 2, footY - dh, dw, dh, '#e03030', '人');
    }
  }

  function drawPlaceholder(x, y, w, h, color, label) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    if (label) {
      ctx.font = '11px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 4, y + 14);
    }
  }

  function render(canvas) {
    var c = canvas || canvasRef;
    if (!c) return;
    ctx = c.getContext('2d');
    var boat = getBoatBounds();
    var rod = getRodPoints();
    var fm = getFishmanDraw();
    var house = getSampleHousePlacement();
    var zone = state.buildZone;

    ctx.fillStyle = '#5a8ab0';
    ctx.fillRect(0, 0, CANVAS_W, Math.floor(CANVAS_H * 0.76));
    ctx.fillStyle = '#2a6a9a';
    ctx.fillRect(0, Math.floor(CANVAS_H * 0.76), CANVAS_W, CANVAS_H);

    ctx.strokeStyle = 'rgba(180,80,255,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

    ctx.strokeStyle = 'rgba(255,220,80,0.7)';
    ctx.beginPath();
    ctx.moveTo(zone.x, state.baseDeckY);
    ctx.lineTo(zone.x + zone.w, state.baseDeckY);
    ctx.stroke();

    if (ready(state.images.boat)) {
      drawSprite(state.images.boat, boat.x, boat.y, boat.w, boat.h, 1);
    } else {
      drawPlaceholder(boat.x, boat.y, boat.w, boat.h, 'rgba(80,180,120,0.5)', '船(未加载)');
    }

    var hImg = state.images['house:' + house.def.file];
    if (ready(hImg)) {
      drawSprite(hImg, house.x, house.y, house.w, house.h, 1);
    } else {
      drawPlaceholder(house.x, house.y, house.w, house.h, 'rgba(160,100,200,0.45)', house.def.file);
    }

    var pImg = state.images.people1;
    var i;
    for (i = 0; i < 2; i++) {
      var hp = getHousePeopleAnchor(house, i);
      drawPersonAtFoot(pImg, hp.x, hp.y);
    }
    var waitN = Math.max(2, 6);
    for (i = 0; i < waitN; i++) {
      var bp = getBoatPeopleAnchor(i);
      drawPersonAtFoot(pImg, bp.x, bp.y);
    }

    ctx.strokeStyle = '#5c3d1e';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rod.handleX, rod.handleY);
    ctx.lineTo(rod.tipX, rod.tipY);
    ctx.stroke();

    if (ready(state.images.fishman)) {
      drawStrip(state.images.fishman, fm.x, fm.y, fm.w, fm.h);
    } else {
      drawPlaceholder(fm.x, fm.y, fm.w, fm.h, 'rgba(220,160,80,0.55)', '钓鱼人');
    }

    function mark(label, x, y, sel) {
      ctx.save();
      ctx.fillStyle = sel ? '#ffcc00' : 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(x, y, sel ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 8, y - 6);
      ctx.restore();
    }

    mark('船', boat.x + 20, boat.y + 20, state.selected === 'boat');
    mark('握柄', rod.handleX, rod.handleY, state.selected === 'rodHandle');
    mark('竿尖', rod.tipX, rod.tipY, state.selected === 'rodTip');
    mark('人', fm.x + fm.w / 2, fm.y + fm.h / 2, state.selected === 'fishman');
    mark('deck', zone.x + 40, state.baseDeckY, state.selected === 'deck');
    mark('房', house.x + house.w / 2, house.y + house.h / 2, state.selected === 'house');

    syncPanelFromState();
  }

  function hitTest(mx, my) {
    var fm = getFishmanDraw();
    var rod = getRodPoints();
    var boat = getBoatBounds();
    var house = getSampleHousePlacement();

    if (Math.hypot(mx - fm.x - fm.w / 2, my - fm.y - fm.h / 2) < 28) return 'fishman';
    if (Math.hypot(mx - rod.tipX, my - rod.tipY) < 14) return 'rodTip';
    if (Math.hypot(mx - rod.handleX, my - rod.handleY) < 14) return 'rodHandle';
    if (mx >= boat.x && mx <= boat.x + boat.w && my >= boat.y && my <= boat.y + boat.h) return 'boat';
    if (mx >= house.x && mx <= house.x + house.w && my >= house.y && my <= house.y + house.h) return 'house';
    if (Math.abs(my - state.baseDeckY) < 10 && mx >= state.buildZone.x && mx <= state.buildZone.x + state.buildZone.w) {
      return 'deck';
    }
    return null;
  }

  function onPointerDown(e, canvas) {
    var r = canvas.getBoundingClientRect();
    var mx = (e.clientX - r.left) * (canvas.width / r.width);
    var my = (e.clientY - r.top) * (canvas.height / r.height);
    var hit = hitTest(mx, my);
    if (!hit) return;
    state.selected = hit;
    state.drag = { kind: hit, startX: mx, startY: my, snapshot: JSON.parse(JSON.stringify(state.layout)) };
    state.drag.deck0 = state.baseDeckY;
    state.drag.boat0 = { x: state.layout.boat.x, y: state.layout.boat.y };
    state.drag.house0 = getSampleHousePlacement();
    canvas.classList.add('dragging');
    render(canvas);
  }

  function onPointerMove(e, canvas) {
    if (!state.drag) return;
    var r = canvas.getBoundingClientRect();
    var mx = (e.clientX - r.left) * (canvas.width / r.width);
    var my = (e.clientY - r.top) * (canvas.height / r.height);
    var dx = mx - state.drag.startX;
    var dy = my - state.drag.startY;
    var L = state.layout;
    var boat = getBoatBounds();

    if (state.drag.kind === 'boat') {
      L.boat.x = Math.round(state.drag.boat0.x + dx);
      L.boat.y = Math.round(state.drag.boat0.y + dy);
    } else if (state.drag.kind === 'fishman') {
      var rod = getRodPoints();
      var fh = imgH(state.images.fishman) || 128;
      var dw = fh * L.fishman.scale;
      var dh = fh * L.fishman.scale;
      L.fishman.anchorXRatio = Math.round(((mx - dw / 2) - rod.handleX) / dw * 100) / 100;
      L.fishman.anchorYOffset = Math.round(my + dh - rod.handleY);
    } else if (state.drag.kind === 'rodHandle') {
      L.rod.handleFromRight = Math.round(boat.x + boat.w - mx);
      L.rod.handleFromTop = Math.round(my - boat.y);
    } else if (state.drag.kind === 'rodTip') {
      L.rod.tipFromRight = Math.round(boat.x + boat.w - mx);
      L.rod.tipFromTop = Math.round(my - boat.y);
    } else if (state.drag.kind === 'deck') {
      state.baseDeckY = Math.round(state.drag.deck0 + dy);
    } else if (state.drag.kind === 'house') {
      state.baseDeckY = Math.round(state.drag.deck0 + dy);
      state.buildZone.x = Math.round(state.drag.house0.x - (state.drag.house0.x - state.buildZone.x) + dx);
    }
    render(canvas);
  }

  function onPointerUp(canvas) {
    state.drag = null;
    if (canvas) canvas.classList.remove('dragging');
  }

  function wirePanel() {
    bindNum('inpBoatX', function (v) { state.layout.boat.x = v; });
    bindNum('inpBoatY', function (v) { state.layout.boat.y = v; });
    bindNum('inpRodHR', function (v) { state.layout.rod.handleFromRight = v; });
    bindNum('inpRodHT', function (v) { state.layout.rod.handleFromTop = v; });
    bindNum('inpRodTR', function (v) { state.layout.rod.tipFromRight = v; });
    bindNum('inpRodTT', function (v) { state.layout.rod.tipFromTop = v; });
    bindNum('inpFmScale', function (v) { state.layout.fishman.scale = v; });
    bindNum('inpFmAX', function (v) { state.layout.fishman.anchorXRatio = v; });
    bindNum('inpFmAY', function (v) { state.layout.fishman.anchorYOffset = v; });
    bindNum('inpBzX', function (v) { state.buildZone.x = v; });
    bindNum('inpBzY', function (v) { state.buildZone.y = v; });
    bindNum('inpBzW', function (v) { state.buildZone.w = v; });
    bindNum('inpBzH', function (v) { state.buildZone.h = v; });
    bindNum('inpBaseDeck', function (v) { state.baseDeckY = v; });
    bindNum('inpPbX', function (v) { state.layout.people.onBoat.offsetX = v; });
    bindNum('inpPbY', function (v) { state.layout.people.onBoat.offsetY = v; });
    bindNum('inpPbStep', function (v) { state.layout.people.onBoat.stepX = v; });
    bindNum('inpPh0', function (v) { state.layout.people.onHouse.slotOffset0 = v; });
    bindNum('inpPh1', function (v) { state.layout.people.onHouse.slotOffset1 = v; });
    bindNum('inpPhFoot', function (v) { state.layout.people.onHouse.aboveFoot = v; });

    var sel = $('selSampleHouse');
    if (sel) {
      sel.addEventListener('change', function () {
        state.sampleHouse = sel.value;
        render(canvasRef);
      });
    }
  }

  function loadAll(done) {
    var pending = 3 + HOUSE_DEFS.length;
    var boatOk = false;
    function tick() {
      pending--;
      if (pending <= 0) {
        state.loadStatus = boatOk ? '素材已加载' : '船图未加载，请用本地服务器打开';
        done();
      }
    }
    loadImg('boat', 'assets/Boat.webp', function () {
      boatOk = ready(state.images.boat);
      tick();
    });
    loadImg('fishman', 'assets/fishman.webp', tick);
    loadImg('people1', 'assets/people1.webp', tick);
    HOUSE_DEFS.forEach(function (h) {
      loadImg('house:' + h.file, 'assets/Building/' + encodeURI(h.file), tick);
    });
    fetch('game-layout.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (data) state.layout = data;
    }).catch(function () {});
    fetch('house-stack.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data) return;
      if (data.baseDeckY != null) state.baseDeckY = data.baseDeckY;
      if (data.buildZone) state.buildZone = data.buildZone;
    }).catch(function () {});
  }

  function attachPointer(canvas) {
    if (!canvas || canvas._scenePointerAttached) return;
    canvas._scenePointerAttached = true;
    canvas.addEventListener('mousedown', function (e) {
      onPointerDown(e, canvas);
    });
    window.addEventListener('mousemove', function (e) {
      if (!state.drag) return;
      onPointerMove(e, canvas);
    });
    window.addEventListener('mouseup', function () {
      onPointerUp(canvas);
    });
  }

  function init(canvas) {
    canvasRef = canvas;
    wirePanel();
    attachPointer(canvas);
    syncPanelFromState();
    render(canvas);
    loadAll(function () {
      syncPanelFromState();
      render(canvas);
    });
    return {
      render: function () { render(canvasRef); },
      syncPanelFromState: syncPanelFromState,
      getBuildZone: function () { return state.buildZone; },
      getBaseDeckY: function () { return state.baseDeckY; },
      setBuildZone: function (z) {
        state.buildZone = z;
        syncPanelFromState();
      },
      setBaseDeckY: function (y) {
        state.baseDeckY = y;
        syncPanelFromState();
      },
      buildExport: buildExport,
      attachPointer: function () { attachPointer(canvasRef); }
    };
  }

  root.SceneLayoutCalibrator = {
    init: init,
    defaultLayout: defaultLayout,
    render: function () { render(canvasRef); },
    syncPanelFromState: syncPanelFromState
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
