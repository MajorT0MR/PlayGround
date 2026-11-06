(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const startButton = document.getElementById('startButton');
  const screen = document.querySelector('.screen');
  const W = canvas.width, H = canvas.height, FLOOR = 454, WORLD = 2080;
  const keys = new Set();
  const palette = { acid:'#d5ff3f', cream:'#eee9ce', dim:'#80908b', red:'#ff5451', cyan:'#69e6db', dark:'#121b1e' };
  const weaponInfo = [
    { name:'SERVICE PISTOL', short:'9MM', color:'#ffe37a', cooldown:.23, speed:620, damage:1, spread:0, count:1 },
    { name:'BREACHER', short:'12 GA', color:'#ffab63', cooldown:.65, speed:520, damage:2, spread:.23, count:5 },
    { name:'ARC DRIVER', short:'PULSE', color:'#6cf5ed', cooldown:.12, speed:760, damage:1, spread:0, count:1 }
  ];
  const floors = [
    {name:'PARKING / B2', tint:'#304247', sky:'#101b20', accent:'#e1bc69', sign:'AUTHORIZED PERSONNEL ONLY', enemies:[['scout',470],['gunner',760],['scout',1080],['heavy',1450],['gunner',1690]]},
    {name:'RESEARCH / B1', tint:'#3b3d42', sky:'#151a20', accent:'#78d5ce', sign:'QUARANTINE — LEVEL 04', enemies:[['gunner',440],['scout',680],['heavy',1010],['gunner',1320],['scout',1630],['gunner',1780]]},
    {name:'LOBBY / GROUND', tint:'#454344', sky:'#1c2021', accent:'#d5ff3f', sign:'NORTH EXIT // 150 METERS', enemies:[['heavy',480],['gunner',790],['scout',1010],['gunner',1320],['heavy',1610],['scout',1800]]}
  ];
  let game, lastTime=0, aim={x:720,y:390}, shake=0, pointerDown=false;

  function newGame(){
    game={mode:'playing',floor:0,player:{x:105,y:FLOOR,vx:0,vy:0,face:1,hp:100,invuln:0,grounded:true,crouch:false,fireWait:0,anim:0},bullets:[],particles:[],enemies:[],kills:0,total:0,elapsed:0,toast:'',toastTime:0,score:0};
    loadFloor(0); overlay.classList.add('hidden'); screen.classList.add('playing');
  }
  function loadFloor(index){
    game.floor=index; game.enemies=floors[index].enemies.map(([type,x],i)=>({type,x,y:FLOOR,hp:type==='heavy'?4:type==='gunner'?2:1,maxHp:type==='heavy'?4:type==='gunner'?2:1,face:-1,wait:1+i*.7,anim:i*.8,flash:0,mode:type==='scout'?'rush':'guard',speed:type==='scout'?68:type==='heavy'?27:0}));
    game.total+=game.enemies.length; game.player.x=105; game.player.y=FLOOR; game.player.vx=0; game.player.vy=0; game.bullets=[]; game.toast=`${floors[index].name} // HOSTILES ${game.enemies.length}`; game.toastTime=3;
  }
  function start(){if(!game||game.mode!=='playing')newGame();}
  function stop(mode){game.mode=mode;screen.classList.remove('playing');overlay.classList.remove('hidden');}
  startButton.addEventListener('click',()=>{newGame();canvas.focus();});
  window.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase(); if([' ','arrowleft','arrowright','arrowup','arrowdown'].includes(k))e.preventDefault();
    keys.add(k);
    if(k==='escape'&&game?.mode==='playing'){game.mode='paused';}
    else if(k==='escape'&&game?.mode==='paused')game.mode='playing';
    if(k==='r'&&game&&(game.mode==='dead'||game.mode==='won'))newGame();
    if(k==='1'||k==='2'||k==='3')if(game)game.weapon=Number(k)-1;
    if(k==='e'&&game?.mode==='playing')useElevator();
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();aim.x=(e.clientX-r.left)*W/r.width;aim.y=(e.clientY-r.top)*H/r.height;});
  canvas.addEventListener('pointerdown',e=>{pointerDown=true;canvas.setPointerCapture(e.pointerId);});
  window.addEventListener('pointerup',()=>pointerDown=false);
  document.querySelectorAll('.mobile-controls button').forEach(button=>{
    const k=button.dataset.key;
    const down=e=>{e.preventDefault();if(k==='fire'){pointerDown=true;return;}keys.add(k);};
    const up=e=>{e.preventDefault();if(k==='fire'){pointerDown=false;return;}keys.delete(k);};
    button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('pointerleave',up);
  });
  function useElevator(){if(Math.abs(game.player.x-(WORLD-150))<105){if(game.enemies.some(e=>e.hp>0)){game.toast='LIFT INTERLOCKED // CLEAR HOSTILES';game.toastTime=1.6;return;}if(game.floor<2){loadFloor(game.floor+1);}else{game.mode='won';}}else{game.toast='SERVICE LIFT // EAST END';game.toastTime=1.25;}}

  function update(dt){
    if(!game)return; if(game.mode!=='playing')return;
    const p=game.player; game.elapsed+=dt; p.anim+=dt*(Math.abs(p.vx)>.1?10:2); p.invuln=Math.max(0,p.invuln-dt); p.fireWait=Math.max(0,p.fireWait-dt); game.toastTime=Math.max(0,game.toastTime-dt);
    const left=keys.has('a')||keys.has('arrowleft'), right=keys.has('d')||keys.has('arrowright'), crouch=keys.has('s')||keys.has('arrowdown');
    p.crouch=crouch && p.grounded; const speed=keys.has('shift')?270:170;
    p.vx=(right?1:0)-(left?1:0); if(p.vx){p.face=Math.sign(p.vx);} p.vx*=p.crouch?speed*.55:speed; p.x=Math.max(25,Math.min(WORLD-85,p.x+p.vx*dt));
    if((keys.has(' ')||keys.has('w')||keys.has('arrowup'))&&p.grounded){p.vy=-410;p.grounded=false;}
    p.vy+=1050*dt;p.y+=p.vy*dt;if(p.y>=FLOOR){p.y=FLOOR;p.vy=0;p.grounded=true;}
    if(pointerDown||keys.has('z')||keys.has('enter'))fire();
    const cam=cameraX();
    for(const b of game.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;}
    game.bullets=game.bullets.filter(b=>b.life>0&&b.x>-30&&b.x<WORLD+30);
    for(const enemy of game.enemies){
      if(enemy.hp<=0)continue; enemy.anim+=dt*4;enemy.flash=Math.max(0,enemy.flash-dt);enemy.wait-=dt;
      const dx=p.x-enemy.x, dir=Math.sign(dx)||-1; enemy.face=dir;
      if(enemy.type==='scout'){
        if(Math.abs(dx)>48)enemy.x+=dir*enemy.speed*dt;
        if(Math.abs(dx)<43&&enemy.wait<=0&&!p.invuln){p.hp-=13;p.invuln=.8;shake=7;enemy.wait=1.1;burst(p.x,p.y-32,'#ff6460',8);}
      }else if(enemy.wait<=0&&Math.abs(dx)<680){
        const crouched=p.crouch&&Math.abs(dx)>200;
        if(!crouched){const angle=Math.atan2((p.y-(p.crouch?30:57))-(enemy.y-50),dx);const v=enemy.type==='heavy'?285:340;game.bullets.push({x:enemy.x+dir*15,y:enemy.y-51,vx:Math.cos(angle)*v,vy:Math.sin(angle)*v,owner:'enemy',life:2,color:enemy.type==='heavy'?'#ff785f':'#fdc773',r:enemy.type==='heavy'?4:3});}
        enemy.wait=enemy.type==='heavy'?1.5:1.9+Math.random()*.7;
      }
    }
    for(const b of game.bullets){
      if(b.owner==='player'){
        for(const e of game.enemies){if(e.hp<=0)continue;if(Math.abs(b.x-e.x)<18&&Math.abs(b.y-(e.y-42))<34){e.hp-=b.damage;e.flash=.11;burst(b.x,b.y,b.color,4);b.life=0;if(e.hp<=0){game.kills++;game.score+=e.type==='heavy'?450:e.type==='gunner'?250:150;burst(e.x,e.y-35,'#f1c979',14);}break;}}
      }else if(Math.abs(b.x-p.x)<15&&Math.abs(b.y-(p.y-(p.crouch?22:47)))<28&&p.invuln<=0){p.hp-=b.damage||12;p.invuln=.72;shake=5;b.life=0;burst(p.x,p.y-34,'#ff6760',7);}
    }
    game.bullets=game.bullets.filter(b=>b.life>0);
    for(const part of game.particles){part.x+=part.vx*dt;part.y+=part.vy*dt;part.vy+=180*dt;part.life-=dt;}
    game.particles=game.particles.filter(p=>p.life>0);shake=Math.max(0,shake-25*dt);
    if(p.hp<=0){p.hp=0;game.mode='dead';screen.classList.remove('playing');}
  }
  function fire(){const p=game.player;if(p.fireWait>0)return;const idx=game.weapon||0,w=weaponInfo[idx], base=aimingAngle();p.fireWait=w.cooldown;
    for(let i=0;i<w.count;i++){const angle=base+(i-(w.count-1)/2)*w.spread;game.bullets.push({x:p.x+p.face*18,y:p.y-(p.crouch?25:49),vx:Math.cos(angle)*w.speed,vy:Math.sin(angle)*w.speed,owner:'player',life:1.9,damage:w.damage,color:w.color,r:idx===2?4:3});}
    burst(p.x+p.face*23,p.y-(p.crouch?25:49),w.color,idx===1?8:4);
  }
  function aimingAngle(){const p=game.player;if(pointerDown){const a=Math.atan2(aim.y-(p.y-cameraY()+(-50)),aim.x-(p.x-cameraX()));if(Math.cos(a))p.face=Math.cos(a)>0?1:-1;return a;}return p.face===1?0:Math.PI;}
  function burst(x,y,color,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=30+Math.random()*150;game.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.12+Math.random()*.28,color,size:1+Math.random()*3});}}
  function cameraX(){return Math.max(0,Math.min(WORLD-W,(game?.player.x||0)-W*.43));}
  function cameraY(){return 0;}

  function draw(){ctx.clearRect(0,0,W,H);if(!game){drawBackdrop(0,0);drawHudIdle();return;}
    const cam=cameraX();ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);drawBackdrop(cam,game.floor);
    drawElevator(cam);drawCover(cam);for(const e of game.enemies)drawEnemy(e,cam);for(const b of game.bullets)drawBullet(b,cam);for(const part of game.particles)drawParticle(part,cam);drawPlayer(game.player,cam);drawDepth(cam);ctx.restore();drawHud();
    if(game.mode==='paused')drawMessage('PAUSED','PRESS ESC TO RETURN');if(game.mode==='dead')drawMessage('SIGNAL LOST','PRESS R TO RETRY');if(game.mode==='won')drawMessage('YOU MADE IT OUT','OPERATION COMPLETE  //  PRESS R TO REPLAY');
  }
  function drawBackdrop(cam,floor){
    const f=floors[floor]||floors[0],g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,f.sky);g.addColorStop(.72,'#263033');g.addColorStop(1,'#101719');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // distant city slivers
    for(let i=0;i<14;i++){const x=((i*151-cam*.25)%1100+1100)%1100-70;const h=60+(i*47%118);ctx.fillStyle=i%2?'#172226':'#1a2528';ctx.fillRect(x,260-h,72,h);for(let r=0;r<4;r++)if((i+r)%3===0){ctx.fillStyle='#d9c47722';ctx.fillRect(x+12+r*13,260-h+16,4,8);}}
    ctx.fillStyle='#30383a';ctx.fillRect(0,115,W,16);ctx.fillStyle='#11191b';ctx.fillRect(0,131,W,7);ctx.fillStyle='#75807c';ctx.globalAlpha=.18;ctx.fillRect(0,114,W,2);ctx.globalAlpha=1;
    // corridor pillars and windows
    for(let i=-1;i<10;i++){let x=i*150-(cam%150);ctx.fillStyle='#263033';ctx.fillRect(x,144,14,290);ctx.fillStyle='#151d20';ctx.fillRect(x+14,144,5,290);ctx.fillStyle='#55605c';ctx.globalAlpha=.28;ctx.fillRect(x+18,172,78,2);ctx.fillRect(x+18,245,78,2);ctx.globalAlpha=1;
      ctx.fillStyle='#101719';ctx.fillRect(x+28,181,54,49);ctx.fillStyle=f.accent;ctx.globalAlpha=.32;ctx.fillRect(x+31,184,48,42);ctx.globalAlpha=1;ctx.fillStyle='#efdb9324';ctx.fillRect(x+37,186,3,37);}
    // ceiling strips
    for(let i=-1;i<8;i++){const x=i*204-(cam%204);ctx.fillStyle='#11191b';ctx.fillRect(x+44,147,72,8);ctx.fillStyle=i%2?'#aab084':'#d7c987';ctx.globalAlpha=.25;ctx.fillRect(x+47,149,66,2);ctx.globalAlpha=1;}
    ctx.fillStyle='#202a2d';ctx.fillRect(0,FLOOR,W,H-FLOOR);ctx.fillStyle='#84918a';ctx.globalAlpha=.38;ctx.fillRect(0,FLOOR,W,3);ctx.globalAlpha=1;
    ctx.fillStyle='#111719';ctx.fillRect(0,FLOOR+7,W,5);ctx.fillStyle='#394345';ctx.fillRect(0,FLOOR+13,W,2);
    // floor tiles and yellow service line
    for(let i=-1;i<17;i++){const x=i*74-(cam%74);ctx.fillStyle='#56605d';ctx.globalAlpha=.22;ctx.fillRect(x,FLOOR+14,1,H-FLOOR-14);ctx.globalAlpha=1;}
    ctx.fillStyle=f.accent;ctx.globalAlpha=.22;ctx.fillRect(0,FLOOR+17,W,2);ctx.globalAlpha=1;
    // wall signage placed in screen space using camera-relative repeating
    let sx=500-((cam*.55)%650);if(sx< -220)sx+=650;drawSign(sx,274,f.sign,f.accent);
    // far wall depth fade
    const vg=ctx.createLinearGradient(0,0,0,H);vg.addColorStop(0,'#00000022');vg.addColorStop(.72,'transparent');vg.addColorStop(1,'#060a0bcc');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  }
  function drawSign(x,y,text,color){ctx.fillStyle='#131b1c';ctx.fillRect(x,y,194,44);ctx.strokeStyle='#76817b66';ctx.strokeRect(x+.5,y+.5,193,43);ctx.fillStyle=color;ctx.font='9px monospace';ctx.fillText('▸  SECTOR  '+String(game?.floor+1||1).padStart(2,'0'),x+10,y+15);ctx.fillStyle='#c8caba';ctx.font='8px monospace';ctx.fillText(text,x+10,y+32);}
  function drawCover(cam){for(let i=0;i<7;i++){const wx=270+i*281;if(wx<cam-60||wx>cam+W+60)continue;const x=wx-cam;ctx.fillStyle='#172023';ctx.fillRect(x-25,FLOOR-30,50,29);ctx.fillStyle='#49534d';ctx.fillRect(x-24,FLOOR-30,48,3);ctx.fillStyle='#a5af9c';ctx.globalAlpha=.45;ctx.fillRect(x-16,FLOOR-22,9,2);ctx.fillRect(x+3,FLOOR-22,9,2);ctx.globalAlpha=1;ctx.fillStyle='#0d1416';ctx.fillRect(x-22,FLOOR-3,44,4);}}
  function drawElevator(cam){const x=WORLD-150-cam;if(x<-100||x>W+100)return;ctx.fillStyle='#101719';ctx.fillRect(x-46,166,92,288);ctx.fillStyle='#515b58';ctx.fillRect(x-49,163,3,292);ctx.fillRect(x+46,163,3,292);ctx.fillStyle='#273134';ctx.fillRect(x-39,180,78,260);ctx.fillStyle='#12191b';ctx.fillRect(x-34,188,68,252);ctx.fillStyle='#778179';ctx.fillRect(x-2,188,2,252);ctx.fillStyle='#d5ff3f';ctx.globalAlpha=.65;ctx.fillRect(x+52,209,5,32);ctx.globalAlpha=1;ctx.fillStyle='#d5ff3f';ctx.font='bold 9px monospace';ctx.fillText('↓',x+51,204);ctx.fillStyle='#8c9690';ctx.font='8px monospace';ctx.fillText('SERVICE',x-24,174);ctx.fillText('LIFT',x-13,184);ctx.fillStyle='#e2d789';ctx.fillRect(x-6,205,4,10);ctx.fillRect(x+2,205,4,10);if(Math.abs(game.player.x-(WORLD-150))<115){ctx.fillStyle='#d5ff3f';ctx.font='10px monospace';ctx.fillText('E  DESCEND',x-37,145);}}
  function drawPlayer(p,cam){const x=Math.round(p.x-cam), y=Math.round(p.y), crouch=p.crouch;ctx.save();if(p.invuln>0&&Math.floor(performance.now()/75)%2===0)ctx.globalAlpha=.4;
    // shadow
    ctx.fillStyle='#080d0e99';ctx.beginPath();ctx.ellipse(x,y-2,crouch?20:14,4,0,0,Math.PI*2);ctx.fill();
    if(crouch){ctx.fillStyle='#3b5148';ctx.fillRect(x-15,y-33,29,19);ctx.fillStyle='#c7c7a8';ctx.fillRect(x+p.face*6-4,y-42,11,11);ctx.fillStyle='#a9b08d';ctx.fillRect(x-13,y-14,12,12);ctx.fillRect(x+3,y-14,12,12);}
    else{let stride=Math.sin(p.anim)*4*(Math.abs(p.vx)>0?1:0);ctx.fillStyle='#25362f';ctx.fillRect(x-14,y-50,28,30);ctx.fillStyle='#506750';ctx.fillRect(x-11,y-49,22,18);ctx.fillStyle='#b9bea0';ctx.fillRect(x-8,y-69,17,18);ctx.fillStyle='#172021';ctx.fillRect(x-10,y-56,20,5);ctx.fillStyle='#a9b08d';ctx.fillRect(x-12,y-21,10,19+stride);ctx.fillRect(x+2,y-21,10,19-stride);ctx.fillStyle='#11191b';ctx.fillRect(x-14,y-3+stride,13,4);ctx.fillRect(x+1,y-3-stride,14,4);}
    const gunY=y-(crouch?28:51);ctx.fillStyle='#161b1b';ctx.fillRect(x+p.face*6,gunY-3,p.face*18,6);ctx.fillStyle='#89917e';ctx.fillRect(x+p.face*10,gunY-2,p.face*10,2);ctx.restore();}
  function drawEnemy(e,cam){const x=Math.round(e.x-cam),y=e.y;if(x<-50||x>W+50)return;ctx.save();if(e.flash>0)ctx.globalAlpha=.55;ctx.fillStyle='#080d0e99';ctx.beginPath();ctx.ellipse(x,y-2,e.type==='heavy'?19:14,4,0,0,Math.PI*2);ctx.fill();
    if(e.type==='scout'){ctx.fillStyle='#512d2d';ctx.fillRect(x-11,y-44,23,27);ctx.fillStyle='#d4a47d';ctx.fillRect(x-7,y-59,15,15);ctx.fillStyle='#9e4b42';ctx.fillRect(x-10,y-48,20,7);ctx.fillStyle='#a76654';ctx.fillRect(x-10,y-19,9,16);ctx.fillRect(x+2,y-19,9,16);ctx.fillStyle='#d7c39b';ctx.fillRect(x+e.face*10,y-43,e.face*10,5);}
    else{const heavy=e.type==='heavy';ctx.fillStyle=heavy?'#514238':'#4a3838';ctx.fillRect(x-(heavy?16:12),y-(heavy?54:49),heavy?32:24,heavy?35:30);ctx.fillStyle=heavy?'#847358':'#8a5548';ctx.fillRect(x-9,y-(heavy?69:64),18,17);ctx.fillStyle='#1b2020';ctx.fillRect(x-10,y-(heavy?60:56),20,6);ctx.fillStyle='#302728';ctx.fillRect(x-12,y-19,10,17);ctx.fillRect(x+2,y-19,10,17);ctx.fillStyle='#191d1e';ctx.fillRect(x+e.face*8,y-44,e.face*21,6);if(heavy){ctx.fillStyle='#b35f4f';ctx.fillRect(x-18,y-53,4,18);}}
    if(e.hp<e.maxHp){ctx.fillStyle='#101515';ctx.fillRect(x-13,y-78,26,4);ctx.fillStyle='#ff625a';ctx.fillRect(x-12,y-77,24*(e.hp/e.maxHp),2);}ctx.restore();}
  function drawBullet(b,cam){const x=b.x-cam;ctx.fillStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=b.owner==='player'?10:5;ctx.beginPath();ctx.arc(x,b.y,b.r||3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(b.owner==='player'){ctx.globalAlpha=.5;ctx.fillRect(x-b.vx*.025,b.y-1,b.vx*.025,2);ctx.globalAlpha=1;}}
  function drawParticle(p,cam){ctx.globalAlpha=Math.max(0,p.life*3);ctx.fillStyle=p.color;ctx.fillRect(p.x-cam,p.y,p.size,p.size);ctx.globalAlpha=1;}
  function drawDepth(cam){ctx.fillStyle='#11191bcc';ctx.fillRect(0,FLOOR+22,W,7);ctx.fillStyle='#43504c';for(let i=0;i<20;i++){let x=(i*78-cam%78);ctx.fillRect(x,FLOOR+22,34,2);}}
  function drawHud(){const p=game.player;ctx.fillStyle='#0b1113ed';ctx.fillRect(0,0,W,68);ctx.fillStyle='#46504d';ctx.fillRect(0,67,W,1);ctx.fillStyle='#d5ff3f';ctx.font='bold 11px monospace';ctx.fillText('DOWNLINK',22,22);ctx.fillStyle='#abb5aa';ctx.font='9px monospace';ctx.fillText('OPS // '+String(game.floor+1).padStart(2,'0')+'  '+floors[game.floor].name,22,42);
    ctx.fillStyle='#52605a';ctx.font='9px monospace';ctx.fillText('VITALS',226,22);ctx.fillStyle='#202b2a';ctx.fillRect(226,31,130,9);ctx.fillStyle=p.hp>35?'#d5ff3f':'#ff5852';ctx.fillRect(228,33,126*(p.hp/100),5);ctx.fillStyle='#e7e8d9';ctx.font='10px monospace';ctx.fillText(String(Math.ceil(p.hp)).padStart(3,'0')+'%',365,40);
    const alive=game.enemies.filter(e=>e.hp>0).length;ctx.fillStyle='#66736e';ctx.font='9px monospace';ctx.fillText('HOSTILES',460,22);ctx.fillStyle=alive?'#ff6660':'#d5ff3f';ctx.font='bold 16px monospace';ctx.fillText(String(alive).padStart(2,'0'),460,46);
    const wi=game.weapon||0,w=weaponInfo[wi];ctx.fillStyle='#66736e';ctx.font='9px monospace';ctx.fillText('SELECTED',550,22);ctx.fillStyle=w.color;ctx.font='bold 12px monospace';ctx.fillText(w.name,550,43);ctx.fillStyle='#78837c';ctx.font='8px monospace';ctx.fillText('[1] 9MM   [2] 12GA   [3] PULSE',550,57);
    ctx.textAlign='right';ctx.fillStyle='#a9b1a2';ctx.font='10px monospace';ctx.fillText('SCORE  '+String(game.score).padStart(6,'0'),W-22,25);ctx.fillStyle='#73817b';ctx.fillText('FLOOR '+(game.floor+1)+' / 3',W-22,45);ctx.textAlign='left';
    if(game.toastTime>0){ctx.globalAlpha=Math.min(1,game.toastTime*2);ctx.fillStyle='#0c1314dc';ctx.fillRect(W/2-190,82,380,27);ctx.strokeStyle='#d5ff3f66';ctx.strokeRect(W/2-189.5,82.5,379,26);ctx.fillStyle='#d5ff3f';ctx.textAlign='center';ctx.font='10px monospace';ctx.fillText(game.toast,W/2,100);ctx.textAlign='left';ctx.globalAlpha=1;}
    if(Math.abs(p.x-(WORLD-150))<115&&!alive){ctx.fillStyle='#d5ff3f';ctx.textAlign='center';ctx.font='10px monospace';ctx.fillText('PRESS  E  TO TAKE THE LIFT DOWN',W/2,H-32);ctx.textAlign='left';}
  }
  function drawHudIdle(){ctx.fillStyle='#d5ff3f';ctx.font='10px monospace';ctx.fillText('NORTH WING SECURITY NETWORK // SIGNAL UNSTABLE',24,28);ctx.fillStyle='#8e9b91';ctx.font='9px monospace';ctx.fillText('3 FLOORS  •  17 HOSTILES  •  ONE EXIT',24,48);}
  function drawMessage(title,sub){ctx.fillStyle='#080d0dcc';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#d5ff3f';ctx.strokeRect(W/2-215,H/2-65,430,130);ctx.textAlign='center';ctx.fillStyle=title==='SIGNAL LOST'?'#ff625a':'#d5ff3f';ctx.font='bold 29px monospace';ctx.fillText(title,W/2,H/2-10);ctx.fillStyle='#d1d6c6';ctx.font='11px monospace';ctx.fillText(sub,W/2,H/2+24);ctx.textAlign='left';}
  function loop(now){const dt=Math.min(.033,(now-lastTime)/1000||0);lastTime=now;update(dt);draw();requestAnimationFrame(loop);}
  requestAnimationFrame(loop);
})();
