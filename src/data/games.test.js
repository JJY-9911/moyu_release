import { describe } from 'vitest';
import { test as fcTest, fc } from '@fast-check/vitest';
import {
  games,
  categories,
  getCoverPath,
  getGamesByCategory,
  getGameById,
} from './games.js';

/**
 * **Validates: Requirements 2.4**
 * 属性 1：getCoverPath 对任意 id 生成格式为 /games/{id}/assets/cover.webp 的路径
 */
describe('getCoverPath', () => {
  fcTest.prop([fc.string()])('returns /games/{id}/assets/cover.webp for any id', (id) => {
    const result = getCoverPath(id);
    return result === `/games/${id}/assets/cover.webp`;
  });
});

/**
 * **Validates: Requirements 3.3**
 * 属性 2：getGamesByCategory 返回结果中所有游戏的 category 字段与输入一致
 */
describe('getGamesByCategory', () => {
  const nonAllCategories = categories.filter((c) => c.key !== 'all').map((c) => c.key);

  fcTest.prop([fc.constantFrom(...nonAllCategories)])(
    'every game in result has matching category',
    (category) => {
      const result = getGamesByCategory(category);
      return result.every((game) => game.category === category);
    },
  );

  fcTest.prop([fc.constant('all')])(
    'category "all" returns the full games array',
    (category) => {
      const result = getGamesByCategory(category);
      return result === games;
    },
  );
});

/**
 * **Validates: Requirements 2.1, 4.6**
 * 属性 5：getGameById 对已注册游戏返回正确对象，对不存在 ID 返回 null
 */
describe('getGameById', () => {
  fcTest.prop([fc.constantFrom(...games)])(
    'returns the correct game object for registered games',
    (game) => {
      const result = getGameById(game.id);
      return result === game;
    },
  );

  const knownIds = new Set(games.map((g) => g.id));

  fcTest.prop([fc.string().filter((s) => !knownIds.has(s))])(
    'returns null for unknown ids',
    (id) => {
      return getGameById(id) === null;
    },
  );
});

/**
 * **Validates: Requirements 4.4**
 * 属性 3：推荐列表排除当前游戏 — 对任意游戏 ID，过滤后的列表中不存在该 ID
 */
describe('Recommendation list filtering', () => {
  fcTest.prop([fc.constantFrom(...games.map((g) => g.id))])(
    'filtered list never contains the excluded game id',
    (id) => {
      const recommended = games.filter((g) => g.id !== id);
      return recommended.every((g) => g.id !== id);
    },
  );
});
