(function(){
'use strict';

const WORLD_W=2400, WORLD_H=2400;
const VIEW_W=600, VIEW_H=600;
const RIVER_HALF=283; // river band: |x-y| < RIVER_HALF
const ATTACK_RANGE=150;
const ATTACK_INTERVAL=60; // ticks (1s at 60fps)
const R_MAX_DIST=400;
const R_COOLDOWN_BASE=1800; // 30s
const MINION_SPAWN_INTERVAL=180; // 3s
const BUFF_RESPAWN=5400; // 90s
const BOSS_RESPAWN=5400;
const FOUNTAIN_RADIUS=140;
const BUFF_RADIUS=55;
const BOSS_SPAWN_RADIUS=130;

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');

function resize(){
  const s=Math.min(window.innerWidth,window.innerHeight);
  canvas.style.width=s+'px'; canvas.style.height=s+'px';
  canvas.width=VIEW_W; canvas.height=VIEW_H;
}
window.addEventListener('resize',resize); resize();

// ── Obstacles (axis-aligned for collision simplicity) ──────────────────────
const OBSTACLES=[
  {x:200,y:460,w:160,h:35},{x:160,y:580,w:40,h:120},
  {x:130,y:800,w:160,h:35},{x:80,y:970,w:40,h:130},
  {x:320,y:730,w:150,h:35},{x:260,y:920,w:40,h:110},
  {x:390,y:1080,w:160,h:35},{x:620,y:880,w:150,h:35},
  {x:720,y:1080,w:160,h:35},{x:570,y:1270,w:40,h:120},
  {x:870,y:1270,w:160,h:35},{x:470,y:1530,w:160,h:35},
  {x:770,y:1580,w:200,h:35},{x:1070,y:1480,w:160,h:35},
  {x:870,y:680,w:120,h:35},{x:1070,y:880,w:120,h:35},
  {x:1270,y:1080,w:120,h:35},{x:1470,y:1280,w:120,h:35},
  {x:1670,y:1480,w:120,h:35},{x:270,y:1880,w:200,h:35},
  {x:670,y:1880,w:200,h:35},{x:1070,y:1880,w:200,h:35},
];

const FOUNTAIN_POS={x:160,y:2200};
const BOSS_SPAWN={x:1500,y:900};
const BLUE_BUFF_POS={x:480,y:1100};
const RED_BUFF_POS={x:1000,y:1600};

// ── State ──────────────────────────────────────────────────────────────────
let tick=0;
let mouseX=VIEW_W/2, mouseY=VIEW_H/2;

const player={
  x:300,y:2000,hp:3,maxHp:3,gold:0,speed:1,
  targetX:300,targetY:2000,moving:false,
  attackTimer:0,
  hasRedBuff:false,redBuffTimer:0,
  hasBlueBuff:false,blueBuffTimer:0,
  invincibleTimer:0, // brief invincibility after hit
};

let rCooldown=0;
let rMaxCooldown=R_COOLDOWN_BASE;

// Ult jump state
const ult={active:false,sx:0,sy:0,tx:0,ty:0,progress:0,duration:30,landRadius:120,immunityTimer:0};

let camX=0,camY=0;

// Minions array
const minions=[];
let minionSpawnTimer=0;

// Bullets array
const bullets=[];

// Burn ticks on enemies: Map<entity, {timer, source}>
// We'll store burn directly on entities

// Boss
const boss={
  x:BOSS_SPAWN.x,y:BOSS_SPAWN.y,
  hp:50,maxHp:50,
  alive:false,respawnTimer:0,
  chasing:false,speed:0.217,
  burnTimer:0,burnDmgTimer:0,
  slowTimer:0,
};

// Buffs
const redBuff={x:RED_BUFF_POS.x,y:RED_BUFF_POS.y,hp:10,maxHp:10,alive:false,respawnTimer:0,burnTimer:0,burnDmgTimer:0,slowTimer:0};
const blueBuff={x:BLUE_BUFF_POS.x,y:BLUE_BUFF_POS.y,hp:10,maxHp:10,alive:false,respawnTimer:0};

// Game over
let gameOver=false;
let gameOverTimer=0;

// ── Helpers ────────────────────────────────────────────────────────────────
function wx(x){return x-camX;}
function wy(y){return y-camY;}
function dist(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}

function inRiver(x,y){return Math.abs(x-y)<RIVER_HALF;}
function inPlayable(x,y){
  // Playable: inside world bounds AND (below river lower edge OR in river)
  // River lower edge: x-y = RIVER_HALF => y = x - RIVER_HALF
  // Playable area: y > x - RIVER_HALF  (below the lower river edge)
  // Also must be inside world square
  if(x<0||y<0||x>WORLD_W||y>WORLD_H) return false;
  return (y-x)>-RIVER_HALF; // includes river and playable triangle
}
function inFountain(x,y){
  const dx=x-FOUNTAIN_POS.x,dy=y-FOUNTAIN_POS.y;
  return dx*dx+dy*dy<FOUNTAIN_RADIUS*FOUNTAIN_RADIUS;
}

function rectContains(o,x,y,r){
  // AABB check with radius r
  return x+r>o.x-o.w/2&&x-r<o.x+o.w/2&&y+r>o.y-o.h/2&&y-r<o.y+o.h/2;
}
function collidesObstacle(x,y,r){
  for(const o of OBSTACLES){
    if(rectContains(o,x,y,r)) return true;
  }
  return false;
}

// Move entity toward target, stop at obstacles/boundary
function moveToward(entity,tx,ty,speed){
  const dx=tx-entity.x, dy=ty-entity.y;
  const d=Math.sqrt(dx*dx+dy*dy);
  if(d<speed){entity.x=tx;entity.y=ty;return true;}
  const nx=entity.x+dx/d*speed;
  const ny=entity.y+dy/d*speed;
  const r=entity===player?12:8;
  if(inPlayable(nx,ny)&&!collidesObstacle(nx,ny,r)&&!inFountain(nx,ny)){
    entity.x=nx;entity.y=ny;
  }
  return false;
}

// Pathfinding: simple steering around obstacles for minions
// Returns a direction vector (dx,dy) normalized
function steerMinion(m,tx,ty){
  const dx=tx-m.x,dy=ty-m.y;
  const d=Math.sqrt(dx*dx+dy*dy);
  if(d<1) return {dx:0,dy:0};
  const ndx=dx/d,ndy=dy/d;
  // Try direct
  const nx=m.x+ndx*m.speed,ny=m.y+ndy*m.speed;
  if(!collidesObstacle(nx,ny,8)&&inPlayable(nx,ny)&&!inFountain(nx,ny)){
    return {dx:ndx,dy:ndy};
  }
  // Try perpendicular directions
  for(const angle of [0.4,-0.4,0.8,-0.8,1.2,-1.2,Math.PI/2,-Math.PI/2]){
    const a=Math.atan2(ndy,ndx)+angle;
    const adx=Math.cos(a),ady=Math.sin(a);
    const ax=m.x+adx*m.speed,ay=m.y+ady*m.speed;
    if(!collidesObstacle(ax,ay,8)&&inPlayable(ax,ay)&&!inFountain(ax,ay)){
      return {dx:adx,dy:ady};
    }
  }
  return {dx:0,dy:0};
}

// Spawn a minion at a random edge of the visible area (world boundary edge)
function spawnMinion(){
  let x,y;
  // Spawn along the playable boundary edges
  const edge=Math.floor(Math.random()*3);
  if(edge===0){x=Math.random()*WORLD_W;y=WORLD_H-5;}       // bottom
  else if(edge===1){x=5;y=Math.random()*WORLD_H;}           // left
  else{x=Math.random()*800;y=WORLD_H-5-Math.random()*800;}  // bottom-left area
  // Ensure in playable
  if(!inPlayable(x,y)||inFountain(x,y)) return;
  minions.push({x,y,hp:3,maxHp:3,speed:0.217,burnTimer:0,burnDmgTimer:0,slowTimer:0,hitTimer:0});
}

// ── Input ──────────────────────────────────────────────────────────────────
canvas.addEventListener('contextmenu',function(e){
  e.preventDefault();
  if(gameOver) return;
  const r=canvas.getBoundingClientRect();
  const sx=(e.clientX-r.left)*(VIEW_W/r.width);
  const sy=(e.clientY-r.top)*(VIEW_H/r.height);
  const wx2=sx+camX, wy2=sy+camY;
  if(!inPlayable(wx2,wy2)) return;
  player.targetX=wx2; player.targetY=wy2; player.moving=true;
});

canvas.addEventListener('mousemove',function(e){
  const r=canvas.getBoundingClientRect();
  mouseX=(e.clientX-r.left)*(VIEW_W/r.width);
  mouseY=(e.clientY-r.top)*(VIEW_H/r.height);
});

window.addEventListener('keydown',function(e){
  if(gameOver) return;
  if(e.key==='r'||e.key==='R'){
    if(rCooldown>0) return;
    // Cancel movement
    player.moving=false;
    // Compute target in world coords
    const wmx=mouseX+camX, wmy=mouseY+camY;
    const dx=wmx-player.x, dy=wmy-player.y;
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d<1) return;
    const dist2=Math.min(d,R_MAX_DIST);
    let tx=player.x+dx/d*dist2;
    let ty=player.y+dy/d*dist2;
    // Clamp to playable
    if(!inPlayable(tx,ty)){tx=player.x+dx/d*(dist2*0.5);ty=player.y+dy/d*(dist2*0.5);}
    // If landing on obstacle, stop before it
    if(collidesObstacle(tx,ty,12)){
      // Walk back until clear
      for(let s=dist2;s>0;s-=10){
        const cx=player.x+dx/d*s, cy=player.y+dy/d*s;
        if(!collidesObstacle(cx,cy,12)&&inPlayable(cx,cy)){tx=cx;ty=cy;break;}
      }
    }
    ult.active=true; ult.sx=player.x; ult.sy=player.y;
    ult.tx=tx; ult.ty=ty; ult.progress=0;
    rCooldown=rMaxCooldown;
  }
  if(e.key==='Escape'&&gameOver){restartGame();}
});

// ── Update ─────────────────────────────────────────────────────────────────
function updatePlayer(){
  if(ult.active) return; // frozen during ult jump

  // Move
  if(player.moving){
    const dx=player.targetX-player.x, dy=player.targetY-player.y;
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d<player.speed){
      player.x=player.targetX; player.y=player.targetY; player.moving=false;
    } else {
      const nx=player.x+dx/d*player.speed;
      const ny=player.y+dy/d*player.speed;
      if(inPlayable(nx,ny)&&!collidesObstacle(nx,ny,12)){
        player.x=nx; player.y=ny;
      } else {
        player.moving=false;
      }
    }
  }

  // Buff timers
  if(player.hasRedBuff){player.redBuffTimer--;if(player.redBuffTimer<=0)player.hasRedBuff=false;}
  if(player.hasBlueBuff){player.blueBuffTimer--;if(player.blueBuffTimer<=0){player.hasBlueBuff=false;rMaxCooldown=R_COOLDOWN_BASE;}}
  if(player.invincibleTimer>0) player.invincibleTimer--;

  // Attack timer
  player.attackTimer++;
  if(player.attackTimer>=ATTACK_INTERVAL){
    player.attackTimer=0;
    fireAtNearest();
  }
}

