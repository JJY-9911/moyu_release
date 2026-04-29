(function(){
'use strict';

// ── Constants ──────────────────────────────────────────────────────────────
const WORLD_W=3200, WORLD_H=3200;
const VIEW_W=800, VIEW_H=450;
const RIVER_HALF=350;
const ATTACK_RANGE=210;
const ATTACK_INTERVAL=60;
const R_MAX_DIST=400;
const R_COOLDOWN_BASE=1800;
const BUFF_RESPAWN=5400;
const BOSS_RESPAWN=5400;
const FOUNTAIN_RADIUS=130;
const BUFF_RADIUS=60;
const BOSS_SPAWN_RADIUS=140;
const OBSTACLE_COUNT=18;

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');

function resize(){
  const aw=window.innerWidth,ah=window.innerHeight;
  let w,h;
  if(aw/ah>VIEW_W/VIEW_H){h=ah;w=h*(VIEW_W/VIEW_H);}
  else{w=aw;h=w*(VIEW_H/VIEW_W);}
  canvas.style.width=Math.floor(w)+'px';
  canvas.style.height=Math.floor(h)+'px';
  canvas.width=VIEW_W;canvas.height=VIEW_H;
}
window.addEventListener('resize',resize);resize();

// ── Asset loading ──────────────────────────────────────────────────────────
const AB='assets/';
const allImages=[];
function loadImg(s){const i=new Image();i.src=AB+s;i._failed=false;i.onerror=function(){i._failed=true;};allImages.push(i);return i;}

const imgPlayer=loadImg('Slime1_Attack_body.webp');       // 640x256, 10cols x 4rows, 64x64 (attack/ult)
const imgPlayerWalk=loadImg('Slime1_Walk_body.webp');     // 512x256, 8cols x 4rows, 64x64 (idle/walk)
const imgFountain=loadImg('Tree_idol_human.webp');// 128x128 static
const imgWater=loadImg('Water.webp');                      // 688x576, 3 frames of 688x192
const imgRedBuff=loadImg('red.webp');                       // 64x64 static
const imgBlueBuff=loadImg('blue.webp');                    // 128x128 static
const imgGreenBuff=loadImg('green.webp');                   // green buff
const imgCover=loadImg('cover.webp');                       // loading screen cover
const imgStar=loadImg('star.webp');                        // click marker
const imgShadow=loadImg('shadow.webp');                    // 26x19 shadow
const imgPlant1=loadImg('Plant1_Walk_without_shadow.webp');// 384x256, 6x4, 64x64
const imgPlant3=loadImg('Plant3_Walk_without_shadow.webp');// 384x256, 6x4, 64x64
const imgDeath=loadImg('Plant1_Death_brown.webp');         // 640x256, 10x4, 64x64


// Fire spell frames: 8 individual 640x360 images
const FIRE_FRAME_COUNT=8;
const imgFireFrames=[];
for(let i=1;i<=FIRE_FRAME_COUNT;i++){
  imgFireFrames.push(loadImg('fire/Fire Spell_Frame_0'+i+'.webp'));
}

const barrierFiles=[
  'barrier/Beige_rpck_dark_shadow1.webp','barrier/Bones_shadow1_1.webp',
  'barrier/Dark_totem_dark_shadow4.webp','barrier/Eye_plant_shadow2_2.webp',
  'barrier/Jaws_plant_shadow2_1.webp','barrier/Many_eyes_plant_shadow2_1.webp',
  'barrier/Meat_flower_shadow2_2.webp','barrier/Rock2_shadow2_2.webp',
  'barrier/Rock3_shadow2_3.webp','barrier/Ruins_shadow1_4.webp',
  'barrier/Ruins_shadow2_1.webp','barrier/Ruins_shadow2_2.webp',
  'barrier/Spike_plant_shadow2_2.webp','barrier/mushroom2_dark_shadow1.webp',
];
const imgBarriers=barrierFiles.map(loadImg);
const barrierHitboxes=[
  {cx:0,cy:0,hw:0.16,hh:0.29}, // Beige_rpck 128
  {cx:0,cy:0,hw:0.27,hh:0.22}, // Bones 256
  {cx:0,cy:0,hw:0.26,hh:0.18}, // Dark_totem4 128
  {cx:0,cy:0,hw:0.30,hh:0.45}, // Eye_plant 64
  {cx:0,cy:0,hw:0.43,hh:0.50}, // Jaws_plant 128
  {cx:0,cy:0,hw:0.35,hh:0.48}, // Many_eyes 64
  {cx:0,cy:0,hw:0.47,hh:0.44}, // Meat_flower 64
  {cx:0,cy:0,hw:0.40,hh:0.46}, // Rock2 64
  {cx:0,cy:0,hw:0.41,hh:0.44}, // Rock3 64
  {cx:0,cy:0,hw:0.50,hh:0.43}, // Ruins1_4 64
  {cx:0,cy:0,hw:0.43,hh:0.41}, // Ruins2_1 128
  {cx:0,cy:0,hw:0.30,hh:0.30}, // Ruins2_2 128
  {cx:0,cy:0,hw:0.35,hh:0.34}, // Spike_plant 128
  {cx:0,cy:0,hw:0.22,hh:0.31}, // mushroom2 128
];
// Original pixel sizes for proper scaling (display at 2x)
const barrierSrcSizes=[128,256,128,64,128,64,64,64,64,64,128,128,128,128];

// Tree images for border decoration
const imgTrees=[];
for(let i=1;i<=6;i++) imgTrees.push(loadImg('trees/'+i+'.webp'));

// Defense/altar images
const imgLightningAltar=[loadImg('defense/Dark_totem_dark_shadow2.webp'),loadImg('defense/white_crystal_light_shadow3.webp')];
const imgFireAltar=[loadImg('defense/Building1_dark_shadow.webp'),loadImg('defense/Building2_dark_shadow.webp')];
const imgLightningAttack=[];
for(let i=1;i<=5;i++) imgLightningAttack.push(loadImg('altar/1/Explosion_'+i+'.webp'));
const imgFireAttack=[];
for(let i=1;i<=10;i++) imgFireAttack.push(loadImg('altar/Explosion_3/Explosion_'+i+'.webp'));

const bossFiles=['boss/centipede_dark_shadow1.webp','boss/Dark_totem_dark_shadow1.webp'];
const imgBosses=bossFiles.map(loadImg);

// ── Sprite sheet helper ────────────────────────────────────────────────────
// Sprite sheets use 4-row directional layout:
// Row 0=down, 1=left, 2=right, 3=up
// direction: 0=down,1=left,2=right,3=up
function dirFromDxDy(dx,dy){
  // Sprite row layout: 0=down, 1=up, 2=left, 3=right
  if(Math.abs(dx)>Math.abs(dy)) return dx<0?2:3;
  return dy<0?1:0;
}

// Draw one frame from a sprite sheet
// img: Image, fw/fh: frame size, col: frame index, row: direction row
// x,y: screen center, drawW/drawH: draw size
function drawFrame(img,fw,fh,col,row,x,y,drawW,drawH){
  if(!img.complete||!img.naturalWidth) return false;
  ctx.drawImage(img, col*fw, row*fh, fw, fh, x-drawW/2, y-drawH/2, drawW, drawH);
  return true;
}

// ── Hero portraits ─────────────────────────────────────────────────────────
const imgHeroes=[
  loadImg('main_actor/yingxiong.webp'),
  loadImg('main_actor/lieshou.webp'),
  loadImg('main_actor/yingyan.webp'),
  loadImg('main_actor/yingren.webp'),
  loadImg('main_actor/xuemo.webp'),
];

const HEROES=[
  {
    name:'英雄之力',hp:4,
    ultName:'降临',ultDesc:'跳跃至鼠标悬停处，造成巨额伤害（对boss和buff无效）',
    passiveName:'怒视',passiveDesc:'自动攻击对小兵有击退效果',
    ultType:'jump', // reuse existing ult
    passiveType:'knockback',
  },
  {
    name:'猎手之力',hp:5,
    ultName:'思乡',ultDesc:'瞬间传送回泉水，30秒冷却',
    passiveName:'悬赏',passiveDesc:'击杀boss获得双倍金币',
    ultType:'teleport',
    passiveType:'bounty',
  },
  {
    name:'鹰眼之力',hp:2,
    ultName:'虚化',ultDesc:'免疫伤害，移速提升5倍，持续10秒。30秒冷却',
    passiveName:'百步',passiveDesc:'射程为全屏',
    ultType:'phase',
    passiveType:'fullrange',
  },
  {
    name:'影忍之力',hp:3,
    ultName:'血烟',ultDesc:'在射程范围内制造血雾，每0.2秒造成0.5伤害，持续20秒。40秒冷却',
    passiveName:'潜行',passiveDesc:'基础移速为2倍，免疫障碍物伤害',
    ultType:'bloodmist',
    passiveType:'stealth',
  },
  {
    name:'血魔之力',hp:10,
    ultName:'无',ultDesc:'无大招',
    passiveName:'血魔',passiveDesc:'每击杀100个小兵恢复一点血量。与boss战斗时，小兵无法进入河流',
    ultType:'none',
    passiveType:'bloodlord',
  },
];

// ── Game phase ─────────────────────────────────────────────────────────────
let gamePhase='loading'; // 'loading' | 'select' | 'playing'
let selectedHero=0;
let heroChoice=-1; // confirmed choice
let selectHover=-1;
let minionKillCount=0; // for blood lord passive
let phaseActive=false; // eagle eye ult
let phaseTimer=0;
let bloodMistActive=false;
let bloodMistTimer=0;
let bloodMistX=0,bloodMistY=0;
let castAnim={active:false,timer:0,duration:40}; // cast animation for non-jump ults

// ── Upgrade system ─────────────────────────────────────────────────────────
let shopOpen=false;
let shopSelect=0;
let infiniteGold=false;
const BASE_PRICE=10;
const PRICE_INCREASE=1.3;
let totalPurchases=0;
function getPrice(key){
  if(key==='altarL'||key==='altarF') return 1000;
  return Math.round(BASE_PRICE*Math.pow(PRICE_INCREASE,totalPurchases));
}

const upgrades={
  hero:{count:0,max:36,name:'供奉英雄',getDesc(){const n=this.count+1;return '子弹数量→'+(1+n)+' ('+this.count+'/'+this.max+')';}},
  blood:{count:0,max:999,name:'供奉血魔',bleedRate:0.1,getDesc(){const nr=(0.1*Math.pow(1.5,this.count+1)).toFixed(2);return '流血: 每秒-'+nr;}},
  shadow:{count:0,max:999,name:'供奉影刃',getDesc(){return '移速→+'+(( this.count+1)*5)+'%';}},
  hunter:{count:0,max:999,name:'供奉猎手',getDesc(){return '对boss伤害→+'+(this.count+1);}},
  eagle:{count:0,max:9,name:'供奉鹰眼',getDesc(){const n=this.count+1;return '间隔-'+(n*0.1).toFixed(1)+'s 射程+'+(n*5)+'% ('+this.count+'/'+this.max+')';}},
  altarL:{count:0,max:4,name:'供奉闪电祭坛',getDesc(){return '小范围攻击，射速极快 ('+this.count+'/'+this.max+')';}},
  altarF:{count:0,max:4,name:'供奉天火祭坛',getDesc(){return '全图攻击，造成范围伤害 ('+this.count+'/'+this.max+')';}},
};
const upgradeKeys=['hero','blood','shadow','hunter','eagle','altarL','altarF'];

// ── Altars ─────────────────────────────────────────────────────────────────
const ALTAR_COUNT=8;
let altars=[];

// ── Fixed positions ────────────────────────────────────────────────────────
const FOUNTAIN_POS={x:200,y:2900};
const BOSS_SPAWN={x:2000,y:1200};

// ── Random generation ──────────────────────────────────────────────────────
function inRiver(x,y){return Math.abs(x-y)<RIVER_HALF;}
function inPlayableRaw(x,y){
  if(x<0||y<0||x>WORLD_W||y>WORLD_H) return false;
  return (y-x)>-RIVER_HALF;
}
function inFountainCheck(x,y){return (x-FOUNTAIN_POS.x)**2+(y-FOUNTAIN_POS.y)**2<(FOUNTAIN_RADIUS+80)**2;}
function nearBossSpawn(x,y){return (x-BOSS_SPAWN.x)**2+(y-BOSS_SPAWN.y)**2<(BOSS_SPAWN_RADIUS+100)**2;}

function generateObstacles(){
  const obs=[];let att=0;
  while(obs.length<OBSTACLE_COUNT&&att<500){
    att++;
    const imgIdx=Math.floor(Math.random()*imgBarriers.length);
    const srcSz=barrierSrcSizes[imgIdx];
    const scale=srcSz<=64?2.5:srcSz<=128?1.5:1.0; // scale up small sprites more
    const w=srcSz*scale, h=srcSz*scale;
    const x=100+Math.random()*(WORLD_W-200),y=100+Math.random()*(WORLD_H-200);
    if(!inPlayableRaw(x,y)||inRiver(x,y)||inFountainCheck(x,y)||nearBossSpawn(x,y)) continue;
    let ok=true;
    for(const o of obs){if(Math.sqrt((o.x-x)**2+(o.y-y)**2)<200){ok=false;break;}}
    if(!ok) continue;
    obs.push({x,y,w,h,imgIdx});
  }
  return obs;
}

function generateBuffPos(obstacles,other){
  for(let i=0;i<300;i++){
    const x=300+Math.random()*(WORLD_W-600),y=300+Math.random()*(WORLD_H-600);
    if(!inPlayableRaw(x,y)||inRiver(x,y)||inFountainCheck(x,y)||nearBossSpawn(x,y)) continue;
    let onObs=false;
    for(const o of obstacles){if(Math.abs(x-o.x)<o.w/2+70&&Math.abs(y-o.y)<o.h/2+70){onObs=true;break;}}
    if(onObs) continue;
    if(other&&Math.sqrt((x-other.x)**2+(y-other.y)**2)<400) continue;
    return {x,y};
  }
  return {x:600,y:1800};
}

let OBSTACLES=generateObstacles();
let RED_BUFF_POS=[];
let BLUE_BUFF_POS=[];
let GREEN_BUFF_POS=[];
function generateAllBuffPos(){
  RED_BUFF_POS=[];BLUE_BUFF_POS=[];GREEN_BUFF_POS=[];
  const all=[];
  for(let i=0;i<2;i++){const p=generateBuffPos(OBSTACLES,all.length?all[all.length-1]:null);RED_BUFF_POS.push(p);all.push(p);}
  for(let i=0;i<2;i++){const p=generateBuffPos(OBSTACLES,all[all.length-1]);BLUE_BUFF_POS.push(p);all.push(p);}
  for(let i=0;i<2;i++){const p=generateBuffPos(OBSTACLES,all[all.length-1]);GREEN_BUFF_POS.push(p);all.push(p);}
}
generateAllBuffPos();

function generateAltars(){
  altars=[];
  for(let i=0;i<ALTAR_COUNT;i++){
    const type=i<4?'lightning':'fire';
    const imgIdx=Math.floor(Math.random()*2);
    for(let att=0;att<200;att++){
      const x=200+Math.random()*(WORLD_W-400),y=200+Math.random()*(WORLD_H-400);
      if(!inPlayableRaw(x,y)||inRiver(x,y)||inFountainCheck(x,y)||nearBossSpawn(x,y)) continue;
      let ok=true;
      for(const o of OBSTACLES){if(Math.abs(x-o.x)<150&&Math.abs(y-o.y)<150){ok=false;break;}}
      for(const a of altars){if(Math.sqrt((x-a.x)**2+(y-a.y)**2)<300){ok=false;break;}}
      if(!ok) continue;
      altars.push({x,y,type,imgIdx,active:false,attackTimer:0,animFrame:0,animTimer:0,
        effectActive:false,effectX:0,effectY:0,effectFrame:0,effectTimer:0});
      break;
    }
  }
}
generateAltars();

function randomBossType(){
  const idx=Math.floor(Math.random()*imgBosses.length);
  const hp=100+Math.floor(Math.random()*10)*100;
  return {imgIdx:idx,hp,gold:hp};
}
let bossType=randomBossType();

// ── Wave system ────────────────────────────────────────────────────────────
const WAVE_INTERVALS=[2700,2700,3300,3300,3300,3900,3900,3900,3900,4500];
const WAVE_COUNTS=[10,15,25,25,40,40,50,50,100];
let waveIndex=0,waveTimer=300,waveSpawnQueue=0,waveSpawnDelay=0;
function getWaveInterval(){return waveIndex<WAVE_INTERVALS.length?WAVE_INTERVALS[waveIndex]:4500;}
function getWaveCount(){return WAVE_COUNTS[waveIndex%WAVE_COUNTS.length];}

// ── Death effects (frame animated) ────────────────────────────────────────
const deathEffects=[];
function addDeathEffect(x,y,size,dir){
  deathEffects.push({x,y,size:size||40,dir:dir||0,frame:0,timer:0,maxFrames:10,done:false});
}

// ── Water (static tile) ────────────────────────────────────────────────────

// ── Ground tile map ─────────────────────────────────────────────────────────
// Pick grass tiles from land.webp tileset (32x32 each, 13 cols x 30 rows)
// Use tiles from rows 0-5 which are solid grass variants
const LAND_TW=32, LAND_TH=32, LAND_COLS=13;
// Good grass tile positions (col, row) — solid green ground tiles
const GRASS_TILES=[
  [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],
  [0,3],[1,3],[2,3],[3,3],[4,3],[5,3],
  [0,4],[1,4],[2,4],[3,4],[4,4],[5,4],
  [6,0],[7,0],[8,0],[9,0],[10,0],
];
const GROUND_TILE_SIZE=64; // display size per tile
const GROUND_COLS=Math.ceil(WORLD_W/GROUND_TILE_SIZE);
const GROUND_ROWS=Math.ceil(WORLD_H/GROUND_TILE_SIZE);
// Pre-generate random tile assignments
let groundMap=[];
function generateGroundMap(){
  groundMap=[];
  for(let r=0;r<GROUND_ROWS;r++){
    const row=[];
    for(let c=0;c<GROUND_COLS;c++){
      row.push(GRASS_TILES[Math.floor(Math.random()*GRASS_TILES.length)]);
    }
    groundMap.push(row);
  }
}
generateGroundMap();

// ── Tree border ────────────────────────────────────────────────────────────
let treeBorder=[];
function generateTreeBorder(){
  treeBorder=[];
  const treeSize=64;
  const spacing=50;
  // Left edge
  for(let y=RIVER_HALF+100;y<WORLD_H;y+=spacing+Math.random()*30){
    const xOff=-10+Math.random()*40;
    treeBorder.push({x:xOff,y,imgIdx:Math.floor(Math.random()*imgTrees.length),sz:treeSize+Math.random()*20});
  }
  // Bottom edge
  for(let x=0;x<WORLD_W-RIVER_HALF;x+=spacing+Math.random()*30){
    const yOff=WORLD_H-10-Math.random()*40;
    treeBorder.push({x,y:yOff,imgIdx:Math.floor(Math.random()*imgTrees.length),sz:treeSize+Math.random()*20});
  }
}
generateTreeBorder();

// ── Water wave animation ────────────────────────────────────────────────────
// Water.webp contains 6 wide wave shapes (y regions), shown one at a time
const WATER_WAVES=[
  {sy:6,sh:23},   // wave 0
  {sy:38,sh:23},  // wave 1
  {sy:69,sh:24},  // wave 2
  {sy:102,sh:23}, // wave 3
  {sy:134,sh:23}, // wave 4
  {sy:166,sh:23}, // wave 5
];
const WATER_FRAME_COUNT=WATER_WAVES.length;
let waterFrame=0, waterTimer=0;

// Pre-generate sparse wave positions along the river
const WAVE_DRAW_W=344, WAVE_DRAW_H=24;
let wavePositions=[];
function generateWavePositions(){
  wavePositions=[];
  // Scatter ~25 wave sprites across the river diagonal
  for(let i=0;i<25;i++){
    // River runs from (0,RIVER_HALF) to (WORLD_W-RIVER_HALF, WORLD_H)
    // Random point along the diagonal band
    const t=Math.random();
    const cx=t*(WORLD_W-RIVER_HALF);
    const cy=RIVER_HALF+t*(WORLD_H-RIVER_HALF);
    // Offset perpendicular to diagonal within river width
    const perpOff=(Math.random()-0.5)*RIVER_HALF*1.2;
    const px=cx+perpOff*0.707;
    const py=cy-perpOff*0.707;
    wavePositions.push({x:px,y:py});
  }
}
generateWavePositions();

// ── State ──────────────────────────────────────────────────────────────────
let tick=0;
let mouseX=VIEW_W/2,mouseY=VIEW_H/2;

const player={
  x:FOUNTAIN_POS.x,y:FOUNTAIN_POS.y,hp:3,maxHp:3,gold:0,speed:1.5,
  targetX:FOUNTAIN_POS.x,targetY:FOUNTAIN_POS.y,moving:false,
  attackTimer:0,
  hasRedBuff:false,redBuffTimer:0,
  hasBlueBuff:false,blueBuffTimer:0,
  invincibleTimer:0,
  dir:0, // 0=down,1=left,2=right,3=up
  animFrame:0,animTimer:0,
};

let rCooldown=0,rMaxCooldown=R_COOLDOWN_BASE;
const ult={active:false,sx:0,sy:0,tx:0,ty:0,progress:0,duration:60,landRadius:120,immunityTimer:0};
let camX=0,camY=0;
const minions=[];
const bullets=[];

const boss={
  x:BOSS_SPAWN.x,y:BOSS_SPAWN.y,
  hp:50,maxHp:50,
  alive:false,respawnTimer:0,
  chasing:false,speed:0.33,
  burnTimer:0,burnDmgTimer:0,slowTimer:0,
  gold:100,
  dir:0,animFrame:0,animTimer:0,
};

const redBuffs=RED_BUFF_POS.map(p=>({x:p.x,y:p.y,hp:10,maxHp:10,alive:false,respawnTimer:0,burnTimer:0,burnDmgTimer:0,slowTimer:0}));
const blueBuffs=BLUE_BUFF_POS.map(p=>({x:p.x,y:p.y,hp:10,maxHp:10,alive:false,respawnTimer:0}));
const greenBuffs=GREEN_BUFF_POS.map(p=>({x:p.x,y:p.y,hp:10,maxHp:10,alive:false,respawnTimer:0}));

let gameOver=false;

// Click marker
let clickMarker={active:false,x:0,y:0,timer:0,maxTimer:30};

// Current attack target type (for HUD buff tooltip)
let currentTargetType='';

// Track fountain state for exit invincibility
let wasInFountain=true;
let fountainShieldTimer=0; // separate timer for golden aura visual

// ── Selection screen input ─────────────────────────────────────────────────
canvas.addEventListener('click',function(e){
  const r=canvas.getBoundingClientRect();
  const mx=(e.clientX-r.left)*(VIEW_W/r.width);
  const my=(e.clientY-r.top)*(VIEW_H/r.height);

  if(gamePhase==='select'){
    for(let i=0;i<5;i++){
      const iy=50+i*78;
      if(mx>=20&&mx<=84&&my>=iy&&my<=iy+64){selectedHero=i;return;}
    }
    if(mx>=VIEW_W/2-60&&mx<=VIEW_W/2+60&&my>=VIEW_H-50&&my<=VIEW_H-20){
      heroChoice=selectedHero;applyHeroChoice();gamePhase='playing';
    }
    return;
  }

  // Shop click handling
  if(shopOpen){
    const px=VIEW_W/2-200,py=20,pw=400;
    // Infinite gold toggle button
    const tgX=px+pw-110,tgY=py+38,tgW=100,tgH=20;
    if(mx>=tgX&&mx<=tgX+tgW&&my>=tgY&&my<=tgY+tgH){infiniteGold=!infiniteGold;return;}
    for(let i=0;i<upgradeKeys.length;i++){
      const iy=py+62+i*48;
      const btnX=px+pw-80,btnY=iy+2,btnW=60,btnH=24;
      if(mx>=btnX&&mx<=btnX+btnW&&my>=btnY&&my<=btnY+btnH){
        const key=upgradeKeys[i];
        const u=upgrades[key];
        if(u.count>=u.max) return;
        const price=getPrice(key);
        if(!infiniteGold&&player.gold<price) return;
        if(!infiniteGold) player.gold-=price;
        u.count++;
        if(key!=='altarL'&&key!=='altarF') totalPurchases++;
        // Apply effects
        if(key==='blood'){u.bleedRate=0.05*Math.pow(1.5,u.count);}
        if(key==='shadow'){
          const base=HEROES[heroChoice].passiveType==='stealth'?2:1;
          player.speed=base*(1+u.count*0.05);
        }
        if(key==='eagle'){/* applied dynamically in fireAtNearest/getAttackRange */}
        if(key==='altarL'){
          for(const a of altars){if(!a.active&&a.type==='lightning'){a.active=true;break;}}
        }
        if(key==='altarF'){
          for(const a of altars){if(!a.active&&a.type==='fire'){a.active=true;break;}}
        }
        return;
      }
    }
  }
});

function applyHeroChoice(){
  const h=HEROES[heroChoice];
  player.hp=h.hp;player.maxHp=h.hp;
  // Stealth passive: 2x move speed
  if(h.passiveType==='stealth') player.speed=2.5;
  // Full range passive
  // Blood lord: track kills
  minionKillCount=0;
  // Reset ult cooldown based on hero
  if(h.ultType==='bloodmist'){rMaxCooldown=2400;} // 40s
  else if(h.ultType==='none'){rMaxCooldown=999999;} // no ult
  else{rMaxCooldown=R_COOLDOWN_BASE;} // 30s
  rCooldown=0;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function wx(x){return x-camX;}
function wy(y){return y-camY;}
function dist(a,b){return Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);}
function inPlayable(x,y){return inPlayableRaw(x,y);}
function inFountain(x,y){return (x-FOUNTAIN_POS.x)**2+(y-FOUNTAIN_POS.y)**2<FOUNTAIN_RADIUS*FOUNTAIN_RADIUS;}
function rectContains(o,x,y,r){return x+r>o.x-o.w/2&&x-r<o.x+o.w/2&&y+r>o.y-o.h/2&&y-r<o.y+o.h/2;}
function collidesObstacle(x,y,r){return false;} // obstacles are passable

function getAttackRange(){
  let range=ATTACK_RANGE;
  if(heroChoice>=0&&HEROES[heroChoice].passiveType==='fullrange') range=Math.max(VIEW_W,VIEW_H);
  range*=(1+upgrades.eagle.count*0.05);
  return range;
}

function playerOnObstacle(){
  for(const o of OBSTACLES){
    const hb=barrierHitboxes[o.imgIdx];
    // Shrink hitbox to 70% of visible content so damage only triggers on clear overlap
    const hw=o.w*hb.hw*0.7, hh=o.w*hb.hh*0.7;
    const cx=o.x+o.w*hb.cx, cy=o.y+o.w*hb.cy;
    const dx=Math.abs(player.x-cx), dy=Math.abs(player.y-cy);
    if(dx<hw&&dy<hh) return true;
  }
  return false;
}

function steer(entity,tx,ty,speed,radius){
  const dx=tx-entity.x,dy=ty-entity.y,d=Math.sqrt(dx*dx+dy*dy);
  if(d<1) return {dx:0,dy:0};
  const ndx=dx/d,ndy=dy/d;
  // Try direct path first
  const nx=entity.x+ndx*speed,ny=entity.y+ndy*speed;
  if(!collidesObstacle(nx,ny,radius)&&inPlayable(nx,ny)&&!inFountain(nx,ny)) return {dx:ndx,dy:ndy};
  // Try increasingly wider angles to steer around obstacles
  const baseAngle=Math.atan2(ndy,ndx);
  for(let step=1;step<=12;step++){
    const angle=step*0.25; // 0.25, 0.5, 0.75 ... up to 3.0 radians
    for(const sign of [1,-1]){
      const a=baseAngle+angle*sign;
      const adx=Math.cos(a),ady=Math.sin(a);
      const ax=entity.x+adx*speed,ay=entity.y+ady*speed;
      if(!collidesObstacle(ax,ay,radius)&&inPlayable(ax,ay)&&!inFountain(ax,ay)){
        return {dx:adx,dy:ady};
      }
    }
  }
  return {dx:0,dy:0};
}

function steerMinion(m,tx,ty){
  const spd=m.slowTimer>0?m.speed*0.7:m.speed;
  return steer(m,tx,ty,spd,16);
}

function spawnMinion(){
  let x,y;
  const edge=Math.floor(Math.random()*3);
  if(edge===0){x=Math.random()*WORLD_W;y=WORLD_H-5;}
  else if(edge===1){x=5;y=WORLD_H*0.3+Math.random()*WORLD_H*0.7;}
  else{x=Math.random()*1000;y=WORLD_H-5-Math.random()*1000;}
  if(!inPlayable(x,y)||inFountain(x,y)) return;
  const type=Math.random()<0.5?0:1;
  const baseHp=type===0?2:1;
  const hp=baseHp+Math.max(0,waveIndex-1); // +1 HP per wave, first wave no bonus
  const speed=type===0?0.33:0.66;
  minions.push({x,y,hp,maxHp:hp,speed,type,burnTimer:0,burnDmgTimer:0,slowTimer:0,hitTimer:0,dir:0,animFrame:0,animTimer:0,bleedTimer:0,bleedRate:0,bleedDmgTimer:0});
}

// ── Input ──────────────────────────────────────────────────────────────────
canvas.addEventListener('contextmenu',function(e){
  e.preventDefault();if(gameOver||gamePhase!=='playing') return;
  const r=canvas.getBoundingClientRect();
  const sx=(e.clientX-r.left)*(VIEW_W/r.width),sy=(e.clientY-r.top)*(VIEW_H/r.height);
  const wx2=sx+camX,wy2=sy+camY;
  if(!inPlayable(wx2,wy2)) return;
  player.targetX=wx2;player.targetY=wy2;player.moving=true;
  clickMarker.active=true;clickMarker.x=wx2;clickMarker.y=wy2;clickMarker.timer=clickMarker.maxTimer;
});
canvas.addEventListener('mousemove',function(e){
  const r=canvas.getBoundingClientRect();
  mouseX=(e.clientX-r.left)*(VIEW_W/r.width);
  mouseY=(e.clientY-r.top)*(VIEW_H/r.height);
});
window.addEventListener('keydown',function(e){
  if(gameOver){if(e.key==='Escape')restartGame();return;}
  if(gamePhase!=='playing') return;
  if(e.key==='p'||e.key==='P'){
    if(inFountain(player.x,player.y)) shopOpen=!shopOpen;
    else shopOpen=false;
    return;
  }
  if(e.key==='Escape'&&shopOpen){shopOpen=false;return;}
  if(shopOpen) return; // block other keys while shop open
  if(e.key==='r'||e.key==='R'){
    if(inFountain(player.x,player.y)) return; // can't ult in fountain
    if(rCooldown>0) return;
    const h=HEROES[heroChoice];
    if(h.ultType==='none') return;
    // Block re-casting during blood mist or phase active
    if(bloodMistActive||phaseActive) return;
    player.moving=false;

    if(h.ultType==='jump'){
      // 降临: jump to mouse
      const wmx=mouseX+camX,wmy=mouseY+camY;
      const dx=wmx-player.x,dy=wmy-player.y,d=Math.sqrt(dx*dx+dy*dy);
      if(d<1) return;
      const dist2=Math.min(d,R_MAX_DIST);
      let tx=player.x+dx/d*dist2,ty=player.y+dy/d*dist2;
      if(!inPlayable(tx,ty)){tx=player.x+dx/d*(dist2*0.5);ty=player.y+dy/d*(dist2*0.5);}
      player.dir=dirFromDxDy(dx,dy);
      ult.active=true;ult.sx=player.x;ult.sy=player.y;ult.tx=tx;ult.ty=ty;ult.progress=0;
    } else if(h.ultType==='teleport'){
      // 思乡: teleport to fountain
      castAnim.active=true;castAnim.timer=castAnim.duration;
      player.x=FOUNTAIN_POS.x;player.y=FOUNTAIN_POS.y;
      player.targetX=FOUNTAIN_POS.x;player.targetY=FOUNTAIN_POS.y;
    } else if(h.ultType==='phase'){
      // 虚化: immune + 5x speed for 10s
      castAnim.active=true;castAnim.timer=castAnim.duration;
      phaseActive=true;phaseTimer=600;
    } else if(h.ultType==='bloodmist'){
      // 血烟: AoE damage in attack range for 20s
      castAnim.active=true;castAnim.timer=castAnim.duration;
      bloodMistActive=true;bloodMistTimer=1200;
      bloodMistX=player.x;bloodMistY=player.y;
    }
    rCooldown=rMaxCooldown;
  }
});

// ── Update ─────────────────────────────────────────────────────────────────
function updatePlayer(){
  if(ult.active) return;

  // Phase ult (eagle eye): speed boost + immunity
  // Cast animation countdown
  if(castAnim.active){castAnim.timer--;if(castAnim.timer<=0)castAnim.active=false;}

  let curSpeed=player.speed;
  if(phaseActive){
    phaseTimer--;
    if(phaseTimer<=0) phaseActive=false;
    else curSpeed=player.speed*5;
  }

  if(player.moving){
    const dx=player.targetX-player.x,dy=player.targetY-player.y,d=Math.sqrt(dx*dx+dy*dy);
    if(d<curSpeed){player.x=player.targetX;player.y=player.targetY;player.moving=false;}
    else{
      const nx=player.x+dx/d*curSpeed,ny=player.y+dy/d*curSpeed;
      if(inPlayable(nx,ny)){
        player.x=nx;player.y=ny;
        player.dir=dirFromDxDy(dx,dy);
      }
    }
  }

  // Blood mist ult: AoE damage tick
  if(bloodMistActive){
    bloodMistTimer--;
    if(bloodMistTimer<=0) bloodMistActive=false;
    else {
      bloodMistX=player.x;bloodMistY=player.y;
      if(tick%12===0){
        const range=getAttackRange();
        for(const m of minions){if(dist({x:bloodMistX,y:bloodMistY},m)<range) m.hp-=0.5;}
        if(boss.alive&&dist({x:bloodMistX,y:bloodMistY},boss)-120<range) boss.hp-=0.5;
      }
    }
  }

  if(player.hasRedBuff){player.redBuffTimer--;if(player.redBuffTimer<=0)player.hasRedBuff=false;}
  if(player.hasBlueBuff){player.blueBuffTimer--;if(player.blueBuffTimer<=0){player.hasBlueBuff=false;
  }}
  if(player.invincibleTimer>0) player.invincibleTimer--;

  // Fountain exit: grant 5s invincibility
  const nowInFountain=inFountain(player.x,player.y);
  if(wasInFountain&&!nowInFountain){player.invincibleTimer=300;fountainShieldTimer=300;}
  // While inside fountain, keep invincible (prevent edge-case damage)
  if(nowInFountain){player.invincibleTimer=Math.max(player.invincibleTimer,2);}
  wasInFountain=nowInFountain;
  if(fountainShieldTimer>0) fountainShieldTimer--;

  // Damage from standing on obstacles (stealth passive = immune)
  const h=HEROES[heroChoice];
  if(h.passiveType!=='stealth'&&player.invincibleTimer===0&&!phaseActive&&playerOnObstacle()){
    player.hp--;player.invincibleTimer=120;
    if(player.hp<=0){triggerGameOver();return;}
  }

  player.attackTimer++;
  const atkInterval=Math.max(6,ATTACK_INTERVAL-upgrades.eagle.count*6); // -0.1s per eagle upgrade
  if(player.attackTimer>=atkInterval&&!inFountain(player.x,player.y)){player.attackTimer=0;fireAtNearest();}
}

function fireAtNearest(){
  const range=getAttackRange();
  let nearest=null,nd=range;
  for(const m of minions){const d=dist(player,m);if(d<nd){nd=d;nearest={type:'minion',ref:m};}}
  if(boss.alive){const d=dist(player,boss)-120;if(d<nd){nd=d;nearest={type:'boss',ref:boss};}}
  if(redBuffs.some(b=>b.alive)){for(const rb of redBuffs){if(rb.alive){const d=dist(player,rb);if(d<nd){nd=d;nearest={type:'redbuff',ref:rb};}}}}
  if(blueBuffs.some(b=>b.alive)){for(const bb of blueBuffs){if(bb.alive){const d=dist(player,bb);if(d<nd){nd=d;nearest={type:'bluebuff',ref:bb};}}}}
  if(greenBuffs.some(b=>b.alive)){for(const gb of greenBuffs){if(gb.alive){const d=dist(player,gb);if(d<nd){nd=d;nearest={type:'greenbuff',ref:gb};}}}}
  if(!nearest){currentTargetType='';return;}
  currentTargetType=nearest.type;

  const bulletCount=1+upgrades.hero.count;
  const dx2=nearest.ref.x-player.x, dy2=nearest.ref.y-player.y;
  const baseAngle=Math.atan2(dy2,dx2);
  const totalDist2=Math.sqrt(dx2*dx2+dy2*dy2);
  const spreadAngle=bulletCount>1?Math.min(Math.PI*0.8,(bulletCount-1)*0.08):0;

  for(let b=0;b<bulletCount;b++){
    // First bullet tracks target, others spread at angles
    const angleOff=bulletCount<=1?0:(b-(bulletCount-1)/2)*(spreadAngle/(bulletCount-1));
    const isTracking=(b===0); // only first bullet tracks
    const angle=baseAngle+angleOff;
    const tx2=player.x+Math.cos(angle)*totalDist2;
    const ty2=player.y+Math.sin(angle)*totalDist2;
    const curveType=Math.floor(Math.random()*3);
    const curveDir=Math.random()<0.5?1:-1;
    const bleed=upgrades.blood.count>0;
    bullets.push({
      x:player.x,y:player.y,sx:player.x,sy:player.y,
      tx:isTracking?nearest.ref.x:tx2,ty:isTracking?nearest.ref.y:ty2,
      target:isTracking?nearest:null,
      speed:0.1,applyBurn:player.hasRedBuff,applyBleed:bleed,
      animFrame:0,animTimer:0,
      curveType,curveDir,totalDist:totalDist2,traveled:0,isTracking,
      hunterBonus:upgrades.hunter.count,
    });
  }
}

function updateBullets(){
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    // Accelerate
    b.speed=Math.min(b.speed+0.06, 5);
    // Animate fire frames
    b.animTimer++;
    if(b.animTimer>=4){b.animTimer=0;b.animFrame=(b.animFrame+1)%FIRE_FRAME_COUNT;}

    // Update target position to track living target (tracking bullets only)
    if(b.isTracking&&b.target){
      const tRef=b.target.ref;
      if(tRef&&tRef.hp!==undefined&&tRef.hp>0){
        b.tx=tRef.x; b.ty=tRef.y;
      }
    }

    // Distance to target
    const dx=b.tx-b.x, dy=b.ty-b.y;
    const d=Math.sqrt(dx*dx+dy*dy);

    // Homing: when close, get pulled toward target (tracking only)
    const homingRadius=80;
    let moveX,moveY;
    if(b.isTracking&&d<homingRadius){
      // Strong homing — fly directly at target
      if(d<b.speed||d<6){
        // Hit
        if(b.target) hitTarget(b.target,1,b.applyBurn,b.applyBleed,b.hunterBonus);
        bullets.splice(i,1);
        continue;
      }
      moveX=dx/d*b.speed;
      moveY=dy/d*b.speed;
    } else if(!b.isTracking&&b.traveled>=b.totalDist){
      // Non-tracking: past target, keep flying in locked direction
      if(!b.lockedDx){
        const a=Math.atan2(b.ty-b.sy,b.tx-b.sx);
        b.lockedDx=Math.cos(a);b.lockedDy=Math.sin(a);
      }
      b.traveled+=b.speed;
      moveX=b.lockedDx*b.speed;
      moveY=b.lockedDy*b.speed;
    } else {
      // Curved flight toward target
      const ndx=dx/d, ndy=dy/d;
      // Perpendicular for curve offset
      const perpX=-ndy, perpY=ndx;
      // Progress estimate for curve shape (0 at start, 1 near target)
      b.traveled+=b.speed;
      const totalEst=Math.max(b.totalDist, d+b.traveled);
      const t=Math.min(b.traveled/totalEst, 0.95);
      let offset=0;
      if(b.curveType===1) offset=Math.sin(t*Math.PI)*30*b.curveDir;
      else if(b.curveType===2) offset=Math.sin(t*Math.PI)*70*b.curveDir;
      // Blend: mostly toward target + curve offset
      moveX=ndx*b.speed + perpX*offset*0.03;
      moveY=ndy*b.speed + perpY*offset*0.03;
      // Normalize to speed
      const ml=Math.sqrt(moveX*moveX+moveY*moveY);
      if(ml>0){moveX=moveX/ml*b.speed;moveY=moveY/ml*b.speed;}
    }

    b.x+=moveX;
    b.y+=moveY;

    // Non-tracking bullets: destroy on hit, remove when off-screen
    if(!b.isTracking){
      let hit=false;
      for(const m of minions){
        if(dist(b,m)<20){hitTarget({type:'minion',ref:m},1,b.applyBurn,b.applyBleed,b.hunterBonus);hit=true;break;}
      }
      if(!hit&&boss.alive&&dist(b,boss)<130){hitTarget({type:'boss',ref:boss},1,b.applyBurn,b.applyBleed,b.hunterBonus);hit=true;}
      if(hit){bullets.splice(i,1);continue;}
      // Remove when outside view with margin
      const sx=b.x-camX,sy=b.y-camY;
      if(sx<-80||sx>VIEW_W+80||sy<-80||sy>VIEW_H+80){bullets.splice(i,1);continue;}
    }

    // Safety: remove tracking bullets if traveled too far
    if(b.isTracking&&b.traveled>b.totalDist*3){bullets.splice(i,1);}
  }
}

function hitTarget(target,dmg,applyBurn,applyBleed,hunterBonus){
  const e=target.ref;if(!e||e.hp===undefined) return;
  let totalDmg=dmg;
  // Hunter bonus: extra damage to boss
  if(hunterBonus&&(target.type==='boss')) totalDmg+=hunterBonus;
  e.hp-=totalDmg;
  if(applyBurn&&target.type!=='player'){e.burnTimer=360;e.burnDmgTimer=0;e.slowTimer=360;}
  // Bleed effect
  if(applyBleed&&target.type!=='player'){
    e.bleedTimer=e.bleedTimer||0;
    e.bleedTimer=600; // 10s bleed
    e.bleedRate=upgrades.blood.bleedRate;
    e.bleedDmgTimer=0;
  }
  // Knockback passive
  if(heroChoice>=0&&HEROES[heroChoice].passiveType==='knockback'&&target.type==='minion'){
    const dx=e.x-player.x,dy=e.y-player.y;
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d>1){e.x+=dx/d*30;e.y+=dy/d*30;}
  }
  if(e.hp<=0) killEntity(target);
}

