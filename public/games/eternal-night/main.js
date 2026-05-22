(function () {
  'use strict';

  var LAB_MODE = !!window.ETERNAL_NIGHT_LAB;

  // ===================== CONSTANTS =====================
  var TILE = 16;          // tile size in pixels
  var MAP_W = 80;         // map width in tiles
  var MAP_H = 80;         // map height in tiles
  var VIEW_W = 800;       // canvas width
  var VIEW_H = 600;       // canvas height (4:3)
  var SCALE = 2;          // render scale (16px tile → 32px on screen)
  /** 所有单位位移速度（英雄 / 怪物 / 飞刀 / 圣水下落 / 环绕武器转速 / 宝石吸附 / 受击侧移） */
  var GAME_MOVE_SPEED_MULT = 0.7;
  var GRASS_SRC_PX = 128;
  var GRASS_DRAW_MULT = 1.8; // 128px art × mult → patch size; draws edge-to-edge (no gaps)

  function getGrassPatchTiles() {
    var targetPx = Math.round(GRASS_SRC_PX * GRASS_DRAW_MULT);
    return Math.max(1, Math.ceil(targetPx / (TILE * SCALE)));
  }

  function getGrassPatchScreen() {
    return getGrassPatchTiles() * TILE * SCALE;
  }

  // HUD layout: one row under exp bar (skill slots + timer)
  var HUD_EXP_Y = 6;
  var HUD_EXP_H = 20;
  /** Same corner radius as exp bar trough (see drawTopHUD). */
  var HUD_EXP_CORNER_R = 4;
  var HUD_PAD = 12;
  var HUD_ROW_GAP = 4;       // exp bar bottom → skill row top (matches timer visual gap)
  var SKILL_SLOT_SIZE = 26;
  var SKILL_SLOT_GAP = 3;
  var SKILL_ICON_PAD = 2;
  var HUD_KILL_ICON_SIZE = 16;
  var HERO_HP_BAR_W = 36;
  var HERO_HP_BAR_H = 4;
  var HERO_HP_BAR_GAP = 4;
  /** Boss 血条：HUD 技能栏下方固定长条（不随镜头移动） */
  var BOSS_BAR_H = 12;
  var MAX_WEAPON_AMOUNT = 6;
  var MAX_BIBLE_AMOUNT = 6;
  var MAX_HOLY_WATER_AMOUNT = 6;
  var HOLYBOOK_SRC_W = 25;
  var HOLYBOOK_SRC_H = 29;
  var HOLYBOOK_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAdCAYAAABfeMd1AAABvklEQVR4AeyWMUvDYBCGr62DBYeCgnsHF8FBCh0cVBB/gTg5Ovgj9D+IiFhwExRBZ0d1cBCLg6ODi4uCQjcdlNrnI5deAl+/RNOtpW/u7r27903ShrYs/Ve3lw4DoibdzcWmDAOceHmmPu0M6tWKrK80hVgUegburVfiiiyHzk9XFFnmmcllgvj1w6MoqBEJIbMJgoh/jk+Kghr+3yaIACt0eH5ly+DtG3gliHO2ioRyVGiPyHxEJ4LXhAUW9dZotNvKaWSePTtD7jWhqeD2WMDbmhzOh0wmW2vLYoGYrcnhfPCa1ColWZqfk+rXRwJWKN1jnj07Q+41ockCiwq4NLRHZD7dpx5owgCLgNwH+sDXD5r4FvPwI5M8dyv+0cq1lHf4T59J6OFLn0RmE76iPAv2AaSGT4um68wmLCKIsIIaPoSESfu2HZoXhBXB4WggYdJYaEiRiDz63y7EV3f2pEgc3dw5n/hKEN/emJWLs12HVmvfRWqbUytCPHq4xCb8sYMA750xmap9kzpoDu+I6KA8pfaIlqdXfnp+K+llvb5MyOXBqdyfHLtIbuHjmdGeRjj0nAmHHpwRZkUD7V8AAAD//zsV2lMAAAAGSURBVAMAEGB/NCe/Zl0AAAAASUVORK5CYII=';
  var WIZARD_FALL_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAu4AAACWCAYAAACB8w1PAAAUG0lEQVR4nO3dX2ic15nH8d+sU3dXmnUrm8hialuiy46bRkj4IjHCpNQ2crAVXxT/wU1QQLRsN4KwJiwsioWyNhP5LqjtIqclwUuMW6+tXCyx5CTCcrPFHVxfBAvvBossSPJGWEpcLa0kukrg7MX4vHPm1fvOH1t/5/1+QGg0GskT+2TmN8885zkSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgFVnKFVnVvo+AACApfMXK30HAAAAAACIhI6mCqrtAACUOSruwBrX0VRhmluqV/puAACAJUZwB9aYjqYKQz87AADRQ3AH1hB/S0yhFhkC/toyuUP8ewEAAJSLoPAeFOCHUnVU5tcAwjoAoFixlb4Dq8k1ZZ5Adz/E38tQqs7s6Rzl7xNLygZ029M+2D+l7rNzkqRrfXXedc0t1Rrsn9Lp9BxrEgCAMsGT+iIhuEfL5A6ZzR+v7P8/HU0VZl96Tt/dkfm65y8rcr5PaAcAoLzQ4x7CVt+LNdg/Ffo92hXKw2pqaXBbY/7r42xoP52ei9mPFbtzWDKraQ0CAJYfwV3ZkO6GdX+7TKlBHuVnpSvsQUyqTh82ZUI7IyHLR1hAX41rEACwfB5b6TuwEtwQbtsM9HEmrM+nu73vrW961XuSzNf3nm+yx1CqzuSrxmNtCgpQ1yTzMPsjHkXQ2rLv8NC6tXYR0AEAQSLx5BBUvaq+2aCpp4YlZZ8k3dBuueE9H3sIjg1LbmCnbaE82XW1+WPF/D3vS90Db18s2rXlf/HImlsbVsNeCQAAVoXJHTLmqwZjvmow9rJ7nf2QMtXS2xeOm/l0tzFf/7r3Od/v9/eu27F8Q6k6EzaiD2ufXUP2sr3eXrfUwtYW6w0AgPJW1j3u1TcbFlx2r5OkqaeGF7Q4fPmb13I+j99qDQxEg/1TXni3n7vPzunJd0clUfUsV+4acqulsceGl/zfO184Z70BAFDeyjq452PbZFzJ2tzNfSNjhXvTbXi3bTFTP8xM+ZByK/JMllnb/O1WyxHS/ebT3ebkG52SCOkAAERRJIL7f/bt8T5/efOYpp4aVvXNBv3msWH937+26lpNjbpqakzqBz/zwrr9PH6r1WxrPBcYkmx4cg+6saHdXm9Pr2SD6tpWTGX9YUb1zae7jf3Idzu30k5ojyYmWwEAIhHcnzw8pC9vHpOUCeR2Y+puKbat8Vzsxx8068cfNEuSLh6/4IX20a6Bgr/bzsy2m1NNqk4mVed9b7B/Ku+Md6x9ty8cN5L0+T8dLzq8+8P6175/sqg/a2RsyvvzEC3LPbEIALD6lPUTweQOGbcf2Vbef/vKRbVc2attjediB+vrzeT0tCSpb2CP3np2UJL09IYNari0U4cPDOn3n31W9GQZe5mqaPmy68qtvM+nu419wVd/rKfgv/3tC8dNsrZaX/v+SW8vhRQ8xaijqcK88A9/531dzO8HAADlp6wr7v4xa08eHtJvX7nofX1NMq/cvq3NVVXaXFWlwweG9P66dXp/3Tqdmp3V4QND2lxVpYP19SVVOAnt5W3zx4q5od181WDcwH1NMv62hvFbraarpibnupGxqZzQ7rZn2evsi8Fftb+z2P8ZQKhi2rcAAMuv7A9gij02HPOP6Yt31uqj65+qKpnUqdlZ6UHFfXNVVeDv+Mn8vN5b+ruKNcZ81WDcAF9/rCd2JpEwSiTUcmWv1HjOu+22xnOx8VutRs8OGntbG4zCNkHb0L7r/hY1XNupN3cT3gEAiLLIVYbP9TYZSZpJjWlrPJ7zvVOzs5JyA/zk9LS6KislSc+NjIT+ffmrU8Ue3ITyciaRMPHOWklSVc/9BWtm/Farse1YknS055h3uf5YT2z8Vqs58/fvetftur/Fuzx9fJMkqbU9zdqKkNsXjpv6Yz0x2161HI8tpbZ+AQCWRyQfkM8kEl7IDgvvVt/AHg0fuRH4exou7dSbu/v1fO+L3ijJkbEpLdeTK1afoBeGQeFdkrefwob30a4BNVzaKRvc3dB+d2ZGkvTSxATrKoIeJUi7RYViHpfczc+EdgBYXcq6xz2MG35sILK6KivVN5DZxNpmskV0/+1cv2p/RyNjUwtGSSJ6WtvTsZnUmKTsmrmcTHoL6WB9vTl8YEiHDwzlTDKyof3wgSHtur+F0I4cbuA+k0iYsEPh/PzvBBbTt85+CgBYvcq+xz3MSxMTMVt5t8HIrb63GbOgGu8P79PXP/Uun//pLyWxMRUL19bWeFyXk0nzi/XrJWVbsQ4fGJLWrZMkvT87Kz3YDP0LZfZV5HuxiOjx9lCUwL4DaKcXFRo7ejmZNJl3EgnvALAaRbLibr00MRELq2L6QzvVTpQiaL38ZH5ek9PT3oedZuR+2Nu5oT3fOkX02M317js5UvDkIstOL7Kfgyr29vcNH7mhJ1Lb9URq+2LfdQDAI4psxd3lVkgL3S7nivYJ72KHKhidhhx2Xbnv6NiNzpJ0KmCa0eT0tOTcBnDZjc8zqTFVPXgnx+6h8E8uOnXvXszuvbGKaeO7OzMjpWYoVgDAKhTpirsfrQlYbIX2U0jKqcLb/RW2yk54gqvQHgp7ErQkddXUmNQPfrZg7834rVazrfFczrryV+9ZdwCwOhHcgSXmD+/uR5sxgZuhgY6mCuN+2OuDXgwGhXd387MN7aNdAwv+HPdnKV4AwOpGcA8wfOSGGi7tzLlc6qYwwBVUPS+0GRpwuQE+qCJuA3gxk4v8PyMxvQgA1gIeoB02nG+Nx/WN8/0533vmqb8N/btyq2FMlUE+HU0VZtvYNyVlg3vDpZ3eWQH2cr7DvhA97mOMy64lKfeFoJ1gNPlgH4XL3QQtacFG6EW4uwCAJcLmVJ+BjRslSYduzuk/PnxXbSdadfb1cwV+KoPQjnxs+Bqv/d+cwAUUYh9b/AHeXUt29KiUDezuxmfXo4R2ex94vAOwHDiZPhetMpLmP0+ZM4mEORvLXQvf23dIktR2onUl7hbKhL9H2QYe+olRqtPpuZj7IWXCu+XunWgzRgf+8IcFVXf7damh3V3HzS3VGkrV0T4IYFGEjbP1h3YOuKTirvFbrebexB396Fa71Nirsw+e1N7tfUGH2s9r6Pw11SZ3Bk5iAAqhjQpLKbum5iQpZy/O1njcC+dueO8b2OO1ZpXaGtPcUq09naOx0+nRR7nbKFNhJ/NGvUKKwoLG2UrZQ+TcwB71PBbpinvQISS2UmWf6PovndTYyA195JySCpQqX2gP2gwNPAz/Jmh7dkDQ5KJSQntHU4VpbqlecF3Q1BuUJ1sRDTvkKyi0j4xNUSFF0fzjbO1a86+hKId2KcIV9/nPU+bexJ28t+l9/YCkTHjvqqyM/Ks8lCZfL7B7ONPWeFxj8136xvnM98bmJam4fRVAGLfnXVo4uSgobAetVXu7wf4p7UvP5fycDfN7Okd5XCxzXkVUkr8qKmUro/ayi+dOFMtdZ289O6iLxy/oaM8x7/sbnri/YvdttYhscF//eGfMH97tW8stV/Zq65EbOjU7Kyl7UE7QAw+VJuRTqD0mbDP0mUTCMOEDi6mYcaP5Hs/2pTPtON1n53Str867ntC+tvj/jUtp4bPPgeO3Ws1bzw7KX30Pq64T2lEsO85Wkvo+aPbC+9MbNiwYZxtVkf2fyb6iq0ls9677cNc7XnC3PaBS7rg+/5g+JizgYT39rW8ZO/XjUHum3P43T1VIyj9+FCjGmUTClDpyNCy4N7dUK9Y5Kkn67g6p+tdS7DvRff5Yy8L+jUt5DrucTBq3pe+tZwclKacyKmWrowR3FONgfX3O2sw3zva927cju6YiW3GvSWzXvYk7shX3msT2BW8tB7mcTBpmbGMxtBkTuhkaWAzFPKa5wsPblFFT5kXlh5Ka+6o1lJKh2r72uP/GbogvtRI/fOSG7s7M6GwsllMZlUR1FA/FH9TzjbN9bznu0CoV2eB+b+KOV23397r377+qlit71b//qvekV+oTIJDP+K1WU5PYLjX2quXKXu8Jrv/SSbUceU3zn6fM+sc7CUVYVexUGWmKFsEyEHY+QNB1p9NzsYP19caeAWBtrqrKPH6tW+dd9/7srHRgyAteB6uqTKEKKe9e4/effRZz3yk8FXAexeT0tPSgfTmqIhncbW+7De81ie16u7E39PbDR24saJ8BSuXfU3Fv4o62xuPq339VisVyNkN/O7ltpe4mypCdVjR85EZ2clHjSEm/Ixvas4ZSdVTdy4A/LPtD+677W3Q5KSMntNtqu6anAyujR9v/WjOpMQ1s3Ji3Qurf7Nzcwjs5UeaOse2Kx3VqdjanEv/yiW26mxpbqbu3KkQyuNuNqfayO/sYWApBo0drEts1rMyLwhbJq7p3VVZqWqLqjkWxFJOLTqfnYh1NFWawf4rwXoZskL+cTC543HIP7rKDG2ygnz6+SRd7/yRJutj7J00+CPaFKqScDwApu95ywntlpaaPb9LPXx/3zqCoinj3QySDu5QJ7KX+DO0yeBj+d3js5w93vePdpn//VXXF415VtKrnvv5N/St4r7GW2Vastxt7QycXlSIT5KaMG9JtuCNslRdbZPjo+qclVTZPzc6qb9dO/fz1TAGizRi1XNkrKfOOT9D+sLDzAdyvaZ2JDjdjuVP+JKmq8v6C20RVpA9gCpNvUdydmQmsQgB+85+njD2Z191P4U4ysqL+QIRHZ9ebDV73Ju5kWhkc39t3SJLUdqK15N9/Oj0Xo7Je3ubT3eaPn2zKtO9JinfW5nzff8CXy1ZD7SFftr3UbmL1c88HiHWOyj3IK9MyU01ojzB3zdg15O47jDKCewi7QTUfZrgjH/ddHX9gt9X2oCc0aybifXwoXlgrVldlpSanpzU5Pa13e1+QJA2dv6b/vjmnc71NPH7BM5/uNu4cdvfxxwb2M4mECWotte8U2gppV0BrjC16+U/adc8HsIFd4nwAZLjrChmRbZUpVtDbMvYB6Lr+Z4XuFdYKf3Xd3yIDPKpCrVh9A3vUv/+qN3rUTi76dnIl7zVWk9sXjntBuv5YTzYwt0+E/ozbh6yAqro7u90N+7vub9H1TZnnzuaWaik9Kkma+qG0+9ejnA8QUUEvCO10PxetMgR3YEkF7aWwrVZh1fZ8VXjACgrseVuxZmdzJhe9fILJRcjICesPaeuDPTpBbLXeVk5/t/sL/XP/P+q1V1LifAC4IyCl7HNg//6rqv/3jyTZDfVXA346emiVWQT04aFY7I/AYim1FcttX+iqrNRMaox2GTySrfF4TmDPGTcaIN5Zqzd39+v53hclSSff6JQkr599sH9Kg/1TgT+L6PmrziveRvpSN9SXM4K7T1i1085yL3Q7IAxjR7HY7DkUNrQXasXqG9iTE+Bb29MUHVAS91BCKzNqtN/7GJvvWvBz/k2ttp8+7HyAxb/nWK1aruzVvuuZF3P+bPUoG+rLFa0yAQjlWGxhbwW67s7MqGE57xTWPFqxsFzsiFH7wtCOGZVyR41K4dVR+0Kx+1iPpNzeeonzAaIk6EBCy04zutj7gg61n9fQ+WuqTWbexYl6f7tExV3SwkpAGLtJIt9ILMDPX2kPC+1+rDGUilYsLKagEaOSFowZlbKVUan46mj9sZ6YDen2utPpuRijR8tb2BSshks7Fe+s9SYaTTob6sdGMifXU3gguHuCwrgN6s+NjMSeGxmJEdix2Nxd80E76IFi0YqFxRQWrqTM4Up2zKh/1KgdN1rseiSkR4s9td7dl+O+k2NDe1VP5sAld0N9vLNWd//8Z/3uiy/06saNkX28o1XGh2COxeQ+eZUyxop1iHzcdWUndtCKhcVSzGnP9sAlSTrlVEYlqeXIa6pe+GsRYcVMwfrjJ5v0zBtHNdo1ICmzxg4fyJzE+/KJbfqkM/OOz/O9LypZW63upleX/z9kFaDi/gjsW3orfT+wdriBigo7FgOtWFgsxZz2HNaqYCujUjbA8y4QrEJTsO7OzChZu/DlXpsxajNGM6kxPZHa7k0kkjKHhi3x3V6VqLgDSyTfk5b/FDgb4glTKKSUMEQrFkqx/vHOmNvPbiujkvJOK+qqrNSp2Vnv6zYTyTyFAoo5kDBZW63RkJ+fSY2pfiKzwXk+3W3WN70ayedLgjuwRGwIDwtaOUG9kRm1eDTFtmLx4hD5POxpz/aEXr8ziYRhzUHKVt3DNtG/fehf9MwbR/P+jjOJhHnmjaOKamiXCO7Akgt80iKo4yHle0EY1or10sREjDWHQi4nk8Yf0vNN8XC/x/6JaOpoqij67ZVd97fkfB20tjY8cd+7PmxNnf/pL0v6c13NLZl2nLW8IZrgDgBrUMEqJkEdRbIvAhm1h6WwbeybkqS7Wvn1ZU/m7WiqMOxRBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAg6/8B8ti9uHCZs54AAAAASUVORK5CYII=';

  var TILE_GRASS1 = 0;
  var TILE_GRASS2 = 1;
  var TILE_GRASS3 = 2;
  var TILE_GRASS4 = 3;
  var GRASS_TILE_KEYS = ['grass1', 'grass2', 'grass3', 'grass4'];
  var TILE_LAVA   = 1;

  // ===================== STATE MACHINE =====================
  // 'title' -> 'playing' -> ('paused' | 'levelup' | 'gameover'); 选角为标题页上的对话框
  var gameState = 'title';
  var characterSelectOpen = false;
  var deathScreenTimer = 0;

  // ===================== HERO ROSTER =====================
  // Two real characters, each with Idle + Run spritesheets
  var HERO_ROSTER = [
    {
      name: '战士',
      title: '皇家卫士',
      key: 'king',
      color: '#ffdd44',
      desc: '高生命与护甲减免，剑类伤害加成，初始环绕大剑',
      intro: '皇家卫士：高生命、移速较慢，适合顶线承伤。被动减免 25% 所受伤害（至少仍受 1 点）。剑刃类伤害提升。',
      fullName: '皇家卫士',
      passive: '护甲减免 25% 所受伤害（至少受到 1 点）。剑类武器伤害 ×1.25。初始武器：环绕大剑。',
      idleFrames: 8,
      runFrames:  8,
      frameW: 160,
      frameH: 111,
      bodyX: 64,
      bodyY: 51,
      bodyW: 34,
      bodyH: 53,
      footY: 104,
      displayH: 25,
      maxHp: 120,
      speed: 0.78,
      armor: 0.25,
      expMult: 1.0,
      startWeapon: 'greatsword',
      swordMult: 1.25,
      greatswordDisp: 40,
      greatswordOrbit: 52,
      knifeCooldown: 2000,
      knifeDamage: 1,
      idleAnimSpeed: 105,
      runAnimSpeed: 88,
      contactBox: { w: 8, h: 14, footOx: 1, footBottom: 0 }
    },
    {
      name: '法师',
      title: '奥术行者',
      key: 'wizard',
      color: '#88aaff',
      desc: '经验 +10%，飞刀更痛，圣水略弱，初始环绕圣经',
      intro: '奥术行者：移速较快、生命较低。被动经验获取 +10%，升级更快。',
      fullName: '奥术行者',
      passive: '经验获取 +10%。飞刀伤害基数更高。圣水伤害 ×0.9（需解锁，规则同飞刀）。初始武器：环绕圣经。',
      // assets/role/wizard: 150×150 — Idle(等待)×8, Death×5；移动也用 Idle
      useIdleWhenMoving: true,
      idleFrames: 8,
      runFrames:  8,
      deathFrames: 5,
      frameW: 150,
      frameH: 150,
      bodyX: 54,
      bodyY: 44,
      bodyW: 35,
      bodyH: 58,
      footY: 101,
      displayH: 32,
      idleAnimSpeed: 130,
      deathAnimSpeed: 140,
      maxHp: 80,
      speed: 0.88,
      armor: 0,
      expMult: 1.1,
      startWeapon: 'bible',
      bibleDamage: 2,
      bibleMult: 1.0,
      bibleDisp: 24,
      bibleOrbit: 72,
      bibleRpm: 40,
      bibleDuration: 3000,
      bibleCooldown: 3000,
      bibleHitDelay: 1700,
      holyWaterMult: 0.9,
      holyWaterDisp: 24,
      holyWaterCooldown: 2600,
      holyWaterFallSpeed: 4.2,
      holyWaterSpinRps: 2.5,
      holyWaterBurstDisp: 64,
      swordMult: 1.0,
      greatswordDisp: 32,
      greatswordOrbit: 48,
      knifeCooldown: 1500,
      knifeDamage: 2,
      contactBox: { w: 8, h: 14, footOx: 1, footBottom: -1 }
    }
  ];

  /** 选角界面：每名英雄两个技能（图标与 HUD 一致） */
  var SELECT_HERO_SKILLS = {
    king: [
      {
        title: '环绕大剑',
        intro: '在身侧轨道回旋，持续接触敌人造成伤害；战士对剑类伤害有额外加成。',
        logoKey: 'knife1'
      },
      {
        title: '飞刀',
        intro: '按冷却向面朝方向掷出，命中造成伤害；升级可增加飞刀把数与施放频率。',
        logoKey: 'knife2'
      }
    ],
    wizard: [
      {
        title: '环绕圣经',
        intro: '圣典沿周身旋转，进出环带时对敌人造成伤害；开局即可使用。',
        logoKey: 'holybook'
      },
      {
        title: '圣水',
        intro: '解锁后在脚下召唤圣水，落地旋转造成范围伤害；法师伤害系数略低。',
        logoKey: 'holy_water'
      }
    ]
  };

  var selectedHeroIndex = 0;
  var hoveredHeroIndex  = -1;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = VIEW_W;
    canvas.height = VIEW_H;
    var maxW = window.innerWidth;
    var maxH = window.innerHeight;
    if (LAB_MODE && canvas.parentElement) {
      maxW = canvas.parentElement.clientWidth;
      maxH = canvas.parentElement.clientHeight;
    }
    var scale = Math.min(maxW / VIEW_W, maxH / VIEW_H);
    canvas.style.width  = Math.floor(VIEW_W * scale) + 'px';
    canvas.style.height = Math.floor(VIEW_H * scale) + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  // ===================== AUDIO (exp pickup — VS-style synth) =====================
  var audioCtx = null;
  var expPickupPitchStep = 0;
  var lastExpPickupSoundAt = 0;

  function ensureAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (err) {
        return;
      }
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playExpPickupSound(expValue, large) {
    if (!audioCtx || gameState !== 'playing') return;
    var t = audioCtx.currentTime;
    if (t - lastExpPickupSoundAt < 0.03) return;
    lastExpPickupSoundAt = t;

    expPickupPitchStep = (expPickupPitchStep + 1) % 10;
    var pitch = 1 + expPickupPitchStep * 0.05;
    var base = large ? 520 : 740;
    var f0 = base * pitch;
    var f1 = f0 * (large ? 1.6 : 1.85);

    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(80, f1), t + 0.07);

    var peak = large ? 0.14 : 0.1;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    osc.start(t);
    osc.stop(t + 0.1);

    var blip = audioCtx.createOscillator();
    var blipGain = audioCtx.createGain();
    blip.type = 'sine';
    blip.connect(blipGain);
    blipGain.connect(audioCtx.destination);
    blip.frequency.setValueAtTime(f1 * 1.2, t + 0.02);
    blipGain.gain.setValueAtTime(0.0001, t + 0.02);
    blipGain.gain.linearRampToValueAtTime(peak * 0.35, t + 0.03);
    blipGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    blip.start(t + 0.02);
    blip.stop(t + 0.08);
  }

  // ===================== ASSETS =====================
  var assets = {};
  var loadedCount = 0;
  var totalAssets = 0;

  function isImgOk(img) {
    return img && img.complete && img.naturalWidth > 0;
  }

  function loadImg(key, src) {
    totalAssets++;
    var img = new Image();
    img.onload = function () { loadedCount++; if (loadedCount >= totalAssets) onReady(); };
    img.onerror = function () { loadedCount++; console.warn('Failed: ' + src); if (loadedCount >= totalAssets) onReady(); };
    img.src = src;
    assets[key] = img;
  }

  loadImg('grass1', 'assets/map/grass1.webp');
  loadImg('grass2', 'assets/map/grass2.webp');
  loadImg('grass3', 'assets/map/grass3.webp');
  loadImg('grass4', 'assets/map/grass4.webp');
  loadImg('bat',       'assets/monsters/Bat-IdleFly.webp');
  loadImg('skeleton',  'assets/monsters/Skeleton_01_White_Walk.webp');
  loadImg('guardian',  'assets/monsters/Old_Guardian_walk.webp');
  loadImg('sl',        'assets/monsters/SL_walk.webp');
  loadImg('sprout',    'assets/monsters/Sprout_move.webp');
  loadImg('necromancer',    'assets/monsters/Necromancer_creativekind-Sheet.webp');
  loadImg('seeker_walk',  'assets/monsters/skeleton_seeker/skeleton_seeker_walk.webp');
  loadImg('seeker_spawn', 'assets/monsters/skeleton_seeker/skeleton_seeker_spawn.webp');

  assets.boss = { idle: [], walk: [], fly: [] };
  var BOSS_FRAME_COUNTS = { idle: 15, walk: 12, fly: 6 };
  function loadBossFrame(mode, index) {
    totalAssets++;
    var img = new Image();
    var src = 'assets/monsters/boss/' + mode + '/' + mode + '_' + index + '.webp';
    img.onload = function () {
      loadedCount++;
      if (loadedCount >= totalAssets) onReady();
    };
    img.onerror = function () {
      loadedCount++;
      console.warn('Failed: ' + src);
      if (loadedCount >= totalAssets) onReady();
    };
    img.src = src;
    assets.boss[mode][index - 1] = img;
  }
  (function loadBossAnimSets() {
    var modes = ['idle', 'walk', 'fly'];
    for (var mi = 0; mi < modes.length; mi++) {
      var mode = modes[mi];
      for (var fi = 1; fi <= BOSS_FRAME_COUNTS[mode]; fi++) {
        loadBossFrame(mode, fi);
      }
    }
  })();
  loadImg('weapon',   'assets/weapon/knife1.webp');
  loadImg('knife2',   'assets/weapon/knife2.webp');
  loadImg('holybook', HOLYBOOK_DATA_URL);
  loadImg('holy_water', 'assets/weapon/holy_water.webp');
  loadImg('holy_water_burst', 'assets/weapon/spritesheet.webp');
  loadImg('gem',    'assets/spr_coin_azu.webp');
  loadImg('gem_red', 'assets/spr_coin_roj.webp');
  loadImg('skull_normal', 'assets/Skull_Normal.webp');
  // Role sprites
  loadImg('king_idle', 'assets/role/king/Idle.webp');
  loadImg('king_run',  'assets/role/king/Run.webp');
  loadImg('wizard_idle',  'assets/role/wizard/Idle.webp');
  loadImg('wizard_death', WIZARD_FALL_DATA_URL);

  // ===================== GAME STATS =====================
  var gameTime  = 0;    // ms elapsed
  var killCount = 0;
  // Kill milestones → weapon pick (choose 大剑 or 飞刀, each up to MAX_WEAPON_AMOUNT)
  // 6 weapon picks from kills (each can +1 大剑 or 飞刀, cap 6 each)
  var KILL_WEAPON_MILESTONES = [70, 200, 380, 600, 850, 1150];
  // Level-up: at most one weapon card per screen
  var WEAPON_LEVELUP_MIN_LV = 4;
  var WEAPON_LEVELUP_2ND_SWORD_LV = 2;
  var WEAPON_LEVELUP_KNIFE_LV = 6;
  var WEAPON_LEVELUP_BASE_CHANCE = 0.26;
  var WEAPON_LEVELUP_CHANCE_PER_TIER = 0.07;
  var WEAPON_LEVELUP_CHANCE_CAP = 0.38;
  var killWeaponMilestoneIdx = 0;
  var pendingWeaponPicks = 0;
  var weaponUnlockToasts = [];
  var levelUpPickKind = 'upgrade'; // 'upgrade' | 'weapon' | 'exclusive'
  var HERO_EXCLUSIVE_LV = 15;
  var heroExclusiveBuff = null; // warrior: yujian|shengdun|zhanhou  wizard: shengguan|shengyu|chongsheng
  var rebirthUsed = false;
  var holyShieldTimer = 30000;
  var holyShieldReady = false;
  var battleCryTimer = 0;
  var holyDomainTick = 0;
  var EXCLUSIVE_AURA_RADIUS = 100;
  /** 战吼：径向击退速度（屏幕 px/s），直至敌人离开 EXCLUSIVE_AURA_RADIUS */
  var BATTLE_CRY_KNOCKBACK_SCREEN_SPEED = 200;
  var HOLY_DOMAIN_RADIUS = 50;
  var gold      = 0;
  var level     = 1;
  var exp       = 0;
  var expToNext = 10;   // exp needed for next level

  // EXP curve: each level needs more exp
  function calcExpToNext(lv) {
    return Math.floor(8 * Math.pow(1.28, lv - 1));
  }

  function getTimeMin() {
    return Math.floor(gameTime / 60000);
  }

  /** 每波 10 分钟；击杀 Boss 后开启下一波，怪物生命 ×2 累加 */
  var WAVE_CYCLE_MS = 600000;
  var BOSS_SPAWN_AT_MS = WAVE_CYCLE_MS;
  var waveCycle = 0;
  var cycleStartTime = 0;
  var bossSpawnFired = false;

  function getSegmentTime() {
    return Math.max(0, gameTime - cycleStartTime);
  }

  function getSegmentMin() {
    return Math.floor(getSegmentTime() / 60000);
  }

  /** 0→1：本波 0~10 分钟内刷怪压力递增 */
  function getSpawnProgress10m() {
    return Math.min(1, getSegmentTime() / WAVE_CYCLE_MS);
  }

  function getMonsterHpCycleMult() {
    return Math.pow(2, waveCycle);
  }

  function balanceHpMul(tMin) {
    return 1 + tMin * 0.10 + Math.max(0, tMin - 5) * 0.05;
  }

  function balanceDmgMul(tMin) {
    return 1 + tMin * 0.06;
  }

  function scaledMonsterHp(base, key) {
    if (key === 'bat') return 1;
    return Math.max(1, Math.ceil(base * balanceHpMul(getSegmentMin()) * getMonsterHpCycleMult()));
  }

  function scaledMonsterDmg(base) {
    return Math.ceil(base * balanceDmgMul(getSegmentMin()));
  }

  // Vampire Survivors 式刷怪：本波 0~10 分钟内数量与频率持续上升（常规密度约 ×2）
  function getSpawnInterval() {
    var p = getSpawnProgress10m();
    return Math.max(180, Math.floor((2200 - p * 1750) * 0.5));
  }

  function getMaxMonsters() {
    var p = getSpawnProgress10m();
    return Math.floor(72 + p * 188);
  }

  function getVsSpawnBatchSize() {
    var p = getSpawnProgress10m();
    if (p < 0.18) return 1;
    if (p < 0.42) return Math.random() < 0.48 ? 2 : 1;
    if (p < 0.72) return 1 + Math.floor(Math.random() * 2);
    return 2 + Math.floor(Math.random() * 2);
  }

  /** 后期略增精英占比；前几分钟几乎不出稀有怪 */
  function getEffectiveWeight(mType) {
    var p = getSpawnProgress10m();
    var segMin = getSegmentMin();
    var w = mType.weight;
    if (w <= 10) {
      if (segMin < 4 || p < 0.4) {
        w = Math.max(1, Math.floor(w * 0.35));
      } else {
        w = Math.min(14, w + Math.floor(p * 5) + Math.floor(segMin * 0.3));
      }
    } else if (w >= 26) {
      w = Math.max(12, w - Math.floor(p * 6) - Math.floor(segMin * 0.35));
    } else {
      if (segMin < 2 || p < 0.25) {
        w = Math.max(6, Math.floor(w * 0.65));
      } else {
        w = Math.max(8, w - Math.floor(p * 2));
      }
    }
    return Math.max(1, w);
  }

  function countMonstersByKey(key) {
    var n = 0;
    for (var ci = 0; ci < monsters.length; ci++) {
      if (MONSTER_TYPES[monsters[ci].type].key === key) n++;
    }
    return n;
  }

  function getBattleCryMult() {
    return (isWarrior() && battleCryTimer > 0) ? 2 : 1;
  }

  function getDamageMult() {
    if (!isWarrior() && !isWizard()) return 1;
    var dmg = playerUpgrades.damageBonus || 0;
    if (!LAB_MODE) dmg = Math.min(UPGRADE_CAP_DAMAGE, dmg);
    return (1 + dmg / 100) * getBattleCryMult();
  }

  function getBibleDamage() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    var baseDmg = entry.bibleDamage != null ? entry.bibleDamage : 1;
    var base = baseDmg + Math.floor((level - 1) / 5);
    return Math.max(1, Math.round(base * (entry.bibleMult || 1) * getDamageMult()));
  }

  function getSwordDamage() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    var base = 1 + Math.floor((level - 1) / 5);
    return Math.max(1, Math.round(base * entry.swordMult * getDamageMult()));
  }

  function getKnifeDamage() {
    return Math.max(1, Math.round(HERO_ROSTER[hero.rosterIndex].knifeDamage * getDamageMult()));
  }

  function getHolyWaterDamage() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    var base = 1 + Math.floor((level - 1) / 5);
    return Math.max(1, Math.round(base * (entry.holyWaterMult || 1) * getDamageMult()));
  }

  function cappedUpgradeBonus(val, cap) {
    val = val || 0;
    return LAB_MODE ? val : Math.min(cap, val);
  }

  function getSwordCastSpeedMult() {
    if (!isWarrior()) return 1;
    var sword = cappedUpgradeBonus(playerUpgrades.castSpeedBonus, UPGRADE_CAP_CAST_SPEED);
    var global = cappedUpgradeBonus(playerUpgrades.globalCastSpeedBonus, UPGRADE_CAP_GLOBAL_CAST);
    return (1 + (sword + global) / 100) * getBattleCryMult();
  }

  function getKnifeCastSpeedMult() {
    if (!isWarrior()) return 1;
    var knife = cappedUpgradeBonus(playerUpgrades.knifeCastSpeedBonus, UPGRADE_CAP_KNIFE_CAST);
    var global = cappedUpgradeBonus(playerUpgrades.globalCastSpeedBonus, UPGRADE_CAP_GLOBAL_CAST);
    return (1 + (knife + global) / 100) * getBattleCryMult();
  }

  function getBibleCastSpeedMult() {
    if (!isWizard()) return 1;
    var bible = cappedUpgradeBonus(playerUpgrades.bibleCastSpeedBonus, UPGRADE_CAP_BIBLE_CAST);
    var global = cappedUpgradeBonus(playerUpgrades.globalCastSpeedBonus, UPGRADE_CAP_GLOBAL_CAST);
    return 1 + (bible + global) / 100;
  }

  function getHolyWaterCastSpeedMult() {
    if (!isWizard()) return 1;
    var hw = cappedUpgradeBonus(playerUpgrades.holyWaterCastSpeedBonus, UPGRADE_CAP_HOLY_WATER_CAST);
    var global = cappedUpgradeBonus(playerUpgrades.globalCastSpeedBonus, UPGRADE_CAP_GLOBAL_CAST);
    return 1 + (hw + global) / 100;
  }

  function getKnifeCooldown() {
    if (!isWarrior()) return 1500;
    return Math.max(800, Math.round(2000 / getKnifeCastSpeedMult()));
  }

  function getHeroRosterEntry() {
    return HERO_ROSTER[hero.rosterIndex];
  }

  function heroUsesIdleWhenMoving(entry) {
    return !!entry.useIdleWhenMoving;
  }

  function getHeroAnimSheetKey(entry, moving, dead) {
    if (dead && entry.deathFrames) return entry.key + '_death';
    if (moving && !heroUsesIdleWhenMoving(entry)) return entry.key + '_run';
    return entry.key + '_idle';
  }

  function getHeroAnimFrameCount(entry, moving, dead) {
    if (dead && entry.deathFrames) return entry.deathFrames;
    if (moving && !heroUsesIdleWhenMoving(entry)) return entry.runFrames;
    return entry.idleFrames;
  }

  function getHeroAnimFrameMs(entry, moving, dead) {
    if (dead && entry.deathFrames) {
      return entry.deathAnimSpeed != null ? entry.deathAnimSpeed : (entry.idleAnimSpeed || 100);
    }
    if (moving && !heroUsesIdleWhenMoving(entry)) {
      return entry.runAnimSpeed != null ? entry.runAnimSpeed : (entry.animSpeed || 100);
    }
    return entry.idleAnimSpeed != null ? entry.idleAnimSpeed : (entry.animSpeed || 100);
  }

  function triggerHeroDeath() {
    if (LAB_MODE) {
      hero.hp = hero.maxHp;
      hero.dead = false;
      hero.invincibleTimer = 0;
      return;
    }
    if (heroExclusiveBuff === 'chongsheng' && isWizard() && !rebirthUsed) {
      rebirthUsed = true;
      wipeMonstersInRadius(EXCLUSIVE_AURA_RADIUS, true);
      hero.hp = Math.max(1, Math.floor(hero.maxHp * 0.5));
      hero.dead = false;
      hero.deathAnimFrame = 0;
      hero.deathAnimTimer = 0;
      deathScreenTimer = 0;
      hero.invincibleTimer = 1200;
      return;
    }
    if (hero.dead) return;
    hero.dead = true;
    hero.deathAnimFrame = 0;
    hero.deathAnimTimer = 0;
    deathScreenTimer = 0;
    hero.moving = false;
  }

  function updateHeroDeathAnim(dt) {
    var entry = getHeroRosterEntry();
    if (!entry.deathFrames) return;
    var frameMs = getHeroAnimFrameMs(entry, false, true);
    hero.deathAnimTimer += dt;
    while (hero.deathAnimTimer >= frameMs && hero.deathAnimFrame < entry.deathFrames - 1) {
      hero.deathAnimTimer -= frameMs;
      hero.deathAnimFrame++;
    }
  }

  function isHeroDeathAnimDone() {
    var entry = getHeroRosterEntry();
    return !entry.deathFrames || hero.deathAnimFrame >= entry.deathFrames - 1;
  }

  function updateHeroAnim(dt) {
    var entry = getHeroRosterEntry();
    if (hero.dead) {
      updateHeroDeathAnim(dt);
      return;
    }
    if (hero._lastMoving !== hero.moving && !heroUsesIdleWhenMoving(entry)) {
      hero.animFrame = 0;
      hero.animTimer = 0;
      hero._lastMoving = hero.moving;
    } else if (hero._lastMoving !== hero.moving) {
      hero._lastMoving = hero.moving;
    }
    var totalFrames = getHeroAnimFrameCount(entry, hero.moving, false);
    var frameMs = getHeroAnimFrameMs(entry, hero.moving, false);
    hero.animTimer += dt;
    if (hero.animTimer >= frameMs) {
      hero.animTimer -= frameMs;
      hero.animFrame = (hero.animFrame + 1) % totalFrames;
    }
  }

  function applyHeroStats() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    hero.maxHp = entry.maxHp;
    hero.hp = entry.maxHp;
    hero.armor = entry.armor || 0;
    hero.animSpeed = entry.idleAnimSpeed || entry.animSpeed || 100;
    refreshHeroMoveSpeed();
  }

  function refreshHeroMoveSpeed() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    var mult = (isWarrior() || isWizard()) ? playerUpgrades.speedMult : 1;
    hero.speed = entry.speed * mult * GAME_MOVE_SPEED_MULT * getBattleCryMult();
  }

  // Spell Brigade–style: additive % totals; global upgrades use lower tiers than single-skill
  var UPGRADE_CAP_SPEED = 28;
  var UPGRADE_CAP_SWORD_SIZE = 36;
  var UPGRADE_CAP_CAST_SPEED = 30;
  var UPGRADE_CAP_KNIFE_CAST = 28;
  var UPGRADE_CAP_BIBLE_CAST = 30;
  var UPGRADE_CAP_HOLY_WATER_CAST = 28;
  var UPGRADE_CAP_DAMAGE = 22;
  var UPGRADE_CAP_GLOBAL_CAST = 20;

  function statUpgradeAllowed(id) {
    var def = UPGRADE_DEFS[id];
    if (!def) return false;
    if (def.requiresKnife && getKnifeCount() <= 0) return false;
    if (def.requiresBible && getBibleCount() <= 0) return false;
    if (def.requiresHolyWater && getHolyWaterCount() <= 0) return false;
    return !isStatUpgradeCapped(id);
  }

  function getWizardStatPool() {
    var pool = ['speed', 'damage', 'globalCastSpeed'];
    if (getBibleCount() > 0) pool.push('bibleCastSpeed');
    if (getHolyWaterCount() > 0) pool.push('holyWaterCastSpeed');
    return pool.filter(statUpgradeAllowed);
  }

  var UPGRADE_DEFS = {
    speed: {
      bonusKey: 'speedBonus', cap: UPGRADE_CAP_SPEED, tiers: [3, 4, 5, 5],
      name: '移速提升', desc: function (a) { return '移速 +' + a + '%'; }
    },
    swordSize: {
      bonusKey: 'swordSizeBonus', cap: UPGRADE_CAP_SWORD_SIZE, tiers: [4, 6, 8, 8],
      name: '大剑尺寸', desc: function (a) { return '大剑尺寸 +' + a + '%'; }
    },
    castSpeed: {
      bonusKey: 'castSpeedBonus', cap: UPGRADE_CAP_CAST_SPEED, tiers: [3, 4, 5, 5],
      name: '大剑施法速度', desc: function (a) { return '大剑攻速 +' + a + '%'; }
    },
    knifeCastSpeed: {
      bonusKey: 'knifeCastSpeedBonus', cap: UPGRADE_CAP_KNIFE_CAST, tiers: [3, 4, 5, 5],
      name: '飞刀施法速度', desc: function (a) { return '飞刀攻速 +' + a + '%'; }, requiresKnife: true
    },
    bibleCastSpeed: {
      bonusKey: 'bibleCastSpeedBonus', cap: UPGRADE_CAP_BIBLE_CAST, tiers: [3, 4, 5, 5],
      name: '圣经施法速度', desc: function (a) { return '圣经攻速 +' + a + '%'; }, requiresBible: true
    },
    holyWaterCastSpeed: {
      bonusKey: 'holyWaterCastSpeedBonus', cap: UPGRADE_CAP_HOLY_WATER_CAST, tiers: [3, 4, 5, 5],
      name: '圣水施法速度', desc: function (a) { return '圣水攻速 +' + a + '%'; }, requiresHolyWater: true
    },
    damage: {
      bonusKey: 'damageBonus', cap: UPGRADE_CAP_DAMAGE, tiers: [2, 3, 4, 4],
      name: '伤害提升', desc: function (a) { return '全伤害 +' + a + '%'; }
    },
    globalCastSpeed: {
      bonusKey: 'globalCastSpeedBonus', cap: UPGRADE_CAP_GLOBAL_CAST, tiers: [2, 3, 4, 4],
      name: '全局施法速度', desc: function (a) { return '全技能攻速 +' + a + '%'; }
    }
  };

  function resetPlayerUpgrades() {
    playerUpgrades = {
      speedBonus: 0,
      swordSizeBonus: 0,
      castSpeedBonus: 0,
      knifeCastSpeedBonus: 0,
      bibleCastSpeedBonus: 0,
      holyWaterCastSpeedBonus: 0,
      damageBonus: 0,
      globalCastSpeedBonus: 0,
      speedMult: 1,
      swordSizeMult: 1,
      statPicks: {},
      swordCount: isWarrior() ? 1 : 0,
      knifeCount: 0,
      bibleCount: isWizard() ? 1 : 0,
      holyWaterCount: 0
    };
    levelUpQueue = [];
    levelUpChoices = [];
    hoveredUpgradeChoice = -1;
    pendingLevelForChoices = 0;
    resetExclusiveBuffState();
  }

  function resetExclusiveBuffState() {
    heroExclusiveBuff = null;
    rebirthUsed = false;
    holyShieldTimer = 30000;
    holyShieldReady = false;
    battleCryTimer = 0;
    holyDomainTick = 0;
  }

  function needsExclusiveLevelUp(lv) {
    return lv === HERO_EXCLUSIVE_LV && !heroExclusiveBuff;
  }

  function hasYujianLunge() {
    return isWarrior() && heroExclusiveBuff === 'yujian';
  }

  function hasShengguanShockwave() {
    return isWizard() && heroExclusiveBuff === 'shengguan';
  }

  function getHeroCenterWorld() {
    return { x: hero.x + TILE / 2, y: hero.y + TILE / 2 };
  }

  function wipeMonstersInRadius(radius, skipBoss) {
    var c = getHeroCenterWorld();
    for (var j = monsters.length - 1; j >= 0; j--) {
      var m = monsters[j];
      if (m.hp <= 0) continue;
      var mType = MONSTER_TYPES[m.type] || MONSTER_TYPES[0];
      if (skipBoss && isMonsterBoss(m)) continue;
      if (!circleHitsMonster(c.x, c.y, radius, m, mType)) continue;
      if (LAB_MODE && m.labDummy) {
        scheduleLabRespawn(m.type, m.x, m.y);
        monsters.splice(j, 1);
      } else {
        monsters.splice(j, 1);
      }
    }
  }

  function knockbackMonstersInRadius(cx, cy, radius, knockDist) {
    for (var j = 0; j < monsters.length; j++) {
      var m = monsters[j];
      if (m.hp <= 0) continue;
      var mType = MONSTER_TYPES[m.type] || MONSTER_TYPES[0];
      if (isMonsterBoss(m) && !LAB_MODE) continue;
      if (!circleHitsMonster(cx, cy, radius, m, mType)) continue;
      var dir = pickMonsterKnockbackDir(m);
      m.knockbackDx = dir.dx;
      m.knockbackDy = dir.dy;
      m.knockbackRemain = knockDist;
    }
  }

  function grantHolyShield() {
    holyShieldReady = true;
    holyShieldTimer = 0;
  }

  function tryBlockHolyShield() {
    if (heroExclusiveBuff !== 'shengdun' || !isWarrior() || !holyShieldReady) return false;
    holyShieldReady = false;
    holyShieldTimer = 30000;
    return true;
  }

  function applyBattleCryKnockback() {
    var c = getHeroCenterWorld();
    for (var j = 0; j < monsters.length; j++) {
      var m = monsters[j];
      if (m.hp <= 0) continue;
      var mType = MONSTER_TYPES[m.type] || MONSTER_TYPES[0];
      if (!circleHitsMonster(c.x, c.y, EXCLUSIVE_AURA_RADIUS, m, mType)) continue;
      m.auraKnockback = true;
      m.knockbackRemain = 0;
    }
  }

  function triggerBattleCry() {
    battleCryTimer = 10000;
    refreshHeroMoveSpeed();
    applyBattleCryKnockback();
  }

  function triggerLabExclusiveOnSelect(id) {
    if (!LAB_MODE) return;
    if (id === 'zhanhou' && isWarrior()) triggerBattleCry();
    if (id === 'chongsheng' && isWizard()) {
      wipeMonstersInRadius(EXCLUSIVE_AURA_RADIUS, true);
      hero.hp = Math.max(1, Math.floor(hero.maxHp * 0.5));
      hero.dead = false;
      hero.deathAnimFrame = 0;
      hero.deathAnimTimer = 0;
      deathScreenTimer = 0;
      hero.invincibleTimer = 1200;
    }
  }

  function applyHolyDomainTick() {
    var c = getHeroCenterWorld();
    for (var j = monsters.length - 1; j >= 0; j--) {
      var m = monsters[j];
      if (m.hp <= 0) continue;
      var mType = MONSTER_TYPES[m.type] || MONSTER_TYPES[0];
      if (!circleHitsMonster(c.x, c.y, HOLY_DOMAIN_RADIUS, m, mType)) continue;
      damageMonster(m, 1);
      if (m.hp <= 0) removeDeadMonster(j);
    }
  }

  function updateExclusiveBuffs(dt) {
    if (!heroExclusiveBuff || hero.dead) return;

    if (heroExclusiveBuff === 'shengdun' && isWarrior()) {
      if (!holyShieldReady) {
        holyShieldTimer -= dt;
        if (holyShieldTimer <= 0) holyShieldReady = true;
      }
    }

    if (battleCryTimer > 0) {
      battleCryTimer -= dt;
      if (battleCryTimer <= 0) refreshHeroMoveSpeed();
    }

    if (heroExclusiveBuff === 'zhanhou' && isWarrior() && battleCryTimer <= 0 && hero.maxHp > 0) {
      if (hero.hp / hero.maxHp < 0.1) triggerBattleCry();
    }

    if (heroExclusiveBuff === 'shengyu' && isWizard()) {
      holyDomainTick -= dt;
      if (holyDomainTick <= 0) {
        holyDomainTick = 500;
        applyHolyDomainTick();
      }
    }
  }

  function drawExclusiveBuffFx() {
    if (!heroExclusiveBuff || hero.dead) return;
    var c = getHeroCenterWorld();
    var sx = c.x * SCALE - cam.x;
    var sy = c.y * SCALE - cam.y;

    if (heroExclusiveBuff === 'shengdun' && holyShieldReady) {
      var shieldR = 22;
      ctx.beginPath();
      ctx.arc(sx, sy, shieldR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 220, 60, 0.35)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 230, 100, 0.95)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (heroExclusiveBuff === 'shengyu') {
      var domainR = HOLY_DOMAIN_RADIUS * SCALE;
      ctx.beginPath();
      ctx.arc(sx, sy, domainR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 220, 60, 0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 210, 50, 0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function generateExclusiveBuffChoices() {
    if (isWarrior()) {
      return [
        {
          id: 'yujian',
          name: '御剑',
          desc: '每 6 秒大剑追踪最近敌人飞出并返回，飞行中碰撞造成伤害',
          apply: function () { heroExclusiveBuff = 'yujian'; }
        },
        {
          id: 'shengdun',
          name: '圣盾',
          desc: '每 30 秒获得圣盾，抵挡下一次所受伤害',
          apply: function () {
            heroExclusiveBuff = 'shengdun';
            grantHolyShield();
          }
        },
        {
          id: 'zhanhou',
          name: '战吼',
          desc: '生命低于 10% 时击退周围敌人，10 秒内伤害/攻速/移速 +100%',
          apply: function () { heroExclusiveBuff = 'zhanhou'; }
        }
      ];
    }
    return [
      {
        id: 'shengguan',
        name: '圣歌',
        desc: '圣经消失时释放震荡波，范围伤害并击退敌人',
        apply: function () { heroExclusiveBuff = 'shengguan'; }
      },
      {
        id: 'shengyu',
        name: '圣域',
        desc: '自身周围 50 范围持续圣域，敌人每 0.5 秒受到 1 点伤害',
        apply: function () {
          heroExclusiveBuff = 'shengyu';
          holyDomainTick = 500;
        }
      },
      {
        id: 'chongsheng',
        name: '重生',
        desc: '死亡时清空周围敌人（Boss 除外）并以 50% 生命复活（每场一次）',
        apply: function () { heroExclusiveBuff = 'chongsheng'; }
      }
    ];
  }

  function applyUpgradeMultipliers() {
    var spd = playerUpgrades.speedBonus || 0;
    var sz = playerUpgrades.swordSizeBonus || 0;
    if (!LAB_MODE) {
      spd = Math.min(UPGRADE_CAP_SPEED, spd);
      sz = Math.min(UPGRADE_CAP_SWORD_SIZE, sz);
    }
    playerUpgrades.speedMult = 1 + spd / 100;
    playerUpgrades.swordSizeMult = 1 + sz / 100;
  }

  function isStatUpgradeCapped(id) {
    var def = UPGRADE_DEFS[id];
    if (!def) return true;
    return (playerUpgrades[def.bonusKey] || 0) >= def.cap;
  }

  function rollStatUpgradeValue(id) {
    var def = UPGRADE_DEFS[id];
    if (!def) return 0;
    var picks = playerUpgrades.statPicks[id] || 0;
    var current = playerUpgrades[def.bonusKey] || 0;
    var base = def.tiers[Math.min(picks, def.tiers.length - 1)];
    var roll = base + (Math.random() < 0.25 ? 1 : 0);
    if (picks >= 4) roll = Math.max(1, roll - 1);
    if (picks >= 7) roll = Math.max(1, roll - 1);
    return Math.min(roll, def.cap - current);
  }

  function makeStatUpgrade(id) {
    var def = UPGRADE_DEFS[id];
    if (!def) return null;
    var add = rollStatUpgradeValue(id);
    if (add <= 0) return null;
    var cur = playerUpgrades[def.bonusKey] || 0;
    var next = Math.min(def.cap, cur + add);
    add = next - cur;
    if (add <= 0) return null;
    return {
      id: id,
      name: def.name,
      desc: def.desc(add),
      apply: function () {
        playerUpgrades.statPicks[id] = (playerUpgrades.statPicks[id] || 0) + 1;
        playerUpgrades[def.bonusKey] = next;
        applyUpgradeMultipliers();
        if (id === 'speed') refreshHeroMoveSpeed();
      }
    };
  }

  function getSwordCount() {
    return playerUpgrades.swordCount || 0;
  }

  function getKnifeCount() {
    return playerUpgrades.knifeCount || 0;
  }

  function canAddSword() {
    return getSwordCount() < MAX_WEAPON_AMOUNT;
  }

  function canAddKnife() {
    return getKnifeCount() < MAX_WEAPON_AMOUNT;
  }

  function getBibleCount() {
    return playerUpgrades.bibleCount || 0;
  }

  function heroHasBible() {
    return getBibleCount() > 0;
  }

  function canAddBible() {
    return isWizard() && getBibleCount() < MAX_BIBLE_AMOUNT;
  }

  function getHolyWaterCount() {
    return playerUpgrades.holyWaterCount || 0;
  }

  function heroHasHolyWater() {
    return getHolyWaterCount() > 0;
  }

  function canAddHolyWater() {
    return isWizard() && getHolyWaterCount() < MAX_HOLY_WATER_AMOUNT;
  }

  function canPickAnyWeapon() {
    if (isWizard()) return canAddBible() || canAddHolyWater();
    return canAddSword() || canAddKnife();
  }

  function makeAddHolyWaterUpgrade() {
    var n = getHolyWaterCount();
    return {
      id: 'addHolyWater',
      name: '圣水',
      desc: '数量 ' + n + ' → ' + Math.min(MAX_HOLY_WATER_AMOUNT, n + 1) + '（最多 ' + MAX_HOLY_WATER_AMOUNT + '）',
      apply: function () {
        playerUpgrades.holyWaterCount = Math.min(MAX_HOLY_WATER_AMOUNT, n + 1);
        holyWaterTimer = 0;
        syncItemSlotsFromUpgrades();
      }
    };
  }

  function makeAddBibleUpgrade() {
    var n = getBibleCount();
    return {
      id: 'addBible',
      name: '圣经',
      desc: '数量 ' + n + ' → ' + Math.min(MAX_BIBLE_AMOUNT, n + 1) + '（最多 ' + MAX_BIBLE_AMOUNT + '）',
      apply: function () {
        playerUpgrades.bibleCount = Math.min(MAX_BIBLE_AMOUNT, n + 1);
        syncItemSlotsFromUpgrades();
      }
    };
  }

  function makeAddSwordUpgrade() {
    var n = getSwordCount();
    return {
      id: 'addSword',
      name: '环绕大剑',
      desc: '数量 ' + n + ' → ' + Math.min(MAX_WEAPON_AMOUNT, n + 1) + '（最多 ' + MAX_WEAPON_AMOUNT + '）',
      apply: function () {
        playerUpgrades.swordCount = Math.min(MAX_WEAPON_AMOUNT, n + 1);
        syncItemSlotsFromUpgrades();
      }
    };
  }

  function makeAddKnifeUpgrade() {
    var n = getKnifeCount();
    return {
      id: 'addKnife',
      name: '飞刀',
      desc: '数量 ' + n + ' → ' + Math.min(MAX_WEAPON_AMOUNT, n + 1) + '（最多 ' + MAX_WEAPON_AMOUNT + '）',
      apply: function () {
        playerUpgrades.knifeCount = Math.min(MAX_WEAPON_AMOUNT, n + 1);
        knifeTimer = 0;
        syncItemSlotsFromUpgrades();
      }
    };
  }

  function generateWeaponPickChoices() {
    var choices = [];
    if (isWizard()) {
      if (canAddBible()) choices.push(makeAddBibleUpgrade());
      if (canAddHolyWater()) choices.push(makeAddHolyWaterUpgrade());
      var wizStatPool = getWizardStatPool();
      var wizGuard = 0;
      while (choices.length < 3 && wizStatPool.length > 0 && wizGuard++ < 24) {
        var wid = wizStatPool[Math.floor(Math.random() * wizStatPool.length)];
        var wup = makeStatUpgrade(wid);
        if (wup) choices.push(wup);
      }
      return choices;
    }
    if (canAddSword()) choices.push(makeAddSwordUpgrade());
    if (canAddKnife()) choices.push(makeAddKnifeUpgrade());
    if (!isWarrior()) return choices;
    var statPool = ['speed', 'swordSize', 'castSpeed', 'damage', 'globalCastSpeed'];
    if (getKnifeCount() > 0) statPool.push('knifeCastSpeed');
    statPool = statPool.filter(function (id) {
      var def = UPGRADE_DEFS[id];
      if (def && def.requiresKnife && getKnifeCount() <= 0) return false;
      return !isStatUpgradeCapped(id);
    });
    var guard = 0;
    while (choices.length < 3 && statPool.length > 0 && guard++ < 24) {
      var sid = statPool[Math.floor(Math.random() * statPool.length)];
      var up = makeStatUpgrade(sid);
      if (up) choices.push(up);
    }
    return choices;
  }

  function getWeaponLevelUpChance(lv) {
    if (lv < WEAPON_LEVELUP_MIN_LV) return 0;
    var tiers = Math.floor((lv - WEAPON_LEVELUP_MIN_LV) / 4);
    return Math.min(
      WEAPON_LEVELUP_CHANCE_CAP,
      WEAPON_LEVELUP_BASE_CHANCE + tiers * WEAPON_LEVELUP_CHANCE_PER_TIER
    );
  }

  function canOfferSwordInLevelUp(lv) {
    if (!canAddSword()) return false;
    if (isWarrior() && getSwordCount() <= 1) return lv >= WEAPON_LEVELUP_2ND_SWORD_LV;
    return lv >= WEAPON_LEVELUP_MIN_LV;
  }

  function canOfferKnifeInLevelUp(lv) {
    if (!canAddKnife()) return false;
    if (getSwordCount() <= 0) return false;
    return lv >= WEAPON_LEVELUP_KNIFE_LV;
  }

  function canOfferBibleInLevelUp(lv) {
    if (!canAddBible()) return false;
    if (getBibleCount() <= 1) return lv >= WEAPON_LEVELUP_2ND_SWORD_LV;
    return lv >= WEAPON_LEVELUP_MIN_LV;
  }

  function canOfferHolyWaterInLevelUp(lv) {
    if (!canAddHolyWater()) return false;
    if (getBibleCount() <= 0) return false;
    return lv >= WEAPON_LEVELUP_KNIFE_LV;
  }

  function rollLevelUpWeaponOffer(lv) {
    if (Math.random() > getWeaponLevelUpChance(lv)) return null;
    if (isWizard()) {
      var wizOpts = [];
      if (canOfferBibleInLevelUp(lv)) wizOpts.push(makeAddBibleUpgrade);
      if (canOfferHolyWaterInLevelUp(lv)) wizOpts.push(makeAddHolyWaterUpgrade);
      if (wizOpts.length === 0) return null;
      return wizOpts[Math.floor(Math.random() * wizOpts.length)]();
    }
    var options = [];
    if (canOfferSwordInLevelUp(lv)) options.push('addSword');
    if (canOfferKnifeInLevelUp(lv)) options.push('addKnife');
    if (options.length === 0) return null;
    var pick = options[Math.floor(Math.random() * options.length)];
    return pick === 'addSword' ? makeAddSwordUpgrade() : makeAddKnifeUpgrade();
  }

  function generateLevelUpChoices(lv) {
    var choices = [];
    var picked = {};
    var pool = isWizard()
      ? getWizardStatPool()
      : ['speed', 'swordSize', 'castSpeed', 'damage', 'globalCastSpeed'];
    if (!isWizard() && getKnifeCount() > 0) pool.push('knifeCastSpeed');
    pool = pool.filter(statUpgradeAllowed);
    var guard = 0;
    while (choices.length < 3 && guard++ < 40) {
      if (pool.length === 0) break;
      var id = pool[Math.floor(Math.random() * pool.length)];
      if (picked[id]) continue;
      picked[id] = true;
      var upgrade = makeStatUpgrade(id);
      if (upgrade) choices.push(upgrade);
      else picked[id] = false;
    }
    var weaponOffer = rollLevelUpWeaponOffer(lv);
    if (weaponOffer) {
      if (choices.length >= 3) {
        choices[Math.floor(Math.random() * 3)] = weaponOffer;
      } else {
        choices.push(weaponOffer);
      }
    }
    return choices.slice(0, 3);
  }

  function openWeaponPickScreen() {
    if (levelUpChoices.length > 0) return;
    if (!canPickAnyWeapon()) return;
    levelUpPickKind = 'weapon';
    levelUpChoices = generateWeaponPickChoices();
    if (levelUpChoices.length === 0) return;
    hoveredUpgradeChoice = -1;
    gameState = 'levelup';
  }

  function tryOpenPendingWeaponPick() {
    if (pendingWeaponPicks <= 0 || gameState !== 'playing') return;
    if (!canPickAnyWeapon()) {
      pendingWeaponPicks = 0;
      return;
    }
    pendingWeaponPicks--;
    openWeaponPickScreen();
  }

  function openLevelUpScreen() {
    if (levelUpChoices.length > 0) return;
    pendingLevelForChoices = levelUpQueue.shift();
    if (needsExclusiveLevelUp(pendingLevelForChoices)) {
      levelUpPickKind = 'exclusive';
      levelUpChoices = generateExclusiveBuffChoices();
    } else {
      levelUpPickKind = 'upgrade';
      levelUpChoices = generateLevelUpChoices(pendingLevelForChoices);
    }
    hoveredUpgradeChoice = -1;
    gameState = 'levelup';
  }

  function applyLevelUpChoice(index) {
    var choice = levelUpChoices[index];
    if (!choice) return;
    choice.apply();
    if (levelUpPickKind !== 'exclusive') syncItemSlotsFromUpgrades();
    levelUpChoices = [];
    if (levelUpPickKind === 'exclusive') {
      levelUpPickKind = 'upgrade';
      if (levelUpQueue.length > 0) {
        openLevelUpScreen();
      } else {
        gameState = 'playing';
        tryOpenPendingWeaponPick();
      }
      return;
    }
    if (levelUpPickKind === 'weapon') {
      levelUpPickKind = 'upgrade';
      gameState = 'playing';
      tryOpenPendingWeaponPick();
      if (levelUpQueue.length > 0) openLevelUpScreen();
      return;
    }
    if (levelUpQueue.length > 0) {
      openLevelUpScreen();
    } else {
      gameState = 'playing';
      tryOpenPendingWeaponPick();
    }
  }

  function syncItemSlotsFromUpgrades() {
    if (isWizard()) {
      itemSlots[0] = getBibleCount() > 0
        ? { name: '圣经', weaponImg: 'holybook', count: getBibleCount() } : null;
      itemSlots[1] = getHolyWaterCount() > 0
        ? { name: '圣水', weaponImg: 'holy_water', count: getHolyWaterCount() } : null;
      for (var wi = 2; wi < ITEM_SLOTS; wi++) itemSlots[wi] = null;
      return;
    }
    itemSlots[0] = getSwordCount() > 0
      ? { name: '大剑', weaponImg: 'knife1', count: getSwordCount() } : null;
    itemSlots[1] = getKnifeCount() > 0
      ? { name: '飞刀', weaponImg: 'knife2', count: getKnifeCount() } : null;
    for (var si = 2; si < ITEM_SLOTS; si++) itemSlots[si] = null;
  }

  function initItemSlots() {
    syncItemSlotsFromUpgrades();
  }

  function getNextKillWeaponMilestone() {
    if (!canPickAnyWeapon()) return -1;
    if (killWeaponMilestoneIdx >= KILL_WEAPON_MILESTONES.length) return -1;
    return KILL_WEAPON_MILESTONES[killWeaponMilestoneIdx];
  }

  function checkKillWeaponMilestones() {
    while (killWeaponMilestoneIdx < KILL_WEAPON_MILESTONES.length &&
           killCount >= KILL_WEAPON_MILESTONES[killWeaponMilestoneIdx]) {
      if (canPickAnyWeapon()) pendingWeaponPicks++;
      killWeaponMilestoneIdx++;
    }
    tryOpenPendingWeaponPick();
  }

  function queueWeaponUnlockToast(text) {
    weaponUnlockToasts.push({ text: text, life: 2400, y: VIEW_H * 0.42 });
  }

  function updateWeaponUnlockToasts(dt) {
    for (var ti = weaponUnlockToasts.length - 1; ti >= 0; ti--) {
      weaponUnlockToasts[ti].life -= dt;
      if (weaponUnlockToasts[ti].life <= 0) weaponUnlockToasts.splice(ti, 1);
    }
  }

  function drawWeaponUnlockToasts() {
    if (!weaponUnlockToasts.length) return;
    ctx.font = 'bold 18px Courier New';
    ctx.textAlign = 'center';
    for (var ti = 0; ti < weaponUnlockToasts.length; ti++) {
      var toast = weaponUnlockToasts[ti];
      var alpha = Math.min(1, toast.life / 500);
      ctx.fillStyle = 'rgba(0,0,0,' + (0.65 * alpha) + ')';
      ctx.fillText(toast.text, VIEW_W / 2 + 2, toast.y + 2);
      ctx.fillStyle = 'rgba(255, 215, 90, ' + alpha + ')';
      ctx.fillText(toast.text, VIEW_W / 2, toast.y);
    }
  }

  function pickWeightedMonsterType() {
    var gameSec = gameTime / 1000;
    var eligible = [];
    var weights = [];
    for (var ti = 0; ti < MONSTER_TYPES.length; ti++) {
      var mt = MONSTER_TYPES[ti];
      if (mt.spawnedOnly) continue;
      if (gameSec < mt.unlockSec) continue;
      if (mt.key === 'necromancer' && countMonstersByKey('necromancer') >= 4) continue;
      if (mt.key === 'boss') continue;
      var w = getEffectiveWeight(mt);
      if (w > 0) {
        eligible.push(ti);
        weights.push(w);
      }
    }
    if (eligible.length === 0) return -1;
    var totalW = 0;
    for (var wi = 0; wi < weights.length; wi++) totalW += weights[wi];
    var roll = Math.random() * totalW;
    for (var ej = 0; ej < eligible.length; ej++) {
      roll -= weights[ej];
      if (roll <= 0) return eligible[ej];
    }
    return eligible[eligible.length - 1];
  }

  function createMonster(typeIndex, wx, wy, opts) {
    opts = opts || {};
    var mType = MONSTER_TYPES[typeIndex];
    var hp = scaledMonsterHp(mType.hp, mType.key);
    return {
      x: wx,
      y: wy,
      hp: hp,
      maxHp: hp,
      damage: scaledMonsterDmg(mType.damage),
      speed: mType.speed,
      type: typeIndex,
      animFrame: 0,
      animTimer: 0,
      walkTimer: 0,
      bobOffset: 0,
      hitCooldown: 0,
      hitFlashTimer: 0,
      knockbackRemain: 0,
      knockbackDx: 0,
      knockbackDy: 0,
      auraKnockback: false,
      facingLeft: false,
      summoning: false,
      summonTimer: opts.summonTimer != null ? opts.summonTimer : 0,
      spawning: !!opts.spawning,
      spawnAnimFrame: 0,
      spawnAnimTimer: 0,
      swordInRange: false,
      bossAnim: opts.bossAnim || 'walk',
      bossFlyCd: opts.bossFlyCd != null ? opts.bossFlyCd : (BOSS_FLY_COOLDOWN_MIN + Math.random() * (BOSS_FLY_COOLDOWN_MAX - BOSS_FLY_COOLDOWN_MIN)),
      bossFlying: false,
      bossFlyDur: 0,
      bossFlyTime: 0,
      labDummy: !!opts.labDummy
    };
  }

  var labRespawnQueue = [];

  function scheduleLabRespawn(typeIndex, x, y) {
    labRespawnQueue.push({ typeIndex: typeIndex, x: x, y: y, timer: 450 });
  }

  function updateLabRespawns(dt) {
    for (var ri = labRespawnQueue.length - 1; ri >= 0; ri--) {
      labRespawnQueue[ri].timer -= dt;
      if (labRespawnQueue[ri].timer <= 0) {
        var slot = labRespawnQueue[ri];
        labRespawnQueue.splice(ri, 1);
        var nm = createMonster(slot.typeIndex, slot.x, slot.y, {
          labDummy: true,
          spawning: false,
          bossAnim: 'idle'
        });
        nm.speed = 0;
        monsters.push(nm);
      }
    }
  }

  function removeDeadMonster(index) {
    var mon = monsters[index];
    if (LAB_MODE && mon.labDummy) {
      scheduleLabRespawn(mon.type, mon.x, mon.y);
      monsters.splice(index, 1);
      return;
    }
    onMonsterKill(mon);
    monsters.splice(index, 1);
  }

  function onBossDefeated() {
    waveCycle++;
    cycleStartTime = gameTime;
    bossSpawnFired = false;
    batWaveFired = false;
    skelWaveFired = false;
    batWaveSpawnQueue = 0;
    skelWaveSpawnQueue = 0;
    monsters = [];
    var hpMult = getMonsterHpCycleMult();
    queueWeaponUnlockToast('第 ' + (waveCycle + 1) + ' 波 · 怪物生命 ×' + hpMult);
  }

  /** 低 weight = 稀有怪，额外经验倍率（与刷怪权重一致） */
  function getMonsterExpDropMul(mType) {
    if (!mType) return 1;
    if (mType.key === 'boss') return 1.5;
    if (mType.key === 'seeker') return 1.25;
    var w = mType.weight;
    if (w <= 6) return 1.85;
    if (w <= 10) return 1.55;
    if (w <= 14) return 1.35;
    if (w <= 18) return 1.2;
    return 1;
  }

  function monsterDropsLargeGem(mType, expVal) {
    if (mType.key === 'boss' || mType.key === 'guardian' || mType.key === 'necromancer') return true;
    if (mType.key === 'sprout' || mType.key === 'sl') return true;
    return expVal >= 10;
  }

  function onMonsterKill(m) {
    var mType = MONSTER_TYPES[m.type];
    if (mType.key === 'boss') onBossDefeated();
    gold += mType.goldMin + Math.floor(Math.random() * (mType.goldMax - mType.goldMin + 1));
    killCount++;
    checkKillWeaponMilestones();
    var expVal = Math.floor(
      mType.exp * (1 + getTimeMin() * 0.08) * getMonsterExpDropMul(mType)
    );
    var large = monsterDropsLargeGem(mType, expVal);
    if (large) expVal = Math.floor(expVal * 2);
    spawnGem(m.x, m.y, Math.max(1, expVal), large);
    tryDropRubyOnKill(m.x, m.y);
  }

  function addExp(amount) {
    if (LAB_MODE) return;
    var entry = HERO_ROSTER[hero.rosterIndex];
    var gained = Math.floor(amount * (entry.expMult || 1));
    exp += gained;
    while (exp >= expToNext) {
      exp -= expToNext;
      level++;
      expToNext = calcExpToNext(level);
      if (gameState === 'playing' && (isWarrior() || isWizard())) {
        levelUpQueue.push(level);
      }
    }
    if (levelUpQueue.length > 0 && gameState === 'playing' && (isWarrior() || isWizard())) {
      openLevelUpScreen();
    }
  }

  function isWarrior() {
    return HERO_ROSTER[hero.rosterIndex].key === 'king';
  }

  function isWizard() {
    return HERO_ROSTER[hero.rosterIndex].key === 'wizard';
  }

  function getBibleDisp() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    return entry.bibleDisp || 24;
  }

  function getBibleOrbit() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    return entry.bibleOrbit || 50;
  }

  function getBibleRpm() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    var base = entry.bibleRpm || 40;
    if (!isWizard()) return base;
    return base * getBibleCastSpeedMult() * GAME_MOVE_SPEED_MULT;
  }

  function getBibleDuration() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    var base = entry.bibleDuration != null ? entry.bibleDuration : 3000;
    if (!isWizard()) return base;
    return Math.max(1200, Math.round(base / getBibleCastSpeedMult()));
  }

  function getBibleCooldown() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    var base = entry.bibleCooldown != null ? entry.bibleCooldown : 3000;
    if (!isWizard()) return base;
    return Math.max(1200, Math.round(base / getBibleCastSpeedMult()));
  }

  function getBibleHitDelay() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    return entry.bibleHitDelay != null ? entry.bibleHitDelay : 1700;
  }

  function isBibleActive() {
    return heroHasBible() && biblePhase === 'active';
  }

  function getHolyWaterDisp() {
    return getHeroRosterEntry().holyWaterDisp || 24;
  }

  function getHolyWaterCooldown() {
    var base = getHeroRosterEntry().holyWaterCooldown || 2600;
    if (!isWizard()) return base;
    return Math.max(900, Math.round(base / getHolyWaterCastSpeedMult()));
  }

  function getHolyWaterFallSpeed() {
    return (getHeroRosterEntry().holyWaterFallSpeed || 4.2) * GAME_MOVE_SPEED_MULT;
  }

  function getHolyWaterSpinRadPerMs() {
    var rps = (getHeroRosterEntry().holyWaterSpinRps || 2.5) * GAME_MOVE_SPEED_MULT;
    return rps * (2 * Math.PI) / 1000;
  }

  function getHolyWaterBurstDisp() {
    return getHeroRosterEntry().holyWaterBurstDisp || 64;
  }

  function heroHasGreatsword() {
    return getSwordCount() > 0;
  }

  function heroHasKnife() {
    return getKnifeCount() > 0;
  }

  function getGreatswordDisp() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    var base = entry.greatswordDisp || SWORD_DISP;
    if (isWarrior()) base *= playerUpgrades.swordSizeMult;
    return Math.round(base);
  }

  function getGreatswordOrbit() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    var base = entry.greatswordOrbit || SWORD_ORBIT_R;
    if (isWarrior()) base *= Math.sqrt(playerUpgrades.swordSizeMult);
    return Math.round(base);
  }

  function getSwordRpm() {
    if (!isWarrior()) return SWORD_RPM * GAME_MOVE_SPEED_MULT;
    return SWORD_RPM * getSwordCastSpeedMult() * GAME_MOVE_SPEED_MULT;
  }

  // Item slots + warrior upgrades
  var ITEM_SLOTS = 6;
  var itemSlots = [null, null, null, null, null, null];
  var playerUpgrades = {
    speedBonus: 0,
    swordSizeBonus: 0,
    castSpeedBonus: 0,
    knifeCastSpeedBonus: 0,
    bibleCastSpeedBonus: 0,
    holyWaterCastSpeedBonus: 0,
    damageBonus: 0,
    globalCastSpeedBonus: 0,
    speedMult: 1,
    swordSizeMult: 1,
    statPicks: {},
    swordCount: 0,
    knifeCount: 0,
    bibleCount: 0,
    holyWaterCount: 0
  };
  var levelUpQueue = [];
  var levelUpChoices = [];
  var hoveredUpgradeChoice = -1;
  var pendingLevelForChoices = 0;
  var LEVELUP_CARD_W = 228;
  var LEVELUP_CARD_H = 168;
  var LEVELUP_CARD_GAP = 18;

  // ===================== MAP GENERATION =====================
  var grassMap = [];
  var grassMapW = 0;
  var grassMapH = 0;

  function grassTileAt(px, py) {
    var h = ((px * 374761393) ^ (py * 668265263)) >>> 0;
    var r = (h % 1000) / 1000;
    if (r < 0.46) return TILE_GRASS1;
    if (r < 0.70) return TILE_GRASS2;
    if (r < 0.85) return TILE_GRASS3;
    return TILE_GRASS4;
  }

  function generateMap() {
    var patchTiles = getGrassPatchTiles();
    grassMapW = Math.ceil(MAP_W / patchTiles);
    grassMapH = Math.ceil(MAP_H / patchTiles);
    grassMap = [];
    for (var py = 0; py < grassMapH; py++) {
      grassMap[py] = [];
      for (var px = 0; px < grassMapW; px++) {
        grassMap[py][px] = grassTileAt(px, py);
      }
    }
  }

  // ===================== CAMERA =====================
  var cam = { x: 0, y: 0 };

  function clampCam() {
    var maxX = MAP_W * TILE * SCALE - VIEW_W;
    var maxY = MAP_H * TILE * SCALE - VIEW_H;
    cam.x = Math.floor(Math.max(0, Math.min(cam.x, maxX)));
    cam.y = Math.floor(Math.max(0, Math.min(cam.y, maxY)));
  }

  // ===================== HERO =====================
  var hero = {
    x: (MAP_W / 2) * TILE,
    y: (MAP_H / 2) * TILE,
    speed: 0.8,
    size: TILE * SCALE,
    facingLeft: false,
    moving: false,
    walkTimer: 0,
    bobOffset: 0,
    hp: 100,
    maxHp: 100,
    invincibleTimer: 0,  // brief invincibility after hit
    armor: 0,
    spriteRow: 0,        // legacy (unused now)
    rosterIndex: 0,      // which HERO_ROSTER entry
    animFrame: 0,
    animTimer: 0,
    animSpeed: 100,      // ms per frame
    dead: false,
    deathAnimFrame: 0,
    deathAnimTimer: 0
  };

  // ===================== MONSTERS =====================
  var BAT_FRAME_W = 64;   // Bat-IdleFly.png: 576x64, 9 frames of 64x64
  var BAT_FRAME_H = 64;
  var BAT_FRAMES  = 9;
  var BAT_ANIM_SPEED = 80;

  var SKEL_FRAME_W = 96;  // Skeleton_01_White_Walk.png: 960x64, 10 frames of 96x64
  var SKEL_FRAME_H = 64;
  var SKEL_FRAMES  = 10;
  var SKEL_ANIM_SPEED = 100;

  var GUARD_FRAME_W = 120; // Old_Guardian_walk.png: 120x960, vertical, 8 frames
  var GUARD_FRAME_H = 120;
  var GUARD_FRAMES  = 8;
  var GUARD_ANIM_SPEED = 155;

  var SL_FRAME_W = 196;    // SL_walk.png: 196x1568, vertical, 8 frames
  var SL_FRAME_H = 196;
  var SL_FRAMES  = 8;
  var SL_ANIM_SPEED = 125;

  var SPROUT_FRAME_W = 96; // Sprout_move.png: 96x480, vertical, 5 frames
  var SPROUT_FRAME_H = 96;
  var SPROUT_FRAMES  = 5;
  var SPROUT_ANIM_SPEED = 148;

  var NECRO_FRAME_W = 160; // Necromancer sheet: 160x128 per frame
  var NECRO_FRAME_H = 128;
  var NECRO_WALK_ROW    = 0;  // row index for walk animation
  var NECRO_SUMMON_ROW  = 2;  // row index for summon animation
  var NECRO_WALK_FRAMES = 8;
  var NECRO_SUMMON_FRAMES = 13;
  var NECRO_WALK_ANIM_SPEED   = 100;
  var NECRO_SUMMON_ANIM_SPEED = 150;
  var NECRO_SUMMON_INTERVAL   = 10000; // ms between summons
  // Crop to body content (no whitespace)
  var NECRO_WALK_BODY_Y   = 56;  // content start Y within frame (row 0)
  var NECRO_WALK_BODY_H   = 59;
  var NECRO_SUMMON_BODY_Y = 12;
  var NECRO_SUMMON_BODY_H = 103;

  var SEEKER_WALK_FRAME_W  = 120;
  var SEEKER_WALK_FRAME_H  = 120;
  var SEEKER_WALK_FRAMES   = 6;
  var SEEKER_WALK_SPEED    = 100;
  var SEEKER_SPAWN_FRAME_W = 120;
  var SEEKER_SPAWN_FRAME_H = 120; // 1320/11 ≈ 120
  var SEEKER_SPAWN_FRAMES  = 11;

  var BOSS_ANIM_DEFS = {
    idle: { count: 15, speed: 90 },
    walk: { count: 12, speed: 108 },
    fly:  { count: 6,  speed: 80 }
  };
  var BOSS_FLY_COOLDOWN_MIN = 8000;
  var BOSS_FLY_COOLDOWN_MAX = 10000;
  var BOSS_FLY_DURATION_MAX = 4200;
  var BOSS_FLY_SPEED_MULT = 3.2;
  var BOSS_FLY_STOP_DIST = 52;
  var BOSS_FLY_START_EXTRA = 110;
  var BOSS_FLY_MIN_DURATION = 450;
  var DEBUG_CONTACT = false;

  // Contact: axis-aligned boxes at feet (w/h + footOx/footBottom). Weapons use same boxes.
  var HERO_CONTACT_BOX_DEFAULT = { w: 8, h: 14, footOx: 1, footBottom: 0 };
  var BOSS_CONTACT_BOXES = {
    idle: {
      boxes: [{ w: 26, h: 58, footOx: 0, footBottom: -16 }],
      circles: [
        { r: 10, footOx: -13, footOy: -72 },
        { r: 10, footOx: 13, footOy: -72 },
        { r: 24, footOx: -10, footOy: -51 },
        { r: 24, footOx: 5, footOy: -51 }
      ]
    },
    walk: {
      boxes: [{ w: 20, h: 58, footOx: 0, footBottom: -16 }],
      circles: [
        { r: 8, footOx: -14, footOy: -76 },
        { r: 8, footOx: 13, footOy: -76 },
        { r: 24, footOx: -10, footOy: -51 },
        { r: 24, footOx: 6, footOy: -51 }
      ]
    },
    fly: {
      boxes: [{ w: 44, h: 54, footOx: -1, footBottom: -21 }],
      circles: [
        { r: 10, footOx: -25, footOy: -72 },
        { r: 10, footOx: 27, footOy: -72 },
        { r: 10, footOx: -43, footOy: -61 },
        { r: 8, footOx: 40, footOy: -63 }
      ]
    }
  };

  function getEntityFoot(entity) {
    return { x: entity.x + TILE / 2, y: entity.y + TILE / 2 };
  }

  // Boss (and bottom-aligned monsters) draw sprite feet at tile-center + disp/2 in world Y.
  function getMonsterFoot(m, mType) {
    var foot = getEntityFoot(m);
    if (mType && mType.key === 'boss') {
      foot.y += mType.disp / 2;
    }
    return foot;
  }

  function getHeroFoot() {
    return getEntityFoot(hero);
  }

  function boxFromFoot(foot, def) {
    var bottom = foot.y + (def.footBottom != null ? def.footBottom : 4);
    var left = foot.x - def.w / 2 + (def.footOx || 0);
    return {
      left: left,
      right: left + def.w,
      top: bottom - def.h,
      bottom: bottom
    };
  }

  function footToContactBoxes(foot, defs) {
    var out = [];
    for (var bi = 0; bi < defs.length; bi++) {
      out.push(boxFromFoot(foot, defs[bi]));
    }
    return out;
  }

  function circleFromFoot(foot, def) {
    return {
      cx: foot.x + (def.footOx || 0),
      cy: foot.y + (def.footOy || 0),
      r: def.r
    };
  }

  function footToContactCircles(foot, defs) {
    var out = [];
    for (var ci = 0; ci < defs.length; ci++) {
      out.push(circleFromFoot(foot, defs[ci]));
    }
    return out;
  }

  function getBossContactLayout(m) {
    var mode = (m && m.bossAnim) || 'idle';
    var data = BOSS_CONTACT_BOXES[mode] || BOSS_CONTACT_BOXES.walk;
    if (Array.isArray(data)) {
      return { boxes: data, circles: [] };
    }
    return {
      boxes: data.boxes || [],
      circles: data.circles || []
    };
  }

  function getMonsterContactBoxDefs(mType, m) {
    if (mType.key === 'boss' && m) {
      return getBossContactLayout(m).boxes;
    }
    return [{
      w: mType.contactW || Math.max(12, Math.round(mType.disp * 0.45)),
      h: mType.contactH || Math.max(10, Math.round(mType.disp * 0.4)),
      footOx: mType.contactOx || 0,
      footBottom: mType.contactFootBottom != null ? mType.contactFootBottom : 4
    }];
  }

  function getMonsterContactCircleDefs(mType, m) {
    if (mType.key === 'boss' && m) {
      return getBossContactLayout(m).circles;
    }
    return [];
  }

  function getHeroContactBoxDef() {
    var entry = getHeroRosterEntry();
    return entry.contactBox || HERO_CONTACT_BOX_DEFAULT;
  }

  function getHeroContactBox() {
    return boxFromFoot(getHeroFoot(), getHeroContactBoxDef());
  }

  function getMonsterContactBoxes(m, mType) {
    return footToContactBoxes(getMonsterFoot(m, mType), getMonsterContactBoxDefs(mType, m));
  }

  function getMonsterContactCircles(m, mType) {
    return footToContactCircles(getMonsterFoot(m, mType), getMonsterContactCircleDefs(mType, m));
  }

  function rectsIntersect(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function rectRectGap(a, b) {
    var overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    var overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (overlapX > 0 && overlapY > 0) {
      return -Math.min(overlapX, overlapY);
    }
    var dx = 0;
    var dy = 0;
    if (a.right < b.left) dx = b.left - a.right;
    else if (a.left > b.right) dx = a.left - b.right;
    if (a.bottom < b.top) dy = b.top - a.bottom;
    else if (a.top > b.bottom) dy = a.top - b.bottom;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getHeroMonsterContactGap(m, mType) {
    var hb = getHeroContactBox();
    var boxes = getMonsterContactBoxes(m, mType);
    var circles = getMonsterContactCircles(m, mType);
    var minGap = Infinity;
    var i;
    for (i = 0; i < boxes.length; i++) {
      minGap = Math.min(minGap, rectRectGap(hb, boxes[i]));
    }
    for (i = 0; i < circles.length; i++) {
      minGap = Math.min(minGap, rectCircleGap(hb, circles[i]));
    }
    return minGap;
  }

  function pointInContactBoxes(px, py, boxes, pad) {
    pad = pad || 0;
    for (var pi = 0; pi < boxes.length; pi++) {
      var b = boxes[pi];
      if (px >= b.left - pad && px <= b.right + pad &&
          py >= b.top - pad && py <= b.bottom + pad) {
        return true;
      }
    }
    return false;
  }

  function pointInContactCircles(px, py, circles, pad) {
    pad = pad || 0;
    for (var ci = 0; ci < circles.length; ci++) {
      var c = circles[ci];
      var dx = px - c.cx;
      var dy = py - c.cy;
      var reach = c.r + pad;
      if (dx * dx + dy * dy <= reach * reach) return true;
    }
    return false;
  }

  function heroTouchesMonster(m, mType) {
    var hb = getHeroContactBox();
    var boxes = getMonsterContactBoxes(m, mType);
    var circles = getMonsterContactCircles(m, mType);
    var i;
    for (i = 0; i < boxes.length; i++) {
      if (rectsIntersect(hb, boxes[i])) return true;
    }
    for (i = 0; i < circles.length; i++) {
      if (circleIntersectsRect(circles[i].cx, circles[i].cy, circles[i].r, hb)) return true;
    }
    return false;
  }

  // weaponRadius：武器自身半径（世界单位），与怪物接触体相交即命中
  function worldPointHitsMonster(px, py, m, mType, weaponRadius) {
    var wr = weaponRadius != null ? weaponRadius : 0;
    if (pointInContactBoxes(px, py, getMonsterContactBoxes(m, mType), wr)) return true;
    return pointInContactCircles(px, py, getMonsterContactCircles(m, mType), wr);
  }

  function circleIntersectsRect(cx, cy, radius, rect) {
    var nx = Math.max(rect.left, Math.min(cx, rect.right));
    var ny = Math.max(rect.top, Math.min(cy, rect.bottom));
    var dx = cx - nx;
    var dy = cy - ny;
    return dx * dx + dy * dy <= radius * radius;
  }

  function rectCircleGap(rect, circle) {
    var nx = Math.max(rect.left, Math.min(circle.cx, rect.right));
    var ny = Math.max(rect.top, Math.min(circle.cy, rect.bottom));
    var dx = circle.cx - nx;
    var dy = circle.cy - ny;
    var dist = Math.sqrt(dx * dx + dy * dy);
    return Math.max(0, dist - circle.r);
  }

  function circlesIntersect(a, b) {
    var dx = a.cx - b.cx;
    var dy = a.cy - b.cy;
    var reach = a.r + b.r;
    return dx * dx + dy * dy <= reach * reach;
  }

  function circleHitsMonster(cx, cy, radius, m, mType) {
    var boxes = getMonsterContactBoxes(m, mType);
    var circles = getMonsterContactCircles(m, mType);
    var hi;
    for (hi = 0; hi < boxes.length; hi++) {
      if (circleIntersectsRect(cx, cy, radius, boxes[hi])) return true;
    }
    for (hi = 0; hi < circles.length; hi++) {
      if (circlesIntersect({ cx: cx, cy: cy, r: radius }, circles[hi])) return true;
    }
    return false;
  }

  function contactBoxToScreen(rect) {
    // World foot already includes +TILE/2; do not add TILE*SCALE/2 again (was shifting boxes right).
    return {
      x: rect.left * SCALE - cam.x,
      y: rect.top * SCALE - cam.y,
      w: (rect.right - rect.left) * SCALE,
      h: (rect.bottom - rect.top) * SCALE
    };
  }

  function strokeContactBox(rect, strokeStyle) {
    var s = contactBoxToScreen(rect);
    ctx.strokeStyle = strokeStyle;
    ctx.strokeRect(s.x, s.y, s.w, s.h);
  }

  function strokeContactCircle(circle, strokeStyle) {
    var sx = circle.cx * SCALE - cam.x;
    var sy = circle.cy * SCALE - cam.y;
    var sr = circle.r * SCALE;
    ctx.beginPath();
    ctx.strokeStyle = strokeStyle;
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawContactDebug() {
    if (!DEBUG_CONTACT) return;
    ctx.save();
    ctx.lineWidth = 2;
    strokeContactBox(getHeroContactBox(), 'rgba(120, 200, 255, 0.95)');
    for (var i = 0; i < monsters.length; i++) {
      var m = monsters[i];
      var mType = MONSTER_TYPES[m.type] || MONSTER_TYPES[0];
      var boxes = getMonsterContactBoxes(m, mType);
      var circles = getMonsterContactCircles(m, mType);
      var col = mType.key === 'boss'
        ? 'rgba(255, 80, 80, 0.95)' : 'rgba(255, 180, 60, 0.9)';
      var j;
      for (j = 0; j < boxes.length; j++) strokeContactBox(boxes[j], col);
      if (mType.key === 'boss') {
        for (j = 0; j < circles.length; j++) {
          strokeContactCircle(circles[j], 'rgba(180, 120, 255, 0.95)');
        }
      }
    }
    ctx.restore();
  }

  function getBossFrameImg(mode, frame) {
    var list = assets.boss && assets.boss[mode];
    if (!list || !list.length) return null;
    return list[frame % list.length];
  }

  // Monster type definitions
  // vertical: true means frames stacked vertically (srcY = frame * frameH)
  // flipDefault: true means sprite faces left by default (flip when facing right)
  var MONSTER_TYPES = [
    { key: 'bat',        frameW: BAT_FRAME_W,    frameH: BAT_FRAME_H,    frames: BAT_FRAMES,    animSpeed: BAT_ANIM_SPEED,    disp: 28, contactW: 12, contactH: 8,  contactOx: 0, contactFootBottom: 3,  flipDefault: false, vertical: false, hp: 1,  speed: 0.52, damage: 4,  exp: 1,  goldMin: 1, goldMax: 1, weight: 32, unlockSec: 0,   spawnedOnly: false },
    { key: 'skeleton',   frameW: SKEL_FRAME_W,   frameH: SKEL_FRAME_H,   frames: SKEL_FRAMES,   animSpeed: SKEL_ANIM_SPEED,   disp: 24, contactW: 8,  contactH: 18, contactOx: 0, contactFootBottom: 12, flipDefault: true,  vertical: false, hp: 2,  speed: 0.42, damage: 7,  exp: 2,  goldMin: 1, goldMax: 2, weight: 28, unlockSec: 0,   spawnedOnly: false },
    { key: 'guardian',   frameW: GUARD_FRAME_W,  frameH: GUARD_FRAME_H,  frames: GUARD_FRAMES,  animSpeed: GUARD_ANIM_SPEED,  disp: 48, contactW: 16, contactH: 22, contactOx: 2, contactFootBottom: 12, flipDefault: true,  vertical: true,  hp: 14, speed: 0.28, damage: 14, exp: 6,  goldMin: 3, goldMax: 5, weight: 10, unlockSec: 300, spawnedOnly: false },
    { key: 'sl',         frameW: SL_FRAME_W,     frameH: SL_FRAME_H,     frames: SL_FRAMES,     animSpeed: SL_ANIM_SPEED,     disp: 48, contactW: 16, contactH: 24, contactOx: 3, contactFootBottom: 12, flipDefault: true,  vertical: true,  hp: 5,  speed: 0.48, damage: 8,  exp: 3,  goldMin: 2, goldMax: 3, weight: 18, unlockSec: 120, spawnedOnly: false },
    { key: 'sprout',     frameW: SPROUT_FRAME_W, frameH: SPROUT_FRAME_H, frames: SPROUT_FRAMES, animSpeed: SPROUT_ANIM_SPEED, disp: 56, contactW: 25, contactH: 36, contactOx: 1, contactFootBottom: 17, flipDefault: true,  vertical: true,  hp: 10, speed: 0.32, damage: 11, exp: 4,  goldMin: 2, goldMax: 4, weight: 14, unlockSec: 210, spawnedOnly: false },
    { key: 'necromancer',frameW: NECRO_FRAME_W,  frameH: NECRO_FRAME_H,  frames: NECRO_WALK_FRAMES, animSpeed: NECRO_WALK_ANIM_SPEED, disp: 25, contactW: 14, contactH: 20, contactOx: 1, contactFootBottom: 12, flipDefault: true, vertical: false, hp: 18, speed: 0.36, damage: 6,  exp: 12, goldMin: 5, goldMax: 8, weight: 6,  unlockSec: 360, spawnedOnly: false },
    { key: 'seeker',     frameW: SEEKER_WALK_FRAME_W, frameH: SEEKER_WALK_FRAME_H, frames: SEEKER_WALK_FRAMES, animSpeed: SEEKER_WALK_SPEED, disp: 40, contactW: 20, contactH: 27, contactOx: 1, contactFootBottom: 15, flipDefault: true, vertical: true, hp: 6, speed: 0.62, damage: 10, exp: 2, goldMin: 1, goldMax: 2, weight: 0, unlockSec: 0, spawnedOnly: true },
    { key: 'boss',       frameW: 192, frameH: 112, frames: 12, animSpeed: 75, disp: 120, flipDefault: true, vertical: false, multiAnim: true, hp: 120, speed: 0.44, damage: 22, exp: 40, goldMin: 15, goldMax: 25, weight: 0, unlockSec: 0, spawnedOnly: true }
  ];

  var MONSTER_DISP = 32;   // default display size (overridden per type)
  var MONSTER_HIT_COOLDOWN = 900;
  /** 受击闪红，与玩家 invincibleTimer 一致 */
  var MONSTER_HIT_FLASH_MS = 500;
  /** 受击侧移总距离（屏幕像素 → 世界坐标） */
  var MONSTER_HIT_KNOCKBACK_DIST = 20 / SCALE;
  /** 受击侧移速度（所有敌人统一，与追击 spd 同单位：每帧世界坐标） */
  var MONSTER_HIT_KNOCKBACK_SPEED = 0.28;

  function isMonsterBoss(m) {
    var mt = MONSTER_TYPES[m.type];
    return !!(mt && mt.key === 'boss');
  }

  function pickMonsterKnockbackDir(m) {
    var mx = m.x + TILE / 2;
    var my = m.y + TILE / 2;
    var hx = hero.x + TILE / 2;
    var hy = hero.y + TILE / 2;
    var toHx = hx - mx;
    var toHy = hy - my;
    var toDist = Math.sqrt(toHx * toHx + toHy * toHy);
    var toHxN = 0;
    var toHyN = 0;
    if (toDist > 0.01) {
      toHxN = toHx / toDist;
      toHyN = toHy / toDist;
    }
    var kdx = 0;
    var kdy = 0;
    var guard = 0;
    while (guard++ < 16) {
      var ang = Math.random() * Math.PI * 2;
      kdx = Math.cos(ang);
      kdy = Math.sin(ang);
      if (toDist <= 0.01 || kdx * toHxN + kdy * toHyN <= 0) break;
    }
    if (toDist > 0.01 && kdx * toHxN + kdy * toHyN > 0) {
      kdx = -toHxN;
      kdy = -toHyN;
    }
    return { dx: kdx, dy: kdy };
  }

  function applyMonsterHitKnockback(m) {
    if (isMonsterBoss(m) && !LAB_MODE) return;
    var dir = pickMonsterKnockbackDir(m);
    m.knockbackDx = dir.dx;
    m.knockbackDy = dir.dy;
    m.knockbackRemain = MONSTER_HIT_KNOCKBACK_DIST;
  }

  function updateMonsterKnockback(m) {
    if (!m.knockbackRemain || m.knockbackRemain <= 0) return false;
    var step = Math.min(m.knockbackRemain, MONSTER_HIT_KNOCKBACK_SPEED * GAME_MOVE_SPEED_MULT);
    m.x += m.knockbackDx * step;
    m.y += m.knockbackDy * step;
    m.knockbackRemain -= step;
    if (m.knockbackRemain < 0.001) m.knockbackRemain = 0;
    clampMonsterPos(m);
    return m.knockbackRemain > 0;
  }

  /** 战吼：沿远离英雄方向推进，直到接触体完全离开 EXCLUSIVE_AURA_RADIUS */
  function updateBattleCryAuraKnockback(m, mType, dt) {
    if (!m.auraKnockback) return false;
    var c = getHeroCenterWorld();
    if (!circleHitsMonster(c.x, c.y, EXCLUSIVE_AURA_RADIUS, m, mType)) {
      m.auraKnockback = false;
      return false;
    }
    var mx = m.x + TILE / 2;
    var my = m.y + TILE / 2;
    var rdx = mx - c.x;
    var rdy = my - c.y;
    var rd = Math.sqrt(rdx * rdx + rdy * rdy);
    if (rd < 0.01) {
      rdx = 1;
      rdy = 0;
    } else {
      rdx /= rd;
      rdy /= rd;
    }
    var step = (BATTLE_CRY_KNOCKBACK_SCREEN_SPEED / SCALE) * (dt / 1000);
    m.x += rdx * step;
    m.y += rdy * step;
    clampMonsterPos(m);
    if (!circleHitsMonster(c.x, c.y, EXCLUSIVE_AURA_RADIUS, m, mType)) {
      m.auraKnockback = false;
    }
    return !!m.auraKnockback;
  }

  var MAX_SEEKERS = 12;
  var MAX_NECROMANCERS = 4;

  var monsters = [];
  var spawnTimer = 0;

  // Timed events (Vampire Survivors–style waves)
  var BAT_WAVE_AT_MS      = 120000; // 2:00 大量蝙蝠
  var SKEL_WAVE_AT_MS     = 240000; // 4:00 骷髅群
  var BAT_WAVE_SIZE       = 55;
  var SKEL_WAVE_SIZE      = 48;
  var WAVE_SPAWN_GAP      = 35;     // ms between each spawn in a burst
  var batWaveFired        = false;
  var skelWaveFired       = false;
  var batWaveSpawnQueue   = 0;
  var skelWaveSpawnQueue  = 0;
  var batWaveSpawnTimer   = 0;
  var skelWaveSpawnTimer  = 0;

  // ===================== GEMS =====================
  var GEM_SIZE = 16;
  var GEM_DISP = 12;
  var GEM_FRAMES = 4;
  var GEM_ANIM_SPEED = 120;
  var GEM_ATTRACT_RANGE = 25;  // world units — hero must walk quite close to trigger pull
  var GEM_PICKUP_RANGE = 2;    // world units — must nearly touch to collect
  var GEM_MAX_SPEED = 10;
  /** 击杀随机掉红宝石（spr_coin_roj），拾取回复 maxHp 的比例 */
  var RUBY_DROP_CHANCE = 0.008;
  var RUBY_HEAL_MAX_HP_RATIO = 0.30;
  var RUBY_GEM_DISP = 14;

  var gems = [];
  var gemCount = 0;

  function spawnGem(wx, wy, expValue, large) {
    gems.push({
      kind: 'exp',
      x: wx, y: wy,
      exp: expValue || 1,
      large: !!large,
      onGround: true,
      animFrame: 0,
      animTimer: 0,
      attracted: false,
      attractSpeed: 0,
      attractLockTimer: 800, // ms before attract can trigger
      idleTimer: 0
    });
  }

  function spawnRuby(wx, wy) {
    gems.push({
      kind: 'ruby',
      x: wx, y: wy,
      onGround: true,
      animFrame: 0,
      animTimer: 0,
      attracted: false,
      attractSpeed: 0,
      attractLockTimer: 800,
      idleTimer: 0
    });
  }

  function tryDropRubyOnKill(wx, wy) {
    if (Math.random() >= RUBY_DROP_CHANCE) return;
    var pos = jitterSpawnPos(wx, wy, 12);
    spawnRuby(pos.x, pos.y);
  }

  function healHeroFromRuby() {
    if (hero.dead || hero.maxHp <= 0) return;
    var heal = Math.max(1, Math.ceil(hero.maxHp * RUBY_HEAL_MAX_HP_RATIO));
    hero.hp = Math.min(hero.maxHp, hero.hp + heal);
    playExpPickupSound(heal, true);
  }

  function updateGems(dt) {
    var dtS = dt / 16.67; // normalize to 60fps
    for (var i = gems.length - 1; i >= 0; i--) {
      var g = gems[i];

      // Animate frames
      g.animTimer += dt;
      if (g.animTimer >= GEM_ANIM_SPEED) {
        g.animTimer -= GEM_ANIM_SPEED;
        g.animFrame = (g.animFrame + 1) % GEM_FRAMES;
      }

      var dx = hero.x - g.x;
      var dy = hero.y - g.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      // Pickup — only when very close
      if (dist < GEM_PICKUP_RANGE) {
        if (g.kind === 'ruby') {
          healHeroFromRuby();
        } else {
          addExp(g.exp || 1);
          playExpPickupSound(g.exp || 1, g.large);
          gemCount++;
        }
        gems.splice(i, 1);
        continue;
      }

      // Count down attract lock regardless of state
      if (g.attractLockTimer > 0) g.attractLockTimer -= dt;

      if (!g.attracted) {
        // ── Phase 1: resting on ground, gentle idle bob ──
        g.idleTimer += dt;

        // Only start attracting after lock expires AND hero walks into range
        if (g.attractLockTimer <= 0 && dist < GEM_ATTRACT_RANGE) {
          g.attracted = true;
          g.attractSpeed = 0.8 * GAME_MOVE_SPEED_MULT; // start slow — VS feel
        }
      } else {
        // ── Phase 3: accelerating pull toward hero ──
        // Slow start, then ramp up — matches VS magnet feel
        g.attractSpeed = Math.min(g.attractSpeed * 1.08 + 0.15 * GAME_MOVE_SPEED_MULT, GEM_MAX_SPEED * GAME_MOVE_SPEED_MULT);
        g.x += (dx / dist) * g.attractSpeed * dtS;
        g.y += (dy / dist) * g.attractSpeed * dtS;
      }
    }
  }

  function drawGems() {
    ctx.imageSmoothingEnabled = false;
    for (var i = 0; i < gems.length; i++) {
      var g = gems[i];
      var isRuby = g.kind === 'ruby';
      var img = isRuby ? assets.gem_red : assets.gem;
      if (!img || !img.complete) continue;
      var bobY = g.onGround ? Math.sin(g.idleTimer * 0.004) * 2 : 0;
      var gemDisp = isRuby ? RUBY_GEM_DISP : (g.large ? Math.floor(GEM_DISP * 1.5) : GEM_DISP);
      var sx = Math.floor(g.x * SCALE - cam.x) - gemDisp / 2;
      var sy = Math.floor(g.y * SCALE - cam.y) - gemDisp / 2 + bobY;
      ctx.save();
      if (g.attracted) {
        ctx.globalAlpha = 0.85 + Math.sin(Date.now() * 0.025) * 0.15;
      }
      if (isRuby) {
        ctx.globalAlpha *= 0.92 + Math.sin(g.idleTimer * 0.006) * 0.08;
      }
      ctx.drawImage(img, g.animFrame * GEM_SIZE, 0, GEM_SIZE, GEM_SIZE,
        sx, sy, gemDisp, gemDisp);
      ctx.restore();
    }
  }

  // gem count is now shown in drawTopHUD

  function getMonsterTypeIndex(key) {
    for (var ti = 0; ti < MONSTER_TYPES.length; ti++) {
      if (MONSTER_TYPES[ti].key === key) return ti;
    }
    return -1;
  }

  function jitterSpawnPos(wx, wy, spread) {
    spread = spread != null ? spread : 18;
    return {
      x: Math.max(0, Math.min(wx + (Math.random() - 0.5) * spread * 2, MAP_W * TILE - TILE)),
      y: Math.max(0, Math.min(wy + (Math.random() - 0.5) * spread * 2, MAP_H * TILE - TILE))
    };
  }

  function clampMonsterPos(m) {
    m.x = Math.max(0, Math.min(m.x, MAP_W * TILE - TILE));
    m.y = Math.max(0, Math.min(m.y, MAP_H * TILE - TILE));
  }

  function findBossMonster() {
    for (var fi = 0; fi < monsters.length; fi++) {
      var mt = MONSTER_TYPES[monsters[fi].type];
      if (mt && mt.key === 'boss') return monsters[fi];
    }
    return null;
  }

  function getBossBodyCenter(boss, bossType) {
    return {
      x: boss.x + TILE / 2,
      y: boss.y + TILE / 2 + bossType.disp / 2
    };
  }

  function getBossRepelRadius(bossType) {
    return bossType.disp * 0.58;
  }

  function mobCenterNearBoss(wx, wy, mobDisp) {
    var boss = findBossMonster();
    if (!boss) return false;
    var bossType = MONSTER_TYPES[boss.type] || MONSTER_TYPES[0];
    var bc = getBossBodyCenter(boss, bossType);
    var mx = wx + TILE / 2;
    var my = wy + TILE / 2 + (mobDisp || MONSTER_DISP) * 0.35;
    var dx = mx - bc.x;
    var dy = my - bc.y;
    var minD = getBossRepelRadius(bossType) + (mobDisp || MONSTER_DISP) * 0.28;
    return dx * dx + dy * dy < minD * minD;
  }

  function pickVsSpawnPosOnce() {
    var halfW = VIEW_W / SCALE / 2;
    var halfH = VIEW_H / SCALE / 2;
    var edgePad = 56 + Math.random() * 72;
    var hx = hero.x + TILE / 2;
    var hy = hero.y + TILE / 2;
    var side = Math.floor(Math.random() * 4);
    var wx, wy;
    if (side === 0) {
      wx = hx + (Math.random() - 0.5) * (VIEW_W / SCALE);
      wy = hy - halfH - edgePad;
    } else if (side === 1) {
      wx = hx + halfW + edgePad;
      wy = hy + (Math.random() - 0.5) * (VIEW_H / SCALE);
    } else if (side === 2) {
      wx = hx + (Math.random() - 0.5) * (VIEW_W / SCALE);
      wy = hy + halfH + edgePad;
    } else {
      wx = hx - halfW - edgePad;
      wy = hy + (Math.random() - 0.5) * (VIEW_H / SCALE);
    }
    return jitterSpawnPos(wx, wy, 18);
  }

  function getMonsterSepRadius(mType) {
    return (mType.disp || MONSTER_DISP) * 0.32;
  }

  /** 极轻互斥：只防止完全叠在一起，允许密集群怪 */
  function separateOverlappingMobs() {
    var sepPasses = 1;
    var sepStrength = 0.2;
    var pass, i, j, mi, mj, mTypeI, mTypeJ, cix, ciy, cjx, cjy, dx, dy, distSq, dist, minD, push, half, ang;
    for (pass = 0; pass < sepPasses; pass++) {
      for (i = 0; i < monsters.length; i++) {
        mi = monsters[i];
        mTypeI = MONSTER_TYPES[mi.type] || MONSTER_TYPES[0];
        if (mTypeI.key === 'boss') continue;
        cix = mi.x + TILE / 2;
        ciy = mi.y + TILE / 2 + mTypeI.disp * 0.35;
        for (j = i + 1; j < monsters.length; j++) {
          mj = monsters[j];
          mTypeJ = MONSTER_TYPES[mj.type] || MONSTER_TYPES[0];
          if (mTypeJ.key === 'boss') continue;
          cjx = mj.x + TILE / 2;
          cjy = mj.y + TILE / 2 + mTypeJ.disp * 0.35;
          dx = cjx - cix;
          dy = cjy - ciy;
          minD = getMonsterSepRadius(mTypeI) + getMonsterSepRadius(mTypeJ);
          distSq = dx * dx + dy * dy;
          if (distSq >= minD * minD) continue;
          dist = Math.sqrt(distSq);
          if (dist < 0.001) {
            ang = Math.random() * Math.PI * 2;
            dx = Math.cos(ang);
            dy = Math.sin(ang);
            dist = 1;
          }
          push = (minD - dist) * sepStrength;
          half = push * 0.5;
          mi.x -= (dx / dist) * half;
          mi.y -= (dy / dist) * half;
          mj.x += (dx / dist) * half;
          mj.y += (dy / dist) * half;
          clampMonsterPos(mi);
          clampMonsterPos(mj);
        }
      }
    }
  }

  function pickVsSpawnPos(mobDisp) {
    var attempt, pos;
    for (attempt = 0; attempt < 14; attempt++) {
      pos = pickVsSpawnPosOnce();
      if (!mobCenterNearBoss(pos.x, pos.y, mobDisp)) return pos;
    }
    return pos;
  }

  function repelMobsFromBoss() {
    var boss = findBossMonster();
    if (!boss) return;
    var bossType = MONSTER_TYPES[boss.type] || MONSTER_TYPES[0];
    var bc = getBossBodyCenter(boss, bossType);
    var bossR = getBossRepelRadius(bossType);
    var pass, i, m, mType, mc, dx, dy, minD, distSq, dist, push;
    for (pass = 0; pass < 2; pass++) {
    for (i = 0; i < monsters.length; i++) {
      m = monsters[i];
      mType = MONSTER_TYPES[m.type] || MONSTER_TYPES[0];
      if (mType.key === 'boss') continue;
      mc = {
        x: m.x + TILE / 2,
        y: m.y + TILE / 2 + mType.disp * 0.35
      };
      dx = mc.x - bc.x;
      dy = mc.y - bc.y;
      minD = bossR + mType.disp * 0.32;
      distSq = dx * dx + dy * dy;
      if (distSq >= minD * minD) continue;
      dist = Math.sqrt(distSq);
      if (dist < 0.001) {
        var ang = Math.random() * Math.PI * 2;
        dx = Math.cos(ang);
        dy = Math.sin(ang);
        dist = 1;
      }
      push = minD - dist;
      m.x += (dx / dist) * push;
      m.y += (dy / dist) * push;
      clampMonsterPos(m);
    }
    }
  }

  function spawnBatAt(wx, wy, ignoreCap) {
    var batType = getMonsterTypeIndex('bat');
    if (batType === -1) return false;
    if (!ignoreCap && monsters.length >= getMaxMonsters()) return false;
    var batJ = jitterSpawnPos(wx, wy, 14);
    monsters.push(createMonster(batType, batJ.x, batJ.y, {}));
    return true;
  }

  function spawnBatFromEdge() {
    var pos = pickVsSpawnPos(28);
    spawnBatAt(pos.x, pos.y, true);
  }

  function spawnSkeletonAt(wx, wy, ignoreCap) {
    var skelType = getMonsterTypeIndex('skeleton');
    if (skelType === -1) return false;
    if (!ignoreCap && monsters.length >= getMaxMonsters()) return false;
    var skelJ = jitterSpawnPos(wx, wy, 14);
    monsters.push(createMonster(skelType, skelJ.x, skelJ.y, {}));
    return true;
  }

  function spawnSkeletonFromEdge() {
    var pos = pickVsSpawnPos(24);
    spawnSkeletonAt(pos.x, pos.y, true);
  }

  function startBatWave() {
    batWaveSpawnQueue = BAT_WAVE_SIZE;
    batWaveSpawnTimer = 0;
  }

  function startSkelWave() {
    skelWaveSpawnQueue = SKEL_WAVE_SIZE;
    skelWaveSpawnTimer = 0;
  }

  function updateTimedEvents(dt) {
    var seg = getSegmentTime();
    if (!bossSpawnFired && seg >= BOSS_SPAWN_AT_MS && countMonstersByKey('boss') === 0) {
      bossSpawnFired = true;
      spawnBossNearHero();
    }
    if (!batWaveFired && seg >= BAT_WAVE_AT_MS) {
      batWaveFired = true;
      startBatWave();
    }
    if (!skelWaveFired && seg >= SKEL_WAVE_AT_MS) {
      skelWaveFired = true;
      startSkelWave();
    }
    if (batWaveSpawnQueue > 0) {
      batWaveSpawnTimer -= dt;
      while (batWaveSpawnTimer <= 0 && batWaveSpawnQueue > 0) {
        spawnBatFromEdge();
        batWaveSpawnQueue--;
        batWaveSpawnTimer += WAVE_SPAWN_GAP;
      }
    }
    if (skelWaveSpawnQueue > 0) {
      skelWaveSpawnTimer -= dt;
      while (skelWaveSpawnTimer <= 0 && skelWaveSpawnQueue > 0) {
        spawnSkeletonFromEdge();
        skelWaveSpawnQueue--;
        skelWaveSpawnTimer += WAVE_SPAWN_GAP;
      }
    }
  }

  function spawnSeeker(nx, ny) {
    var seekerType = -1;
    for (var ti = 0; ti < MONSTER_TYPES.length; ti++) {
      if (MONSTER_TYPES[ti].key === 'seeker') { seekerType = ti; break; }
    }
    if (seekerType === -1) return;
    var offsets = [{ dx: -12, dy: 0 }, { dx: 12, dy: 0 }];
    for (var s = 0; s < 2; s++) {
      if (countMonstersByKey('seeker') >= MAX_SEEKERS) return;
      var seekJ = jitterSpawnPos(nx + offsets[s].dx, ny + offsets[s].dy, 14);
      monsters.push(createMonster(seekerType, seekJ.x, seekJ.y, {
        spawning: true
      }));
    }
  }

  function spawnMonster() {
    if (monsters.length >= getMaxMonsters()) return;

    var typeIndex = pickWeightedMonsterType();
    if (typeIndex === -1) return;

    var summonTimer = 0;
    if (MONSTER_TYPES[typeIndex].key === 'necromancer') {
      summonTimer = NECRO_SUMMON_INTERVAL * (0.5 + Math.random() * 0.5);
    }
    var spawnType = MONSTER_TYPES[typeIndex];
    var pos = pickVsSpawnPos(spawnType.disp);
    monsters.push(createMonster(typeIndex, pos.x, pos.y, { summonTimer: summonTimer }));
  }

  function moveMonsterVsChase(m, spd) {
    var hx = hero.x + TILE / 2;
    var hy = hero.y + TILE / 2;
    var mx = m.x + TILE / 2;
    var my = m.y + TILE / 2;
    var mdx = hx - mx;
    var mdy = hy - my;
    var md = Math.sqrt(mdx * mdx + mdy * mdy);
    if (md < 0.01) return;
    m.x += (mdx / md) * spd;
    m.y += (mdy / md) * spd;
    m.facingLeft = mdx < 0;
  }

  function spawnBossNearHero() {
    if (getSegmentTime() < BOSS_SPAWN_AT_MS) return;
    if (countMonstersByKey('boss') > 0) return;
    var bossType = getMonsterTypeIndex('boss');
    if (bossType < 0) return;
    monsters.push(createMonster(bossType, hero.x + 180, hero.y, {
      bossAnim: 'walk'
    }));
  }

  function updateMonsters(dt) {
    if (LAB_MODE) {
      updateLabRespawns(dt);
    }
    if (!LAB_MODE) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      var batch = getVsSpawnBatchSize();
      var bi;
      for (bi = 0; bi < batch; bi++) {
        if (monsters.length >= getMaxMonsters()) break;
        spawnMonster();
      }
      spawnTimer = getSpawnInterval();
    }
    }

    for (var i = monsters.length - 1; i >= 0; i--) {
      var m = monsters[i];
      var mType = MONSTER_TYPES[m.type] || MONSTER_TYPES[0];
      var mTypeKey = mType.key;
      var isNecro = mTypeKey === 'necromancer';
      var isSeeker = mTypeKey === 'seeker';
      var isBoss = mTypeKey === 'boss';

      var hurtGap = getHeroMonsterContactGap(m, mType);
      var dx = hero.x - m.x;
      var dy = hero.y - m.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var spd = LAB_MODE ? 0 : (m.speed * GAME_MOVE_SPEED_MULT);
      if (isNecro && m.summoning) spd = 0;
      if (isSeeker && m.spawning) spd = 0;
      if (LAB_MODE && m.labDummy) spd = 0;

      if (isBoss && !LAB_MODE) {
        var nextBossAnim = 'idle';
        var bossFlyStartDist = BOSS_FLY_STOP_DIST + BOSS_FLY_START_EXTRA;
        if (m.bossFlying) {
          m.bossFlyDur -= dt;
          m.bossFlyTime += dt;
          nextBossAnim = 'fly';
          spd *= BOSS_FLY_SPEED_MULT;
          var flyCloseEnough = hurtGap <= BOSS_FLY_STOP_DIST;
          var flyMinTimeDone = m.bossFlyTime >= BOSS_FLY_MIN_DURATION;
          if (m.bossFlyDur <= 0 || (flyMinTimeDone && flyCloseEnough)) {
            m.bossFlying = false;
            m.bossFlyTime = 0;
            m.bossFlyCd = BOSS_FLY_COOLDOWN_MIN +
              Math.random() * (BOSS_FLY_COOLDOWN_MAX - BOSS_FLY_COOLDOWN_MIN);
            nextBossAnim = hurtGap > 4 ? 'walk' : 'idle';
          }
        } else {
          m.bossFlyCd -= dt;
          if (m.bossFlyCd <= 0 && hurtGap > bossFlyStartDist) {
            m.bossFlying = true;
            m.bossFlyDur = BOSS_FLY_DURATION_MAX;
            m.bossFlyTime = 0;
            nextBossAnim = 'fly';
            spd *= BOSS_FLY_SPEED_MULT;
          } else if (m.bossFlyCd <= 0 && hurtGap <= bossFlyStartDist) {
            m.bossFlyCd = BOSS_FLY_COOLDOWN_MIN +
              Math.random() * (BOSS_FLY_COOLDOWN_MAX - BOSS_FLY_COOLDOWN_MIN);
          } else if (hurtGap > 4 && spd > 0) {
            nextBossAnim = 'walk';
          }
        }
        if (m.bossAnim !== nextBossAnim) {
          m.bossAnim = nextBossAnim;
          m.animFrame = 0;
          m.animTimer = 0;
        }
      }

      var inAuraKnockback = updateBattleCryAuraKnockback(m, mType, dt);
      var inKnockback = !inAuraKnockback && updateMonsterKnockback(m);
      if (!inAuraKnockback && !inKnockback && spd > 0 && dist > 0.5) {
        moveMonsterVsChase(m, spd);
      }

      // Seeker spawn animation
      if (isSeeker && m.spawning) {
        m.spawnAnimTimer += dt;
        if (m.spawnAnimTimer >= 80) {
          m.spawnAnimTimer -= 80;
          m.spawnAnimFrame++;
          if (m.spawnAnimFrame >= SEEKER_SPAWN_FRAMES) {
            m.spawning = false; // done spawning, start walking
          }
        }
      }
      if (isNecro && !LAB_MODE) {
        m.summonTimer -= dt;
        if (!m.summoning && m.summonTimer <= 0) {
          m.summoning = true;
          m.animFrame = 0;
          m.animTimer = 0;
        }
      }
      if (LAB_MODE && isBoss && m.labDummy) {
        if (m.bossAnim !== 'idle') {
          m.bossAnim = 'idle';
          m.animFrame = 0;
          m.animTimer = 0;
        }
      }

      // Animation
      m.animTimer += dt;
      var animSpeed = mType.animSpeed;
      var totalFrames = mType.frames;
      if (isBoss) {
        var bossDef = BOSS_ANIM_DEFS[m.bossAnim] || BOSS_ANIM_DEFS.idle;
        animSpeed = bossDef.speed;
        totalFrames = bossDef.count;
      }
      if (isNecro && m.summoning) {
        animSpeed = NECRO_SUMMON_ANIM_SPEED;
        totalFrames = NECRO_SUMMON_FRAMES;
      }
      if (m.animTimer >= animSpeed) {
        m.animTimer -= animSpeed;
        m.animFrame++;
        if (m.animFrame >= totalFrames) {
          m.animFrame = 0;
          if (isNecro && m.summoning) {
            // Summon complete — spawn 2 seekers then back to walking
            spawnSeeker(m.x, m.y);
            m.summoning = false;
            m.summonTimer = NECRO_SUMMON_INTERVAL;
          }
        }
      }

      // Hit cooldown / 受击闪红
      if (m.hitCooldown > 0) m.hitCooldown -= dt;
      if (m.hitFlashTimer > 0) m.hitFlashTimer -= dt;

      // Damage hero on contact-circle overlap
      if (!LAB_MODE && hero.invincibleTimer <= 0 && m.hitCooldown <= 0 && heroTouchesMonster(m, mType)) {
        if (tryBlockHolyShield()) {
          hero.invincibleTimer = 500;
          m.hitCooldown = MONSTER_HIT_COOLDOWN;
        } else {
          var hurt = Math.max(1, Math.floor(m.damage * (1 - (hero.armor || 0))));
          hero.hp = Math.max(0, hero.hp - hurt);
          if (hero.hp <= 0) triggerHeroDeath();
          hero.invincibleTimer = 500;
          m.hitCooldown = MONSTER_HIT_COOLDOWN;
        }
      }
    }

    if (!LAB_MODE) {
    separateOverlappingMobs();
    repelMobsFromBoss();
    }

    if (hero.invincibleTimer > 0) hero.invincibleTimer -= dt;
  }

  function damageMonster(m, dmg) {
    if (dmg <= 0) return;
    m.hp -= dmg;
    m.hitFlashTimer = MONSTER_HIT_FLASH_MS;
  }

  var spriteTintBuf = { canvas: null, ctx: null };

  function ensureSpriteTintBuf(w, h) {
    w = Math.max(1, Math.ceil(w));
    h = Math.max(1, Math.ceil(h));
    if (!spriteTintBuf.canvas || spriteTintBuf.canvas.width < w || spriteTintBuf.canvas.height < h) {
      spriteTintBuf.canvas = document.createElement('canvas');
      spriteTintBuf.canvas.width = Math.max(w, 96);
      spriteTintBuf.canvas.height = Math.max(h, 96);
      spriteTintBuf.ctx = spriteTintBuf.canvas.getContext('2d');
    }
    return spriteTintBuf;
  }

  /** 离屏按 alpha 填纯色，避免主画布上出现方框 */
  function drawSpriteSolidTint(img, srcX, srcY, srcW, srcH, drawX, drawY, dw, dh, color) {
    if (!img || !img.complete) return;
    dw = Math.max(1, Math.round(dw));
    dh = Math.max(1, Math.round(dh));
    var buf = ensureSpriteTintBuf(dw, dh);
    var t = buf.ctx;
    t.clearRect(0, 0, dw, dh);
    t.imageSmoothingEnabled = false;
    t.globalAlpha = 1;
    t.globalCompositeOperation = 'source-over';
    if (color === '#ffffff' && typeof t.filter === 'string') {
      t.filter = 'brightness(0) invert(1)';
      t.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, dw, dh);
      t.filter = 'none';
    } else {
      t.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, dw, dh);
      t.globalCompositeOperation = 'source-in';
      t.fillStyle = color;
      t.fillRect(0, 0, dw, dh);
      t.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(buf.canvas, 0, 0, dw, dh, drawX, drawY, dw, dh);
    ctx.restore();
  }

  function drawMonsterSprite(img, srcX, srcY, srcW, srcH, drawX, drawY, dw, dh, m) {
    if (!img || !img.complete) return;
    if (m.hitFlashTimer > 0) {
      drawSpriteSolidTint(img, srcX, srcY, srcW, srcH, drawX, drawY, dw, dh, '#ff2222');
    } else {
      ctx.drawImage(img, srcX, srcY, srcW, srcH, drawX, drawY, dw, dh);
    }
  }

  function drawOneMonster(m, mType) {
      var isBossDraw = mType.key === 'boss';
      // Seeker uses separate walk/spawn images; boss uses per-frame PNGs
      var img = mType.key === 'seeker' ? assets.seeker_walk
        : isBossDraw ? null : assets[mType.key];
      if (!isBossDraw && (!img || !img.complete)) return;

      var s = mType.disp * SCALE;
      var sx = Math.floor(m.x * SCALE - cam.x) - s / 2 + TILE * SCALE / 2;
      var sy = Math.floor(m.y * SCALE - cam.y) - s / 2 + TILE * SCALE / 2;

      ctx.save();
      var shouldFlip = mType.flipDefault ? m.facingLeft : !m.facingLeft;
      if (shouldFlip) {
        ctx.translate(sx + s / 2, sy + s / 2);
        ctx.scale(-1, 1);
        ctx.translate(-(sx + s / 2), -(sy + s / 2));
      }
      var srcX, srcY, srcW, srcH, dw, dh;
      if (mType.key === 'necromancer') {
        var necroRow = m.summoning ? NECRO_SUMMON_ROW  : NECRO_WALK_ROW;
        var bodyY    = m.summoning ? NECRO_SUMMON_BODY_Y : NECRO_WALK_BODY_Y;
        var bodyH    = m.summoning ? NECRO_SUMMON_BODY_H : NECRO_WALK_BODY_H;
        srcX = m.animFrame * NECRO_FRAME_W;
        srcY = necroRow * NECRO_FRAME_H + bodyY;
        srcW = NECRO_FRAME_W;
        srcH = bodyH;
        dh = Math.round(s * bodyH / NECRO_WALK_BODY_H);
        dw = Math.round(dh * srcW / srcH);
      } else if (mType.key === 'seeker' && m.spawning) {
        // Spawn animation
        var spawnImg = assets.seeker_spawn;
        if (spawnImg && spawnImg.complete) {
          srcX = 0; srcY = m.spawnAnimFrame * SEEKER_SPAWN_FRAME_H;
          srcW = SEEKER_SPAWN_FRAME_W; srcH = SEEKER_SPAWN_FRAME_H;
          dh = s; dw = Math.round(s * srcW / srcH);
          var spawnDrawX = sx + (s - dw) / 2;
          var spawnDrawY = sy + s - dh;
          drawMonsterSprite(spawnImg, srcX, srcY, srcW, srcH,
            spawnDrawX, spawnDrawY, dw, dh, m);
        }
        ctx.restore();
        return;
      } else if (isBossDraw) {
        var bossMode = m.bossAnim || 'idle';
        var frameImg = getBossFrameImg(bossMode, m.animFrame);
        if (!isImgOk(frameImg)) {
          ctx.restore();
          return;
        }
        srcW = frameImg.naturalWidth;
        srcH = frameImg.naturalHeight;
        dh = s;
        dw = Math.round(s * srcW / srcH);
        var bossDrawX = sx + (s - dw) / 2;
        var bossDrawY = sy + s - dh;
        drawMonsterSprite(frameImg, 0, 0, srcW, srcH, bossDrawX, bossDrawY, dw, dh, m);
        ctx.restore();
        return;
      } else if (mType.vertical) {
        srcX = 0; srcY = m.animFrame * mType.frameH;
        srcW = mType.frameW; srcH = mType.frameH;
        dw = s; dh = s;
      } else {
        srcX = m.animFrame * mType.frameW; srcY = 0;
        srcW = mType.frameW; srcH = mType.frameH;
        dw = s; dh = s;
      }

      // Center horizontally, bottom-align vertically so feet stay grounded
      var drawX = sx + (s - dw) / 2;
      var drawY = sy + s - dh;  // align bottom edge to sprite bottom
      drawMonsterSprite(img, srcX, srcY, srcW, srcH, drawX, drawY, dw, dh, m);
      ctx.restore();
  }

  function drawMonsters() {
    ctx.imageSmoothingEnabled = false;
    var i, m, mType;
    for (i = 0; i < monsters.length; i++) {
      m = monsters[i];
      mType = MONSTER_TYPES[m.type] || MONSTER_TYPES[0];
      if (mType.key === 'boss') continue;
      drawOneMonster(m, mType);
    }
    for (i = 0; i < monsters.length; i++) {
      m = monsters[i];
      mType = MONSTER_TYPES[m.type] || MONSTER_TYPES[0];
      if (mType.key !== 'boss') continue;
      drawOneMonster(m, mType);
    }
  }

  // ===================== HUD =====================

  function formatTime(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function hpBarColor(ratio) {
    if (ratio > 0.6) return '#22cc55';
    if (ratio > 0.3) return '#ffaa00';
    return '#ee2222';
  }

  function drawHpBar(barX, barY, barW, barH, hp, maxHp) {
    if (maxHp <= 0 || hp <= 0) return;
    var ratio = Math.max(0, Math.min(1, hp / maxHp));
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = hpBarColor(ratio);
    ctx.fillRect(barX, barY, barW * ratio, barH);
  }

  function drawHeroHpBar() {
    var cx = Math.floor(hero.x * SCALE - cam.x) + TILE * SCALE / 2;
    var footY = Math.floor(hero.y * SCALE - cam.y) + TILE * SCALE / 2;
    drawHpBar(cx - HERO_HP_BAR_W / 2, footY + HERO_HP_BAR_GAP,
      HERO_HP_BAR_W, HERO_HP_BAR_H, hero.hp, hero.maxHp);
  }

  function getBossBarY() {
    return HUD_EXP_Y + HUD_EXP_H + HUD_ROW_GAP + SKILL_SLOT_SIZE + 8;
  }

  function drawBossHudHpBar() {
    var boss = findBossMonster();
    if (!boss || boss.hp <= 0 || !boss.maxHp) return;
    var pad = HUD_PAD;
    var barX = pad;
    var barY = getBossBarY();
    var barW = VIEW_W - pad * 2;
    var barH = BOSS_BAR_H;
    var ratio = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
    var r = HUD_EXP_CORNER_R;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    roundRect(barX, barY, barW, barH, r);
    ctx.fill();
    ctx.save();
    roundRect(barX, barY, barW, barH, r);
    ctx.clip();
    var grd = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grd.addColorStop(0, '#8b1818');
    grd.addColorStop(1, '#ee3333');
    ctx.fillStyle = grd;
    ctx.fillRect(barX, barY, barW * ratio, barH);
    ctx.restore();
    ctx.strokeStyle = 'rgba(220, 80, 80, 0.9)';
    ctx.lineWidth = 1.5;
    roundRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1, r);
    ctx.stroke();
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText('BOSS', barX + barW / 2 + 1, barY + barH - 2);
    ctx.fillStyle = '#ffe8e8';
    ctx.fillText('BOSS', barX + barW / 2, barY + barH - 3);
  }

  function drawTopHUD() {
    var expBarY = HUD_EXP_Y;
    var expBarH = HUD_EXP_H;
    var expBarPad = HUD_PAD;
    var expBarW = VIEW_W - expBarPad * 2;
    var expRatio = expToNext > 0 ? exp / expToNext : 1;
    var expR = HUD_EXP_CORNER_R;
    // Dark trough
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(expBarPad, expBarY, expBarW, expBarH, expR);
    ctx.fill();
    // Blue fill — clip to rounded trough so fill doesn't overflow corners
    ctx.save();
    roundRect(expBarPad, expBarY, expBarW, expBarH, expR);
    ctx.clip();
    var expGrd = ctx.createLinearGradient(expBarPad, 0, expBarPad + expBarW, 0);
    expGrd.addColorStop(0, '#2255cc');
    expGrd.addColorStop(1, '#55aaff');
    ctx.fillStyle = expGrd;
    ctx.fillRect(expBarPad, expBarY, expBarW * expRatio, expBarH);
    ctx.restore();
    // Border
    ctx.strokeStyle = 'rgba(100,160,255,0.7)';
    ctx.lineWidth = 1.5;
    roundRect(expBarPad + 0.5, expBarY + 0.5, expBarW - 1, expBarH - 1, expR);
    ctx.stroke();
    // Level text inside bar, right-aligned with equal padding
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText('LV.' + level, expBarPad + expBarW - expBarH/2 + 1, expBarY + expBarH - 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('LV.' + level, expBarPad + expBarW - expBarH/2, expBarY + expBarH - 6);

    var hudRowY = expBarY + expBarH + HUD_ROW_GAP;
    drawItemBar(expBarPad, hudRowY);

    // Timer: vertically centered in the same row as skill slots
    var timeY = hudRowY + SKILL_SLOT_SIZE - 7;
    ctx.font = 'bold 17px Courier New';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(formatTime(gameTime), VIEW_W / 2 + 1, timeY + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(formatTime(gameTime), VIEW_W / 2, timeY);

    // ── Right: kill count + skull icon (right-aligned) ──
    var rx = VIEW_W - HUD_PAD;
    var killIconSz = HUD_KILL_ICON_SIZE;
    var killRowY = hudRowY + Math.floor((SKILL_SLOT_SIZE - killIconSz) / 2);
    var skullImg = assets.skull_normal;
    if (isImgOk(skullImg)) {
      var sw = skullImg.naturalWidth || skullImg.width;
      var sh = skullImg.naturalHeight || skullImg.height;
      var sc = Math.min(killIconSz / sw, killIconSz / sh);
      var dw = Math.max(1, Math.floor(sw * sc));
      var dh = Math.max(1, Math.floor(sh * sc));
      var iconX = rx - dw;
      var iconY = killRowY + Math.floor((killIconSz - dh) / 2);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(skullImg, 0, 0, sw, sh, iconX, iconY, dw, dh);
    }
    ctx.font = '12px Courier New';
    ctx.textAlign = 'right';
    var killTextX = rx - killIconSz - 6;
    var killTextY = killRowY + killIconSz - 3;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(String(killCount), killTextX + 1, killTextY + 1);
    ctx.fillStyle = '#ff8888';
    ctx.fillText(String(killCount), killTextX, killTextY);

  }

  function drawItemBar(expBarPad, hudRowY) {
    if (!heroHasGreatsword() && !heroHasKnife() && !heroHasBible()) return;
    var bx = expBarPad;
    var slotR = 4;
    for (var si = 0; si < ITEM_SLOTS; si++) {
      var sx = bx + si * (SKILL_SLOT_SIZE + SKILL_SLOT_GAP);
      var sy = hudRowY;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
      ctx.lineWidth = 1;
      roundRect(Math.floor(sx) + 0.5, Math.floor(sy) + 0.5,
        SKILL_SLOT_SIZE - 1, SKILL_SLOT_SIZE - 1, slotR);
      ctx.stroke();
      var slot = itemSlots[si];
      if (slot && slot.weaponImg) {
        var pad = SKILL_ICON_PAD;
        drawWeaponIconFit(slot.weaponImg, sx + pad, sy + pad, SKILL_SLOT_SIZE - pad * 2);
        if (slot.count > 1) {
          ctx.font = 'bold 9px Courier New';
          ctx.textAlign = 'right';
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillText(String(slot.count), sx + SKILL_SLOT_SIZE - 3, sy + 12);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(String(slot.count), sx + SKILL_SLOT_SIZE - 4, sy + 11);
        }
      }
    }
  }

  // Center camera on hero
  function centerCam() {
    cam.x = hero.x * SCALE - VIEW_W / 2;
    cam.y = hero.y * SCALE - VIEW_H / 2;
    clampCam();
  }

  // ===================== INPUT =====================
  var keys = {};
  var mouse = { x: VIEW_W / 2, y: VIEW_H / 2 }; // screen coords
  window.addEventListener('keydown', function (e) {
    ensureAudio();
    keys[e.code] = true;
    if (!e.repeat && (e.code === 'KeyP' || e.code === 'Escape')) {
      if (gameState === 'playing' && !hero.dead) {
        e.preventDefault();
        gameState = 'paused';
        return;
      }
      if (gameState === 'paused') {
        e.preventDefault();
        gameState = 'playing';
        return;
      }
      if (gameState === 'gameover' && e.code === 'Escape') {
        e.preventDefault();
        keys = {};
        characterSelectOpen = false;
        gameState = 'title';
        return;
      }
    }
    if (!e.repeat && e.code === 'Escape' && gameState === 'title' && characterSelectOpen) {
      e.preventDefault();
      characterSelectOpen = false;
      return;
    }
    if (e.code === 'Enter' || e.code === 'Space') {
      if (gameState === 'title' && characterSelectOpen) {
        e.preventDefault();
        startGame();
        characterSelectOpen = false;
      } else if (gameState === 'title') {
        e.preventDefault();
        characterSelectOpen = true;
      } else if (gameState === 'gameover') {
        e.preventDefault();
        startGame();
      }
    }
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = VIEW_W / rect.width;
    var scaleY = VIEW_H / rect.height;
    mouse.x = (e.clientX - rect.left) * scaleX;
    mouse.y = (e.clientY - rect.top) * scaleY;
    if (gameState === 'title' && characterSelectOpen) {
      hoveredHeroIndex = getHeroAtPoint(mouse.x, mouse.y);
    } else if (gameState === 'levelup') {
      hoveredUpgradeChoice = getLevelUpChoiceAt(mouse.x, mouse.y);
    }
  });
  canvas.addEventListener('click', function (e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = VIEW_W / rect.width;
    var scaleY = VIEW_H / rect.height;
    var cx = (e.clientX - rect.left) * scaleX;
    var cy = (e.clientY - rect.top) * scaleY;
    handleClick(cx, cy);
  });

  // ===================== TITLE & SELECT SCREENS =====================

  // VS character select — portrait panel + square inner grid (two columns).
  var SELECT_DIALOG_MARGIN = 28;
  /** 中间正方形内容区最大边长（竖直够不够高仍会限制实际边长） */
  var SELECT_INNER_SQUARE_MAX = 360;
  var SELECT_DLG_PAD_X = 8;
  var SELECT_TITLE_H = 38;
  var SELECT_TITLE_GAP = 6;
  /** 方框下缘 → 英雄描述（尽量贴紧方框） */
  var SELECT_GAP_AFTER_SQUARE = 4;
  var SELECT_INTRO_PAD_Y = 2;
  var SELECT_INTRO_LINE_H = 15;
  var SELECT_INTRO_MAX_LINES = 3;
  /** 英雄描述 → 武器说明区（两则技能上下排列） */
  var SELECT_HERO_SKILL_GAP = 5;
  var SELECT_SKILL_SECTION_PAD_Y = 4;
  var SELECT_SKILL_LOGO = 36;
  var SELECT_SKILL_GAP_LOGO_TEXT = 8;
  /** 技能标题基线相对 contentTop；正文首行基线 = 标题基线 + SELECT_SKILL_TITLE_BODY_GAP */
  var SELECT_SKILL_TITLE_BASELINE_OFF = 13;
  var SELECT_SKILL_TITLE_BODY_GAP = 14;
  var SELECT_SKILL_INTRO_LINE_H = 12;
  /** 每个武器说明最多行数（单栏整宽换行） */
  var SELECT_SKILL_INTRO_MAX_LINES = 3;
  /** 两个武器条目上下之间的间距 */
  var SELECT_SKILL_STACK_GAP = 6;
  /** 技能区 → 底部按钮区 */
  var SELECT_GAP_INTRO_DETAIL = 10;
  /** 底部条高度（仅容纳居中的 Confirm） */
  var SELECT_DETAIL_H = 52;
  /** 详情条左/右/下与对话框底边留白一致（同 SELECT_DLG_PAD_X） */
  var SELECT_DLG_PAD_BOTTOM = SELECT_DLG_PAD_X;
  var SELECT_GRID_COLS = 2;
  var SELECT_TILE_GAP = 12;
  var SELECT_GRID_TOP_PAD = 12;
  var SELECT_TILE_INNER_PAD = 12;

  function getSelectHeroIntroSlotHeight() {
    return SELECT_INTRO_PAD_Y * 2 + SELECT_INTRO_MAX_LINES * SELECT_INTRO_LINE_H;
  }

  function getSelectOneSkillRowHeight() {
    var textCol = SELECT_SKILL_TITLE_BASELINE_OFF + SELECT_SKILL_TITLE_BODY_GAP +
      SELECT_SKILL_INTRO_MAX_LINES * SELECT_SKILL_INTRO_LINE_H;
    return Math.max(SELECT_SKILL_LOGO, textCol);
  }

  function getSelectSkillsBlockHeight() {
    return SELECT_SKILL_SECTION_PAD_Y * 2 +
      2 * getSelectOneSkillRowHeight() +
      SELECT_SKILL_STACK_GAP;
  }

  function getSelectIntroBlockInnerHeight() {
    return getSelectHeroIntroSlotHeight() + SELECT_HERO_SKILL_GAP + getSelectSkillsBlockHeight();
  }

  function getSelectBelowSquareLead() {
    return SELECT_GAP_AFTER_SQUARE + getSelectIntroBlockInnerHeight() + SELECT_GAP_INTRO_DETAIL;
  }

  function getSelectDialogRect() {
    var margin = SELECT_DIALOG_MARGIN;
    var maxW = VIEW_W - margin * 2;
    var maxH = VIEW_H - margin * 2;
    var padX = SELECT_DLG_PAD_X;
    var titleBlock = SELECT_TITLE_H + SELECT_TITLE_GAP;
    var bottomBlock = getSelectBelowSquareLead() + SELECT_DETAIL_H + SELECT_DLG_PAD_BOTTOM;
    var innerS = Math.min(
      SELECT_INNER_SQUARE_MAX,
      maxH - titleBlock - bottomBlock,
      maxW - padX * 2
    );
    innerS = Math.max(200, Math.floor(innerS));
    if (innerS % 2) innerS -= 1;
    /** 仅由正方形决定的窄宽；高度吃紧时 innerS 会偏小 */
    var wForSquare = innerS + padX * 2;
    /** 面板目标宽度（intro/武器说明用满 dlg.w，可与偏矮的 innerS 解耦） */
    var wTarget = SELECT_INNER_SQUARE_MAX + padX * 2;
    var w = Math.min(maxW, Math.max(wForSquare, wTarget));
    var h = titleBlock + innerS + bottomBlock;
    return {
      x: Math.floor((VIEW_W - w) / 2),
      y: Math.floor((VIEW_H - h) / 2),
      w: w,
      h: h,
      innerS: innerS
    };
  }

  function getSelectContentSquare() {
    var dlg = getSelectDialogRect();
    var innerS = dlg.innerS;
    var x = dlg.x + Math.floor((dlg.w - innerS) / 2);
    var y = dlg.y + SELECT_TITLE_H + SELECT_TITLE_GAP;
    return { x: x, y: y, w: innerS, h: innerS };
  }

  function getSelectTileSize() {
    var sq = getSelectContentSquare();
    var innerPad = SELECT_TILE_INNER_PAD;
    var cols = SELECT_GRID_COLS;
    var rows = Math.ceil(HERO_ROSTER.length / cols);
    var usableW = sq.w - innerPad * 2;
    var usableH = sq.h - innerPad * 2;
    var tw = Math.floor((usableW - (cols - 1) * SELECT_TILE_GAP) / cols);
    var th = Math.floor((usableH - (rows - 1) * SELECT_TILE_GAP) / rows);
    var side = Math.min(tw, th);
    side = Math.max(80, Math.min(side, tw));
    return { w: side, h: side };
  }

  function getSelectTileRect(i) {
    var sq = getSelectContentSquare();
    var tile = getSelectTileSize();
    var cols = SELECT_GRID_COLS;
    var gridW = cols * tile.w + (cols - 1) * SELECT_TILE_GAP;
    var col = i % cols;
    var row = Math.floor(i / cols);
    var gridX = sq.x + Math.floor((sq.w - gridW) / 2);
    var gridY = sq.y + SELECT_GRID_TOP_PAD;
    return {
      x: gridX + col * (tile.w + SELECT_TILE_GAP),
      y: gridY + row * (tile.h + SELECT_TILE_GAP),
      w: tile.w,
      h: tile.h
    };
  }

  function getSelectConfirmRect() {
    var dlg = getSelectDialogRect();
    var sq = getSelectContentSquare();
    var cw = 88;
    var ch = 46;
    var bandTop = sq.y + sq.h + getSelectBelowSquareLead();
    return {
      x: Math.floor(dlg.x + (dlg.w - cw) / 2),
      y: Math.floor(bandTop + (SELECT_DETAIL_H - ch) / 2),
      w: cw,
      h: ch
    };
  }

  function getHeroAtPoint(px, py) {
    for (var i = 0; i < HERO_ROSTER.length; i++) {
      var r = getSelectTileRect(i);
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
    }
    return -1;
  }

  function getStartBtnRect() {
    return { x: VIEW_W / 2 - 80, y: VIEW_H / 2 + 60, w: 160, h: 44 };
  }

  function getPauseResumeRect() {
    return { x: VIEW_W / 2 - 82, y: VIEW_H / 2 + 4, w: 164, h: 38 };
  }

  function getPauseTitleRect() {
    return { x: VIEW_W / 2 - 82, y: VIEW_H / 2 + 52, w: 164, h: 34 };
  }

  function getGameOverRestartRect() {
    return { x: VIEW_W / 2 - 176, y: VIEW_H / 2 + 86, w: 160, h: 40 };
  }

  function getGameOverTitleRect() {
    return { x: VIEW_W / 2 + 16, y: VIEW_H / 2 + 86, w: 160, h: 40 };
  }

  function pointInRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  function handleClick(cx, cy) {
    ensureAudio();
    if (gameState === 'title') {
      if (!characterSelectOpen) {
        var btn = getStartBtnRect();
        if (pointInRect(cx, cy, btn)) {
          characterSelectOpen = true;
        }
      } else {
        var dlg = getSelectDialogRect();
        if (!pointInRect(cx, cy, dlg)) {
          characterSelectOpen = false;
          return;
        }
        var idx = getHeroAtPoint(cx, cy);
        if (idx !== -1) selectedHeroIndex = idx;
        var cbtn = getSelectConfirmRect();
        if (pointInRect(cx, cy, cbtn)) {
          startGame();
          characterSelectOpen = false;
        }
      }
    } else if (gameState === 'levelup') {
      var choiceIdx = getLevelUpChoiceAt(cx, cy);
      if (choiceIdx !== -1) applyLevelUpChoice(choiceIdx);
    } else if (gameState === 'paused') {
      if (pointInRect(cx, cy, getPauseResumeRect())) {
        gameState = 'playing';
      } else if (pointInRect(cx, cy, getPauseTitleRect())) {
        keys = {};
        characterSelectOpen = false;
        gameState = 'title';
      }
    } else if (gameState === 'gameover') {
      if (pointInRect(cx, cy, getGameOverRestartRect())) {
        startGame();
      } else if (pointInRect(cx, cy, getGameOverTitleRect())) {
        keys = {};
        characterSelectOpen = false;
        gameState = 'title';
      }
    }
  }

  function getLevelUpChoiceRect(i) {
    var totalW = LEVELUP_CARD_W * 3 + LEVELUP_CARD_GAP * 2;
    var startX = (VIEW_W - totalW) / 2;
    return {
      x: startX + i * (LEVELUP_CARD_W + LEVELUP_CARD_GAP),
      y: 188,
      w: LEVELUP_CARD_W,
      h: LEVELUP_CARD_H
    };
  }

  function getLevelUpChoiceAt(px, py) {
    for (var ui = 0; ui < levelUpChoices.length; ui++) {
      var ur = getLevelUpChoiceRect(ui);
      if (px >= ur.x && px <= ur.x + ur.w && py >= ur.y && py <= ur.y + ur.h) return ui;
    }
    return -1;
  }

  function startGame() {
    // Reset game state
    keys = {};
    hero.x = (MAP_W / 2) * TILE;
    hero.y = (MAP_H / 2) * TILE;
    hero.rosterIndex = selectedHeroIndex;
    resetPlayerUpgrades();
    applyHeroStats();
    hero.facingLeft = false;
    hero.moving = false;
    hero.walkTimer = 0;
    hero.bobOffset = 0;
    hero.invincibleTimer = 0;
    hero.spriteRow = 0;
    hero.animFrame = 0;
    hero.animTimer = 0;
    hero.dead = false;
    hero.deathAnimFrame = 0;
    hero.deathAnimTimer = 0;
    monsters = [];
    gems = [];
    gemCount = 0;
    spawnTimer = 0;
    waveCycle = 0;
    cycleStartTime = 0;
    bossSpawnFired = false;
    batWaveFired = false;
    skelWaveFired = false;
    batWaveSpawnQueue = 0;
    skelWaveSpawnQueue = 0;
    batWaveSpawnTimer = 0;
    skelWaveSpawnTimer = 0;
    swordAngle = 0;
    swordBlades = [];
    bibleAngle = 0;
    biblePhase = 'active';
    biblePhaseMs = 0;
    knives = [];
    knifeTimer = 0;
    holyWaterDrops = [];
    holyWaterBursts = [];
    holyWaterTimer = 0;
    bibleShockwaves = [];
    lastMoveDir = { x: 1, y: 0 };
    deathScreenTimer = 0;
    // Reset stats
    gameTime  = 0;
    killCount = 0;
    killWeaponMilestoneIdx = 0;
    pendingWeaponPicks = 0;
    levelUpPickKind = 'upgrade';
    weaponUnlockToasts = [];
    gold      = 0;
    level     = 1;
    exp       = 0;
    expToNext = calcExpToNext(1);
    initItemSlots();
    generateMap();
    centerCam();
    gameState = 'playing';
  }

  function initLabMonsters() {
    monsters = [];
    var cx = hero.x + TILE * 6;
    var cy = hero.y;
    var radius = 200;
    for (var ti = 0; ti < MONSTER_TYPES.length; ti++) {
      var ang = (ti / MONSTER_TYPES.length) * Math.PI * 2 - Math.PI / 2;
      var px = cx + Math.cos(ang) * radius;
      var py = cy + Math.sin(ang) * radius * 0.7;
      var opts = { labDummy: true, spawning: false, bossAnim: 'idle' };
      var m = createMonster(ti, px, py, opts);
      m.speed = 0;
      monsters.push(m);
    }
  }

  function applyLabUpgrade(id) {
    if (id === 'addSword') {
      playerUpgrades.swordCount = (playerUpgrades.swordCount || 0) + 1;
      syncItemSlotsFromUpgrades();
      return;
    }
    if (id === 'addKnife') {
      playerUpgrades.knifeCount = (playerUpgrades.knifeCount || 0) + 1;
      knifeTimer = 0;
      syncItemSlotsFromUpgrades();
      return;
    }
    if (id === 'addBible') {
      playerUpgrades.bibleCount = (playerUpgrades.bibleCount || 0) + 1;
      syncItemSlotsFromUpgrades();
      return;
    }
    if (id === 'addHolyWater') {
      playerUpgrades.holyWaterCount = (playerUpgrades.holyWaterCount || 0) + 1;
      holyWaterTimer = 0;
      syncItemSlotsFromUpgrades();
      return;
    }
    var def = UPGRADE_DEFS[id];
    if (!def) return;
    var picks = playerUpgrades.statPicks[id] || 0;
    var add = def.tiers[Math.min(picks, def.tiers.length - 1)];
    playerUpgrades.statPicks[id] = picks + 1;
    playerUpgrades[def.bonusKey] = (playerUpgrades[def.bonusKey] || 0) + add;
    applyUpgradeMultipliers();
    if (id === 'speed') refreshHeroMoveSpeed();
    syncItemSlotsFromUpgrades();
  }

  function labSyncWeaponsForHero() {
    if (isWarrior()) {
      if ((playerUpgrades.swordCount || 0) < 1) playerUpgrades.swordCount = 1;
      playerUpgrades.bibleCount = 0;
      playerUpgrades.holyWaterCount = 0;
    } else if (isWizard()) {
      if ((playerUpgrades.bibleCount || 0) < 1) playerUpgrades.bibleCount = 1;
      playerUpgrades.swordCount = 0;
      playerUpgrades.knifeCount = 0;
    }
    syncItemSlotsFromUpgrades();
  }

  function applyExclusiveBuffById(id) {
    resetExclusiveBuffState();
    if (!id) return;
    var choices = generateExclusiveBuffChoices();
    for (var ci = 0; ci < choices.length; ci++) {
      if (choices[ci].id === id) {
        choices[ci].apply();
        if (id === 'yujian') swordBlades = [];
        triggerLabExclusiveOnSelect(id);
        return;
      }
    }
  }

  function getExclusiveBuffCatalog() {
    return generateExclusiveBuffChoices().map(function (c) {
      return { id: c.id, name: c.name, desc: c.desc };
    });
  }

  function getExclusiveBuffLabel(id) {
    if (!id) return '无';
    var names = {
      yujian: '御剑', shengdun: '圣盾', zhanhou: '战吼',
      shengguan: '圣歌', shengyu: '圣域', chongsheng: '重生'
    };
    return names[id] || id;
  }

  function labSwitchHero(index) {
    if (index < 0 || index >= HERO_ROSTER.length) return;
    selectedHeroIndex = index;
    hero.rosterIndex = index;
    resetExclusiveBuffState();
    swordBlades = [];
    applyHeroStats();
    labSyncWeaponsForHero();
    hero.dead = false;
    hero.invincibleTimer = 0;
    gameState = 'playing';
    levelUpQueue = [];
    levelUpChoices = [];
  }

  function getLabSnapshot() {
    var entry = getHeroRosterEntry();
    return {
      heroName: entry.name,
      heroKey: entry.key,
      hp: hero.hp,
      maxHp: hero.maxHp,
      speed: hero.speed,
      speedBonus: playerUpgrades.speedBonus || 0,
      speedMult: playerUpgrades.speedMult || 1,
      damageBonus: playerUpgrades.damageBonus || 0,
      damageMult: getDamageMult(),
      swordSizeBonus: playerUpgrades.swordSizeBonus || 0,
      swordSizeMult: playerUpgrades.swordSizeMult || 1,
      castSpeedBonus: playerUpgrades.castSpeedBonus || 0,
      knifeCastSpeedBonus: playerUpgrades.knifeCastSpeedBonus || 0,
      bibleCastSpeedBonus: playerUpgrades.bibleCastSpeedBonus || 0,
      holyWaterCastSpeedBonus: playerUpgrades.holyWaterCastSpeedBonus || 0,
      globalCastSpeedBonus: playerUpgrades.globalCastSpeedBonus || 0,
      swordCount: getSwordCount(),
      knifeCount: getKnifeCount(),
      bibleCount: getBibleCount(),
      holyWaterCount: getHolyWaterCount(),
      swordDamage: heroHasGreatsword() ? getSwordDamage() : null,
      knifeDamage: heroHasKnife() ? getKnifeDamage() : null,
      bibleDamage: heroHasBible() ? getBibleDamage() : null,
      holyWaterDamage: heroHasHolyWater() ? getHolyWaterDamage() : null,
      knifeCooldown: heroHasKnife() ? getKnifeCooldown() : null,
      swordCastMult: getSwordCastSpeedMult(),
      knifeCastMult: getKnifeCastSpeedMult(),
      bibleCastMult: getBibleCastSpeedMult(),
      holyWaterCastMult: getHolyWaterCastSpeedMult(),
      exclusiveBuff: heroExclusiveBuff,
      exclusiveBuffName: getExclusiveBuffLabel(heroExclusiveBuff)
    };
  }

  function startLabGame() {
    keys = {};
    selectedHeroIndex = selectedHeroIndex || 0;
    hero.x = (MAP_W / 2) * TILE;
    hero.y = (MAP_H / 2) * TILE;
    hero.rosterIndex = selectedHeroIndex;
    resetPlayerUpgrades();
    applyHeroStats();
    hero.facingLeft = false;
    hero.moving = false;
    hero.walkTimer = 0;
    hero.bobOffset = 0;
    hero.invincibleTimer = 0;
    hero.spriteRow = 0;
    hero.animFrame = 0;
    hero.animTimer = 0;
    hero.dead = false;
    hero.deathAnimFrame = 0;
    hero.deathAnimTimer = 0;
    gems = [];
    gemCount = 0;
    spawnTimer = 0;
    labRespawnQueue = [];
    swordAngle = 0;
    swordBlades = [];
    bibleAngle = 0;
    biblePhase = 'active';
    biblePhaseMs = 0;
    knives = [];
    knifeTimer = 0;
    holyWaterDrops = [];
    holyWaterBursts = [];
    holyWaterTimer = 0;
    bibleShockwaves = [];
    lastMoveDir = { x: 1, y: 0 };
    levelUpQueue = [];
    levelUpChoices = [];
    gameTime = 0;
    killCount = 0;
    level = 1;
    exp = 0;
    expToNext = calcExpToNext(1);
    initItemSlots();
    generateMap();
    initLabMonsters();
    centerCam();
    gameState = 'playing';
  }

  // Particle stars for title bg
  var stars = [];
  for (var _s = 0; _s < 80; _s++) {
    stars.push({ x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, r: Math.random() * 1.5 + 0.3, speed: Math.random() * 0.2 + 0.05 });
  }

  function drawTitleScreen(ts) {
    // Scrolling star background
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#ffffff';
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      st.y += st.speed;
      if (st.y > VIEW_H) { st.y = 0; st.x = Math.random() * VIEW_W; }
      ctx.globalAlpha = 0.5 + Math.sin(ts * 0.002 + i) * 0.3;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Title glow
    var grd = ctx.createRadialGradient(VIEW_W / 2, 200, 10, VIEW_W / 2, 200, 180);
    grd.addColorStop(0, 'rgba(120,60,200,0.35)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 80, VIEW_W, 260);

    // Title text
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px Courier New';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText('ETERNAL', VIEW_W / 2 + 2, 172);
    ctx.fillText('NIGHT',   VIEW_W / 2 + 2, 232);
    var pulse = 0.85 + Math.sin(ts * 0.003) * 0.15;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#cc88ff';
    ctx.fillText('ETERNAL', VIEW_W / 2, 170);
    ctx.fillStyle = '#8844cc';
    ctx.fillText('NIGHT',   VIEW_W / 2, 230);
    ctx.globalAlpha = 1;

    // Subtitle
    ctx.font = '13px Courier New';
    ctx.fillStyle = '#8888aa';
    ctx.fillText('在永恒的黑夜中生存', VIEW_W / 2, 262);

    // Start button
    var btn = getStartBtnRect();
    var btnHover = !characterSelectOpen &&
      mouse.x >= btn.x && mouse.x <= btn.x + btn.w && mouse.y >= btn.y && mouse.y <= btn.y + btn.h;
    ctx.fillStyle = btnHover ? 'rgba(160,80,255,0.9)' : 'rgba(100,40,180,0.8)';
    roundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();
    ctx.strokeStyle = btnHover ? '#dd99ff' : '#8844cc';
    ctx.lineWidth = 2;
    roundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Courier New';
    ctx.fillText('开始游戏', VIEW_W / 2, btn.y + 28);

    // Version hint
    ctx.font = '10px Courier New';
    ctx.fillStyle = '#444466';
    ctx.fillText('WASD 移动  ·  技能自动释放', VIEW_W / 2, VIEW_H - 20);
  }

  function drawGoldBorder(x, y, w, h, thick) {
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = thick || 3;
    ctx.strokeRect(x + thick / 2, y + thick / 2, w - thick, h - thick);
  }

  function drawSelectPanel(x, y, w, h, fill, border, thick) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = border || '#c9a227';
    ctx.lineWidth = thick || 2;
    ctx.strokeRect(x + (thick || 2) / 2, y + (thick || 2) / 2, w - (thick || 2), h - (thick || 2));
  }

  /** Rounded panel: fill; optional border (radius = HUD_EXP_CORNER_R). borderColor falsy = no stroke. */
  function drawVsPanel(x, y, w, h, fill, borderColor) {
    var r = HUD_EXP_CORNER_R;
    ctx.fillStyle = fill;
    roundRect(x, y, w, h, r);
    ctx.fill();
    if (borderColor) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r);
      ctx.stroke();
    }
  }

  function drawGoldCornerBrackets(x, y, w, h) {
    var len = 22;
    var t = 4;
    ctx.strokeStyle = '#e8c86a';
    ctx.lineWidth = t;
    ctx.lineCap = 'square';
    // top-left
    ctx.beginPath();
    ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
    ctx.stroke();
    // top-right
    ctx.beginPath();
    ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
    ctx.stroke();
    // bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + h - len); ctx.lineTo(x, y + h); ctx.lineTo(x + len, y + h);
    ctx.stroke();
    // bottom-right
    ctx.beginPath();
    ctx.moveTo(x + w - len, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len);
    ctx.stroke();
  }

  function drawHeroStatic(h, cx, footY, scale, animFrame) {
    var idleImg = assets[h.key + '_idle'];
    var dh = h.displayH * scale;
    var dw = Math.round(dh * h.bodyW / h.bodyH);
    var px = cx - dw / 2;
    var py = footY - dh;
    var frame = animFrame != null ? animFrame : 0;
    var srcX = frame * h.frameW + h.bodyX;
    ctx.imageSmoothingEnabled = false;
    if (isImgOk(idleImg)) {
      ctx.drawImage(idleImg,
        srcX, h.bodyY,
        h.bodyW, h.bodyH,
        px, py, dw, dh);
    } else {
      ctx.fillStyle = h.color;
      ctx.fillRect(px, py, dw, dh);
    }
    return { dw: dw, dh: dh };
  }

  function drawSelectWeaponIcon(h, x, y, boxSize) {
    if (!h.startWeapon || h.startWeapon === 'none') return;
    var imgKey = 'knife1';
    if (h.startWeapon === 'greatsword') imgKey = 'knife1';
    else if (h.startWeapon === 'knife') imgKey = 'knife2';
    else if (h.startWeapon === 'bible') imgKey = 'holybook';
    drawWeaponIconByKey(imgKey, x, y, boxSize);
  }

  function drawSelectWeaponBox(h, x, y, boxSize) {
    if (!h.startWeapon || h.startWeapon === 'none') {
      drawVsPanel(x, y, boxSize, boxSize, '#19121e', '#c9a227');
      ctx.font = '11px Courier New';
      ctx.fillStyle = '#dedede';
      ctx.textAlign = 'center';
      ctx.fillText('—', x + boxSize / 2, y + boxSize / 2 + 4);
      return;
    }
    drawVsPanel(x, y, boxSize, boxSize, '#19121e', '#c9a227');
    drawSelectWeaponIcon(h, x + 5, y + 5, boxSize - 10);
  }

  function wrapSelectText(text, maxWidth) {
    var words = text.split('');
    var lines = [];
    var line = '';
    for (var wi = 0; wi < words.length; wi++) {
      var test = line + words[wi];
      if (ctx.measureText(test).width > maxWidth && line.length > 0) {
        lines.push(line);
        line = words[wi];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  /** 两个武器上下排列；说明为单栏整宽换行（可顺序阅读） */
  function drawSelectHeroSkillsBlock(sel, introX, introW, skillsTopY) {
    var list = SELECT_HERO_SKILLS[sel.key];
    if (!list || list.length < 2) return;
    var logo = SELECT_SKILL_LOGO;
    var contentTop = skillsTopY + SELECT_SKILL_SECTION_PAD_Y;
    var rowH = getSelectOneSkillRowHeight();
    var y = contentTop;
    for (var si = 0; si < 2; si++) {
      var sk = list[si];
      drawVsPanel(introX, y, logo, logo, '#19121e', '#c9a227');
      drawWeaponIconByKey(sk.logoKey, introX + 4, y + 4, logo - 8);
      var tx = introX + logo + SELECT_SKILL_GAP_LOGO_TEXT;
      var tw = Math.max(40, introW - logo - SELECT_SKILL_GAP_LOGO_TEXT);
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Courier New';
      var titleY = y + SELECT_SKILL_TITLE_BASELINE_OFF;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillText(sk.title, tx + 1, titleY + 1);
      ctx.fillStyle = '#e8c86a';
      ctx.fillText(sk.title, tx, titleY);
      ctx.font = '11px Courier New';
      var wLines = wrapSelectText(sk.intro, tw);
      var wLim = Math.min(wLines.length, SELECT_SKILL_INTRO_MAX_LINES);
      var line0Y = titleY + SELECT_SKILL_TITLE_BODY_GAP;
      for (var wi = 0; wi < wLim; wi++) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillText(wLines[wi], tx + 1, line0Y + wi * SELECT_SKILL_INTRO_LINE_H + 1);
        ctx.fillStyle = '#d0d4e8';
        ctx.fillText(wLines[wi], tx, line0Y + wi * SELECT_SKILL_INTRO_LINE_H);
      }
      y += rowH + (si < 1 ? SELECT_SKILL_STACK_GAP : 0);
    }
  }

  function drawCharacterSelectDialog() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    var dlg = getSelectDialogRect();
    drawVsPanel(dlg.x, dlg.y, dlg.w, dlg.h, '#555675', '#d4a032');

    ctx.textAlign = 'center';
    ctx.font = 'bold 20px Courier New';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillText('Character Selection', dlg.x + dlg.w / 2 + 2, dlg.y + 28);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Character Selection', dlg.x + dlg.w / 2, dlg.y + 26);

    for (var ti = 0; ti < HERO_ROSTER.length; ti++) {
      var th = HERO_ROSTER[ti];
      var tr = getSelectTileRect(ti);
      var tSel = ti === selectedHeroIndex;
      var tHov = ti === hoveredHeroIndex;

      drawVsPanel(tr.x, tr.y, tr.w, tr.h,
        tHov && !tSel ? '#a0a09b' : '#8f908c',
        tSel ? '#f2cd5a' : '#b98528');

      var iconSz = Math.max(22, Math.min(32, Math.round(tr.h * 0.28)));
      var iconPad = Math.max(4, Math.round(tr.w * 0.06));

      ctx.textAlign = 'left';
      ctx.font = 'bold 15px Courier New';
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.fillText(th.name, tr.x + iconPad + 1, tr.y + 21);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(th.name, tr.x + iconPad, tr.y + 20);

      drawHeroStatic(th, tr.x + tr.w * 0.36, tr.y + tr.h - 12, 2.25, 0);
      if (th.startWeapon && th.startWeapon !== 'none') {
        var bx = tr.x + tr.w - iconPad - iconSz;
        var by = tr.y + tr.h - iconPad - iconSz;
        drawSelectWeaponIcon(th, bx, by, iconSz);
      }
    }

    // 英雄描述（贴方框下缘）+ 下方两个武器条目上下排列（单栏说明 + HUD 图标）
    var sqIntro = getSelectContentSquare();
    var selIntro = HERO_ROSTER[selectedHeroIndex];
    var introStr = selIntro.intro || selIntro.desc || '';
    var introX = dlg.x + SELECT_DLG_PAD_X + 2;
    var introW = dlg.w - SELECT_DLG_PAD_X * 2 - 4;
    var heroBlockTop = sqIntro.y + sqIntro.h + SELECT_GAP_AFTER_SQUARE;
    var introBaseY = heroBlockTop + SELECT_INTRO_PAD_Y;
    ctx.textAlign = 'left';
    ctx.font = '13px Courier New';
    var introLines = wrapSelectText(introStr, introW);
    var liMax = Math.min(introLines.length, SELECT_INTRO_MAX_LINES);
    for (var li = 0; li < liMax; li++) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillText(introLines[li], introX + 1, introBaseY + li * SELECT_INTRO_LINE_H + 1);
      ctx.fillStyle = '#e8e8f0';
      ctx.fillText(introLines[li], introX, introBaseY + li * SELECT_INTRO_LINE_H);
    }

    var skillsTopY = heroBlockTop + getSelectHeroIntroSlotHeight() + SELECT_HERO_SKILL_GAP;
    drawSelectHeroSkillsBlock(selIntro, introX, introW, skillsTopY);
    var cbtn = getSelectConfirmRect();
    var cbtnHover = mouse.x >= cbtn.x && mouse.x <= cbtn.x + cbtn.w &&
      mouse.y >= cbtn.y && mouse.y <= cbtn.y + cbtn.h;
    drawVsPanel(cbtn.x, cbtn.y, cbtn.w, cbtn.h,
      cbtnHover ? '#54c86c' : '#45b95c', '#d4a032');
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Courier New';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillText('Confirm', cbtn.x + cbtn.w / 2 + 1, cbtn.y + 29);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Confirm', cbtn.x + cbtn.w / 2, cbtn.y + 28);
  }

  // Helper: rounded rect path
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ===================== SKILL — FIREBALL =====================
  // (removed — sword orbit weapon handles all damage)

  // ===================== SWORD ORBIT WEAPON =====================
  // Sword sprite: 2×2 tiles from File.png at (col10,row2) = srcX=160, srcY=32, 32×32
  var SWORD_SRC_X   = 160;
  var SWORD_SRC_Y   = 32;
  var SWORD_SRC_W   = 32;
  var SWORD_SRC_H   = 32;
  var SWORD_DISP    = 32;        // display size on screen (px)
  var SWORD_ORBIT_R = 48;        // orbit radius in screen pixels
  var SWORD_RPM     = 32;        // rotations per minute
  var SWORD_LUNGE_INTERVAL_MS = 6000;
  var SWORD_LUNGE_SPEED = 3;     // world units per frame @ 60fps
  var SWORD_LUNGE_ARRIVE = 10;   // world units — reach target / home
  var swordAngle = 0;
  var swordBlades = [];          // per-blade lunge: orbit | strike | return

  function getSwordHitRadius() {
    return getGreatswordDisp() / SCALE / 2;
  }

  function getBibleHitRadius() {
    return getBibleDisp() / SCALE / 2;
  }

  function getWeaponOrbitCenter() {
    var entry = HERO_ROSTER[hero.rosterIndex];
    var heroBodyH = entry.displayH * SCALE;
    var centerOffsetY = -(heroBodyH / 2) / SCALE;
    return {
      cx: hero.x + TILE / 2,
      cy: hero.y + TILE / 2 + centerOffsetY,
      centerOffsetY: centerOffsetY
    };
  }

  function getSwordHomeWorldPos(si, swordN, center, orbitR) {
    var bladeAngle = swordAngle + (si / swordN) * Math.PI * 2;
    return {
      x: center.cx + Math.cos(bladeAngle) * orbitR,
      y: center.cy + Math.sin(bladeAngle) * orbitR,
      angle: bladeAngle
    };
  }

  function ensureSwordBlades(swordN) {
    while (swordBlades.length < swordN) {
      swordBlades.push({
        phase: 'orbit',
        timer: Math.random() * SWORD_LUNGE_INTERVAL_MS,
        x: 0,
        y: 0,
        strikeX: 0,
        strikeY: 0,
        inRange: {}
      });
    }
    while (swordBlades.length > swordN) swordBlades.pop();
  }

  function findNearestMonsterTo(wx, wy) {
    var bestIdx = -1;
    var bestD2 = Infinity;
    for (var mi = 0; mi < monsters.length; mi++) {
      var m = monsters[mi];
      if (m.hp <= 0) continue;
      var mx = m.x + TILE / 2;
      var my = m.y + TILE / 2;
      var dx = mx - wx;
      var dy = my - wy;
      var d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestIdx = mi;
      }
    }
    return bestIdx;
  }

  function clearSwordBladeInRange(blade) {
    blade.inRange = {};
  }

  function moveSwordToward(blade, tx, ty, step) {
    var dx = tx - blade.x;
    var dy = ty - blade.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= SWORD_LUNGE_ARRIVE || dist < 0.01) {
      blade.x = tx;
      blade.y = ty;
      return true;
    }
    var move = Math.min(step, dist);
    blade.x += (dx / dist) * move;
    blade.y += (dy / dist) * move;
    return dist - move <= SWORD_LUNGE_ARRIVE;
  }

  function swordLungeHitMonsters(blade) {
    var hitR = getSwordHitRadius();
    for (var j = monsters.length - 1; j >= 0; j--) {
      var mon = monsters[j];
      if (mon.hp <= 0) continue;
      var mType = MONSTER_TYPES[mon.type] || MONSTER_TYPES[0];
      var touching = worldPointHitsMonster(blade.x, blade.y, mon, mType, hitR);
      var wasIn = !!blade.inRange[j];
      if (touching && !wasIn) {
        damageMonster(mon, getSwordDamage());
        applyMonsterHitKnockback(mon);
        if (mon.hp <= 0) {
          removeDeadMonster(j);
        }
        blade.inRange[j] = true;
      } else if (!touching) {
        blade.inRange[j] = false;
      }
    }
  }

  function updateSword(dt) {
    var swordN = getSwordCount();
    if (swordN <= 0) return;
    swordAngle += (getSwordRpm() / 60) * (2 * Math.PI) * (dt / 1000);

    var orbitR = getGreatswordOrbit() / SCALE;
    var center = getWeaponOrbitCenter();
    var dtS = dt / 16.67;
    var lungeStep = SWORD_LUNGE_SPEED * dtS;

    ensureSwordBlades(swordN);

    for (var hi = 0; hi < monsters.length; hi++) {
      monsters[hi].swordTouch = false;
    }

    for (var si = 0; si < swordN; si++) {
      var blade = swordBlades[si];
      var home = getSwordHomeWorldPos(si, swordN, center, orbitR);

      if (!hasYujianLunge() && blade.phase !== 'orbit') {
        blade.phase = 'orbit';
        clearSwordBladeInRange(blade);
      }

      if (blade.phase === 'orbit') {
        blade.x = home.x;
        blade.y = home.y;
        if (hasYujianLunge()) {
          blade.timer -= dt;
          if (blade.timer <= 0) {
            var tgtIdx = findNearestMonsterTo(home.x, home.y);
            if (tgtIdx >= 0) {
              var tgtM = monsters[tgtIdx];
              blade.phase = 'strike';
              blade.strikeX = tgtM.x + TILE / 2;
              blade.strikeY = tgtM.y + TILE / 2;
              clearSwordBladeInRange(blade);
            } else {
              blade.timer = SWORD_LUNGE_INTERVAL_MS;
            }
          }
        }

        for (var oi = 0; oi < monsters.length; oi++) {
          var om = monsters[oi];
          if (om.hp <= 0) continue;
          var omType = MONSTER_TYPES[om.type] || MONSTER_TYPES[0];
          if (worldPointHitsMonster(home.x, home.y, om, omType, getSwordHitRadius())) {
            om.swordTouch = true;
          }
        }
      } else if (hasYujianLunge() && blade.phase === 'strike') {
        if (moveSwordToward(blade, blade.strikeX, blade.strikeY, lungeStep)) {
          blade.phase = 'return';
          clearSwordBladeInRange(blade);
        }
        swordLungeHitMonsters(blade);
      } else if (hasYujianLunge() && blade.phase === 'return') {
        if (moveSwordToward(blade, home.x, home.y, lungeStep)) {
          blade.phase = 'orbit';
          blade.timer = SWORD_LUNGE_INTERVAL_MS;
          clearSwordBladeInRange(blade);
        }
        swordLungeHitMonsters(blade);
      }
    }

    for (var j = monsters.length - 1; j >= 0; j--) {
      var mon = monsters[j];
      if (mon.hp <= 0) continue;
      if (mon.swordTouch) {
        if (!mon.swordInRange) {
          damageMonster(mon, getSwordDamage());
          applyMonsterHitKnockback(mon);
          if (mon.hp <= 0) {
            removeDeadMonster(j);
          }
        }
        mon.swordInRange = true;
      } else {
        mon.swordInRange = false;
      }
    }
  }

  function drawSword() {
    var swordN = getSwordCount();
    if (swordN <= 0) return;
    var img = assets.weapon;
    if (!isImgOk(img)) return;
    var disp = getGreatswordDisp();
    var drawSize = Math.max(16, disp);
    var orbitR = getGreatswordOrbit() / SCALE;
    var center = getWeaponOrbitCenter();

    ensureSwordBlades(swordN);
    ctx.imageSmoothingEnabled = false;

    for (var si = 0; si < swordN; si++) {
      var blade = swordBlades[si];
      var home = getSwordHomeWorldPos(si, swordN, center, orbitR);
      var wx = blade.phase === 'orbit' ? home.x : blade.x;
      var wy = blade.phase === 'orbit' ? home.y : blade.y;
      var drawAngle = home.angle;
      if (blade.phase !== 'orbit') {
        drawAngle = Math.atan2(wy - home.y, wx - home.x);
      }

      var sx = Math.floor(wx * SCALE - cam.x - drawSize / 2);
      var sy = Math.floor(wy * SCALE - cam.y - drawSize / 2);
      ctx.save();
      ctx.translate(sx + drawSize / 2, sy + drawSize / 2);
      ctx.rotate(drawAngle + Math.PI - Math.PI / 4);
      ctx.drawImage(img, 0, 0, 32, 32, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.restore();
    }
  }

  // Active skill effect removed — sword handles all damage

  // ===================== BIBLE ORBIT (wizard — VS King Bible) =====================
  // VS: clockwise orbit, upright sprites, 3s active + 3s cooldown, 1.7s hit delay per book
  var bibleAngle = 0;
  var biblePhase = 'active';
  var biblePhaseMs = 0;
  var BIBLE_SHOCKWAVE_RADIUS = 30;           // world units
  var BIBLE_SHOCKWAVE_KNOCKBACK = 40 / SCALE; // screen px → world (侧移距离)
  var BIBLE_SHOCKWAVE_VIS_MS = 480;
  var bibleShockwaves = [];                  // [{ x, y, life, maxLife }]

  function applyBibleShockwaveKnockback(m) {
    if (isMonsterBoss(m) && !LAB_MODE) return;
    var dir = pickMonsterKnockbackDir(m);
    m.knockbackDx = dir.dx;
    m.knockbackDy = dir.dy;
    m.knockbackRemain = BIBLE_SHOCKWAVE_KNOCKBACK;
  }

  function triggerBibleShockwaveAt(wx, wy) {
    var dmg = getBibleDamage();
    for (var j = monsters.length - 1; j >= 0; j--) {
      var mon = monsters[j];
      if (mon.hp <= 0) continue;
      var monType = MONSTER_TYPES[mon.type] || MONSTER_TYPES[0];
      if (!circleHitsMonster(wx, wy, BIBLE_SHOCKWAVE_RADIUS, mon, monType)) continue;
      damageMonster(mon, dmg);
      applyBibleShockwaveKnockback(mon);
      if (mon.hp <= 0) {
        removeDeadMonster(j);
      }
    }
    bibleShockwaves.push({
      x: wx,
      y: wy,
      life: BIBLE_SHOCKWAVE_VIS_MS,
      maxLife: BIBLE_SHOCKWAVE_VIS_MS
    });
  }

  function updateBibleShockwaves(dt) {
    for (var si = bibleShockwaves.length - 1; si >= 0; si--) {
      bibleShockwaves[si].life -= dt;
      if (bibleShockwaves[si].life <= 0) bibleShockwaves.splice(si, 1);
    }
  }

  function drawBibleShockwaves() {
    if (!bibleShockwaves.length) return;
    ctx.save();
    for (var vi = 0; vi < bibleShockwaves.length; vi++) {
      var sw = bibleShockwaves[vi];
      var prog = 1 - sw.life / sw.maxLife;
      var alpha = 1 - prog;
      var r = BIBLE_SHOCKWAVE_RADIUS * SCALE * (0.25 + 0.75 * prog);
      var sx = sw.x * SCALE - cam.x;
      var sy = sw.y * SCALE - cam.y;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(64, 150, 255, ' + (0.22 * alpha) + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(100, 190, 255, ' + (0.9 * alpha) + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.72, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(180, 220, 255, ' + (0.45 * alpha) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  function getBibleBookAngle(bi, bibleN) {
    return bibleAngle + (bi / bibleN) * Math.PI * 2;
  }

  function getBibleBookWorldPos(bi, bibleN, center, orbitR) {
    var a = getBibleBookAngle(bi, bibleN);
    return {
      x: center.cx + Math.cos(a) * orbitR,
      y: center.cy + Math.sin(a) * orbitR
    };
  }

  function clearMonsterBibleInRange() {
    for (var ci = 0; ci < monsters.length; ci++) {
      monsters[ci].bibleInRange = null;
    }
  }

  function updateBible(dt) {
    var bibleN = getBibleCount();
    if (bibleN <= 0) return;

    biblePhaseMs += dt;
    if (biblePhase === 'cooldown') {
      if (biblePhaseMs >= getBibleCooldown()) {
        biblePhase = 'active';
        biblePhaseMs = 0;
        clearMonsterBibleInRange();
      }
      return;
    }

    // Clockwise on screen (y-down canvas): angle increases
    bibleAngle += (getBibleRpm() / 60) * (2 * Math.PI) * (dt / 1000);

    var orbitR = getBibleOrbit() / SCALE;
    var center = getWeaponOrbitCenter();
    // Per-book enter/exit contact (like greatsword) — one hit each time a book
    // sweeps into the monster. Pure time-based delay blocked 2nd revolution (~1.5s)
    // while hitDelay is 1.7s, causing random missed hits on lap 2.
    for (var bi = 0; bi < bibleN; bi++) {
      var pos = getBibleBookWorldPos(bi, bibleN, center, orbitR);

      for (var j = monsters.length - 1; j >= 0; j--) {
        var mon = monsters[j];
        if (mon.hp <= 0) continue;
        if (!mon.bibleInRange) mon.bibleInRange = {};

        var monTypeB = MONSTER_TYPES[mon.type] || MONSTER_TYPES[0];
        var inRange = worldPointHitsMonster(pos.x, pos.y, mon, monTypeB, getBibleHitRadius());

        if (inRange) {
          if (!mon.bibleInRange[bi]) {
            damageMonster(mon, getBibleDamage());
            applyMonsterHitKnockback(mon);
            if (mon.hp <= 0) {
              removeDeadMonster(j);
            } else {
              mon.bibleInRange[bi] = true;
            }
          }
        } else {
          mon.bibleInRange[bi] = false;
        }
      }
    }

    if (biblePhaseMs >= getBibleDuration()) {
      if (hasShengguanShockwave()) {
        for (var swi = 0; swi < bibleN; swi++) {
          var swPos = getBibleBookWorldPos(swi, bibleN, center, orbitR);
          triggerBibleShockwaveAt(swPos.x, swPos.y);
        }
      }
      biblePhase = 'cooldown';
      biblePhaseMs = 0;
      clearMonsterBibleInRange();
    }
  }

  function drawBible() {
    if (!isBibleActive()) return;
    var bibleN = getBibleCount();
    if (bibleN <= 0) return;
    var img = assets.holybook;
    if (!isImgOk(img)) return;

    var disp = getBibleDisp();
    var dw = Math.max(1, Math.round(disp * HOLYBOOK_SRC_W / HOLYBOOK_SRC_H));
    var dh = disp;
    var orbit = getBibleOrbit();
    var center = getWeaponOrbitCenter();
    var screenCX = center.cx * SCALE - cam.x;
    var screenCY = center.cy * SCALE - cam.y;

    ctx.imageSmoothingEnabled = false;
    for (var bi = 0; bi < bibleN; bi++) {
      var bookAngle = getBibleBookAngle(bi, bibleN);
      var sx = Math.floor(screenCX + Math.cos(bookAngle) * orbit - dw / 2);
      var sy = Math.floor(screenCY + Math.sin(bookAngle) * orbit - dh / 2);
      // VS: books stay upright while orbiting (no tangential spin)
      ctx.drawImage(img, 0, 0, HOLYBOOK_SRC_W, HOLYBOOK_SRC_H, sx, sy, dw, dh);
    }
  }

  // ===================== HOLY WATER (wizard) =====================
  var HOLY_WATER_SRC_W = 21;
  var HOLY_WATER_SRC_H = 28;
  // assets/weapon/spritesheet.png — 896×64, 14× 64×64 爆炸帧（横向）
  var HOLY_WATER_BURST_FRAME_W = 64;
  var HOLY_WATER_BURST_FRAME_H = 64;
  var HOLY_WATER_BURST_FRAMES = (function () {
    var frames = [];
    for (var fi = 0; fi < 14; fi++) {
      frames.push({ x: fi * HOLY_WATER_BURST_FRAME_W, y: 0, w: HOLY_WATER_BURST_FRAME_W, h: HOLY_WATER_BURST_FRAME_H });
    }
    return frames;
  })();
  var HOLY_WATER_BURST_FRAME_MS = 65;
  var holyWaterDrops = [];
  var holyWaterBursts = [];
  var holyWaterTimer = 0;

  function estimateHolyWaterFallHeight() {
    return 240;
  }

  function estimateHolyWaterFallFrames(fallHeight) {
    var fallSpd = getHolyWaterFallSpeed();
    return Math.max(8, fallHeight / Math.max(0.5, fallSpd));
  }

  function predictMonsterAtHolyWaterImpact(m, fallHeight) {
    var fallFrames = estimateHolyWaterFallFrames(fallHeight);
    var toHeroX = hero.x - m.x;
    var toHeroY = hero.y - m.y;
    var dist = Math.sqrt(toHeroX * toHeroX + toHeroY * toHeroY);
    if (dist < 0.01) return { x: m.x, y: m.y };
    var mType = MONSTER_TYPES[m.type] || MONSTER_TYPES[0];
    var spd = m.speed * GAME_MOVE_SPEED_MULT;
    var lead = fallFrames * spd * 0.92;
    return {
      x: m.x + (toHeroX / dist) * lead,
      y: m.y + (toHeroY / dist) * lead
    };
  }

  function pickHolyWaterGroundTarget(usedLockIdx) {
    usedLockIdx = usedLockIdx || {};
    var range = 300;
    var bestIdx = -1;
    var bestDist = Infinity;
    for (var i = 0; i < monsters.length; i++) {
      if (usedLockIdx[i]) continue;
      var m = monsters[i];
      if (m.hp <= 0) continue;
      var mType = MONSTER_TYPES[m.type] || MONSTER_TYPES[0];
      if (mType.spawnedOnly && m.spawning) continue;
      var dx = m.x - hero.x;
      var dy = m.y - hero.y;
      var d2 = dx * dx + dy * dy;
      if (d2 > range * range) continue;
      if (d2 < bestDist) {
        bestDist = d2;
        bestIdx = i;
      }
    }
    var fallHeight = estimateHolyWaterFallHeight();
    if (bestIdx >= 0) {
      var pred = predictMonsterAtHolyWaterImpact(monsters[bestIdx], fallHeight);
      return { x: pred.x, y: pred.y, lockIdx: bestIdx, fallHeight: fallHeight };
    }
    var ang = Math.random() * Math.PI * 2;
    var dist = 40 + Math.random() * 90;
    return {
      x: hero.x + Math.cos(ang) * dist,
      y: hero.y + Math.sin(ang) * dist,
      lockIdx: -1,
      fallHeight: fallHeight
    };
  }

  function spawnHolyWaterDrop(staggerMs, usedLockIdx) {
    var tgt = pickHolyWaterGroundTarget(usedLockIdx);
    tgt.x = Math.max(TILE, Math.min(tgt.x, MAP_W * TILE - TILE));
    tgt.y = Math.max(TILE, Math.min(tgt.y, MAP_H * TILE - TILE));
    if (tgt.lockIdx >= 0) usedLockIdx[tgt.lockIdx] = true;
    var fallHeight = tgt.fallHeight || estimateHolyWaterFallHeight();
    holyWaterDrops.push({
      x: tgt.x,
      y: tgt.y - fallHeight,
      groundY: tgt.y,
      fallHeight: fallHeight,
      lockIdx: tgt.lockIdx,
      spin: Math.random() * Math.PI * 2,
      delayMs: staggerMs || 0
    });
  }

  function spawnHolyWaterBurst(wx, wy, lockIdx) {
    if (lockIdx != null && lockIdx >= 0 && monsters[lockIdx] && monsters[lockIdx].hp > 0) {
      var lm = monsters[lockIdx];
      var snapDx = lm.x - wx;
      var snapDy = lm.y - wy;
      if (snapDx * snapDx + snapDy * snapDy < 72 * 72) {
        wx = lm.x;
        wy = lm.y;
      }
    }
    var disp = getHolyWaterBurstDisp();
    holyWaterBursts.push({
      x: wx,
      y: wy,
      frame: 0,
      timer: 0,
      dispW: disp,
      dispH: disp,
      damaged: false
    });
  }

  function applyHolyWaterBurstDamage(burst) {
    if (burst.damaged) return;
    burst.damaged = true;
    var radius = Math.max(burst.dispW, burst.dispH) / SCALE / 2 + 3;
    var dmg = getHolyWaterDamage();
    for (var j = monsters.length - 1; j >= 0; j--) {
      var mon = monsters[j];
      if (mon.hp <= 0) continue;
      var monTypeH = MONSTER_TYPES[mon.type] || MONSTER_TYPES[0];
      if (!circleHitsMonster(burst.x, burst.y, radius, mon, monTypeH)) continue;
      damageMonster(mon, dmg);
      applyMonsterHitKnockback(mon);
      if (mon.hp <= 0) {
        removeDeadMonster(j);
      }
    }
  }

  function updateHolyWater(dt) {
    if (!heroHasHolyWater()) return;
    var dtS = dt / 16.67;

    holyWaterTimer -= dt;
    if (holyWaterTimer <= 0) {
      holyWaterTimer = getHolyWaterCooldown();
      var n = getHolyWaterCount();
      var usedLock = {};
      for (var si = 0; si < n; si++) {
        spawnHolyWaterDrop(si * 120, usedLock);
      }
    }

    var fallSpd = getHolyWaterFallSpeed();
    var spinStep = getHolyWaterSpinRadPerMs() * dt;

    for (var di = holyWaterDrops.length - 1; di >= 0; di--) {
      var drop = holyWaterDrops[di];
      if (drop.delayMs > 0) {
        drop.delayMs -= dt;
        continue;
      }
      if (drop.lockIdx >= 0 && monsters[drop.lockIdx] && monsters[drop.lockIdx].hp > 0) {
        var lm = monsters[drop.lockIdx];
        var pred = predictMonsterAtHolyWaterImpact(lm, drop.fallHeight || estimateHolyWaterFallHeight());
        var homing = 0.22;
        drop.x += (pred.x - drop.x) * homing;
        drop.groundY += (pred.y - drop.groundY) * homing;
      }
      drop.y += fallSpd * dtS;
      drop.spin += spinStep;
      if (drop.y >= drop.groundY) {
        spawnHolyWaterBurst(drop.x, drop.groundY, drop.lockIdx);
        holyWaterDrops.splice(di, 1);
      }
    }

    for (var bi = holyWaterBursts.length - 1; bi >= 0; bi--) {
      var burst = holyWaterBursts[bi];
      if (!burst.damaged) applyHolyWaterBurstDamage(burst);
      burst.timer += dt;
      while (burst.timer >= HOLY_WATER_BURST_FRAME_MS) {
        burst.timer -= HOLY_WATER_BURST_FRAME_MS;
        burst.frame++;
        if (burst.frame >= HOLY_WATER_BURST_FRAMES.length) {
          holyWaterBursts.splice(bi, 1);
          break;
        }
      }
    }
  }

  function drawHolyWater() {
    var img = assets.holy_water;
    var burstImg = assets.holy_water_burst;
    var disp = getHolyWaterDisp();
    var dw = Math.max(1, Math.round(disp * HOLY_WATER_SRC_W / HOLY_WATER_SRC_H));
    var dh = disp;

    ctx.imageSmoothingEnabled = false;

    for (var i = 0; i < holyWaterDrops.length; i++) {
      var drop = holyWaterDrops[i];
      if (drop.delayMs > 0) continue;
      if (!isImgOk(img)) continue;
      var sx = Math.floor(drop.x * SCALE - cam.x + TILE * SCALE / 2 - dw / 2);
      var sy = Math.floor(drop.y * SCALE - cam.y + TILE * SCALE / 2 - dh / 2);
      ctx.save();
      ctx.translate(sx + dw / 2, sy + dh / 2);
      ctx.rotate(drop.spin);
      ctx.drawImage(img, 0, 0, HOLY_WATER_SRC_W, HOLY_WATER_SRC_H, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    }

    if (!isImgOk(burstImg)) return;
    for (var bj = 0; bj < holyWaterBursts.length; bj++) {
      var b = holyWaterBursts[bj];
      var fr = HOLY_WATER_BURST_FRAMES[Math.min(b.frame, HOLY_WATER_BURST_FRAMES.length - 1)];
      var bx = Math.floor(b.x * SCALE - cam.x + TILE * SCALE / 2 - b.dispW / 2);
      var by = Math.floor(b.y * SCALE - cam.y + TILE * SCALE / 2 - b.dispH / 2);
      ctx.drawImage(burstImg, fr.x, fr.y, fr.w, fr.h, bx, by, b.dispW, b.dispH);
    }
  }

  // ===================== THROWING KNIFE =====================
  var KNIFE_SPEED     = 2.5 * GAME_MOVE_SPEED_MULT;  // world units per frame
  var KNIFE_DISP      = 14;   // max display height on screen (px)
  var KNIFE_RANGE     = 220;  // max travel distance in world units before despawn

  function getKnifeHitRadius() {
    return Math.max(4, KNIFE_DISP / SCALE / 2);
  }

  var knives = [];             // [{x, y, vx, vy, dist, angle, hitMonsters}]
  var knifeTimer = 0;
  var lastMoveDir = { x: 1, y: 0 }; // last non-zero movement direction

  function updateKnives(dt) {
    if (!heroHasKnife()) return;
    var dtS = dt / 16.67;

    // Track last movement direction
    var mdx = 0, mdy = 0;
    if (keys['KeyA'] || keys['ArrowLeft'])  mdx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mdx += 1;
    if (keys['KeyW'] || keys['ArrowUp'])    mdy -= 1;
    if (keys['KeyS'] || keys['ArrowDown'])  mdy += 1;
    if (mdx !== 0 || mdy !== 0) {
      var len = Math.sqrt(mdx*mdx + mdy*mdy);
      lastMoveDir.x = mdx / len;
      lastMoveDir.y = mdy / len;
    }

    // Throw on cooldown — one volley per knife owned
    knifeTimer -= dt;
    if (knifeTimer <= 0) {
      knifeTimer = getKnifeCooldown();
      var entry = HERO_ROSTER[hero.rosterIndex];
      var startX = hero.x + TILE / 2;
      var startY = hero.y + TILE / 2 - entry.displayH * SCALE / 2 / SCALE;
      var knifeN = getKnifeCount();
      var baseAng = Math.atan2(lastMoveDir.y, lastMoveDir.x);
      for (var ki = 0; ki < knifeN; ki++) {
        var spread = knifeN <= 1 ? 0 : (ki / (knifeN - 1) - 0.5) * 0.45;
        var ang = baseAng + spread;
        knives.push({
          x: startX, y: startY,
          vx: Math.cos(ang) * KNIFE_SPEED,
          vy: Math.sin(ang) * KNIFE_SPEED,
          dist: 0,
          angle: ang,
          hitMonsters: []
        });
      }
    }

    // Move knives
    for (var i = knives.length - 1; i >= 0; i--) {
      var k = knives[i];
      k.x += k.vx * dtS;
      k.y += k.vy * dtS;
      k.dist += KNIFE_SPEED * dtS;

      if (k.dist > KNIFE_RANGE) { knives.splice(i, 1); continue; }

      // Piercing hit — each enemy at most once per knife
      if (!k.hitMonsters) k.hitMonsters = [];
      for (var j = monsters.length - 1; j >= 0; j--) {
        var m = monsters[j];
        if (m.hp <= 0) continue;
        if (k.hitMonsters.indexOf(m) >= 0) continue;
        var mTypeK = MONSTER_TYPES[m.type] || MONSTER_TYPES[0];
        if (worldPointHitsMonster(k.x, k.y, m, mTypeK, getKnifeHitRadius())) {
          k.hitMonsters.push(m);
          damageMonster(m, getKnifeDamage());
          applyMonsterHitKnockback(m);
          if (m.hp <= 0) {
            removeDeadMonster(j);
          }
        }
      }
    }
  }

  function drawKnives() {
    if (!heroHasKnife()) return;
    var img = assets.knife2;
    if (!isImgOk(img)) return;
    ctx.imageSmoothingEnabled = false;
    for (var i = 0; i < knives.length; i++) {
      var k = knives[i];
      var sx = Math.floor(k.x * SCALE - cam.x);
      var sy = Math.floor(k.y * SCALE - cam.y);
      var srcW = 30;
      var srcH = 32;
      var fit = Math.min(KNIFE_DISP / srcW, KNIFE_DISP / srcH);
      var dw = Math.max(1, Math.floor(srcW * fit));
      var dh = Math.max(1, Math.floor(srcH * fit));
      ctx.save();
      ctx.translate(sx, sy);
      var goingRight = Math.cos(k.angle) > 0.1;
      if (goingRight) {
        ctx.rotate(k.angle - Math.PI * 3/4);
        ctx.scale(1, -1);
      } else {
        ctx.rotate(k.angle + Math.PI * 3/4);
      }
      ctx.drawImage(img, 0, 0, srcW, srcH, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    }
  }

  // ===================== UPDATE =====================
  function update(dt) {
    if (!hero.dead) {
      if (!LAB_MODE) {
        gameTime += dt;
        updateTimedEvents(dt);
      }
    }
    var dx = 0, dy = 0;
    if (!hero.dead) {
      if (keys['KeyA'] || keys['ArrowLeft'])  dx -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
      if (keys['KeyW'] || keys['ArrowUp'])    dy -= 1;
      if (keys['KeyS'] || keys['ArrowDown'])  dy += 1;

      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      hero.moving = (dx !== 0 || dy !== 0);

      if (dx < 0) hero.facingLeft = true;
      if (dx > 0) hero.facingLeft = false;

      hero.x += dx * hero.speed;
      hero.y += dy * hero.speed;

      hero.x = Math.max(0, Math.min(hero.x, MAP_W * TILE - TILE));
      hero.y = Math.max(0, Math.min(hero.y, MAP_H * TILE - TILE));

      if (hero.moving) {
        hero.walkTimer += dt;
        hero.bobOffset = Math.sin(hero.walkTimer * 0.012) * 8;
      } else {
        hero.bobOffset *= 0.8;
        if (Math.abs(hero.bobOffset) < 0.1) { hero.bobOffset = 0; hero.walkTimer = 0; }
      }

      if (heroHasGreatsword()) updateSword(dt);
      updateBibleShockwaves(dt);
      if (heroHasBible()) updateBible(dt);
      if (heroHasHolyWater()) updateHolyWater(dt);
      if (heroHasKnife()) updateKnives(dt);
      updateWeaponUnlockToasts(dt);
      updateExclusiveBuffs(dt);
      updateMonsters(dt);
      updateGems(dt);
    } else {
      hero.moving = false;
      hero.bobOffset *= 0.85;
    }

    updateHeroAnim(dt);
    if (hero.dead) {
      deathScreenTimer += dt;
      if (isHeroDeathAnimDone() && deathScreenTimer >= 650) {
        gameState = 'gameover';
      }
    }
    centerCam();
  }

  // ===================== DRAW =====================
  function drawMap() {
    var tileScreen = TILE * SCALE;
    var patchTiles = getGrassPatchTiles();
    var patchScreen = getGrassPatchScreen();
    var startPx = Math.max(0, Math.floor(cam.x / patchScreen));
    var startPy = Math.max(0, Math.floor(cam.y / patchScreen));
    var endPx = Math.min(grassMapW, Math.ceil((cam.x + VIEW_W) / patchScreen) + 1);
    var endPy = Math.min(grassMapH, Math.ceil((cam.y + VIEW_H) / patchScreen) + 1);

    ctx.imageSmoothingEnabled = false;

    for (var py = startPy; py < endPy; py++) {
      for (var px = startPx; px < endPx; px++) {
        var tx = px * patchTiles;
        var ty = py * patchTiles;
        var sx = Math.floor(tx * tileScreen - cam.x);
        var sy = Math.floor(ty * tileScreen - cam.y);
        var tileId = grassMap[py][px];
        var grassKey = GRASS_TILE_KEYS[tileId] || 'grass1';
        var grassImg = assets[grassKey];
        if (isImgOk(grassImg)) {
          var gw = grassImg.naturalWidth;
          var gh = grassImg.naturalHeight;
          ctx.drawImage(
            grassImg, 0, 0, gw, gh,
            sx, sy, patchScreen + 1, patchScreen + 1
          );
        } else {
          ctx.fillStyle = '#3a5a3a';
          ctx.fillRect(sx, sy, patchScreen + 1, patchScreen + 1);
        }
      }
    }
  }

  function drawHero() {
    var entry = getHeroRosterEntry();
    var playingDeath = hero.dead && entry.deathFrames;
    var imgKey = getHeroAnimSheetKey(entry, hero.moving, playingDeath);
    var img = assets[imgKey];
    var frameIdx = playingDeath ? hero.deathAnimFrame : hero.animFrame;

    var srcY = entry.bodyY;
    var srcH = entry.bodyH;
    var srcW = entry.bodyW;
    var targetH = entry.displayH * SCALE;
    var targetW = Math.round(targetH * srcW / srcH);

    var cx = Math.floor(hero.x * SCALE - cam.x) + TILE * SCALE / 2;
    var footScreenY = Math.floor(hero.y * SCALE - cam.y) + TILE * SCALE / 2;
    var sx = cx - targetW / 2;
    var sy = footScreenY - targetH;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (hero.facingLeft) {
      ctx.translate(cx, footScreenY);
      ctx.scale(-1, 1);
      ctx.translate(-cx, -footScreenY);
    }

    if (isImgOk(img)) {
      var srcX = frameIdx * entry.frameW + entry.bodyX;
      if (srcX + srcW > img.width) srcX = entry.bodyX;
      if (!hero.dead && hero.invincibleTimer > 0) {
        drawSpriteSolidTint(img, srcX, srcY, srcW, srcH, sx, sy, targetW, targetH, '#ff2222');
      } else {
        ctx.drawImage(img,
          srcX, srcY,
          srcW, srcH,
          sx, sy, targetW, targetH);
      }
    } else {
      ctx.fillStyle = entry.color;
      ctx.fillRect(sx, sy, targetW, targetH);
    }

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawMap();
    drawGems();
    drawMonsters();
    drawContactDebug();
    drawHolyWater();
    drawBibleShockwaves();
    drawExclusiveBuffFx();
    if (heroHasGreatsword()) drawSword();
    if (heroHasKnife()) drawKnives();
    drawHero();
    if (heroHasBible()) drawBible();
    drawHeroHpBar();
    drawTopHUD();
    drawBossHudHpBar();
    drawWeaponUnlockToasts();
  }

  function drawOverlayButton(rect, label, hot) {
    ctx.fillStyle = hot ? '#5a7a4a' : '#35465c';
    roundRect(rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fill();
    ctx.strokeStyle = hot ? '#f0d890' : '#9aa8c8';
    ctx.lineWidth = 2;
    roundRect(rect.x, rect.y, rect.w, rect.h, 6);
    ctx.stroke();
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 5);
  }

  function drawPauseScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.textAlign = 'center';
    ctx.font = 'bold 34px Courier New';
    ctx.fillStyle = '#f0d890';
    ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 62);

    ctx.font = '12px Courier New';
    ctx.fillStyle = '#c8c0b0';
    ctx.fillText('P / ESC 继续', VIEW_W / 2, VIEW_H / 2 - 34);

    var resume = getPauseResumeRect();
    var title = getPauseTitleRect();
    drawOverlayButton(resume, '继续游戏', pointInRect(mouse.x, mouse.y, resume));
    drawOverlayButton(title, '返回标题', pointInRect(mouse.x, mouse.y, title));
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.textAlign = 'center';
    ctx.font = 'bold 38px Courier New';
    ctx.fillStyle = '#d84a4a';
    ctx.fillText('GAME OVER', VIEW_W / 2, VIEW_H / 2 - 96);

    ctx.font = '13px Courier New';
    ctx.fillStyle = '#f0d890';
    ctx.fillText('存活 ' + formatTime(gameTime) + '  ·  击杀 ' + killCount + '  ·  金币 ' + gold,
      VIEW_W / 2, VIEW_H / 2 - 58);
    ctx.fillStyle = '#c8c0b0';
    ctx.fillText('等级 ' + level + '  ·  角色 ' + getHeroRosterEntry().name,
      VIEW_W / 2, VIEW_H / 2 - 36);

    var restart = getGameOverRestartRect();
    var title = getGameOverTitleRect();
    drawOverlayButton(restart, '重新开始', pointInRect(mouse.x, mouse.y, restart));
    drawOverlayButton(title, '返回标题', pointInRect(mouse.x, mouse.y, title));

    ctx.font = '10px Courier New';
    ctx.fillStyle = '#888';
    ctx.fillText('Enter / Space 重新开始  ·  Esc 返回标题', VIEW_W / 2, VIEW_H / 2 + 150);
  }

  function getWeaponSrcRect(imgKey) {
    if (imgKey === 'holybook') return { w: HOLYBOOK_SRC_W, h: HOLYBOOK_SRC_H };
    if (imgKey === 'holy_water') return { w: HOLY_WATER_SRC_W, h: HOLY_WATER_SRC_H };
    if (imgKey === 'knife2') return { w: 30, h: 32 };
    return { w: 32, h: 32 };
  }

  function getWeaponImage(imgKey) {
    if (imgKey === 'holybook') return assets.holybook;
    if (imgKey === 'holy_water') return assets.holy_water;
    if (imgKey === 'knife2') return assets.knife2;
    return assets.weapon;
  }

  // Scale entire sprite to fit inside box (for small HUD slots)
  function drawWeaponIconFit(imgKey, x, y, boxSize) {
    if (!imgKey) return;
    var img = getWeaponImage(imgKey);
    if (!isImgOk(img)) return;
    var src = getWeaponSrcRect(imgKey);
    var scale = Math.min(boxSize / src.w, boxSize / src.h);
    var dw = Math.max(1, Math.floor(src.w * scale));
    var dh = Math.max(1, Math.floor(src.h * scale));
    var dx = Math.floor(x + (boxSize - dw) / 2);
    var dy = Math.floor(y + (boxSize - dh) / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, src.w, src.h, dx, dy, dw, dh);
  }

  // Integer scale only (level-up cards etc.)
  function drawWeaponIconByKey(imgKey, x, y, boxSize) {
    drawWeaponIconFit(imgKey, x, y, boxSize);
  }

  function drawLevelUpScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.textAlign = 'center';
    ctx.font = 'bold 24px Courier New';
    ctx.fillStyle = '#e8c86a';
    if (levelUpPickKind === 'exclusive') {
      ctx.fillText('选择专属天赋', VIEW_W / 2, 118);
      ctx.font = '12px Courier New';
      ctx.fillStyle = '#a89888';
      ctx.fillText('LV.' + HERO_EXCLUSIVE_LV + '  ·  三选一（不受常规增益影响）', VIEW_W / 2, 140);
    } else if (levelUpPickKind === 'weapon') {
      ctx.fillText('选择武器', VIEW_W / 2, 118);
      ctx.font = '12px Courier New';
      ctx.fillStyle = '#a89888';
      if (isWizard()) {
        ctx.fillText(
          '圣经 ' + getBibleCount() + '/' + MAX_BIBLE_AMOUNT +
          '  ·  圣水 ' + getHolyWaterCount() + '/' + MAX_HOLY_WATER_AMOUNT,
          VIEW_W / 2, 140
        );
      } else {
        ctx.fillText(
          '大剑 ' + getSwordCount() + '/' + MAX_WEAPON_AMOUNT +
          '  ·  飞刀 ' + getKnifeCount() + '/' + MAX_WEAPON_AMOUNT,
          VIEW_W / 2, 140
        );
      }
    } else {
      ctx.fillText('选择强化', VIEW_W / 2, 118);
      ctx.font = '12px Courier New';
      ctx.fillStyle = '#a89888';
      ctx.fillText('LEVEL UP  ·  LV.' + pendingLevelForChoices, VIEW_W / 2, 140);
    }

    for (var ci = 0; ci < levelUpChoices.length; ci++) {
      var ch = levelUpChoices[ci];
      var cr = getLevelUpChoiceRect(ci);
      var cSel = ci === hoveredUpgradeChoice;
      ctx.fillStyle = cSel ? '#5a5040' : '#3a3848';
      roundRect(cr.x, cr.y, cr.w, cr.h, 6);
      ctx.fill();
      drawGoldBorder(cr.x, cr.y, cr.w, cr.h, cSel ? 3 : 2);
      if (cSel) drawGoldCornerBrackets(cr.x, cr.y, cr.w, cr.h);

      ctx.textAlign = 'center';
      ctx.font = 'bold 14px Courier New';
      ctx.fillStyle = '#f0d890';
      ctx.fillText(ch.name, cr.x + cr.w / 2, cr.y + 64);

      ctx.font = '11px Courier New';
      ctx.fillStyle = '#d8d0c0';
      var descLines = wrapSelectText(ch.desc, cr.w - 24);
      for (var di = 0; di < descLines.length && di < 4; di++) {
        ctx.fillText(descLines[di], cr.x + cr.w / 2, cr.y + 86 + di * 16);
      }
    }

    ctx.font = '10px Courier New';
    ctx.fillStyle = '#888';
    ctx.fillText('点击卡片选择', VIEW_W / 2, VIEW_H - 24);
  }

  // ===================== LOOP =====================
  var lastTime = 0;

  function loop(ts) {
    var dt = ts - lastTime;
    if (dt > 200) dt = 200;
    lastTime = ts;

    if (gameState === 'title') {
      drawTitleScreen(ts);
      if (characterSelectOpen) drawCharacterSelectDialog();
    } else if (gameState === 'playing') {
      update(dt);
      draw();
    } else if (gameState === 'paused') {
      draw();
      drawPauseScreen();
    } else if (gameState === 'levelup') {
      draw();
      drawLevelUpScreen();
    } else if (gameState === 'gameover') {
      draw();
      drawGameOverScreen();
    }

    requestAnimationFrame(loop);
  }

  // Analyze sprite content bounding box — pass multiple images to get a unified bbox
  function onReady() {
    generateMap();
    centerCam();
    if (LAB_MODE) {
      startLabGame();
      if (window.EternalNightLab && typeof window.EternalNightLab._onGameReady === 'function') {
        window.EternalNightLab._onGameReady();
      }
    }
    requestAnimationFrame(loop);
  }

  if (LAB_MODE) {
    window.EternalNightLab = {
      applyUpgrade: applyLabUpgrade,
      switchHero: labSwitchHero,
      getSnapshot: getLabSnapshot,
      reset: startLabGame,
      getExclusiveCatalog: getExclusiveBuffCatalog,
      getExclusiveBuff: function () { return heroExclusiveBuff; },
      applyExclusiveBuff: applyExclusiveBuffById,
      clearExclusiveBuff: function () {
        resetExclusiveBuffState();
        swordBlades = [];
      },
      roster: HERO_ROSTER.map(function (h, i) {
        return { index: i, name: h.name, key: h.key };
      }),
      monsterNames: MONSTER_TYPES.map(function (m) { return m.key; })
    };
  }

})();
