## 游戏名：诺亚方舟
挂机类/点击类

## 核心玩法：
玩家通过抛竿从海中吊起各种鱼或材料，建造诺亚方舟

## 画面
如public/games/fishing/boat.png所示，平面构图，长宽比16:9（逻辑画布 1024×576）。建筑可无限向上扩建，画面支持滚轮纵向滑动查看更高楼层（默认视角为船体与海面）。
蓝色部分是海面，黄色部分是背景，绿色部分是船在海面上，穿的最右侧是玩家扮演的主角。船的左侧大半部分的紫色是建筑物。
玩家固定在船的右侧，通过抛竿钓鱼或打捞材料完善建筑物部分。

## 钓鱼与打捞
主角头上会有方向指针，在0-90度之间周期性摆动，旁边有【出杆】按钮，玩家鼠标点击【出杆】的时刻，指针即确定出杆方向。
鱼钩的飞行轨迹是抛物线，不用展示飞行动画，只需用数字显示飞行距离以及入海深度。
为游戏设置一个合适的竖直向下的重力加速度。
飞行距离与出杆时鱼钩速度的水平分量、重力加速度有关，入海深度与鱼钩高度落回到与主角同高度时速度的竖直分量有关（没有空气阻力，因此该速度大小和出杆时速度的竖直分量一样）
鱼钩落回到与主角同高度时结束抛物线运动，以竖直方向上的速度为初速度，竖直下落，同时海水提供合适的浮力，直到将鱼钩速度减为0，即确定鱼钩最终到达的深度。

## 素材
船：public/games/Noah/assets/Boat.webp
建筑素材：`assets/Building/**`（由 `initial-layout.json` 定义初始摆放）
（背景 origbig.webp、海面 Water.webp 暂不接入）

## 初始场景
游戏启动加载 `initial-layout.json`（船 scale 8.3、甲板与首层构件）；进度写入 `localStorage` 键 `gamehub_noah_v1`。

## 楼层定义
- **L0**：以船体为地板（`plat-L0/R0` + 船舷）
- **L1**：以 L0 天花板为地板（`plat-L1/R1` + 墙/门/窗等，开局预置）
- **L2**：以 L1 天花板为地板（`plat-L2/R2` 开局预置，玩家从本层起建造墙/门/窗/屋檐/装饰，**不需**平台材料）
- **L3+**：需先用平台材料铺设新地板，再建墙/门/窗等；甲板 `plat-ext` 在本层平台满后可选扩展

## 自动建造插槽
`build-slots.json` 记录固定坐标与翻转；`building.js` 按材料 **unlock** 插槽。

## 建筑机制
插槽生长制：
平台：
public/games/Noah/assets/Building/platformer.webp
平台长度每层2-3个

墙面:
public/games/Noah/assets/Building/wall
每层只能有一个，只会出现在平台的最左侧或最右侧

墙边界：
public/games/Noah/assets/Building/wall/edge
每层只能有一个。若墙面在平台右侧，墙边界就只能在其左侧，且墙边界朝向为左侧。墙边界素材本身朝左侧，注意翻转。

门和窗：
public/games/Noah/assets/Building/door
public/games/Noah/assets/Building/window
门和窗每层必须各出现1个，只能出现在墙面上

屋檐：
public/games/Noah/assets/Building/eave
每层最多出现两个
墙面和墙边界之间的区域代表室内，屋檐只能出现在墙面或墙边界的外侧，墙面和墙边界上分别最多一个。素材本身与墙的连接处在左侧，使用时注意翻转

其他：
public/games/Noah/assets/Building/other
墙面和墙边界之间的平台区域代表室内，其他区域代表阳台
可以出现在室内或阳台，0-5个

## 打捞与自动建造
每次抛竿吊起的均为建筑材料（平台/墙/边界/门/窗/屋檐/装饰），每种 **×1** 存入库存（放置各消耗 1）。每隔 **3 秒** 执行**一轮**自动建造（每轮最多放 **1** 个构件），按优先级检查：**平台 → 墙面/墙边界 → 门/窗/屋檐 → 其他**（含甲板装饰）。对每种材料：若本层该类型已达开工时确定的上限（如平台 2、墙 1、装饰 3）则检查下一项；若本层仍缺但库存不足则**结束本轮**；若库存 ≥1 则**放置 1 个并结束本轮**。甲板 `plat-ext` 仅在本层平台段已满后才消耗平台材料。