function killEntity(target){
  const e=target.ref;
  const dir=e.dir||0;
  if(target.type==='minion'){
    const idx=minions.indexOf(e);
    if(idx>=0){addDeathEffect(e.x,e.y,72,dir);minions.splice(idx,1);}
    player.gold+=1;
    minionKillCount++;
    // Blood lord passive: heal every 500 kills
    if(heroChoice>=0&&HEROES[heroChoice].passiveType==='bloodlord'&&minionKillCount%100===0){
      if(player.hp<player.maxHp) player.hp++;
    }
  } else if(target.type==='boss'){
    addDeathEffect(boss.x,boss.y,240,dir);
    boss.alive=false;boss.respawnTimer=BOSS_RESPAWN;
    let goldReward=boss.gold;
    // Bounty passive: double boss gold
    if(heroChoice>=0&&HEROES[heroChoice].passiveType==='bounty') goldReward*=2;
    player.gold+=goldReward;
    bossType=randomBossType();
  } else if(target.type==='redbuff'){
    addDeathEffect(e.x,e.y,100,0);
    e.alive=false;e.respawnTimer=BUFF_RESPAWN;
    player.hasRedBuff=true;player.redBuffTimer=3600;
  } else if(target.type==='bluebuff'){
    addDeathEffect(e.x,e.y,100,0);
    e.alive=false;e.respawnTimer=BUFF_RESPAWN;
    player.hasBlueBuff=true;player.blueBuffTimer=3600;
  } else if(target.type==='greenbuff'){
    addDeathEffect(e.x,e.y,100,0);
    e.alive=false;e.respawnTimer=BUFF_RESPAWN;
    player.hp=player.maxHp;
  }
}

