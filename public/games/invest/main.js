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
  const PREVIEW_STEPS = 10;
  const CHALK = {
    axis: 'rgba(232, 228, 218, 0.9)',
    grid: 'rgba(232, 228, 218, 0.38)',
    line: '#f5f2eb',
    text: '#ebe6dc',
  };
  const INITIAL_CASH = 10000;
  const WORLD_EVENT_DAYS_MIN = 1;
  const WORLD_EVENT_DAYS_MAX = 5;
  const GURU_BRIBE_BASE = 50000;

  const BOOK_FRAME_W = 190;
  const BOOK_FRAME_H = 160;
  const BOOK_SPRITE_SCALE = 3.2;
  const BOOK_OPEN_FRAMES = [0, 1, 2, 3];
  const BOOK_REST_FRAME = 3;
  const BOOK_FRAME_MS = 200;

  const GURU_HINTS = [
    '任何时候，都要关注股价为奇数的股票...',
    '魔药有副作用，连续上涨3次后，最好抛掉...',
    '【炼金变异】时，小心股价为偶数的股票...',
    '矿产资源总是有限的，连续上涨3次后，可能会暴跌...',
    '餐饮市场很大，跌幅总是最小的...',
    '【禁术暴走】是好消息...',
    '【炼金爆炸】非常严重，如果持股，亏本也要卖出去...',
    '【魔力涌动】是好消息...',
    '城建板块一般不会连续下跌或上涨超过2次，再观望观望...',
    '炼金行业的波动很大，不过如果你想赌一把的话...',
    '魔药行业适合新手碰碰运气...',
    '裁军的后果非常严重，如果涨了尽快卖掉...',
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
  const accountBookBtn = $('#accountBookBtn');
  const bookModal = $('#bookModal');
  const bookModalBackdrop = $('#bookModalBackdrop');
  const bookModalSprite = $('#bookModalSprite');
  const bookModalContent = $('#bookModalContent');
  const bookModalPages = $('#bookModalPages');
  const bookModalHintLeft = $('#bookModalHintLeft');
  const bookModalHintRight = $('#bookModalHintRight');

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
    return Math.floor(Math.random() * 39) + 2;
  }

  let listed = [];
  let selectedId = null;
  let cash = INITIAL_CASH;
  const holdings = new Map();
  let lotSize = 1;
  let sellAllBtn = null;
  let gameStarted = false;
  let tradingDay = 0;

  /** @type {{ world: object, tickCtx: object, daysLeft: number } | null} */
  let activeWorld = null;
  let guruBribeCost = GURU_BRIBE_BASE;
  /** @type {number[]} */
  let guruHintPool = [];
  let lastGuruHintIdx = -1;
  /** @type {string[]} */
  let bookHints = [];

  function priceSeqNext(n) {
    if (isEven(n)) return roundPrice(n / 2);
    return roundPrice(3 * n + 1);
  }

  function computeCollatzPath(startPrice) {
    const path = [roundPrice(startPrice)];
    let n = path[0];
    let guard = 0;
    while (n > 1 && guard++ < 500) {
      n = priceSeqNext(n);
      path.push(n);
    }
    return path;
  }

  function getPreviewSteps(path) {
    const len = Math.min(path.length, PREVIEW_STEPS + 1);
    return path.slice(0, Math.max(2, len));
  }

  function roundPrice(n) {
    return Math.max(1, Math.round(n * 10) / 10);
  }

  function isEven(n) {
    const tenths = Math.round(n * 10);
    if (tenths % 10 === 0) return (tenths / 10) % 2 === 0;
    return tenths % 2 === 0;
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
    const preview = getPreviewSteps(path);
    const last = preview[preview.length - 1];
    return {
      id: stock.id,
      sector: stock.sector,
      collatzResult: last,
      price: last,
      prevPrice: last,
      history: preview.slice(),
      consecutiveUp: 0,
      depletion: 0,
      consecutiveEven: 0,
      consecutiveOdd: 0,
      freezeTicks: 0,
      expansionPending: null,
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
    if (type !== 'world' && type !== 'sector') return;
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

  function formatGuruHintText(hint) {
    const body = hint.endsWith('。') ? hint : hint + '。';
    return '【股神的暗示】：' + body;
  }

  function guruHintBody(hint) {
    return hint.endsWith('。') ? hint : hint + '。';
  }

  let bookModalAnimTimer = null;

  function getBookModalStage() {
    return bookModal?.querySelector('.book-modal-stage');
  }

  function getBookModalScale() {
    const stage = getBookModalStage();
    if (!stage) return BOOK_SPRITE_SCALE;
    return parseFloat(getComputedStyle(stage).getPropertyValue('--book-modal-scale')) || BOOK_SPRITE_SCALE;
  }

  function applyBookModalScale(scale) {
    const stage = getBookModalStage();
    if (stage) stage.style.setProperty('--book-modal-scale', String(scale));
  }

  function setBookModalScale(scale) {
    applyBookModalScale(scale);
    setBookModalFrame(BOOK_REST_FRAME);
  }

  function setBookModalFrame(frameIndex) {
    if (!bookModalSprite) return;
    const x = frameIndex * BOOK_FRAME_W * getBookModalScale();
    bookModalSprite.style.transform = `translate3d(-${x}px, 0, 0)`;
  }

  function bookModalPagesOverflow() {
    if (!bookModalPages) return true;
    return (
      bookModalPages.scrollHeight > bookModalPages.clientHeight + 1 ||
      bookModalPages.scrollWidth > bookModalPages.clientWidth + 1
    );
  }

  function bookModalLeftPageOverflow() {
    const page = bookModalHintLeft?.closest('.book-modal-page--left');
    if (!page) return false;
    return page.scrollHeight > page.clientHeight + 1;
  }

  function layoutHintsOnBookPages(hints) {
    if (!bookModalHintLeft || !bookModalHintRight || !bookModalPages) return;

    const list = hints.length ? hints : [];
    const renderList = (items) =>
      items.map((hint) => '<li>' + guruHintBody(hint) + '</li>').join('');

    if (list.length === 0) {
      bookModalHintLeft.innerHTML = '<li class="book-modal-empty">书本还是空的，请先请股神喝杯酒…</li>';
      bookModalHintRight.innerHTML = '';
      bookModalHintRight.removeAttribute('start');
      bookModalPages.classList.add('book-modal-pages--right-empty');
      return;
    }

    let splitAt = list.length;
    bookModalHintRight.innerHTML = '';

    for (let i = 1; i <= list.length; i++) {
      bookModalHintLeft.innerHTML = renderList(list.slice(0, i));
      if (bookModalLeftPageOverflow()) {
        splitAt = i - 1;
        break;
      }
      splitAt = i;
    }

    const leftHints = list.slice(0, splitAt);
    const rightHints = list.slice(splitAt);

    bookModalHintLeft.innerHTML = renderList(leftHints);

    if (rightHints.length > 0) {
      bookModalHintRight.setAttribute('start', String(splitAt + 1));
      bookModalHintRight.innerHTML = renderList(rightHints);
      bookModalPages.classList.remove('book-modal-pages--right-empty');
    } else {
      bookModalHintRight.innerHTML = '';
      bookModalHintRight.removeAttribute('start');
      bookModalPages.classList.add('book-modal-pages--right-empty');
    }
  }

  function computeBookModalScale() {
    if (!bookModalPages || !getBookModalStage()) return BOOK_SPRITE_SCALE;

    const maxW = window.innerWidth * 0.92;
    const maxH = window.innerHeight * 0.88;
    const maxScale = Math.min(8, maxW / BOOK_FRAME_W, maxH / BOOK_FRAME_H);
    let lo = 2;
    let hi = maxScale;
    let best = lo;

    while (hi - lo > 0.08) {
      const mid = (lo + hi) / 2;
      applyBookModalScale(mid);
      layoutHintsOnBookPages(bookHints);
      if (bookModalPagesOverflow()) {
        hi = mid;
      } else {
        best = mid;
        lo = mid;
      }
    }
    return best;
  }

  function prepareBookModalScale() {
    if (!bookModalContent) return BOOK_SPRITE_SCALE;

    bookModalContent.classList.remove('hidden');
    applyBookModalScale(BOOK_SPRITE_SCALE);
    layoutHintsOnBookPages(bookHints);
    if (bookHints.length === 0) {
      bookModalContent.classList.add('hidden');
      return BOOK_SPRITE_SCALE;
    }
    const scale = computeBookModalScale();
    applyBookModalScale(scale);
    layoutHintsOnBookPages(bookHints);
    bookModalContent.classList.add('hidden');
    return scale;
  }

  function stopBookModalAnim() {
    if (bookModalAnimTimer !== null) {
      clearInterval(bookModalAnimTimer);
      bookModalAnimTimer = null;
    }
  }

  function closeBookModal() {
    stopBookModalAnim();
    if (!bookModal) return;
    bookModal.classList.add('hidden');
    bookModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('book-modal-open');
    if (bookModalContent) bookModalContent.classList.add('hidden');
    applyBookModalScale(BOOK_SPRITE_SCALE);
  }

  function renderBookModalHint() {
    layoutHintsOnBookPages(bookHints);
  }

  function openBookModal() {
    if (!bookModal || !bookModalSprite || !bookModalHintLeft || !bookModalHintRight || !bookModalContent) {
      return;
    }

    renderBookModalHint();
    bookModal.classList.remove('hidden');
    bookModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('book-modal-open');

    const openScale = bookHints.length > 0 ? prepareBookModalScale() : BOOK_SPRITE_SCALE;
    applyBookModalScale(openScale);
    bookModalContent.classList.add('hidden');

    const showContent = () => {
      setBookModalFrame(BOOK_REST_FRAME);
      bookModalContent.classList.remove('hidden');
    };

    stopBookModalAnim();
    let step = 0;
    setBookModalFrame(BOOK_OPEN_FRAMES[0]);
    bookModalAnimTimer = setInterval(() => {
      step += 1;
      if (step < BOOK_OPEN_FRAMES.length) {
        setBookModalFrame(BOOK_OPEN_FRAMES[step]);
        return;
      }
      stopBookModalAnim();
      showContent();
    }, BOOK_FRAME_MS);
  }

  function updateGuruBribeTip() {
    guruBribeTip.textContent =
      '把股神灌醉，' +
      guruBribeCost.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 });
  }

  function refillGuruHintPool() {
    guruHintPool = GURU_HINTS.map((_, i) => i);
    shuffle(guruHintPool);
    if (guruHintPool.length > 1 && guruHintPool[guruHintPool.length - 1] === lastGuruHintIdx) {
      const swapWith = Math.floor(Math.random() * (guruHintPool.length - 1));
      const last = guruHintPool.length - 1;
      [guruHintPool[last], guruHintPool[swapWith]] = [guruHintPool[swapWith], guruHintPool[last]];
    }
  }

  function pickGuruHint() {
    if (guruHintPool.length === 0) refillGuruHintPool();
    lastGuruHintIdx = guruHintPool.pop();
    return GURU_HINTS[lastGuruHintIdx];
  }

  function buyGuruHint() {
    if (!gameStarted) return;
    if (cash < guruBribeCost) {
      showTradeHint('现金不足，无法请股神喝酒（需要 ' + formatMoney(guruBribeCost) + '）');
      return;
    }
    cash -= guruBribeCost;
    const hint = pickGuruHint();
    bookHints.push(hint);
    guruBribeCost *= 2;
    updateGuruBribeTip();
    renderAccount();
    showTradeHint('股神的暗示已记入书本，点击账户区的书查看');
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

  const WORLD_EVENT_BY_ID = Object.fromEntries(WORLD_EVENTS.map((e) => [e.id, e]));

  function pickRandomWorldEvent() {
    if (Math.random() >= 0.5) return null;
    const r = Math.random();
    if (r < 0.6) return WORLD_EVENT_BY_ID.peaceful;
    if (r < 0.7) return WORLD_EVENT_BY_ID.magicTide;
    if (r < 0.8) return WORLD_EVENT_BY_ID.kingdomWar;
    if (r < 0.9) return WORLD_EVENT_BY_ID.dragonSiege;
    return WORLD_EVENT_BY_ID.worldPlague;
  }

  function pickRandomWorldEventDays() {
    return (
      WORLD_EVENT_DAYS_MIN +
      Math.floor(Math.random() * (WORLD_EVENT_DAYS_MAX - WORLD_EVENT_DAYS_MIN + 1))
    );
  }

  function startWorldEvent(world) {
    if (!world) {
      activeWorld = null;
      updateWorldDisplay();
      return;
    }
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

  function applyForceDropToCollatz(stock) {
    let n = stock.collatzResult;
    if (isEven(n)) n = roundPrice(n - 1);
    stock.collatzResult = roundPrice(n / 2);
  }

  /** @returns {{ applied: boolean, even: boolean }} */
  function applyCollatzStep(stock, preCollatz) {
    if (stock.freezeTicks > 0) {
      stock.freezeTicks--;
      return { applied: false, even: false };
    }

    if (stock.expansionPending) {
      const pending = stock.expansionPending;
      stock.expansionPending = null;
      const n = stock.collatzResult;
      stock.consecutiveEven = 0;
      stock.consecutiveOdd = 0;
      if (pending === 'forceOdd') {
        stock.collatzResult = roundPrice(3 * n + 1);
        return { applied: true, even: false };
      }
      if (pending === 'forceEven') {
        stock.collatzResult = roundPrice(n / 2);
        return { applied: true, even: true };
      }
    }

    let n = stock.collatzResult;
    if (preCollatz.forceEven) n = forceEven(n);
    if (preCollatz.forceOdd && isEven(n)) n = roundPrice(n - 1);

    const even = isEven(n);
    if (even) {
      if (stock.sector === 'construction') {
        stock.consecutiveOdd = 0;
        stock.consecutiveEven++;
        if (stock.consecutiveEven >= 2) {
          stock.freezeTicks = 2;
          stock.consecutiveEven = 0;
          stock.expansionPending = 'forceOdd';
          return { applied: false, even: true };
        }
      }
      stock.collatzResult = roundPrice(n / 2);
      return { applied: true, even: true };
    }

    if (stock.sector === 'construction') {
      stock.consecutiveOdd++;
      if (stock.consecutiveOdd >= 3) {
        stock.freezeTicks = 2;
        stock.consecutiveOdd = 0;
        stock.expansionPending = 'forceEven';
        return { applied: false, even: false };
      }
    }

    stock.consecutiveEven = 0;
    stock.collatzResult = roundPrice(3 * n + 1);
    return { applied: true, even: false };
  }

  function applyStablePhase(stock, stepInfo, tick) {
    if (stock.sector === 'medicine' && stock.consecutiveUp >= 3) {
      tick.marketModifier *= 0.2;
    }
    if (stock.sector === 'mining' && stock.depletion >= 3) {
      tick.marketModifier *= 0.05;
    }
    if (stock.sector === 'food' && stepInfo.applied && stepInfo.even) {
      tick.marketModifier *= 1.1;
    }
  }

  function applyAccidentalEvent(stock, eventId, stepInfo, tick) {
    switch (eventId) {
      case 'breakthrough':
        tick.marketModifier *= 1.1;
        break;
      case 'mutation':
        if (stepInfo.applied && stepInfo.even) {
          tick.marketModifier *= 0.4;
        } else if (stepInfo.applied) {
          tick.marketModifier *= 1.1;
        }
        break;
      case 'explosion':
        stock.forceDelist = true;
        tick.explosion = true;
        break;
      case 'war':
        tick.marketModifier *= 4;
        break;
      case 'peace':
        tick.marketModifier *= 0.01;
        break;
      case 'vein':
        tick.marketModifier *= 1.15;
        break;
      case 'grainTax':
        tick.marketModifier *= 0.01;
        break;
      case 'plague':
        if (stepInfo.applied && stepInfo.even) {
          tick.marketModifier *= 0.05;
        }
        break;
      case 'manaSurge':
        tick.marketModifier *= 1.2;
        break;
      case 'manaDry':
        tick.marketModifier *= 0.25;
        break;
      case 'forbidden':
        tick.marketModifier *= 2;
        break;
      case 'bubble':
        tick.marketModifier *= 0.05;
        break;
      case 'rareBeast':
        tick.marketModifier *= 2;
        break;
      case 'beastTide':
        tick.marketModifier *= 0.05;
        break;
      default:
        break;
    }
  }

  function applyLinkedEvent(stock, eventId, stepInfo, tick) {
    switch (eventId) {
      case 'tradeBoom':
        tick.marketModifier *= 1.2;
        break;
      case 'roadBlock':
        tick.marketModifier *= 0.04;
        break;
      default:
        break;
    }
  }

  function syncPriceFromCollatz(stock, tick) {
    if (tick.explosion) {
      stock.collatzResult = 1;
      stock.price = 1;
      return;
    }
    stock.price = roundPrice(stock.collatzResult * tick.marketModifier);
  }

  function processStockTick(stock, tickCtx) {
    stock.prevPrice = stock.price;
    stock.forceDelist = false;
    stock.previewMode = false;

    if (stock.collatzResult == null) stock.collatzResult = stock.price;

    const tick = {
      marketModifier: 1,
      explosion: false,
    };

    const stepInfo = applyCollatzStep(stock, { forceEven: false, forceOdd: false });

    applyStablePhase(stock, stepInfo, tick);

    if (tickCtx.constructionForceDrop && stock.sector === 'construction') {
      applyForceDropToCollatz(stock);
    }

    const accidental = tickCtx.sectorEvents.get(stock.sector);
    if (accidental) {
      accidental.forEach((eventId) => applyAccidentalEvent(stock, eventId, stepInfo, tick));
    }

    const linked = tickCtx.linkedEvents.get(stock.sector);
    if (linked) {
      linked.forEach((eventId) => applyLinkedEvent(stock, eventId, stepInfo, tick));
    }

    syncPriceFromCollatz(stock, tick);
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

    if (!activeWorld || activeWorld.daysLeft === 0) {
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

    renderStockTable();
    renderChart();
    renderAccount();
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

  function sellAll() {
    if (selectedId == null) return;
    const stock = getListedStock(selectedId);
    const meta = stockPool.get(selectedId);
    if (!stock || !meta) return;

    const owned = getHolding(selectedId);
    if (owned <= 0) {
      showTradeHint('未持有该股票，无法全抛');
      return;
    }

    const revenue = stock.price * owned;
    cash += revenue;
    holdings.delete(selectedId);
    showTradeHint('已全抛 ' + meta.name + ' ' + owned + ' 股，收入 ' + formatMoney(revenue));
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
      if (sellAllBtn) sellAllBtn.disabled = !stock || getHolding(selectedId) <= 0;
    }
  }

  function renderChart() {
    if (selectedId == null) {
      chartTitle.textContent = '请选择股票';
      chartPrice.textContent = '';
      chartPrice.className = 'chart-price chart-header-price';
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
    chartTitle.textContent = meta.name + (sector ? ' · ' + sector.name : '');
    chartPrice.textContent = stock.previewMode
      ? '¥' + stock.price + ' · 观望'
      : '¥' + stock.price + '  ' + formatPct(change);
    chartPrice.className =
      'chart-price chart-header-price ' +
      (stock.previewMode ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat');

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
    priceChart.style.width = '';
    priceChart.style.height = '';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);

    if (prices.length === 0) {
      ctx.fillStyle = CHALK.text;
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无走势数据', w / 2, h / 2);
      return;
    }

    const px = (v) => Math.round(v);
    const snapLine = (v) => Math.round(v) + 0.5;

    let minP = Math.min(...prices);
    let maxP = Math.max(...prices);
    if (minP === maxP) {
      minP = Math.max(1, minP - 1);
      maxP = maxP + 1;
    }
    const priceSpan = maxP - minP;
    const yHeadroom = priceSpan * 0.08;
    minP = Math.max(0, minP - yHeadroom);
    maxP += yHeadroom;

    ctx.font = '10px sans-serif';
    let maxYLabelW = 0;
    for (let i = 0; i <= 4; i++) {
      const val = maxP - ((maxP - minP) * i) / 4;
      maxYLabelW = Math.max(maxYLabelW, ctx.measureText(String(Math.round(val))).width);
    }
    const pad = {
      top: 28,
      right: 14,
      bottom: 22,
      left: Math.ceil(maxYLabelW) + 12,
    };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    const plotInset = 2;

    const xAt = (step) => pad.left + (step / CHART_STEPS) * plotW;
    const yAt = (p) => {
      const t = (p - minP) / (maxP - minP);
      const innerH = Math.max(1, plotH - plotInset * 2);
      return pad.top + plotInset + innerH - t * innerH;
    };
    const axisBottom = snapLine(pad.top + plotH);
    const axisLeft = snapLine(pad.left);
    const axisRight = snapLine(pad.left + plotW);
    const axisTop = snapLine(pad.top);

    ctx.lineWidth = 1;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    ctx.strokeStyle = CHALK.axis;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(axisLeft, axisTop);
    ctx.lineTo(axisLeft, axisBottom);
    ctx.lineTo(axisRight, axisBottom);
    ctx.stroke();

    ctx.strokeStyle = CHALK.grid;
    ctx.setLineDash([3, 3]);
    for (let i = 1; i <= 3; i++) {
      const y = snapLine(pad.top + (plotH * i) / 4);
      ctx.beginPath();
      ctx.moveTo(axisLeft, y);
      ctx.lineTo(axisRight, y);
      ctx.stroke();
    }
    [30, 60, 90].forEach((step) => {
      const x = snapLine(xAt(step));
      ctx.beginPath();
      ctx.moveTo(x, axisTop);
      ctx.lineTo(x, axisBottom);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    const tick = 4;
    ctx.strokeStyle = CHALK.axis;
    for (let i = 0; i <= 4; i++) {
      const y = snapLine(pad.top + (plotH * i) / 4);
      ctx.beginPath();
      ctx.moveTo(axisLeft - tick, y);
      ctx.lineTo(axisLeft, y);
      ctx.stroke();
    }
    [0, 30, 60, 90, 120].forEach((step) => {
      const x = snapLine(xAt(step));
      ctx.beginPath();
      ctx.moveTo(x, axisBottom);
      ctx.lineTo(x, axisBottom + tick);
      ctx.stroke();
    });

    ctx.fillStyle = CHALK.text;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const val = maxP - ((maxP - minP) * i) / 4;
      const y = pad.top + (plotH * i) / 4;
      ctx.fillText(String(Math.round(val)), pad.left - 8, y);
    }

    ctx.textBaseline = 'top';
    const xLabelY = pad.top + plotH + 8;
    [0, 30, 60, 90, 120].forEach((step) => {
      const x = px(xAt(step));
      if (step === 0) ctx.textAlign = 'left';
      else if (step === 120) ctx.textAlign = 'right';
      else ctx.textAlign = 'center';
      ctx.fillText(String(step), x, xLabelY);
    });

    const last = prices[prices.length - 1];
    const lastStep = prices.length - 1;
    const lineColor = CHALK.line;

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.left, pad.top, plotW, plotH);
    ctx.clip();

    if (prices.length >= 2) {
      ctx.beginPath();
      prices.forEach((p, i) => {
        const x = px(xAt(i));
        const y = px(yAt(p));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.setLineDash(isPreview ? [5, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = lineColor;
    ctx.fillRect(px(xAt(lastStep)) - 1, px(yAt(last)) - 1, 3, 3);
    ctx.restore();
  }

  function syncAccountBookLayout() {
    const blocks = document.querySelector('.trade-panel-body .account-info-blocks');
    const row = document.querySelector('.trade-panel-body .account-info-row');
    const bookBtn = document.querySelector('.trade-panel-body .account-book-btn');
    const book = bookBtn?.querySelector('.account-book-deco');
    if (!blocks || !row || !bookBtn || !book) return;

    const body = row.closest('.trade-panel-body');
    const bookGap = body
      ? parseFloat(getComputedStyle(body).getPropertyValue('--account-book-gap')) || 8
      : 8;
    const blockH = blocks.offsetHeight;
    if (blockH < 1) return;

    const aspect = 77 / 125;
    const scale = 1.18;
    const h = Math.round(blockH * scale);
    let w = Math.round(h * aspect);

    const rowW = row.clientWidth;
    const minBlockW = 17 * 16;
    let blockW = rowW - w - bookGap;
    if (blockW < minBlockW) {
      blockW = minBlockW;
      w = Math.max(0, Math.min(w, rowW - blockW - bookGap));
    }

    if (body) {
      body.style.setProperty('--account-info-block-width', `${Math.round(blockW)}px`);
    }

    bookBtn.style.width = `${w}px`;
    bookBtn.style.height = `${h}px`;
    book.style.width = '100%';
    book.style.height = '100%';
    row.style.minHeight = '';
  }

  function renderAll() {
    renderStockTable();
    renderAccount();
    renderChart();
    syncAccountBookLayout();
  }

  function syncLotButtonActive() {
    if (!lotBtns) return;
    lotBtns.querySelectorAll('.lot-btn[data-lot-size]').forEach((btn) => {
      const size = Number(btn.dataset.lotSize);
      btn.classList.toggle('active', size === lotSize);
    });
  }

  function initLotButtons() {
    LOT_SIZES.forEach((size) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lot-btn';
      btn.dataset.lotSize = String(size);
      btn.textContent = size >= 10000 ? size / 10000 + '万' : String(size);
      btn.addEventListener('click', () => {
        lotSize = size;
        syncLotButtonActive();
        renderAccount();
      });
      lotBtns.appendChild(btn);
    });
    syncLotButtonActive();

    sellAllBtn = document.createElement('button');
    sellAllBtn.type = 'button';
    sellAllBtn.className = 'lot-btn lot-btn-sell-all';
    sellAllBtn.textContent = '全抛';
    sellAllBtn.disabled = true;
    sellAllBtn.addEventListener('click', sellAll);
    lotBtns.appendChild(sellAllBtn);
  }

  function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    openOverlay.classList.add('hidden');
    gameShell.hidden = false;

    tradingDay = 0;
    guruBribeCost = GURU_BRIBE_BASE;
    lastGuruHintIdx = -1;
    bookHints = [];
    refillGuruHintPool();
    updateGuruBribeTip();
    initListedStocks();

    startWorldEvent(pickRandomWorldEvent());
    updateTradingDayDisplay();

    if (listed.length > 0) selectStock(listed[0].id);

    renderAll();
  }

  function onResize() {
    renderChart();
    syncAccountBookLayout();
  }

  openAccountBtn.addEventListener('click', startGame);
  buyBtn.addEventListener('click', buy);
  sellBtn.addEventListener('click', sell);
  nextDayBtn.addEventListener('click', advanceTradingDay);
  guruBribe.addEventListener('click', buyGuruHint);

  if (accountBookBtn) {
    accountBookBtn.addEventListener('mouseenter', () => accountBookBtn.classList.add('is-tip-open'));
    accountBookBtn.addEventListener('mouseleave', () => accountBookBtn.classList.remove('is-tip-open'));
    accountBookBtn.addEventListener('focus', () => accountBookBtn.classList.add('is-tip-open'));
    accountBookBtn.addEventListener('blur', () => accountBookBtn.classList.remove('is-tip-open'));
    accountBookBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openBookModal();
    });
  }

  if (bookModalBackdrop) {
    bookModalBackdrop.addEventListener('click', closeBookModal);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bookModal && !bookModal.classList.contains('hidden')) {
      closeBookModal();
    }
  });

  updateGuruBribeTip();
  initLotButtons();
  window.addEventListener('resize', onResize);

  const accountInfoBlocks = document.querySelector('.trade-panel-body .account-info-blocks');
  if (accountInfoBlocks && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(syncAccountBookLayout).observe(accountInfoBlocks);
  }
})();