**开局**：L0、L1 及 L2 地板（`plat-L2/R2`）由 `initialUnlock` 预置；玩家从 **L2** 起建造结构。L2 开工随机 **屋檐/装饰** 上限；**L3 起**另随机 **平台 2–3 段** + 屋檐 + 装饰。本层达标后进入下一层。


{
  "version": 1,
  "canvasW": 1024,
  "canvasH": 576,
  "boatScale": 8.3,
  "cameraWorldTop": 0,
  "boat": {
    "x": 24,
    "y": 409,
    "w": 614.2,
    "h": 149.4
  },
  "buildZone": {
    "x": 32,
    "y": 291,
    "w": 479,
    "h": 88
  },
  "sprites": [
    {
      "category": "wall",
      "file": "gemini/wall/wall-02.webp",
      "x": 132,
      "y": 348,
      "w": 100,
      "h": 120,
      "flipH": false,
      "z": 7,
      "note": ""
    },
    {
      "category": "door",
      "file": "gemini/door/door-01.webp",
      "x": 341,
      "y": 279,
      "w": 40,
      "h": 60,
      "flipH": false,
      "z": 8,
      "note": ""
    },
    {
      "category": "window",
      "file": "gemini/window/window-04.webp",
      "x": 267,
      "y": 242,
      "w": 29,
      "h": 60,
      "flipH": false,
      "z": 8,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-02.webp",
      "x": 226,
      "y": 348,
      "w": 180,
      "h": 120,
      "flipH": false,
      "z": 5,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/eave-04.webp",
      "x": 109,
      "y": 237,
      "w": 120,
      "h": 40,
      "flipH": true,
      "z": 8,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-03.webp",
      "x": 225,
      "y": 235,
      "w": 180,
      "h": 120,
      "flipH": false,
      "z": 7,
      "note": ""
    },
    {
      "category": "door",
      "file": "gemini/door/door-03.webp",
      "x": 160,
      "y": 406,
      "w": 40,
      "h": 60,
      "flipH": false,
      "z": 8,
      "note": ""
    },
    {
      "category": "window",
      "file": "gemini/window/window-04.webp",
      "x": 343,
      "y": 364,
      "w": 29,
      "h": 60,
      "flipH": false,
      "z": 9,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-03.webp",
      "x": 131,
      "y": 124,
      "w": 100,
      "h": 120,
      "flipH": false,
      "z": 11,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-03.webp",
      "x": 225,
      "y": 124,
      "w": 180,
      "h": 120,
      "flipH": false,
      "z": 11,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-02.webp",
      "x": 227,
      "y": 314,
      "w": 180,
      "h": 40,
      "flipH": false,
      "z": 15,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-10.webp",
      "x": 174,
      "y": 67,
      "w": 33,
      "h": 22,
      "flipH": true,
      "z": 39,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-07.webp",
      "x": 430,
      "y": -52,
      "w": 41,
      "h": 56,
      "flipH": false,
      "z": 17,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-04.webp",
      "x": 395,
      "y": 238,
      "w": 30,
      "h": 100,
      "flipH": false,
      "z": 33,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-03.webp",
      "x": 130,
      "y": 198,
      "w": 100,
      "h": 40,
      "flipH": false,
      "z": 21,
      "note": ""
    },
    {
      "category": "door",
      "file": "gemini/door/door-01.webp",
      "x": 262,
      "y": 52,
      "w": 40,
      "h": 60,
      "flipH": false,
      "z": 35,
      "note": ""
    },
    {
      "category": "door",
      "file": "gemini/door/door-03.webp",
      "x": 328,
      "y": -173,
      "w": 44,
      "h": 60,
      "flipH": false,
      "z": 49,
      "note": ""
    },
    {
      "category": "door",
      "file": "gemini/door/door-02.webp",
      "x": 353,
      "y": 167,
      "w": 40,
      "h": 60,
      "flipH": false,
      "z": 25,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/eave-01.webp",
      "x": 224,
      "y": 122,
      "w": 196,
      "h": 30,
      "flipH": false,
      "z": 33,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/eave-03.webp",
      "x": 243,
      "y": 9,
      "w": 180,
      "h": 30,
      "flipH": false,
      "z": 36,
      "note": ""
    },
    {
      "category": "window",
      "file": "gemini/window/window-03.webp",
      "x": 341,
      "y": 30,
      "w": 58,
      "h": 60,
      "flipH": false,
      "z": 35,
      "note": ""
    },
    {
      "category": "window",
      "file": "gemini/window/window-01.webp",
      "x": 256,
      "y": -84,
      "w": 88,
      "h": 60,
      "flipH": false,
      "z": 39,
      "note": ""
    },
    {
      "category": "window",
      "file": "gemini/window/window-02.webp",
      "x": 250,
      "y": 132,
      "w": 48,
      "h": 60,
      "flipH": false,
      "z": 32,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-02.webp",
      "x": 228,
      "y": 202,
      "w": 180,
      "h": 40,
      "flipH": false,
      "z": 31,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-04.webp",
      "x": 226,
      "y": 6,
      "w": 180,
      "h": 120,
      "flipH": false,
      "z": 33,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-04.webp",
      "x": 134,
      "y": 5,
      "w": 100,
      "h": 120,
      "flipH": false,
      "z": 34,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-02.webp",
      "x": 227,
      "y": 89,
      "w": 180,
      "h": 40,
      "flipH": false,
      "z": 35,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-03.webp",
      "x": 132,
      "y": 86,
      "w": 100,
      "h": 40,
      "flipH": false,
      "z": 36,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/eave-04.webp",
      "x": 114,
      "y": 124,
      "w": 120,
      "h": 40,
      "flipH": true,
      "z": 36,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/eave-04.webp",
      "x": 111,
      "y": 8,
      "w": 120,
      "h": 30,
      "flipH": true,
      "z": 37,
      "note": ""
    },
    {
      "category": "platform",
      "file": "platformer.webp",
      "x": 232,
      "y": -9,
      "w": 250,
      "h": 20,
      "flipH": false,
      "z": 39,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-03.webp",
      "x": 131,
      "y": 235,
      "w": 100,
      "h": 120,
      "flipH": false,
      "z": 7,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-02.webp",
      "x": 134,
      "y": -108,
      "w": 100,
      "h": 120,
      "flipH": false,
      "z": 37,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-02.webp",
      "x": 228,
      "y": -108,
      "w": 180,
      "h": 120,
      "flipH": false,
      "z": 38,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/eave-03.webp",
      "x": 247,
      "y": -106,
      "w": 180,
      "h": 30,
      "flipH": false,
      "z": 39,
      "note": ""
    },
    {
      "category": "door",
      "file": "gemini/door/door-01.webp",
      "x": 346,
      "y": -51,
      "w": 40,
      "h": 60,
      "flipH": false,
      "z": 38,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-04.webp",
      "x": 150,
      "y": -101,
      "w": 30,
      "h": 100,
      "flipH": true,
      "z": 41,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-03.webp",
      "x": 130,
      "y": -30,
      "w": 100,
      "h": 40,
      "flipH": false,
      "z": 42,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-03.webp",
      "x": 131,
      "y": 312,
      "w": 100,
      "h": 40,
      "flipH": false,
      "z": 43,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Environment - Grass_01-23.webp",
      "x": 316,
      "y": -386,
      "w": 112,
      "h": 40,
      "flipH": false,
      "z": 65,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Environment - Grass_01-24.webp",
      "x": 223,
      "y": -172,
      "w": 112,
      "h": 56,
      "flipH": false,
      "z": 49,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Environment - Grass_03     .webp",
      "x": 315,
      "y": -269,
      "w": 40,
      "h": 40,
      "flipH": false,
      "z": 61,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Environment - Quest Board.webp",
      "x": 417,
      "y": -281,
      "w": 56,
      "h": 56,
      "flipH": false,
      "z": 44,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-04.webp",
      "x": 136,
      "y": -226,
      "w": 100,
      "h": 120,
      "flipH": false,
      "z": 45,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-04.webp",
      "x": 228,
      "y": -225,
      "w": 180,
      "h": 120,
      "flipH": false,
      "z": 46,
      "note": ""
    },
    {
      "category": "platform",
      "file": "platformer.webp",
      "x": 233,
      "y": -240,
      "w": 250,
      "h": 20,
      "flipH": false,
      "z": 60,
      "note": ""
    },
    {
      "category": "window",
      "file": "gemini/window/window-04.webp",
      "x": 256,
      "y": -216,
      "w": 29,
      "h": 60,
      "flipH": false,
      "z": 48,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/eave-01.webp",
      "x": 221,
      "y": 237,
      "w": 196,
      "h": 30,
      "flipH": false,
      "z": 51,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/eave-01.webp",
      "x": 221,
      "y": 352,
      "w": 196,
      "h": 30,
      "flipH": false,
      "z": 52,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/eave-04.webp",
      "x": 115,
      "y": -338,
      "w": 120,
      "h": 30,
      "flipH": true,
      "z": 59,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/eave-04.webp",
      "x": 115,
      "y": -224,
      "w": 120,
      "h": 30,
      "flipH": true,
      "z": 54,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-02.webp",
      "x": 230,
      "y": -140,
      "w": 180,
      "h": 40,
      "flipH": false,
      "z": 55,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-03.webp",
      "x": 135,
      "y": -338,
      "w": 100,
      "h": 120,
      "flipH": false,
      "z": 56,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-03.webp",
      "x": 228,
      "y": -338,
      "w": 180,
      "h": 120,
      "flipH": false,
      "z": 57,
      "note": ""
    },
    {
      "category": "door",
      "file": "gemini/door/door-02.webp",
      "x": 353,
      "y": -289,
      "w": 40,
      "h": 60,
      "flipH": false,
      "z": 58,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/eave-03.webp",
      "x": 246,
      "y": -220,
      "w": 180,
      "h": 30,
      "flipH": false,
      "z": 59,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/eave-03.webp",
      "x": 250,
      "y": -339,
      "w": 180,
      "h": 30,
      "flipH": false,
      "z": 60,
      "note": ""
    },
    {
      "category": "window",
      "file": "gemini/window/window-01.webp",
      "x": 250,
      "y": -325,
      "w": 88,
      "h": 60,
      "flipH": false,
      "z": 59,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-04.webp",
      "x": 134,
      "y": -455,
      "w": 100,
      "h": 120,
      "flipH": false,
      "z": 62,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-04.webp",
      "x": 227,
      "y": -455,
      "w": 180,
      "h": 120,
      "flipH": false,
      "z": 63,
      "note": ""
    },
    {
      "category": "wall",
      "file": "gemini/wall/wall-03.webp",
      "x": 405,
      "y": -403,
      "w": 50,
      "h": 60,
      "flipH": false,
      "z": 64,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/eave-03.webp",
      "x": 407,
      "y": -405,
      "w": 55,
      "h": 30,
      "flipH": false,
      "z": 67,
      "note": ""
    },
    {
      "category": "window",
      "file": "gemini/window/window-04.webp",
      "x": 441,
      "y": -378,
      "w": 12,
      "h": 29,
      "flipH": false,
      "z": 68,
      "note": ""
    },
    {
      "category": "platform",
      "file": "platformer.webp",
      "x": 228,
      "y": -358,
      "w": 250,
      "h": 20,
      "flipH": false,
      "z": 67,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-04.webp",
      "x": 452,
      "y": -459,
      "w": 30,
      "h": 100,
      "flipH": false,
      "z": 68,
      "note": ""
    },
    {
      "category": "door",
      "file": "gemini/door/door-02.webp",
      "x": 291,
      "y": -405,
      "w": 40,
      "h": 60,
      "flipH": false,
      "z": 69,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/eave-01.webp",
      "x": 221,
      "y": -453,
      "w": 196,
      "h": 30,
      "flipH": false,
      "z": 70,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-03.webp",
      "x": 133,
      "y": -375,
      "w": 100,
      "h": 40,
      "flipH": false,
      "z": 71,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-03.webp",
      "x": 133,
      "y": -260,
      "w": 100,
      "h": 40,
      "flipH": false,
      "z": 72,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-03.webp",
      "x": 134,
      "y": -143,
      "w": 100,
      "h": 40,
      "flipH": false,
      "z": 73,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-02.webp",
      "x": 227,
      "y": 427,
      "w": 180,
      "h": 40,
      "flipH": false,
      "z": 70,
      "note": ""
    },
    {
      "category": "other",
      "file": "gemini/other/other-03.webp",
      "x": 130,
      "y": 425,
      "w": 100,
      "h": 40,
      "flipH": false,
      "z": 71,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Building - Canopy 03.webp",
      "x": 406,
      "y": 127,
      "w": 56,
      "h": 56,
      "flipH": false,
      "z": 30,
      "note": ""
    },
    {
      "category": "eave",
      "file": "gemini/eave/Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Building - Roof A 04.webp",
      "x": 408,
      "y": -103,
      "w": 50,
      "h": 30,
      "flipH": false,
      "z": 35,
      "note": ""
    }
  ]
}