(function (root) {
  'use strict';

  var CANVAS_W = 1024;
  var CANVAS_H = 576;
  var BUILD_ZONE = { x: 32, y: 291, w: 479, h: 88 };
  var BUILD_BASE = 'assets/Building/';

  var HOUSES = [
    { file: '1.webp', w: 160, h: 96 },
    { file: '2.webp', w: 160, h: 96 },
    { file: '3.webp', w: 128, h: 64 },
    { file: '4.webp', w: 128, h: 64 },
    { file: '5.webp', w: 128, h: 96 },
    { file: '6.webp', w: 96, h: 64 },
    { file: '7.webp', w: 128, h: 96 },
    { file: '8.webp', w: 224, h: 96 }
  ];

  var canvasEl = null;
  var canvas = null;
  var ctx = null;
  var images = {};
  var selected = 0;
  var upperPreview = 0;
  var viewMode = 'pair';
  var drag = null;

  function $(id) { return document.getElementById(id); }

  function getViewMode() {
    var el = document.querySelector('input[name="viewMode"]:checked');
    return el ? el.value : 'pair';
  }

  function defaultStackSpan(h) {
    return -h;
  }

  function initHouses() {
    HOUSES.forEach(function (h) {
      if (h.stackSpan == null) h.stackSpan = defaultStackSpan(h.h);
    });
  }

  function getBaseDeck() {
    return parseInt($('inpBaseDeck').value, 10) || BUILD_ZONE.y;
  }

  function houseX(w) {
    return BUILD_ZONE.x + Math.max(0, Math.floor((BUILD_ZONE.w - w) / 2));
  }

  function computeStackPlacements() {
    var deck = getBaseDeck();
    var list = [];
    var i;
    for (i = 0; i < HOUSES.length; i++) {
      var h = HOUSES[i];
      list.push({
        house: h,
        index: i,
        deckY: deck,
        x: houseX(h.w),
        y: deck - h.h,
        w: h.w,
        h: h.h,
        ghost: false
      });
      deck += h.stackSpan;
    }
    return list;
  }

  function getPairIndices() {
    selected = parseInt($('selLower').value, 10);
    if (isNaN(selected)) selected = 0;
    upperPreview = parseInt($('selUpper').value, 10);
    if (isNaN(upperPreview)) upperPreview = 0;
    return { lower: selected, upper: upperPreview };
  }

  /** 校准下层户型的 stackSpan：下层 + 半透明上层预览 */
  function computePairPlacements() {
    var idx = getPairIndices();
    var lower = HOUSES[idx.lower];
    var upper = HOUSES[idx.upper];
    var deck0 = getBaseDeck();
    var deck1 = deck0 + lower.stackSpan;
    return [
      {
        house: lower,
        index: idx.lower,
        role: 'lower',
        deckY: deck0,
        x: houseX(lower.w),
        y: deck0 - lower.h,
        w: lower.w,
        h: lower.h,
        ghost: false
      },
      {
        house: upper,
        index: idx.upper,
        role: 'upper',
        deckY: deck1,
        x: houseX(upper.w),
        y: deck1 - upper.h,
        w: upper.w,
        h: upper.h,
        ghost: true
      }
    ];
  }

  function computePlacements() {
    return getViewMode() === 'stack' ? computeStackPlacements() : computePairPlacements();
  }

  function buildExportJson() {
    var houses = {};
    HOUSES.forEach(function (h) {
      houses[h.file] = {
        w: h.w,
        h: h.h,
        stackSpan: h.stackSpan
      };
    });
    return {
      version: 1,
      baseDeckY: getBaseDeck(),
      buildZone: BUILD_ZONE,
      houses: houses
    };
  }

  function getHousesExport() {
    var houses = {};
    HOUSES.forEach(function (h) {
      houses[h.file] = { w: h.w, h: h.h, stackSpan: h.stackSpan };
    });
    return houses;
  }

  root.StackCalibratorExport = {
    getHouses: getHousesExport,
    getBuildZone: function () { return BUILD_ZONE; },
    getBaseDeckY: getBaseDeck,
    setBuildZone: function (z) {
      BUILD_ZONE.x = z.x;
      BUILD_ZONE.y = z.y;
      BUILD_ZONE.w = z.w;
      BUILD_ZONE.h = z.h;
    },
    setBaseDeckY: function (y) {
      $('inpBaseDeck').value = y;
    }
  };

  function updateJsonPreview() {
    if (getViewMode() === 'scene' && sceneApi && sceneApi.buildExport) {
      $('jsonOut').value = JSON.stringify(sceneApi.buildExport(), null, 2);
      return;
    }
    $('jsonOut').value = JSON.stringify(buildExportJson(), null, 2);
    var idx = getPairIndices();
    var lower = HOUSES[idx.lower];
    $('spanHint').textContent =
      '下层 ' + lower.file + ' 的 stackSpan = ' + lower.stackSpan +
      '（上一层 deck = 本层 deck ' + lower.stackSpan + '）';
  }

  function loadImage(file, cb) {
    var img = new Image();
    img.onload = function () {
      var nw = img.naturalWidth;
      var nh = img.naturalHeight;
      HOUSES.forEach(function (h) {
        if (h.file === file) {
          if (nw > 0) h.w = nw;
          if (nh > 0) h.h = nh;
        }
      });
      images[file] = img;
      if (cb) cb();
    };
    img.onerror = function () {
      console.warn('load failed', file);
      if (cb) cb();
    };
    img.src = BUILD_BASE + encodeURI(file);
  }

  function loadAllImages(done) {
    var pending = HOUSES.length;
    HOUSES.forEach(function (h) {
      loadImage(h.file, function () {
        pending--;
        if (pending <= 0) done();
      });
    });
  }

  function fillSelects() {
    var selLower = $('selLower');
    var selUpper = $('selUpper');
    selLower.innerHTML = '';
    selUpper.innerHTML = '';
    HOUSES.forEach(function (h, i) {
      var o1 = document.createElement('option');
      o1.value = String(i);
      o1.textContent = h.file;
      selLower.appendChild(o1);
      var o2 = document.createElement('option');
      o2.value = String(i);
      o2.textContent = h.file;
      selUpper.appendChild(o2);
    });
    selLower.value = String(selected);
    selUpper.value = String(upperPreview === selected ? (upperPreview + 1) % HOUSES.length : upperPreview);
  }

  function renderList() {
    var ul = $('houseList');
    ul.innerHTML = '';
    HOUSES.forEach(function (h, i) {
      var li = document.createElement('li');
      var idx = getPairIndices();
      if (getViewMode() === 'pair' && i === idx.lower) li.className = 'selected';
      if (getViewMode() === 'stack' && i === selected) li.className = 'selected';
      var thumb = images[h.file]
        ? '<img class="thumb" src="' + BUILD_BASE + encodeURI(h.file) + '" alt="">'
        : '';
      li.innerHTML =
        thumb + '<strong>' + h.file + '</strong> ' + h.w + '×' + h.h +
        '<label>stackSpan <input type="number" data-idx="' + i + '" class="inp-span" value="' +
        h.stackSpan + '" step="1"></label>';
      li.addEventListener('click', function (e) {
        if (e.target.classList.contains('inp-span')) return;
        if (getViewMode() === 'pair') {
          $('selLower').value = String(i);
        } else {
          selected = i;
        }
        renderList();
        render();
      });
      ul.appendChild(li);
    });
    ul.querySelectorAll('.inp-span').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var ix = parseInt(inp.getAttribute('data-idx'), 10);
        HOUSES[ix].stackSpan = parseInt(inp.value, 10) || defaultStackSpan(HOUSES[ix].h);
        updateJsonPreview();
        render();
      });
      inp.addEventListener('click', function (e) { e.stopPropagation(); });
    });
  }

  function drawHouse(p, highlight) {
    var img = images[p.house.file];
    ctx.save();
    if (p.ghost) ctx.globalAlpha = 0.55;
    if (highlight) {
      ctx.strokeStyle = p.ghost ? '#80d0ff' : '#ffcc00';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - 1, p.y - 1, p.w + 2, p.h + 2);
    }
    if (img) {
      ctx.drawImage(img, p.x, p.y, p.w, p.h);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.fillText(p.house.file, p.x + 4, p.y + 20);
    }
    ctx.restore();
  }

  var sceneApi = null;

  function render() {
    if (!canvasEl) return;
    ctx = canvasEl.getContext('2d');
    viewMode = getViewMode();
    $('stackPanel').hidden = viewMode === 'scene';
    $('scenePanel').hidden = viewMode !== 'scene';
    if (viewMode === 'scene') {
      if (sceneApi) sceneApi.render();
      else {
        ctx.fillStyle = '#5a8ab0';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        ctx.fillText('场景模块未加载', 24, 40);
      }
      return;
    }
    var placements = computePlacements();

    ctx.fillStyle = '#3a5a8a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(0, BUILD_ZONE.y + 40, CANVAS_W, CANVAS_H);

    ctx.strokeStyle = 'rgba(180, 80, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(BUILD_ZONE.x, BUILD_ZONE.y, BUILD_ZONE.w, BUILD_ZONE.h);

    placements.forEach(function (p) {
      ctx.strokeStyle = p.ghost ? 'rgba(120, 200, 255, 0.8)' : 'rgba(255, 220, 80, 0.6)';
      ctx.beginPath();
      ctx.moveTo(BUILD_ZONE.x, p.deckY);
      ctx.lineTo(BUILD_ZONE.x + BUILD_ZONE.w, p.deckY);
      ctx.stroke();
    });

    if (viewMode === 'pair') {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#cce';
      ctx.fillText('下层（实）', placements[0].x, placements[0].y - 6);
      ctx.fillText('上层预览（拖我）', placements[1].x, placements[1].y - 6);
    }

    ctx.imageSmoothingEnabled = false;
    placements.forEach(function (p, i) {
      var hi = viewMode === 'pair'
        ? (p.ghost || i === 0)
        : (i === selected);
      drawHouse(p, hi);
    });

    updateJsonPreview();
    renderList();
  }

  function hitTest(mx, my) {
    var placements = computePlacements();
    var i;
    for (i = placements.length - 1; i >= 0; i--) {
      var p = placements[i];
      if (mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h) return i;
    }
    return -1;
  }

  function canvasCoords(e) {
    var r = canvasEl.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height)
    };
  }

  function onPointerDown(e) {
    if (getViewMode() === 'scene') return;
    var c = canvasCoords(e);
    var idx = hitTest(c.x, c.y);
    if (idx < 0) return;
    viewMode = getViewMode();

    if (viewMode === 'pair') {
      var pair = getPairIndices();
      if (idx === 1) {
        drag = {
          mode: 'pairUpper',
          lowerIndex: pair.lower,
          startY: c.y,
          startSpan: HOUSES[pair.lower].stackSpan
        };
      } else if (idx === 0) {
        drag = { mode: 'base', startY: c.y, startDeck: getBaseDeck() };
      }
    } else {
      selected = idx;
      if (idx === 0) {
        drag = { mode: 'base', startY: c.y, startDeck: getBaseDeck() };
      } else {
        drag = {
          mode: 'span',
          belowIndex: idx - 1,
          startY: c.y,
          startBelowSpan: HOUSES[idx - 1].stackSpan
        };
      }
    }
    canvasEl.classList.add('dragging');
    render();
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (getViewMode() === 'scene' || !drag) return;
    var c = canvasCoords(e);
    var dy = c.y - drag.startY;
    if (drag.mode === 'base') {
      $('inpBaseDeck').value = Math.round(drag.startDeck + dy);
    } else if (drag.mode === 'pairUpper') {
      HOUSES[drag.lowerIndex].stackSpan = Math.round(drag.startSpan + dy);
      if (HOUSES[drag.lowerIndex].stackSpan > -4) HOUSES[drag.lowerIndex].stackSpan = -4;
    } else if (drag.mode === 'span') {
      HOUSES[drag.belowIndex].stackSpan = Math.round(drag.startBelowSpan + dy);
      if (HOUSES[drag.belowIndex].stackSpan > -4) HOUSES[drag.belowIndex].stackSpan = -4;
    }
    render();
  }

  function onPointerUp() {
    drag = null;
    if (canvasEl) canvasEl.classList.remove('dragging');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    $('jsonOut').select();
    document.execCommand('copy');
    return Promise.resolve();
  }

  function downloadJson(filename, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function boot() {
    canvasEl = $('stage');
    canvas = canvasEl;
    initHouses();
    fillSelects();
    if (root.SceneLayoutCalibrator) {
      sceneApi = root.SceneLayoutCalibrator.init(canvasEl);
      sceneApi.syncPanelFromState();
      sceneApi.render();
    }

    loadAllImages(function () {
      render();
    });

    document.querySelectorAll('input[name="viewMode"]').forEach(function (el) {
      el.addEventListener('change', function () {
        if (getViewMode() !== 'scene' && sceneApi) {
          BUILD_ZONE = sceneApi.getBuildZone();
          $('inpBaseDeck').value = sceneApi.getBaseDeckY();
        }
        render();
      });
    });
    $('selLower').addEventListener('change', render);
    $('selUpper').addEventListener('change', render);
    $('inpBaseDeck').addEventListener('input', function () {
      var v = parseInt($('inpBaseDeck').value, 10);
      if (sceneApi && getViewMode() === 'scene') sceneApi.setBaseDeckY(v);
      render();
    });
    $('btnResetSpans').addEventListener('click', function () {
      HOUSES.forEach(function (h) {
        h.stackSpan = defaultStackSpan(h.h);
      });
      render();
    });
    $('btnCopy').addEventListener('click', function () {
      copyText($('jsonOut').value).then(function () {
        alert('已复制到剪贴板');
      });
    });
    $('btnDlLayout').addEventListener('click', function () {
      var pack = sceneApi ? sceneApi.buildExport() : {};
      downloadJson('game-layout.json', pack.gameLayout || {});
    });
    $('btnDlStack').addEventListener('click', function () {
      var pack = sceneApi ? sceneApi.buildExport() : {};
      downloadJson('house-stack.json', pack.houseStack || buildExportJson());
    });
    $('btnDlInitial').addEventListener('click', function () {
      var pack = sceneApi ? sceneApi.buildExport() : {};
      downloadJson('initial-layout.json', pack.initialLayout || {});
    });

    canvasEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    fetch('house-stack.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.houses) return;
        if (data.baseDeckY != null) {
          $('inpBaseDeck').value = data.baseDeckY;
          if (sceneApi) sceneApi.setBaseDeckY(data.baseDeckY);
        }
        if (data.buildZone && sceneApi) sceneApi.setBuildZone(data.buildZone);
        HOUSES.forEach(function (h) {
          var entry = data.houses[h.file];
          if (!entry) return;
          if (entry.w) h.w = entry.w;
          if (entry.h) h.h = entry.h;
          if (entry.stackSpan != null) h.stackSpan = entry.stackSpan;
        });
        render();
      })
      .catch(function () { /* no saved file */ });
  }

  boot();
})(typeof globalThis !== 'undefined' ? globalThis : window);
