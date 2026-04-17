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
// BACKGROUND IMAGES (11 layers by altitude)
// ============================================================
var bgImgs=[];
for(var i=1;i<=11;i++){
  var img=new Image();
  img.src='assets/'+i+'.png';
  bgImgs.push(img);
}

// ============================================================
// GAME STATE
// ============================================================
var GRAVITY_BASE=0.12;
var BOUNCE_SPEED=10.8;
var SWING_SPEED=0.04;
// Hamster sprite dimensions (drawn size)
var SPRITE_W=60;
var SPRITE_H=72;
// The pivot is at the top-center of the sprite (head)
// Bottom half is the "butt" bounce zone
var BUTT_RATIO=0.5; // bottom 50% of sprite is butt

// Load hamster skins
var playerImg=new Image();
playerImg.src='assets/jump.png';
// Load obstacle images (per level)
var catImgs=[];
for(var ci=1;ci<=11;ci++){
  var cimg=new Image();
  cimg.src='assets/cat/cat'+ci+'.png';
  catImgs.push(cimg);
}
var skinImgs={};
for(var si=1;si<=7;si++){
  skinImgs[si]=new Image();
  skinImgs[si].src='assets/skin'+si+'.png';
}
// Level→skin mapping (0-indexed level): null = default jump.png
var LEVEL_SKINS=[null,null,'skin3','skin1','skin1','skin2','skin2','skin4','skin5','skin6','skin7'];

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
var LEVEL_HEIGHTS=[1000,2000,4000,8000,10000,15000,20000,30000,45000,70000,100000];
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
  phase:'title', // title, play, victory
  level:0, // 0-indexed current level
  // World position (camera)
  camX:0, camY:0,
  // Player
  px:W/2, py:H*0.7,
  vx:0, vy:0,
  springAngle:Math.PI/2,
  swingDir:0,
  altitude:0,
  time:0,
  // Obstacles & walls
  obstacles:[],
  wallSegments:[],
  wallWidth:20,
  nextObstacleY:0,
  nextWallY:0,
  // Level transition
  levelBanner:0 // countdown timer for showing level banner
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

// Butt top (where butt zone starts, halfway down)
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
  state.vx = dirX*bounceV*0.6;
  state.vy = dirY*bounceV;
  if(state.vy>-2) state.vy=-Math.abs(bounceV)*0.5;
}

