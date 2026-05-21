(function () {
  'use strict';

  const { SECTORS, STOCK_SECTOR_IDS, WORLD_EVENTS, LINKED_EVENTS, getSector, getEventLabel } =
    window.InvestEvents;

  const STOCK_NAMES = [
    '青岚灵草', '万愈丹业', '凝魂药剂', '幻梦药行', '炽血膏剂', '清瘴灵药', '星萃药研', '枯荣药谷', '愈神药业', '幽影秘药', '沐光药坊', '蚀毒制药', '仙霖灵药', '玄髓膏业', '灵息饮片',
    '熔星炼金', '幻晶造物', '秘银工坊', '苍炎炼金', '符文铸艺', '碎界法器', '辉石炼制', '玄铁熔造', '咒具实业', '万象炼金', '凝玉精工', '暗金锻造', '灵纹造物', '神冶炼金', '雾海铸器',
    '狂锋佣兵', '苍鹰战团', '陨星猎盟', '黑岩护卫', '凌风斥候', '赤焰战旅', '冥影猎团', '破晓武盟', '裂风征伐', '玄甲护卫', '孤狼佣社', '雷霆战锋', '密林猎踪', '王城武备', '沧澜战盟',
    '赤晶矿业', '陨铁矿源', '墨玉原石', '灵砂资源', '寒髓矿场', '曜石能源', '翠晶矿企', '黑烬矿脉', '琉璃矿业', '风晶矿产', '地底玄金', '霜石资源', '烈岩矿业', '幻玉矿场', '星髓矿源',
    '仙味居饮', '灵谷膳业', '醉风酒坊', '珍馐灵厨', '蜜露茶饮', '兽肉膳品', '云汐食铺', '醇酿商行', '灵果鲜食', '山海珍味', '清欢茶寮', '炽香膳坊', '秘境食业', '琼浆酒业', '谷灵餐饮',
    '耀光魔导', '虚空法研', '风语魔能', '雷霆魔源', '冰魄法企', '咒力能源', '星辰魔核', '暗域法能', '晨光魔研', '万象法域',
    '跨域商行', '秘境通途', '万国珍贸', '流云商社', '瀚海商旅',
    '浮空城筑', '魔纹营建', '古域城造', '灵木建工', '壁垒城建',
    '灵宠繁育', '幻兽驯养', '翼兽商行', '凶兽驯养', '神骑牧业',
  ];

  const LOT_SIZES = [1, 10, 100, 1000, 10000];
  const LISTED_COUNT = 10;
  const CHART_STEPS = 120;
  const INITIAL_CASH = 10000;
  const WORLD_EVENT_DAYS_MIN = 1;
  const WORLD_EVENT_DAYS_MAX = 5;
  const GURU_BRIBE_BASE = 50000;

  const GURU_HINTS = [
    '任何时候，都要关注股价为奇数的股票...',
    '魔药有副作用，连续上涨3次后，最好抛掉...',
    '【炼金变异】时，小心股价为偶数的股票...',
    '矿产资源总是有限的，连续上涨3次后，可能会暴跌...',
    '餐饮市场很大，跌幅总是最小的...',
    '【禁术暴走】是好消息...',
    '【炼金爆炸】非常严重，如果持股，亏本也要卖出去...',
    '【魔力涌动】是好消息...',
    '城建板块一般不会连续下跌超过2次，再观望观望...',
    '炼金行业的波动很大，不过如果你想赌一把的话...',
    '魔药行业适合新手碰碰运气...',
    '军事可以说一本万利，这世界怎么了...',
    '矿产受世界影响是最小的，如果你不关注新闻，可以试试...',
    '餐饮行业长久不衰，别害怕...',
    '魔导板块是最危险的，也是最诱人的，如果你想一步登天...',
    '商贸受世界影响最大，如果掌握了王国的战况，一切都变得简单了...',
    '宠物板块很简单，适合积累财富...',
  ];

  const $ = (sel) => document.querySelector(sel);

  const openOverlay = $('#openOverlay');
  const gameShell = $('#gameShell');
  const openAccountBtn = $('#openAccountBtn');
  const stockTableBody = $('#stockTableBody');
  const chartTitle = $('#chartTitle');
  const chartPrice = $('#chartPrice');
  const priceChart = $('#priceChart');
  const cashDisplay = $('#cashDisplay');
  const holdingsValueEl = $('#holdingsValue');
  const totalAssetsEl = $('#totalAssets');
  const selectedStockInfo = $('#selectedStockInfo');
  const tradingDayDisplay = $('#tradingDayDisplay');
  const worldEventDisplay = $('#worldEventDisplay');
  const lotBtns = $('#lotBtns');
  const buyBtn = $('#buyBtn');
  const sellBtn = $('#sellBtn');
  const nextDayBtn = $('#nextDayBtn');
  const eventLog = $('#eventLog');
  const guruBribe = $('#guruBribe');
  const guruBribeTip = $('#guruBribeTip');

  const ctx = priceChart.getContext('2d');

  const stockPool = new Map();
  STOCK_NAMES.forEach((name, i) => {
    stockPool.set(i, {
      id: i,
      name,
      sector: STOCK_SECTOR_IDS[i],
    });
  });

  function randomStartPrice() {
    return Math.floor(Math.random() * 40) + 1;
  }

  let listed = [];
  let selectedId = null;
  let cash = INITIAL_CASH;
  const holdings = new Map();
  let lotSize = 1;
  let gameStarted = false;
  let tradingDay = 0;

  /** @type {{ world: object, tickCtx: object, daysLeft: number } | null} */
  let activeWorld = null;
  let guruBribeCost = GURU_BRIBE_BASE;

  function collatzNextInt(n) {
    if (n % 2 === 0) return n / 2;
    return 3 * n + 1;
  }

  function computeCollatzPath(startPrice) {
    const path = [startPrice];
    let n = startPrice;
    while (n > 1) {
      n = collatzNextInt(n);
      path.push(n);
    }
    return path;
  }

  function getPreviewHalf(path) {
    const len = Math.max(2, Math.ceil(path.length / 2));
    return path.slice(0, len);
  }

  function roundPrice(n) {
    return Math.max(1, Math.round(n * 10) / 10);
  }

  function isEven(n) {
    return Math.round(n * 10) % 2 === 0;
  }

  function forceEven(n) {
    return isEven(n) ? n : roundPrice(n - 1);
  }

  function formatMoney(n) {
    return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPct(pct) {
    const sign = pct > 0 ? '+' : '';
    return sign + pct.toFixed(2) + '%';
  }

  function getHolding(id) {
    return holdings.get(id) || 0;
  }

  function getListedStock(id) {
    return listed.find((s) => s.id === id);
  }

  function pickRandomUnlisted() {
    const listedIds = new Set(listed.map((s) => s.id));
    const available = [];
    stockPool.forEach((stock) => {
      if (!listedIds.has(stock.id)) available.push(stock);
    });
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  function setupListedEntry(stock) {
    const startPrice = randomStartPrice();
    const path = computeCollatzPath(startPrice);
    const preview = getPreviewHalf(path);
    const last = preview[preview.length - 1];
    return {
      id: stock.id,
      sector: stock.sector,
      price: last,
      prevPrice: last,
      history: preview.slice(),
      consecutiveUp: 0,
      depletion: 0,
      consecutiveEven: 0,
      freezeTicks: 0,
      veinTicks: 0,
      forceDelist: false,
      previewMode: true,
    };
  }

  function initListedStocks() {
    const ids = Array.from(stockPool.keys());
    shuffle(ids);
    listed = ids.slice(0, LISTED_COUNT).map((id) => setupListedEntry(stockPool.get(id)));
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function dayLabel() {
    return tradingDay > 0 ? '第 ' + tradingDay + ' 交易日' : '上市观望';
  }

  function addEvent(type, text) {
    if (type !== 'world' && type !== 'sector' && type !== 'hint') return;
    const div = document.createElement('div');
    div.className = 'event-item event-' + type;
    div.textContent = dayLabel() + ' ' + text;
    eventLog.insertBefore(div, eventLog.firstChild);
    while (eventLog.children.length > 50) {
      eventLog.removeChild(eventLog.lastChild);
    }
  }

  function showTradeHint(text) {
    selectedStockInfo.textContent = text;
  }

  function updateGuruBribeTip() {
    guruBribeTip.textContent =
      '把股神灌醉，' +
      guruBribeCost.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 });
  }

  function buyGuruHint() {
    if (!gameStarted) return;
    if (cash < guruBribeCost) {
      showTradeHint('现金不足，无法请股神喝酒（需要 ' + formatMoney(guruBribeCost) + '）');
      return;
    }
    cash -= guruBribeCost;
    const hint = GURU_HINTS[Math.floor(Math.random() * GURU_HINTS.length)];
    const body = hint.endsWith('。') ? hint : hint + '。';
    addEvent('hint', '【股神的暗示】：' + body);
    guruBribeCost *= 2;
    updateGuruBribeTip();
    renderAccount();
  }

  function createEmptyTickCtx() {
    return {
      sectorEvents: new Map(),
      linkedEvents: new Map(),
      constructionForceDrop: false,
      logged: new Set(),
    };
  }

  function buildTickCtxFromWorld(world) {
    const tickCtx = createEmptyTickCtx();
    if (!world) return tickCtx;

    if (world.constructionForceDrop) tickCtx.constructionForceDrop = true;

    world.sectorEvents.forEach(({ sector, event }) => {
      if (!tickCtx.sectorEvents.has(sector)) tickCtx.sectorEvents.set(sector, new Set());
      tickCtx.sectorEvents.get(sector).add(event);

      const links = LINKED_EVENTS[event];
      if (links) {
        links.forEach(({ sector: ls, event: le }) => {
          if (!tickCtx.linkedEvents.has(ls)) tickCtx.linkedEvents.set(ls, new Set());
          tickCtx.linkedEvents.get(ls).add(le);
        });
      }
    });

    return tickCtx;
  }

  function cloneTickCtx(ctx) {
    const sectorEvents = new Map();
    ctx.sectorEvents.forEach((set, k) => sectorEvents.set(k, new Set(set)));
    const linkedEvents = new Map();
    ctx.linkedEvents.forEach((set, k) => linkedEvents.set(k, new Set(set)));
    return {
      sectorEvents,
      linkedEvents,
      constructionForceDrop: ctx.constructionForceDrop,
      logged: new Set(),
    };
  }

  function getListedSectorIds() {
    const ids = new Set();
    listed.forEach((s) => ids.add(s.sector));
    return ids;
  }

  function formatWorldNewsMessage(world) {
    const listedSectors = getListedSectorIds();
    const sectorImpacts = [];
    const seen = new Set();

    function pushSectorImpact(sectorId, eventId) {
      if (!listedSectors.has(sectorId)) return;
      const key = sectorId + ':' + eventId;
      if (seen.has(key)) return;
      seen.add(key);
      sectorImpacts.push('【' + getEventLabel(eventId) + '】');
    }

    const showForceDrop =
      world.constructionForceDrop && listedSectors.has('construction');

    world.sectorEvents.forEach(({ sector, event }) => {
      pushSectorImpact(sector, event);
      const links = LINKED_EVENTS[event];
      if (links) links.forEach(({ sector: ls, event: le }) => pushSectorImpact(ls, le));
    });

    let text = '新闻：【' + world.name + '】';
    if (!showForceDrop && sectorImpacts.length === 0) return text;

    let impactText = '';
    if (showForceDrop) impactText = '城建强跌';
    if (sectorImpacts.length > 0) {
      const eventsText = sectorImpacts.join('、');
      impactText = impactText ? impactText + '，' + eventsText : eventsText;
    }
    return text + '，影响：' + impactText + '。';
  }

  function pickRandomWorldEvent() {
    return WORLD_EVENTS[Math.floor(Math.random() * WORLD_EVENTS.length)];
  }

  function pickRandomWorldEventDays() {
    return (
      WORLD_EVENT_DAYS_MIN +
      Math.floor(Math.random() * (WORLD_EVENT_DAYS_MAX - WORLD_EVENT_DAYS_MIN + 1))
    );
  }

  function startWorldEvent(world) {
    activeWorld = {
      world,
      tickCtx: buildTickCtxFromWorld(world),
      daysLeft: pickRandomWorldEventDays(),
    };
    addEvent('world', formatWorldNewsMessage(world));
    updateWorldDisplay();
  }

  function updateWorldDisplay() {
    if (!activeWorld || !activeWorld.world) {
      worldEventDisplay.textContent = '暂无世界事件';
      return;
    }
    worldEventDisplay.textContent =
      activeWorld.world.name + ' · 剩余 ' + activeWorld.daysLeft + ' 个交易日';
  }

  function updateTradingDayDisplay() {
    tradingDayDisplay.textContent = tradingDay > 0 ? '第 ' + tradingDay + ' 交易日' : '第 0 日 · 上市观望';
  }

  function applyForceDrop(stock) {
    let n = stock.price;
    if (!isEven(n)) n = roundPrice(n - 1);
    stock.price = roundPrice(n / 2);
  }

  function createTickMods() {
    return {
      forceEven: false,
      odd: null,
      even: null,
      multiply: null,
      divide: null,
      setPrice: null,
      skipCollatz: false,
    };
  }

  function mergeMods(mods, patch) {
    Object.assign(mods, patch);
  }

  function applyDirectMods(stock, mods) {
    if (mods.setPrice != null) {
      stock.price = roundPrice(mods.setPrice);
      return true;
    }
    if (mods.multiply != null) {
      stock.price = roundPrice(stock.price * mods.multiply);
      return !!mods.skipCollatz;
    }
    if (mods.divide != null) {
      stock.price = roundPrice(stock.price / mods.divide);
      return !!mods.skipCollatz;
    }
    return false;
  }

  function applyCollatzWithMods(stock, mods) {
    if (stock.freezeTicks > 0) {
      stock.freezeTicks--;
      return;
    }

    let n = stock.price;
    if (mods.forceEven) n = forceEven(n);

    if (stock.veinTicks > 0) {
      if (isEven(n)) n = roundPrice(n - 1);
      stock.veinTicks--;
    }

    const even = isEven(n);
    if (even) {
      if (stock.sector === 'construction') {
        stock.consecutiveEven++;
        if (stock.consecutiveEven >= 2) {
          stock.freezeTicks = 2;
          stock.consecutiveEven = 0;
          return;
        }
      }
      if (mods.even) stock.price = roundPrice(mods.even(n));
      else stock.price = roundPrice(n / 2);
    } else {
      stock.consecutiveEven = 0;
      if (mods.odd) stock.price = roundPrice(mods.odd(n));
      else stock.price = roundPrice(3 * n + 1);
    }
  }

  function applyAccidentalEvent(stock, eventId, mods) {
    switch (eventId) {
      case 'breakthrough':
        mergeMods(mods, { odd: (n) => 4 * n + 1 });
        break;
      case 'mutation':
        mergeMods(mods, { odd: (n) => 5 * n + 1, even: (n) => n / 4 });
        break;
      case 'explosion':
        mergeMods(mods, { setPrice: 1, skipCollatz: true });
        stock.forceDelist = true;
        break;
      case 'war':
        mergeMods(mods, { odd: (n) => 6 * n + 1 });
        break;
      case 'peace':
        mergeMods(mods, { even: (n) => roundPrice(n / 3) });
        break;
      case 'vein':
        stock.veinTicks = 2;
        break;
      case 'plague':
        mergeMods(mods, { forceEven: true });
        break;
      case 'manaSurge':
        mergeMods(mods, { odd: (n) => 5 * n + 1 });
        break;
      case 'manaDry':
        mergeMods(mods, { even: (n) => n / 4 });
        break;
      case 'forbidden':
        mergeMods(mods, { multiply: 5, skipCollatz: true });
        break;
      case 'bubble':
        mergeMods(mods, { divide: 4, skipCollatz: true });
        break;
      case 'rareBeast':
        mergeMods(mods, { multiply: 5, skipCollatz: true });
        break;
      case 'beastTide':
        mergeMods(mods, { divide: 5, skipCollatz: true });
        break;
      default:
        break;
    }
  }

  function chainEven(mods, fn) {
    const prev = mods.even;
    mods.even = (n) => fn(prev ? prev(n) : n);
  }

  function applyStableMods(stock, mods) {
    if (stock.sector === 'medicine' && stock.consecutiveUp >= 3) {
      chainEven(mods, (n) => roundPrice(n / 3));
    }
    if (stock.sector === 'mining' && stock.depletion >= 3) {
      chainEven(mods, (n) => roundPrice(n / 5));
    }
    if (stock.sector === 'food') {
      mods.even = (n) => roundPrice(n * 0.75);
    }
    if (stock.sector === 'trade' && mods._tradeBoom) {
      mods.odd = (n) => 4 * n + 1;
    }
    if (stock.sector === 'trade' && mods._roadBlock) {
      chainEven(mods, (n) => roundPrice(n / 4));
    }
  }

  function processStockTick(stock, tickCtx) {
    stock.prevPrice = stock.price;
    stock.forceDelist = false;
    stock.previewMode = false;
    const mods = createTickMods();

    if (tickCtx.constructionForceDrop && stock.sector === 'construction') {
      applyForceDrop(stock);
    }

    const sectorEvents = tickCtx.sectorEvents.get(stock.sector);
    if (sectorEvents) {
      sectorEvents.forEach((eventId) => applyAccidentalEvent(stock, eventId, mods));
    }

    const linked = tickCtx.linkedEvents.get(stock.sector);
    if (linked) {
      linked.forEach((eventId) => {
        if (eventId === 'tradeBoom') mods._tradeBoom = true;
        if (eventId === 'roadBlock') mods._roadBlock = true;
        applyAccidentalEvent(stock, eventId, mods);
      });
    }

    if (applyDirectMods(stock, mods)) {
      return finishStockStep(stock);
    }

    applyStableMods(stock, mods);
    applyCollatzWithMods(stock, mods);
    return finishStockStep(stock);
  }

  function finishStockStep(stock) {
    stock.price = roundPrice(stock.price);

    if (stock.price > stock.prevPrice) {
      stock.consecutiveUp++;
      if (stock.sector === 'mining') stock.depletion++;
    } else {
      stock.consecutiveUp = 0;
    }

    stock.history.push(stock.price);
    if (stock.history.length > CHART_STEPS) stock.history.shift();
  }

  function delistAndReplace(index) {
    const removed = listed[index];
    const meta = stockPool.get(removed.id);
    const owned = getHolding(removed.id);
    if (owned > 0) {
      cash += owned;
      holdings.delete(removed.id);
    }

    const replacement = pickRandomUnlisted();
    if (replacement) {
      const entry = setupListedEntry(replacement);
      listed[index] = entry;
      if (selectedId === removed.id) selectedId = replacement.id;
    } else {
      listed.splice(index, 1);
      if (selectedId === removed.id) selectedId = listed[0]?.id ?? null;
    }
  }

  function advanceTradingDay() {
    if (!gameStarted) return;

    if (activeWorld && activeWorld.daysLeft === 0) {
      startWorldEvent(pickRandomWorldEvent());
    }

    tradingDay++;
    updateTradingDayDisplay();

    const tickCtx =
      activeWorld && activeWorld.daysLeft > 0
        ? cloneTickCtx(activeWorld.tickCtx)
        : createEmptyTickCtx();

    const toDelist = [];

    listed.forEach((stock, index) => {
      processStockTick(stock, tickCtx);
      if (stock.forceDelist || stock.price <= 1) {
        stock.price = 1;
        toDelist.push(index);
      }
    });

    toDelist.sort((a, b) => b - a);
    toDelist.forEach((idx) => delistAndReplace(idx));

    if (activeWorld && activeWorld.daysLeft > 0) {
      activeWorld.daysLeft--;
      updateWorldDisplay();
    }

    renderAll();
  }

  function getHoldingsValue() {
    let total = 0;
    holdings.forEach((shares, id) => {
      const stock = getListedStock(id);
      if (stock) total += shares * stock.price;
    });
    return total;
  }

  function getTotalAssets() {
    return cash + getHoldingsValue();
  }

  function selectStock(id) {
    selectedId = id;
    const stock = getListedStock(id);
    const meta = stockPool.get(id);
    if (!stock || !meta) return;

    buyBtn.disabled = false;
    sellBtn.disabled = false;
    updateSelectedInfo();
    renderChart();
    renderStockTable();
  }

  function updateSelectedInfo() {
    if (selectedId == null) {
      selectedStockInfo.textContent = '未选择股票';
      return;
    }
    const stock = getListedStock(selectedId);
    const meta = stockPool.get(selectedId);
    if (!stock || !meta) return;
    const sector = getSector(stock.sector);
    const previewNote = stock.previewMode ? ' · 预览中' : '';
    selectedStockInfo.textContent =
      meta.name +
      ' · ' +
      (sector ? sector.short : '') +
      ' · ¥' +
      stock.price +
      previewNote +
      ' · 持股 ' +
      getHolding(selectedId) +
      ' 股 · 单次 ' +
      lotSize +
      ' 股';
  }

  function buy() {
    if (selectedId == null) return;
    const stock = getListedStock(selectedId);
    const meta = stockPool.get(selectedId);
    if (!stock || !meta) return;

    const cost = stock.price * lotSize;
    if (cash < cost) {
      showTradeHint('现金不足，无法买入');
      return;
    }

    cash -= cost;
    holdings.set(selectedId, getHolding(selectedId) + lotSize);
    showTradeHint('已买入 ' + meta.name + ' ' + lotSize + ' 股，花费 ' + formatMoney(cost));
    renderAll();
  }

  function sell() {
    if (selectedId == null) return;
    const stock = getListedStock(selectedId);
    const meta = stockPool.get(selectedId);
    if (!stock || !meta) return;

    const owned = getHolding(selectedId);
    if (owned < lotSize) {
      showTradeHint('持股不足，无法卖出');
      return;
    }

    const revenue = stock.price * lotSize;
    cash += revenue;
    const remaining = owned - lotSize;
    if (remaining === 0) holdings.delete(selectedId);
    else holdings.set(selectedId, remaining);

    showTradeHint('已卖出 ' + meta.name + ' ' + lotSize + ' 股，收入 ' + formatMoney(revenue));
    renderAll();
  }

  function renderStockTable() {
    stockTableBody.innerHTML = '';
    listed.forEach((stock) => {
      const meta = stockPool.get(stock.id);
      const sector = getSector(stock.sector);
      const change =
        stock.prevPrice && !stock.previewMode
          ? ((stock.price - stock.prevPrice) / stock.prevPrice) * 100
          : 0;
      const changeClass =
        stock.previewMode ? 'change-flat' : change > 0 ? 'change-up' : change < 0 ? 'change-down' : 'change-flat';
      const changeText = stock.previewMode ? '—' : formatPct(change);
      const tr = document.createElement('tr');
      if (stock.id === selectedId) tr.classList.add('selected');
      tr.innerHTML =
        '<td class="stock-name">' +
        meta.name +
        '</td>' +
        '<td class="stock-sector">' +
        (sector ? sector.short : '') +
        '</td>' +
        '<td>' +
        stock.price +
        '</td>' +
        '<td class="' +
        changeClass +
        '">' +
        changeText +
        '</td>' +
        '<td>' +
        getHolding(stock.id) +
        '</td>';
      tr.addEventListener('click', () => selectStock(stock.id));
      stockTableBody.appendChild(tr);
    });
  }

  function renderAccount() {
    const hv = getHoldingsValue();
    cashDisplay.textContent = formatMoney(cash);
    holdingsValueEl.textContent = formatMoney(hv);
    totalAssetsEl.textContent = formatMoney(getTotalAssets());
    updateSelectedInfo();
    updateTradingDayDisplay();
    updateWorldDisplay();

    if (selectedId != null) {
      const stock = getListedStock(selectedId);
      buyBtn.disabled = !stock || cash < stock.price * lotSize;
      sellBtn.disabled = !stock || getHolding(selectedId) < lotSize;
    }
  }

  function renderChart() {
    if (selectedId == null) {
      chartTitle.textContent = '请选择股票';
      chartPrice.textContent = '';
      chartPrice.className = 'chart-price';
      drawChart([]);
      return;
    }

    const stock = getListedStock(selectedId);
    const meta = stockPool.get(selectedId);
    if (!stock || !meta) return;

    const sector = getSector(stock.sector);
    const change =
      stock.prevPrice && !stock.previewMode
        ? ((stock.price - stock.prevPrice) / stock.prevPrice) * 100
        : 0;
    const previewTag = stock.previewMode ? ' · 半程预览' : '';
    chartTitle.textContent = meta.name + (sector ? ' · ' + sector.name : '') + previewTag;
    chartPrice.textContent = stock.previewMode
      ? '¥' + stock.price + ' · 观望'
      : '¥' + stock.price + '  ' + formatPct(change);
    chartPrice.className =
      'chart-price ' + (stock.previewMode ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat');

    drawChart(stock.history, stock.previewMode);
  }

  function drawChart(prices, isPreview) {
    const dpr = window.devicePixelRatio || 1;
    const rect = priceChart.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;

    priceChart.width = w * dpr;
    priceChart.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (prices.length === 0) {
      ctx.fillStyle = '#4a5568';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无走势数据', w / 2, h / 2);
      return;
    }

    const pad = { top: 16, right: 16, bottom: 28, left: 48 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    const xSpan = CHART_STEPS - 1;

    let minP = Math.min(...prices);
    let maxP = Math.max(...prices);
    if (minP === maxP) {
      minP = Math.max(1, minP - 1);
      maxP = maxP + 1;
    }

    const xAt = (step) => pad.left + (step / xSpan) * plotW;
    const yAt = (p) => pad.top + plotH - ((p - minP) / (maxP - minP)) * plotH;

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
    }

    [0, 30, 60, 90, 120].forEach((step) => {
      const x = xAt(step);
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + plotH);
      ctx.stroke();
    });

    ctx.fillStyle = '#718096';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = maxP - ((maxP - minP) * i) / 4;
      const y = pad.top + (plotH * i) / 4;
      ctx.fillText(Math.round(val).toString(), pad.left - 6, y + 3);
    }

    ctx.textAlign = 'center';
    [0, 30, 60, 90, 120].forEach((step) => {
      ctx.fillText(String(step), xAt(step), pad.top + plotH + 16);
    });

    const last = prices[prices.length - 1];
    const prev = prices.length > 1 ? prices[prices.length - 2] : last;
    const lineColor = isPreview ? '#63b3ed' : last >= prev ? '#fc8181' : '#68d391';
    const lastStep = prices.length - 1;

    if (prices.length >= 2) {
      ctx.beginPath();
      prices.forEach((p, i) => {
        const x = xAt(i);
        const y = yAt(p);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.setLineDash(isPreview ? [6, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);

      if (!isPreview) {
        ctx.lineTo(xAt(lastStep), pad.top + plotH);
        ctx.lineTo(xAt(0), pad.top + plotH);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
        grad.addColorStop(0, last >= prev ? 'rgba(252,129,129,0.25)' : 'rgba(104,211,145,0.25)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    ctx.beginPath();
    ctx.arc(xAt(lastStep), yAt(last), 4, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();

    if (isPreview) {
      ctx.fillStyle = '#63b3ed';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('考拉兹半程预览 · 点击「下一交易日」开始交易', xAt(0) + 6, pad.top + 14);
    }
  }

  function renderAll() {
    renderStockTable();
    renderAccount();
    renderChart();
  }

  function initLotButtons() {
    LOT_SIZES.forEach((size) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lot-btn' + (size === lotSize ? ' active' : '');
      btn.textContent = size >= 10000 ? size / 10000 + '万' : String(size);
      btn.addEventListener('click', () => {
        lotSize = size;
        lotBtns.querySelectorAll('.lot-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderAccount();
      });
      lotBtns.appendChild(btn);
    });
  }

  function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    openOverlay.classList.add('hidden');
    gameShell.hidden = false;

    tradingDay = 0;
    guruBribeCost = GURU_BRIBE_BASE;
    updateGuruBribeTip();
    initListedStocks();

    startWorldEvent(pickRandomWorldEvent());
    updateTradingDayDisplay();

    if (listed.length > 0) selectStock(listed[0].id);

    renderAll();
  }

  function onResize() {
    renderChart();
  }

  openAccountBtn.addEventListener('click', startGame);
  buyBtn.addEventListener('click', buy);
  sellBtn.addEventListener('click', sell);
  nextDayBtn.addEventListener('click', advanceTradingDay);
  guruBribe.addEventListener('click', buyGuruHint);

  updateGuruBribeTip();
  initLotButtons();
  window.addEventListener('resize', onResize);
})();