function updateBurnOnEntity(e){
  if(e.burnTimer>0){e.burnTimer--;e.burnDmgTimer++;
    if(e.burnDmgTimer>=12){e.burnDmgTimer=0;e.hp-=0.5;if(e.hp<=0)e.hp=0;}
  } else e.slowTimer=0;
  // Bleed
  if(e.bleedTimer>0){e.bleedTimer--;
    e.bleedDmgTimer=(e.bleedDmgTimer||0)+1;
    if(e.bleedDmgTimer>=60){e.bleedDmgTimer=0;e.hp-=(e.bleedRate||0.05);if(e.hp<=0)e.hp=0;}
  }
}

function updateWaves(){
  waveTimer--;
  if(waveTimer<=0&&waveSpawnQueue===0){waveSpawnQueue=getWaveCount();waveSpawnDelay=0;waveIndex++;waveTimer=getWaveInterval();}
  if(waveSpawnQueue>0){waveSpawnDelay++;if(waveSpawnDelay>=6){waveSpawnDelay=0;spawnMinion();waveSpawnQueue--;}}
}

function updateMinions(){
  for(let i=minions.length-1;i>=0;i--){
    const m=minions[i];
    if(m.hp<=0){addDeathEffect(m.x,m.y,72,m.dir);minions.splice(i,1);player.gold+=1;continue;}
    updateBurnOnEntity(m);
    if(m.hp<=0){addDeathEffect(m.x,m.y,72,m.dir);minions.splice(i,1);player.gold+=1;continue;}
    if(m.hitTimer>0) m.hitTimer--;
    const spd=m.slowTimer>0?m.speed*0.7:m.speed;
    const dir=steerMinion(m,player.x,player.y);
    const nx=m.x+dir.dx*spd,ny=m.y+dir.dy*spd;
    // Blood lord passive: minions can't enter river when boss alive
    const blockRiver=heroChoice>=0&&HEROES[heroChoice].passiveType==='bloodlord'&&boss.alive;
    if(inPlayable(nx,ny)&&!inFountain(nx,ny)&&!(blockRiver&&inRiver(nx,ny))){
      if(dir.dx!==0||dir.dy!==0) m.dir=dirFromDxDy(dir.dx,dir.dy);
      m.x=nx;m.y=ny;
    }
    // Animate
    m.animTimer++;
    if(m.animTimer>=10){m.animTimer=0;m.animFrame=(m.animFrame+1)%6;}

    if(player.invincibleTimer===0&&!ult.active&&ult.immunityTimer===0&&!phaseActive&&dist(player,m)<40){
      player.hp--;player.invincibleTimer=120;
      if(player.hp<=0){triggerGameOver();return;}
    }
  }
}