function fireAtNearest(){
  // Find nearest target in range: minions first, then boss, then buffs
  let nearest=null, nearestDist=ATTACK_RANGE;

  for(const m of minions){
    const d=dist(player,m);
    if(d<nearestDist){nearestDist=d;nearest={type:'minion',ref:m};}
  }
  if(boss.alive){
    const d=dist(player,boss);
    if(d<nearestDist){nearestDist=d;nearest={type:'boss',ref:boss};}
  }
  if(redBuff.alive){
    const d=dist(player,redBuff);
    if(d<nearestDist){nearestDist=d;nearest={type:'redbuff',ref:redBuff};}
  }
  if(blueBuff.alive){
    const d=dist(player,blueBuff);
    if(d<nearestDist){nearestDist=d;nearest={type:'bluebuff',ref:blueBuff};}
  }

  if(!nearest) return;
  bullets.push({
    x:player.x,y:player.y,
    tx:nearest.ref.x,ty:nearest.ref.y,
    target:nearest,speed:6,
    applyBurn:player.hasRedBuff,
  });
}

function updateBullets(){
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    const dx=b.tx-b.x, dy=b.ty-b.y;
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d<b.speed){
      // Hit
      hitTarget(b.target,1,b.applyBurn);
      bullets.splice(i,1);
    } else {
      b.x+=dx/d*b.speed; b.y+=dy/d*b.speed;
    }
  }
}

