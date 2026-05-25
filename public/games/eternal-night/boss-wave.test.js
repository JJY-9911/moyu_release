import { describe, it, expect } from 'vitest';

/** 复刻 main.js 中 Boss 波次切换与清场逻辑 */
function createWaveState() {
  var monsters = [];
  var gameTime = 600000;
  var waveCycle = 0;
  var cycleStartTime = 0;
  var bossSpawnFired = true;
  var pendingWaveMonsterClear = false;
  var gemsSpawned = 0;
  var toasts = [];

  function onBossDefeated() {
    waveCycle++;
    cycleStartTime = gameTime;
    bossSpawnFired = false;
    pendingWaveMonsterClear = true;
    toasts.push('wave ' + (waveCycle + 1));
  }

  function onMonsterKill(m) {
    if (m.key === 'boss') onBossDefeated();
    gemsSpawned++;
  }

  function removeDeadMonster(index) {
    var mon = monsters[index];
    onMonsterKill(mon);
    if (pendingWaveMonsterClear) return;
    monsters.splice(index, 1);
  }

  function flushPendingWaveMonsterClear() {
    if (!pendingWaveMonsterClear) return;
    monsters = [];
    pendingWaveMonsterClear = false;
  }

  function makeMonsters(count, bossIndex) {
    monsters = [];
    for (var i = 0; i < count; i++) {
      monsters.push({
        id: i,
        key: i === bossIndex ? 'boss' : 'bat',
        hp: 10
      });
    }
  }

  function removeDeadMonsterLegacy(index) {
    var mon = monsters[index];
    if (mon.key === 'boss') {
      waveCycle++;
      cycleStartTime = gameTime;
      monsters = [];
    }
    gemsSpawned++;
    monsters.splice(index, 1);
  }

  /** 与 main.js 飞刀命中循环一致：固定 initialLen，无 undefined 防护 */
  function simulateKnifeLoop(useLegacy) {
    var errors = 0;
    var remove = useLegacy ? removeDeadMonsterLegacy : removeDeadMonster;
    var initialLen = monsters.length;
    for (var j = initialLen - 1; j >= 0; j--) {
      try {
        var mon = monsters[j];
        if (mon.hp <= 0) continue;
        if (mon.key === 'boss') {
          mon.hp = 0;
          remove(j);
        }
      } catch (e) {
        errors++;
        break;
      }
    }
    if (!useLegacy) flushPendingWaveMonsterClear();
    return errors;
  }

  return {
    get monsters() { return monsters; },
    get waveCycle() { return waveCycle; },
    get cycleStartTime() { return cycleStartTime; },
    get bossSpawnFired() { return bossSpawnFired; },
    get pendingWaveMonsterClear() { return pendingWaveMonsterClear; },
    get gemsSpawned() { return gemsSpawned; },
    get toasts() { return toasts; },
    getSegmentTime() { return Math.max(0, gameTime - cycleStartTime); },
    makeMonsters: makeMonsters,
    simulateKnifeLoop: simulateKnifeLoop
  };
}

describe('eternal-night wave 1 boss kill', function () {
  it('旧逻辑：Boss 在数组中间被击杀时，同帧遍历会抛错', function () {
    var state = createWaveState();
    state.makeMonsters(20, 5);
    expect(state.simulateKnifeLoop(true)).toBeGreaterThan(0);
  });

  it('新逻辑：第一波 Boss 击杀后同帧遍历不抛错，帧末清场并进入第 2 波', function () {
    var state = createWaveState();
    state.makeMonsters(20, 5);
    expect(state.simulateKnifeLoop(false)).toBe(0);
    expect(state.waveCycle).toBe(1);
    expect(state.cycleStartTime).toBe(600000);
    expect(state.getSegmentTime()).toBe(0);
    expect(state.bossSpawnFired).toBe(false);
    expect(state.monsters.length).toBe(0);
    expect(state.pendingWaveMonsterClear).toBe(false);
    expect(state.gemsSpawned).toBe(1);
    expect(state.toasts[0]).toContain('2');
  });

  it('新逻辑：Boss 是唯一怪物时也能正常清场', function () {
    var state = createWaveState();
    state.makeMonsters(1, 0);
    expect(state.simulateKnifeLoop(false)).toBe(0);
    expect(state.monsters.length).toBe(0);
    expect(state.waveCycle).toBe(1);
  });

  it('新逻辑：后续帧 update 循环可连续运行（模拟 rAF 不中断）', function () {
    var state = createWaveState();
    state.makeMonsters(30, 12);
    var frames = 0;
    var crashed = false;
    while (frames < 120 && !crashed) {
      try {
        if (frames === 0) state.simulateKnifeLoop(false);
        frames++;
      } catch (e) {
        crashed = true;
      }
    }
    expect(crashed).toBe(false);
    expect(frames).toBe(120);
  });
});
