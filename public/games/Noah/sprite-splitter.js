(function () {
  'use strict';

  /** 本地雪碧图源图（体积大，默认不进 git；需自行放入 assets/Building/ 或用「选择图片」） */
  var DEFAULT_SHEET = 'assets/Building/Gemini_Generated_Image_jixn0njixn0njixn_doublebg.webp';
  var OUT_PREFIX = 'gemini';
  var SAVE_KEY = 'noah_sprite_splitter_v1';
  var SNAP = 8;
  var HANDLE = 8;

  var CAT_LABEL = {
    eave: '屋檐', door: '门', window: '窗', wall: '墙面', other: '其他'
  };

  var canvas, ctx, wrap, preview, pctx;
  var sourceImg = null;
  var sourceBitmap = null;
  var slices = [];
  var selectedId = null;
  var nextId = 1;
  var scale = 1;
  var offsetX = 0;
  var offsetY = 0;
  var tool = 'draw';
  var snapOn = true;
  var panning = false;
  var spaceHeld = false;
  var panStart = null;
  var drag = null;

  function $(id) { return document.getElementById(id); }

  function snap(v) {
    if (!snapOn) return Math.round(v);
    return Math.round(v / SNAP) * SNAP;
  }

  function getSlice(id) {
    for (var i = 0; i < slices.length; i++) {
      if (slices[i].id === id) return slices[i];
    }
    return null;
  }

  function pad() {
    return Math.max(0, parseInt($('inpPad').value, 10) || 0);
  }

  function autoName(cat) {
    var n = 1;
    var prefix = cat + '-';
    slices.forEach(function (s) {
      if (s.category === cat && s.name.indexOf(prefix) === 0) {
        var num = parseInt(s.name.slice(prefix.length), 10);
        if (!isNaN(num) && num >= n) n = num + 1;
      }
    });
    return prefix + String(n).padStart(2, '0');
  }

  function exportPath(sl) {
    return OUT_PREFIX + '/' + sl.category + '/' + sl.name + '.webp';
  }

  function getSourceSize() {
    if (sourceBitmap) return { w: sourceBitmap.width, h: sourceBitmap.height };
    if (sourceImg && sourceImg.naturalWidth) {
      return { w: sourceImg.naturalWidth, h: sourceImg.naturalHeight };
    }
    return { w: 0, h: 0 };
  }

  function releaseSourceBitmap() {
    if (sourceBitmap && sourceBitmap.close) {
      try { sourceBitmap.close(); } catch (e) { /* ignore */ }
    }
    sourceBitmap = null;
  }

  function cropRect(sl, withPad) {
    var size = getSourceSize();
    if (!size.w || !size.h) return null;
    var nw = size.w;
    var nh = size.h;
    var p = withPad ? pad() : 0;
    var x1 = Math.max(0, Math.floor(sl.x - p));
    var y1 = Math.max(0, Math.floor(sl.y - p));
    var x2 = Math.min(nw, Math.ceil(sl.x + sl.w + p));
    var y2 = Math.min(nh, Math.ceil(sl.y + sl.h + p));
    var w = x2 - x1;
    var h = y2 - y1;
    if (w < 1 || h < 1) return null;
    return { x: x1, y: y1, w: w, h: h };
  }

  function clampSliceToImage(sl) {
    var size = getSourceSize();
    if (!size.w) return sl;
    var nw = size.w;
    var nh = size.h;
    var x = Math.max(0, Math.min(sl.x, nw - 1));
    var y = Math.max(0, Math.min(sl.y, nh - 1));
    sl.x = snap(x);
    sl.y = snap(y);
    sl.w = Math.max(1, Math.min(sl.w, nw - sl.x));
    sl.h = Math.max(1, Math.min(sl.h, nh - sl.y));
    return sl;
  }

  function clampAllSlices() {
    slices.forEach(clampSliceToImage);
  }

  function describeSliceError(sl) {
    var c = cropRect(sl, true) || cropRect(sl, false);
    var iw = sourceImg ? sourceImg.naturalWidth : 0;
    var ih = sourceImg ? sourceImg.naturalHeight : 0;
    return sl.name + ' · 选区(' + Math.round(sl.x) + ',' + Math.round(sl.y) + ' ' +
      Math.round(sl.w) + '×' + Math.round(sl.h) + ') · 原图(' + iw + '×' + ih + ') · 裁剪=' +
      (c ? c.w + '×' + c.h : '无效');
  }

  function ensureSourceReady() {
    var size = getSourceSize();
    if (!sourceImg && !sourceBitmap) return '请先加载精灵图';
    if (sourceImg && !sourceImg.complete) return '图片仍在加载，请稍后再试';
    if (!size.w || !size.h) {
      return '图片尺寸无效：请用「选择图片」加载雪碧图，或将源图放到 assets/Building/ 后点「加载默认 Gemini 图」';
    }
    return null;
  }

  function screenToImage(sx, sy) {
    var r = canvas.getBoundingClientRect();
    var cx = (sx - r.left) * (canvas.width / r.width);
    var cy = (sy - r.top) * (canvas.height / r.height);
    return {
      x: (cx - offsetX) / scale,
      y: (cy - offsetY) / scale
    };
  }

  function imageToScreen(ix, iy) {
    return { x: offsetX + ix * scale, y: offsetY + iy * scale };
  }

  function resizeCanvas() {
    var r = wrap.getBoundingClientRect();
    canvas.width = Math.max(320, Math.floor(r.width));
    canvas.height = Math.max(240, Math.floor(r.height));
    render();
  }

  function fitToView() {
    if (!sourceImg) return;
    var iw = sourceImg.naturalWidth;
    var ih = sourceImg.naturalHeight;
    scale = Math.min(canvas.width / iw, canvas.height / ih) * 0.92;
    offsetX = (canvas.width - iw * scale) / 2;
    offsetY = (canvas.height - ih * scale) / 2;
    updateZoomLabel();
    render();
  }

  function updateZoomLabel() {
    $('zoomLabel').textContent = Math.round(scale * 100) + '%';
  }

  function setTool(t) {
    tool = t;
    document.querySelectorAll('[data-tool]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tool') === t);
    });
    wrap.classList.toggle('select-mode', t === 'select');
  }

  function select(id) {
    selectedId = id;
    syncPanel();
    renderList();
    render();
  }

  function syncPanel() {
    var sl = selectedId ? getSlice(selectedId) : null;
    var none = $('noSelection');
    var panel = $('selectionPanel');
    if (!sl) {
      none.hidden = false;
      panel.hidden = true;
      return;
    }
    none.hidden = true;
    panel.hidden = false;
    $('inpCategory').value = sl.category;
    $('inpName').value = sl.name;
    $('inpX').value = Math.round(sl.x);
    $('inpY').value = Math.round(sl.y);
    $('inpW').value = Math.round(sl.w);
    $('inpH').value = Math.round(sl.h);
    drawPreview(sl);
  }

  function applyPanel() {
    var sl = selectedId ? getSlice(selectedId) : null;
    if (!sl) return;
    sl.category = $('inpCategory').value;
    sl.name = ($('inpName').value || autoName(sl.category)).trim().replace(/\.webp$/i, '');
    sl.x = snap(parseFloat($('inpX').value) || 0);
    sl.y = snap(parseFloat($('inpY').value) || 0);
    sl.w = Math.max(1, parseFloat($('inpW').value) || 1);
    sl.h = Math.max(1, parseFloat($('inpH').value) || 1);
    updateManifestPreview();
    renderList();
    render();
    drawPreview(sl);
  }

  function drawPreview(sl) {
    if (!sourceImg || !sl) return;
    var c = cropRect(sl, true);
    if (!c.w || !c.h) return;
    var max = 112;
    var sc = Math.min(max / c.w, max / c.h, 4);
    preview.width = Math.max(1, Math.ceil(c.w * sc));
    preview.height = Math.max(1, Math.ceil(c.h * sc));
    pctx.imageSmoothingEnabled = false;
    pctx.clearRect(0, 0, preview.width, preview.height);
    pctx.drawImage(sourceImg, c.x, c.y, c.w, c.h, 0, 0, preview.width, preview.height);
  }

  function hitTestHandle(sl, ix, iy) {
    var r = cropRect(sl, false);
    var hx = r.x + r.w;
    var hy = r.y + r.h;
    var tol = HANDLE / scale;
    return Math.abs(ix - hx) <= tol && Math.abs(iy - hy) <= tol;
  }

  function hitTestSlice(ix, iy) {
    for (var i = slices.length - 1; i >= 0; i--) {
      var sl = slices[i];
      if (ix >= sl.x && ix <= sl.x + sl.w && iy >= sl.y && iy <= sl.y + sl.h) return sl;
    }
    return null;
  }

  function addSlice(x, y, w, h) {
    if (w < 4 || h < 4) return;
    var cat = $('inpCategory').value || 'other';
    var sl = {
      id: 'sl' + (nextId++),
      x: snap(Math.min(x, x + w)),
      y: snap(Math.min(y, y + h)),
      w: Math.max(4, snap(Math.abs(w))),
      h: Math.max(4, snap(Math.abs(h))),
      category: cat,
      name: autoName(cat)
    };
    slices.push(sl);
    select(sl.id);
    updateManifestPreview();
    saveLocal();
  }

  function deleteSelected() {
    if (!selectedId) return;
    slices = slices.filter(function (s) { return s.id !== selectedId; });
    selectedId = null;
    syncPanel();
    renderList();
    updateManifestPreview();
    render();
    saveLocal();
  }

  function duplicateSelected() {
    var sl = selectedId ? getSlice(selectedId) : null;
    if (!sl) return;
    var copy = {
      id: 'sl' + (nextId++),
      x: sl.x + 8,
      y: sl.y + 8,
      w: sl.w,
      h: sl.h,
      category: sl.category,
      name: autoName(sl.category)
    };
    slices.push(copy);
    select(copy.id);
    saveLocal();
  }

  function render() {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!sourceImg) {
      ctx.fillStyle = '#666';
      ctx.font = '14px monospace';
      ctx.fillText('请加载精灵图', 24, 40);
      return;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.drawImage(sourceImg, 0, 0);

    slices.forEach(function (sl) {
      var sel = sl.id === selectedId;
      ctx.strokeStyle = sel ? '#ffee44' : '#6ef';
      ctx.lineWidth = (sel ? 2 : 1) / scale;
      ctx.strokeRect(sl.x, sl.y, sl.w, sl.h);
      if (sel) {
        var r = cropRect(sl, false);
        ctx.fillStyle = '#ffee44';
        var hs = HANDLE / scale;
        ctx.fillRect(r.x + r.w - hs / 2, r.y + r.h - hs / 2, hs, hs);
      }
    });

    if (drag && drag.mode === 'draw' && drag.cur) {
      var x0 = Math.min(drag.start.x, drag.cur.x);
      var y0 = Math.min(drag.start.y, drag.cur.y);
      var w = Math.abs(drag.cur.x - drag.start.x);
      var h = Math.abs(drag.cur.y - drag.start.y);
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.9)';
      ctx.lineWidth = 1 / scale;
      ctx.setLineDash([4 / scale, 3 / scale]);
      ctx.strokeRect(x0, y0, w, h);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  function renderList() {
    var list = $('sliceList');
    $('sliceCount').textContent = String(slices.length);
    list.innerHTML = '';
    slices.forEach(function (sl) {
      var li = document.createElement('li');
      li.className = sl.id === selectedId ? 'selected' : '';
      var thumb = document.createElement('canvas');
      thumb.className = 'thumb';
      thumb.width = 36;
      thumb.height = 36;
      var tctx = thumb.getContext('2d');
      if (sourceImg) {
        var c = cropRect(sl, true);
        if (c.w && c.h) {
          var sc = Math.min(36 / c.w, 36 / c.h);
          tctx.imageSmoothingEnabled = false;
          tctx.drawImage(
            sourceImg, c.x, c.y, c.w, c.h,
            0, 0, c.w * sc, c.h * sc
          );
        }
      }
      var meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = '<div class="cat">' + CAT_LABEL[sl.category] + '</div><div class="name">' + sl.name + '</div>';
      li.appendChild(thumb);
      li.appendChild(meta);
      li.addEventListener('click', function () { select(sl.id); });
      list.appendChild(li);
    });
  }

  function buildManifest() {
    return slices.map(function (sl) {
      return { category: sl.category, file: exportPath(sl) };
    });
  }

  function buildCatalogJs() {
    var lines = slices.map(function (sl) {
      return "    { category: '" + sl.category + "', file: '" + exportPath(sl) + "' }";
    });
    return 'var GEMINI_CATALOG = [\n' + lines.join(',\n') + '\n];';
  }

  function buildProject() {
    return {
      version: 1,
      source: DEFAULT_SHEET,
      imageWidth: sourceImg ? sourceImg.naturalWidth : 0,
      imageHeight: sourceImg ? sourceImg.naturalHeight : 0,
      pad: pad(),
      slices: slices.map(function (sl) {
        return {
          x: Math.round(sl.x),
          y: Math.round(sl.y),
          w: Math.round(sl.w),
          h: Math.round(sl.h),
          category: sl.category,
          name: sl.name
        };
      })
    };
  }

  function updateManifestPreview() {
    $('jsonOut').value = JSON.stringify(buildManifest(), null, 2);
  }

  function loadSourceFromBlob(blob, cb) {
    releaseSourceBitmap();
    var bitmapPromise = (typeof createImageBitmap === 'function')
      ? createImageBitmap(blob).catch(function () { return null; })
      : Promise.resolve(null);

    bitmapPromise.then(function (bitmap) {
      sourceBitmap = bitmap;
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        function ready() {
          sourceImg = img;
          fitToView();
          clampAllSlices();
          renderList();
          updateManifestPreview();
          render();
          if (cb) cb();
        }
        if (img.decode) img.decode().then(ready).catch(ready);
        else ready();
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        var hint = blob.type && blob.type.indexOf('image/') !== 0
          ? '（返回内容不是图片，可能是 404 页面）'
          : '';
        alert('无法解码图片' + hint + '\n请用「选择图片」选择本地雪碧图。');
      };
      img.src = url;
    });
  }

  function isImageBlob(blob) {
    if (!blob || !blob.size) return false;
    if (blob.type && blob.type.indexOf('image/') === 0) return true;
    return blob.size > 256;
  }

  function loadImage(src, cb) {
    fetch(src)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.blob().then(function (blob) {
          if (!isImageBlob(blob)) {
            throw new Error('响应不是有效图片（' + (blob.type || 'unknown') + '，' + blob.size + ' 字节）');
          }
          return blob;
        });
      })
      .then(function (blob) {
        loadSourceFromBlob(blob, cb);
      })
      .catch(function (err) {
        var msg = '无法加载：' + src;
        if (src === DEFAULT_SHEET) {
          msg += '\n\n仓库未包含默认雪碧图源文件。请：\n1. 点击「选择图片」从本机选图；或\n2. 将 Gemini 雪碧图放到\n   public/games/Noah/' + DEFAULT_SHEET;
        }
        msg += '\n\n请通过 http://localhost 打开本页（不要用 file://）。';
        if (err && err.message) msg += '\n' + err.message;
        alert(msg);
        setCanvasHint(msg.split('\n')[0]);
      });
  }

  function setCanvasHint(text) {
    var el = $('canvasHint');
    if (el) el.textContent = text;
  }

  function importProject(data) {
    if (!data.slices || !Array.isArray(data.slices)) throw new Error('无效工程');
    slices = data.slices.map(function (s) {
      return {
        id: 'sl' + (nextId++),
        x: s.x,
        y: s.y,
        w: s.w,
        h: s.h,
        category: s.category || 'other',
        name: s.name || autoName(s.category || 'other')
      };
    });
    if (data.pad != null) $('inpPad').value = data.pad;
    if (sourceImg && sourceImg.naturalWidth) clampAllSlices();
    selectedId = null;
    syncPanel();
    renderList();
    updateManifestPreview();
    render();
  }

  function saveLocal() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(buildProject()));
    } catch (e) { /* ignore */ }
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) importProject(JSON.parse(raw));
    } catch (e) { /* ignore */ }
  }

  function setExportStatus(msg) {
    var el = $('exportStatus');
    if (el) el.textContent = msg || '';
  }

  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(',');
    var mimeMatch = parts[0].match(/:(.*?);/);
    var mime = mimeMatch ? mimeMatch[1] : 'image/png';
    var bin = atob(parts[1]);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function pngFromCanvas(canvas) {
    try {
      return { blob: dataUrlToBlob(canvas.toDataURL('image/png')), ext: 'png' };
    } catch (e) {
      return null;
    }
  }

  function cropSliceCanvas(sl) {
    var c = cropRect(sl, true);
    if (!c) c = cropRect(sl, false);
    if (!c) return null;
    var off = document.createElement('canvas');
    off.width = c.w;
    off.height = c.h;
    var octx = off.getContext('2d');
    if (!octx) return null;
    octx.imageSmoothingEnabled = false;
    try {
      octx.drawImage(sourceImg, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
    } catch (err) {
      return null;
    }
    return off;
  }

  function canvasToBlobPromise(canvas) {
    return new Promise(function (resolve) {
      if (!canvas || canvas.width < 1 || canvas.height < 1) {
        resolve(null);
        return;
      }
      if (!canvas.toBlob) {
        resolve(pngFromCanvas(canvas));
        return;
      }
      canvas.toBlob(function (pngBlob) {
        if (pngBlob) resolve({ blob: pngBlob, ext: 'png' });
        else resolve(pngFromCanvas(canvas));
      }, 'image/png');
    });
  }

  function bitmapToExportCanvas(bitmap) {
    var off = document.createElement('canvas');
    off.width = bitmap.width;
    off.height = bitmap.height;
    var octx = off.getContext('2d');
    if (!octx) return null;
    octx.imageSmoothingEnabled = false;
    octx.drawImage(bitmap, 0, 0);
    return off;
  }

  function cropSliceBlob(sl) {
    var c = cropRect(sl, true) || cropRect(sl, false);
    if (!c) return Promise.resolve(null);

    if (sourceBitmap && typeof createImageBitmap === 'function') {
      return createImageBitmap(sourceBitmap, c.x, c.y, c.w, c.h)
        .then(function (bmp) {
          var off = bitmapToExportCanvas(bmp);
          if (bmp.close) bmp.close();
          if (!off) return null;
          return canvasToBlobPromise(off);
        })
        .catch(function () {
          var off = cropSliceCanvas(sl);
          return off ? canvasToBlobPromise(off) : null;
        });
    }

    var off = cropSliceCanvas(sl);
    return off ? canvasToBlobPromise(off) : Promise.resolve(null);
  }

  function downloadBlob(blob, filename) {
    if (!blob) return false;
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    return true;
  }

  function exportAsZip() {
    return new Promise(function (resolve, reject) {
      if (typeof JSZip === 'undefined') {
        reject(new Error('JSZip 未加载（需联网或本地服务器打开本页，不能用 file://）'));
        return;
      }
      var zip = new JSZip();
      var root = zip.folder('gemini');
      var idx = 0;
      var pngCount = 0;
      var manifestOut = [];

      function step() {
        if (idx >= slices.length) {
          setExportStatus('压缩 ZIP…');
          root.file('manifest.json', JSON.stringify(manifestOut, null, 2));
          zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
            .then(function (zipBlob) {
              if (!downloadBlob(zipBlob, 'gemini-building-sprites.zip')) {
                reject(new Error('浏览器阻止了下载'));
                return;
              }
              var msg = '已下载 gemini-building-sprites.zip\n解压到 public/games/Noah/assets/Building/\nmanifest 扩展名已与 ZIP 内文件一致。';
              if (pngCount > 0) {
                msg += '\n\n（' + pngCount + ' 张为 .png：Safari 等浏览器无法从画布编码 WebP，可用 squoosh 等工具批量转 webp）';
              }
              alert(msg);
              resolve();
            })
            .catch(reject);
          return;
        }
        var sl = slices[idx];
        setExportStatus('打包 ' + (idx + 1) + '/' + slices.length);
        cropSliceBlob(sl).then(function (result) {
          if (!result || !result.blob) {
            reject(new Error('无法导出「' + describeSliceError(sl) + '」'));
            return;
          }
          if (result.ext === 'png') pngCount++;
          var catFolder = root.folder(sl.category);
          var rel = OUT_PREFIX + '/' + sl.category + '/' + sl.name + '.' + result.ext;
          catFolder.file(sl.name + '.' + result.ext, result.blob);
          manifestOut.push({ category: sl.category, file: rel });
          idx++;
          setTimeout(step, 0);
        }).catch(reject);
      }
      step();
    });
  }

  function exportSequentialDownloads() {
    return new Promise(function (resolve, reject) {
      var idx = 0;
      var ok = 0;
      function step() {
        if (idx >= slices.length) {
          alert('已下载 ' + ok + '/' + slices.length + ' 个文件。\n若数量为 0，请在浏览器设置中允许本页「自动下载多个文件」。');
          resolve();
          return;
        }
        var sl = slices[idx];
        setExportStatus('下载 ' + (idx + 1) + '/' + slices.length);
        cropSliceBlob(sl).then(function (result) {
          if (!result || !result.blob) {
            reject(new Error('无法导出「' + sl.name + '」'));
            return;
          }
          if (downloadBlob(result.blob, sl.name + '.' + result.ext)) ok++;
          idx++;
          setTimeout(step, 400);
        }).catch(reject);
      }
      step();
    });
  }

  function exportAllWebp() {
    var readyErr = ensureSourceReady();
    if (readyErr) {
      alert(readyErr);
      return;
    }
    if (!slices.length) {
      alert('还没有任何选区');
      return;
    }
    clampAllSlices();
    updateManifestPreview();
    saveLocal();
    var btn = $('btnExportWebp');
    btn.disabled = true;
    setExportStatus('开始…');
    var work = typeof JSZip !== 'undefined' ? exportAsZip() : exportSequentialDownloads();
    work.catch(function (err) {
      alert('导出失败：' + (err && err.message ? err.message : String(err)));
    }).then(function () {
      btn.disabled = false;
      setExportStatus('');
    });
  }

  function copyText(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { alert(msg); });
    } else {
      prompt('复制以下内容：', text);
    }
  }

  function onPointerDown(e) {
    if (!sourceImg) return;
    if (e.button === 1 || (e.button === 0 && (e.altKey || spaceHeld))) {
      panning = true;
      panStart = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
      wrap.classList.add('panning');
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    var p = screenToImage(e.clientX, e.clientY);

    if (tool === 'select') {
      var sl = hitTestSlice(p.x, p.y);
      if (sl) {
        select(sl.id);
        if (hitTestHandle(sl, p.x, p.y)) {
          drag = { mode: 'resize', id: sl.id, start: p, ow: sl.w, oh: sl.h, ox: sl.x, oy: sl.y };
        } else {
          drag = { mode: 'move', id: sl.id, offX: p.x - sl.x, offY: p.y - sl.y };
        }
      } else {
        clearSelection();
      }
      render();
      return;
    }

    var hit = hitTestSlice(p.x, p.y);
    if (hit) {
      select(hit.id);
      if (hitTestHandle(hit, p.x, p.y)) {
        drag = { mode: 'resize', id: hit.id, start: p, ow: hit.w, oh: hit.h, ox: hit.x, oy: hit.y };
      } else {
        drag = { mode: 'move', id: hit.id, offX: p.x - hit.x, offY: p.y - hit.y };
      }
    } else {
      clearSelection();
      drag = { mode: 'draw', start: p, cur: p };
    }
    render();
  }

  function clearSelection() {
    selectedId = null;
    syncPanel();
    renderList();
    render();
  }

  function onPointerMove(e) {
    if (panning && panStart) {
      offsetX = panStart.ox + (e.clientX - panStart.x);
      offsetY = panStart.oy + (e.clientY - panStart.y);
      render();
      return;
    }
    if (!drag) return;
    var p = screenToImage(e.clientX, e.clientY);
    if (drag.mode === 'draw') {
      drag.cur = p;
      render();
      return;
    }
    var sl = getSlice(drag.id);
    if (!sl) return;
    if (drag.mode === 'move') {
      sl.x = snap(p.x - drag.offX);
      sl.y = snap(p.y - drag.offY);
    } else if (drag.mode === 'resize') {
      sl.w = Math.max(4, snap(p.x - sl.x));
      sl.h = Math.max(4, snap(p.y - sl.y));
    }
    syncPanel();
    render();
  }

  function onPointerUp(e) {
    if (panning) {
      panning = false;
      panStart = null;
      wrap.classList.remove('panning');
      return;
    }
    if (!drag) return;
    if (drag.mode === 'draw' && drag.cur) {
      var x0 = drag.start.x;
      var y0 = drag.start.y;
      var w = drag.cur.x - drag.start.x;
      var h = drag.cur.y - drag.start.y;
      addSlice(x0, y0, w, h);
    } else if (drag.mode === 'move' || drag.mode === 'resize') {
      updateManifestPreview();
      saveLocal();
    }
    drag = null;
    render();
  }

  function nudgeSelected(dx, dy) {
    var sl = selectedId ? getSlice(selectedId) : null;
    if (!sl) return;
    sl.x = snap(sl.x + dx);
    sl.y = snap(sl.y + dy);
    syncPanel();
    updateManifestPreview();
    render();
    saveLocal();
  }

  function boot() {
    canvas = $('stage');
    ctx = canvas.getContext('2d');
    wrap = $('canvasWrap');
    preview = $('preview');
    pctx = preview.getContext('2d');

    window.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var factor = e.deltaY > 0 ? 0.92 : 1.08;
      var before = screenToImage(e.clientX, e.clientY);
      scale = Math.max(0.05, Math.min(8, scale * factor));
      var after = screenToImage(e.clientX, e.clientY);
      offsetX += (after.x - before.x) * scale;
      offsetY += (after.y - before.y) * scale;
      updateZoomLabel();
      render();
    }, { passive: false });

    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    $('fileInput').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type || file.type.indexOf('image/') !== 0) {
        alert('请选择图片文件（png / jpg / webp 等）');
        return;
      }
      loadSourceFromBlob(file, function () {
        setCanvasHint('已加载：' + file.name + ' · 拖拽框选 · 滚轮缩放');
      });
    });

    $('btnDefaultSheet').addEventListener('click', function () {
      loadImage(DEFAULT_SHEET, loadLocal);
    });

    document.querySelectorAll('[data-tool]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setTool(btn.getAttribute('data-tool'));
      });
    });

    $('btnFit').addEventListener('click', fitToView);
    $('btnZoomIn').addEventListener('click', function () {
      scale = Math.min(8, scale * 1.15);
      updateZoomLabel();
      render();
    });
    $('btnZoomOut').addEventListener('click', function () {
      scale = Math.max(0.05, scale / 1.15);
      updateZoomLabel();
      render();
    });

    $('chkSnap').addEventListener('change', function (e) {
      snapOn = e.target.checked;
    });

    ['inpCategory', 'inpName', 'inpX', 'inpY', 'inpW', 'inpH'].forEach(function (id) {
      $(id).addEventListener('change', applyPanel);
      $(id).addEventListener('input', applyPanel);
    });

    $('btnDel').addEventListener('click', deleteSelected);
    $('btnDup').addEventListener('click', duplicateSelected);

    $('btnExportWebp').addEventListener('click', exportAllWebp);
    $('btnCopyManifest').addEventListener('click', function () {
      updateManifestPreview();
      copyText($('jsonOut').value, 'manifest 已复制');
    });
    $('btnCopyCatalog').addEventListener('click', function () {
      copyText(buildCatalogJs(), 'GEMINI_CATALOG 已复制，可粘贴到 scripts/houses-asset-catalog.json');
    });

    $('btnSaveProject').addEventListener('click', function () {
      saveLocal();
      copyText(JSON.stringify(buildProject(), null, 2), '工程 JSON 已复制（并已存浏览器）');
    });

    $('btnLoadProject').addEventListener('click', function () {
      var text = prompt('粘贴工程 JSON：');
      if (!text) return;
      try {
        importProject(JSON.parse(text));
        saveLocal();
      } catch (err) {
        alert('导入失败：' + err.message);
      }
    });

    window.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'd' || e.key === 'D') setTool('draw');
      if (e.key === 'v' || e.key === 'V') setTool('select');
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
        e.preventDefault();
      }
      var step = e.shiftKey ? 8 : 1;
      if (e.key === 'ArrowLeft') { nudgeSelected(-step, 0); e.preventDefault(); }
      if (e.key === 'ArrowRight') { nudgeSelected(step, 0); e.preventDefault(); }
      if (e.key === 'ArrowUp') { nudgeSelected(0, -step); e.preventDefault(); }
      if (e.key === 'ArrowDown') { nudgeSelected(0, step); e.preventDefault(); }
      if (e.key === ' ') {
        spaceHeld = true;
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', function (e) {
      if (e.key === ' ') {
        spaceHeld = false;
        if (!panStart) wrap.classList.remove('panning');
      }
    });

    resizeCanvas();
    setTool('draw');
    setCanvasHint('请点击「选择图片」加载雪碧图（默认 Gemini 源图未随仓库发布）');
    try {
      var saved = localStorage.getItem('noah_sprite_splitter_v1');
      if (saved) loadLocal();
    } catch (e) { /* ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