function hitTarget(target,dmg,applyBurn){
  const e=target.ref;
  if(!e||e.hp===undefined) return;
  // boss/buff only take normal attack damage (not ult)
  e.hp-=dmg;
  if(applyBurn&&target.type!=='player'){
    e.burnTimer=18; // 60s * 0.3 = burn ticks (we use 18 = 3s of burn)
    // Actually burn = 60s buff, but burn effect on enemy = ongoing
    e.burnTimer=360; // 6s burn per hit refresh
    e.burnDmgTimer=0;
    e.slowTimer=360;
  }
  if(e.hp<=0) killEntity(target);
}

function killEntity(target){
  if(target.type==='minion'){
    const idx=minions.indexOf(target.ref);
    if(idx>=0) minions.splice(idx,1);
    player.gold+=1;
  } else if(target.type==='boss'){
    boss.alive=false;
    boss.respawnTimer=BOSS_RESPAWN;
    player.gold+=100;
  } else if(target.type==='redbuff'){
    redBuff.alive=false;
    redBuff.respawnTimer=BUFF_RESPAWN;
    player.hasRedBuff=true;
    player.redBuffTimer=3600; // 60s
  } else if(target.type==='bluebuff'){
    blueBuff.alive=false;
    blueBuff.respawnTimer=BUFF_RESPAWN;
    player.hasBlueBuff=true;
    player.blueBuffTimer=3600;
    rMaxCooldown=Math.round(R_COOLDOWN_BASE*0.1); // 90% reduction
  }
}