function updateBoss(){
  if(!boss.alive){
    boss.respawnTimer--;
    if(boss.respawnTimer<=0){
      boss.alive=true;boss.hp=bossType.hp;boss.maxHp=bossType.hp;boss.gold=bossType.gold;
      boss.x=BOSS_SPAWN.x;boss.y=BOSS_SPAWN.y;boss.chasing=false;
    }
    return;
  }
  updateBurnOnEntity(boss);
  if(boss.hp<=0){addDeathEffect(boss.x,boss.y,240,boss.dir);boss.alive=false;boss.respawnTimer=BOSS_RESPAWN;player.gold+=boss.gold;bossType=randomBossType();return;}
  if(inRiver(player.x,player.y)){boss.chasing=true;}
  else if(boss.chasing){boss.chasing=false;boss.hp=boss.maxHp;}

  // Boss: no animation, static frame

  if(boss.chasing){
    const dx=player.x-boss.x,dy=player.y-boss.y,d=Math.sqrt(dx*dx+dy*dy);
    if(d>boss.speed){boss.x+=dx/d*boss.speed;boss.y+=dy/d*boss.speed;boss.dir=dirFromDxDy(dx,dy);}
    if(player.invincibleTimer===0&&!ult.active&&!phaseActive&&dist(player,boss)<80){
      player.hp--;player.invincibleTimer=120;
      if(player.hp<=0){triggerGameOver();return;}
    }
  } else {
    const dx=BOSS_SPAWN.x-boss.x,dy=BOSS_SPAWN.y-boss.y,d=Math.sqrt(dx*dx+dy*dy);
    if(d>boss.speed){boss.x+=dx/d*boss.speed;boss.y+=dy/d*boss.speed;}
  }
}

