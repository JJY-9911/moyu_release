# 史莱姆突围 — 数值参考手册

本文档列出 `main.js` 中所有可调节的游戏数值，包括代码位置和修改方式。

> 游戏以 60fps 运行，所有"帧"单位换算：**60帧 = 1秒**

---

## 一、全局常量（文件顶部 ~第5-17行）

| 常量 | 当前值 | 含义 | 换算 |
|------|--------|------|------|
| `ATTACK_RANGE` | 150 | 玩家基础攻击范围（像素） | — |
| `ATTACK_INTERVAL` | 60 | 玩家基础攻击间隔（帧） | 1秒 |
| `R_MAX_DIST` | 400 | 大招最大跳跃距离（像素） | — |
| `R_COOLDOWN_BASE` | 1800 | 大招基础冷却（帧） | 30秒 |
| `BUFF_RESPAWN` | 5400 | buff刷新间隔（帧） | 90秒 |
| `BOSS_RESPAWN` | 5400 | boss刷新间隔（帧） | 90秒 |
| `FOUNTAIN_RADIUS` | 160 | 泉水区域半径（像素） | — |
| `OBSTACLE_COUNT` | 22 | 障碍物数量 | — |

修改方式：直接改文件顶部对应的 `const` 值。

---

## 二、英雄数值（HEROES 数组，~第130-170行）

### 2.1 血量

| 英雄 | 数组索引 | `hp` 字段 | 当前值 |
|------|----------|-----------|--------|
| 英雄之力 | `HEROES[0]` | `hp:4` | 4 |
| 猎手之力 | `HEROES[1]` | `hp:5` | 5 |
| 鹰眼之力 | `HEROES[2]` | `hp:2` | 2 |
| 影忍之力 | `HEROES[3]` | `hp:3` | 3 |
| 血魔之力 | `HEROES[4]` | `hp:10` | 10 |

修改方式：在 `HEROES` 数组中找到对应英雄，改 `hp` 值。

### 2.2 大招冷却

大招冷却在 `applyHeroChoice()` 函数中设置（~第480行）：

| 英雄 | 冷却设置代码 | 当前值 | 换算 |
|------|-------------|--------|------|
| 影忍之力（血烟） | `rMaxCooldown=2400` | 2400帧 | 40秒 |
| 血魔之力（无大招） | `rMaxCooldown=999999` | — | 无限 |
| 其他英雄 | `rMaxCooldown=R_COOLDOWN_BASE` | 1800帧 | 30秒 |

### 2.3 大招持续时间

在 R 键处理函数中（~第600-610行）：

| 大招 | 代码 | 当前值 | 换算 |
|------|------|--------|------|
| 虚化（鹰眼） | `phaseTimer=600` | 600帧 | 10秒 |
| 血烟（影忍） | `bloodMistTimer=1200` | 1200帧 | 20秒 |

### 2.4 大招特殊数值

| 数值 | 位置 | 代码 | 当前值 |
|------|------|------|--------|
| 降临落地伤害 | `updateUlt()` ~第950行 | `m.hp-=999` | 999 |
| 降临落地范围 | `ult` 对象 ~第395行 | `landRadius:120` | 120px |
| 虚化移速倍率 | `updatePlayer()` ~第640行 | `curSpeed=player.speed*5` | 5倍 |
| 血烟伤害间隔 | `updatePlayer()` ~第650行 | `tick%12===0` | 每12帧(0.2秒) |
| 血烟每次伤害 | 同上 | `m.hp-=0.5` / `boss.hp-=0.5` | 0.5 |

### 2.5 被动数值

| 被动 | 位置 | 代码 | 当前值 |
|------|------|------|--------|
| 怒视击退距离 | `hitTarget()` ~第810行 | `e.x+=dx/d*30` | 30px |
| 潜行基础移速 | `applyHeroChoice()` ~第478行 | `player.speed=2` | 2倍 |
| 血魔回血击杀数 | `killEntity()` ~第825行 | `minionKillCount%500===0` | 每500个 |

---

## 三、玩家基础数值

| 数值 | 位置 | 代码 | 当前值 |
|------|------|------|--------|
| 基础移速 | `player` 对象 ~第385行 | `speed:1` | 1 |
| 受伤无敌时间 | 多处 | `player.invincibleTimer=120` | 120帧(2秒) |
| 障碍物伤害 | `updatePlayer()` ~第665行 | `player.hp--` | 1点 |
| 碰小兵伤害 | `updateMinions()` ~第890行 | `player.hp--` | 1点 |
| 碰boss伤害 | `updateBoss()` ~第910行 | `player.hp--` | 1点 |
| 普攻伤害 | `hitTarget()` 参数 | `dmg` = 1 | 1点 |

