## 敌人兵种
### 小兵
素材： public/games/demon-invasion/assets/monster/Icon39.webp
血量3
移速0.5
伤害1

### 快速兵
素材： public/games/demon-invasion/assets/monster/Icon6.webp
血量2
移速1
伤害1

### 盾兵
素材： public/games/demon-invasion/assets/monster/Icon30.webp
血量10
移速0.5
伤害2

### 精英兵
### boss1
素材： public/games/demon-invasion/assets/monster/Icon38.webp
血量5
移速1
伤害3

### boss1
素材： public/games/demon-invasion/assets/monster/Icon24.webp
血量 50
移速0.2
伤害10

### boss2
素材： public/games/demon-invasion/assets/monster/Icon12.webp
血量80
移速0.2
伤害5

### boss图片素材大小是其他小兵素材的4倍，盾兵和精英兵是2倍


## 敌方刷新机制

### 压力值
每秒压力 = 1 + 0.03 × 游戏时间（秒）
玩家战力 = 点击收益 × 0.6 + 场上友军数 × 0.4
最终压力 = 每秒压力 × (0.8 + 玩家战力 / 50)

while 最终压力 >= 敌人成本:
    刷新敌人
    扣除压力

### 敌人成本
小兵1
快速兵2
盾兵4 
精英兵8

### 阶段刷新权重
0-60秒
小兵90%
快速兵10%

60-180秒
小兵50%
快速兵25%
盾兵20%
精英兵5%

180秒后
小兵25%
快速兵30%
盾兵20%
精英兵20%
boss 5%