function updateBurnOnEntity(e){
  if(e.burnTimer>0){
    e.burnTimer--;
    e.burnDmgTimer++;
    if(e.burnDmgTimer>=12){ // every 0.2s at 60fps
      e.burnDmgTimer=0;
      e.hp-=0.5;
      if(e.hp<=0) e.hp=0;
    }
  } else {
    e.slowTimer=0;
  }
}

function updateMinions(){
  minionSpawnTimer++;
  if(minionSpawnTimer>=MINION_SPAWN_INTERVAL){
    minionSpawnTimer=0;
    spawnMinion();
  }

  for(let i=minions.length-1;i>=0;i--){
    const m=minions[i];
    if(m.hp<=0){minions.splice(i,1);player.gold+=1;continue;}

    updateBurnOnEntity(m);
    if(m.hp<=0){minions.splice(i,1);player.gold+=1;continue;}

    if(m.hitTimer>0) m.hitTimer--;

    const spd=m.slowTimer>0?m.speed*0.7:m.speed;
    const dir=steerMinion(m,player.x,player.y);
    const nx=m.x+dir.dx*spd, ny=m.y+dir.dy*spd;
    if(inPlayable(nx,ny)&&!inFountain(nx,ny)) {m.x=nx;m.y=ny;}

    // Collision with player
    if(player.invincibleTimer===0&&!ult.active&&ult.immunityTimer===0&&dist(player,m)<20){
      player.hp--;
      player.invincibleTimer=120;
      if(player.hp<=0){triggerGameOver();return;}
    }
  }
}

function updateBoss(){
  if(!boss.alive){
    boss.respawnTimer--;
    if(boss.respawnTimer<=0){
      boss.alive=true;
      boss.hp=boss.maxHp;
      boss.x=BOSS_SPAWN.x; boss.y=BOSS_SPAWN.y;
      boss.chasing=false;
    }
    return;
  }

  updateBurnOnEntity(boss);
  if(boss.hp<=0){
    boss.alive=false; boss.respawnTimer=BOSS_RESPAWN; player.gold+=100; return;
  }

  const playerInRiver=inRiver(player.x,player.y);
  if(playerInRiver){
    boss.chasing=true;
  } else {
    if(boss.chasing){
      // Return to spawn
      boss.chasing=false;
      boss.hp=boss.maxHp;
    }
  }

  if(boss.chasing){
    const dx=player.x-boss.x, dy=player.y-boss.y;
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d>boss.speed){boss.x+=dx/d*boss.speed;boss.y+=dy/d*boss.speed;}
    // Collision with player
    if(player.invincibleTimer===0&&dist(player,boss)<40){
      player.hp--;
      player.invincibleTimer=120;
      if(player.hp<=0){triggerGameOver();return;}
    }
  } else {
    // Return to spawn
    const dx=BOSS_SPAWN.x-boss.x, dy=BOSS_SPAWN.y-boss.y;
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d>boss.speed){boss.x+=dx/d*boss.speed;boss.y+=dy/d*boss.speed;}
  }
}

function updateBuffs(){
  if(!redBuff.alive){
    redBuff.respawnTimer--;
    if(redBuff.respawnTimer<=0){
      redBuff.alive=true; redBuff.hp=redBuff.maxHp;
      redBuff.x=RED_BUFF_POS.x; redBuff.y=RED_BUFF_POS.y;
    }
  } else {
    updateBurnOnEntity(redBuff);
    if(redBuff.hp<=0){
      redBuff.alive=false; redBuff.respawnTimer=BUFF_RESPAWN;
      player.hasRedBuff=true; player.redBuffTimer=3600;
    }
  }
  if(!blueBuff.alive){
    blueBuff.respawnTimer--;
    if(blueBuff.respawnTimer<=0){
      blueBuff.alive=true; blueBuff.hp=blueBuff.maxHp;
      blueBuff.x=BLUE_BUFF_POS.x; blueBuff.y=BLUE_BUFF_POS.y;
    }
  } else {
    if(blueBuff.hp<=0){
      blueBuff.alive=false; blueBuff.respawnTimer=BUFF_RESPAWN;
      player.hasBlueBuff=true; player.blueBuffTimer=3600;
      rMaxCooldown=Math.round(R_COOLDOWN_BASE*0.1);
    }
  }
}