---

## 四、小兵数值（~第560行 `spawnMinion()`）

| 数值 | 代码 | 当前值 |
|------|------|--------|
| 重型小兵基础血量 | `type===0 → baseHp=3` | 3 |
| 轻型小兵基础血量 | `type===1 → baseHp=2` | 2 |
| 每波额外血量 | `hp=baseHp+waveIndex` | +1/波 |
| 重型小兵移速 | `type===0 → speed:0.33` | 0.33 |
| 轻型小兵移速 | `type===1 → speed:0.66` | 0.66 |
| 击杀金币 | `killEntity()` / `updateMinions()` | `player.gold+=1` | 1 |
| 碰撞伤害范围 | `updateMinions()` | `dist(player,m)<40` | 40px |

---

## 五、Boss 数值

| 数值 | 位置 | 代码 | 当前值 |
|------|------|------|--------|
| 血量范围 | `randomBossType()` ~第290行 | `100+Math.floor(Math.random()*10)*100` | 100~1000 |
| 金币 = 血量 | 同上 | `gold:hp` | 与血量相同 |
| 移速 | `boss` 对象 ~第400行 | `speed:0.33` | 0.33 |
| 碰撞伤害范围 | `updateBoss()` ~第910行 | `dist(player,boss)<80` | 80px |
| 刷新间隔 | 常量 `BOSS_RESPAWN` | 5400 | 90秒 |
| 初始刷新延迟 | `boss.respawnTimer=300` ~第1610行 | 300帧 | 5秒 |

---

## 六、Buff 数值

### 6.1 通用

| 数值 | 位置 | 代码 | 当前值 |
|------|------|------|--------|
| 每种buff数量 | `generateAllBuffPos()` ~第255行 | 循环2次 | 各2个 |
| buff血量 | 数组初始化 ~第415行 | `hp:10,maxHp:10` | 10 |
| 刷新间隔 | 常量 `BUFF_RESPAWN` | 5400 | 90秒 |
| 初始刷新延迟 | init区 ~第1610行 | `respawnTimer=60` | 1秒 |

### 6.2 红buff（灼伤）

| 数值 | 位置 | 代码 | 当前值 |
|------|------|------|--------|
| buff持续时间 | `killEntity()` ~第840行 | `player.redBuffTimer=3600` | 3600帧(60秒) |
| 灼伤持续时间 | `hitTarget()` ~第800行 | `e.burnTimer=360` | 360帧(6秒) |
| 灼伤伤害间隔 | `updateBurnOnEntity()` ~第855行 | `e.burnDmgTimer>=12` | 12帧(0.2秒) |
| 灼伤每次伤害 | 同上 | `e.hp-=0.5` | 0.5 |
| 减速比例 | `steerMinion()` ~第540行 | `m.speed*0.7` | 减速30% |
| 减速持续时间 | `hitTarget()` | `e.slowTimer=360` | 360帧(6秒) |

### 6.3 蓝buff（冷却缩减）

| 数值 | 位置 | 代码 | 当前值 |
|------|------|------|--------|
| buff持续时间 | `killEntity()` ~第843行 | `player.blueBuffTimer=3600` | 3600帧(60秒) |
| 冷却上限 | `update()` ~第1000行 | `rCooldown>180` → 压到180 | 180帧(3秒) |

修改蓝buff冷却效果：改 `update()` 中的 `180` 即可。

### 6.4 绿buff（回血）

| 数值 | 位置 | 代码 | 当前值 |
|------|------|------|--------|
| 效果 | `killEntity()` ~第847行 | `player.hp=player.maxHp` | 回满血 |

---

## 七、波次系统（~第300行）

### 7.1 波次间隔

```javascript
const WAVE_INTERVALS=[2700,2700,3300,3300,3300,3900,3900,3900,3900,4500];
```

| 波次 | 帧数 | 换算 |
|------|------|------|
| 第1-2波 | 2700 | 45秒 |
| 第3-5波 | 3300 | 55秒 |
| 第6-9波 | 3900 | 65秒 |
| 第10波 | 4500 | 75秒 |
| 第11波起 | 4500 | 75秒（`getWaveInterval()` 返回值） |

