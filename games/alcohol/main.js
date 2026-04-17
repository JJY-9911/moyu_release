(function () {
  'use strict';

  // ========== 图片缓存辅助 ==========
  // 预加载器通过 fetch+blob 下载完整图片数据，存入 window.__imageCache
  // 这里所有 img.src 赋值都走缓存，确保使用已完整下载的 blob URL
  const imgCache = window.__imageCache || {};
  function cachedSrc(src) { return imgCache[src] || src; }

  // ========== 数据定义 ==========
  const GLASS_TYPES = {
    collins:      { name: '柯林杯',   img: 'assets/collins-glass.webp',   size: '1x2', count: 3 },
    oldFashioned: { name: '古典杯',   img: 'assets/whiskey-glass.webp',   size: '1x1', count: 4 },
    martini:      { name: '马天尼杯', img: 'assets/martini-glass.webp',   size: '1x2', count: 2 },
    margarita:    { name: '玛格丽特杯', img: 'assets/margaret-glass.webp', size: '1x2', count: 2 },
    champagne:    { name: '香槟杯',   img: 'assets/champagne-glass.webp', size: '1x2', count: 1 }
  };

  const SPIRITS = {
    gin:            { name: '金酒',   img: 'assets/wine/gin.webp',       size: '1x2' },
    vodka:          { name: '伏特加', img: 'assets/wine/vodka.webp',     size: '1x2' },
    tequila:        { name: '龙舌兰', img: 'assets/wine/Tequila.webp',   size: '1x2' },
    rum:            { name: '白朗姆', img: 'assets/wine/rum.webp',       size: '1x2' },
    champagneWine:  { name: '香槟',   img: 'assets/wine/champagne.webp', size: '1x2' }
  };

  const MIXERS = {
    coffeeLiqueur: { name: '咖啡利口酒', img: 'assets/wine/coffee.webp',          size: '1x2' },
    dryVermouth:   { name: '干味美思',   img: 'assets/wine/vermouth.webp',        size: '1x2' },
    sweetVermouth: { name: '甜红味美思', img: 'assets/wine/red-vermouth.webp',    size: '1x2' },
    lemonJuice:    { name: '柠檬汁',     img: 'assets/wine/lemon.webp',           size: '1x1' },
    orangeJuice:   { name: '橙汁',       img: 'assets/wine/juice.webp',           size: '1x1' },
    coconutMilk:   { name: '椰奶',       img: 'assets/wine/milk.webp',            size: '1x1' },
    tonicWater:    { name: '汤力水',     img: 'assets/wine/tonic.webp',           size: '1x1' },
    sodaWater:     { name: '苏打水',     img: 'assets/wine/soda.webp',            size: '1x1' },
    grenadine:     { name: '石榴糖浆',   img: 'assets/wine/Grenadine-Syrup.webp', size: '1x1' },
    cherryBrandy:  { name: '樱桃白兰地', img: 'assets/wine/brandy.webp',          size: '2x2' }
  };

  class Cocktail {
    constructor(id, name, glass, ingredients, method, steps) {
      this.id = id;
      this.name = name;
      this.glass = glass;
      this.ingredients = ingredients;
      this.method = method;
      this.steps = steps;
    }
  }

  const COCKTAILS = [
    new Cocktail('ginTonic', '金汤力', 'collins',
      ['gin', 'tonicWater', 'lemonJuice'], 'stir',
      '柯林杯加冰→倒入金酒→加汤力水→加柠檬汁→搅匀'),
    new Cocktail('dryMartini', '干马天尼', 'martini',
      ['gin', 'dryVermouth'], 'shake',
      '雪克壶加冰→倒入金酒和干味美思→摇匀→倒入马天尼杯'),
    new Cocktail('singaporeSling', '新加坡司令', 'collins',
      ['gin', 'cherryBrandy', 'lemonJuice', 'sodaWater'], 'stir',
      '柯林杯加冰→依次倒入金酒、樱桃白兰地、柠檬汁、苏打水→搅匀'),
    new Cocktail('negroni', '内格罗尼', 'oldFashioned',
      ['gin', 'sweetVermouth'], 'stir',
      '古典杯加冰→倒入金酒和甜红味美思→吧勺搅匀'),
    new Cocktail('screwdriver', '螺丝起子', 'collins',
      ['vodka', 'orangeJuice'], 'stir',
      '柯林杯加冰→倒入伏特加→加橙汁→吧勺搅匀'),
    new Cocktail('blackRussian', '黑俄罗斯', 'oldFashioned',
      ['vodka', 'coffeeLiqueur'], 'stir',
      '古典杯加冰→倒入伏特加和咖啡利口酒→搅匀'),
    new Cocktail('whiteRussian', '白俄罗斯', 'oldFashioned',
      ['vodka', 'coffeeLiqueur', 'coconutMilk'], 'stir',
      '古典杯加冰→倒入伏特加和咖啡利口酒→吧勺搅匀→倒入椰奶'),
    new Cocktail('daiquiri', '黛克瑞', 'oldFashioned',
      ['rum', 'lemonJuice'], 'shake',
      '古典杯加冰→雪克壶加冰，倒入白朗姆和柠檬汁→摇匀→倒入古典杯'),
    new Cocktail('pinaColada', '皮纳科拉达', 'collins',
      ['rum', 'coconutMilk'], 'shake',
      '雪克壶加冰→倒入白朗姆和椰奶→疯狂摇匀→倒入柯林杯'),
    new Cocktail('tequilaSunrise', '龙舌兰日出', 'collins',
      ['tequila', 'orangeJuice', 'grenadine'], 'stir',
      '柯林杯加冰→倒入龙舌兰和橙汁→吧勺搅匀→淋入石榴糖浆'),
    new Cocktail('champagneCocktail', '香槟鸡尾酒', 'champagne',
      ['champagneWine', 'coffeeLiqueur'], 'stir',
      '香槟杯倒入咖啡利口酒→倒入香槟→吧勺搅匀')
  ];

  // ========== 游戏状态 ==========
  const state = {
    editMode: false,
    dragging: null,
    cabinetItems: [],
    barItems: [],
    shaker: { contents: [], hasIce: false, shaken: false },
    clampHasIce: false,
    spoonActive: false,
    orders: [],
    orderIdCounter: 0,
    dirtyGlasses: [],
    tutorial: { step: 0, active: true },
    orderTimer: null,
    spoonShakeCount: 0, spoonLastX: 0, spoonDirection: 0,
    shakerShakeCount: 0, shakerLastX: 0, shakerDirection: 0,
    phase: 'tutorial',
    tutorialDrinkMade: false,
    nextItemId: 1
  };

  function genId() { return state.nextItemId++; }

  // ========== DOM ==========
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const messageList   = $('#messageList');
  const cabinetGrid   = $('#cabinetGrid');
  const barCounter    = $('#barCounter');
  const floatingItem  = $('#floatingItem');
  const floatingImg   = $('#floatingImg');
  const shakerIndicator = $('#shakerIndicator');
  const shakerContents  = $('#shakerContents');
  const orderBadge    = $('#orderBadge');
  const orderModal    = $('#orderModal');
  const orderList     = $('#orderList');
  const handbookModal = $('#handbookModal');
  const handbookList  = $('#handbookList');
  const recipeModal   = $('#recipeModal');
  const recipeList    = $('#recipeList');
  const sinkBadges    = $('#sinkBadges');
  const glassTooltip  = $('#glassTooltip');

  // ========== 消息系统 ==========
  function showMessage(text, highlight) {
    const div = document.createElement('div');
    div.className = 'message-item' + (highlight ? ' highlight' : '');
    div.textContent = text;
    messageList.appendChild(div);
    messageList.scrollTop = messageList.scrollHeight;
    // 最多保留30条
    while (messageList.children.length > 30) {
      messageList.removeChild(messageList.firstChild);
    }
  }

  // ========== 酒柜网格 ==========
  let GRID_COLS = 12;
  let GRID_ROWS = 8;
  const GRID_GAP = 3;
  const GRID_PAD = 4;

  function calcGridSize() {
    const rect = cabinetGrid.getBoundingClientRect();
    const availW = rect.width - GRID_PAD * 2;
    const availH = rect.height - GRID_PAD * 2;
    // 目标：至少 12 列，cell 尽量大但不超过 52px
    const maxCell = 52;
    let cell = Math.floor((availW - GRID_GAP) / GRID_COLS) - GRID_GAP;
    if (cell > maxCell) cell = maxCell;
    if (cell < 20) cell = 20;
    const cols = Math.floor((availW + GRID_GAP) / (cell + GRID_GAP));
    const rows = Math.floor((availH + GRID_GAP) / (cell + GRID_GAP));
    GRID_COLS = Math.max(cols, 6);
    GRID_ROWS = Math.max(rows, 4);
    return cell;
  }

  // ========== 酒柜初始化 ==========
  function initCabinet() {
    const items = [];

    // 酒
    Object.entries(SPIRITS).forEach(([key, d]) => {
      items.push({ id: genId(), key, type: 'spirit', name: d.name, img: d.img, size: d.size });
    });
    // 配料
    Object.entries(MIXERS).forEach(([key, d]) => {
      items.push({ id: genId(), key, type: 'mixer', name: d.name, img: d.img, size: d.size });
    });
    // 杯子（每个独立）
    Object.entries(GLASS_TYPES).forEach(([key, d]) => {
      for (let i = 0; i < d.count; i++) {
        items.push({ id: genId(), key, type: 'glass', name: d.name, img: d.img, size: d.size, instanceId: key + '_' + i });
      }
    });

    shuffle(items);

    // 先计算网格尺寸
    calcGridSize();

    // 初始化网格占用表
    state.grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));

    // 按顺序放置每个物品到网格中第一个可用位置
    items.forEach(item => {
      const dim = parseDim(item.size);
      const pos = findFreePos(dim.w, dim.h);
      if (pos) {
        item.gridCol = pos.col;
        item.gridRow = pos.row;
        occupyGrid(pos.col, pos.row, dim.w, dim.h, item.id);
      }
    });

    state.cabinetItems = items;
    renderCabinet();
  }

  function parseDim(size) {
    // size: '1x1' -> {w:1,h:1}, '1x2' -> {w:1,h:2}, '2x2' -> {w:2,h:2}
    const parts = size.split('x');
    return { w: parseInt(parts[0]), h: parseInt(parts[1]) };
  }

  function findFreePos(w, h) {
    for (let r = 0; r <= GRID_ROWS - h; r++) {
      for (let c = 0; c <= GRID_COLS - w; c++) {
        if (canPlace(c, r, w, h)) return { col: c, row: r };
      }
    }
    return null;
  }

  function canPlace(col, row, w, h, ignoreId) {
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        if (r >= GRID_ROWS || c >= GRID_COLS) return false;
        if (state.grid[r][c] !== null && state.grid[r][c] !== ignoreId) return false;
      }
    }
    return true;
  }

  function occupyGrid(col, row, w, h, id) {
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        state.grid[r][c] = id;
      }
    }
  }

  function clearGridFor(id) {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (state.grid[r][c] === id) state.grid[r][c] = null;
      }
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function renderCabinet() {
    cabinetGrid.innerHTML = '';
    const CELL = calcGridSize();
    cabinetGrid.style.position = 'relative';
    cabinetGrid.style.width = '100%';
    cabinetGrid.style.height = '100%';
    cabinetGrid.style.display = 'block';

    // 画空格背景
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const bg = document.createElement('div');
        bg.className = 'grid-bg-cell';
        bg.style.position = 'absolute';
        bg.style.left = (GRID_PAD + c * (CELL + GRID_GAP)) + 'px';
        bg.style.top = (GRID_PAD + r * (CELL + GRID_GAP)) + 'px';
        bg.style.width = CELL + 'px';
        bg.style.height = CELL + 'px';
        bg.dataset.gridCol = c;
        bg.dataset.gridRow = r;
        bg.addEventListener('click', () => onEmptyCellClick(c, r));
        cabinetGrid.appendChild(bg);
      }
    }

    // 画物品
    state.cabinetItems.forEach(item => {
      if (item.gridCol === undefined) return;
      // 超出新网格范围的物品需要重新放置
      const dim = parseDim(item.size);
      if (item.gridCol + dim.w > GRID_COLS || item.gridRow + dim.h > GRID_ROWS) {
        clearGridFor(item.id);
        const pos = findFreePos(dim.w, dim.h);
        if (pos) {
          item.gridCol = pos.col;
          item.gridRow = pos.row;
          occupyGrid(pos.col, pos.row, dim.w, dim.h, item.id);
        }
      }
      const cell = document.createElement('div');
      cell.className = 'cabinet-cell';
      cell.style.position = 'absolute';
      cell.style.left = (GRID_PAD + item.gridCol * (CELL + GRID_GAP)) + 'px';
      cell.style.top = (GRID_PAD + item.gridRow * (CELL + GRID_GAP)) + 'px';
      cell.style.width = (dim.w * CELL + (dim.w - 1) * GRID_GAP) + 'px';
      cell.style.height = (dim.h * CELL + (dim.h - 1) * GRID_GAP) + 'px';
      cell.dataset.itemId = item.id;

      if (item.removed) {
        cell.classList.add('empty');
      } else {
        const img = document.createElement('img');
        img.src = cachedSrc(item.img);
        img.alt = item.name;
        cell.appendChild(img);
      }

      cell.addEventListener('click', (e) => { e.stopPropagation(); onCabinetClick(item, cell); });
      cabinetGrid.appendChild(cell);
    });
  }

  // ========== 酒柜点击 ==========
  function onCabinetClick(item, cell) {
    if (item.removed) {
      // 编辑模式下点击空位 = 放下
      if (state.editMode && state.dragging && state.dragging.source === 'cabinet-edit') {
        placeEditItem(item.gridCol, item.gridRow);
      }
      return;
    }

    // 编辑模式
    if (state.editMode) {
      if (state.dragging && state.dragging.source === 'cabinet-edit') {
        // 点击另一个物品 = 交换位置
        swapCabinetItems(state.dragging.itemId, item.id);
        stopDragging();
        renderCabinet();
        return;
      }
      // 拿起物品
      startDragging(item, 'cabinet-edit');
      item.removed = true;
      clearGridFor(item.id);
      renderCabinet();
      return;
    }

    // 正在拖拽时点击酒柜 = 放回
    if (state.dragging) {
      // 从吧台拿起的空杯子归位到酒柜
      if (state.dragging.source === 'bar-glass-pickup') {
        returnBarGlassToCabinet();
        return;
      }
      returnDraggedItem();
      return;
    }

    // 拿起物品
    startDragging(item, 'item-pickup');
    item.removed = true;
    clearGridFor(item.id);
    renderCabinet();
  }

  function onEmptyCellClick(col, row) {
    if (!state.editMode || !state.dragging || state.dragging.source !== 'cabinet-edit') return;
    placeEditItem(col, row);
  }

  function placeEditItem(col, row) {
    const dragItem = state.cabinetItems.find(i => i.id === state.dragging.itemId);
    if (!dragItem) { stopDragging(); renderCabinet(); return; }
    const dim = parseDim(dragItem.size);
    // 检查目标位置是否可放
    if (canPlace(col, row, dim.w, dim.h)) {
      dragItem.gridCol = col;
      dragItem.gridRow = row;
      dragItem.removed = false;
      occupyGrid(col, row, dim.w, dim.h, dragItem.id);
    } else {
      // 放不下，恢复原位
      dragItem.removed = false;
      occupyGrid(dragItem.gridCol, dragItem.gridRow, dim.w, dim.h, dragItem.id);
      showMessage('该位置放不下，请选择其他空位');
    }
    stopDragging();
    renderCabinet();
  }

  function swapCabinetItems(id1, id2) {
    const item1 = state.cabinetItems.find(i => i.id === id1);
    const item2 = state.cabinetItems.find(i => i.id === id2);
    if (!item1 || !item2) return;
    const dim1 = parseDim(item1.size);
    const dim2 = parseDim(item2.size);
    const pos1 = { col: item1.gridCol, row: item1.gridRow };
    const pos2 = { col: item2.gridCol, row: item2.gridRow };

    // item1 已经被清除了（编辑模式拿起时清除），只需清除 item2
    clearGridFor(id2);

    // 尝试交叉放置
    const ok1 = canPlace(pos2.col, pos2.row, dim1.w, dim1.h);
    const ok2 = canPlace(pos1.col, pos1.row, dim2.w, dim2.h);

    if (ok1 && ok2) {
      item1.gridCol = pos2.col; item1.gridRow = pos2.row;
      item1.removed = false;
      item2.gridCol = pos1.col; item2.gridRow = pos1.row;
      occupyGrid(pos2.col, pos2.row, dim1.w, dim1.h, id1);
      occupyGrid(pos1.col, pos1.row, dim2.w, dim2.h, id2);
    } else {
      // 交换失败，恢复
      item1.removed = false;
      occupyGrid(pos1.col, pos1.row, dim1.w, dim1.h, id1);
      occupyGrid(pos2.col, pos2.row, dim2.w, dim2.h, id2);
      showMessage('尺寸不同，无法交换位置');
    }
  }

  // ========== 拖拽系统 ==========
  function startDragging(item, source) {
    state.dragging = {
      itemId: item.id,
      key: item.key,
      type: item.type,
      name: item.name,
      img: item.img,
      size: item.size,
      instanceId: item.instanceId || null,
      source: source
    };
    floatingImg.src = cachedSrc(item.img);
    floatingItem.style.display = 'block';
    updateFloatingPos(lastMouseX, lastMouseY);
  }

  function stopDragging() {
    state.dragging = null;
    floatingItem.style.display = 'none';
    floatingItem.classList.remove('shaking');
    // 清除冰块叠加图标
    const iceOverlay = document.getElementById('clampIceOverlay');
    if (iceOverlay) iceOverlay.remove();
    state.spoonActive = false;
    state.clampHasIce = false;
    state.shakerShakeCount = 0;
    state.spoonShakeCount = 0;
  }

  function returnDraggedItem() {
    if (!state.dragging) return;
    if (state.dragging.itemId > 0) {
      const item = state.cabinetItems.find(i => i.id === state.dragging.itemId);
      if (item) {
        item.removed = false;
        // 恢复网格占用（原位或找新位）
        if (item.gridCol !== undefined) {
          const dim = parseDim(item.size);
          if (canPlace(item.gridCol, item.gridRow, dim.w, dim.h)) {
            occupyGrid(item.gridCol, item.gridRow, dim.w, dim.h, item.id);
          } else {
            const pos = findFreePos(dim.w, dim.h);
            if (pos) {
              item.gridCol = pos.col;
              item.gridRow = pos.row;
              occupyGrid(pos.col, pos.row, dim.w, dim.h, item.id);
            }
          }
        }
      }
      renderCabinet();
    }
    stopDragging();
  }

  function returnBarGlassToCabinet() {
    if (!state.dragging) return;
    const cabItem = state.cabinetItems.find(i => i.id === state.dragging.itemId);
    if (cabItem) {
      cabItem.removed = false;
      const dim = parseDim(cabItem.size);
      if (canPlace(cabItem.gridCol, cabItem.gridRow, dim.w, dim.h)) {
        occupyGrid(cabItem.gridCol, cabItem.gridRow, dim.w, dim.h, cabItem.id);
      } else {
        const pos = findFreePos(dim.w, dim.h);
        if (pos) {
          cabItem.gridCol = pos.col;
          cabItem.gridRow = pos.row;
          occupyGrid(pos.col, pos.row, dim.w, dim.h, cabItem.id);
        }
      }
      renderCabinet();
      showMessage(cabItem.name + '已归位到酒柜');
    }
    stopDragging();
  }

  let lastMouseX = 0, lastMouseY = 0;

  function updateFloatingPos(x, y) {
    floatingItem.style.left = x + 'px';
    floatingItem.style.top = y + 'px';
  }

  document.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    if (state.dragging) {
      updateFloatingPos(e.clientX, e.clientY);
      detectShake(e.clientX);
    }
    updateGlassTooltip(e);
  });

  // ========== 摇晃检测 ==========
  function detectShake(x) {
    if (!state.dragging) return;

    // 雪克壶
    if (state.dragging.key === 'shaker' && state.dragging.source === 'shaker-active') {
      const dx = x - state.shakerLastX;
      const dir = dx > 0 ? 1 : dx < 0 ? -1 : 0;
      if (dir !== 0 && dir !== state.shakerDirection) {
        state.shakerShakeCount++;
        state.shakerDirection = dir;
        if (state.shakerShakeCount >= 10) {
          floatingItem.classList.add('shaking');
          state.shaker.shaken = true;
          showMessage('摇匀完成！点击吧台上的杯子倒出酒液');
          checkTutorial('shaker-shaken');
        }
      }
      state.shakerLastX = x;
    }

    // 吧勺
    if (state.dragging.key === 'spoon' && state.spoonActive) {
      const dx = x - state.spoonLastX;
      const dir = dx > 0 ? 1 : dx < 0 ? -1 : 0;
      if (dir !== 0 && dir !== state.spoonDirection) {
        state.spoonShakeCount++;
        state.spoonDirection = dir;
      }
      state.spoonLastX = x;
    }
  }

  // ========== 吧台点击 ==========
  barCounter.addEventListener('click', (e) => {
    if (!state.dragging) return;
    const d = state.dragging;
    const rect = barCounter.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hitItem = getBarItemAt(e.clientX, e.clientY);

    // 冰夹+冰 → 杯子/雪克壶
    if (d.key === 'clamp') {
      if (hitItem) {
        if (hitItem.type === 'glass' && state.clampHasIce) {
          hitItem.hasIce = true;
          showMessage('已向' + hitItem.name + '中加冰');
          checkTutorial('glass-ice');
          renderBarItems();
          stopDragging();
          return;
        }
        if (hitItem.key === 'shaker' && state.clampHasIce) {
          state.shaker.hasIce = true;
          showMessage('已向雪克壶中加冰');
          checkTutorial('shaker-ice');
          updateShakerIndicator();
          stopDragging();
          return;
        }
      }
      // 点击空白处，归位（无论是否有冰）
      stopDragging();
      return;
    }

    // 雪克壶活跃 → 倒入杯子或点击空白归位
    if (d.source === 'shaker-active') {
      if (hitItem && hitItem.type === 'glass') {
        pourShakerToGlass(hitItem);
        return;
      }
      // 点击空白处，雪克壶归位
      stopDragging();
      return;
    }

    // 吧勺活跃 → 搅拌杯子
    if (d.key === 'spoon' && d.source === 'spoon-active') {
      if (hitItem && hitItem.type === 'glass') {
        startStirring(hitItem);
        return;
      }
      returnDraggedItem();
      return;
    }

    // 酒/配料 → 倒入杯子或雪克壶
    if (d.type === 'spirit' || d.type === 'mixer') {
      if (hitItem) {
        if (hitItem.type === 'glass') { addIngredientToGlass(hitItem, d); return; }
        if (hitItem.key === 'shaker') { addIngredientToShaker(d); return; }
      }
      placeOnBar(d, x, y);
      return;
    }

    // 杯子 → 放在吧台
    if (d.type === 'glass') {
      placeOnBar(d, x, y);
      return;
    }
  });

  // ========== 吧台物品管理 ==========
  function placeOnBar(d, x, y) {
    const barItem = {
      id: genId(), key: d.key, type: d.type, name: d.name, img: d.img,
      x: x - 24, y: y - 24,
      contents: [], hasIce: false, mixed: false, stirred: false,
      instanceId: d.instanceId, cabinetItemId: d.itemId
    };
    state.barItems.push(barItem);
    stopDragging();
    renderBarItems();
    if (d.type === 'glass') {
      showMessage(d.name + '已放在吧台上');
      checkTutorial('glass-placed');
    }
  }

  function renderBarItems() {
    barCounter.querySelectorAll('.bar-item').forEach(el => el.remove());
    state.barItems.forEach(item => {
      const div = document.createElement('div');
      div.className = 'bar-item';
      if (item.hasIce) div.classList.add('has-ice');
      div.style.left = item.x + 'px';
      div.style.top = item.y + 'px';
      div.dataset.barId = item.id;

      const img = document.createElement('img');
      img.src = cachedSrc(item.img);
      img.alt = item.name;
      div.appendChild(img);

      if (item.contents.length > 0) {
        const dots = document.createElement('div');
        dots.className = 'glass-contents';
        item.contents.forEach(c => {
          const dot = document.createElement('div');
          dot.className = 'dot';
          dot.style.background = getIngredientColor(c);
          dots.appendChild(dot);
        });
        div.appendChild(dots);
      }

      div.addEventListener('click', (e) => { e.stopPropagation(); onBarItemClick(item); });
      barCounter.appendChild(div);
    });
    updateShakerIndicator();
  }

  function getBarItemAt(cx, cy) {
    const els = document.elementsFromPoint(cx, cy);
    for (const el of els) {
      const b = el.closest('.bar-item');
      if (b) {
        const id = parseInt(b.dataset.barId);
        return state.barItems.find(i => i.id === id);
      }
    }
    return null;
  }

  function getIngredientColor(key) {
    const c = {
      gin:'#a5d6a7', vodka:'#e0e0e0', tequila:'#fff9c4', rum:'#f5f5f5',
      champagneWine:'#fff8e1', coffeeLiqueur:'#5d4037', dryVermouth:'#c5e1a5',
      sweetVermouth:'#ef5350', lemonJuice:'#fff176', orangeJuice:'#ff9800',
      coconutMilk:'#fafafa', tonicWater:'#b2ebf2', sodaWater:'#c8e6c9',
      grenadine:'#e53935', cherryBrandy:'#ad1457'
    };
    return c[key] || '#999';
  }

  // ========== 吧台物品交互 ==========
  function onBarItemClick(item) {
    if (state.dragging) {
      const d = state.dragging;

      // 冰夹+冰
      if (d.key === 'clamp') {
        if (item.type === 'glass' && state.clampHasIce) {
          item.hasIce = true;
          showMessage('已向' + item.name + '中加冰');
          checkTutorial('glass-ice');
          renderBarItems();
          stopDragging();
          return;
        }
        if (item.key === 'shaker' && state.clampHasIce) {
          state.shaker.hasIce = true;
          showMessage('已向雪克壶中加冰');
          checkTutorial('shaker-ice');
          updateShakerIndicator();
          stopDragging();
          return;
        }
        // 点击其他物品也归位
        stopDragging();
        return;
      }

      // 酒/配料 → 杯子
      if ((d.type === 'spirit' || d.type === 'mixer') && item.type === 'glass') {
        addIngredientToGlass(item, d); return;
      }
      // 酒/配料 → 雪克壶
      if ((d.type === 'spirit' || d.type === 'mixer') && item.key === 'shaker') {
        addIngredientToShaker(d); return;
      }
      // 雪克壶 → 杯子
      if (d.source === 'shaker-active' && item.type === 'glass') {
        pourShakerToGlass(item); return;
      }
      // 吧勺 → 杯子
      if (d.key === 'spoon' && item.type === 'glass') {
        startStirring(item); return;
      }
      return;
    }

    // 无拖拽时点击
    // 杯子
    if (item.type === 'glass') {
      if (item.contents.length > 0 && (item.mixed || item.stirred)) {
        tryServeDrink(item);
      } else if (item.contents.length > 0) {
        const names = item.contents.map(k => getIngredientName(k)).join('、');
        showMessage(item.name + '中有：' + names + (item.hasIce ? '、冰' : '') + '（需要搅拌或摇匀）');
      } else if (!item.hasIce) {
        // 空杯子，拿起来
        state.dragging = {
          itemId: item.cabinetItemId,
          key: item.key,
          type: 'glass',
          name: item.name,
          img: item.img,
          instanceId: item.instanceId,
          source: 'bar-glass-pickup',
          barItemId: item.id
        };
        floatingImg.src = cachedSrc(item.img);
        floatingItem.style.display = 'block';
        state.barItems = state.barItems.filter(i => i.id !== item.id);
        renderBarItems();
      }
      return;
    }

    // 酒/配料 → 拿起
    if (item.type === 'spirit' || item.type === 'mixer') {
      const cabItem = state.cabinetItems.find(i => i.id === item.cabinetItemId);
      if (cabItem) {
        startDragging(cabItem, 'item-pickup');
        state.barItems = state.barItems.filter(i => i.id !== item.id);
        renderBarItems();
      }
    }
  }

  function getIngredientName(key) {
    const all = { ...SPIRITS, ...MIXERS };
    return all[key] ? all[key].name : key;
  }

  // ========== 添加原料 ==========
  function addIngredientToGlass(glass, d) {
    glass.contents.push(d.key);
    showMessage('已向' + glass.name + '中加入' + getIngredientName(d.key));
    returnDraggedItem();
    renderBarItems();
    checkTutorial('ingredient-added');
  }

  function addIngredientToShaker(d) {
    state.shaker.contents.push(d.key);
    showMessage('已向雪克壶中加入' + getIngredientName(d.key));
    state.shaker.shaken = false;
    returnDraggedItem();
    updateShakerIndicator();
    checkTutorial('shaker-ingredient');
  }

  // ========== 雪克壶 ==========
  function pourShakerToGlass(glass) {
    if (!state.shaker.shaken && state.shaker.contents.length > 0) {
      showMessage('请先摇匀雪克壶！');
      return;
    }
    state.shaker.contents.forEach(c => glass.contents.push(c));
    glass.mixed = true;
    if (state.shaker.hasIce) glass.hasIce = true;
    showMessage('已将雪克壶中的酒液倒入' + glass.name);
    state.shaker.contents = [];
    state.shaker.hasIce = false;
    state.shaker.shaken = false;
    returnDraggedItem();
    renderBarItems();
    updateShakerIndicator();
    checkTutorial('shaker-poured');
  }

  function updateShakerIndicator() {
    if (state.shaker.contents.length === 0 && !state.shaker.hasIce) {
      shakerIndicator.style.display = 'none'; return;
    }
    shakerIndicator.style.display = 'block';
    let html = '';
    if (state.shaker.hasIce) html += '<span class="chip">🧊 冰</span>';
    state.shaker.contents.forEach(c => {
      html += '<span class="chip">' + getIngredientName(c) + '</span>';
    });
    if (state.shaker.shaken) html += '<span class="chip" style="color:#4caf50">✓ 已摇匀</span>';
    shakerContents.innerHTML = html;
  }

  // ========== 吧勺搅拌 ==========
  function startStirring(glass) {
    state.spoonActive = true;
    state.spoonShakeCount = 0;
    state.spoonLastX = lastMouseX;
    state.spoonDirection = 0;
    showMessage('正在搅拌' + glass.name + '，左右摇晃鼠标！');
    const check = setInterval(() => {
      if (state.spoonShakeCount >= 10) {
        clearInterval(check);
        glass.stirred = true;
        showMessage(glass.name + '搅拌完成！');
        returnDraggedItem();
        renderBarItems();
        checkTutorial('glass-stirred');
      }
      if (!state.dragging || !state.spoonActive) clearInterval(check);
    }, 100);
  }

  // ========== 工具栏交互 ==========
  // 阻止工具点击冒泡到吧台
  document.querySelectorAll('.bar-tool').forEach(el => {
    el.addEventListener('click', (e) => e.stopPropagation());
  });

  // 冰柜
  $('#iceSlot').addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.dragging && state.dragging.key === 'clamp') {
      state.clampHasIce = true;
      // 浮动图标换成带冰的样式
      floatingImg.src = cachedSrc('assets/clamp.webp');
      floatingItem.style.position = 'fixed';
      // 在浮动层上叠加冰块图标
      let iceOverlay = document.getElementById('clampIceOverlay');
      if (!iceOverlay) {
        iceOverlay = document.createElement('div');
        iceOverlay.id = 'clampIceOverlay';
        iceOverlay.style.cssText = 'position:absolute;bottom:-8px;right:-8px;font-size:28px;pointer-events:none;';
        floatingItem.appendChild(iceOverlay);
      }
      iceOverlay.textContent = '🧊';
      showMessage('已取冰！将冰放入杯子或雪克壶');
      checkTutorial('ice-picked');
    }
  });

  // 水池
  $('#sinkSlot').addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.dirtyGlasses.length === 0) { showMessage('水池是空的'); return; }
    const dirty = state.dirtyGlasses.shift();
    const cabItem = state.cabinetItems.find(i => i.instanceId === dirty.instanceId);
    if (cabItem) {
      cabItem.removed = false;
      const dim = parseDim(cabItem.size);
      if (!canPlace(cabItem.gridCol, cabItem.gridRow, dim.w, dim.h)) {
        const pos = findFreePos(dim.w, dim.h);
        if (pos) { cabItem.gridCol = pos.col; cabItem.gridRow = pos.row; }
      }
      occupyGrid(cabItem.gridCol, cabItem.gridRow, dim.w, dim.h, cabItem.id);
    }
    showMessage(GLASS_TYPES[dirty.key].name + '清洗完成，已归位');
    renderCabinet();
    renderSinkBadges();
  });

  // 订单机
  $('#orderSlot').addEventListener('click', (e) => { e.stopPropagation(); openOrderModal(); });
  // 酒图签
  $('#handbookSlot').addEventListener('click', (e) => { e.stopPropagation(); openHandbookModal(); });
  // 配方本
  $('#recipeSlot').addEventListener('click', (e) => { e.stopPropagation(); openRecipeModal(); });

  // 雪克壶
  $('#shakerSlot').addEventListener('click', (e) => {
    e.stopPropagation();
    // 冰夹+冰 → 向雪克壶加冰
    if (state.dragging && state.dragging.key === 'clamp' && state.clampHasIce) {
      state.shaker.hasIce = true;
      showMessage('已向雪克壶中加冰');
      checkTutorial('shaker-ice');
      updateShakerIndicator();
      stopDragging();
      return;
    }
    if (state.dragging && (state.dragging.type === 'spirit' || state.dragging.type === 'mixer')) {
      addIngredientToShaker(state.dragging);
      return;
    }
    if (!state.dragging) {
      state.dragging = {
        itemId: -1, key: 'shaker', type: 'tool', name: '雪克壶',
        img: 'assets/shake.webp', source: 'shaker-active'
      };
      floatingImg.src = cachedSrc('assets/shake.webp');
      floatingItem.style.display = 'block';
      state.shakerShakeCount = 0;
      state.shakerLastX = lastMouseX;
      if (state.shaker.contents.length > 0) {
        showMessage('摇晃鼠标来摇匀雪克壶！点击杯子倒出');
      } else {
        showMessage('雪克壶已拿起，先往里加酒再摇匀');
      }
    }
  });

  // 冰夹
  $('#clampSlot').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!state.dragging) {
      // 虚拟拿起冰夹
      state.dragging = {
        itemId: -1, key: 'clamp', type: 'tool', name: '冰夹',
        img: 'assets/clamp.webp', source: 'clamp-active'
      };
      floatingImg.src = cachedSrc('assets/clamp.webp');
      floatingItem.style.display = 'block';
      state.clampHasIce = false;
      showMessage('点击冰柜取冰');
    }
  });

  // 吧勺
  $('#spoonSlot').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!state.dragging) {
      state.dragging = {
        itemId: -1, key: 'spoon', type: 'tool', name: '吧勺',
        img: 'assets/spoon.webp', source: 'spoon-active'
      };
      floatingImg.src = cachedSrc('assets/spoon.webp');
      floatingItem.style.display = 'block';
      showMessage('将吧勺移到杯子上搅拌');
    }
  });

  function renderSinkBadges() {
    sinkBadges.innerHTML = '';
    if (state.dirtyGlasses.length > 0) {
      const b = document.createElement('div');
      b.className = 'sink-badge';
      b.textContent = state.dirtyGlasses.length;
      sinkBadges.appendChild(b);
    }
  }

  // ========== 出酒验证 ==========
  function tryServeDrink(glassItem) {
    const glassKey = glassItem.key;
    const contents = glassItem.contents;
    let matchedCocktail = null;
    let matchedOrder = null;
    const pendingOrders = state.orders.filter(o => !o.completed);

    // 教程阶段
    if (state.phase === 'tutorial' && !state.tutorialDrinkMade) {
      const ts = COCKTAILS.find(c => c.id === 'tequilaSunrise');
      if (glassKey === ts.glass && matchIngredients(contents, ts.ingredients)) {
        showMessage('🎉 太棒了！你成功调制了龙舌兰日出！', true);
        state.tutorialDrinkMade = true;
        completeDrink(glassItem, ts, null);
        setTimeout(() => advanceTutorial(), 1500);
        return;
      }
    }

    // 正常验证
    for (const order of pendingOrders) {
      const cocktail = COCKTAILS.find(c => c.id === order.cocktailId);
      if (!cocktail) continue;
      if (glassKey !== cocktail.glass) continue;
      if (matchIngredients(contents, cocktail.ingredients)) {
        matchedCocktail = cocktail;
        matchedOrder = order;
        break;
      }
    }

    if (matchedCocktail && matchedOrder) {
      showMessage('🎉 完美！' + matchedCocktail.name + '调制成功！', true);
      matchedOrder.completed = true;
      completeDrink(glassItem, matchedCocktail, matchedOrder);
      updateOrderBadge();
      checkTutorial('order-completed');
    } else {
      const possible = COCKTAILS.find(c => c.glass === glassKey && matchIngredients(contents, c.ingredients));
      if (possible) {
        showMessage('调制了' + possible.name + '，但没有对应的订单');
      } else {
        showMessage('❌ 配方不正确，请检查原料和杯子');
      }
      sendGlassToDirty(glassItem);
    }
  }

  function matchIngredients(contents, required) {
    const a = [...contents].sort();
    const b = [...required].sort();
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  function completeDrink(glassItem) {
    state.barItems = state.barItems.filter(i => i.id !== glassItem.id);
    renderBarItems();
    const delay = (30 + Math.random() * 30) * 1000;
    setTimeout(() => {
      state.dirtyGlasses.push({ key: glassItem.key, instanceId: glassItem.instanceId });
      showMessage('有脏杯子需要清洗！');
      renderSinkBadges();
    }, delay);
  }

  function sendGlassToDirty(glassItem) {
    state.barItems = state.barItems.filter(i => i.id !== glassItem.id);
    state.dirtyGlasses.push({ key: glassItem.key, instanceId: glassItem.instanceId });
    renderBarItems();
    renderSinkBadges();
  }

  // ========== 订单系统 ==========
  function generateOrders(count) {
    const available = COCKTAILS.filter(c => c.id !== 'tequilaSunrise' || state.tutorialDrinkMade);
    for (let i = 0; i < count; i++) {
      const cocktail = available[Math.floor(Math.random() * available.length)];
      state.orders.push({
        id: ++state.orderIdCounter,
        cocktailId: cocktail.id,
        name: cocktail.name,
        timestamp: Date.now(),
        completed: false
      });
    }
    updateOrderBadge();
  }

  function updateOrderBadge() {
    const pending = state.orders.filter(o => !o.completed).length;
    orderBadge.style.display = pending > 0 ? 'flex' : 'none';
    orderBadge.textContent = pending;
  }

  function startOrderTimer() {
    state.orderTimer = setInterval(() => {
      const count = 1 + Math.floor(Math.random() * 3);
      generateOrders(count);
      showMessage('📋 新订单来了！共' + count + '个', true);
    }, 180000);
  }

  // ========== 模态框 ==========
  function getGlassName(key) {
    return GLASS_TYPES[key] ? GLASS_TYPES[key].name : key;
  }

  function openOrderModal() {
    const pending = state.orders.filter(o => !o.completed);
    const completed = state.orders.filter(o => o.completed).slice(-5);
    let html = '';
    if (pending.length === 0 && completed.length === 0) {
      html = '<p style="color:#999;text-align:center;padding:20px">暂无订单</p>';
    }
    pending.forEach(o => {
      const c = COCKTAILS.find(cc => cc.id === o.cocktailId);
      html += '<div class="order-card">' +
        '<div class="order-name">' + o.name + '</div>' +
        '<div class="order-status">⏳ 等待调制</div>' +
        (c ? '<div class="order-time">使用 ' + getGlassName(c.glass) + '</div>' : '') +
        '</div>';
    });
    completed.forEach(o => {
      html += '<div class="order-card completed">' +
        '<div class="order-name">' + o.name + '</div>' +
        '<div class="order-status">✅ 已完成</div></div>';
    });
    orderList.innerHTML = html;
    orderModal.style.display = 'flex';
    checkTutorial('order-viewed');
  }

  function openHandbookModal() {
    let html = '<div style="color:#7b2ff7;font-size:13px;margin-bottom:8px;font-weight:600">🍾 基酒</div>';
    html += '<div class="handbook-grid">';
    Object.entries(SPIRITS).forEach(([k, d]) => {
      html += '<div class="handbook-card"><img src="' + cachedSrc(d.img) + '" alt="' + d.name + '">' +
        '<div class="hb-name">' + d.name + '</div></div>';
    });
    html += '</div>';
    html += '<div style="color:#7b2ff7;font-size:13px;margin:12px 0 8px;font-weight:600">🧪 配料</div>';
    html += '<div class="handbook-grid">';
    Object.entries(MIXERS).forEach(([k, d]) => {
      html += '<div class="handbook-card"><img src="' + cachedSrc(d.img) + '" alt="' + d.name + '">' +
        '<div class="hb-name">' + d.name + '</div></div>';
    });
    html += '</div>';
    html += '<div style="color:#7b2ff7;font-size:13px;margin:12px 0 8px;font-weight:600">🥃 杯子</div>';
    html += '<div class="handbook-grid">';
    Object.entries(GLASS_TYPES).forEach(([k, d]) => {
      html += '<div class="handbook-card"><img src="' + cachedSrc(d.img) + '" alt="' + d.name + '">' +
        '<div class="hb-name">' + d.name + '</div></div>';
    });
    html += '</div>';
    handbookList.innerHTML = html;
    handbookModal.style.display = 'flex';
    checkTutorial('handbook-viewed');
  }

  function openRecipeModal() {
    let html = '';
    COCKTAILS.forEach(c => {
      const gn = getGlassName(c.glass);
      const ing = c.ingredients.map(k => getIngredientName(k)).join(' + ');
      html += '<div class="recipe-card">' +
        '<div class="rc-name">' + c.name + '</div>' +
        '<div class="rc-glass">🥃 ' + gn + '</div>' +
        '<div class="rc-ingredients">📝 ' + ing + '</div>' +
        '<div class="rc-steps">📋 ' + c.steps + '</div></div>';
    });
    recipeList.innerHTML = html;
    recipeModal.style.display = 'flex';
  }

  // 关闭模态框
  $$('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.close).style.display = 'none';
    });
  });
  $$('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  });

  // ========== 杯子悬停提示 ==========
  function updateGlassTooltip(e) {
    if (state.dragging) { glassTooltip.style.display = 'none'; return; }
    const item = getBarItemAt(e.clientX, e.clientY);
    if (item && item.type === 'glass' && item.contents.length > 0) {
      const names = item.contents.map(k => getIngredientName(k));
      let text = names.join('、');
      if (item.hasIce) text = '🧊冰、' + text;
      if (item.mixed) text += ' (已摇匀)';
      if (item.stirred) text += ' (已搅拌)';
      glassTooltip.textContent = text;
      glassTooltip.style.display = 'block';
      glassTooltip.style.left = (e.clientX + 12) + 'px';
      glassTooltip.style.top = (e.clientY - 20) + 'px';
    } else {
      glassTooltip.style.display = 'none';
    }
  }

  // ========== 编辑模式 ==========
  // 点击酒柜区域任意位置归位拖拽中的物品
  $('#cabinetArea').addEventListener('click', (e) => {
    if (!state.dragging) return;
    const src = state.dragging.source;
    if (src === 'bar-glass-pickup') {
      returnBarGlassToCabinet();
    } else if (src === 'item-pickup') {
      returnDraggedItem();
    }
  });

  $('#editModeBtn').addEventListener('click', () => {
    state.editMode = !state.editMode;
    $('#editModeBtn').classList.toggle('active', state.editMode);
    if (state.editMode) {
      showMessage('编辑模式：点击物品拿起，再点击另一个位置交换');
      if (state.dragging) stopDragging();
    } else {
      showMessage('已退出编辑模式');
      if (state.dragging) stopDragging();
    }
  });

  // ========== 教程系统 ==========
  const TUTORIAL_STEPS = [
    // === 龙舌兰日出 ===
    { id: 'start',            msg: '🍸 本游戏会帮助您熟记各种调酒配方，成为调酒大师！' },
    { id: 'guide-tequila',    msg: '🌅 现在来调制第一杯酒「龙舌兰日出」！配方：龙舌兰 + 橙汁 + 石榴糖浆，使用柯林杯' },
    { id: 'guide-glass1',     msg: '🥃 从下方酒柜中找到「柯林杯」（高高的直筒杯），点击拿起，在吧台空白区域点击放下' },
    { id: 'wait-glass1',      msg: null },
    { id: 'guide-ice1',       msg: '🧊 点击吧台上的「冰夹」，然后点击左下角的「冰柜」取冰，最后点击吧台上的杯子加冰' },
    { id: 'wait-ice1',        msg: null },
    { id: 'guide-pour1',      msg: '🍾 从酒柜找到「龙舌兰」「橙汁」，依次点击拿起，移到吧台上的杯子点击倒入' },
    { id: 'wait-pour1',       msg: null },
    { id: 'guide-stir1',      msg: '🥄 点击吧台上的「吧勺」拿起，移到杯子上点击开始搅拌（左右摇晃鼠标）' },
    { id: 'wait-stir1',       msg: null },
    { id: 'guide-grenadine',  msg: '🍒 最后淋入「石榴糖浆」，从酒柜找到石榴糖浆倒入杯子' },
    { id: 'wait-grenadine',   msg: null },
    { id: 'guide-serve1',     msg: '✨ 所有原料已加入并搅拌完成！点击吧台上的杯子出酒' },
    { id: 'wait-serve1',      msg: null },
    { id: 'tutorial-done1',   msg: '🎉 恭喜！你已经学会了基本调酒！你可以点击酒柜的「编辑模式」整理物品位置' },
    { id: 'guide-order',      msg: '📋 新订单来了！点击吧台上的「订单机」查看订单，然后调制「皮纳科拉达」' },
    { id: 'wait-order',       msg: null },
    // === 皮纳科拉达 ===
    { id: 'guide-pina',       msg: '🥥 皮纳科拉达配方：白朗姆 + 椰奶，使用雪克壶摇匀后倒入柯林杯' },
    { id: 'guide-glass2',     msg: '🥃 从酒柜找到「柯林杯」，点击拿起放到吧台上' },
    { id: 'wait-glass2',      msg: null },
    { id: 'guide-shaker-ice', msg: '🧊 点击吧台上的「冰夹」，点击「冰柜」取冰，然后点击吧台上的「雪克壶」向雪克壶加冰' },
    { id: 'wait-shaker-ice',  msg: null },
    { id: 'guide-shaker-pour',msg: '🍾 从酒柜找到「白朗姆」和「椰奶」，点击拿起后点击吧台上的雪克壶图标倒入' },
    { id: 'wait-shaker-pour', msg: null },
    { id: 'guide-shake',      msg: '🍸 点击吧台上的「雪克壶」拿起，左右摇晃鼠标摇匀！' },
    { id: 'wait-shake',       msg: null },
    { id: 'guide-pour2',      msg: '🥃 摇匀完成！点击吧台上的柯林杯，将酒液倒入' },
    { id: 'wait-pour2',       msg: null },
    { id: 'guide-serve2',     msg: '✨ 点击吧台上的杯子出酒！' },
    { id: 'wait-serve2',      msg: null },
    { id: 'tutorial-done2',   msg: '🎉 太棒了！你已经掌握了雪克壶的用法！' },
    { id: 'playing',          msg: '🍹 自由调酒模式！订单会每3分钟自动产生，加油！' }
  ];

  function showTutorialStep() {
    const step = TUTORIAL_STEPS[state.tutorial.step];
    if (step && step.msg) showMessage(step.msg, true);
  }

  function checkTutorial(event) {
    if (!state.tutorial.active) return;
    const id = TUTORIAL_STEPS[state.tutorial.step] ? TUTORIAL_STEPS[state.tutorial.step].id : '';

    switch (id) {
      // === 龙舌兰日出 ===
      case 'wait-glass1':
        if (event === 'glass-placed') advanceTutorial();
        break;
      case 'wait-ice1':
        if (event === 'glass-ice') advanceTutorial();
        break;
      case 'wait-pour1':
        if (event === 'ingredient-added') {
          const g = state.barItems.find(i => i.type === 'glass' && i.key === 'collins');
          if (g && g.contents.includes('tequila') && g.contents.includes('orangeJuice')) advanceTutorial();
        }
        break;
      case 'wait-stir1':
        if (event === 'glass-stirred') advanceTutorial();
        break;
      case 'wait-grenadine':
        if (event === 'ingredient-added') {
          const g = state.barItems.find(i => i.type === 'glass' && i.key === 'collins');
          if (g && g.contents.includes('grenadine')) advanceTutorial();
        }
        break;
      case 'wait-serve1':
        // 由 tryServeDrink 中 tutorialDrinkMade 触发
        break;
      case 'wait-order':
        if (event === 'order-viewed') advanceTutorial();
        break;
      // === 皮纳科拉达 ===
      case 'wait-glass2':
        if (event === 'glass-placed') advanceTutorial();
        break;
      case 'wait-shaker-ice':
        if (event === 'shaker-ice') advanceTutorial();
        break;
      case 'wait-shaker-pour':
        if (event === 'shaker-ingredient') {
          if (state.shaker.contents.includes('rum') && state.shaker.contents.includes('coconutMilk')) advanceTutorial();
        }
        break;
      case 'wait-shake':
        if (event === 'shaker-shaken') advanceTutorial();
        break;
      case 'wait-pour2':
        if (event === 'shaker-poured') advanceTutorial();
        break;
      case 'wait-serve2':
        if (event === 'order-completed') advanceTutorial();
        break;
    }
  }

  function advanceTutorial() {
    state.tutorial.step++;
    if (state.tutorial.step >= TUTORIAL_STEPS.length) {
      state.tutorial.active = false;
      state.phase = 'playing';
      startOrderTimer();
      return;
    }

    const step = TUTORIAL_STEPS[state.tutorial.step];
    if (step.msg) showMessage(step.msg, true);

    // guide-tequila 和 guide-pina 延迟2秒后自动跳
    if (step.id === 'guide-tequila' || step.id === 'guide-pina') {
      setTimeout(() => advanceTutorial(), 2000);
      return;
    }

    // 所有 guide-* 显示消息后立即进入 wait-*
    if (step.id.startsWith('guide-')) {
      setTimeout(() => advanceTutorial(), 0);
      return;
    }

    // 龙舌兰日出教程完成 → 生成皮纳科拉达订单
    if (step.id === 'tutorial-done1') {
      setTimeout(() => {
        state.orders.push({
          id: ++state.orderIdCounter,
          cocktailId: 'pinaColada',
          name: '皮纳科拉达',
          timestamp: Date.now(),
          completed: false
        });
        updateOrderBadge();
        advanceTutorial();
      }, 3000);
      return;
    }

    // 皮纳科拉达教程完成 → 生成1个随机订单，然后进入自由模式
    if (step.id === 'tutorial-done2') {
      setTimeout(() => {
        generateOrders(1);
        advanceTutorial();
      }, 2000);
      return;
    }

    if (step.id === 'playing') {
      state.tutorial.active = false;
      state.phase = 'playing';
      const skipBtn = $('#skipTutorialBtn');
      if (skipBtn) skipBtn.style.display = 'none';
      startOrderTimer();
    }
  }

  // ========== 键盘 & 右键 ==========
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.dragging) returnDraggedItem();
      $$('.modal').forEach(m => m.style.display = 'none');
    }
  });

  document.addEventListener('contextmenu', (e) => {
    if (state.dragging) { e.preventDefault(); returnDraggedItem(); }
  });

  // ========== 初始化 ==========
  function syncSinkWidth() { /* left-stack handles equal width */ }

  function skipTutorial() {
    state.tutorial.active = false;
    state.tutorial.step = TUTORIAL_STEPS.length;
    state.phase = 'playing';
    state.tutorialDrinkMade = true;
    $('#skipTutorialBtn').style.display = 'none';
    generateOrders(1);
    startOrderTimer();
    showMessage('🍹 已跳过引导，进入自由调酒模式！', true);
  }

  function init() {
    initCabinet();
    showTutorialStep();
    setTimeout(() => advanceTutorial(), 2000);

    // 跳过引导按钮
    const skipBtn = $('#skipTutorialBtn');
    skipBtn.style.display = 'block';
    skipBtn.addEventListener('click', skipTutorial);

    // 冰柜图片加载后同步宽度
    const freezerImg = document.querySelector('#iceSlot img');
    const sinkImg = document.querySelector('#sinkSlot img');
    function doSync() {
      syncSinkWidth();
      renderCabinet();
    }
    if (sinkImg.complete) { doSync(); }
    else { sinkImg.addEventListener('load', doSync); }
    if (freezerImg && !freezerImg.complete) { freezerImg.addEventListener('load', doSync); }
    // 延迟再同步一次确保布局稳定
    setTimeout(doSync, 200);

    // 窗口大小变化时重新计算
    window.addEventListener('resize', () => {
      syncSinkWidth();
      const oldCols = GRID_COLS, oldRows = GRID_ROWS;
      calcGridSize();
      if (GRID_COLS !== oldCols || GRID_ROWS !== oldRows) {
        state.grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
        state.cabinetItems.forEach(item => {
          if (item.removed || item.gridCol === undefined) return;
          const dim = parseDim(item.size);
          if (canPlace(item.gridCol, item.gridRow, dim.w, dim.h)) {
            occupyGrid(item.gridCol, item.gridRow, dim.w, dim.h, item.id);
          } else {
            const pos = findFreePos(dim.w, dim.h);
            if (pos) {
              item.gridCol = pos.col; item.gridRow = pos.row;
              occupyGrid(pos.col, pos.row, dim.w, dim.h, item.id);
            }
          }
        });
      }
      renderCabinet();
    });
  }

  init();

  // 通知预加载器：游戏已初始化，可以检查动态图片
  if (window.__onGameReady) window.__onGameReady();
})();