function updateUlt(){
  if(!ult.active) return;
  ult.progress+=1/ult.duration;
  if(ult.progress>=1){
    ult.progress=1;
    player.x=ult.tx; player.y=ult.ty;
    ult.active=false;
    ult.immunityTimer=60; // 1s immunity after landing
    // AoE damage to minions only
    for(let i=minions.length-1;i>=0;i--){
      if(dist({x:ult.tx,y:ult.ty},minions[i])<ult.landRadius){
        minions[i].hp-=999;
        if(minions[i].hp<=0){minions.splice(i,1);player.gold+=1;}
      }
    }
  } else {
    // Interpolate position (arc)
    const t=ult.progress;
    player.x=ult.sx+(ult.tx-ult.sx)*t;
    player.y=ult.sy+(ult.ty-ult.sy)*t;
  }
}

function triggerGameOver(){
  gameOver=true;
}

function restartGame(){
  gameOver=false;
  player.x=300;player.y=2000;player.hp=3;player.gold=0;
  player.moving=false;player.targetX=300;player.targetY=2000;
  player.attackTimer=0;player.invincibleTimer=0;
  player.hasRedBuff=false;player.hasBlueBuff=false;
  rCooldown=0;rMaxCooldown=R_COOLDOWN_BASE;
  ult.active=false;
  minions.length=0;bullets.length=0;
  boss.alive=false;boss.respawnTimer=300;boss.hp=boss.maxHp;boss.chasing=false;
  redBuff.alive=false;redBuff.respawnTimer=300;redBuff.hp=redBuff.maxHp;
  blueBuff.alive=false;blueBuff.respawnTimer=300;blueBuff.hp=blueBuff.maxHp;
  tick=0;minionSpawnTimer=0;
}

function update(){
  if(gameOver) return;
  tick++;
  if(rCooldown>0) rCooldown--;
  if(ult.immunityTimer>0) ult.immunityTimer--;
  updateUlt();
  updatePlayer();
  updateMinions();
  updateBoss();
  updateBuffs();
  updateBullets();
  // Camera
  camX=Math.max(0,Math.min(WORLD_W-VIEW_W,player.x-VIEW_W/2));
  camY=Math.max(0,Math.min(WORLD_H-VIEW_H,player.y-VIEW_H/2));
}