修改方式：改 `WAVE_INTERVALS` 数组和 `getWaveInterval()` 中的默认值 `4500`。

### 7.2 每波小兵数量

```javascript
const WAVE_COUNTS=[10,15,20,25,30,35,40,45,50];
```

循环使用，第10波起从头循环。修改方式：改 `WAVE_COUNTS` 数组。

### 7.3 小兵生成间隔

在 `updateWaves()` 中：`waveSpawnDelay>=6` → 每6帧生成一个小兵（0.1秒/个）。

---

## 八、供奉系统（upgrades 对象，~第190行）

### 8.1 价格

| 数值 | 代码 | 当前值 |
|------|------|--------|
| 基础价格 | `BASE_PRICE=10` | 10金币 |
| 涨价系数 | `PRICE_INCREASE=1.1` | 每次+10% |
| 祭坛固定价格 | `getPrice()` 中 `return 1000` | 1000金币 |

### 8.2 各供奉效果

| 供奉 | 上限 | 效果数值 | 代码位置 |
|------|------|----------|----------|
| 供奉英雄 | `max:36` | 子弹数 = `1+count` | `fireAtNearest()` 中 `bulletCount=1+upgrades.hero.count` |
| 供奉血魔 | `max:999` | 初始流血 0.05/秒，每次×1.5 | `bleedRate=0.05*Math.pow(1.5,count)` |
| 供奉影刃 | `max:999` | 移速 +5%/次 | `player.speed=base*(1+count*0.05)` |
| 供奉猎手 | `max:999` | 对boss伤害 +1/次 | `hitTarget()` 中 `totalDmg+=hunterBonus` |
| 供奉鹰眼 | `max:9` | 间隔 -6帧(0.1秒)/次，射程 +5%/次 | `ATTACK_INTERVAL-count*6` 和 `range*(1+count*0.05)` |
| 供奉祭坛 | `max:8` | 激活一座祭坛 | — |

### 8.3 流血效果

| 数值 | 位置 | 代码 | 当前值 |
|------|------|------|--------|
| 流血持续时间 | `hitTarget()` ~第805行 | `e.bleedTimer=600` | 600帧(10秒) |
| 流血伤害间隔 | `updateBurnOnEntity()` ~第860行 | `e.bleedDmgTimer>=60` | 60帧(1秒) |
| 流血基础伤害 | `upgrades.blood` | `bleedRate:0.05` | 0.05/秒 |

---

## 九、祭坛数值（~第1025行 `updateAltars()`）

| 祭坛类型 | 数值 | 代码 | 当前值 |
|----------|------|------|--------|
| 闪电祭坛攻击间隔 | `a.attackTimer>=12` | 12帧 | 0.2秒 |
| 闪电祭坛攻击范围 | `nd=200` | 200px | — |
| 闪电祭坛伤害 | `nearest.hp-=1` | 1 | — |
| 天火祭坛攻击间隔 | `a.attackTimer>=600` | 600帧 | 10秒 |
| 天火祭坛伤害范围 | `dist(...)<500` | 500px | — |
| 天火祭坛伤害 | `minions[i].hp-=9999` | 9999 | 仅对小兵 |
| 祭坛总数 | `ALTAR_COUNT=8` | 8座 | 闪电4+天火4 |

---

## 十、快速修改指南

### 改血量
找 `HEROES` 数组，改对应英雄的 `hp` 字段。

### 改移速
- 基础移速：`player` 对象的 `speed:1`
- 潜行被动：`applyHeroChoice()` 中 `player.speed=2`
- 虚化倍率：`updatePlayer()` 中 `player.speed*5`
- 供奉影刃：shop click handler 中 `1+u.count*0.05`

### 改冷却
- 基础冷却：常量 `R_COOLDOWN_BASE`（帧数，÷60=秒）
- 血烟冷却：`applyHeroChoice()` 中 `rMaxCooldown=2400`
- 蓝buff冷却效果：`update()` 中 `rCooldown>180` 的 `180`

### 改伤害
- 普攻：`hitTarget()` 的 `dmg` 参数（调用处传1）
- 灼伤：`updateBurnOnEntity()` 中 `e.hp-=0.5`
- 血烟：`updatePlayer()` 中 `m.hp-=0.5`
- 流血：`upgrades.blood.bleedRate` 初始值 `0.05`

### 改时间
所有时间单位为帧（60帧=1秒），搜索对应变量名修改数字即可。