function update(dt){
  if(state.phase==='victory'){
    state.victoryTime=(state.victoryTime||0)+dt;
    return;
  }
  if(state.phase!=='play') return;
  state.time+=dt;

  // Swing spring
  if(state.swingDir!==0){
    state.springAngle+=state.swingDir*SWING_SPEED;
    // Clamp: don't go above horizontal
    if(state.springAngle<0.2) state.springAngle=0.2;
    if(state.springAngle>Math.PI-0.2) state.springAngle=Math.PI-0.2;
  }

  // Gravity
  var g=getGravity();
  state.vy+=g;

  // Move
  state.px+=state.vx;
  state.py+=state.vy;

  // Dampen horizontal
  state.vx*=0.99;

  // Butt end for collision
  var buttEnd=getButtEnd();

  // Check obstacle collision — butt zone → bounce
  for(var i=0;i<state.obstacles.length;i++){
    var ob=state.obstacles[i];
    // Check if butt end touches obstacle
    if(buttEnd.x>=ob.x && buttEnd.x<=ob.x+ob.w && buttEnd.y>=ob.y-2 && buttEnd.y<=ob.y+ob.h+2){
      if(state.vy>0){
        state.py=ob.y-Math.sin(state.springAngle)*SPRITE_H-2;
        ob.squish=1.0;
        bounce();
        break;
      }
    }
    // Also check butt top point
    var bt=getButtTop();
    if(bt.x>=ob.x && bt.x<=ob.x+ob.w && bt.y>=ob.y-2 && bt.y<=ob.y+ob.h+2){
      if(state.vy>0){
        var buttStart=SPRITE_H*(1-BUTT_RATIO);
        state.py=ob.y-Math.sin(state.springAngle)*buttStart-2;
        ob.squish=1.0;
        bounce();
        break;
      }
    }
  }

  // Wall collision (butt → bounce)
  var walls=getWallAt(buttEnd.y);
  if(buttEnd.x<=walls.left+state.wallWidth){
    state.px=walls.left+state.wallWidth-Math.cos(state.springAngle)*SPRITE_H+2;
    state.vx=Math.abs(state.vx)+1;
    bounce();
  }
  if(buttEnd.x>=walls.right){
    state.px=walls.right-Math.cos(state.springAngle)*SPRITE_H-2;
    state.vx=-Math.abs(state.vx)-1;
    bounce();
  }

  // Head collision with obstacles → only when falling (passable from below)
  var headR=SPRITE_W*0.3;
  for(var j=0;j<state.obstacles.length;j++){
    var ob2=state.obstacles[j];
    if(state.vy<=0) continue; // moving up → pass through
    if(state.px+headR>=ob2.x && state.px-headR<=ob2.x+ob2.w && state.py>=ob2.y-headR && state.py<=ob2.y+ob2.h+headR){
      // Determine collision normal
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
      // Bottom of obstacle (head hitting underside) → stop
      if(ny===1){
        state.vx=0; state.vy=0;
      } else {
        // Mirror reflect velocity along normal
        var dot=state.vx*nx+state.vy*ny;
        state.vx=state.vx-2*dot*nx;
        state.vy=state.vy-2*dot*ny;
        var spd=Math.sqrt(state.vx*state.vx+state.vy*state.vy);
        if(spd<BOUNCE_SPEED){
          var scale=BOUNCE_SPEED/(spd||1);
          state.vx*=scale; state.vy*=scale;
        }
      }
    }
  }

  // Head wall collision → mirror reflection bounce
  var wallsHead=getWallAt(state.py);
  if(state.px-headR<=wallsHead.left+state.wallWidth){
    state.px=wallsHead.left+state.wallWidth+headR+2;
    // Reflect off left wall (normal points right)
    state.vx=Math.abs(state.vx);
    var spd2=Math.sqrt(state.vx*state.vx+state.vy*state.vy);
    if(spd2<BOUNCE_SPEED){ var s=BOUNCE_SPEED/(spd2||1); state.vx*=s; state.vy*=s; }
  }
  if(state.px+headR>=wallsHead.right){
    state.px=wallsHead.right-headR-2;
    // Reflect off right wall (normal points left)
    state.vx=-Math.abs(state.vx);
    var spd3=Math.sqrt(state.vx*state.vx+state.vy*state.vy);
    if(spd3<BOUNCE_SPEED){ var s2=BOUNCE_SPEED/(spd3||1); state.vx*=s2; state.vy*=s2; }
  }

  // Decay squish animation on all obstacles
  for(var sq=0;sq<state.obstacles.length;sq++){
    if(state.obstacles[sq].squish>0) state.obstacles[sq].squish*=0.7;
    if(state.obstacles[sq].squish<0.01) state.obstacles[sq].squish=0;
  }

  // Ground bounce (initial ground only, no finish line floors)
  var groundY = H*0.85;
  if(buttEnd.y > groundY){
    state.py=groundY-Math.sin(state.springAngle)*SPRITE_H;
    bounce();
  }

  // Update altitude
  state.altitude=Math.max(state.altitude, -state.py);

  // Level check: cross finish line → advance level or victory
  var finishAlt=LEVEL_THRESHOLDS[state.level];
  if(state.altitude>=finishAlt){
    if(state.level>=LEVEL_THRESHOLDS.length-1){
      // Beat the last level → victory!
      state.phase='victory';
      state.victoryTime=0;
      return;
    }
    state.level++;
    state.levelBanner=180; // show banner for ~3 seconds
  }
  if(state.levelBanner>0) state.levelBanner--;

  // Camera: follow player vertically (player stays in upper-lower area)
  var targetCamY=state.py-H*0.6;
  state.camY+=(targetCamY-state.camY)*0.1;
  // Horizontal: center on player
  state.camX=state.px-W/2;

  // Generate more content
  generateObstacles();
  generateWalls();

  // No cleanup — obstacles and walls persist as a long scroll
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
    var scaleX=1.0+sq*0.4;
    var scaleY=1.0-sq*0.4;
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

  // Draw finish lines as large cat images
  for(var li=0;li<LEVEL_THRESHOLDS.length;li++){
    var finishY=-LEVEL_THRESHOLDS[li];
    var cimg=catImgs[li];
    if(cimg && finishY>state.camY-200 && finishY<state.camY+H+200){
      var fW=W*0.6;
      var ratio=cimg.naturalHeight/cimg.naturalWidth;
      if(!ratio||!isFinite(ratio)) ratio=1;
      var fH=fW*ratio;
      var fX=W/2-fW/2; // centered in world X (fixed position like obstacles)
      ctx.drawImage(cimg, fX, finishY-fH, fW, fH);
      // Label
      ctx.fillStyle='#fd8';
      ctx.font='bold 12px "Courier New",monospace';
      ctx.textAlign='center';
      ctx.fillText('第'+(li+1)+'关 终点 — '+LEVEL_THRESHOLDS[li]+'m', W/2, finishY-fH-6);
    }
  }

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
}

