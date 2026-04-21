(function(){
'use strict';

var canvas=document.getElementById('game');
var ctx=canvas.getContext('2d');

// 3:4 aspect ratio
var W=450, H=600;
canvas.width=W; canvas.height=H;

function resize(){
  var s=Math.min(window.innerWidth/W, window.innerHeight/H);
  canvas.style.width=(W*s)+'px';
  canvas.style.height=(H*s)+'px';
}
window.addEventListener('resize',resize); resize();

// ============================================================
// ASSET PRELOADER — fetch full blob then decode
// ============================================================
// Collect all image paths first, load them via fetch+blob to guarantee
// complete binary data before handing to Image elements.
var assetPaths = {
  player: 'assets/jump.webp',
  fire: 'assets/fire.webp',
  shield: 'assets/shield.webp',
  thunder: 'assets/thunder.webp',
  tooth: 'assets/tooth.webp',
  bg: [],
  cat: [],
  skin: {}
};
for(var i=1;i<=11;i++) assetPaths.bg.push('assets/'+i+'.webp');
for(var ci=1;ci<=11;ci++) assetPaths.cat.push('assets/cat/cat'+ci+'.webp');
for(var si=1;si<=7;si++) assetPaths.skin[si]='assets/skin'+si+'.webp';

// Flatten all paths for preloading
var allPaths = [assetPaths.player, assetPaths.fire, assetPaths.shield, assetPaths.thunder, assetPaths.tooth]
  .concat(assetPaths.bg)
  .concat(assetPaths.cat);
for(var sk2=1;sk2<=7;sk2++) allPaths.push(assetPaths.skin[sk2]);

var totalImages = allPaths.length;
var loadedCount = 0;
var gameStarted = false;

// Reliable image loader: fetch blob → objectURL → Image → decode
function loadImage(src) {
  return fetch(src)
    .then(function(r) { if(!r.ok) throw 0; return r.blob(); })
    .then(function(b) {
      var img = new Image();
      img.src = URL.createObjectURL(b);
      return img.decode ? img.decode().then(function(){ return img; }) : Promise.resolve(img);
    })
    .catch(function() {
      // Fallback: try direct load
      var img = new Image();
      img.src = src;
      return new Promise(function(resolve) {
        img.onload = function(){ resolve(img); };
        img.onerror = function(){ resolve(img); };
      });
    })
    .then(function(img) {
      loadedCount++;
      drawLoadingScreen();
      return img;
    });
}

// ============================================================
// BACKGROUND IMAGES (11 layers by altitude)
// ============================================================
var bgImgs=[];

// ============================================================
// GAME STATE
// ============================================================
var GRAVITY_BASE=0.12;
var BOUNCE_SPEED=10.8;
var SWING_SPEED=0.04;
var SPRITE_W=60;
var SPRITE_H=72;
var BUTT_RATIO=0.5;

var playerImg=null;
var fireImg=null;
var shieldImg=null;
var thunderImg=null;
var toothImg=null;
var catImgs=[];
var skinImgs={};
var LEVEL_SKINS=[null,null,'skin3','skin1','skin1','skin2','skin2','skin4','skin5','skin6','skin7'];

// ============================================================
// BOSS SYSTEM
// ============================================================
var BOSS_HP=[50,60,70,100,130,160,190,300,600,1200,2400];

// ============================================================
// SKILL DEFINITIONS
// ============================================================
var ALL_SKILLS=[
  {id:'steelMouse', name:'鼠之钢', desc:'累计关卡踩踏数，返还给boss'},
  {id:'hakimiRush', name:'哈基米突袭', desc:'每次攻击boss时，连续突击四次'},
  {id:'flameStorm', name:'烈焰风暴', desc:'每2秒释放火焰之种弹跳攻击boss'},
  {id:'soulSong',   name:'镇魂歌', desc:'有5%概率秒杀boss'},
  {id:'sunShield',  name:'日炎圣盾', desc:'每0.2秒对附近boss造成1灼烧伤害'},
  {id:'energyBlast', name:'盈能冲击', desc:'随前进距离充能，充能完成打出20伤害'},
  {id:'stormBlade', name:'暴风鼠刃', desc:'每秒发射鼠刃造成1伤害，6个时收回再次伤害'},
  {id:'furyGene', name:'狂怒基因', desc:'怒气积满后体型增大，伤害提升'}
];

function getPlayerImg(){
  var skinKey=LEVEL_SKINS[state.level];
  if(skinKey){
    var num=parseInt(skinKey.replace('skin',''));
    var img=skinImgs[num];
    if(img) return img;
  }
  return playerImg;
}

// ============================================================
// LEVEL SYSTEM
// ============================================================
var LEVEL_HEIGHTS=[2500,4000,6000,8000,10000,15000,20000,30000,45000,70000,100000];
var LEVEL_GRAVITY_MULT=[1.0,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.2,0.1,0.1];
// Cumulative altitude thresholds for finish lines
var LEVEL_THRESHOLDS=[];
(function(){
  var sum=0;
  for(var i=0;i<LEVEL_HEIGHTS.length;i++){
    sum+=LEVEL_HEIGHTS[i];
    LEVEL_THRESHOLDS.push(sum);
  }
})();
// LEVEL_THRESHOLDS = [1000, 3000, 7000, 15000, 25000, 40000, 60000, 90000, 135000, 205000, 305000]

var state={
  phase:'title', // title, skillSelect, play, victory
  level:0,
  camX:0, camY:0,
  px:W/2, py:H*0.7,
  vx:0, vy:0,
  springAngle:Math.PI/2,
  swingDir:0,
  altitude:0,
  time:0,
  obstacles:[],
  wallSegments:[],
  wallWidth:20,
  nextObstacleY:0,
  nextWallY:0,
  levelBanner:0,
  // Boss
  boss:null, // {y, hp, maxHp, defeated}
  bossHitCooldown:0,
  // Skills
  skills:[], // selected skill ids
  skillChoices:[], // 3 random skills to choose from
  skillsPicked:0,
  // Skill: 鼠之钢
  steelCount:0,
  steelUsedThisLevel:false,
  // Skill: 哈基米突袭
  rushHitsLeft:0, rushDamage:0, rushTimer:0,
  // Skill: 烈焰风暴
  fireballs:[], fireTimer:0,
  // Skill: 日炎圣盾
  shieldBurnTimer:0,
  // Skill: 盈能冲击
  energyCharge:0, energyLastAlt:0, energyBlastAnim:0,
  // Skill: 暴风鼠刃
  blades:[], bladeTimer:0, bladeCooldown:0,
  // Skill: 狂怒基因
  furyCharge:0, furyLastAlt:0, furyActive:false, furyTimer:0,
  // Damage popups
  dmgPopups:[]
};

// ============================================================
// OBSTACLE & WALL GENERATION
// ============================================================
function generateObstacles(){
  // Generate obstacles above camera view, staggered to avoid vertical overlap
  while(state.nextObstacleY > state.camY - H){
    var spacingMult=Math.pow(1.10, state.level); // +10% per level
    var widthMult=Math.pow(0.95, state.level);  // -5% per level
    state.nextObstacleY -= (120 + Math.random()*80)*spacingMult;

    // boss下方400px不生成障碍物（Y轴向下为正，boss下方=Y更大）
    var bossLineY = -LEVEL_THRESHOLDS[state.level];
    if(state.nextObstacleY >= bossLineY && state.nextObstacleY <= bossLineY + 400) continue;

    var ow=(50+Math.random()*80)*widthMult;
    var walls=getWallAt(state.nextObstacleY);
    var areaLeft=walls.left+state.wallWidth;
    var areaRight=walls.right;
    var areaW=areaRight-areaLeft-ow;

    var ox;
    // Get previous obstacle position to stagger
    var prev=state.obstacles.length>0?state.obstacles[state.obstacles.length-1]:null;
    var prevCenter=prev?(prev.x+prev.w/2):(W/2);
    var midX=(areaLeft+areaRight)/2;

    var r=Math.random();
    if(r<0.2){
      ox=areaLeft; // from left wall
    } else if(r<0.4){
      ox=areaRight-ow; // from right wall
    } else {
      ox=areaLeft+30+Math.random()*(areaW-30); // floating
    }

    // Stagger: if new obstacle overlaps horizontally with previous, shift it
    var newCenter=ox+ow/2;
    if(prev){
      var overlap=!(ox+ow<prev.x || ox>prev.x+prev.w);
      if(overlap){
        // Move to opposite side of the area
        if(prevCenter<midX){
          ox=midX+Math.random()*(areaRight-midX-ow);
        } else {
          ox=areaLeft+Math.random()*(midX-areaLeft-ow);
        }
        // Clamp
        if(ox<areaLeft) ox=areaLeft;
        if(ox+ow>areaRight) ox=areaRight-ow;
      }
    }
    state.obstacles.push({x:ox, y:state.nextObstacleY, w:ow, h:8, angle:0, level:state.level, squish:0});
  }
}

function generateWalls(){
  while(state.nextWallY > state.camY - H){
    state.nextWallY -= 40;
    // Wavy walls
    var waveL=Math.sin(state.nextWallY*0.008)*30;
    var waveR=Math.sin(state.nextWallY*0.01+2)*30;
    state.wallSegments.push({
      y:state.nextWallY,
      leftX:waveL,
      rightX:W-state.wallWidth+waveR
    });
  }
}

function getWallAt(y){
  // Interpolate wall position at given y
  var lx=Math.sin(y*0.008)*30;
  var rx=W-state.wallWidth+Math.sin(y*0.01+2)*30;
  return {left:lx, right:rx};
}

// ============================================================
// PHYSICS
// ============================================================
function getGravity(){
  return GRAVITY_BASE * LEVEL_GRAVITY_MULT[state.level];
}

// Butt bottom position (furthest point from head along body angle)
function getButtEnd(){
  return {
    x: state.px + Math.cos(state.springAngle)*SPRITE_H,
    y: state.py + Math.sin(state.springAngle)*SPRITE_H
  };
}

function getButtTop(){
  var buttStart=SPRITE_H*(1-BUTT_RATIO);
  return {
    x: state.px + Math.cos(state.springAngle)*buttStart,
    y: state.py + Math.sin(state.springAngle)*buttStart
  };
}

// Check if a point is in the butt zone (bottom half of sprite along body axis)
function pointInButt(px2,py2){
  // Project point onto body axis
  var dx=px2-state.px, dy=py2-state.py;
  var ax=Math.cos(state.springAngle), ay=Math.sin(state.springAngle);
  var proj=dx*ax+dy*ay; // distance along body axis
  var perp=Math.abs(dx*(-ay)+dy*ax); // perpendicular distance
  var buttStart=SPRITE_H*(1-BUTT_RATIO);
  return proj>=buttStart && proj<=SPRITE_H && perp<=SPRITE_W/2;
}

function bounce(){
  var dirX = -Math.cos(state.springAngle);
  var dirY = -Math.sin(state.springAngle);
  var speed=Math.sqrt(state.vx*state.vx+state.vy*state.vy);
  var bounceV=Math.max(BOUNCE_SPEED, speed);
  // 狂怒状态下弹跳力增强50%
  if(state.furyActive) bounceV*=1.5;
  state.vx = dirX*bounceV*0.6;
  state.vy = dirY*bounceV;
  if(state.vy>-2) state.vy=-Math.abs(bounceV)*0.5;
}

// ============================================================
// BOSS HELPERS
// ============================================================
function spawnBoss(level){
  var finishY=-LEVEL_THRESHOLDS[level];
  state.boss={
    y:finishY, hp:BOSS_HP[level], maxHp:BOSS_HP[level], defeated:false,
    w:W*0.6, h:0, level:level, squish:0
  };
  var cimg=catImgs[level];
  if(cimg && cimg.naturalWidth>0){
    var ratio=cimg.naturalHeight/cimg.naturalWidth;
    state.boss.h=state.boss.w*ratio;
  } else {
    state.boss.h=state.boss.w;
  }
  state.boss.x=W/2-state.boss.w/2;
  state.boss.topY=state.boss.y-state.boss.h;
  state.boss.lineY=state.boss.y; // 碰撞线在boss底部

  // 在boss上方150px内强制生成2个障碍物（上方=Y更小）
  for(var bi=0;bi<2;bi++){
    var obY=state.boss.topY - 50 - bi*60;
    var walls=getWallAt(obY);
    var areaLeft=walls.left+state.wallWidth;
    var areaRight=walls.right;
    var ow=60+Math.random()*60;
    var ox=areaLeft+Math.random()*(areaRight-areaLeft-ow);
    state.obstacles.push({x:ox, y:obY, w:ow, h:8, angle:0, level:level, squish:0});
  }
}

function damageBoss(dmg){
  if(!state.boss||state.boss.defeated) return;
  state.boss.hp-=dmg;
  state.boss.squish=1.0;
  state.dmgPopups.push({
    x:state.boss.x+state.boss.w/2+(Math.random()-0.5)*60,
    y:state.boss.topY-10,
    text:'-'+dmg, timer:60
  });
  if(state.boss.hp<=0){
    state.boss.hp=0;
    state.boss.defeated=true;
  }
}

function hasSkill(id){ return state.skills.indexOf(id)!==-1; }

function hitBossWithSkills(){
  state.bossHitCooldown=15;
  var baseDmg=state.furyActive?10:1;
  // 鼠之钢: first hit per level dumps accumulated count
  if(hasSkill('steelMouse') && state.steelCount>0 && !state.steelUsedThisLevel){
    baseDmg+=state.steelCount;
    state.steelCount=0;
    state.steelUsedThisLevel=true;
  }
  // 镇魂歌: 5% instakill
  if(hasSkill('soulSong') && Math.random()<0.05){
    baseDmg=9999;
  }
  // 哈基米突袭: first hit + queue 3 more
  if(hasSkill('hakimiRush')){
    damageBoss(baseDmg);
    state.rushHitsLeft=3;
    state.rushDamage=baseDmg;
    state.rushTimer=10;
  } else {
    damageBoss(baseDmg);
  }
}

function update(dt){
  if(state.phase==='victory'){
    state.victoryTime=(state.victoryTime||0)+dt;
    return;
  }
  if(state.phase!=='play') return;
  state.time+=dt;

  // 哈基米突袭 rush animation
  if(state.rushHitsLeft>0){
    state.rushTimer-=dt;
    if(state.rushTimer<=0){
      damageBoss(state.rushDamage);
      state.rushHitsLeft--;
      state.rushTimer=10;
    }
    // Still decay popups and boss squish during rush
    if(state.boss && state.boss.squish>0){
      state.boss.squish*=0.7;
      if(state.boss.squish<0.01) state.boss.squish=0;
    }
    for(var di2=state.dmgPopups.length-1;di2>=0;di2--){
      state.dmgPopups[di2].timer-=dt;
      state.dmgPopups[di2].y-=0.8;
      if(state.dmgPopups[di2].timer<=0) state.dmgPopups.splice(di2,1);
    }
    return; // freeze player during rush
  }

  // Swing spring
  if(state.swingDir!==0){
    state.springAngle+=state.swingDir*SWING_SPEED;
    if(state.springAngle<0.2) state.springAngle=0.2;
    if(state.springAngle>Math.PI-0.2) state.springAngle=Math.PI-0.2;
  }

  // Gravity
  var g=getGravity();
  state.vy+=g;

  // Move
  state.px+=state.vx;
  state.py+=state.vy;
  state.vx*=0.99;

  var buttEnd=getButtEnd();
  var didBounce=false;
  // 狂怒状态下扩大碰撞检测范围（左右各扩展60px）
  var furyMargin=state.furyActive?60:0;

  // Obstacle collision
  for(var i=0;i<state.obstacles.length;i++){
    var ob=state.obstacles[i];
    if(buttEnd.x>=ob.x-furyMargin && buttEnd.x<=ob.x+ob.w+furyMargin && buttEnd.y>=ob.y-2 && buttEnd.y<=ob.y+ob.h+2){
      if(state.vy>0){
        state.py=ob.y-Math.sin(state.springAngle)*SPRITE_H-2;
        ob.squish=1.0;
        bounce(); didBounce=true;
        if(hasSkill('steelMouse')) state.steelCount++;
        break;
      }
    }
    var bt=getButtTop();
    if(bt.x>=ob.x-furyMargin && bt.x<=ob.x+ob.w+furyMargin && bt.y>=ob.y-2 && bt.y<=ob.y+ob.h+2){
      if(state.vy>0){
        var buttStart2=SPRITE_H*(1-BUTT_RATIO);
        state.py=ob.y-Math.sin(state.springAngle)*buttStart2-2;
        ob.squish=1.0;
        bounce(); didBounce=true;
        if(hasSkill('steelMouse')) state.steelCount++;
        break;
      }
    }
  }

  // Wall collision
  var walls=getWallAt(buttEnd.y);
  if(buttEnd.x<=walls.left+state.wallWidth){
    state.px=walls.left+state.wallWidth-Math.cos(state.springAngle)*SPRITE_H+2;
    state.vx=Math.abs(state.vx)+1;
    bounce();
    if(hasSkill('steelMouse')) state.steelCount++;
  }
  if(buttEnd.x>=walls.right){
    state.px=walls.right-Math.cos(state.springAngle)*SPRITE_H-2;
    state.vx=-Math.abs(state.vx)-1;
    bounce();
    if(hasSkill('steelMouse')) state.steelCount++;
  }

  // Head collision with obstacles
  var headR=SPRITE_W*0.3;
  for(var j=0;j<state.obstacles.length;j++){
    var ob2=state.obstacles[j];
    if(state.vy<=0) continue;
    if(state.px+headR>=ob2.x && state.px-headR<=ob2.x+ob2.w && state.py>=ob2.y-headR && state.py<=ob2.y+ob2.h+headR){
      var nx=0, ny=0;
      var overlapL=state.px+headR-ob2.x;
      var overlapR=ob2.x+ob2.w-(state.px-headR);
      var overlapT=state.py+headR-ob2.y;
      var overlapB=ob2.y+ob2.h-(state.py-headR);
      var minO=Math.min(overlapL,overlapR,overlapT,overlapB);
      if(minO===overlapL){ nx=-1; state.px=ob2.x-headR-1; }
      else if(minO===overlapR){ nx=1; state.px=ob2.x+ob2.w+headR+1; }
      else if(minO===overlapT){ ny=-1; state.py=ob2.y-headR-1; }
      else { ny=1; state.py=ob2.y+ob2.h+headR+1; }
      if(ny===1){ state.vx=0; state.vy=0; }
      else {
        var dot=state.vx*nx+state.vy*ny;
        state.vx=state.vx-2*dot*nx; state.vy=state.vy-2*dot*ny;
        var spd=Math.sqrt(state.vx*state.vx+state.vy*state.vy);
        if(spd<BOUNCE_SPEED){ var sc=BOUNCE_SPEED/(spd||1); state.vx*=sc; state.vy*=sc; }
      }
    }
  }

  // Head wall collision
  var wallsHead=getWallAt(state.py);
  if(state.px-headR<=wallsHead.left+state.wallWidth){
    state.px=wallsHead.left+state.wallWidth+headR+2;
    state.vx=Math.abs(state.vx);
    var spd2=Math.sqrt(state.vx*state.vx+state.vy*state.vy);
    if(spd2<BOUNCE_SPEED){ var s3=BOUNCE_SPEED/(spd2||1); state.vx*=s3; state.vy*=s3; }
  }
  if(state.px+headR>=wallsHead.right){
    state.px=wallsHead.right-headR-2;
    state.vx=-Math.abs(state.vx);
    var spd3=Math.sqrt(state.vx*state.vx+state.vy*state.vy);
    if(spd3<BOUNCE_SPEED){ var s4=BOUNCE_SPEED/(spd3||1); state.vx*=s4; state.vy*=s4; }
  }

  // Squish decay
  for(var sq=0;sq<state.obstacles.length;sq++){
    if(state.obstacles[sq].squish>0) state.obstacles[sq].squish*=0.7;
    if(state.obstacles[sq].squish<0.01) state.obstacles[sq].squish=0;
  }
  // Boss squish decay
  if(state.boss && state.boss.squish>0){
    state.boss.squish*=0.7;
    if(state.boss.squish<0.01) state.boss.squish=0;
  }

  // Ground bounce
  var groundY=H*0.85;
  buttEnd=getButtEnd();
  if(buttEnd.y>groundY){
    state.py=groundY-Math.sin(state.springAngle)*SPRITE_H;
    bounce();
  }

  state.altitude=Math.max(state.altitude, -state.py);

  // ===== BOSS COLLISION (线碰撞，线在boss底部) =====
  if(state.boss && !state.boss.defeated){
    var b=state.boss;
    var bossLineY=b.lineY;

    buttEnd=getButtEnd();
    var headY=state.py;

    if(state.bossHitCooldown<=0){
      // 弹簧从上方落下撞击boss线
      if(buttEnd.y>=bossLineY-8 && buttEnd.y<=bossLineY+16 && state.vy>0){
        state.py=bossLineY-Math.sin(state.springAngle)*SPRITE_H-2;
        bounce();
        hitBossWithSkills();
      }
      // 头部从下方向上撞击boss线
      else if(headY<=bossLineY+8 && headY>=bossLineY-16 && state.vy<0){
        state.py=bossLineY+10;
        state.vy=Math.abs(state.vy)*0.5;
        hitBossWithSkills();
      }
    }

    // 阻挡：从下方无法穿过
    if(!state.boss.defeated && headY<bossLineY && headY>bossLineY-40 && state.vy<0){
      state.py=bossLineY+1;
      state.vy=Math.abs(state.vy)*0.3;
    }
  }
  if(state.bossHitCooldown>0) state.bossHitCooldown-=dt;

  // ===== FIREBALLS (烈焰风暴) =====
  if(hasSkill('flameStorm')){
    state.fireTimer+=dt;
    if(state.fireTimer>=60){ // every 1 second at 60fps
      state.fireTimer=0;
      state.fireballs.push({
        x:state.px, y:state.py,
        vx:0, vy:-12,
        life:600
      });
    }
  }
  // Update fireballs
  for(var fi=state.fireballs.length-1;fi>=0;fi--){
    var fb=state.fireballs[fi];
    fb.vy+=getGravity()*0.5;
    fb.x+=fb.vx; fb.y+=fb.vy;
    fb.life-=dt;
    if(fb.life<=0){ state.fireballs.splice(fi,1); continue; }
    // Fireball obstacle collision (bounce from above, pass from below)
    for(var foi=0;foi<state.obstacles.length;foi++){
      var fob=state.obstacles[foi];
      if(fb.x>=fob.x && fb.x<=fob.x+fob.w && fb.y>=fob.y-4 && fb.y<=fob.y+fob.h+4 && fb.vy>0){
        fb.vy=-Math.abs(fb.vy)*0.9;
        fb.y=fob.y-5;
        fob.squish=0.3;
      }
    }
    // Fireball wall collision
    var fwalls=getWallAt(fb.y);
    if(fb.x<=fwalls.left+state.wallWidth){ fb.x=fwalls.left+state.wallWidth+2; fb.vx=Math.abs(fb.vx); }
    if(fb.x>=fwalls.right){ fb.x=fwalls.right-2; fb.vx=-Math.abs(fb.vx); }
    // Fireball boss collision (bounce off boss line)
    if(state.boss && !state.boss.defeated){
      var bb=state.boss;
      var bLine=bb.lineY;
      // From above hitting boss line
      if(fb.y>=bLine-8 && fb.y<=bLine+8 && fb.vy>0){
        fb.vy=-Math.abs(fb.vy)*0.9;
        fb.y=bLine-10;
        damageBoss(1);
      }
      // From below hitting boss line
      else if(fb.y>=bLine-8 && fb.y<=bLine+8 && fb.vy<0){
        fb.vy=Math.abs(fb.vy)*0.9;
        fb.y=bLine+10;
        damageBoss(1);
      }
    }
    // Fireball-player collision: bounce off player like an obstacle
    var fbDx=fb.x-state.px, fbDy=fb.y-state.py;
    var fbDist=Math.sqrt(fbDx*fbDx+fbDy*fbDy);
    if(fbDist<30 && fb.vy>0){
      fb.vy=-Math.abs(fb.vy)*0.9;
      fb.y=state.py-30;
      if(state.vy>0) state.vy*=-0.3;
    }
  }

  // ===== 日炎圣盾 =====
  if(hasSkill('sunShield') && state.boss && !state.boss.defeated){
    state.shieldBurnTimer+=dt;
    if(state.shieldBurnTimer>=12){ // 0.2s at 60fps
      state.shieldBurnTimer=0;
      var bb2=state.boss;
      var shieldR=50;
      // Check if player is near boss
      var dx=state.px-(bb2.x+bb2.w/2);
      var dy=state.py-(bb2.topY+bb2.h/2);
      if(Math.sqrt(dx*dx+dy*dy)<shieldR+bb2.w/2){
        damageBoss(1);
      }
    }
  }

  // ===== 盈能冲击 =====
  if(hasSkill('energyBlast')){
    // 累计垂直方向绝对位移（上下都算）
    var pyNow=state.py;
    if(state.energyLastAlt!==0){
      var dist=Math.abs(pyNow-state.energyLastAlt);
      state.energyCharge+=dist;
    }
    state.energyLastAlt=pyNow;
    if(state.energyCharge>=2000){
      state.energyCharge-=2000;
      state.energyBlastAnim=30; // visual effect frames
      // Check if boss is within 100px
      if(state.boss && !state.boss.defeated){
        var edx=state.px-(state.boss.x+state.boss.w/2);
        var edy=state.py-state.boss.lineY;
        if(Math.sqrt(edx*edx+edy*edy)<100+state.boss.w/2){
          damageBoss(20);
        }
      }
    }
    if(state.energyBlastAnim>0) state.energyBlastAnim-=dt;
  }

  // ===== 暴风鼠刃 =====
  if(hasSkill('stormBlade')){
    if(state.bladeCooldown>0){
      state.bladeCooldown-=dt;
    } else {
      state.bladeTimer+=dt;
      if(state.bladeTimer>=30){ // every 0.5 second
        state.bladeTimer=0;
        // 朝正上方发射
        state.blades.push({
          x:state.px, y:state.py,
          startX:state.px, startY:state.py,
          vx:0, vy:-8,
          fixed:false, returning:false, hitBoss:false, dist:0
        });
      }
      // Update blades
      for(var bi=state.blades.length-1;bi>=0;bi--){
        var bl=state.blades[bi];
        if(bl.returning){
          var rdx=state.px-bl.x, rdy=state.py-bl.y;
          var rdist=Math.sqrt(rdx*rdx+rdy*rdy);
          if(rdist<15){ state.blades.splice(bi,1); continue; }
          bl.x+=rdx/rdist*12; bl.y+=rdy/rdist*12;
          if(!bl.hitBoss && state.boss && !state.boss.defeated){
            var bLine=state.boss.lineY;
            if((bl.y>=bLine-8 && bl.y<=bLine+8)||(bl.y-rdy/rdist*12<bLine && bl.y>bLine)){
              damageBoss(1); bl.hitBoss=true;
            }
          }
        } else if(!bl.fixed){
          bl.x+=bl.vx; bl.y+=bl.vy;
          bl.dist=Math.sqrt((bl.x-bl.startX)*(bl.x-bl.startX)+(bl.y-bl.startY)*(bl.y-bl.startY));
          if(!bl.hitBoss && state.boss && !state.boss.defeated){
            var bLine2=state.boss.lineY;
            if(bl.y<=bLine2+8 && bl.y>=bLine2-8){
              damageBoss(1); bl.hitBoss=true;
            }
          }
          // 飞行300px后固定；若是第6个则触发全部收回
          if(bl.dist>=300){
            bl.fixed=true; bl.vx=0; bl.vy=0;
            var totalBlades=state.blades.filter(function(b){return b.fixed||(!b.returning&&!b.fixed);}).length;
            if(state.blades.filter(function(b){return b.fixed;}).length>=6){
              state.blades.forEach(function(b){
                if(b.fixed){ b.fixed=false; b.returning=true; b.hitBoss=false; }
              });
              state.bladeCooldown=180; // 3 second cooldown
              state.bladeTimer=0;
            }
          }
        }
      }
    }
  }

  // ===== 狂怒基因 =====
  if(hasSkill('furyGene')){
    if(state.furyActive){
      state.furyTimer-=dt;
      if(state.furyTimer<=0){
        state.furyActive=false;
        state.furyCharge=0;
        state.furyLastAlt=state.py;
      }
    } else {
      var pyNow2=state.py;
      if(state.furyLastAlt!==0){
        state.furyCharge+=Math.abs(pyNow2-state.furyLastAlt);
      }
      state.furyLastAlt=pyNow2;
      if(state.furyCharge>=4000){
        state.furyActive=true;
        state.furyTimer=300;
        state.furyCharge=0;
      }
    }
  }

  // Spawn boss when approaching finish line
  var finishAlt=LEVEL_THRESHOLDS[state.level];
  if(!state.boss && state.altitude>=finishAlt-500){
    spawnBoss(state.level);
  }

  // Level check: boss defeated → advance
  if(state.boss && state.boss.defeated){
    if(state.level>=LEVEL_THRESHOLDS.length-1){
      state.phase='victory';
      state.victoryTime=0;
      return;
    }
    var nextLevel=state.level+1;
    state.level=nextLevel;
    state.levelBanner=180;
    state.boss=null;
    state.steelCount=0;
    state.steelUsedThisLevel=false;
    state.fireballs=[];
    state.fireTimer=0;
    state.shieldBurnTimer=0;
    // 第3关(index 2)和第7关(index 6)开始时选择额外技能
    if(nextLevel===2 || nextLevel===6){
      state.phase='skillSelect';
      state.skillsPicked=0;
      var pool=ALL_SKILLS.filter(function(s){ return state.skills.indexOf(s.id)===-1; });
      for(var si2=pool.length-1;si2>0;si2--){
        var sj2=Math.floor(Math.random()*(si2+1));
        var tmp2=pool[si2]; pool[si2]=pool[sj2]; pool[sj2]=tmp2;
      }
      state.skillChoices=pool.slice(0, Math.min(3, pool.length));
    }
  }
  if(state.levelBanner>0) state.levelBanner--;

  // Camera
  var targetCamY=state.py-H*0.6;
  state.camY+=(targetCamY-state.camY)*0.1;
  state.camX=state.px-W/2;

  generateObstacles();
  generateWalls();

  // Damage popup decay
  for(var di=state.dmgPopups.length-1;di>=0;di--){
    state.dmgPopups[di].timer-=dt;
    state.dmgPopups[di].y-=0.8;
    if(state.dmgPopups[di].timer<=0) state.dmgPopups.splice(di,1);
  }
}

// ============================================================
// DRAWING
// ============================================================
function draw(){
  ctx.clearRect(0,0,W,H);

  // Background based on current level
  var bgIdx=state.level;
  var bg=bgImgs[bgIdx];
  if(bg){
    // Zoom from 300% at level start to 100% at level finish
    var levelStart=(state.level>0)?LEVEL_THRESHOLDS[state.level-1]:0;
    var levelEnd=LEVEL_THRESHOLDS[state.level]||levelStart+1000;
    var progress=Math.min(1, Math.max(0, (state.altitude-levelStart)/(levelEnd-levelStart)));
    var zoom=3.0 - 2.0*progress; // 3.0 → 1.0
    var drawW=W*zoom, drawH=H*zoom;
    var drawX=(W-drawW)/2, drawY=(H-drawH)/2;
    ctx.drawImage(bg, drawX, drawY, drawW, drawH);
  } else {
    // Fallback gradient
    var grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#334');
    grad.addColorStop(1,'#889');
    ctx.fillStyle=grad;
    ctx.fillRect(0,0,W,H);
  }

  ctx.save();
  ctx.translate(-state.camX, -state.camY);

  // Draw walls
  ctx.fillStyle='#222';
  for(var wy=state.camY-40;wy<state.camY+H+40;wy+=4){
    var w=getWallAt(wy);
    ctx.fillRect(w.left, wy, state.wallWidth, 5);
    ctx.fillRect(w.right, wy, state.wallWidth, 5);
  }

  // Draw obstacles
  state.obstacles.forEach(function(ob){
    ctx.save();
    ctx.translate(ob.x+ob.w/2, ob.y+ob.h/2);
    ctx.rotate(ob.angle||0);
    // Squish animation: shrink then spring back
    var sq=ob.squish||0;
    var scaleX=1.0+sq*1.0;
    var scaleY=1.0-sq*0.8;
    ctx.scale(scaleX, scaleY);
    var cimg=catImgs[ob.level||0];
    if(cimg){
      var ratio=cimg.naturalHeight/cimg.naturalWidth;
      if(!ratio || !isFinite(ratio)) ratio=1;
      var drawW=ob.w;
      var drawH=ob.w*ratio;
      ctx.drawImage(cimg, -drawW/2, -drawH/2, drawW, drawH);
    } else {
      ctx.fillStyle='#333';
      ctx.fillRect(-ob.w/2,-ob.h/2,ob.w,ob.h);
    }
    ctx.restore();
  });

  // Draw boss
  if(state.boss){
    var b=state.boss;
    var bossY=b.topY;
    if(bossY>state.camY-300 && bossY<state.camY+H+300){
      var cimg2=catImgs[b.level];
      if(cimg2){
        ctx.save();
        // Squish effect: pivot at bottom (lineY)
        var bsq=b.squish||0;
        ctx.translate(b.x+b.w/2, b.lineY);
        var bScaleX=1.0+bsq*1.0;
        var bScaleY=1.0-bsq*0.8;
        ctx.scale(bScaleX, bScaleY);
        if(b.defeated) ctx.globalAlpha=0.3;
        ctx.drawImage(cimg2, -b.w/2, -b.h, b.w, b.h);
        ctx.restore();
        // HP bar
        if(!b.defeated){
          var hpW=b.w*0.8, hpH=10;
          var hpX=b.x+(b.w-hpW)/2, hpY=b.topY-20;
          ctx.fillStyle='rgba(0,0,0,0.6)';
          ctx.fillRect(hpX-1,hpY-1,hpW+2,hpH+2);
          ctx.fillStyle='#c33';
          ctx.fillRect(hpX,hpY,hpW*(b.hp/b.maxHp),hpH);
          ctx.fillStyle='#fff';
          ctx.font='bold 10px "Courier New",monospace';
          ctx.textAlign='center';
          ctx.fillText('BOSS HP: '+b.hp+'/'+b.maxHp, b.x+b.w/2, hpY-4);
        }
      }
    }
  }

  // Draw fireballs
  state.fireballs.forEach(function(fb){
    if(fireImg){
      ctx.drawImage(fireImg, fb.x-16, fb.y-16, 32, 32);
    } else {
      ctx.fillStyle='#f42';
      ctx.beginPath(); ctx.arc(fb.x, fb.y, 12, 0, Math.PI*2); ctx.fill();
    }
  });

  // Draw shield aura
  if(hasSkill('sunShield')){
    ctx.save();
    ctx.globalAlpha=0.3+Math.sin(Date.now()/200)*0.15;
    if(shieldImg){
      ctx.drawImage(shieldImg, state.px-40, state.py-40, 80, 80);
    } else {
      ctx.fillStyle='rgba(255,80,30,0.3)';
      ctx.beginPath(); ctx.arc(state.px, state.py, 50, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // Draw energy blast effect
  if(hasSkill('energyBlast') && state.energyBlastAnim>0){
    ctx.save();
    ctx.globalAlpha=Math.min(1, state.energyBlastAnim/10);
    var blastR=100*(1-state.energyBlastAnim/30)*1.2+40;
    if(thunderImg){
      ctx.drawImage(thunderImg, state.px-blastR, state.py-blastR, blastR*2, blastR*2);
    } else {
      ctx.strokeStyle='rgba(100,180,255,0.8)';
      ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(state.px, state.py, blastR, 0, Math.PI*2); ctx.stroke();
    }
    ctx.restore();
  }

  // Draw energy charge HUD
  if(hasSkill('energyBlast')){
    var chargePct=Math.min(1, state.energyCharge/2000);
    // small bar under player
    ctx.fillStyle='rgba(0,0,0,0.4)';
    ctx.fillRect(state.px-20, state.py+SPRITE_H+8, 40, 4);
    ctx.fillStyle=chargePct>=1?'#5cf':'#48a';
    ctx.fillRect(state.px-20, state.py+SPRITE_H+8, 40*chargePct, 4);
  }

  // Draw blades (暴风鼠刃)
  state.blades.forEach(function(bl){
    ctx.save();
    ctx.translate(bl.x, bl.y);
    if(bl.fixed) ctx.globalAlpha=0.7;
    if(toothImg){
      ctx.drawImage(toothImg, -16, -16, 32, 32);
    } else {
      ctx.fillStyle='#cde';
      ctx.fillRect(-12,-4,24,8);
    }
    ctx.restore();
  });

  // Draw fury charge bar (狂怒基因)
  if(hasSkill('furyGene')){
    if(state.furyActive){
      // Fury active indicator
      ctx.fillStyle='rgba(255,50,50,0.5)';
      ctx.font='bold 12px "Courier New",monospace';
      ctx.textAlign='center';
      ctx.fillText('🔥 狂怒! '+Math.ceil(state.furyTimer/60)+'s', state.px, state.py-SPRITE_H*3-10);
    } else {
      var furyPct=Math.min(1, state.furyCharge/4000);
      ctx.fillStyle='rgba(0,0,0,0.4)';
      ctx.fillRect(state.px-20, state.py+SPRITE_H+14, 40, 4);
      ctx.fillStyle=furyPct>=1?'#f44':'#a33';
      ctx.fillRect(state.px-20, state.py+SPRITE_H+14, 40*furyPct, 4);
    }
  }

  // Draw damage popups
  state.dmgPopups.forEach(function(dp){
    var alpha=Math.min(1, dp.timer/20);
    ctx.fillStyle='rgba(255,60,60,'+alpha+')';
    ctx.font='bold 16px "Courier New",monospace';
    ctx.textAlign='center';
    ctx.fillText(dp.text, dp.x, dp.y);
  });

  // Draw player
  drawPlayer();

  ctx.restore();

  // HUD
  ctx.fillStyle='rgba(0,0,0,0.5)';
  ctx.fillRect(W/2-120,8,240,28);
  ctx.fillStyle='#fff';
  ctx.font='bold 16px "Courier New",monospace';
  ctx.textAlign='center';
  if(state.phase==='play'){
    ctx.fillText('第'+(state.level+1)+'关  高度 '+Math.floor(state.altitude)+'m', W/2, 28);
    // 鼠之钢 counter
    if(hasSkill('steelMouse') && state.steelCount>0){
      ctx.fillStyle='rgba(255,180,0,0.9)';
      ctx.font='12px "Courier New",monospace';
      ctx.fillText('🐭 鼠之钢: '+state.steelCount, W/2, 48);
    }
    // Boss HP on HUD
    if(state.boss && !state.boss.defeated){
      ctx.fillStyle='rgba(255,60,60,0.9)';
      ctx.font='12px "Courier New",monospace';
      ctx.fillText('BOSS: '+state.boss.hp+'/'+state.boss.maxHp, W/2, state.steelCount>0?62:48);
    }
    // Level transition banner
    if(state.levelBanner>0){
      var alpha=Math.min(1, state.levelBanner/30);
      ctx.fillStyle='rgba(0,0,0,'+alpha*0.7+')';
      ctx.fillRect(0,H/2-40,W,80);
      ctx.fillStyle='rgba(255,221,136,'+alpha+')';
      ctx.font='bold 22px "Courier New",monospace';
      ctx.fillText('第'+state.level+'关 通过',W/2,H/2-8);
      ctx.fillStyle='rgba(204,204,204,'+alpha+')';
      ctx.font='14px "Courier New",monospace';
      ctx.fillText('进入第'+(state.level+1)+'关  重力×'+LEVEL_GRAVITY_MULT[state.level].toFixed(1),W/2,H/2+18);
    }
  } else if(state.phase==='victory'){
    // Victory screen
    ctx.fillStyle='rgba(0,0,0,0.7)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fd8';
    ctx.font='bold 32px "Courier New",monospace';
    ctx.fillText('🎉 通关 🎉',W/2,H/2-50);
    ctx.fillStyle='#fff';
    ctx.font='bold 18px "Courier New",monospace';
    ctx.fillText('最终高度 '+Math.floor(state.altitude)+'m',W/2,H/2);
    ctx.fillStyle='#aaa';
    ctx.font='14px "Courier New",monospace';
    ctx.fillText('恭喜你征服了太空',W/2,H/2+30);
    ctx.fillText('点击重新开始',W/2,H/2+60);
  } else {
    // Title
    ctx.fillStyle='rgba(0,0,0,0.6)';
    ctx.fillRect(0,H/2-80,W,160);
    ctx.fillStyle='#fd8';
    ctx.font='bold 28px "Courier New",monospace';
    ctx.fillText('撅地求生',W/2,H/2-30);
    ctx.fillStyle='#ccc';
    ctx.font='14px "Courier New",monospace';
    ctx.fillText('A/D 或 ←/→ 转向',W/2,H/2+5);
    ctx.fillStyle='#aaa';
    ctx.font='12px "Courier New",monospace';
    ctx.fillText('点击开始',W/2,H/2+50);
  }

  // Skill select screen
  if(state.phase==='skillSelect'){
    ctx.fillStyle='rgba(0,0,0,0.8)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fd8';
    ctx.font='bold 22px "Courier New",monospace';
    ctx.textAlign='center';
    ctx.fillText('选择技能 (选1个)',W/2,60);
    ctx.fillStyle='#aaa';
    ctx.font='12px "Courier New",monospace';
    ctx.fillText('点击选择1个技能',W/2,85);

    var cardW=120, cardH=160, gap=15;
    var totalW=state.skillChoices.length*cardW+(state.skillChoices.length-1)*gap;
    var startX=(W-totalW)/2;

    state.skillChoices.forEach(function(sk,idx){
      var cx=startX+idx*(cardW+gap);
      var cy=H/2-cardH/2;
      var selected=state.skills.indexOf(sk.id)!==-1;
      // Card bg
      ctx.fillStyle=selected?'rgba(123,47,247,0.6)':'rgba(40,40,70,0.9)';
      ctx.fillRect(cx,cy,cardW,cardH);
      ctx.strokeStyle=selected?'#7b2ff7':'#555';
      ctx.lineWidth=2;
      ctx.strokeRect(cx,cy,cardW,cardH);
      // Name
      ctx.fillStyle=selected?'#fff':'#fd8';
      ctx.font='bold 14px "Courier New",monospace';
      ctx.textAlign='center';
      ctx.fillText(sk.name,cx+cardW/2,cy+30);
      // Desc (wrap)
      ctx.fillStyle=selected?'#ddd':'#aaa';
      ctx.font='11px "Courier New",monospace';
      var words=sk.desc;
      var lineH=15, maxW=cardW-16, yy=cy+55;
      for(var wi=0;wi<words.length;wi+=6){
        var line=words.substr(wi,6);
        ctx.fillText(line,cx+cardW/2,yy);
        yy+=lineH;
      }
      if(selected){
        ctx.fillStyle='#4f4';
        ctx.font='bold 16px "Courier New",monospace';
        ctx.fillText('✓',cx+cardW/2,cy+cardH-15);
      }
      // Store hit area for click
      sk._cx=cx; sk._cy=cy; sk._cw=cardW; sk._ch=cardH;
    });

    if(state.skillsPicked>=1){
      ctx.fillStyle='#4f4';
      ctx.font='bold 18px "Courier New",monospace';
      ctx.fillText('点击任意处继续',W/2,H-60);
    }
  }
}

function drawPlayer(){
  var px=state.px, py=state.py;
  var angle=state.springAngle;
  var furyScale=state.furyActive?3:1;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle - Math.PI/2);
  if(furyScale>1) ctx.scale(furyScale, furyScale);
  var pimg=getPlayerImg();
  if(pimg){
    if(state.furyActive){ ctx.shadowColor='#f44'; ctx.shadowBlur=20; }
    ctx.drawImage(pimg, -SPRITE_W/2, 0, SPRITE_W, SPRITE_H);
    ctx.shadowBlur=0;
  } else {
    ctx.fillStyle=state.furyActive?'#f44':'#c84';
    ctx.beginPath();
    ctx.ellipse(0, SPRITE_H/2, SPRITE_W/2, SPRITE_H/2, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

// ============================================================
// INPUT
// ============================================================
var keys={};
document.addEventListener('keydown',function(e){
  keys[e.key]=true;
  if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft') state.swingDir=-1;
  if(e.key==='d'||e.key==='D'||e.key==='ArrowRight') state.swingDir=1;
});
document.addEventListener('keyup',function(e){
  keys[e.key]=false;
  if((e.key==='a'||e.key==='A'||e.key==='ArrowLeft')&&state.swingDir===-1) state.swingDir=0;
  if((e.key==='d'||e.key==='D'||e.key==='ArrowRight')&&state.swingDir===1) state.swingDir=0;
});

// Touch controls
var touchStartX=0;
canvas.addEventListener('touchstart',function(e){
  e.preventDefault();
  if(state.phase==='title'||state.phase==='victory'){startGame();return;}
  if(state.phase==='skillSelect'){
    var rect=canvas.getBoundingClientRect();
    var mx=(e.touches[0].clientX-rect.left)*(W/rect.width);
    var my=(e.touches[0].clientY-rect.top)*(H/rect.height);
    if(state.skillsPicked>=1){ actuallyStartGame(); return; }
    state.skillChoices.forEach(function(sk){
      if(mx>=sk._cx && mx<=sk._cx+sk._cw && my>=sk._cy && my<=sk._cy+sk._ch){
        if(state.skills.indexOf(sk.id)===-1 && state.skillsPicked<1){
          state.skills.push(sk.id);
          state.skillsPicked++;
        }
      }
    });
    return;
  }
  touchStartX=e.touches[0].clientX;
  var mid=window.innerWidth/2;
  if(touchStartX<mid) state.swingDir=-1;
  else state.swingDir=1;
},{passive:false});
canvas.addEventListener('touchend',function(e){
  e.preventDefault();
  state.swingDir=0;
},{passive:false});

canvas.addEventListener('click',function(e){
  if(state.phase==='title'||state.phase==='victory'){ startGame(); return; }
  if(state.phase==='skillSelect'){
    var rect=canvas.getBoundingClientRect();
    var mx=(e.clientX-rect.left)*(W/rect.width);
    var my=(e.clientY-rect.top)*(H/rect.height);
    if(state.skillsPicked>=1){
      actuallyStartGame();
      return;
    }
    state.skillChoices.forEach(function(sk){
      if(mx>=sk._cx && mx<=sk._cx+sk._cw && my>=sk._cy && my<=sk._cy+sk._ch){
        if(state.skills.indexOf(sk.id)===-1 && state.skillsPicked<1){
          state.skills.push(sk.id);
          state.skillsPicked++;
        }
      }
    });
    return;
  }
});

// ============================================================
// GAME CONTROL
// ============================================================
function startGame(){
  if(state.phase==='title'||state.phase==='victory'){
    // Go to skill select
    state.phase='skillSelect';
    state.skills=[];
    state.skillsPicked=0;
    // Pick 3 random skills
    var pool=ALL_SKILLS.slice();
    for(var si=pool.length-1;si>0;si--){
      var sj=Math.floor(Math.random()*(si+1));
      var tmp=pool[si]; pool[si]=pool[sj]; pool[sj]=tmp;
    }
    state.skillChoices=pool.slice(0,3);
    return;
  }
}

function actuallyStartGame(){
  if(state.phase==='skillSelect' && state.level>0){
    // Mid-game skill select: just resume play
    state.phase='play';
    return;
  }
  state.phase='play';
  state.level=0;
  state.px=W/2; state.py=H*0.7;
  state.vx=0; state.vy=-5;
  state.springAngle=Math.PI/2;
  state.swingDir=0;
  state.altitude=0;
  state.time=0;
  state.camX=0; state.camY=0;
  state.obstacles=[];
  state.wallSegments=[];
  state.nextObstacleY=H*0.85;
  state.nextWallY=H;
  state.levelBanner=0;
  state.boss=null;
  state.bossHitCooldown=0;
  state.steelCount=0;
  state.rushHitsLeft=0;
  state.fireballs=[];
  state.fireTimer=0;
  state.shieldBurnTimer=0;
  state.energyCharge=0;
  state.energyLastAlt=0;
  state.energyBlastAnim=0;
  state.blades=[];
  state.bladeTimer=0;
  state.bladeCooldown=0;
  state.furyCharge=0;
  state.furyLastAlt=0;
  state.furyActive=false;
  state.furyTimer=0;
  state.dmgPopups=[];
  generateObstacles();
  generateWalls();
}

// ============================================================
// GAME LOOP & LOADING
// ============================================================
var lastTime=Date.now();

function loop(){
  var now=Date.now();
  var dt=Math.min((now-lastTime)/1000, 0.05);
  lastTime=now;
  update(dt*60);
  draw();
  requestAnimationFrame(loop);
}

function drawLoadingScreen(){
  ctx.clearRect(0,0,W,H);
  var grad=ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#223');
  grad.addColorStop(1,'#556');
  ctx.fillStyle=grad;
  ctx.fillRect(0,0,W,H);

  ctx.fillStyle='#fd8';
  ctx.font='bold 24px "Courier New",monospace';
  ctx.textAlign='center';
  ctx.fillText('撅地求生',W/2,H/2-50);

  var barW=240, barH=16;
  var barX=(W-barW)/2, barY=H/2-10;
  var pct=totalImages>0?(loadedCount/totalImages):0;
  ctx.strokeStyle='#888';
  ctx.lineWidth=2;
  ctx.strokeRect(barX,barY,barW,barH);
  ctx.fillStyle='#fd8';
  ctx.fillRect(barX+2,barY+2,(barW-4)*pct,barH-4);

  ctx.fillStyle='#aaa';
  ctx.font='12px "Courier New",monospace';
  ctx.fillText('加载资源中... '+loadedCount+'/'+totalImages,W/2,barY+barH+20);
}

// Start preloading via fetch+blob+decode
drawLoadingScreen();

// Load all images in parallel, then assign to game variables
var bgPromises = assetPaths.bg.map(function(p){ return loadImage(p); });
var catPromises = assetPaths.cat.map(function(p){ return loadImage(p); });
var skinPromises = [];
for(var sk3=1;sk3<=7;sk3++){
  skinPromises.push((function(n){
    return loadImage(assetPaths.skin[n]).then(function(img){ skinImgs[n]=img; });
  })(sk3));
}
var playerPromise = loadImage(assetPaths.player).then(function(img){ playerImg=img; });
var firePromise = loadImage(assetPaths.fire).then(function(img){ fireImg=img; });
var shieldPromise = loadImage(assetPaths.shield).then(function(img){ shieldImg=img; });
var thunderPromise = loadImage(assetPaths.thunder).then(function(img){ thunderImg=img; });
var toothPromise = loadImage(assetPaths.tooth).then(function(img){ toothImg=img; });

Promise.all([
  playerPromise,
  firePromise,
  shieldPromise,
  thunderPromise,
  toothPromise,
  Promise.all(bgPromises).then(function(imgs){ bgImgs=imgs; }),
  Promise.all(catPromises).then(function(imgs){ catImgs=imgs; }),
  Promise.all(skinPromises)
]).then(function(){
  gameStarted=true;
  state.phase='title';
  lastTime=Date.now();
  loop();
});

})();