function updateBuffs(){
  for(let i=0;i<redBuffs.length;i++){
    const rb=redBuffs[i],pos=RED_BUFF_POS[i];
    if(!rb.alive){rb.respawnTimer--;
      if(rb.respawnTimer<=0){rb.alive=true;rb.hp=rb.maxHp;rb.x=pos.x;rb.y=pos.y;}
    } else {updateBurnOnEntity(rb);
      if(rb.hp<=0){addDeathEffect(rb.x,rb.y,100,0);rb.alive=false;rb.respawnTimer=BUFF_RESPAWN;player.hasRedBuff=true;player.redBuffTimer=3600;}
    }
  }
  for(let i=0;i<blueBuffs.length;i++){
    const bb=blueBuffs[i],pos=BLUE_BUFF_POS[i];
    if(!bb.alive){bb.respawnTimer--;
      if(bb.respawnTimer<=0){bb.alive=true;bb.hp=bb.maxHp;bb.x=pos.x;bb.y=pos.y;}
    } else {
      if(bb.hp<=0){addDeathEffect(bb.x,bb.y,100,0);bb.alive=false;bb.respawnTimer=BUFF_RESPAWN;player.hasBlueBuff=true;player.blueBuffTimer=3600;}
    }
  }
  for(let i=0;i<greenBuffs.length;i++){
    const gb=greenBuffs[i],pos=GREEN_BUFF_POS[i];
    if(!gb.alive){gb.respawnTimer--;
      if(gb.respawnTimer<=0){gb.alive=true;gb.hp=gb.maxHp;gb.x=pos.x;gb.y=pos.y;}
    } else {
      if(gb.hp<=0){addDeathEffect(gb.x,gb.y,100,0);gb.alive=false;gb.respawnTimer=BUFF_RESPAWN;player.hp=player.maxHp;}
    }
  }
}

function updateUlt(){
  if(!ult.active) return;
  ult.progress+=1/ult.duration;
  if(ult.progress>=1){
    ult.progress=1;player.x=ult.tx;player.y=ult.ty;
    ult.active=false;ult.immunityTimer=60;
    for(let i=minions.length-1;i>=0;i--){
      if(dist({x:ult.tx,y:ult.ty},minions[i])<ult.landRadius){
        addDeathEffect(minions[i].x,minions[i].y,72,minions[i].dir);
        minions[i].hp-=999;
        if(minions[i].hp<=0){minions.splice(i,1);player.gold+=1;}
      }
    }
  } else {
    const t=ult.progress;
    player.x=ult.sx+(ult.tx-ult.sx)*t;player.y=ult.sy+(ult.ty-ult.sy)*t;
  }
}

function updateDeathEffects(){
  for(let i=deathEffects.length-1;i>=0;i--){
    const de=deathEffects[i];
    de.timer++;
    if(de.timer>=5){de.timer=0;de.frame++;}
    if(de.frame>=de.maxFrames){deathEffects.splice(i,1);}
  }
}

function triggerGameOver(){gameOver=true;}

function restartGame(){
  gamePhase='select';selectedHero=0;heroChoice=-1;
  gameOver=false;
  player.x=FOUNTAIN_POS.x;player.y=FOUNTAIN_POS.y;player.hp=3;player.gold=0;
  player.moving=false;player.targetX=FOUNTAIN_POS.x;player.targetY=FOUNTAIN_POS.y;
  player.attackTimer=0;player.invincibleTimer=0;player.animFrame=0;player.dir=0;
  player.hasRedBuff=false;player.hasBlueBuff=false;
  rCooldown=0;rMaxCooldown=R_COOLDOWN_BASE;
  ult.active=false;ult.immunityTimer=0;
  minions.length=0;bullets.length=0;deathEffects.length=0;
  OBSTACLES=generateObstacles();
  generateGroundMap();
  generateTreeBorder();
  generateWavePositions();
  generateAllBuffPos();
  bossType=randomBossType();
  boss.alive=false;boss.respawnTimer=300;boss.chasing=false;boss.animFrame=0;
  for(let i=0;i<redBuffs.length;i++){redBuffs[i].alive=false;redBuffs[i].respawnTimer=60;redBuffs[i].hp=redBuffs[i].maxHp;redBuffs[i].x=RED_BUFF_POS[i].x;redBuffs[i].y=RED_BUFF_POS[i].y;}
  for(let i=0;i<blueBuffs.length;i++){blueBuffs[i].alive=false;blueBuffs[i].respawnTimer=60;blueBuffs[i].hp=blueBuffs[i].maxHp;blueBuffs[i].x=BLUE_BUFF_POS[i].x;blueBuffs[i].y=BLUE_BUFF_POS[i].y;}
  for(let i=0;i<greenBuffs.length;i++){greenBuffs[i].alive=false;greenBuffs[i].respawnTimer=60;greenBuffs[i].hp=greenBuffs[i].maxHp;greenBuffs[i].x=GREEN_BUFF_POS[i].x;greenBuffs[i].y=GREEN_BUFF_POS[i].y;}
  tick=0;waveIndex=0;waveTimer=300;waveSpawnQueue=0;
  minionKillCount=0;phaseActive=false;phaseTimer=0;bloodMistActive=false;bloodMistTimer=0;castAnim.active=false;
  wasInFountain=true;fountainShieldTimer=0;currentTargetType='';
  shopOpen=false;totalPurchases=0;infiniteGold=false;
  for(const k of upgradeKeys){upgrades[k].count=0;}
  upgrades.blood.bleedRate=0.05;
  generateAltars();
}

function update(){
  if(gamePhase!=='playing'||gameOver) return;
  tick++;
  if(rCooldown>0) rCooldown--;
  // Blue buff: cap cooldown to 3 seconds (180 ticks)
  if(player.hasBlueBuff&&rCooldown>180) rCooldown=180;
  if(ult.immunityTimer>0) ult.immunityTimer--;
  waterTimer++;if(waterTimer>=60){waterTimer=0;waterFrame=(waterFrame+1)%WATER_FRAME_COUNT;}
  updateUlt();updatePlayer();updateWaves();updateMinions();
  updateBoss();updateBuffs();updateBullets();updateDeathEffects();updateAltars();
  if(clickMarker.active){clickMarker.timer--;if(clickMarker.timer<=0)clickMarker.active=false;}
  camX=Math.max(0,Math.min(WORLD_W-VIEW_W,player.x-VIEW_W/2));
  camY=Math.max(0,Math.min(WORLD_H-VIEW_H,player.y-VIEW_H/2));
}

function updateAltars(){
  for(const a of altars){
    if(!a.active) continue;
    a.attackTimer++;
    // Update all queued effect animations
    if(!a.effects) a.effects=[];
    for(let ei=a.effects.length-1;ei>=0;ei--){
      const ef=a.effects[ei];
      ef.timer++;
      const maxFrames=a.type==='lightning'?5:10;
      const frameDur=a.type==='lightning'?12:12;
      if(ef.timer>=frameDur){ef.timer=0;ef.frame++;}
      if(ef.frame>=maxFrames){a.effects.splice(ei,1);}
    }
    if(a.type==='lightning'){
      // Attack every 0.2s (12 ticks), range 200px
      if(a.attackTimer>=30){
        a.attackTimer=0;
        let nearest=null,nd=250;
        for(const m of minions){const d=dist(a,m);if(d<nd){nd=d;nearest=m;}}
        if(nearest){
          nearest.hp-=1;
          a.effects.push({x:nearest.x,y:nearest.y,frame:0,timer:0});
        }
      }
    } else {
      // Fire altar: every 10s (600 ticks), AoE 500px near player, 9999 dmg to minions
      if(a.attackTimer>=600){
        a.attackTimer=0;
        const fx=player.x+(Math.random()-0.5)*200;
        const fy=player.y+(Math.random()-0.5)*200;
        a.effects.push({x:fx,y:fy,frame:0,timer:0});
        for(let i=minions.length-1;i>=0;i--){
          if(dist({x:fx,y:fy},minions[i])<150){
            minions[i].hp-=9999;
          }
        }
      }
    }
  }
}