// ── Draw ───────────────────────────────────────────────────────────────────
function drawMap(){
  // Background: dark green playable area
  ctx.fillStyle='#1a4a1a';
  ctx.fillRect(0,0,VIEW_W,VIEW_H);

  // Non-playable upper-right triangle (dark)
  ctx.save();
  ctx.fillStyle='#1e1e1e';
  ctx.beginPath();
  ctx.moveTo(wx(0),wy(0));
  ctx.lineTo(wx(WORLD_W),wy(0));
  ctx.lineTo(wx(WORLD_W),wy(WORLD_H));
  ctx.lineTo(wx(WORLD_H-RIVER_HALF),wy(WORLD_H));
  ctx.lineTo(wx(0),wy(RIVER_HALF));
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // River band (deep blue)
  ctx.save();
  ctx.fillStyle='#1a4a8a';
  ctx.beginPath();
  ctx.moveTo(wx(0),wy(RIVER_HALF));
  ctx.lineTo(wx(WORLD_W-RIVER_HALF),wy(WORLD_H));
  ctx.lineTo(wx(WORLD_W),wy(WORLD_H-RIVER_HALF));
  ctx.lineTo(wx(RIVER_HALF),wy(0));
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Obstacles
  ctx.fillStyle='#111';
  for(const o of OBSTACLES){
    const sx=wx(o.x),sy=wy(o.y);
    if(sx<-300||sx>VIEW_W+300||sy<-300||sy>VIEW_H+300) continue;
    ctx.fillRect(sx-o.w/2,sy-o.h/2,o.w,o.h);
  }

  // Fountain
  ctx.save();ctx.globalAlpha=0.8;
  ctx.fillStyle='#f5e06a';
  ctx.beginPath();ctx.arc(wx(FOUNTAIN_POS.x),wy(FOUNTAIN_POS.y),FOUNTAIN_RADIUS,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#c8a800';ctx.lineWidth=4;ctx.stroke();
  ctx.restore();
  ctx.fillStyle='#7a5c00';ctx.font='bold 13px Courier New';ctx.textAlign='center';
  ctx.fillText('泉水',wx(FOUNTAIN_POS.x),wy(FOUNTAIN_POS.y)+5);

  // Blue buff zone
  if(!blueBuff.alive){
    ctx.save();ctx.globalAlpha=0.25;
    ctx.fillStyle='#6ab0f5';
    ctx.beginPath();ctx.arc(wx(BLUE_BUFF_POS.x),wy(BLUE_BUFF_POS.y),BUFF_RADIUS,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.fillStyle='#336';ctx.font='10px Courier New';ctx.textAlign='center';
    ctx.fillText('蓝buff('+Math.ceil(blueBuff.respawnTimer/60)+'s)',wx(BLUE_BUFF_POS.x),wy(BLUE_BUFF_POS.y)+5);
  }

  // Red buff zone
  if(!redBuff.alive){
    ctx.save();ctx.globalAlpha=0.25;
    ctx.fillStyle='#f5a0a0';
    ctx.beginPath();ctx.arc(wx(RED_BUFF_POS.x),wy(RED_BUFF_POS.y),BUFF_RADIUS,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.fillStyle='#633';ctx.font='10px Courier New';ctx.textAlign='center';
    ctx.fillText('红buff('+Math.ceil(redBuff.respawnTimer/60)+'s)',wx(RED_BUFF_POS.x),wy(RED_BUFF_POS.y)+5);
  }

  // Boss spawn zone
  ctx.save();
  ctx.fillStyle='rgba(180,60,160,0.25)';
  ctx.beginPath();
  ctx.arc(wx(BOSS_SPAWN.x),wy(BOSS_SPAWN.y),BOSS_SPAWN_RADIUS,Math.PI*0.25,Math.PI*1.25);
  ctx.closePath();ctx.fill();
  ctx.strokeStyle='#c040a0';ctx.lineWidth=2;ctx.stroke();
  ctx.restore();
  if(!boss.alive){
    ctx.fillStyle='#804060';ctx.font='10px Courier New';ctx.textAlign='center';
    ctx.fillText('boss('+Math.ceil(boss.respawnTimer/60)+'s)',wx(BOSS_SPAWN.x),wy(BOSS_SPAWN.y));
  }

  // World boundary
  ctx.strokeStyle='#cc0000';ctx.lineWidth=3;
  ctx.strokeRect(wx(0),wy(0),WORLD_W,WORLD_H);
}

function drawHealthBar(x,y,hp,maxHp,w,color){
  const bx=wx(x)-w/2, by=wy(y)-28;
  ctx.fillStyle='#333';ctx.fillRect(bx,by,w,5);
  ctx.fillStyle=color;ctx.fillRect(bx,by,w*(hp/maxHp),5);
}

function drawEntities(){
  // Attack range circle (subtle)
  ctx.save();ctx.globalAlpha=0.08;
  ctx.strokeStyle='#88aaff';ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(wx(player.x),wy(player.y),ATTACK_RANGE,0,Math.PI*2);ctx.stroke();
  ctx.restore();

  // Ult landing indicator
  if(ult.active){
    ctx.save();ctx.globalAlpha=0.3;
    ctx.strokeStyle='#cc88ff';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(wx(ult.tx),wy(ult.ty),ult.landRadius,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }

  // Minions
  for(const m of minions){
    const sx=wx(m.x),sy=wy(m.y);
    if(sx<-50||sx>VIEW_W+50||sy<-50||sy>VIEW_H+50) continue;
    ctx.save();
    if(m.burnTimer>0){ctx.shadowColor='#ff4400';ctx.shadowBlur=8;}
    ctx.fillStyle='#cc3333';
    ctx.beginPath();ctx.arc(sx,sy,8,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ff6666';ctx.lineWidth=1.5;ctx.stroke();
    ctx.restore();
    drawHealthBar(m.x,m.y,m.hp,m.maxHp,24,'#e03030');
  }

  // Red buff
  if(redBuff.alive){
    const sx=wx(redBuff.x),sy=wy(redBuff.y);
    const p=0.65+0.35*Math.sin(tick*0.07);
    ctx.save();ctx.globalAlpha=p;
    ctx.fillStyle='#dd2200';
    ctx.beginPath();ctx.arc(sx,sy,30,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ff6633';ctx.lineWidth=2;ctx.stroke();
    ctx.restore();
    ctx.fillStyle='#880000';ctx.font='bold 11px Courier New';ctx.textAlign='center';
    ctx.fillText('红buff',sx,sy+5);
    drawHealthBar(redBuff.x,redBuff.y,redBuff.hp,redBuff.maxHp,40,'#e03030');
  }

  // Blue buff
  if(blueBuff.alive){
    const sx=wx(blueBuff.x),sy=wy(blueBuff.y);
    const p=0.65+0.35*Math.sin(tick*0.07+Math.PI);
    ctx.save();ctx.globalAlpha=p;
    ctx.fillStyle='#0033cc';
    ctx.beginPath();ctx.arc(sx,sy,30,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#3399ff';ctx.lineWidth=2;ctx.stroke();
    ctx.restore();
    ctx.fillStyle='#003388';ctx.font='bold 11px Courier New';ctx.textAlign='center';
    ctx.fillText('蓝buff',sx,sy+5);
    drawHealthBar(blueBuff.x,blueBuff.y,blueBuff.hp,blueBuff.maxHp,40,'#3399ff');
  }

  // Boss
  if(boss.alive){
    const sx=wx(boss.x),sy=wy(boss.y);
    ctx.save();
    if(boss.burnTimer>0){ctx.shadowColor='#ff4400';ctx.shadowBlur=12;}
    const g=ctx.createRadialGradient(sx,sy,10,sx,sy,45);
    g.addColorStop(0,'rgba(120,0,200,0.7)');g.addColorStop(1,'rgba(120,0,200,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,sy,45,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#7700cc';ctx.beginPath();ctx.arc(sx,sy,28,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#cc44ff';ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle='#ff0';
    ctx.beginPath();ctx.arc(sx-9,sy-7,4,0,Math.PI*2);ctx.arc(sx+9,sy-7,4,0,Math.PI*2);ctx.fill();
    ctx.restore();
    drawHealthBar(boss.x,boss.y,boss.hp,boss.maxHp,60,'#cc44ff');
  }

  // Bullets
  ctx.fillStyle='#ffe066';
  for(const b of bullets){
    ctx.beginPath();ctx.arc(wx(b.x),wy(b.y),4,0,Math.PI*2);ctx.fill();
  }

  // Ult arc (player during jump)
  if(ult.active){
    const t=ult.progress;
    const px=ult.sx+(ult.tx-ult.sx)*t;
    const py=ult.sy+(ult.ty-ult.sy)*t;
    const arc=Math.sin(t*Math.PI)*60; // height
    const sx2=wx(px),sy2=wy(py)-arc;
    ctx.save();ctx.shadowColor='#cc88ff';ctx.shadowBlur=20;
    ctx.fillStyle='#888';ctx.beginPath();ctx.arc(sx2,sy2,20,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#cc88ff';ctx.lineWidth=3;ctx.stroke();
    ctx.restore();
  } else {
    // Player
    const sx=wx(player.x),sy=wy(player.y);
    ctx.save();
    if(player.invincibleTimer>0&&Math.floor(tick/4)%2===0){ctx.globalAlpha=0.4;}
    if(player.hasRedBuff){ctx.shadowColor='#ff4400';ctx.shadowBlur=10;}
    if(player.hasBlueBuff){ctx.shadowColor='#3399ff';ctx.shadowBlur=10;}
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.2)';
    ctx.beginPath();ctx.ellipse(sx,sy+18,18,7,0,0,Math.PI*2);ctx.fill();
    // Body
    ctx.fillStyle='#888';ctx.beginPath();ctx.arc(sx,sy,20,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#444';ctx.lineWidth=3;ctx.stroke();
    // Cracks
    ctx.strokeStyle='#666';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(sx-8,sy-5);ctx.lineTo(sx-2,sy+8);ctx.stroke();
    ctx.beginPath();ctx.moveTo(sx+4,sy-10);ctx.lineTo(sx+10,sy+2);ctx.stroke();
    // Eyes
    ctx.fillStyle='#222';
    ctx.beginPath();ctx.arc(sx-7,sy-5,3,0,Math.PI*2);ctx.arc(sx+7,sy-5,3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#88aaff';
    ctx.beginPath();ctx.arc(sx-7,sy-5,1.5,0,Math.PI*2);ctx.arc(sx+7,sy-5,1.5,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
}

function drawHUD(){
  ctx.save();
  // HP
  ctx.fillStyle='rgba(0,0,0,0.6)';
  ctx.beginPath();ctx.roundRect(8,8,130,38,6);ctx.fill();
  ctx.fillStyle='#aaa';ctx.font='bold 10px Courier New';ctx.textAlign='left';
  ctx.fillText('HP',14,23);
  for(let i=0;i<player.maxHp;i++){
    ctx.fillStyle=i<player.hp?'#e03030':'#444';
    ctx.font='18px serif';ctx.fillText('♥',36+i*30,30);
  }
  // Gold
  ctx.fillStyle='rgba(0,0,0,0.6)';
  ctx.beginPath();ctx.roundRect(VIEW_W-95,8,87,38,6);ctx.fill();
  ctx.fillStyle='#ffd700';ctx.font='bold 13px Courier New';ctx.textAlign='right';
  ctx.fillText('⬡ '+player.gold,VIEW_W-12,32);

  // Buff icons
  let biy=52;
  if(player.hasRedBuff){
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();ctx.roundRect(8,biy,90,20,4);ctx.fill();
    ctx.fillStyle='#ff6633';ctx.font='bold 10px Courier New';ctx.textAlign='left';
    ctx.fillText('🔥灼伤 '+Math.ceil(player.redBuffTimer/60)+'s',12,biy+14);
    biy+=24;
  }
  if(player.hasBlueBuff){
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();ctx.roundRect(8,biy,90,20,4);ctx.fill();
    ctx.fillStyle='#66aaff';ctx.font='bold 10px Courier New';ctx.textAlign='left';
    ctx.fillText('💧大招 '+Math.ceil(player.blueBuffTimer/60)+'s',12,biy+14);
  }

  // R cooldown bar
  const bx=VIEW_W/2,by=VIEW_H-22;
  ctx.fillStyle='rgba(0,0,0,0.65)';
  ctx.beginPath();ctx.roundRect(bx-60,by-26,120,34,6);ctx.fill();
  ctx.fillStyle='#222';ctx.fillRect(bx-44,by-10,88,10);
  ctx.fillStyle=rCooldown===0?'#aa44ff':'#553388';
  ctx.fillRect(bx-44,by-10,88*(1-rCooldown/rMaxCooldown),10);
  ctx.strokeStyle='#7733cc';ctx.lineWidth=1;ctx.strokeRect(bx-44,by-10,88,10);
  ctx.fillStyle=rCooldown===0?'#cc88ff':'#888';
  ctx.font='bold 11px Courier New';ctx.textAlign='center';
  ctx.fillText(rCooldown===0?'[R] 势不可挡 就绪':'[R] '+Math.ceil(rCooldown/60)+'s',bx,by-14);

  // Minimap
  const mm=90,mx=VIEW_W-mm-8,my=VIEW_H-mm-8;
  ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(mx,my,mm,mm);
  ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.strokeRect(mx,my,mm,mm);
  // River
  ctx.fillStyle='#1a4a8a';
  ctx.beginPath();
  ctx.moveTo(mx,my+mm*(RIVER_HALF/WORLD_H));
  ctx.lineTo(mx+mm*(WORLD_W-RIVER_HALF)/WORLD_W,my+mm);
  ctx.lineTo(mx+mm,my+mm*(WORLD_H-RIVER_HALF)/WORLD_H);
  ctx.lineTo(mx+mm*(RIVER_HALF/WORLD_W),my);
  ctx.closePath();ctx.fill();
  // Minion dots
  ctx.fillStyle='#cc3333';
  for(const m of minions){
    ctx.beginPath();ctx.arc(mx+(m.x/WORLD_W)*mm,my+(m.y/WORLD_H)*mm,1.5,0,Math.PI*2);ctx.fill();
  }
  // Boss dot
  if(boss.alive){
    ctx.fillStyle='#cc44ff';
    ctx.beginPath();ctx.arc(mx+(boss.x/WORLD_W)*mm,my+(boss.y/WORLD_H)*mm,3,0,Math.PI*2);ctx.fill();
  }
  // Player dot
  ctx.fillStyle='#88aaff';
  ctx.beginPath();ctx.arc(mx+(player.x/WORLD_W)*mm,my+(player.y/WORLD_H)*mm,3,0,Math.PI*2);ctx.fill();
  // Viewport
  ctx.strokeStyle='rgba(255,255,255,0.4)';ctx.lineWidth=0.8;
  ctx.strokeRect(mx+(camX/WORLD_W)*mm,my+(camY/WORLD_H)*mm,(VIEW_W/WORLD_W)*mm,(VIEW_H/WORLD_H)*mm);

  ctx.restore();
}

function drawGameOver(){
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.fillStyle='#e03030';ctx.font='bold 48px Courier New';ctx.textAlign='center';
  ctx.fillText('游戏结束',VIEW_W/2,VIEW_H/2-30);
  ctx.fillStyle='#ffd700';ctx.font='bold 20px Courier New';
  ctx.fillText('金币: '+player.gold,VIEW_W/2,VIEW_H/2+20);
  ctx.fillStyle='#aaa';ctx.font='14px Courier New';
  ctx.fillText('按 ESC 重新开始',VIEW_W/2,VIEW_H/2+55);
  ctx.restore();
}

function draw(){
  ctx.clearRect(0,0,VIEW_W,VIEW_H);
  drawMap();
  drawEntities();
  drawHUD();
  if(gameOver) drawGameOver();
}

// ── Init & Loop ────────────────────────────────────────────────────────────
// Initial spawn timers
boss.respawnTimer=300;
redBuff.respawnTimer=60;
blueBuff.respawnTimer=60;

function loop(){update();draw();requestAnimationFrame(loop);}
loop();
})();
