/* global window */
(function () {
  'use strict';

  const SECTORS = {
    medicine: { id: 'medicine', name: '魔药医药', short: '魔药' },
    alchemy: { id: 'alchemy', name: '炼金造物', short: '炼金' },
    mercenary: { id: 'mercenary', name: '佣兵战力', short: '佣兵' },
    mining: { id: 'mining', name: '矿产资源', short: '矿产' },
    food: { id: 'food', name: '餐饮食饮', short: '餐饮' },
    magic: { id: 'magic', name: '魔法魔导', short: '魔导' },
    trade: { id: 'trade', name: '商贸商旅', short: '商贸' },
    construction: { id: 'construction', name: '建筑城建', short: '城建' },
    pet: { id: 'pet', name: '宠物魔兽', short: '宠物' },
  };

  /** 与 STOCK_NAMES 顺序一致，共 100 只 */
  const STOCK_SECTOR_IDS = [
    ...Array(15).fill('medicine'),
    ...Array(15).fill('alchemy'),
    ...Array(15).fill('mercenary'),
    ...Array(15).fill('mining'),
    ...Array(15).fill('food'),
    ...Array(10).fill('magic'),
    ...Array(5).fill('trade'),
    ...Array(5).fill('construction'),
    ...Array(5).fill('pet'),
  ];

  const EVENT_LABELS = {
    breakthrough: '药剂突破',
    sideEffect: '副作用危机',
    mutation: '炼金变异',
    explosion: '炼金爆炸',
    war: '战争状态',
    peace: '和平裁军',
    vein: '发现矿脉',
    depletion: '资源枯竭',
    livelihood: '民生需求',
    grainTax: '征收粮食',
    plague: '瘟疫事件',
    manaSurge: '魔力涌动',
    manaDry: '魔力枯竭',
    forbidden: '禁术暴走',
    tradeBoom: '贸易繁荣',
    roadBlock: '道路封锁',
    expansion: '城市扩张',
    bubble: '地产泡沫',
    rareBeast: '稀有魔兽',
    beastTide: '兽潮失控',
    forceDrop: '强制下跌',
  };

  const WORLD_EVENTS = [
    {
      id: 'magicTide',
      name: '魔潮爆发',
      constructionForceDrop: true,
      sectorEvents: [
        { sector: 'medicine', event: 'breakthrough' },
        { sector: 'pet', event: 'rareBeast' },
        { sector: 'magic', event: 'manaSurge' },
        { sector: 'alchemy', event: 'mutation' },
      ],
    },
    {
      id: 'kingdomWar',
      name: '王国战争',
      sectorEvents: [
        { sector: 'mercenary', event: 'war' },
        { sector: 'mining', event: 'vein' },
        { sector: 'food', event: 'grainTax' },
      ],
    },
    {
      id: 'dragonSiege',
      name: '巨龙袭城',
      constructionForceDrop: true,
      sectorEvents: [
        { sector: 'pet', event: 'beastTide' },
        { sector: 'mercenary', event: 'war' },
        { sector: 'magic', event: 'forbidden' },
        { sector: 'alchemy', event: 'explosion' },
        { sector: 'food', event: 'grainTax' },
      ],
    },
    {
      id: 'worldPlague',
      name: '世界瘟疫',
      sectorEvents: [
        { sector: 'medicine', event: 'breakthrough' },
        { sector: 'food', event: 'plague' },
        { sector: 'magic', event: 'manaDry' },
      ],
    },
    {
      id: 'peaceful',
      name: '无事发生',
      sectorEvents: [{ sector: 'mercenary', event: 'peace' }],
    },
  ];

  /** 和平裁军 → 贸易繁荣；战争状态 → 道路封锁 */
  const LINKED_EVENTS = {
    peace: [{ sector: 'trade', event: 'tradeBoom' }],
    war: [{ sector: 'trade', event: 'roadBlock' }],
  };

  window.InvestEvents = {
    SECTORS,
    STOCK_SECTOR_IDS,
    EVENT_LABELS,
    WORLD_EVENTS,
    LINKED_EVENTS,
    getSector(id) {
      return SECTORS[id] || null;
    },
    getEventLabel(eventId) {
      return EVENT_LABELS[eventId] || eventId;
    },
  };
})();