// ── Draw ───────────────────────────────────────────────────────────────────
function drawMap(){
  ctx.fillStyle='#000000';ctx.fillRect(0,0,VIEW_W,VIEW_H);

  // Non-playable
  ctx.save();ctx.fillStyle='#1e1e1e';ctx.beginPath();
  ctx.moveTo(wx(0),wy(0));ctx.lineTo(wx(WORLD_W),wy(0));ctx.lineTo(wx(WORLD_W),wy(WORLD_H));
  ctx.lineTo(wx(WORLD_H-RIVER_HALF),wy(WORLD_H));ctx.lineTo(wx(0),wy(RIVER_HALF));
  ctx.closePath();ctx.fill();ctx.restore();

  // River: base color + one wave shape per frame, tiled
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(wx(0),wy(RIVER_HALF));ctx.lineTo(wx(WORLD_W-RIVER_HALF),wy(WORLD_H));
  ctx.lineTo(wx(WORLD_W),wy(WORLD_H-RIVER_HALF));ctx.lineTo(wx(RIVER_HALF),wy(0));
  ctx.closePath();ctx.clip();
  // Base color
  ctx.fillStyle='#0B4151';ctx.fillRect(0,0,VIEW_W,VIEW_H);
  // Wave overlay: sparse wave sprites at pre-generated positions
  if(imgWater.complete&&imgWater.naturalWidth){
    const wv=WATER_WAVES[waterFrame];
    const srcW=imgWater.naturalWidth;
    ctx.globalAlpha=0.85;
    for(const wp of wavePositions){
      const sx=wx(wp.x)-WAVE_DRAW_W/2, sy=wy(wp.y)-WAVE_DRAW_H/2;
      if(sx>VIEW_W+50||sx<-WAVE_DRAW_W-50||sy>VIEW_H+50||sy<-WAVE_DRAW_H-50) continue;
      ctx.drawImage(imgWater, 0, wv.sy, srcW, wv.sh, sx, sy, WAVE_DRAW_W, WAVE_DRAW_H);
    }
    ctx.globalAlpha=1;
  }
  ctx.restore();

  // Obstacles with barrier sprite images
  for(const o of OBSTACLES){
    const sx=wx(o.x),sy=wy(o.y);
    if(sx<-200||sx>VIEW_W+200||sy<-200||sy>VIEW_H+200) continue;
    const img=imgBarriers[o.imgIdx];
    if(img.complete&&img.naturalWidth){
      ctx.drawImage(img,sx-o.w/2,sy-o.h/2,o.w,o.h);
    } else {
      ctx.fillStyle='#111';ctx.fillRect(sx-o.w/2,sy-o.h/2,o.w,o.h);
    }
  }

  // Tree border (left and bottom edges)
  for(const t of treeBorder){
    const sx=wx(t.x),sy=wy(t.y);
    if(sx<-100||sx>VIEW_W+100||sy<-100||sy>VIEW_H+100) continue;
    const img=imgTrees[t.imgIdx];
    if(img.complete&&img.naturalWidth){
      const aspect=img.naturalHeight/img.naturalWidth;
      const tw=t.sz, th=t.sz*aspect;
      ctx.drawImage(img,sx-tw/2,sy-th,tw,th);
    }
  }

  // Fountain with magic circle
  const fx=wx(FOUNTAIN_POS.x),fy=wy(FOUNTAIN_POS.y);
  const fSize=FOUNTAIN_RADIUS*2;
  ctx.save();ctx.globalAlpha=0.85;
  if(imgFountain.complete&&imgFountain.naturalWidth){
    ctx.drawImage(imgFountain,fx-fSize/2,fy-fSize/2,fSize,fSize);
  } else {
    ctx.fillStyle='#f5e06a';ctx.beginPath();ctx.arc(fx,fy,FOUNTAIN_RADIUS,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();

  // Buff zones (when dead)
  for(let i=0;i<blueBuffs.length;i++){
    if(!blueBuffs[i].alive){
      const pos=BLUE_BUFF_POS[i];
      ctx.save();ctx.globalAlpha=0.25;ctx.fillStyle='#6ab0f5';
      ctx.beginPath();ctx.arc(wx(pos.x),wy(pos.y),BUFF_RADIUS,0,Math.PI*2);ctx.fill();ctx.restore();
      ctx.fillStyle='#aac';ctx.font='10px Courier New';ctx.textAlign='center';
      ctx.fillText('蓝buff('+Math.ceil(blueBuffs[i].respawnTimer/60)+'s)',wx(pos.x),wy(pos.y)+5);
    }
  }
  for(let i=0;i<redBuffs.length;i++){
    if(!redBuffs[i].alive){
      const pos=RED_BUFF_POS[i];
      ctx.save();ctx.globalAlpha=0.25;ctx.fillStyle='#f5a0a0';
      ctx.beginPath();ctx.arc(wx(pos.x),wy(pos.y),BUFF_RADIUS,0,Math.PI*2);ctx.fill();ctx.restore();
      ctx.fillStyle='#caa';ctx.font='10px Courier New';ctx.textAlign='center';
      ctx.fillText('红buff('+Math.ceil(redBuffs[i].respawnTimer/60)+'s)',wx(pos.x),wy(pos.y)+5);
    }
  }
  for(let i=0;i<greenBuffs.length;i++){
    if(!greenBuffs[i].alive){
      const pos=GREEN_BUFF_POS[i];
      ctx.save();ctx.globalAlpha=0.25;ctx.fillStyle='#a0f5a0';
      ctx.beginPath();ctx.arc(wx(pos.x),wy(pos.y),BUFF_RADIUS,0,Math.PI*2);ctx.fill();ctx.restore();
      ctx.fillStyle='#aca';ctx.font='10px Courier New';ctx.textAlign='center';
      ctx.fillText('绿buff('+Math.ceil(greenBuffs[i].respawnTimer/60)+'s)',wx(pos.x),wy(pos.y)+5);
    }
  }

  // Boss spawn zone
  ctx.save();ctx.fillStyle='rgba(180,60,160,0.2)';
  ctx.beginPath();ctx.arc(wx(BOSS_SPAWN.x),wy(BOSS_SPAWN.y),BOSS_SPAWN_RADIUS,Math.PI*0.25,Math.PI*1.25);
  ctx.closePath();ctx.fill();ctx.strokeStyle='#c040a0';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  if(!boss.alive){
    ctx.fillStyle='#b070a0';ctx.font='10px Courier New';ctx.textAlign='center';
    ctx.fillText('boss('+Math.ceil(boss.respawnTimer/60)+'s)',wx(BOSS_SPAWN.x),wy(BOSS_SPAWN.y));
  }

  // World boundary
  ctx.strokeStyle='#cc0000';ctx.lineWidth=3;ctx.strokeRect(wx(0),wy(0),WORLD_W,WORLD_H);
}

function drawHealthBar(x,y,hp,maxHp,w,color){
  const bx=wx(x)-w/2,by=wy(y)-32;
  ctx.fillStyle='#222';ctx.fillRect(bx-1,by-1,w+2,7);
  ctx.fillStyle='#444';ctx.fillRect(bx,by,w,5);
  ctx.fillStyle=color;ctx.fillRect(bx,by,w*(Math.max(0,hp)/maxHp),5);
}

function drawEntities(){
  // Attack range
  ctx.save();ctx.globalAlpha=0.06;ctx.strokeStyle='#88aaff';ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(wx(player.x),wy(player.y),getAttackRange(),0,Math.PI*2);ctx.stroke();ctx.restore();

  // Ult landing indicator
  if(ult.active){
    ctx.save();ctx.globalAlpha=0.3;ctx.strokeStyle='#cc88ff';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(wx(ult.tx),wy(ult.ty),ult.landRadius,0,Math.PI*2);ctx.stroke();ctx.restore();
  }

  // Death effects (animated sprite)
  for(const de of deathEffects){
    const sx=wx(de.x),sy=wy(de.y);
    if(sx<-100||sx>VIEW_W+100||sy<-100||sy>VIEW_H+100) continue;
    const alpha=1-(de.frame/de.maxFrames)*0.5;
    ctx.save();ctx.globalAlpha=alpha;
    // Death sprite: 10 cols x 4 rows, 64x64
    const row=Math.min(de.dir,3);
    drawFrame(imgDeath,64,64,Math.min(de.frame,9),row,sx,sy,de.size,de.size);
    ctx.restore();
  }

  // Altars
  for(const a of altars){
    const asx=wx(a.x),asy=wy(a.y);
    if(asx<-100||asx>VIEW_W+100||asy<-100||asy>VIEW_H+100) continue;
    const imgs=a.type==='lightning'?imgLightningAltar:imgFireAltar;
    const aImg=imgs[a.imgIdx];
    ctx.save();
    if(!a.active) ctx.globalAlpha=0.4;
    if(aImg.complete&&aImg.naturalWidth){ctx.drawImage(aImg,asx-48,asy-48,96,96);}
    else{ctx.fillStyle=a.type==='lightning'?'#66aaff':'#ff6633';ctx.beginPath();ctx.arc(asx,asy,30,0,Math.PI*2);ctx.fill();}
    ctx.restore();
    // Attack effect animations (queued)
    if(a.effects){
      const eImgs=a.type==='lightning'?imgLightningAttack:imgFireAttack;
      for(const ef of a.effects){
        const esx=wx(ef.x),esy=wy(ef.y);
        const eImg=eImgs[Math.min(ef.frame,eImgs.length-1)];
        if(eImg&&eImg.complete&&eImg.naturalWidth){
          const esz=a.type==='lightning'?80:200;
          ctx.save();ctx.globalAlpha=0.9;
          ctx.drawImage(eImg,esx-esz/2,esy-esz,esz,esz*2);
          ctx.restore();
        }
      }
    }
  }

  // Minions (frame animated, two types)
  for(const m of minions){
    const sx=wx(m.x),sy=wy(m.y);
    if(sx<-50||sx>VIEW_W+50||sy<-50||sy>VIEW_H+50) continue;
    // Shadow
    if(imgShadow.complete&&imgShadow.naturalWidth){
      ctx.save();ctx.globalAlpha=0.5;
      ctx.drawImage(imgShadow,sx-18,sy+10,36,14);
      ctx.restore();
    }
    ctx.save();
    if(m.burnTimer>0){ctx.shadowColor='#ff4400';ctx.shadowBlur=8;}
    // Plant sprites: 6 cols x 4 rows, 64x64
    const mImg=m.type===0?imgPlant3:imgPlant1;
    const row=Math.min(m.dir,3);
    const col=m.animFrame%6;
    if(!drawFrame(mImg,64,64,col,row,sx,sy,72,72)){
      ctx.fillStyle=m.type===0?'#cc3333':'#33cc33';
      ctx.beginPath();ctx.arc(sx,sy,16,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    drawHealthBar(m.x,m.y,m.hp,m.maxHp,48,m.type===0?'#e03030':'#30e030');
  }

  // Red buffs (static image)
  for(const rb of redBuffs){
    if(!rb.alive) continue;
    const sx=wx(rb.x),sy=wy(rb.y);
    ctx.save();
    const p=0.7+0.3*Math.sin(tick*0.07);ctx.globalAlpha=p;
    if(imgRedBuff.complete&&imgRedBuff.naturalWidth){
      ctx.drawImage(imgRedBuff,sx-30,sy-30,60,60);
    } else {
      ctx.fillStyle='#dd2200';ctx.beginPath();ctx.arc(sx,sy,30,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    drawHealthBar(rb.x,rb.y,rb.hp,rb.maxHp,40,'#e03030');
  }

  // Blue buffs (static image)
  for(const bb of blueBuffs){
    if(!bb.alive) continue;
    const sx=wx(bb.x),sy=wy(bb.y);
    ctx.save();
    const p=0.7+0.3*Math.sin(tick*0.07+Math.PI);ctx.globalAlpha=p;
    if(imgBlueBuff.complete&&imgBlueBuff.naturalWidth){
      ctx.drawImage(imgBlueBuff,sx-30,sy-30,60,60);
    } else {
      ctx.fillStyle='#0033cc';ctx.beginPath();ctx.arc(sx,sy,30,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    drawHealthBar(bb.x,bb.y,bb.hp,bb.maxHp,40,'#3399ff');
  }

  // Green buffs (static image, uses blue.webp)
  for(const gb of greenBuffs){
    if(!gb.alive) continue;
    const sx=wx(gb.x),sy=wy(gb.y);
    ctx.save();
    const p=0.7+0.3*Math.sin(tick*0.07+Math.PI*0.5);ctx.globalAlpha=p;
    if(imgGreenBuff.complete&&imgGreenBuff.naturalWidth){
      ctx.drawImage(imgGreenBuff,sx-30,sy-30,60,60);
    } else {
      ctx.fillStyle='#00cc33';ctx.beginPath();ctx.arc(sx,sy,30,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    drawHealthBar(gb.x,gb.y,gb.hp,gb.maxHp,40,'#33ff66');
  }

  // Boss (animated sprite, 256x256 sheet)
  // Boss sheets: content varies, use 2x2 grid of 128x128 as 4-frame idle animation
  if(boss.alive){
    const sx=wx(boss.x),sy=wy(boss.y);
    ctx.save();
    if(boss.burnTimer>0){ctx.shadowColor='#ff4400';ctx.shadowBlur=12;}
    const bImg=imgBosses[bossType.imgIdx];
    if(bImg.complete&&bImg.naturalWidth){
      // Full single image, draw entire 256x256 scaled to display size
      ctx.drawImage(bImg,0,0,256,256,sx-135,sy-135,270,270);
    } else {
      ctx.fillStyle='#7700cc';ctx.beginPath();ctx.arc(sx,sy,84,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    drawHealthBar(boss.x,boss.y,boss.hp,boss.maxHp,160,'#cc44ff');
    ctx.fillStyle='#fff';ctx.font='bold 10px Courier New';ctx.textAlign='center';
    ctx.fillText(Math.ceil(Math.max(0,boss.hp))+'/'+boss.maxHp,wx(boss.x),wy(boss.y)-36);
  }

  // Click marker
  if(clickMarker.active){
    const cmx=wx(clickMarker.x),cmy=wy(clickMarker.y);
    const alpha=clickMarker.timer/clickMarker.maxTimer;
    const scale=1.2-0.4*alpha; // shrinks as it fades
    const sz=32*scale;
    ctx.save();ctx.globalAlpha=alpha*0.7;
    if(imgStar.complete&&imgStar.naturalWidth){
      ctx.drawImage(imgStar,cmx-sz/2,cmy-sz/2,sz,sz);
    } else {
      ctx.strokeStyle='#aaf';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(cmx,cmy,sz/2,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }

  // Bullets (fire spell frame animation)
  for(const b of bullets){
    const bsx=wx(b.x),bsy=wy(b.y);
    if(bsx<-60||bsx>VIEW_W+60||bsy<-60||bsy>VIEW_H+60) continue;
    // Angle: tracking bullets point toward target, non-tracking point in travel direction
    let angle;
    if(b.isTracking){
      angle=Math.atan2(b.ty-b.y, b.tx-b.x)+Math.PI;
    } else if(b.lockedDx!==undefined){
      angle=Math.atan2(b.lockedDy, b.lockedDx)+Math.PI;
    } else {
      angle=Math.atan2(b.ty-b.sy, b.tx-b.sx)+Math.PI;
    }
    const fImg=imgFireFrames[b.animFrame%FIRE_FRAME_COUNT];
    ctx.save();
    ctx.translate(bsx,bsy);
    ctx.rotate(angle);
    if(fImg.complete&&fImg.naturalWidth){
      // Draw fire frame scaled down, 640x360 -> 48x27
      ctx.drawImage(fImg,-12,-7,24,14);
    } else {
      ctx.fillStyle='#ffe066';
      ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  // Player (animated sprite only during ult, static direction otherwise)
  if(ult.active){
    const t=ult.progress;
    const px=ult.sx+(ult.tx-ult.sx)*t,py=ult.sy+(ult.ty-ult.sy)*t;
    const arc=Math.sin(t*Math.PI)*60;
    const sx2=wx(px),sy2=wy(py)-arc;
    ctx.save();ctx.shadowColor='#cc88ff';ctx.shadowBlur=20;
    const pSize=100+arc*0.5;
    // Ult: loop through all 10 attack frames continuously
    const ultFrame=Math.floor(tick/4)%10;
    if(!drawFrame(imgPlayer,64,64,ultFrame,player.dir,sx2,sy2,pSize,pSize)){
      ctx.fillStyle='#888';ctx.beginPath();ctx.arc(sx2,sy2,40,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  } else {
    const sx=wx(player.x),sy=wy(player.y);
    // Shadow
    if(imgShadow.complete&&imgShadow.naturalWidth){
      ctx.save();ctx.globalAlpha=0.5;
      ctx.drawImage(imgShadow,sx-26,sy+1,52,20);
      ctx.restore();
    }
    ctx.save();
    // Damage invincibility: flicker (but not in fountain or during fountain shield)
    const inFountainNow=inFountain(player.x,player.y);
    if(player.invincibleTimer>0&&fountainShieldTimer<=0&&!inFountainNow&&Math.floor(tick/4)%2===0) ctx.globalAlpha=0.4;
    // Fountain / fountain shield: golden aura
    if(fountainShieldTimer>0||inFountainNow){
      const pulse=0.4+0.2*Math.sin(tick*0.15);
      ctx.shadowColor='#ffd700';ctx.shadowBlur=25+10*Math.sin(tick*0.1);
      // Draw golden circle behind player
      const grd=ctx.createRadialGradient(sx,sy,20,sx,sy,55);
      grd.addColorStop(0,'rgba(255,215,0,'+pulse+')');
      grd.addColorStop(1,'rgba(255,215,0,0)');
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(sx,sy,55,0,Math.PI*2);ctx.fill();
    }
    if(player.hasRedBuff){ctx.shadowColor='#ff4400';ctx.shadowBlur=10;}
    if(player.hasBlueBuff){ctx.shadowColor='#3399ff';ctx.shadowBlur=10;}
    // Idle/walk or cast animation
    if(castAnim.active){
      // Play attack animation during cast
      const castFrame=Math.floor(tick/4)%10;
      if(!drawFrame(imgPlayer,64,64,castFrame,player.dir,sx,sy,100,100)){
        ctx.fillStyle='#888';ctx.beginPath();ctx.arc(sx,sy,40,0,Math.PI*2);ctx.fill();
      }
    } else {
      // Normal: walk sprite, cycle all 8 frames
      const walkFrame=Math.floor(tick/8)%8;
      if(!drawFrame(imgPlayerWalk,64,64,walkFrame,player.dir,sx,sy,100,100)){
        ctx.fillStyle='#888';ctx.beginPath();ctx.arc(sx,sy,40,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#444';ctx.lineWidth=3;ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawHUD(){
  ctx.save();
  // HP
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.beginPath();ctx.roundRect(8,8,130,38,6);ctx.fill();
  ctx.fillStyle='#aaa';ctx.font='bold 10px Courier New';ctx.textAlign='left';ctx.fillText('HP',14,23);
  for(let i=0;i<player.maxHp;i++){
    ctx.fillStyle=i<player.hp?'#e03030':'#444';ctx.font='18px serif';ctx.fillText('♥',36+i*30,30);
  }
  // Gold
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.beginPath();ctx.roundRect(VIEW_W-95,8,87,38,6);ctx.fill();
  ctx.fillStyle='#ffd700';ctx.font='bold 13px Courier New';ctx.textAlign='right';
  ctx.fillText('⬡ '+player.gold,VIEW_W-12,32);
  // Wave
  ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();ctx.roundRect(VIEW_W/2-70,8,140,22,4);ctx.fill();
  ctx.fillStyle='#ccc';ctx.font='bold 11px Courier New';ctx.textAlign='center';
  const nextWaveSec=Math.ceil(waveTimer/60);
  if(waveSpawnQueue>0){
    ctx.fillText('第 '+waveIndex+' 波 进行中',VIEW_W/2,24);
  } else {
    ctx.fillText('第 '+(waveIndex+1)+' 波 '+nextWaveSec+'s',VIEW_W/2,24);
  }
  // Buffs
  let biy=52;
  if(player.hasRedBuff){
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();ctx.roundRect(8,biy,100,20,4);ctx.fill();
    ctx.fillStyle='#ff6633';ctx.font='bold 10px Courier New';ctx.textAlign='left';
    ctx.fillText('🔥灼伤 '+Math.ceil(player.redBuffTimer/60)+'s',12,biy+14);biy+=24;
  }
  if(player.hasBlueBuff){
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();ctx.roundRect(8,biy,100,20,4);ctx.fill();
    ctx.fillStyle='#66aaff';ctx.font='bold 10px Courier New';ctx.textAlign='left';
    ctx.fillText('💧冷却3s '+Math.ceil(player.blueBuffTimer/60)+'s',12,biy+14);
  }
  // R cooldown
  const bx=VIEW_W/2,by=VIEW_H-22;
  ctx.fillStyle='rgba(0,0,0,0.65)';ctx.beginPath();ctx.roundRect(bx-70,by-26,140,34,6);ctx.fill();
  ctx.fillStyle='#222';ctx.fillRect(bx-54,by-10,108,10);
  ctx.fillStyle=rCooldown===0?'#aa44ff':'#553388';
  ctx.fillRect(bx-54,by-10,108*(1-rCooldown/rMaxCooldown),10);
  ctx.strokeStyle='#7733cc';ctx.lineWidth=1;ctx.strokeRect(bx-54,by-10,108,10);
  ctx.fillStyle=rCooldown===0?'#cc88ff':'#888';ctx.font='bold 11px Courier New';ctx.textAlign='center';
  const ultLabel=heroChoice>=0?HEROES[heroChoice].ultName:'势不可挡';
  ctx.fillText(rCooldown===0?'[R] '+ultLabel+' 就绪':'[R] '+Math.ceil(rCooldown/60)+'s',bx,by-14);
  // Minimap
  const mmW=110,mmH=110,mx=VIEW_W-mmW-8,my=VIEW_H-mmH-8;
  ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(mx,my,mmW,mmH);
  ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.strokeRect(mx,my,mmW,mmH);
  ctx.fillStyle='#1a4a8a';ctx.beginPath();
  ctx.moveTo(mx,my+mmH*(RIVER_HALF/WORLD_H));
  ctx.lineTo(mx+mmW*(WORLD_W-RIVER_HALF)/WORLD_W,my+mmH);
  ctx.lineTo(mx+mmW,my+mmH*(WORLD_H-RIVER_HALF)/WORLD_H);
  ctx.lineTo(mx+mmW*(RIVER_HALF/WORLD_W),my);ctx.closePath();ctx.fill();
  ctx.fillStyle='#cc3333';
  for(const m of minions){ctx.beginPath();ctx.arc(mx+(m.x/WORLD_W)*mmW,my+(m.y/WORLD_H)*mmH,1.5,0,Math.PI*2);ctx.fill();}
  if(boss.alive){ctx.fillStyle='#cc44ff';ctx.beginPath();ctx.arc(mx+(boss.x/WORLD_W)*mmW,my+(boss.y/WORLD_H)*mmH,3,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#88aaff';ctx.beginPath();ctx.arc(mx+(player.x/WORLD_W)*mmW,my+(player.y/WORLD_H)*mmH,3,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.4)';ctx.lineWidth=0.8;
  ctx.strokeRect(mx+(camX/WORLD_W)*mmW,my+(camY/WORLD_H)*mmH,(VIEW_W/WORLD_W)*mmW,(VIEW_H/WORLD_H)*mmH);

  // Buff effect tooltip when attacking a buff
  if(currentTargetType==='redbuff'||currentTargetType==='bluebuff'||currentTargetType==='greenbuff'){
    let tipText='',tipColor='';
    if(currentTargetType==='redbuff'){tipText='🔥 击败后：普攻附带灼伤，每0.2秒造成0.5伤害并减速30%，持续60秒';tipColor='#ff6633';}
    else if(currentTargetType==='bluebuff'){tipText='💧 击败后：大招冷却缩短为3秒，持续60秒';tipColor='#66aaff';}
    else if(currentTargetType==='greenbuff'){tipText='💚 击败后：立即回满血量';tipColor='#66ff66';}
    const tw=ctx.measureText(tipText).width;
    const tpx=VIEW_W/2,tpy=VIEW_H-58;
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.beginPath();ctx.roundRect(tpx-tw/2-10,tpy-14,tw+20,22,5);ctx.fill();
    ctx.fillStyle=tipColor;ctx.font='bold 11px Courier New';ctx.textAlign='center';
    ctx.fillText(tipText,tpx,tpy);
  }

  // Fountain hint
  if(inFountain(player.x,player.y)&&!shopOpen){
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.beginPath();ctx.roundRect(VIEW_W/2-80,VIEW_H/2-15,160,30,6);ctx.fill();
    ctx.fillStyle='#e0c060';ctx.font='bold 12px Courier New';ctx.textAlign='center';
    ctx.fillText('按 P 打开供奉面板',VIEW_W/2,VIEW_H/2+4);
  }

  ctx.restore();

  // Shop panel overlay
  if(shopOpen) drawShop();
}

function drawShop(){
  ctx.save();
  const px=VIEW_W/2-200,py=20,pw=400,ph=VIEW_H-40;
  ctx.fillStyle='rgba(10,10,20,0.92)';ctx.beginPath();ctx.roundRect(px,py,pw,ph,10);ctx.fill();
  ctx.strokeStyle='#e0c060';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#e0c060';ctx.font='bold 18px Courier New';ctx.textAlign='center';
  ctx.fillText('供奉面板',VIEW_W/2,py+28);
  ctx.fillStyle='#ffd700';ctx.font='12px Courier New';
  ctx.fillText('金币: '+player.gold,VIEW_W/2,py+48);

  // Infinite gold toggle
  const tgX=px+pw-110,tgY=py+38,tgW=100,tgH=20;
  ctx.fillStyle=infiniteGold?'#ffd700':'rgba(255,255,255,0.15)';
  ctx.beginPath();ctx.roundRect(tgX,tgY,tgW,tgH,4);ctx.fill();
  ctx.fillStyle=infiniteGold?'#1a1a2e':'#888';ctx.font='bold 10px Courier New';ctx.textAlign='center';
  ctx.fillText(infiniteGold?'∞ 无限金币 ON':'∞ 无限金币',tgX+tgW/2,tgY+14);

  for(let i=0;i<upgradeKeys.length;i++){
    const key=upgradeKeys[i];
    const u=upgrades[key];
    const iy=py+62+i*48;
    const price=getPrice(key);
    const canBuy=(infiniteGold||player.gold>=price)&&u.count<u.max;

    ctx.fillStyle='rgba(255,255,255,0.05)';
    ctx.beginPath();ctx.roundRect(px+12,iy-4,pw-24,42,6);ctx.fill();

    ctx.fillStyle='#fff';ctx.font='bold 13px Courier New';ctx.textAlign='left';
    ctx.fillText(u.name,px+20,iy+14);
    ctx.fillStyle='#aaa';ctx.font='11px Courier New';
    ctx.fillText(u.getDesc(),px+20,iy+28);

    // Buy button
    const btnX=px+pw-80,btnY=iy+2,btnW=60,btnH=24;
    ctx.fillStyle=canBuy?'#e0c060':'#555';
    ctx.beginPath();ctx.roundRect(btnX,btnY,btnW,btnH,4);ctx.fill();
    ctx.fillStyle=canBuy?'#1a1a2e':'#888';ctx.font='bold 11px Courier New';ctx.textAlign='center';
    if(u.count>=u.max) ctx.fillText('已满',btnX+btnW/2,btnY+16);
    else ctx.fillText(price+'G',btnX+btnW/2,btnY+16);
  }

  ctx.fillStyle='#888';ctx.font='10px Courier New';ctx.textAlign='center';
  ctx.fillText('按 P 或 ESC 关闭',VIEW_W/2,py+ph-12);
  ctx.restore();
}

function drawGameOver(){
  ctx.save();ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.fillStyle='#e03030';ctx.font='bold 48px Courier New';ctx.textAlign='center';
  ctx.fillText('游戏结束',VIEW_W/2,VIEW_H/2-30);
  ctx.fillStyle='#ffd700';ctx.font='bold 20px Courier New';
  ctx.fillText('金币: '+player.gold+'  波次: '+waveIndex,VIEW_W/2,VIEW_H/2+20);
  ctx.fillStyle='#aaa';ctx.font='14px Courier New';
  ctx.fillText('按 ESC 重新开始',VIEW_W/2,VIEW_H/2+55);
  ctx.restore();
}

function drawSelectScreen(){
  ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.fillStyle='#e0c060';ctx.font='bold 28px Courier New';ctx.textAlign='center';
  ctx.fillText('选择神力',VIEW_W/2,36);

  // Hero icons on left
  for(let i=0;i<5;i++){
    const iy=55+i*78;
    const isSelected=i===selectedHero;
    const sz=isSelected?72:60;
    const ix=isSelected?24:30;
    // Background highlight
    if(isSelected){
      ctx.fillStyle='rgba(255,200,60,0.2)';
      ctx.beginPath();ctx.roundRect(ix-6,iy-6,sz+12,sz+12,8);ctx.fill();
      ctx.strokeStyle='#e0c060';ctx.lineWidth=2;ctx.stroke();
    }
    const img=imgHeroes[i];
    if(img.complete&&img.naturalWidth){
      ctx.drawImage(img,ix,iy,sz,sz);
    } else {
      ctx.fillStyle='#333';ctx.fillRect(ix,iy,sz,sz);
    }
  }

  // Detail panel on right
  const h=HEROES[selectedHero];
  const px=120,py=60;
  ctx.fillStyle='rgba(0,0,0,0.4)';
  ctx.beginPath();ctx.roundRect(px,py,VIEW_W-px-20,VIEW_H-py-60,10);ctx.fill();

  ctx.fillStyle='#fff';ctx.font='bold 20px Courier New';ctx.textAlign='left';
  ctx.fillText(h.name,px+16,py+30);

  ctx.fillStyle='#e03030';ctx.font='16px Courier New';
  ctx.fillText('♥ 血量: '+h.hp,px+16,py+58);

  ctx.fillStyle='#cc88ff';ctx.font='bold 15px Courier New';
  ctx.fillText('大招: '+h.ultName,px+16,py+88);
  ctx.fillStyle='#bbb';ctx.font='13px Courier New';
  // Word wrap ult desc
  wrapText(ctx,h.ultDesc,px+30,py+108,VIEW_W-px-60,18);

  ctx.fillStyle='#66ccff';ctx.font='bold 15px Courier New';
  ctx.fillText('被动: '+h.passiveName,px+16,py+160);
  ctx.fillStyle='#bbb';ctx.font='13px Courier New';
  wrapText(ctx,h.passiveDesc,px+30,py+180,VIEW_W-px-60,18);

  // Portrait large
  const pImg=imgHeroes[selectedHero];
  if(pImg.complete&&pImg.naturalWidth){
    ctx.save();ctx.globalAlpha=0.3;
    ctx.drawImage(pImg,VIEW_W-200,py+20,160,160);
    ctx.restore();
  }

  // Confirm button
  ctx.fillStyle='#e0c060';
  ctx.beginPath();ctx.roundRect(VIEW_W/2-60,VIEW_H-48,120,32,6);ctx.fill();
  ctx.fillStyle='#1a1a2e';ctx.font='bold 14px Courier New';ctx.textAlign='center';
  ctx.fillText('确认选择',VIEW_W/2,VIEW_H-27);
}

function wrapText(c,text,x,y,maxW,lineH){
  let line='';
  for(let i=0;i<text.length;i++){
    const test=line+text[i];
    if(c.measureText(test).width>maxW&&line.length>0){
      c.fillText(line,x,y);y+=lineH;line=text[i];
    } else line=test;
  }
  if(line) c.fillText(line,x,y);
}

// Fog of war offscreen canvas (reused)
const fogCanvas=document.createElement('canvas');
fogCanvas.width=VIEW_W;fogCanvas.height=VIEW_H;
const fctx=fogCanvas.getContext('2d');

function drawLoadingScreen(){
  ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,VIEW_W,VIEW_H);
  // Cover image as background
  if(imgCover.complete&&imgCover.naturalWidth){
    const iw=imgCover.naturalWidth,ih=imgCover.naturalHeight;
    const scale=Math.max(VIEW_W/iw,VIEW_H/ih);
    const dw=iw*scale,dh=ih*scale;
    ctx.save();ctx.globalAlpha=0.5;
    ctx.drawImage(imgCover,(VIEW_W-dw)/2,(VIEW_H-dh)/2,dw,dh);
    ctx.restore();
  }
  // Title
  ctx.fillStyle='#e0c060';ctx.font='bold 36px Courier New';ctx.textAlign='center';
  ctx.fillText('史莱姆突围',VIEW_W/2,VIEW_H/2-40);
  // Progress
  const loaded=allImages.filter(img=>(img.complete&&img.naturalWidth)||img._failed).length;
  const total=allImages.length;
  const pct=total>0?loaded/total:0;
  // Progress bar
  const barW=260,barH=14,barX=VIEW_W/2-barW/2,barY=VIEW_H/2+10;
  ctx.fillStyle='#222';ctx.beginPath();ctx.roundRect(barX-2,barY-2,barW+4,barH+4,6);ctx.fill();
  ctx.fillStyle='#333';ctx.fillRect(barX,barY,barW,barH);
  ctx.fillStyle='#7b2ff7';ctx.fillRect(barX,barY,barW*pct,barH);
  ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.strokeRect(barX,barY,barW,barH);
  // Percentage text
  ctx.fillStyle='#aaa';ctx.font='12px Courier New';
  ctx.fillText('加载资源中... '+loaded+'/'+total,VIEW_W/2,barY+barH+20);
  // Transition to select when done
  if(loaded>=total) gamePhase='select';
}

function draw(){
  if(gamePhase==='loading'){drawLoadingScreen();return;}
  if(gamePhase==='select'){drawSelectScreen();return;}
  ctx.clearRect(0,0,VIEW_W,VIEW_H);
  drawMap();
  drawEntities();

  // Blood mist visual
  if(bloodMistActive){
    ctx.save();ctx.globalAlpha=0.15+0.05*Math.sin(tick*0.1);
    ctx.fillStyle='#880022';
    const range=getAttackRange();
    ctx.beginPath();ctx.arc(wx(bloodMistX),wy(bloodMistY),range,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  // Fog of war
  const range=getAttackRange();
  fctx.clearRect(0,0,VIEW_W,VIEW_H);
  fctx.globalCompositeOperation='source-over';
  fctx.fillStyle='rgba(29,31,42,0.45)';
  fctx.fillRect(0,0,VIEW_W,VIEW_H);
  fctx.globalCompositeOperation='destination-out';
  const fpx=wx(player.x),fpy=wy(player.y);
  const grd=fctx.createRadialGradient(fpx,fpy,range*0.6,fpx,fpy,range);
  grd.addColorStop(0,'rgba(0,0,0,1)');
  grd.addColorStop(1,'rgba(0,0,0,0)');
  fctx.fillStyle=grd;
  fctx.beginPath();fctx.arc(fpx,fpy,range,0,Math.PI*2);fctx.fill();
  ctx.drawImage(fogCanvas,0,0);
  drawHUD();
  if(gameOver) drawGameOver();
}

// ── Init & Loop ────────────────────────────────────────────────────────────
boss.respawnTimer=300;
for(const rb of redBuffs) rb.respawnTimer=60;
for(const bb of blueBuffs) bb.respawnTimer=60;
for(const gb of greenBuffs) gb.respawnTimer=60;
let lastTime=0;
const FRAME_TIME=1000/60; // target 60fps
let accumulator=0;
function loop(now){
  if(!lastTime) lastTime=now;
  accumulator+=now-lastTime;
  lastTime=now;
  // Cap to avoid spiral of death
  if(accumulator>200) accumulator=200;
  while(accumulator>=FRAME_TIME){
    update();
    accumulator-=FRAME_TIME;
  }
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
