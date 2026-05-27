/**
 * Game_Registry — 游戏元数据集中管理模块
 */

export const games = [
  {
    id: 'invest',
    name: '异世界炒股',
    icon: '📈',
    category: 'clicker',
    categoryLabel: '点击',
    hot: false,
    cover: '/games/invest/assets/cover.svg',
    desc: '异世界百业股票按考拉兹法则波动，低买高卖积累财富',
  },
  {
    id: 'feed-fish',
    name: '摸大鲲',
    icon: '🐟',
    category: 'idle',
    categoryLabel: '挂机',
    hot: true,
    desc: '收集金币喂鱼，养出传说中的鲲',
  },
  {
    id: 'alcohol',
    name: '酒吧模拟器',
    icon: '🍸',
    category: 'casual',
    categoryLabel: '休闲',
    hot: false,
    desc: '扮演调酒师，记住配方，为顾客调制鸡尾酒',
  },
  {
    id: 'jump',
    name: '撅地求生',
    icon: '🚀',
    category: 'casual',
    categoryLabel: '休闲',
    hot: true,
    desc: '踩着弹簧飞向太空，躲避障碍物',
  },
  {
    id: 'fishing',
    name: '钓鱼达人',
    icon: '🎣',
    category: 'casual',
    categoryLabel: '休闲',
    hot: false,
    desc: '抛竿钓鱼，收集稀有鱼种，升级装备成为钓鱼大师',
  },
  {
    id: 'Noah',
    name: '诺亚方舟',
    icon: '🛶',
    category: 'idle',
    categoryLabel: '挂机',
    hot: true,
    cover: '/games/Noah/boat.png',
    desc: '摆动指针出杆钓鱼打捞材料，在方舟上建造诺亚方舟',
  },
  {
    id: 'murphyt\u0435',
    name: '史莱姆突围',
    icon: '🟢',
    category: 'mowing',
    categoryLabel: '割草',
    hot: true,
    desc: '选择神力，击退小兵浪潮，挑战boss，升级祭坛守卫领地',
  },
  {
    id: 'demon-invasion',
    name: '异魔入侵',
    icon: '👹',
    category: 'tower',
    categoryLabel: '塔防',
    hot: true,
    desc: '选择士兵上阵，点击召唤气势，抵御异魔浪潮守卫阵营',
  },
  {
    id: 'peekaboo',
    name: '躲猫猫高手',
    icon: '🐾',
    category: 'casual',
    categoryLabel: '休闲',
    hot: true,
    desc: '在俯视户型图里轮流扮演猫和狗，伪装成家具或查验可疑物品找出对手',
  },
  {
    id: 'eternal-night',
    name: 'Eternal Night',
    icon: '🌙',
    category: 'casual',
    categoryLabel: '休闲',
    hot: false,
    desc: '永恒之夜',

  },
];

export const categories = [
  { key: 'all', label: '全部' },
  { key: 'idle', label: '挂机' },
  { key: 'clicker', label: '点击' },
  { key: 'mowing', label: '割草' },
  { key: 'casual', label: '休闲' },
  { key: 'tower', label: '塔防' },
];

/**
 * 根据 id 查找游戏，未找到返回 null
 */
export function getGameById(id) {
  return games.find((g) => g.id === id) || null;
}

/**
 * 生成游戏封面图路径
 */
export function getCoverPath(id) {
  return `/games/${id}/assets/cover.webp`;
}

export function getDisplayCoverPath(game) {
  return game.cover || getCoverPath(game.id);
}

/**
 * 按分类筛选游戏，'all' 返回全部
 */
export function getGamesByCategory(category) {
  if (category === 'all') return games;
  return games.filter((g) => g.category === category);
}