function drawPlayer(){
  var px=state.px, py=state.py;
  var angle=state.springAngle;

  ctx.save();
  ctx.translate(px, py);
  // Rotate so sprite's top (head) is at pivot, body extends along angle
  // Default sprite: head at top, butt at bottom. We need to rotate from "down" (PI/2) to current angle
  ctx.rotate(angle - Math.PI/2);
  // Draw sprite centered horizontally, extending downward from pivot
  var pimg=getPlayerImg();
  if(pimg){
    ctx.drawImage(pimg, -SPRITE_W/2, 0, SPRITE_W, SPRITE_H);
  } else {
    // Fallback: simple oval
    ctx.fillStyle='#c84';
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
  touchStartX=e.touches[0].clientX;
  var mid=window.innerWidth/2;
  if(touchStartX<mid) state.swingDir=-1;
  else state.swingDir=1;
},{passive:false});
canvas.addEventListener('touchend',function(e){
  e.preventDefault();
  state.swingDir=0;
},{passive:false});

canvas.addEventListener('click',function(){
  if(state.phase==='title'||state.phase==='victory') startGame();
});

// ============================================================
// GAME CONTROL
// ============================================================
function startGame(){
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
  generateObstacles();
  generateWalls();
}

// ============================================================
// GAME LOOP & LOADING
// ============================================================
var lastTime=Date.now();
var gameStarted=false;

function loop(){
  var now=Date.now();
  var dt=Math.min((now-lastTime)/1000, 0.05);
  lastTime=now;
  update(dt*60);
  draw();
  requestAnimationFrame(loop);
}

// Collect all images to preload
var allImages=[playerImg].concat(bgImgs).concat(catImgs);
for(var sk=1;sk<=7;sk++) allImages.push(skinImgs[sk]);
var totalImages=allImages.length;
var loadedCount=0;

function onImageReady(){
  loadedCount++;
  drawLoadingScreen();
  if(loadedCount>=totalImages && !gameStarted){
    gameStarted=true;
    state.phase='title';
    lastTime=Date.now();
    loop();
  }
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

  // Progress bar
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

// Start preloading — use decode() for full readiness
drawLoadingScreen();
allImages.forEach(function(img){
  function tryDecode(){
    if(typeof img.decode==='function'){
      img.decode().then(onImageReady).catch(onImageReady);
    } else {
      onImageReady();
    }
  }
  if(img.complete && img.naturalWidth>0){
    tryDecode();
  } else {
    img.onload=tryDecode;
    img.onerror=onImageReady;
  }
});

})();
