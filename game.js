// game.js — Mini CS 2 (25 weapons, 4 maps)
(function(){
  var elLoading=document.getElementById('loading');
  var elMsg=document.getElementById('loadMsg');
  var elErr=document.getElementById('loadErr');
  var errs=[];
  function showErr(msg){
    errs.push(String(msg));
    if(errs.length>6)errs.shift();
    if(elErr){elErr.style.display='block';elErr.textContent=errs.map(function(e){return '❌ '+e;}).join('\n\n');}
    if(elMsg)elMsg.textContent='⚠ Ошибка загрузки';
    if(elLoading)elLoading.style.display='flex';
  }
  window.__showLoadErr=showErr;
  window.addEventListener('error',function(e){
    var m=(e.error&&(e.error.stack||e.error.message))||e.message||'Ошибка';
    showErr(m);
  });
  window.addEventListener('unhandledrejection',function(e){
    var r=e.reason;
    showErr('Promise: '+((r&&(r.stack||r.message))||r));
  });
  window.__forceHideLoading=function(){if(elLoading)elLoading.style.display='none';};
  window.installBufferGeometryUtils=function(){
    if(!window.THREE)return;
    if(window.BufferGeometryUtils&&window.BufferGeometryUtils.mergeGeometries)return;
    window.BufferGeometryUtils={mergeGeometries:function(geometries,useGroups){
      if(!geometries||geometries.length===0)return null;
      if(geometries.length===1)return geometries[0];
      var attributes={};var attrNames=['position','normal','uv','uv2','color','tangent'];
      var totalVerts=0;
      for(var gi=0;gi<geometries.length;gi++)totalVerts+=geometries[gi].attributes.position.count;
      for(var ai=0;ai<attrNames.length;ai++){
        var name=attrNames[ai];var itemSize=0,found=false;
        for(var gi=0;gi<geometries.length;gi++){
          if(geometries[gi].attributes[name]){itemSize=geometries[gi].attributes[name].itemSize;found=true;break;}
        }
        if(!found)continue;
        var arr=new Float32Array(totalVerts*itemSize);var offset=0;
        for(var gi=0;gi<geometries.length;gi++){
          var g=geometries[gi];
          if(g.attributes[name]){var src=g.attributes[name].array;arr.set(src,offset);offset+=src.length;}
          else{offset+=g.attributes.position.count*itemSize;}
        }
        attributes[name]=new THREE.BufferAttribute(arr,itemSize);
      }
      var merged=new THREE.BufferGeometry();
      for(var k in attributes)merged.setAttribute(k,attributes[k]);
      var hasIndex=false;
      for(var gi=0;gi<geometries.length;gi++)if(geometries[gi].index){hasIndex=true;break;}
      if(hasIndex){
        var totalIdx=0;
        for(var gi=0;gi<geometries.length;gi++){
          var g=geometries[gi];
          if(g.index)totalIdx+=g.index.count;else totalIdx+=g.attributes.position.count;
        }
        var idxArr=totalIdx>65535?new Uint32Array(totalIdx):new Uint16Array(totalIdx);
        var idxOffset=0,vOffset=0;
        for(var gi=0;gi<geometries.length;gi++){
          var g=geometries[gi];var count=g.attributes.position.count;
          if(g.index){var src=g.index.array;for(var ii=0;ii<src.length;ii++)idxArr[idxOffset++]=src[ii]+vOffset;}
          else{for(var ii=0;ii<count;ii++)idxArr[idxOffset++]=ii+vOffset;}
          vOffset+=count;
        }
        merged.setIndex(new THREE.BufferAttribute(idxArr,1));
      }
      if(useGroups){var start=0;for(var gi=0;gi<geometries.length;gi++){var g=geometries[gi];var count=g.index?g.index.count:g.attributes.position.count;merged.addGroup(start,count,gi);start+=count;}}
      return merged;
    }};
  };
})();

(function(){
'use strict';
if(!window.THREE){window.__showLoadErr('THREE не загрузился');return;}
window.installBufferGeometryUtils();
var BufferGeometryUtils=window.BufferGeometryUtils;

var isTouch=(window.matchMedia&&window.matchMedia("(pointer: coarse)").matches&&window.matchMedia("(hover: none)").matches);
if(isTouch)document.body.classList.add("touch");
var _hw=navigator.hardwareConcurrency||4,_mem=navigator.deviceMemory||4;
var _isMobile=isTouch&&Math.min(window.innerWidth,window.innerHeight)<900;
var AUTO_QUALITY=3;
if(_isMobile||_hw<=2||_mem<=2)AUTO_QUALITY=1;else if(_hw<=4||_mem<=4)AUTO_QUALITY=2;else if(_hw>=8&&_mem>=8)AUTO_QUALITY=4;
var LOW_END=AUTO_QUALITY<=1,MID_END=AUTO_QUALITY===2;
var PERF_MODE=LOW_END||_isMobile;
var canvas=document.getElementById("game");
var hint=document.getElementById("hint");
document.getElementById("hintText").innerHTML=isTouch?"Джойстик — движение, свайп — обзор<br>🔴 стрелять, 🎯 прицел<br>⬆ прыжок, 🧎 присесть<br>1/2/3 — слоты":"WASD — движение, Мышь — обзор, Shift — спринт<br>ЛКМ — стрельба, ПКМ — прицел, R — перезарядка<br>Пробел — прыжок, Ctrl — присесть, Q/E — наклоны<br>1/2/3 — слоты";

var DEFAULTS={sensitivity:1.0,sniperSensitivity:0.35,fov:75,quality:AUTO_QUALITY,autoFire:true,showFps:true,showMinimap:false,showBotHp:true,showDmgNum:true,effects4d:true,sound:true,boostFps:false,resolutionScale:100,masterVolume:100,effectsVolume:100,footstepVolume:100,slot1:"pistol_p250",slot2:"rifle_vandal",slot3:"knife_tanto",autoBalance:true,crosshairStyle:"crossdot",crosshairSize:1.0,crosshairThickness:2,crosshairGap:6,crosshairColor:"#00ff50",crosshairDot:true,crosshairOutline:true,crosshairDynamic:true,botDifficulty:"normal",autoFullscreen:true,smoke:true,ladderHint:true,skins:{}};
var DEFAULT_KEYBINDS={KeyW:"KeyW",KeyS:"KeyS",KeyA:"KeyA",KeyD:"KeyD",Space:"Space",ControlLeft:"ControlLeft",KeyC:"KeyC",ShiftLeft:"ShiftLeft",KeyQ:"KeyQ",KeyE:"KeyE",KeyR:"KeyR",KeyB:"KeyB",KeyG:"KeyG",KeyI:"KeyI",KeyF:"KeyF",Digit1:"Digit1",Digit2:"Digit2",Digit3:"Digit3",Digit0:"Digit0",Escape:"Escape"};
var SETTINGS_KEY="cs2_v53_settings",KEYBINDS_KEY="cs2_v53_keybinds",STORE_KEY="cs2_v53_controls",STATS_KEY="cs2_v53_stats";
var settings=Object.assign({},DEFAULTS),keybinds=Object.assign({},DEFAULT_KEYBINDS);
try{var s=JSON.parse(localStorage.getItem(SETTINGS_KEY));if(s)settings=Object.assign({},DEFAULTS,s);var k=JSON.parse(localStorage.getItem(KEYBINDS_KEY));if(k)keybinds=Object.assign({},DEFAULT_KEYBINDS,k);}catch(e){}
var playerStats={bestScore:0,totalKills:0,gamesPlayed:0};
try{var st=JSON.parse(localStorage.getItem(STATS_KEY));if(st)playerStats=Object.assign({},playerStats,st);}catch(e){}
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch(e){}}
function saveKeybinds(){try{localStorage.setItem(KEYBINDS_KEY,JSON.stringify(keybinds));}catch(e){}}
function saveStats(){try{localStorage.setItem(STATS_KEY,JSON.stringify(playerStats));}catch(e){}}
function updateLobbyStats(){var e1=document.getElementById("lsBest");if(e1)e1.textContent=playerStats.bestScore;var e2=document.getElementById("lsTotalKills");if(e2)e2.textContent=playerStats.totalKills;var e3=document.getElementById("lsGames");if(e3)e3.textContent=playerStats.gamesPlayed;}
function getActionByKey(c){for(var a in keybinds)if(keybinds[a]===c)return a;return null;}
function safeRequestPointerLock(el){if(!el||!el.requestPointerLock)return;try{var p=el.requestPointerLock();if(p&&p.catch)p.catch(function(){});}catch(e){}}
function safeExitPointerLock(){try{if(document.pointerLockElement&&document.exitPointerLock)document.exitPointerLock();}catch(e){}}
function safeRequestFullscreen(el){if(!el)return;try{var fn=el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen||el.msRequestFullscreen;if(!fn)return;var p=fn.call(el);if(p&&p.catch)p.catch(function(){});}catch(e){}}
function safeExitFullscreen(){try{var fn=document.exitFullscreen||document.webkitExitFullscreen||document.mozCancelFullScreen||document.msExitFullscreen;if(!fn)return;var p=fn.call(document);if(p&&p.catch)p.catch(function(){});}catch(e){}}
function toggleFullscreen(){if(!document.fullscreenElement&&!document.webkitFullscreenElement)safeRequestFullscreen(document.documentElement);else safeExitFullscreen();}

var audioCtx=null,noiseBuffer=null,SOUND_MULT=1;
function initAudio(){if(!audioCtx&&window.AudioContext){try{audioCtx=new AudioContext();var sr=audioCtx.sampleRate;var len=sr*3;noiseBuffer=audioCtx.createBuffer(1,len,sr);var d=noiseBuffer.getChannelData(0);for(var i=0;i<len;i++)d[i]=Math.random()*2-1;}catch(e){}}}
function ensureAudio(){initAudio();if(!audioCtx)return false;if(audioCtx.state==="suspended")audioCtx.resume();return true;}
function applySoundMult(t){var m=(settings.masterVolume||100)/100;SOUND_MULT=m*((t==="step"||t==="step_run"?(settings.footstepVolume||100):(settings.effectsVolume||100))/100);}
function osc(fs,fe,dur,vol,w){if(!settings.sound||!ensureAudio())return;var t=audioCtx.currentTime;var o=audioCtx.createOscillator();o.type=w||"square";o.frequency.setValueAtTime(fs,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,fe),t+dur);var g=audioCtx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol*SOUND_MULT,t+0.002);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+dur+0.03);}
function click(f,vol,dur){if(!settings.sound||!ensureAudio())return;var t=audioCtx.currentTime;var o=audioCtx.createOscillator();o.type="triangle";o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*0.55,t+dur);var g=audioCtx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol*SOUND_MULT,t+0.0006);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+dur+0.02);}
function noise(dur,vol,type,fs,fe,q,a,dc){if(!settings.sound||!ensureAudio())return;var t=audioCtx.currentTime;var src=audioCtx.createBufferSource();src.buffer=noiseBuffer;var f=audioCtx.createBiquadFilter();f.type=type||"lowpass";f.Q.value=q||1;f.frequency.setValueAtTime(fs,t);f.frequency.exponentialRampToValueAtTime(Math.max(20,fe||fs/2),t+dur);var g=audioCtx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol*SOUND_MULT,t+(a||0.001));g.gain.exponentialRampToValueAtTime(0.0001,t+(a||0.001)+(dc||dur));src.connect(f);f.connect(g);g.connect(audioCtx.destination);src.start(t);src.stop(t+dur+0.05);}
function gunshot(o){if(!settings.sound||!ensureAudio())return;var t=audioCtx.currentTime,V=SOUND_MULT;var master=audioCtx.createGain();master.gain.value=V;master.connect(audioCtx.destination);
if(o.click){var oc=audioCtx.createOscillator();oc.type="square";oc.frequency.setValueAtTime(o.click,t);oc.frequency.exponentialRampToValueAtTime(o.click*0.25,t+0.012);var g=audioCtx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.14*V,t+0.0004);g.gain.exponentialRampToValueAtTime(0.0001,t+0.020);oc.connect(g);g.connect(master);oc.start(t);oc.stop(t+0.025);}
var s1=audioCtx.createBufferSource();s1.buffer=noiseBuffer;var hp=audioCtx.createBiquadFilter();hp.type="highpass";hp.frequency.value=o.crackHP||2800;var peak=audioCtx.createBiquadFilter();peak.type="peaking";peak.frequency.value=4200;peak.gain.value=6;peak.Q.value=0.9;var g1=audioCtx.createGain();g1.gain.setValueAtTime(0.0001,t);g1.gain.linearRampToValueAtTime((o.crackVol||0.42)*V,t+0.0003);g1.gain.exponentialRampToValueAtTime(0.0001,t+0.018);s1.connect(hp);hp.connect(peak);peak.connect(g1);g1.connect(master);s1.start(t);s1.stop(t+0.04);
var s2=audioCtx.createBufferSource();s2.buffer=noiseBuffer;var f2=audioCtx.createBiquadFilter();f2.type="bandpass";f2.frequency.setValueAtTime(o.bodyFreq||1600,t);f2.frequency.exponentialRampToValueAtTime(Math.max(80,(o.bodyFreq||1600)*0.25),t+0.11);f2.Q.value=1.4;var g2=audioCtx.createGain();g2.gain.setValueAtTime(0.0001,t);g2.gain.linearRampToValueAtTime((o.bodyVol||0.32)*V,t+0.0018);g2.gain.exponentialRampToValueAtTime(0.0001,t+(o.bodyDur||0.14));s2.connect(f2);f2.connect(g2);g2.connect(master);s2.start(t);s2.stop(t+0.30);
var o4=audioCtx.createOscillator();o4.type="sine";o4.frequency.setValueAtTime(o.subStart||105,t);o4.frequency.exponentialRampToValueAtTime(Math.max(20,o.subEnd||36),t+0.13);var g3=audioCtx.createGain();g3.gain.setValueAtTime(0.0001,t);g3.gain.linearRampToValueAtTime((o.subVol||0.20)*V,t+0.0012);g3.gain.exponentialRampToValueAtTime(0.0001,t+0.18);o4.connect(g3);g3.connect(master);o4.start(t);o4.stop(t+0.22);
var s3=audioCtx.createBufferSource();s3.buffer=noiseBuffer;var bp=audioCtx.createBiquadFilter();bp.type="bandpass";bp.frequency.value=900;bp.Q.value=0.6;var g4=audioCtx.createGain();g4.gain.setValueAtTime(0.0001,t);g4.gain.linearRampToValueAtTime((o.reverbVol||0.06)*V,t+0.02);g4.gain.exponentialRampToValueAtTime(0.0001,t+0.35);s3.connect(bp);bp.connect(g4);g4.connect(master);s3.start(t);s3.stop(t+0.38);}
function playSound(type){if(!settings.sound)return;applySoundMult(type);
if(type==="shoot_pistol")gunshot({click:820,crackVol:0.36,crackHP:2600,bodyFreq:1300,bodyVol:0.26,bodyDur:0.12,subStart:130,subEnd:52,subVol:0.16,reverbVol:0.06});
else if(type==="shoot_pistol_silent")gunshot({click:600,crackVol:0.12,crackHP:3000,bodyFreq:900,bodyVol:0.13,bodyDur:0.11,subStart:150,subEnd:60,subVol:0.06,reverbVol:0.03});
else if(type==="shoot_deagle")gunshot({click:520,crackVol:0.55,crackHP:2400,bodyFreq:1800,bodyVol:0.44,subStart:95,subEnd:30,subVol:0.34,reverbVol:0.10});
else if(type==="shoot_smg")gunshot({click:750,crackVol:0.32,crackHP:2700,bodyFreq:1500,bodyVol:0.24,subStart:120,subEnd:45,subVol:0.18,reverbVol:0.05});
else if(type==="shoot_smg_silent")gunshot({click:580,crackVol:0.10,crackHP:3200,bodyFreq:1000,bodyVol:0.11,subStart:140,subEnd:55,subVol:0.05,reverbVol:0.03});
else if(type==="shoot_smg_fast")gunshot({click:820,crackVol:0.30,crackHP:2900,bodyFreq:1700,bodyVol:0.20,subStart:115,subEnd:40,subVol:0.14,reverbVol:0.04});
else if(type==="shoot_rifle")gunshot({click:600,crackVol:0.46,crackHP:2400,bodyFreq:1700,bodyVol:0.36,bodyDur:0.14,subStart:105,subEnd:34,subVol:0.26,reverbVol:0.08});
else if(type==="shoot_rifle_m4")gunshot({click:640,crackVol:0.44,crackHP:2500,bodyFreq:1550,bodyVol:0.32,subStart:110,subEnd:38,subVol:0.22,reverbVol:0.07});
else if(type==="shoot_shotgun")gunshot({click:420,crackVol:0.55,crackHP:2200,bodyFreq:1100,bodyVol:0.52,bodyDur:0.20,subStart:85,subEnd:25,subVol:0.40,reverbVol:0.14});
else if(type==="shoot_awp")gunshot({click:480,crackVol:0.60,crackHP:2200,bodyFreq:2000,bodyVol:0.52,bodyDur:0.24,subStart:90,subEnd:24,subVol:0.40,reverbVol:0.14});
else if(type==="knife_swing"){noise(0.15,0.13,"bandpass",4400,650,3.2,0.001,0.14);osc(3000,500,0.08,0.05,"triangle");}
else if(type==="knife_hit"){noise(0.12,0.24,"highpass",1400,600,1.2,0.001,0.10);osc(220,70,0.10,0.12,"square");}
else if(type==="hit")osc(920,420,0.05,0.09,"triangle");
else if(type==="headshot"){osc(1450,720,0.065,0.14,"triangle");setTimeout(function(){osc(1850,920,0.055,0.11,"sine");},40);}
else if(type==="damage"){noise(0.22,0.17,"lowpass",720,110,1.6,0.001,0.20);osc(85,42,0.19,0.10,"sine");}
else if(type==="reload"){click(340,0.13,0.03);setTimeout(function(){click(200,0.10,0.05);},140);setTimeout(function(){click(260,0.11,0.04);},320);}
else if(type==="step"){applySoundMult("step");noise(0.10,0.10,"lowpass",1100,150,1,0.004,0.15);}
else if(type==="step_run"){applySoundMult("step_run");noise(0.15,0.16,"lowpass",1400,180,1,0.004,0.18);}
else if(type==="explode"){noise(0.7,0.38,"lowpass",1300,52,1.4,0.001,0.7);osc(150,25,0.6,0.24,"sawtooth");}
else if(type==="empty")click(720,0.10,0.035);
else if(type==="wave")osc(400,900,0.30,0.13,"triangle");
else if(type==="ads_in")click(1050,0.05,0.04);
else if(type==="ads_out")click(700,0.05,0.04);
else if(type==="case")noise(0.05,0.055,"highpass",3800,1600,2.2,0.001,0.05);
else if(type==="crouch")noise(0.09,0.05,"lowpass",500,180,1,0.005,0.09);
else if(type==="regen")osc(620,920,0.15,0.05,"sine");
else if(type==="bolt"){click(430,0.10,0.05);setTimeout(function(){click(280,0.08,0.06);},120);}
else if(type==="inspect"){click(500,0.06,0.04);setTimeout(function(){click(760,0.05,0.03);},90);}
else if(type==="knife_equip"){click(320,0.10,0.05);noise(0.07,0.06,"highpass",3100,1200,2,0.001,0.07);}
else if(type==="medkit"){osc(700,1200,0.18,0.10,"sine");setTimeout(function(){osc(1000,1600,0.14,0.09,"sine");},90);}
else if(type==="ladder"){click(180,0.06,0.08);}
else if(type==="glass"){noise(0.20,0.22,"highpass",4500,1800,2.0,0.001,0.18);osc(2200,800,0.10,0.08,"triangle");}}
function playBotGunshot(x,z){if(!settings.sound||!ensureAudio())return;var dx=x-player.x,dz=z-player.z;var dist=Math.sqrt(dx*dx+dz*dz);if(dist>80)return;var vol=Math.max(0,1-dist/75);var master=audioCtx.createGain();master.gain.value=vol*vol*0.75*(settings.masterVolume/100)*(settings.effectsVolume/100);master.connect(audioCtx.destination);var t=audioCtx.currentTime;
var s1=audioCtx.createBufferSource();s1.buffer=noiseBuffer;var bp=audioCtx.createBiquadFilter();bp.type="bandpass";bp.frequency.setValueAtTime(1600,t);bp.frequency.exponentialRampToValueAtTime(450,t+0.12);bp.Q.value=1.4;var g1=audioCtx.createGain();g1.gain.setValueAtTime(0.0001,t);g1.gain.linearRampToValueAtTime(0.35,t+0.002);g1.gain.exponentialRampToValueAtTime(0.0001,t+0.16);s1.connect(bp);bp.connect(g1);g1.connect(master);s1.start(t);s1.stop(t+0.24);
var o=audioCtx.createOscillator();o.type="sine";o.frequency.setValueAtTime(95,t);o.frequency.exponentialRampToValueAtTime(28,t+0.13);var g3=audioCtx.createGain();g3.gain.setValueAtTime(0.0001,t);g3.gain.linearRampToValueAtTime(0.22,t+0.002);g3.gain.exponentialRampToValueAtTime(0.0001,t+0.16);o.connect(g3);g3.connect(master);o.start(t);o.stop(t+0.20);}

// ===== МАРЫ =====
function carveRect(g,x0,z0,w,d,t){for(var z=z0;z<z0+d;z++)for(var x=x0;x<x0+w;x++){if(x<1||z<1||x>=g[0].length-1||z>=g.length-1)continue;g[z][x]=t;}}
function mkGrid(W,H){var g=[];for(var z=0;z<H;z++){var r=[];for(var x=0;x<W;x++)r.push(1);g.push(r);}for(var x=0;x<W;x++){g[0][x]=3;g[H-1][x]=3;}for(var z=0;z<H;z++){g[z][0]=3;g[z][W-1]=3;}return g;}

function buildBunker7(){
  var W=56,H=56,g=mkGrid(W,H);
  carveRect(g,2,2,W-4,H-4,0);
  // Реакторный зал (центральная открытая зона с кольцом)
  carveRect(g,22,22,12,12,0);
  // Кольцевые стены вокруг реактора
  carveRect(g,20,26,2,4,5);carveRect(g,34,26,2,4,5);
  carveRect(g,26,20,4,2,5);carveRect(g,26,34,4,2,5);
  // Реактор в центре
  carveRect(g,26,26,4,4,1);
  // Оружейка восточная
  for(var x=44;x<52;x++){g[24][x]=1;g[32][x]=1;}
  for(var z=24;z<=32;z++){g[z][44]=1;g[z][52]=1;}
  carveRect(g,45,25,6,6,0);g[28][44]=0;g[28][45]=0;
  // Лаборатория западная
  for(var x=6;x<16;x++){g[22][x]=1;g[34][x]=1;}
  for(var z=22;z<=34;z++){g[z][6]=1;g[z][16]=1;}
  carveRect(g,7,23,8,10,0);
  // Стеклянные стены в лаборатории
  carveRect(g,10,24,1,8,10);
  // Диспетчерская (балкон)
  carveRect(g,24,46,8,6,0);
  // Вентиляционные коридоры
  carveRect(g,18,14,20,2,0);
  carveRect(g,18,40,20,2,0);
  carveRect(g,14,18,2,20,0);
  carveRect(g,40,18,2,20,0);
  // Ящики в оружейке
  carveRect(g,46,26,2,2,5);carveRect(g,49,30,2,2,5);
  // Ящики в лаборатории
  carveRect(g,8,24,2,2,5);carveRect(g,8,30,2,2,5);
  return g;
}
function buildHarbor(){
  var W=64,H=64,g=mkGrid(W,H);
  carveRect(g,2,2,W-4,H-4,0);
  // Контейнерный лабиринт (60 контейнеров)
  var conts=[
    [10,10,4,2],[16,10,4,2],[22,10,2,4],[26,10,4,2],[32,10,4,2],[38,10,2,4],[42,10,4,2],[48,10,4,2],
    [10,14,2,4],[14,14,4,2],[20,14,4,2],[26,14,2,4],[30,14,4,2],[36,14,4,2],[42,14,4,2],[48,14,2,4],
    [10,20,4,2],[16,20,2,4],[20,20,4,2],[26,20,4,2],[32,20,4,2],[38,20,4,2],[44,20,2,4],[48,20,4,2],
    [10,26,2,4],[14,26,4,2],[20,26,4,2],[26,26,2,4],[30,26,4,2],[36,26,2,4],[42,26,4,2],[48,26,2,4],
    [10,32,4,2],[16,32,4,2],[22,32,4,2],[28,32,4,2],[34,32,4,2],[40,32,4,2],[46,32,4,2],[50,32,2,4],
    [12,38,2,4],[18,38,4,2],[24,38,4,2],[30,38,2,4],[36,38,4,2],[42,38,4,2],[48,38,4,2],
    [14,44,4,2],[20,44,2,4],[26,44,4,2],[32,44,2,4],[38,44,4,2],[44,44,4,2],
    [10,50,4,2],[16,50,4,2],[22,50,4,2],[28,50,4,2],[34,50,4,2],[40,50,4,2],[46,50,4,2]
  ];
  for(var i=0;i<conts.length;i++){var c=conts[i];carveRect(g,c[0],c[1],c[2],c[3],5);}
  // Северные ангары (стены)
  for(var x=6;x<28;x++){g[6][x]=1;g[18][x]=1;}
  for(var z=6;z<=18;z++){g[z][6]=1;g[z][28]=1;}
  carveRect(g,7,7,20,11,0);
  // Второй ангар
  for(var x=36;x<58;x++){g[6][x]=1;g[18][x]=1;}
  for(var z=6;z<=18;z++){g[z][36]=1;g[z][58]=1;}
  carveRect(g,37,7,20,11,0);
  // Корабль на юге (простая структура)
  for(var x=22;x<42;x++){g[56][x]=1;}
  for(var z=50;z<=58;z++){g[z][22]=1;g[z][42]=1;}
  carveRect(g,23,51,18,7,0);
  // Ящики на корабле
  carveRect(g,26,53,2,2,5);carveRect(g,36,53,2,2,5);carveRect(g,31,56,2,2,5);
  return g;
}
function buildNeonDistrict(){
  var W=60,H=60,g=mkGrid(W,H);
  carveRect(g,2,2,W-4,H-4,0);
  // 5 небоскрёбов
  function tower(x,z){
    for(var xx=x;xx<x+12;xx++){g[z][xx]=2;g[z+11][xx]=2;}
    for(var zz=z;zz<z+12;zz++){g[zz][x]=2;g[zz][x+11]=2;}
    carveRect(g,x+1,z+1,10,10,0);
  }
  tower(2,2);tower(46,2);tower(2,46);tower(46,46);tower(24,24);
  // Центральная площадь открыта
  // Переулки
  carveRect(g,16,6,28,4,0);
  carveRect(g,16,50,28,4,0);
  carveRect(g,6,16,4,28,0);
  carveRect(g,50,16,4,28,0);
  // Подземный переход (тоннель)
  carveRect(g,28,14,4,32,0);
  // Бар (2 здания по бокам)
  carveRect(g,22,40,4,6,0);carveRect(g,34,40,4,6,0);
  // Ящики/укрытия на площади
  carveRect(g,20,20,3,3,5);carveRect(g,37,20,3,3,5);
  carveRect(g,20,37,3,3,5);carveRect(g,37,37,3,3,5);
  return g;
}
function buildArcticOutpost(){
  var W=62,H=62,g=mkGrid(W,H);
  carveRect(g,2,2,W-4,H-4,0);
  // Главный корпус (север)
  for(var x=8;x<30;x++){g[6][x]=1;g[22][x]=1;}
  for(var z=6;z<=22;z++){g[z][8]=1;g[z][30]=1;}
  carveRect(g,9,7,20,14,0);
  // Ангар (восток)
  for(var x=36;x<58;x++){g[8][x]=1;g[26][x]=1;}
  for(var z=8;z<=26;z++){g[z][36]=1;g[z][58]=1;}
  carveRect(g,37,9,20,16,0);
  // Склад топлива (юго-запад)
  for(var x=6;x<24;x++){g[38][x]=1;g[54][x]=1;}
  for(var z=38;z<=54;z++){g[z][6]=1;g[z][24]=1;}
  carveRect(g,7,39,16,14,0);
  // Цистерны (круглые)
  carveRect(g,9,42,2,2,6);carveRect(g,14,42,2,2,6);carveRect(g,19,42,2,2,6);
  carveRect(g,9,48,2,2,6);carveRect(g,14,48,2,2,6);carveRect(g,19,48,2,2,6);
  // Радиостанция (юго-восток)
  for(var x=38;x<54;x++){g[38][x]=1;g[54][x]=1;}
  for(var z=38;z<=54;z++){g[z][38]=1;g[z][54]=1;}
  carveRect(g,39,39,14,14,0);
  // Буровая вышка в центре
  carveRect(g,28,28,6,6,2);
  // Снежные траншеи по периметру (низкие стены-укрытия)
  for(var x=4;x<58;x+=6){carveRect(g,x,4,2,1,4);}
  for(var x=4;x<58;x+=6){carveRect(g,x,57,2,1,4);}
  for(var z=4;z<58;z+=6){carveRect(g,4,z,1,2,4);}
  for(var z=4;z<58;z+=6){carveRect(g,57,z,1,2,4);}
  return g;
}

var BUNKER_DATA=buildBunker7();
var HARBOR_DATA=buildHarbor();
var NEON_DATA=buildNeonDistrict();
var ARCTIC_DATA=buildArcticOutpost();

var MAPS={
  bunker:{name:"Bunker 7",desc:"Подземный бункер: 3 уровня, реактор, узкие коридоры.",icon:"🕳️",tag:"56×56",tags:["Ближний","Тесный"],diff:"ЛЁГКАЯ",diffColor:"#44cc44",defaultDifficulty:"easy",data:BUNKER_DATA,skyColor:0x2a1a1a,fogColor:0x3a2020,fogNear:14,fogFar:55,ambientColor:0xa88080,ambientInt:0.95,hemiSky:0x804040,hemiGround:0x201010,hemiInt:1.00,sunColor:0xff6644,sunInt:1.20,floorColor:0x4a3a3a,pointLights:[{x:28,z:28,y:12,color:0xff4422,intensity:3.0,dist:30},{x:8,z:28,y:6,color:0xffaa66,intensity:1.5,dist:18},{x:48,z:28,y:6,color:0xffaa66,intensity:1.5,dist:18},{x:28,z:50,y:6,color:0xffaa66,intensity:1.5,dist:18}]},
  harbor:{name:"Harbor",desc:"Промышленный порт: контейнеры, корабль, 3 крана.",icon:"⚓",tag:"64×64",tags:["Универсал","Средний"],diff:"СРЕДНЯЯ",diffColor:"#ffaa44",defaultDifficulty:"normal",data:HARBOR_DATA,skyColor:0xff8a4a,fogColor:0xffaa66,fogNear:50,fogFar:180,ambientColor:0xffd8a8,ambientInt:1.15,hemiSky:0xffd0a0,hemiGround:0x604020,hemiInt:1.25,sunColor:0xffcc88,sunInt:1.90,floorColor:0x6a5a48,pointLights:[{x:32,z:32,y:14,color:0xffe0a0,intensity:2.6,dist:55}]},
  neon:{name:"Neon District",desc:"Киберпанк-район: 5 небоскрёбов, крыши, подземка.",icon:"🌃",tag:"60×60",tags:["Вертикаль","Ночь"],diff:"СЛОЖНАЯ",diffColor:"#ff6666",defaultDifficulty:"hard",data:NEON_DATA,skyColor:0x1a0a2a,fogColor:0x2a1040,fogNear:20,fogFar:70,ambientColor:0x8060a0,ambientInt:0.90,hemiSky:0x6030a0,hemiGround:0x200a40,hemiInt:1.00,sunColor:0xc060ff,sunInt:1.30,floorColor:0x1a1020,pointLights:[{x:30,z:30,y:15,color:0xff40ff,intensity:3.5,dist:45},{x:8,z:8,y:8,color:0x40ffff,intensity:2.0,dist:22},{x:52,z:8,y:8,color:0x40ff80,intensity:2.0,dist:22},{x:8,z:52,y:8,color:0xff4040,intensity:2.0,dist:22},{x:52,z:52,y:8,color:0xffcc40,intensity:2.0,dist:22}]},
  arctic:{name:"Arctic Outpost",desc:"Полярная станция: вышка, ангар, склад топлива.",icon:"❄️",tag:"62×62",tags:["Дальний","Снег"],diff:"СРЕДНЯЯ",diffColor:"#ffaa44",defaultDifficulty:"normal",data:ARCTIC_DATA,skyColor:0x88b0d8,fogColor:0xd0e0f0,fogNear:20,fogFar:120,ambientColor:0xe8f0ff,ambientInt:1.20,hemiSky:0xddeeff,hemiGround:0x8090a0,hemiInt:1.35,sunColor:0xfff0e0,sunInt:1.60,floorColor:0xe0e8f0,pointLights:[{x:31,z:31,y:16,color:0xfff0d0,intensity:2.8,dist:50}]}
};

var BOT_DIFF_MULT={easy:{hp:0.65,dmg:0.55,acc:0.55,turn:0.75,vision:0.75,speed:0.85},normal:{hp:1.0,dmg:1.0,acc:1.0,turn:1.0,vision:1.0,speed:1.0},hard:{hp:1.35,dmg:1.35,acc:1.25,turn:1.35,vision:1.2,speed:1.15},insane:{hp:1.8,dmg:1.8,acc:1.55,turn:1.7,vision:1.4,speed:1.3}};

var currentMapKey="harbor",MAP=MAPS.harbor.data,MAP_W=MAP[0].length,MAP_H=MAP.length;
var WALL_HEIGHTS={1:4.5,2:6.0,3:9.5,4:1.0,5:0.60,6:0.70,7:0.45,8:0.50,10:2.20};
var STEP_UP=0.18,JUMP_VELOCITY=5.9;
function isWall(x,z){var mx=Math.floor(x),mz=Math.floor(z);if(mx<0||mz<0||mx>=MAP_W||mz>=MAP_H)return true;return MAP[mz][mx]!==0;}
function isPenetrableTile(t){return t===7||t===8||t===10||t===15;}
function isTallWall(x,z){var mx=Math.floor(x),mz=Math.floor(z);if(mx<0||mz<0||mx>=MAP_W||mz>=MAP_H)return true;var t=MAP[mz][mx];if(t===0)return false;if(isPenetrableTile(t))return false;return true;}

var MAP_TOP=null,MAP_LADDER=null,MAP_STAIRS=null,MAP_UNDER=null;
function initMultiLevel(){MAP_TOP=[];MAP_LADDER=[];MAP_STAIRS=[];MAP_UNDER=[];for(var z=0;z<MAP_H;z++){var a=[],b=[],c=[],d=[];for(var x=0;x<MAP_W;x++){a.push(0);b.push(false);c.push(0);d.push(false);}MAP_TOP.push(a);MAP_LADDER.push(b);MAP_STAIRS.push(c);MAP_UNDER.push(d);}}
function topHeightAt(x,z){if(!MAP_TOP)return 0;var mx=Math.floor(x),mz=Math.floor(z);if(mx<0||mz<0||mx>=MAP_W||mz>=MAP_H)return 0;return MAP_TOP[mz][mx]||0;}
function isLadderAt(x,z){if(!MAP_LADDER)return false;var mx=Math.floor(x),mz=Math.floor(z);if(mx<0||mz<0||mx>=MAP_W||mz>=MAP_H)return false;return !!MAP_LADDER[mz][mx];}
function stairsDirAt(x,z){if(!MAP_STAIRS)return 0;var mx=Math.floor(x),mz=Math.floor(z);if(mx<0||mz<0||mx>=MAP_W||mz>=MAP_H)return 0;return MAP_STAIRS[mz][mx]||0;}
function isUnderAt(x,z){if(!MAP_UNDER)return false;var mx=Math.floor(x),mz=Math.floor(z);if(mx<0||mz<0||mx>=MAP_W||mz>=MAP_H)return false;return !!MAP_UNDER[mz][mx];}
function elevateRect(x0,z0,w,d,h,opts){if(!MAP_TOP)initMultiLevel();var o=opts||{};for(var z=z0;z<z0+d;z++)for(var x=x0;x<x0+w;x++){if(x<0||z<0||x>=MAP_W||z>=MAP_H)continue;MAP_TOP[z][x]=h;if(o.under)MAP_UNDER[z][x]=true;}}
function addLadder(x,z){if(!MAP_LADDER)initMultiLevel();if(x>=0&&z>=0&&x<MAP_W&&z<MAP_H)MAP_LADDER[z][x]=true;}
function addStairs(x0,z0,w,d,dir){if(!MAP_STAIRS)initMultiLevel();for(var z=z0;z<z0+d;z++)for(var x=x0;x<x0+w;x++)if(x>=0&&z>=0&&x<MAP_W&&z<MAP_H)MAP_STAIRS[z][x]=dir;}
function getFloorHeightY(x,z,currentY){var mx=Math.floor(x),mz=Math.floor(z);if(mx<0||mz<0||mx>=MAP_W||mz>=MAP_H)return 0;var t=MAP[mz][mx];var baseH=t===0?0:(WALL_HEIGHTS[t]||0);var topH=topHeightAt(x,z);var sd=stairsDirAt(x,z);if(sd>0){var frac=sd===1?(1-(z-mz)):sd===2?(z-mz):sd===3?(1-(x-mx)):(x-mx);var f=Math.max(0,Math.min(1,frac));var target=topH>0?topH:(baseH+0.5);return baseH+(target-baseH)*f;}if(topH>0){if(currentY+STEP_UP>=topH)return topH;if(isUnderAt(x,z))return baseH;return baseH;}return baseH;}
function getFloorHeight(x,z){var cy=(typeof player!=="undefined"&&player)?player.y:0;return getFloorHeightY(x,z,cy);}

var PLAYER_RADIUS=0.42,PLAYER_CHECK_OFFSETS=[];
for(var i=0;i<12;i++){var a=(i/12)*Math.PI*2;PLAYER_CHECK_OFFSETS.push([Math.cos(a)*PLAYER_RADIUS,Math.sin(a)*PLAYER_RADIUS]);}
PLAYER_CHECK_OFFSETS.push([0,0]);
var corpseColliders=[];
function canMoveAtHeight(x,z,y){for(var i=0;i<PLAYER_CHECK_OFFSETS.length;i++){var o=PLAYER_CHECK_OFFSETS[i];var wx=x+o[0],wz=z+o[1];var mx=Math.floor(wx),mz=Math.floor(wz);if(mx<0||mz<0||mx>=MAP_W||mz>=MAP_H)return false;var t=MAP[mz][mx];if(t===0)continue;if(isPenetrableTile(t))continue;var h=WALL_HEIGHTS[t]||6;if(y+STEP_UP<h)return false;}
if(y<0.8){for(var i=0;i<corpseColliders.length;i++){var c=corpseColliders[i];var dx=x-c.x,dz=z-c.z;var rr=PLAYER_RADIUS+c.r;if(dx*dx+dz*dz<rr*rr)return false;}}
if(MAP_TOP){var mx=Math.floor(x),mz=Math.floor(z);if(mx>=0&&mz>=0&&mx<MAP_W&&mz<MAP_H){var topH=MAP_TOP[mz][mx];if(topH>0&&!isUnderAt(x,z)){if(y+STEP_UP<topH)return false;}}}
return true;}
function canMove(x,z){for(var i=0;i<PLAYER_CHECK_OFFSETS.length;i++){var o=PLAYER_CHECK_OFFSETS[i];var wx=x+o[0],wz=z+o[1];var mx=Math.floor(wx),mz=Math.floor(wz);if(mx<0||mz<0||mx>=MAP_W||mz>=MAP_H)return false;var t=MAP[mz][mx];if(t===0||isPenetrableTile(t))continue;var h=WALL_HEIGHTS[t]||6;if(STEP_UP<h)return false;}return true;}
function canMoveRadius(x,z,r){for(var i=0;i<10;i++){var a=(i/10)*Math.PI*2;if(isWall(x+Math.cos(a)*r,z+Math.sin(a)*r))return false;}return !isWall(x,z);}
function canMoveBot(x,z){return canMoveRadius(x,z,0.36);}
function tryUnstuck(){if(canMoveAtHeight(player.x,player.z,player.y))return false;for(var i=corpseColliders.length-1;i>=0;i--){var c=corpseColliders[i];var dx=player.x-c.x,dz=player.z-c.z;if(Math.sqrt(dx*dx+dz*dz)<1.2)corpseColliders.splice(i,1);}if(canMoveAtHeight(player.x,player.z,player.y))return true;for(var r=0.1;r<=3.0;r+=0.15)for(var i=0;i<16;i++){var a=(i/16)*Math.PI*2;var nx=player.x+Math.cos(a)*r,nz=player.z+Math.sin(a)*r;if(canMoveAtHeight(nx,nz,player.y)){player.x=nx;player.z=nz;return true;}}return false;}
var validBotCells=[];
function rebuildBotCells(){validBotCells=[];for(var z=1;z<MAP_H-1;z++)for(var x=1;x<MAP_W-1;x++){if(MAP[z][x]!==0)continue;var cx=x+0.5,cz=z+0.5;if(canMoveBot(cx,cz))validBotCells.push({x:cx,z:cz});}}
function findFreeSpotInZone(zone,maxTries){var tries=maxTries||300;var xMin,xMax,zMin,zMax;if(zone==="south"){zMin=Math.floor(MAP_H*0.78);zMax=MAP_H-3;xMin=4;xMax=MAP_W-4;}else if(zone==="north"){zMin=1;zMax=Math.floor(MAP_H*0.25);xMin=4;xMax=MAP_W-4;}else{zMin=2;zMax=MAP_H-3;xMin=2;xMax=MAP_W-3;}for(var i=0;i<tries;i++){var x=xMin+0.5+Math.random()*(xMax-xMin),z=zMin+0.5+Math.random()*(zMax-zMin);if(canMove(x,z)&&getFloorHeight(x,z)===0)return{x:x,z:z};}return{x:MAP_W/2,z:MAP_H/2};}
function getBotSpawnOpposite(){if(validBotCells.length===0)return null;var playerInSouth=player.z>MAP_H*0.5;var zMin=playerInSouth?1:Math.floor(MAP_H*0.6);var zMax=playerInSouth?Math.floor(MAP_H*0.4):MAP_H-1;var zone=[];for(var i=0;i<validBotCells.length;i++)if(validBotCells[i].z>=zMin&&validBotCells[i].z<=zMax)zone.push(validBotCells[i]);var pool=zone.length>0?zone:validBotCells;var farFromPlayer=[];for(var i=0;i<pool.length;i++){var dx=pool[i].x-player.x,dz=pool[i].z-player.z;if(Math.sqrt(dx*dx+dz*dz)>=18)farFromPlayer.push(pool[i]);}if(farFromPlayer.length>0)pool=farFromPlayer;return pool[Math.floor(Math.random()*pool.length)];}

function makeSkin(baseHex,accentHex,patternFn){var S=128;var c=document.createElement("canvas");c.width=c.height=S;var x=c.getContext("2d");x.fillStyle=baseHex;x.fillRect(0,0,S,S);if(patternFn)patternFn(x,S,accentHex);var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;t.needsUpdate=true;return t;}
function skinRedline(x,S,a){x.strokeStyle=a;x.lineWidth=3;for(var i=0;i<6;i++){x.beginPath();x.moveTo(0,20+i*18);x.lineTo(S,12+i*18);x.stroke();}}
function skinAsiimov(x,S,a){x.fillStyle="#f4f4f4";x.fillRect(0,0,S,S);x.fillStyle=a;x.beginPath();x.moveTo(0,0);x.lineTo(S*0.6,0);x.lineTo(0,S*0.5);x.closePath();x.fill();x.beginPath();x.moveTo(S,S);x.lineTo(S*0.4,S);x.lineTo(S,S*0.5);x.closePath();x.fill();}
function skinVulcan(x,S,a){x.fillStyle="#1a2a3a";x.fillRect(0,0,S,S);x.strokeStyle="#e0e0e0";x.lineWidth=4;for(var i=0;i<5;i++){x.beginPath();x.moveTo(0,i*26);x.lineTo(S,i*26+10);x.stroke();}x.fillStyle=a;x.fillRect(0,S*0.45,S,8);}
function skinHyperbeast(x,S,a){x.fillStyle="#f0f0f0";x.fillRect(0,0,S,S);x.fillStyle=a;for(var i=0;i<30;i++){x.beginPath();x.arc(Math.random()*S,Math.random()*S,Math.random()*12+4,0,Math.PI*2);x.fill();}}
function skinFade(x,S){var g=x.createLinearGradient(0,0,0,S);g.addColorStop(0,"#3a0a5a");g.addColorStop(0.5,"#6a1a9a");g.addColorStop(1,"#f0c040");x.fillStyle=g;x.fillRect(0,0,S,S);}
function skinGold(x,S){var g=x.createLinearGradient(0,0,S,S);g.addColorStop(0,"#8a6a20");g.addColorStop(0.4,"#ffd966");g.addColorStop(0.6,"#fff4c0");g.addColorStop(1,"#8a6a20");x.fillStyle=g;x.fillRect(0,0,S,S);}
var SKINS={default:{name:"Стандарт",tex:null,icon:"⬜",rarity:"#888"},redline:{name:"Redline",tex:function(){return makeSkin("#2a2a2a","#cc2222",skinRedline);},icon:"🟥",rarity:"#cc2222"},asiimov:{name:"Asiimov",tex:function(){return makeSkin("#f4f4f4","#ff6600",skinAsiimov);},icon:"🟧",rarity:"#ff8800"},vulcan:{name:"Vulcan",tex:function(){return makeSkin("#1a2a3a","#ff3030",skinVulcan);},icon:"🔵",rarity:"#4a9eff"},hyperbeast:{name:"HyperBeast",tex:function(){return makeSkin("#f0f0f0","#ff2a6a",skinHyperbeast);},icon:"🐯",rarity:"#ff2a6a"},fade:{name:"Fade",tex:function(){return makeSkin("#3a0a5a",null,skinFade);},icon:"🟪",rarity:"#a040e0"},gold:{name:"Gold",tex:function(){return makeSkin("#8a6a20",null,skinGold);},icon:"🟨",rarity:"#ffcc44"}};
var SKIN_TEX_CACHE={};
function getSkinTexture(k){if(!k||k==="default")return null;if(SKIN_TEX_CACHE[k])return SKIN_TEX_CACHE[k];var def=SKINS[k];if(!def||!def.tex)return null;try{SKIN_TEX_CACHE[k]=def.tex();}catch(e){return null;}return SKIN_TEX_CACHE[k];}
function applySkinToModel(model,skinKey){var tex=getSkinTexture(skinKey);if(!model)return;model.traverse(function(o){if(!o.isMesh||!o.material)return;if(!o.userData._skinMats){o.userData._skinMats={map:o.material.map||null,color:o.material.color?o.material.color.clone():null};}if(tex){var m=o.material;if(m.metalness!==undefined&&m.metalness>0.3){o.material=m.clone();o.material.map=tex;if(o.material.color)o.material.color.set(0xffffff);}}else{if(o.userData._skinMats.map!==undefined)o.material.map=o.userData._skinMats.map;if(o.userData._skinMats.color&&o.material.color)o.material.color.copy(o.userData._skinMats.color);}});}

function makeSandbagTexture(){var S=64,c=document.createElement("canvas");c.width=c.height=S;var x=c.getContext("2d");x.fillStyle="#8a7850";x.fillRect(0,0,S,S);for(var i=0;i<400;i++){x.fillStyle="rgba(140,120,80,.5)";x.fillRect(Math.random()*S,Math.random()*S,2,2);}var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;}
function makeGlassTexture(){var S=64,c=document.createElement("canvas");c.width=c.height=S;var x=c.getContext("2d");var g=x.createLinearGradient(0,0,S,S);g.addColorStop(0,"rgba(180,220,255,.5)");g.addColorStop(1,"rgba(180,220,255,.5)");x.fillStyle=g;x.fillRect(0,0,S,S);var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;}
function makeWoodDoorTexture(){var S=64,c=document.createElement("canvas");c.width=c.height=S;var x=c.getContext("2d");x.fillStyle="#5a3a1e";x.fillRect(0,0,S,S);x.strokeStyle="rgba(20,10,4,.7)";x.lineWidth=2;for(var i=1;i<4;i++){x.beginPath();x.moveTo(0,i*S/4);x.lineTo(S,i*S/4);x.stroke();}var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;}
function makeMetalTexture(base){var S=64;var c=document.createElement("canvas");c.width=S;c.height=S;var ctx=c.getContext("2d");ctx.fillStyle=base;ctx.fillRect(0,0,S,S);for(var i=0;i<300;i++){var v=Math.random()*30-15;ctx.fillStyle="rgba("+(128+v)+","+(128+v)+","+(128+v)+",.2)";ctx.fillRect(Math.random()*S,Math.random()*S,Math.random()*4+1,Math.random()*4+1);}var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;}
function makeWoodTexture(){var S=128;var c=document.createElement("canvas");c.width=S;c.height=S;var ctx=c.getContext("2d");ctx.fillStyle="#8a5a28";ctx.fillRect(0,0,S,S);for(var i=0;i<30;i++){ctx.strokeStyle="rgba(40,20,5,.3)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,Math.random()*S);ctx.lineTo(S,Math.random()*S);ctx.stroke();}var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;}
function makePolymerTexture(){var S=64;var c=document.createElement("canvas");c.width=S;c.height=S;var ctx=c.getContext("2d");ctx.fillStyle="#1c1c1c";ctx.fillRect(0,0,S,S);ctx.strokeStyle="rgba(60,60,60,.5)";ctx.lineWidth=1;for(var i=-S;i<S*2;i+=6){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+S,S);ctx.stroke();}var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;}
function makeBladeTexture(){var S=128;var c=document.createElement("canvas");c.width=S;c.height=S;var ctx=c.getContext("2d");var gr=ctx.createLinearGradient(0,0,S,0);gr.addColorStop(0,"#8a9098");gr.addColorStop(.5,"#ffffff");gr.addColorStop(1,"#7a8088");ctx.fillStyle=gr;ctx.fillRect(0,0,S,S);var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;}
function makeBulletHoleTexture(){var S=64;var c=document.createElement("canvas");c.width=S;c.height=S;var ctx=c.getContext("2d");var cx=S/2,cy=S/2;var g=ctx.createRadialGradient(cx,cy,1,cx,cy,S*.3);g.addColorStop(0,"rgba(10,5,0,1)");g.addColorStop(.5,"rgba(40,25,15,.8)");g.addColorStop(1,"rgba(80,50,30,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,S*.3,0,Math.PI*2);ctx.fill();var t=new THREE.CanvasTexture(c);t.needsUpdate=true;return t;}
function makeGloveTexture(){var S=128;var c=document.createElement("canvas");c.width=c.height=S;var x=c.getContext("2d");x.fillStyle="#1a1a1f";x.fillRect(0,0,S,S);x.strokeStyle="rgba(60,60,70,.55)";x.lineWidth=1;for(var i=0;i<S;i+=6){x.beginPath();x.moveTo(i,0);x.lineTo(i,S);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(S,i);x.stroke();}var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;}
function makeSleeveTexture(){var S=128;var c=document.createElement("canvas");c.width=c.height=S;var x=c.getContext("2d");x.fillStyle="#2a3a2a";x.fillRect(0,0,S,S);x.fillStyle="rgba(255,255,255,.06)";for(var i=0;i<60;i++)x.fillRect(Math.random()*S,Math.random()*S,3,3);var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;}
function makeSmokeTexture(){var S=64;var c=document.createElement("canvas");c.width=c.height=S;var x=c.getContext("2d");var g=x.createRadialGradient(S/2,S/2,2,S/2,S/2,S/2);g.addColorStop(0,"rgba(220,220,220,0.55)");g.addColorStop(0.4,"rgba(180,180,180,0.30)");g.addColorStop(1,"rgba(120,120,120,0)");x.fillStyle=g;x.fillRect(0,0,S,S);var t=new THREE.CanvasTexture(c);t.needsUpdate=true;return t;}

var DECOR_TEX={sandbag:makeSandbagTexture(),glass:makeGlassTexture(),door:makeWoodDoorTexture()};
var WEAPON_TEX={metalDark:makeMetalTexture("#2a2a2a"),metalMid:makeMetalTexture("#3e3e3e"),metalChrome:makeMetalTexture("#7a7a7a"),wood:makeWoodTexture(),polymer:makePolymerTexture(),polymerLight:makeMetalTexture("#4a4a4a"),magazine:makeMetalTexture("#5a3e1c"),blade:makeBladeTexture()};
var BH_TEX=makeBulletHoleTexture();
var GLOVE_TEX=makeGloveTexture();
var SLEEVE_TEX=makeSleeveTexture();
var SMOKE_TEX=makeSmokeTexture();

var overlay=document.createElement("canvas");overlay.style.cssText="position:fixed;top:0;left:0;pointer-events:none;z-index:5;";document.body.appendChild(overlay);
var octx=overlay.getContext("2d");
var awpScopeCache=null,awpScopeCacheW=0,awpScopeCacheH=0;
function resizeOverlay(){overlay.width=window.innerWidth;overlay.height=window.innerHeight;overlay.style.width=window.innerWidth+"px";overlay.style.height=window.innerHeight+"px";awpScopeCache=null;}
resizeOverlay();
var weaponMenuEl=document.getElementById("weaponMenu"),settingsEl=document.getElementById("settings"),lobbyEl=document.getElementById("lobby"),inspectHintEl=document.getElementById("inspectHint"),mapSelectEl=document.getElementById("mapSelectModal"),deathScreenEl=document.getElementById("deathScreen"),gunMenuLobbyEl=document.getElementById("gunMenuLobby");

var TEX_SIZE=128;
var TEXTURES={1:null,2:null,3:null,4:null,5:null};var TEX_FLOOR=null;
function drawStone(x){var S=TEX_SIZE;var g=x.createLinearGradient(0,0,0,S);g.addColorStop(0,"#7a8898");g.addColorStop(.5,"#5a6878");g.addColorStop(1,"#3a4858");x.fillStyle=g;x.fillRect(0,0,S,S);for(var i=0;i<S*S*0.3;i++){var v=Math.random()*40-20;x.fillStyle="rgba("+(120+v)+","+(130+v)+","+(140+v)+",.25)";x.fillRect(Math.random()*S,Math.random()*S,2,2);}}
function drawWood(x){var S=TEX_SIZE;x.fillStyle="#8a5a28";x.fillRect(0,0,S,S);for(var i=0;i<8;i++){x.fillStyle="rgba(20,8,2,.5)";x.fillRect(0,i*S/8,S,1);}}
function drawMetal(x){var S=TEX_SIZE;x.fillStyle="#6a7890";x.fillRect(0,0,S,S);}
function drawConcrete(x){var S=TEX_SIZE;x.fillStyle="#8a9098";x.fillRect(0,0,S,S);}
function drawFloor(x){var S=TEX_SIZE;var g=x.createLinearGradient(0,0,S,S);g.addColorStop(0,"#9098a0");g.addColorStop(1,"#5a6068");x.fillStyle=g;x.fillRect(0,0,S,S);}
function safeTex(fn){try{var c=document.createElement("canvas");c.width=TEX_SIZE;c.height=TEX_SIZE;fn(c.getContext("2d"));var t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;}catch(e){return null;}}
function rebuildTextures(){TEXTURES[1]=safeTex(drawStone);TEXTURES[2]=safeTex(drawMetal);TEXTURES[3]=safeTex(drawConcrete);TEXTURES[4]=safeTex(drawWood);TEXTURES[5]=safeTex(drawWood);TEX_FLOOR=safeTex(drawFloor);}
rebuildTextures();

var CTRL_IDS=["joystick","btnShoot","btnInspect","btnLeanL","btnLeanR","btnReload","btnJump","btnCrouch","btnGrenade","btnWeapon","btnADS","btnFs","btnEdit","btnSlot1","btnSlot2","btnSlot3"];
var DEFAULT_CONTROLS={btnShoot:{fx:0.155,fy:0.115,size:0.30},joystick:{fx:0.250,fy:0.670,size:0.28},btnLeanL:{fx:0.250,fy:0.245,size:0.13},btnLeanR:{fx:0.310,fy:0.320,size:0.13},btnADS:{fx:0.945,fy:0.105,size:0.20},btnWeapon:{fx:0.700,fy:0.155,size:0.12},btnGrenade:{fx:0.770,fy:0.153,size:0.115},btnInspect:{fx:0.720,fy:0.300,size:0.115},btnCrouch:{fx:0.820,fy:0.300,size:0.12},btnJump:{fx:0.950,fy:0.610,size:0.125},btnReload:{fx:0.730,fy:0.855,size:0.14},btnSlot1:{fx:0.500,fy:0.762,size:0.10},btnSlot2:{fx:0.550,fy:0.762,size:0.10},btnSlot3:{fx:0.610,fy:0.762,size:0.10},btnFs:{fx:0.905,fy:0.030,size:0.085},btnEdit:{fx:0.455,fy:0.875,size:0.085}};
var controls=JSON.parse(JSON.stringify(DEFAULT_CONTROLS));
try{var st2=JSON.parse(localStorage.getItem(STORE_KEY));if(st2){for(var i=0;i<CTRL_IDS.length;i++){var id=CTRL_IDS[i];if(st2[id])controls[id]=Object.assign({},DEFAULT_CONTROLS[id],st2[id]);}}}catch(e){}
function applyControls(){var W=window.innerWidth,H=window.innerHeight,minDim=Math.min(W,H);for(var i=0;i<CTRL_IDS.length;i++){var id=CTRL_IDS[i];var el=document.getElementById(id);if(!el)continue;var c=controls[id];var size=Math.max(38,Math.min(minDim*0.55,c.size*minDim));el.style.left=(c.fx*W-size/2)+"px";el.style.top=(c.fy*H-size/2)+"px";el.style.width=size+"px";el.style.height=size+"px";el.style.fontSize=Math.max(12,size*0.36)+"px";}}
applyControls();
var editMode=false,selectedCtrl=null,dragState=null;
var sizeVal=document.getElementById("sizeVal");
function enterEdit(){editMode=true;document.body.classList.add("editMode");hint.style.display="none";safeExitPointerLock();}
function exitEdit(save){if(save)saveControls();editMode=false;selectedCtrl=null;document.body.classList.remove("editMode");document.querySelectorAll(".ctrl.selected").forEach(function(e){e.classList.remove("selected");});sizeVal.textContent="—";}
function saveControls(){try{localStorage.setItem(STORE_KEY,JSON.stringify(controls));}catch(e){}}
document.getElementById("btnEdit").addEventListener("click",function(e){e.stopPropagation();enterEdit();});
document.getElementById("btnDone").addEventListener("click",function(){exitEdit(true);});
document.getElementById("btnSave").addEventListener("click",function(){saveControls();});
document.getElementById("btnReset").addEventListener("click",function(){if(!confirm("Сбросить?"))return;controls=JSON.parse(JSON.stringify(DEFAULT_CONTROLS));applyControls();saveControls();selectCtrl(null);});
document.getElementById("sizeMinus").addEventListener("click",function(){changeSize(-5);});
document.getElementById("sizePlus").addEventListener("click",function(){changeSize(5);});
function changeSize(d){if(!selectedCtrl)return;var c=controls[selectedCtrl];c.size=Math.max(0.05,Math.min(0.6,c.size+d/100));applyControls();sizeVal.textContent=Math.round(c.size*100)+"%";saveControls();}
function selectCtrl(id){document.querySelectorAll(".ctrl.selected").forEach(function(e){e.classList.remove("selected");});selectedCtrl=id;if(id){document.getElementById(id).classList.add("selected");sizeVal.textContent=Math.round(controls[id].size*100)+"%";}else sizeVal.textContent="—";}

var scene=new THREE.Scene();
var worldCam=new THREE.PerspectiveCamera(settings.fov,window.innerWidth/window.innerHeight,0.08,260);worldCam.rotation.order="YXZ";
var viewScene=new THREE.Scene();
var viewCam=new THREE.PerspectiveCamera(50,window.innerWidth/window.innerHeight,0.03,10);viewCam.rotation.order="YXZ";
viewScene.add(viewCam);
viewScene.add(new THREE.AmbientLight(0xffffff,0.95));
viewScene.add(new THREE.HemisphereLight(0xffffff,0x909099,1.25));
var viewSun=new THREE.DirectionalLight(0xffffff,1.30);viewSun.position.set(-0.5,1.0,0.8);viewScene.add(viewSun);
var viewFill=new THREE.DirectionalLight(0xbbddff,0.85);viewFill.position.set(0.8,-0.3,-0.5);viewScene.add(viewFill);
var viewRim=new THREE.DirectionalLight(0xffcc88,0.80);viewRim.position.set(0.5,0.3,-1.0);viewScene.add(viewRim);
var muzzleFlashLight=new THREE.PointLight(0xffddaa,0,2.2,2);
muzzleFlashLight.position.set(0.06,-0.02,-0.55);
viewCam.add(muzzleFlashLight);
var renderer;
try{renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:!PERF_MODE,powerPreference:"high-performance",alpha:false,stencil:false});renderer.setPixelRatio(1);renderer.setSize(window.innerWidth,window.innerHeight,false);renderer.setClearColor(0x505868,1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=false;}catch(e){window.__showLoadErr("Renderer: "+e.message);}

var ambientLight,hemiLight,sunLight,fillLight;
var mapPointLights=[];
function initLights(cfg){if(ambientLight)scene.remove(ambientLight);if(hemiLight)scene.remove(hemiLight);if(sunLight)scene.remove(sunLight);if(fillLight)scene.remove(fillLight);for(var i=0;i<mapPointLights.length;i++)scene.remove(mapPointLights[i]);mapPointLights=[];
ambientLight=new THREE.AmbientLight(cfg.ambientColor,cfg.ambientInt*0.9);scene.add(ambientLight);
hemiLight=new THREE.HemisphereLight(cfg.hemiSky,cfg.hemiGround,cfg.hemiInt);scene.add(hemiLight);
sunLight=new THREE.DirectionalLight(cfg.sunColor,cfg.sunInt);sunLight.position.set(28,42,18);scene.add(sunLight);scene.add(sunLight.target);
if(!LOW_END&&!settings.boostFps){fillLight=new THREE.DirectionalLight(0xffc890,0.45);fillLight.position.set(-18,14,-12);scene.add(fillLight);}
if(cfg.pointLights&&!PERF_MODE){for(var i=0;i<cfg.pointLights.length;i++){var def=cfg.pointLights[i];var pl=new THREE.PointLight(def.color,def.intensity,def.dist,2);pl.position.set(def.x,def.y||3.5,def.z);scene.add(pl);mapPointLights.push(pl);}}}
initLights(MAPS.harbor);

function applySettings(){worldCam.fov=settings.fov;worldCam.updateProjectionMatrix();if(renderer){var baseDPR=Math.min(window.devicePixelRatio||1,isTouch?1.3:1.8);var resMul=Math.max(0.15,settings.resolutionScale/100);renderer.setPixelRatio(Math.min(baseDPR*resMul,PERF_MODE?1.5:2.0));var w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);canvas.style.width=w+"px";canvas.style.height=h+"px";}}
function onResize(){var w=window.innerWidth,h=window.innerHeight;var a=w/h;worldCam.aspect=a;worldCam.updateProjectionMatrix();viewCam.aspect=a;viewCam.updateProjectionMatrix();canvas.style.width=w+"px";canvas.style.height=h+"px";if(renderer)renderer.setSize(w,h,false);applyControls();resizeOverlay();applySettings();}
window.addEventListener("resize",onResize);
window.addEventListener("orientationchange",function(){setTimeout(onResize,250);});

var worldGroup=null,wallMeshes=[],skyDome=null,floorMesh=null;
function clearWorld(){if(worldGroup){scene.remove(worldGroup);worldGroup.traverse(function(o){if(o.geometry)o.geometry.dispose();});}worldGroup=new THREE.Group();scene.add(worldGroup);wallMeshes=[];if(skyDome){scene.remove(skyDome);skyDome=null;}if(floorMesh){scene.remove(floorMesh);floorMesh=null;}}
var brokenGlass={};
function breakGlassAt(x,z){var mx=Math.floor(x),mz=Math.floor(z);var key=mx+","+mz;if(brokenGlass[key])return;if(mx<0||mz<0||mx>=MAP_W||mz>=MAP_H)return;if(MAP[mz][mx]!==10)return;brokenGlass[key]=1;MAP[mz][mx]=0;spawnImpact(mx+0.5,1.2,mz+0.5,0xbfe8ff);playSound("glass");}
function explodeTile(x,z){var mx=Math.floor(x),mz=Math.floor(z);if(mx<0||mz<0||mx>=MAP_W||mz>=MAP_H)return;if(MAP[mz][mx]!==9&&MAP[mz][mx]!==6)return;MAP[mz][mx]=0;var wx=mx+0.5,wz=mz+0.5;explodeGrenade({mesh:{position:new THREE.Vector3(wx,0.5,wz)}});triggerShake(3.2,0.05);}

function buildSandbagBlock(w,h,d){var g=new THREE.Group();var mat=new THREE.MeshLambertMaterial({map:DECOR_TEX.sandbag,color:0xffffff});var bagW=0.55,bagH=0.28,bagD=0.42;var cols=Math.max(1,Math.round(w/bagW));var rows=Math.max(1,Math.round(h/bagH));for(var r=0;r<rows;r++){for(var c=0;c<cols;c++){var bag=new THREE.Mesh(new THREE.BoxGeometry(bagW-0.02,bagH-0.02,bagD-0.02),mat);bag.position.set(-w/2+bagW/2+c*bagW,bagH/2+r*bagH,0);bag.rotation.z=(Math.random()-0.5)*0.06;g.add(bag);}}return g;}
function buildTree(x,z){var g=new THREE.Group();var t=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.22,2.4,6),new THREE.MeshLambertMaterial({color:0x5a3a1e}));t.position.y=1.2;g.add(t);var l=new THREE.Mesh(new THREE.ConeGeometry(1.4,2.2,7),new THREE.MeshLambertMaterial({color:0x3a6a2a}));l.position.y=3.0;g.add(l);g.position.set(x,0,z);return g;}
function buildCar(x,z,color){var g=new THREE.Group();var bM=new THREE.MeshLambertMaterial({color:color||0x2a4a8a});var body=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.6,3.6),bM);body.position.y=0.55;g.add(body);var cab=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.55,1.8),bM);cab.position.set(0,1.05,-0.1);g.add(cab);g.position.set(x,0,z);return g;}
function buildContainer(x,z,color){var g=new THREE.Group();var m=new THREE.MeshLambertMaterial({color:color||0x2a4a8a});var body=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.4,2.4),m);body.position.y=1.2;g.add(body);g.position.set(x,0,z);return g;}

function autoGeneratePlatforms(key){
  if(key==="bunker"){elevateRect(24,46,8,6,3.5,{under:true});addLadder(25,47);addLadder(30,50);elevateRect(26,26,4,4,0,{});}
  else if(key==="harbor"){elevateRect(28,28,8,8,4.5,{under:true});addLadder(28,28);addLadder(35,35);elevateRect(10,4,6,4,3.0,{under:false});}
  else if(key==="neon"){elevateRect(3,3,10,10,6.0,{under:false});elevateRect(47,3,10,10,6.0,{under:false});elevateRect(3,47,10,10,6.0,{under:false});elevateRect(47,47,10,10,6.0,{under:false});elevateRect(25,25,10,10,8.0,{under:false});addLadder(3,3);addLadder(47,3);addLadder(3,47);addLadder(47,47);addLadder(25,25);}
  else if(key==="arctic"){elevateRect(28,28,6,6,6.0,{under:true});addLadder(28,28);addLadder(33,33);elevateRect(9,7,20,14,3.5,{under:false});}
}

function buildWorld(mapKey){
try{
var cfg=MAPS[mapKey];MAP=[];for(var z=0;z<cfg.data.length;z++)MAP.push(cfg.data[z].slice());
MAP_W=MAP[0].length;MAP_H=MAP.length;
scene.background=new THREE.Color(cfg.skyColor);scene.fog=new THREE.Fog(cfg.fogColor,cfg.fogNear,cfg.fogFar);
initLights(cfg);brokenGlass={};
initMultiLevel();
autoGeneratePlatforms(mapKey);
clearWorld();
try{var sg=new THREE.SphereGeometry(200,PERF_MODE?8:16,PERF_MODE?6:10);var sm=new THREE.MeshBasicMaterial({color:cfg.skyColor,side:THREE.BackSide,fog:false,depthWrite:false});skyDome=new THREE.Mesh(sg,sm);skyDome.position.set(MAP_W/2,0,MAP_H/2);worldGroup.add(skyDome);}catch(e){}
try{var fm;if(TEX_FLOOR){var ft=TEX_FLOOR.clone();ft.needsUpdate=true;ft.repeat.set(MAP_W/3,MAP_H/3);fm=new THREE.MeshLambertMaterial({map:ft,color:cfg.floorColor});}else fm=new THREE.MeshLambertMaterial({color:cfg.floorColor});floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(MAP_W,MAP_H),fm);floorMesh.rotation.x=-Math.PI/2;floorMesh.position.set(MAP_W/2,0,MAP_H/2);worldGroup.add(floorMesh);}catch(e){}
var wm={};for(var ti=0;ti<5;ti++){var t=[1,2,3,4,5][ti];try{if(TEXTURES[t]){var tx=TEXTURES[t].clone();tx.needsUpdate=true;wm[t]=new THREE.MeshLambertMaterial({map:tx,color:0xffffff});}else{wm[t]=new THREE.MeshLambertMaterial({color:0x888888});}}catch(e){wm[t]=new THREE.MeshLambertMaterial({color:0x888888});}}
for(var ti=0;ti<5;ti++){var t=[1,2,3,4,5][ti];var h=WALL_HEIGHTS[t]||6;var gs=[];for(var z=0;z<MAP_H;z++)for(var x=0;x<MAP_W;x++){if(MAP[z][x]!==t)continue;var g=new THREE.BoxGeometry(1,h,1);g.translate(x+0.5,h/2,z+0.5);gs.push(g);}if(gs.length===0)continue;try{var mg=BufferGeometryUtils.mergeGeometries(gs,false);var m=new THREE.Mesh(mg,wm[t]);worldGroup.add(m);wallMeshes.push(m);for(var gi=0;gi<gs.length;gi++)gs[gi].dispose();}catch(e){for(var gi=0;gi<gs.length;gi++){var m=new THREE.Mesh(gs[gi],wm[t]);worldGroup.add(m);wallMeshes.push(m);}}}
try{var dCache={};for(var z=1;z<MAP_H-1;z++)for(var x=1;x<MAP_W-1;x++){var t=MAP[z][x];if(t<6||t>15)continue;if(t===6)continue;var h=WALL_HEIGHTS[t]||1.5;var mat;if(t===10){if(!dCache[t])dCache[t]=new THREE.MeshLambertMaterial({map:DECOR_TEX.glass,transparent:true,opacity:0.55,color:0xffffff});mat=dCache[t];}else if(t===8){if(!dCache[t])dCache[t]=new THREE.MeshLambertMaterial({map:DECOR_TEX.door,color:0xffffff});mat=dCache[t];}else{if(!dCache[t]){var col={7:0x88c8ff,9:0xaa3030,11:0xb8a070,12:0x3a6a2a,13:0x2a7a4a,14:0x5a5a6a,15:0x3050a0}[t]||0x888888;dCache[t]=new THREE.MeshLambertMaterial({color:col});}mat=dCache[t];}var bx=new THREE.Mesh(new THREE.BoxGeometry(1,h,1),mat);bx.position.set(x+0.5,h/2,z+0.5);worldGroup.add(bx);wallMeshes.push(bx);}}catch(e){}
// Ящики/бочки
try{var bucket={5:[],6:[],9:[],11:[]};for(var z=1;z<MAP_H-1;z++)for(var x=1;x<MAP_W-1;x++){var t=MAP[z][x];if(!bucket[t])continue;bucket[t].push({x:x,z:z});}
if(bucket[5].length){var mat=new THREE.MeshLambertMaterial({color:0xa07040});var geo=new THREE.BoxGeometry(0.75,0.6,0.75);var gs=[];for(var bi=0;bi<bucket[5].length;bi++){var g=geo.clone();g.translate(bucket[5][bi].x+0.5,0.3,bucket[5][bi].z+0.5);gs.push(g);}try{var mg=BufferGeometryUtils.mergeGeometries(gs,false);worldGroup.add(new THREE.Mesh(mg,mat));for(var gi=0;gi<gs.length;gi++)gs[gi].dispose();}catch(e){for(var gi=0;gi<gs.length;gi++)worldGroup.add(new THREE.Mesh(gs[gi],mat));}}
var bt=[6,9];for(var bi=0;bi<bt.length;bi++){var type=bt[bi];if(!bucket[type].length)continue;var mat=new THREE.MeshLambertMaterial({color:type===9?0xaa2020:0x6a4020});var geo=new THREE.CylinderGeometry(0.32,0.35,0.9,8);var gs=[];for(var k=0;k<bucket[type].length;k++){var g=geo.clone();g.translate(bucket[type][k].x+0.5,0.45,bucket[type][k].z+0.5);gs.push(g);}try{var mg=BufferGeometryUtils.mergeGeometries(gs,false);worldGroup.add(new THREE.Mesh(mg,mat));for(var gi=0;gi<gs.length;gi++)gs[gi].dispose();}catch(e){for(var gi=0;gi<gs.length;gi++)worldGroup.add(new THREE.Mesh(gs[gi],mat));}}
for(var pi=0;pi<bucket[11].length;pi++){var g=buildSandbagBlock(0.95,1.35,0.95);g.position.set(bucket[11][pi].x+0.5,0,bucket[11][pi].z+0.5);worldGroup.add(g);}}catch(e){}
// Платформы
if(MAP_TOP){var platMat=new THREE.MeshLambertMaterial({color:0x8898a8});var ladderMat=new THREE.MeshLambertMaterial({color:0x8a6a3a});var platGeos=[];
for(var z=0;z<MAP_H;z++)for(var x=0;x<MAP_W;x++){var topH=MAP_TOP[z][x];if(topH<=0)continue;var g=new THREE.BoxGeometry(1,0.10,1);g.translate(x+0.5,topH-0.05,z+0.5);platGeos.push(g);if(MAP_LADDER[z][x]){for(var i=0;i<Math.ceil(topH/0.35);i++){var rung=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.05,0.06),ladderMat);rung.position.set(x+0.5,0.2+i*0.35,z+0.5);worldGroup.add(rung);}}}
if(platGeos.length){try{var mg=BufferGeometryUtils.mergeGeometries(platGeos,false);worldGroup.add(new THREE.Mesh(mg,platMat));for(var gi=0;gi<platGeos.length;gi++)platGeos[gi].dispose();}catch(e){for(var gi=0;gi<platGeos.length;gi++)worldGroup.add(new THREE.Mesh(platGeos[gi],platMat));}}}
applySettings();rebuildBotCells();
}catch(err){window.__showErr&&window.__showErr("buildWorld: "+(err.stack||err.message));console.error("buildWorld:",err);}}

var fx={shakeAmount:0,shakeDecay:4.5,shakeRot:0,slowmo:0,timeScale:1,flash:0,flashColor:[255,255,255],bloodVignette:0,fovOffset:0,rain:0,snow:0};
function fxAllowed(){return settings.effects4d&&!settings.boostFps&&!PERF_MODE;}
function triggerShake(a,r){if(!fxAllowed())return;fx.shakeAmount=Math.max(fx.shakeAmount,a);fx.shakeRot=Math.max(fx.shakeRot,r||0);}
function triggerSlowmo(d){if(!fxAllowed())return;fx.slowmo=Math.max(fx.slowmo,d);}
function triggerFlash(r,g,b,s){if(!fxAllowed())return;fx.flash=Math.max(fx.flash,s);fx.flashColor=[r,g,b];}
function triggerBloodVignette(){if(!fxAllowed())return;fx.bloodVignette=1;}
function triggerFovRush(a){if(!fxAllowed())return;fx.fovOffset=Math.max(fx.fovOffset,a);}
function updateEffects(dt){if(fx.slowmo>0){fx.slowmo-=dt;var t=Math.max(0,Math.min(1,fx.slowmo/2));fx.timeScale=0.35+0.65*(1-t);}else{fx.timeScale+=(1-fx.timeScale)*Math.min(1,dt*6);if(fx.timeScale>0.99)fx.timeScale=1;}if(fx.shakeAmount>0)fx.shakeAmount=Math.max(0,fx.shakeAmount-fx.shakeDecay*dt);if(fx.shakeRot>0)fx.shakeRot=Math.max(0,fx.shakeRot-fx.shakeDecay*dt);if(fx.flash>0)fx.flash=Math.max(0,fx.flash-dt*3);if(fx.bloodVignette>0)fx.bloodVignette=Math.max(0,fx.bloodVignette-dt*0.8);if(fx.fovOffset>0)fx.fovOffset=Math.max(0,fx.fovOffset-dt*12);}

var player={x:32,z:32,y:0,vy:0,onGround:true,onLadder:false,yaw:Math.PI,pitch:0,hp:100,maxHp:100,weapon:"rifle_vandal",prevWeapon:"rifle_vandal",ammo:{},reloading:false,reloadTimer:0,reloadDuration:0,shootCooldown:0,bobTimer:0,stepTimer:0,grenades:3,grenadeCooldown:0,ads:false,adsProgress:0,recoilYaw:0,recoilPitch:0,spread:0,moving:false,sprinting:false,sprintProgress:0,reloadAnim:0,crouch:false,crouchProgress:0,lastDamageTime:0,regenSoundTimer:0,awpBoltTimer:0,shotsFired:0,shotsHit:0,inspectTimer:0,inspectDuration:0,inspectActive:false,inspectType:"",knifeAttackType:0,knifeSwingTimer:0,knifeCooldown:0,inspectCooldown:0,lean:0,leanTarget:0,knifeAnimT:0,knifeAnimDur:0.36,equipTimer:0,equipDur:0.4};
var EYE_STAND=1.65,EYE_CROUCH=1.0;

// ================== 25 ОРУЖИЙ ==================
var WEAPON_DEFS={
// --- ПИСТОЛЕТЫ (5) ---
pistol_p250:{name:"P250 Sidearm",shortName:"P250",icon:"🔫",category:"pistol",damage:28,headMul:4.0,range:24,falloff:0.94,cooldown:0.16,mag:13,reloadTime:2.0,auto:false,baseSpread:0.0015,maxSpread:0.018,spreadPerShot:0.004,spreadRecover:0.10,recoilPitch:0.008,recoilYaw:0.003,recoilRecover:7,adsFov:55,adsSpreadMul:0.15,adsRecoilMul:0.3,sound:"shoot_pistol",moveMul:1.0,shake:0.55,sight:"notch",inspectStyle:"pistol",equipAnim:"pistol_draw",noiseRadius:35,model:{base:"pistol",mat:"metalDark",grip:"polymer"}},
pistol_deagle:{name:"Hand Cannon",shortName:"DEAGLE",icon:"🎯",category:"pistol",damage:58,headMul:4.5,range:30,falloff:0.97,cooldown:0.35,mag:7,reloadTime:2.6,auto:false,baseSpread:0.0025,maxSpread:0.035,spreadPerShot:0.010,spreadRecover:0.15,recoilPitch:0.018,recoilYaw:0.008,recoilRecover:5,adsFov:50,adsSpreadMul:0.15,adsRecoilMul:0.3,sound:"shoot_deagle",moveMul:0.95,shake:1.1,sight:"notch",inspectStyle:"pistol",equipAnim:"pistol_draw",noiseRadius:60,model:{base:"pistol",long:1,big:1,mat:"metalChrome",grip:"polymer"}},
pistol_fiveseven:{name:"Five-SeveN",shortName:"5-7",icon:"🔫",category:"pistol",damage:22,headMul:4.0,range:26,falloff:0.95,cooldown:0.14,mag:20,reloadTime:2.2,auto:false,baseSpread:0.0018,maxSpread:0.02,spreadPerShot:0.005,spreadRecover:0.10,recoilPitch:0.007,recoilYaw:0.003,recoilRecover:7,adsFov:55,adsSpreadMul:0.15,adsRecoilMul:0.3,sound:"shoot_pistol_silent",moveMul:1.0,shake:0.5,sight:"notch",inspectStyle:"pistol",equipAnim:"pistol_draw",noiseRadius:30,armorPen:0.2,model:{base:"pistol",slim:1,mat:"metalMid",grip:"polymer"}},
pistol_r301:{name:"R-301 Ruger",shortName:"R-301",icon:"🎯",category:"pistol",damage:32,headMul:4.0,range:28,falloff:0.96,cooldown:0.22,mag:10,reloadTime:2.4,auto:false,baseSpread:0.0010,maxSpread:0.015,spreadPerShot:0.005,spreadRecover:0.10,recoilPitch:0.011,recoilYaw:0.004,recoilRecover:6.5,adsFov:52,adsSpreadMul:0.12,adsRecoilMul:0.28,sound:"shoot_pistol",moveMul:0.98,shake:0.7,sight:"notch",inspectStyle:"pistol",equipAnim:"pistol_draw",noiseRadius:45,model:{base:"pistol",long:1,mat:"metalDark",grip:"polymer",accent:"red"}},
pistol_auto9:{name:"Auto-9",shortName:"AUTO-9",icon:"🔫",category:"pistol",damage:18,headMul:3.5,range:16,falloff:0.88,cooldown:0.075,mag:18,reloadTime:2.1,auto:true,baseSpread:0.003,maxSpread:0.045,spreadPerShot:0.005,spreadRecover:0.09,recoilPitch:0.005,recoilYaw:0.004,recoilRecover:8,adsFov:58,adsSpreadMul:0.2,adsRecoilMul:0.35,sound:"shoot_smg",moveMul:1.02,shake:0.4,sight:"notch",inspectStyle:"pistol",equipAnim:"pistol_draw",noiseRadius:50,model:{base:"pistol",auto:1,mat:"metalDark",grip:"polymer",magLong:1}},
// --- ПП (6) ---
smg_ripper:{name:"Ripper",shortName:"RIPPER",icon:"🔫",category:"smg",damage:19,headMul:4.0,range:14,falloff:0.85,cooldown:0.055,mag:35,reloadTime:2.2,auto:true,baseSpread:0.005,maxSpread:0.07,spreadPerShot:0.007,spreadRecover:0.09,recoilPitch:0.003,recoilYaw:0.003,recoilRecover:9,adsFov:60,adsSpreadMul:0.22,adsRecoilMul:0.4,sound:"shoot_smg_fast",moveMul:1.08,shake:0.3,sight:"reflex",inspectStyle:"smg",equipAnim:"smg_draw",noiseRadius:45,model:{base:"smg",compact:1,mat:"metalDark",grip:"polymer"}},
smg_spectre:{name:"Spectre",shortName:"SPECTRE",icon:"🔫",category:"smg",damage:25,headMul:4.0,range:20,falloff:0.91,cooldown:0.080,mag:30,reloadTime:2.3,auto:true,baseSpread:0.002,maxSpread:0.035,spreadPerShot:0.005,spreadRecover:0.09,recoilPitch:0.005,recoilYaw:0.004,recoilRecover:8,adsFov:58,adsSpreadMul:0.15,adsRecoilMul:0.3,sound:"shoot_smg_silent",moveMul:1.02,shake:0.4,sight:"notch",inspectStyle:"smg",equipAnim:"smg_draw",noiseRadius:20,model:{base:"smg",silenced:1,mat:"metalMid",grip:"polymer"}},
smg_vector:{name:"Vector",shortName:"VECTOR",icon:"🔫",category:"smg",damage:17,headMul:4.0,range:12,falloff:0.82,cooldown:0.045,mag:25,reloadTime:1.9,auto:true,baseSpread:0.002,maxSpread:0.06,spreadPerShot:0.005,spreadRecover:0.13,recoilPitch:0.002,recoilYaw:0.002,recoilRecover:11,adsFov:60,adsSpreadMul:0.2,adsRecoilMul:0.4,sound:"shoot_smg_fast",moveMul:1.10,shake:0.28,sight:"reflex",inspectStyle:"smg",equipAnim:"smg_draw",noiseRadius:40,model:{base:"smg",futuristic:1,mat:"polymerLight",grip:"darkPoly"}},
smg_mp5sd:{name:"MP5-SD",shortName:"MP5-SD",icon:"🔫",category:"smg",damage:27,headMul:4.0,range:22,falloff:0.92,cooldown:0.085,mag:30,reloadTime:2.4,auto:true,baseSpread:0.0018,maxSpread:0.03,spreadPerShot:0.005,spreadRecover:0.09,recoilPitch:0.005,recoilYaw:0.004,recoilRecover:7.5,adsFov:58,adsSpreadMul:0.15,adsRecoilMul:0.3,sound:"shoot_smg_silent",moveMul:1.0,shake:0.42,sight:"notch",inspectStyle:"smg",equipAnim:"smg_draw",noiseRadius:18,model:{base:"smg",silenced:1,mat:"metalDark",grip:"polymer",classic:1}},
smg_p90:{name:"P90",shortName:"P90",icon:"🔫",category:"smg",damage:20,headMul:4.0,range:18,falloff:0.89,cooldown:0.066,mag:50,reloadTime:3.3,auto:true,baseSpread:0.004,maxSpread:0.045,spreadPerShot:0.005,spreadRecover:0.08,recoilPitch:0.004,recoilYaw:0.003,recoilRecover:8.5,adsFov:60,adsSpreadMul:0.2,adsRecoilMul:0.4,sound:"shoot_smg",moveMul:1.05,shake:0.35,sight:"reflex",inspectStyle:"smg",equipAnim:"smg_draw",noiseRadius:48,model:{base:"smg",bullpup:1,magDrum:1,mat:"metalDark",grip:"polymer"}},
smg_mac10:{name:"MAC-10",shortName:"MAC-10",icon:"🔫",category:"smg",damage:21,headMul:4.0,range:10,falloff:0.80,cooldown:0.050,mag:30,reloadTime:2.0,auto:true,baseSpread:0.007,maxSpread:0.09,spreadPerShot:0.010,spreadRecover:0.07,recoilPitch:0.006,recoilYaw:0.005,recoilRecover:7,adsFov:62,adsSpreadMul:0.25,adsRecoilMul:0.5,sound:"shoot_smg_fast",moveMul:1.12,shake:0.4,sight:"notch",inspectStyle:"smg",equipAnim:"smg_draw",noiseRadius:55,model:{base:"smg",compact:1,mat:"metalDark",grip:"polymer",boxy:1}},
// --- ВИНТОВКИ (6) ---
rifle_vandal:{name:"Vandal",shortName:"VANDAL",icon:"🎯",category:"rifle",damage:39,headMul:4.5,range:34,falloff:0.99,cooldown:0.100,mag:25,reloadTime:2.5,auto:true,baseSpread:0.0012,maxSpread:0.055,spreadPerShot:0.008,spreadRecover:0.08,recoilPitch:0.016,recoilYaw:0.006,recoilRecover:5.5,adsFov:50,adsSpreadMul:0.15,adsRecoilMul:0.3,sound:"shoot_rifle",moveMul:0.94,shake:1.0,sight:"notch",inspectStyle:"rifle",equipAnim:"rifle_draw",noiseRadius:65,model:{base:"rifle",ak:1,mat:"metalMid",grip:"woodAK",stock:"woodStock",mag:"magAK"}},
rifle_phantom:{name:"Phantom",shortName:"PHANTOM",icon:"🎯",category:"rifle",damage:33,headMul:4.0,range:36,falloff:0.99,cooldown:0.092,mag:30,reloadTime:2.6,auto:true,baseSpread:0.0008,maxSpread:0.042,spreadPerShot:0.006,spreadRecover:0.09,recoilPitch:0.011,recoilYaw:0.005,recoilRecover:6.5,adsFov:52,adsSpreadMul:0.12,adsRecoilMul:0.25,sound:"shoot_rifle_m4",moveMul:0.96,shake:0.7,sight:"aperture",inspectStyle:"rifle",equipAnim:"rifle_draw",noiseRadius:32,model:{base:"rifle",m4:1,silenced:1,mat:"darkPoly",grip:"darkPoly",mag:"magDark"}},
rifle_aug:{name:"AUG Bullpup",shortName:"AUG",icon:"🎯",category:"rifle",damage:30,headMul:4.0,range:40,falloff:0.99,cooldown:0.090,mag:30,reloadTime:3.0,auto:true,baseSpread:0.0007,maxSpread:0.038,spreadPerShot:0.006,spreadRecover:0.09,recoilPitch:0.010,recoilYaw:0.005,recoilRecover:7,adsFov:35,adsSpreadMul:0.05,adsRecoilMul:0.2,sound:"shoot_rifle_m4",moveMul:0.92,shake:0.8,sight:"scope2x",inspectStyle:"rifle",equipAnim:"rifle_draw",noiseRadius:55,model:{base:"rifle",bullpup:1,scope2:1,mat:"olive",grip:"darkPoly",mag:"magDark"}},
rifle_sg553:{name:"SG-553",shortName:"SG-553",icon:"🎯",category:"rifle",damage:34,headMul:4.5,range:38,falloff:0.99,cooldown:0.095,mag:30,reloadTime:2.8,auto:true,baseSpread:0.0010,maxSpread:0.045,spreadPerShot:0.007,spreadRecover:0.08,recoilPitch:0.012,recoilYaw:0.006,recoilRecover:6,adsFov:42,adsSpreadMul:0.10,adsRecoilMul:0.25,sound:"shoot_rifle",moveMul:0.93,shake:0.9,sight:"scope2x",inspectStyle:"rifle",equipAnim:"rifle_draw",noiseRadius:58,model:{base:"rifle",sg:1,scope2:1,mat:"metalDark",grip:"darkPoly",mag:"magDark"}},
rifle_m16:{name:"M16A4",shortName:"M16A4",icon:"🎯",category:"rifle",damage:36,headMul:4.5,range:35,falloff:0.99,cooldown:0.085,mag:30,reloadTime:2.4,auto:false,burst:3,baseSpread:0.0006,maxSpread:0.030,spreadPerShot:0.004,spreadRecover:0.10,recoilPitch:0.009,recoilYaw:0.004,recoilRecover:7,adsFov:50,adsSpreadMul:0.10,adsRecoilMul:0.25,sound:"shoot_rifle_m4",moveMul:0.95,shake:0.75,sight:"aperture",inspectStyle:"rifle",equipAnim:"rifle_draw",noiseRadius:60,model:{base:"rifle",m4:1,carryHandle:1,mat:"metalDark",grip:"darkPoly",mag:"magDark"}},
rifle_g36:{name:"G36C",shortName:"G36C",icon:"🎯",category:"rifle",damage:31,headMul:4.0,range:32,falloff:0.99,cooldown:0.088,mag:30,reloadTime:2.5,auto:true,baseSpread:0.0008,maxSpread:0.035,spreadPerShot:0.005,spreadRecover:0.10,recoilPitch:0.008,recoilYaw:0.003,recoilRecover:8,adsFov:52,adsSpreadMul:0.12,adsRecoilMul:0.22,sound:"shoot_rifle_m4",moveMul:0.97,shake:0.65,sight:"reflex",inspectStyle:"rifle",equipAnim:"rifle_draw",noiseRadius:52,model:{base:"rifle",g36:1,mat:"darkPoly",grip:"darkPoly",mag:"magDark"}},
// --- ДРОБОВИКИ (3) ---
shotgun_bulldog:{name:"Bulldog",shortName:"BULLDOG",icon:"💥",category:"shotgun",damage:24,pellets:8,headMul:2.0,range:8,falloff:0.55,cooldown:0.75,mag:7,reloadTime:3.0,auto:false,baseSpread:0.12,maxSpread:0.14,spreadPerShot:0.02,spreadRecover:0.4,recoilPitch:0.030,recoilYaw:0.012,recoilRecover:3,adsFov:60,adsSpreadMul:0.6,adsRecoilMul:0.6,sound:"shoot_shotgun",moveMul:0.92,shake:1.6,sight:"notch",inspectStyle:"rifle",equipAnim:"rifle_draw",noiseRadius:80,model:{base:"shotgun",pump:1,mat:"metalDark",grip:"woodAK",stock:"woodStock"}},
shotgun_judge:{name:"Judge",shortName:"JUDGE",icon:"💥",category:"shotgun",damage:35,pellets:6,headMul:2.0,range:6,falloff:0.5,cooldown:0.95,mag:6,reloadTime:3.5,auto:false,baseSpread:0.14,maxSpread:0.16,spreadPerShot:0.02,spreadRecover:0.4,recoilPitch:0.040,recoilYaw:0.018,recoilRecover:2.5,adsFov:60,adsSpreadMul:0.7,adsRecoilMul:0.7,sound:"shoot_shotgun",moveMul:0.90,shake:2.0,sight:"notch",inspectStyle:"rifle",equipAnim:"rifle_draw",noiseRadius:90,model:{base:"shotgun",revolver:1,mat:"metalDark",grip:"polymer"}},
shotgun_auto:{name:"Auto-Shotgun",shortName:"AUTO-SG",icon:"💥",category:"shotgun",damage:18,pellets:6,headMul:2.0,range:10,falloff:0.55,cooldown:0.30,mag:10,reloadTime:3.2,auto:true,baseSpread:0.10,maxSpread:0.13,spreadPerShot:0.02,spreadRecover:0.4,recoilPitch:0.022,recoilYaw:0.010,recoilRecover:3.5,adsFov:60,adsSpreadMul:0.55,adsRecoilMul:0.55,sound:"shoot_shotgun",moveMul:0.94,shake:1.2,sight:"reflex",inspectStyle:"rifle",equipAnim:"rifle_draw",noiseRadius:75,model:{base:"shotgun",auto:1,magBox:1,mat:"metalMid",grip:"polymer",accent:"red"}},
// --- СНАЙПЕРСКИЕ (2) ---
sniper_longshot:{name:"Longshot",shortName:"LONGSHOT",icon:"🎯",category:"sniper",damage:135,headMul:2.0,range:55,falloff:0.99,cooldown:1.55,mag:5,reloadTime:4.2,auto:false,baseSpread:0.0004,maxSpread:0.018,spreadPerShot:0.015,spreadRecover:0.05,recoilPitch:0.040,recoilYaw:0.012,recoilRecover:3.5,adsFov:18,adsSpreadMul:0.02,adsRecoilMul:0.15,sound:"shoot_awp",moveMul:0.78,shake:2.5,sight:"scope",inspectStyle:"sniper",equipAnim:"sniper_draw",noiseRadius:100,model:{base:"sniper",bolt:1,scopeBig:1,mat:"olive",grip:"olive",stock:"olive"}},
sniper_scout:{name:"Scout",shortName:"SCOUT",icon:"🔭",category:"sniper",damage:75,headMul:2.0,range:45,falloff:0.98,cooldown:0.9,mag:10,reloadTime:3.0,auto:false,baseSpread:0.0005,maxSpread:0.022,spreadPerShot:0.012,spreadRecover:0.06,recoilPitch:0.025,recoilYaw:0.008,recoilRecover:4.5,adsFov:30,adsSpreadMul:0.05,adsRecoilMul:0.2,sound:"shoot_rifle",moveMul:0.95,shake:1.2,sight:"scope2x",inspectStyle:"sniper",equipAnim:"sniper_draw",noiseRadius:85,model:{base:"sniper",bolt:1,scope2:1,mat:"metalDark",grip:"darkPoly",stock:"darkPoly"}},
// --- НОЖИ (3) ---
knife_tanto:{name:"Tanto",shortName:"TANTO",icon:"🔪",category:"knife",damage:42,headMul:1.0,range:1.9,falloff:1.0,cooldown:0.42,mag:0,reloadTime:0,auto:false,baseSpread:0,maxSpread:0,spreadPerShot:0,spreadRecover:0,recoilPitch:0,recoilYaw:0,recoilRecover:10,adsFov:60,adsSpreadMul:1,adsRecoilMul:1,sound:"knife_swing",moveMul:1.16,shake:0.5,sight:"none",inspectStyle:"knife",equipAnim:"knife_draw",meleeRange:1.9,meleeDamage:42,meleeHeavyDamage:68,meleeHeavyCooldown:1.05,noiseRadius:9,model:{base:"knife",straight:1,mat:"metalChrome",grip:"darkPoly"}},
knife_karambit:{name:"Karambit",shortName:"KARAMBIT",icon:"🐾",category:"knife",damage:38,headMul:1.0,range:1.75,falloff:1.0,cooldown:0.32,mag:0,reloadTime:0,auto:false,baseSpread:0,maxSpread:0,spreadPerShot:0,spreadRecover:0,recoilPitch:0,recoilYaw:0,recoilRecover:10,adsFov:60,adsSpreadMul:1,adsRecoilMul:1,sound:"knife_swing",moveMul:1.24,shake:0.55,sight:"none",inspectStyle:"butterfly",equipAnim:"butterfly_draw",meleeRange:1.75,meleeDamage:38,meleeHeavyDamage:64,meleeHeavyCooldown:0.85,noiseRadius:8,model:{base:"knife",curved:1,mat:"metalChrome",grip:"darkPoly"}},
knife_cleaver:{name:"Cleaver",shortName:"CLEAVER",icon:"⚔",category:"knife",damage:52,headMul:1.0,range:2.1,falloff:1.0,cooldown:0.55,mag:0,reloadTime:0,auto:false,baseSpread:0,maxSpread:0,spreadPerShot:0,spreadRecover:0,recoilPitch:0,recoilYaw:0,recoilRecover:10,adsFov:60,adsSpreadMul:1,adsRecoilMul:1,sound:"knife_swing",moveMul:1.02,shake:0.75,sight:"none",inspectStyle:"bowie",equipAnim:"bowie_draw",meleeRange:2.1,meleeDamage:52,meleeHeavyDamage:90,meleeHeavyCooldown:1.4,noiseRadius:13,model:{base:"knife",cleaver:1,mat:"metalChrome",grip:"woodAK"}}};

var WEAPON_ORDER=["pistol_p250","pistol_deagle","pistol_fiveseven","pistol_r301","pistol_auto9","smg_ripper","smg_spectre","smg_vector","smg_mp5sd","smg_p90","smg_mac10","rifle_vandal","rifle_phantom","rifle_aug","rifle_sg553","rifle_m16","rifle_g36","shotgun_bulldog","shotgun_judge","shotgun_auto","sniper_longshot","sniper_scout","knife_tanto","knife_karambit","knife_cleaver"];
var WEAPON_GROUPS=[
{name:"🔫 ПИСТОЛЕТЫ (слот 1)",keys:["pistol_p250","pistol_deagle","pistol_fiveseven","pistol_r301","pistol_auto9"]},
{name:"💥 ПП (слот 2)",keys:["smg_ripper","smg_spectre","smg_vector","smg_mp5sd","smg_p90","smg_mac10"]},
{name:"🎯 ВИНТОВКИ (слот 2)",keys:["rifle_vandal","rifle_phantom","rifle_aug","rifle_sg553","rifle_m16","rifle_g36"]},
{name:"💥 ДРОБОВИКИ (слот 2)",keys:["shotgun_bulldog","shotgun_judge","shotgun_auto"]},
{name:"🔭 СНАЙПЕРСКИЕ (слот 2)",keys:["sniper_longshot","sniper_scout"]},
{name:"🔪 ХОЛОДНОЕ (слот 3)",keys:["knife_tanto","knife_karambit","knife_cleaver"]}];
for(var wi=0;wi<WEAPON_ORDER.length;wi++){var wk=WEAPON_ORDER[wi];if(WEAPON_DEFS[wk].mag>0)player.ammo[wk]=WEAPON_DEFS[wk].mag;}

var weaponGroup=new THREE.Group();var WEAPON_SCALE=0.42;
var WEAPON_BASE_X=0.16,WEAPON_BASE_Y=-0.14,WEAPON_BASE_Z=-0.45;
weaponGroup.scale.set(WEAPON_SCALE,WEAPON_SCALE,WEAPON_SCALE);
weaponGroup.position.set(WEAPON_BASE_X,WEAPON_BASE_Y,WEAPON_BASE_Z);
viewCam.add(weaponGroup);
var DS=THREE.DoubleSide;
var MAT={metalDark:new THREE.MeshStandardMaterial({map:WEAPON_TEX.metalDark,color:0xffffff,metalness:0.60,roughness:0.42,side:DS}),metalMid:new THREE.MeshStandardMaterial({map:WEAPON_TEX.metalMid,color:0xffffff,metalness:0.55,roughness:0.45,side:DS}),metalChrome:new THREE.MeshStandardMaterial({map:WEAPON_TEX.metalChrome,color:0xffffff,metalness:0.75,roughness:0.22,side:DS}),scope:new THREE.MeshStandardMaterial({map:WEAPON_TEX.metalDark,color:0x1a1a1a,metalness:0.55,roughness:0.30,side:DS}),woodAK:new THREE.MeshStandardMaterial({map:WEAPON_TEX.wood,color:0xffffff,metalness:0.05,roughness:0.72,side:DS}),woodStock:new THREE.MeshStandardMaterial({map:WEAPON_TEX.wood,color:0xd4a05a,metalness:0.05,roughness:0.68,side:DS}),magAK:new THREE.MeshStandardMaterial({map:WEAPON_TEX.magazine,color:0xffffff,metalness:0.35,roughness:0.55,side:DS}),magDark:new THREE.MeshStandardMaterial({map:WEAPON_TEX.metalDark,color:0xeeeeee,metalness:0.50,roughness:0.50,side:DS}),polymer:new THREE.MeshStandardMaterial({map:WEAPON_TEX.polymer,color:0xffffff,metalness:0.10,roughness:0.82,side:DS}),polymerLight:new THREE.MeshStandardMaterial({map:WEAPON_TEX.polymerLight,color:0xd0d0d0,metalness:0.15,roughness:0.72,side:DS}),blade:new THREE.MeshStandardMaterial({map:WEAPON_TEX.blade,color:0xffffff,metalness:0.85,roughness:0.12,side:DS}),olive:new THREE.MeshStandardMaterial({color:0x5a6a3a,metalness:0.10,roughness:0.85,side:DS}),red:new THREE.MeshStandardMaterial({color:0xcc2222,metalness:0.20,roughness:0.60,side:DS}),darkPoly:new THREE.MeshStandardMaterial({color:0x181818,metalness:0.10,roughness:0.88,side:DS})};
var GEO_CACHE={};
function getBoxGeo(w,h,d){var k="b_"+w.toFixed(3)+"_"+h.toFixed(3)+"_"+d.toFixed(3);if(!GEO_CACHE[k])GEO_CACHE[k]=new THREE.BoxGeometry(w,h,d);return GEO_CACHE[k];}
function getCylGeo(rt,rb,h,s){var k="c_"+rt.toFixed(3)+"_"+rb.toFixed(3)+"_"+h.toFixed(3)+"_"+s;if(!GEO_CACHE[k])GEO_CACHE[k]=new THREE.CylinderGeometry(rt,rb,h,s);return GEO_CACHE[k];}
function box(w,h,d,m,x,y,z){var mm=new THREE.Mesh(getBoxGeo(w,h,d),m);mm.position.set(x,y,z);return mm;}
function cyl(rt,rb,h,s,m,x,y,z,ax){var mm=new THREE.Mesh(getCylGeo(rt,rb,h,s),m);mm.position.set(x,y,z);if(ax==="x")mm.rotation.z=Math.PI/2;else if(ax==="z")mm.rotation.x=Math.PI/2;return mm;}

// Процедурная генерация моделей оружия
function buildWeaponModel(key){
  var d=WEAPON_DEFS[key].model||{};
  var g=new THREE.Group();
  var M=MAT[d.mat]||MAT.metalDark, G=MAT[d.grip]||MAT.polymer;
  var base=d.base||"rifle";
  if(base==="pistol"){
    var L=d.long?0.25:0.21, H=d.big?0.045:0.036;
    g.add(box(0.045,H,L,M,0,0,-L/2));
    g.add(box(0.043,0.032,L-0.02,G,0,-0.032,-L/2+0.01));
    g.add(cyl(0.022,0.022,d.long?0.40:0.36,20,M,0,0,-L/2-0.19,"z"));
    var grip=box(0.040,0.125,0.055,G,0,-0.078,0.020);grip.rotation.x=-0.20;g.add(grip);
    g.add(box(0.030,0.006,0.016,M,0,0.022,-0.005));
    if(d.auto)g.add(cyl(0.008,0.008,0.06,10,M,-0.04,0.012,-0.05,"x"));
    g.userData.sight=new THREE.Vector3(0,d.big?0.032:0.022,-0.005);
    g.userData.muzzleOffset=new THREE.Vector3(0,0,-L/2-0.40);
  } else if(base==="smg"){
    var len=d.silenced?0.38:0.30;
    g.add(box(0.06,0.075,0.30,M,0,0.01,-0.13));
    if(d.classic){g.add(cyl(0.028,0.028,0.24,20,M,0,0.005,-0.16,"z"));}
    g.add(cyl(0.011,0.011,0.20,12,M,0,0.012,-0.36,"z"));
    if(d.silenced)g.add(cyl(0.024,0.024,0.18,20,M,0,0.012,-0.55,"z"));
    var grip=box(0.04,0.14,0.05,G,0,-0.078,0.02);grip.rotation.x=-0.15;g.add(grip);
    var rg=box(0.034,0.10,0.045,G,-0.02,-0.06,-0.05);rg.rotation.x=0.15;g.add(rg);
    g.add(box(0.05,0.008,0.28,M,0,0.055,-0.13));
    if(d.magDrum)g.add(cyl(0.03,0.03,0.10,10,M,0,-0.07,-0.15,"x"));
    else{var mg=box(0.04,0.18,0.05,M,0,-0.09,-0.10);mg.rotation.x=-0.08;g.add(mg);}
    g.userData.sight=new THREE.Vector3(0,0.07,0.03);
    g.userData.muzzleOffset=new THREE.Vector3(0,0.012,d.silenced?-0.70:-0.46);
  } else if(base==="rifle"){
    var magM=MAT[d.mag]||MAT.magDark;
    var stockM=MAT[d.stock]||MAT.darkPoly;
    g.add(box(0.055,0.06,0.32,M,0,0.005,-0.16));
    g.add(cyl(0.012,0.012,0.42,14,M,0,0.014,-0.46,"z"));
    if(d.silenced)g.add(cyl(0.022,0.022,0.22,16,M,0,0.014,-0.72,"z"));
    var stk=box(0.05,0.10,0.24,stockM,0,0.005,0.135);stk.rotation.x=0.06;g.add(stk);
    var grip=box(0.044,0.14,0.058,G,0,-0.080,0.020);grip.rotation.x=-0.20;g.add(grip);
    var mg=box(0.048,0.16,0.06,magM,0,-0.085,-0.10);mg.rotation.x=-0.12;g.add(mg);
    if(d.scope2){g.add(cyl(0.018,0.018,0.20,16,MAT.scope,0,0.06,-0.15,"z"));}
    if(d.carryHandle){var ch=box(0.026,0.024,0.11,M,0,0.045,0.020);g.add(ch);}
    g.userData.sight=new THREE.Vector3(0,0.058,0.010);
    g.userData.muzzleOffset=new THREE.Vector3(0,0.014,d.silenced?-0.90:-0.72);
  } else if(base==="shotgun"){
    g.add(box(0.055,0.06,0.28,M,0,0.010,-0.18));
    g.add(cyl(0.020,0.020,0.34,14,M,0,0.010,-0.40,"z"));
    if(d.pump){g.add(box(0.05,0.045,0.14,G,0,-0.020,-0.28));}
    var stk=box(0.05,0.10,0.22,MAT[d.stock]||MAT.woodStock,0,0.005,0.135);stk.rotation.x=0.06;g.add(stk);
    var grip=box(0.044,0.14,0.058,G,0,-0.080,0.020);grip.rotation.x=-0.20;g.add(grip);
    if(d.magBox){var mg=box(0.055,0.14,0.08,M,0,-0.080,-0.15);mg.rotation.x=-0.15;g.add(mg);}
    g.userData.sight=new THREE.Vector3(0,0.045,-0.05);
    g.userData.muzzleOffset=new THREE.Vector3(0,0.010,-0.58);
  } else if(base==="sniper"){
    g.add(cyl(0.014,0.014,0.68,14,M,0,0,-0.60,"z"));
    g.add(box(0.055,0.055,0.36,M,0,0,-0.22));
    g.add(box(0.045,0.08,0.045,MAT.magDark,0,-0.078,-0.10));
    g.add(box(0.05,0.032,0.30,MAT[d.stock]||MAT.olive,0,0.048,0.175));
    var grip=box(0.042,0.105,0.055,G,0,-0.078,0.020);grip.rotation.x=-0.22;g.add(grip);
    if(d.scopeBig){g.add(cyl(0.024,0.024,0.36,20,MAT.scope,0,0.066,-0.28,"z"));g.add(cyl(0.032,0.028,0.032,20,MAT.scope,0,0.066,-0.470,"z"));}
    else if(d.scope2){g.add(cyl(0.018,0.018,0.24,16,MAT.scope,0,0.06,-0.20,"z"));}
    g.userData.sight=new THREE.Vector3(0,d.scopeBig?0.066:0.058,-0.10);
    g.userData.muzzleOffset=new THREE.Vector3(0,0,-1.00);
  } else if(base==="knife"){
    if(d.cleaver){
      var shape=new THREE.Shape();
      shape.moveTo(0,0.040);shape.lineTo(0.28,0.055);shape.lineTo(0.30,0.020);shape.lineTo(0.28,-0.100);shape.lineTo(0,-0.090);shape.lineTo(0,0.040);
      var bg=new THREE.ExtrudeGeometry(shape,{depth:0.016,bevelEnabled:true,bevelSize:0.0015,bevelThickness:0.001,bevelSegments:1});bg.rotateY(Math.PI/2);
      g.add(new THREE.Mesh(bg,MAT.blade));
      var hd=new THREE.Mesh(new THREE.BoxGeometry(0.034,0.032,0.16),G);hd.position.set(0,-0.020,0.080);g.add(hd);
    } else if(d.curved){
      var shape2=new THREE.Shape();
      shape2.moveTo(0.000,0.000);
      shape2.bezierCurveTo(0.02,0.09,0.10,0.13,0.17,0.10);
      shape2.bezierCurveTo(0.21,0.07,0.21,0.02,0.18,-0.02);
      shape2.bezierCurveTo(0.15,-0.05,0.10,-0.06,0.07,-0.04);
      shape2.bezierCurveTo(0.04,-0.02,0.03,0.01,0.05,0.03);
      shape2.bezierCurveTo(0.07,0.05,0.10,0.06,0.13,0.04);
      var bg2=new THREE.ExtrudeGeometry(shape2,{depth:0.008,bevelEnabled:true,bevelSize:0.001,bevelThickness:0.001,bevelSegments:1});bg2.rotateY(Math.PI/2);
      g.add(new THREE.Mesh(bg2,MAT.blade));
      g.add(cyl(0.010,0.010,0.09,10,MAT.metalChrome,-0.02,0.000,0.100,"x"));
    } else {
      var shape3=new THREE.Shape();
      shape3.moveTo(0,0.020);shape3.lineTo(0.24,-0.030);shape3.lineTo(0.26,-0.040);shape3.lineTo(0.24,-0.052);shape3.lineTo(0,-0.012);shape3.lineTo(0,0.020);
      var bg3=new THREE.ExtrudeGeometry(shape3,{depth:0.010,bevelEnabled:true,bevelSize:0.001,bevelThickness:0.0008,bevelSegments:1});bg3.rotateY(Math.PI/2);
      g.add(new THREE.Mesh(bg3,MAT.blade));
      var hd3=new THREE.Mesh(new THREE.BoxGeometry(0.030,0.032,0.14),G);hd3.position.set(0,-0.016,0.084);g.add(hd3);
    }
    g.userData.sight=new THREE.Vector3(0,0,0);
    g.userData.muzzleOffset=new THREE.Vector3(0,-0.016,-0.38);
  }
  return g;
}

var viewModels={};
for(var vi=0;vi<WEAPON_ORDER.length;vi++){var vk=WEAPON_ORDER[vi];viewModels[vk]=buildWeaponModel(vk);viewModels[vk].visible=false;weaponGroup.add(viewModels[vk]);}
function setViewWeapon(k){for(var i=0;i<WEAPON_ORDER.length;i++){var kk=WEAPON_ORDER[i];if(viewModels[kk])viewModels[kk].visible=(kk===k);}}
setViewWeapon(player.weapon);weaponGroup.visible=true;

var HAND_MAT=new THREE.MeshStandardMaterial({map:GLOVE_TEX,color:0xffffff,metalness:0.05,roughness:0.85,side:DS});
var SLEEVE_MAT=new THREE.MeshStandardMaterial({map:SLEEVE_TEX,color:0xffffff,metalness:0.05,roughness:0.92,side:DS});
function buildHandGrip(){var g=new THREE.Group();g.add(new THREE.Mesh(new THREE.BoxGeometry(0.085,0.10,0.11),HAND_MAT));var th=new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.014,0.06,6),HAND_MAT);th.rotation.z=Math.PI/2.4;th.position.set(0.045,0.02,-0.03);g.add(th);var sleeve=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.058,0.14,8),SLEEVE_MAT);sleeve.rotation.x=Math.PI/2;sleeve.position.set(0,-0.02,0.10);g.add(sleeve);return g;}
function buildHandForegrip(){var g=new THREE.Group();g.add(new THREE.Mesh(new THREE.BoxGeometry(0.09,0.06,0.10),HAND_MAT));var sleeve=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.058,0.14,8),SLEEVE_MAT);sleeve.rotation.x=Math.PI/2;sleeve.rotation.z=-0.25;sleeve.position.set(-0.06,-0.02,0.10);g.add(sleeve);return g;}
(function(){for(var kk in viewModels){var kind=WEAPON_DEFS[kk].category;var rh=buildHandGrip(),lh=buildHandForegrip();
if(kind==="pistol"){rh.position.set(0,-0.055,0.005);rh.scale.setScalar(0.95);viewModels[kk].add(rh);lh.position.set(0.05,-0.03,-0.14);lh.rotation.y=0.8;lh.scale.setScalar(0.9);viewModels[kk].add(lh);}
else if(kind==="smg"){rh.position.set(0,-0.075,0.005);viewModels[kk].add(rh);lh.position.set(-0.02,-0.04,-0.13);lh.rotation.y=-0.15;viewModels[kk].add(lh);}
else if(kind==="rifle"||kind==="shotgun"){rh.position.set(0,-0.075,0.005);viewModels[kk].add(rh);lh.position.set(-0.02,-0.02,-0.30);lh.rotation.y=-0.15;viewModels[kk].add(lh);}
else if(kind==="sniper"){rh.position.set(0,-0.065,0.005);viewModels[kk].add(rh);lh.position.set(-0.02,-0.06,-0.18);lh.rotation.y=-0.20;viewModels[kk].add(lh);}
else if(kind==="knife"){rh.position.set(0,-0.020,0.080);rh.rotation.y=Math.PI;rh.scale.setScalar(0.95);viewModels[kk].add(rh);}
var skin=(settings.skins&&settings.skins[kk])||"default";applySkinToModel(viewModels[kk],skin);}})();

var caseGeo=new THREE.CylinderGeometry(0.008,0.008,0.022,6);var caseMat=new THREE.MeshBasicMaterial({color:0xd4a040});
var MAX_SHELLS=PERF_MODE?8:24;var shellPool=[],shellActive=[];
function getShell(){for(var i=0;i<shellPool.length;i++){var s=shellPool[i];if(!s.inUse){s.inUse=true;if(!s.mesh.parent)scene.add(s.mesh);return s;}}if(shellPool.length>=MAX_SHELLS)return null;var m=new THREE.Mesh(caseGeo,caseMat);var s2={mesh:m,inUse:true,vx:0,vy:0,vz:0,rot:new THREE.Vector3(),rotV:new THREE.Vector3(),timer:0,bounces:0,smokeTimer:0};shellPool.push(s2);scene.add(m);return s2;}
function spawnShell(){var s=getShell();if(!s)return;var vm=viewModels[player.weapon];if(!vm)return;viewCam.updateMatrixWorld(true);weaponGroup.updateMatrixWorld(true);var mp=(vm.userData.muzzleOffset||new THREE.Vector3(0,0,-0.3)).clone();weaponGroup.localToWorld(mp);s.mesh.position.copy(mp);s.mesh.visible=true;s.bounces=0;s.smokeTimer=0.05;var right=new THREE.Vector3(1,0,0).applyQuaternion(worldCam.quaternion);var b=new THREE.Vector3();worldCam.getWorldDirection(b);var w=WEAPON_DEFS[player.weapon];var sideMul=w.category==="pistol"?1.4:1.0;s.vx=right.x*(1.4+Math.random()*0.9)*sideMul+b.x*-0.3+(Math.random()-0.5)*0.5;s.vy=1.4*(1.5+Math.random()*0.7);s.vz=right.z*(1.4+Math.random()*0.9)*sideMul+b.z*-0.3+(Math.random()-0.5)*0.5;s.rot.set(Math.random()*10,Math.random()*10,Math.random()*10);s.rotV.set((Math.random()-0.5)*20,(Math.random()-0.5)*20,(Math.random()-0.5)*20);s.timer=2.4;shellActive.push(s);playSound("case");if(settings.smoke&&!settings.boostFps)spawnSmoke(mp.x,mp.y,mp.z,(Math.random()-0.5)*0.3,0.4,(Math.random()-0.5)*0.3,0.12,0.35,0xdddddd);}
function updateShells(dt){for(var i=shellActive.length-1;i>=0;i--){var c=shellActive[i];c.vy-=9.8*dt;var nx=c.mesh.position.x+c.vx*dt;var ny=c.mesh.position.y+c.vy*dt;var nz=c.mesh.position.z+c.vz*dt;var hitWall=false;if(nx<0||nz<0||nx>=MAP_W||nz>=MAP_H||isWall(nx,nz))hitWall=true;if(hitWall){c.vx=-c.vx*0.5;c.vz=-c.vz*0.5;c.bounces++;}else{c.mesh.position.x=nx;c.mesh.position.z=nz;}if(ny<=0.02){c.mesh.position.y=0.02;c.vy=-c.vy*0.35;c.vx*=0.55;c.vz*=0.55;c.bounces++;if(Math.abs(c.vy)<0.3)c.vy=0;}else c.mesh.position.y=ny;c.mesh.rotation.x+=c.rotV.x*dt;c.mesh.rotation.y+=c.rotV.y*dt;c.mesh.rotation.z+=c.rotV.z*dt;c.rotV.multiplyScalar(1-dt*1.5);c.timer-=dt;if(c.timer<=0){c.mesh.visible=false;c.inUse=false;shellActive.splice(i,1);}}}

var tracerGeo=new THREE.CylinderGeometry(0.018,0.018,1,6,1,true);var tracerMatBase=new THREE.MeshBasicMaterial({color:0xffee88,transparent:true,opacity:0.95,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
var tracerPool=[],tracersActive=[];
function spawnTracer(f,t){if(settings.boostFps)return;var tt=null;for(var i=0;i<tracerPool.length;i++){if(!tracerPool[i].inUse){tt=tracerPool[i];break;}}if(!tt){var maxT=PERF_MODE?12:24;if(tracerPool.length>=maxT)return;var m=new THREE.Mesh(tracerGeo,tracerMatBase.clone());tt={mesh:m,inUse:false,t:0,dur:0.28};tracerPool.push(tt);scene.add(m);}var dir=new THREE.Vector3().subVectors(t,f);var len=dir.length();if(len<0.05){tt.inUse=false;return;}tt.inUse=true;tt.mesh.visible=true;tt.mesh.position.copy(f).addScaledVector(dir,0.5);tt.mesh.scale.set(1,len,1);tt.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());tt.mesh.material.opacity=0.95;tt.t=0;tracersActive.push(tt);}
function updateTracers(dt){for(var i=tracersActive.length-1;i>=0;i--){var t=tracersActive[i];t.t+=dt;var k=t.t/t.dur;t.mesh.material.opacity=Math.max(0,0.95*(1-k*k));if(t.t>=t.dur){t.mesh.visible=false;t.inUse=false;tracersActive.splice(i,1);}}}
var bloodGeo=new THREE.SphereGeometry(0.05,5,4);var bloodMatBase=new THREE.MeshBasicMaterial({color:0xaa0000,transparent:true,opacity:0.9});var bloodParticles=[];var MAX_BLOOD=PERF_MODE?20:40;
function spawnBlood(x,y,z,hs){if(settings.boostFps)return;var n=hs?6:4;for(var i=0;i<n;i++){if(bloodParticles.length>=MAX_BLOOD)break;var m=new THREE.Mesh(bloodGeo,bloodMatBase.clone());m.position.set(x,y,z);scene.add(m);var sp=hs?1.8:1.2;bloodParticles.push({mesh:m,vx:(Math.random()-.5)*sp*2.5,vy:Math.random()*sp*2.2+.3,vz:(Math.random()-.5)*sp*2.5,t:0,dur:.5+Math.random()*.3,size:.6+Math.random()*.4});}}
function updateBlood(dt){for(var i=bloodParticles.length-1;i>=0;i--){var b=bloodParticles[i];b.vy-=9.8*dt;b.mesh.position.x+=b.vx*dt;b.mesh.position.y+=b.vy*dt;b.mesh.position.z+=b.vz*dt;if(b.mesh.position.y<=0.02){b.mesh.position.y=0.02;b.vy=0;b.vx*=0.8;b.vz*=0.8;}b.t+=dt;var k=b.t/b.dur;b.mesh.material.opacity=Math.max(0,0.9*(1-k));b.mesh.scale.setScalar(b.size*(1-k*.5));if(b.t>=b.dur){scene.remove(b.mesh);b.mesh.material.dispose();bloodParticles.splice(i,1);}}}
var impactGeo=new THREE.SphereGeometry(0.03,5,4);var impactParticles=[];var MAX_IMPACT=settings.boostFps?12:30;
function spawnImpact(x,y,z,color){if(settings.boostFps)return;for(var i=0;i<5;i++){if(impactParticles.length>=MAX_IMPACT)break;var mat=new THREE.MeshBasicMaterial({color:color||0xffddaa,transparent:true,opacity:1});var m=new THREE.Mesh(impactGeo,mat);m.position.set(x,y,z);scene.add(m);impactParticles.push({mesh:m,vx:(Math.random()-.5)*3.2,vy:Math.random()*2.6+0.4,vz:(Math.random()-.5)*3.2,t:0,dur:0.35+Math.random()*0.15});}}
function updateImpacts(dt){for(var i=impactParticles.length-1;i>=0;i--){var p=impactParticles[i];p.vy-=14*dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.z+=p.vz*dt;p.t+=dt;var k=p.t/p.dur;p.mesh.material.opacity=Math.max(0,1-k);p.mesh.scale.setScalar(1-k*0.6);if(p.t>=p.dur){scene.remove(p.mesh);p.mesh.material.dispose();impactParticles.splice(i,1);}}}
var bulletHoleGeo=new THREE.PlaneGeometry(0.14,0.14);var bulletHoles=[];var MAX_BULLET_HOLES=settings.boostFps?6:(PERF_MODE?16:24);
function spawnBulletHole(point,normal){if(settings.boostFps)return;var mat=new THREE.MeshBasicMaterial({map:BH_TEX,transparent:true,opacity:0.95,depthWrite:false,side:THREE.DoubleSide});var m=new THREE.Mesh(bulletHoleGeo,mat);var q=new THREE.Quaternion();q.setFromUnitVectors(new THREE.Vector3(0,0,1),normal.clone().normalize());m.quaternion.copy(q);m.position.copy(point);m.position.addScaledVector(normal,0.02);m.scale.setScalar(0.7+Math.random()*0.5);scene.add(m);bulletHoles.push({mesh:m,t:0,dur:18});while(bulletHoles.length>MAX_BULLET_HOLES){var o=bulletHoles.shift();scene.remove(o.mesh);o.mesh.material.dispose();}}
function updateBulletHoles(dt){for(var i=bulletHoles.length-1;i>=0;i--){var h=bulletHoles[i];h.t+=dt;if(h.t>h.dur-3){var k=(h.t-(h.dur-3))/3;h.mesh.material.opacity=Math.max(0,0.95*(1-k));}if(h.t>=h.dur){scene.remove(h.mesh);h.mesh.material.dispose();bulletHoles.splice(i,1);}}}
function clearBulletHoles(){for(var i=0;i<bulletHoles.length;i++){scene.remove(bulletHoles[i].mesh);bulletHoles[i].mesh.material.dispose();}bulletHoles=[];}
function clearBlood(){for(var i=0;i<bloodParticles.length;i++)scene.remove(bloodParticles[i].mesh);bloodParticles=[];}
function clearImpacts(){for(var i=0;i<impactParticles.length;i++)scene.remove(impactParticles[i].mesh);impactParticles=[];}

var smokeGeo=new THREE.PlaneGeometry(0.15,0.15);var smokeParticles=[];var MAX_SMOKE=settings.boostFps?10:(PERF_MODE?24:60);
function spawnSmoke(x,y,z,vx,vy,vz,size,dur,color){if(!settings.smoke||settings.boostFps)return;if(smokeParticles.length>=MAX_SMOKE)return;var mat=new THREE.MeshBasicMaterial({map:SMOKE_TEX,color:color||0xffffff,transparent:true,opacity:0.85,depthWrite:false});var m=new THREE.Mesh(smokeGeo,mat);m.position.set(x,y,z);m.scale.setScalar(size||0.6);m.renderOrder=5;scene.add(m);smokeParticles.push({mesh:m,vx:vx||0,vy:vy||0.5,vz:vz||0,t:0,dur:dur||0.9,startSize:size||0.6,endSize:(size||0.6)*2.4,rotSpeed:(Math.random()-0.5)*2.0,rot:Math.random()*Math.PI*2});}
function updateSmoke(dt){for(var i=smokeParticles.length-1;i>=0;i--){var p=smokeParticles[i];p.t+=dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.z+=p.vz*dt;p.vx*=(1-dt*1.5);p.vz*=(1-dt*1.5);p.vy+=dt*0.3;p.rot+=p.rotSpeed*dt;var k=p.t/p.dur;var sz=p.startSize+(p.endSize-p.startSize)*k;p.mesh.scale.setScalar(sz);p.mesh.material.opacity=Math.max(0,0.85*(1-k*k));p.mesh.quaternion.copy(worldCam.quaternion);p.mesh.rotateZ(p.rot);if(p.t>=p.dur){scene.remove(p.mesh);p.mesh.material.dispose();smokeParticles.splice(i,1);}}}
function clearSmoke(){for(var i=0;i<smokeParticles.length;i++){scene.remove(smokeParticles[i].mesh);smokeParticles[i].mesh.material.dispose();}smokeParticles=[];}

function makeTextSprite(text,color){var c=document.createElement("canvas");c.width=256;c.height=64;var cx=c.getContext("2d");cx.font="bold 42px Arial";cx.textAlign="center";cx.textBaseline="middle";cx.lineWidth=6;cx.strokeStyle="black";cx.strokeText(text,128,32);cx.fillStyle=color;cx.fillText(text,128,32);var t=new THREE.CanvasTexture(c);var m=new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false,fog:false});var sp=new THREE.Sprite(m);sp.scale.set(1.2,0.3,1);return sp;}
var popups=[];
function spawnPopup(x,y,z,text,color){var sp=makeTextSprite(text,color||"#ffcc44");sp.position.set(x,y,z);scene.add(sp);popups.push({sprite:sp,t:0,dur:1.2});}
function updatePopups(dt){for(var i=popups.length-1;i>=0;i--){var p=popups[i];p.t+=dt;p.sprite.position.y+=dt*1.2;p.sprite.material.opacity=Math.max(0,1-p.t/p.dur);if(p.t>=p.dur){scene.remove(p.sprite);p.sprite.material.map.dispose();p.sprite.material.dispose();popups.splice(i,1);}}}
var killFeed=[];var KILL_FEED_MAX=5;
function pushKillFeed(bt,hs){var n={scout:"Разведчик",soldier:"Солдат",heavy:"Тяжёлый",sniper:"Снайпер"};killFeed.push({text:(hs?"💀 ":"☠ ")+n[bt]+(hs?" (в голову)":""),t:0,dur:4.0,color:hs?"#ffcc44":"#ffffff"});while(killFeed.length>KILL_FEED_MAX)killFeed.shift();}
function updateKillFeed(dt){for(var i=killFeed.length-1;i>=0;i--){killFeed[i].t+=dt;if(killFeed[i].t>=killFeed[i].dur)killFeed.splice(i,1);}}

var pickups=[];
function createMedkitMesh(){var g=new THREE.Group();var boxMat=new THREE.MeshStandardMaterial({color:0xf4f4f4,metalness:0.15,roughness:0.55});g.add(new THREE.Mesh(new THREE.BoxGeometry(0.44,0.30,0.30),boxMat));var cm=new THREE.MeshBasicMaterial({color:0xff2828});var ch=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.09,0.010),cm);ch.position.set(0,0,0.153);g.add(ch);var cv=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.26,0.010),cm);cv.position.set(0,0,0.153);g.add(cv);return g;}
function spawnPickup(x,z){var mesh=createMedkitMesh();mesh.scale.setScalar(0.85);mesh.position.set(x,0.6,z);var light=new THREE.PointLight(0xff3060,1.4,4.5);light.position.copy(mesh.position);scene.add(mesh);scene.add(light);pickups.push({mesh:mesh,light:light,x:x,z:z,t:0,dur:20,bobPhase:Math.random()*Math.PI*2});}
function updatePickups(dt){for(var i=pickups.length-1;i>=0;i--){var p=pickups[i];p.t+=dt;p.mesh.rotation.y+=dt*2;p.mesh.position.y=0.6+Math.sin(p.t*3+p.bobPhase)*0.15;p.light.position.copy(p.mesh.position);var dx=player.x-p.x,dz=player.z-p.z;if(dx*dx+dz*dz<1.2){player.hp=Math.min(player.maxHp,player.hp+25);spawnPopup(p.x,1.6,p.z,"+25 HP","#66ff88");playSound("medkit");scene.remove(p.mesh);scene.remove(p.light);pickups.splice(i,1);continue;}if(p.t>=p.dur){scene.remove(p.mesh);scene.remove(p.light);pickups.splice(i,1);}}}

var BOT_TYPES={scout:{name:"Разведчик",color:0x8a8a8a,hp:55,speed:3.6,vision:30,accuracy:0.55,damage:9,cooldown:0.2,score:100,blindChance:0.04,turnSpeed:9},soldier:{name:"Солдат",color:0x4060a0,hp:80,speed:2.9,vision:34,accuracy:0.72,damage:20,cooldown:0.65,score:150,blindChance:0.06,turnSpeed:6.5},heavy:{name:"Тяжёлый",color:0x6a4040,hp:140,speed:2.0,vision:28,accuracy:0.5,damage:12,cooldown:0.12,score:250,blindChance:0.10,turnSpeed:4.0},sniper:{name:"Снайпер",color:0x3a6a3a,hp:60,speed:2.4,vision:55,accuracy:0.95,damage:55,cooldown:1.8,score:300,blindChance:0.02,turnSpeed:5.0}};
var BOT_STATE={PATROL:"patrol",CHASE:"chase",ATTACK:"attack",INVESTIGATE:"investigate",RETREAT:"retreat"};
var bots=[],corpses=[],grenades=[],explosions=[];
var score=0,kills=0,gameOver=false,deaths=0,hitMark=0,hitMarkHeadshot=false,damageFlash=0;
var waveNumber=1,waveEnemiesLeft=0,waveTotal=0,waveCooldown=0,killsThisWave=0,headshotBanner=0;
var comboCount=0,comboTimer=0,comboBanner=0;
var damageIndicators=[],hitDamageNumbers=[],waveStartTime=0;
var difficultyMult=1.0,balanceEvents=[];
function trackBalanceEvent(type){balanceEvents.push({type:type,t:performance.now()/1000});var cutoff=performance.now()/1000-90;balanceEvents=balanceEvents.filter(function(e){return e.t>cutoff;});}
function updateAutoBalance(){if(!settings.autoBalance){difficultyMult=1.0;return;}var now=performance.now()/1000;var cutoff=now-90;var recent=balanceEvents.filter(function(e){return e.t>cutoff;});var k=0,d=0;for(var i=0;i<recent.length;i++){if(recent[i].type==="kill")k++;else if(recent[i].type==="death")d++;}var kd=k/Math.max(1,d);var target;if(kd<0.4)target=0.55;else if(kd<0.9)target=0.75;else if(kd<1.8)target=1.0;else if(kd<3.0)target=1.25;else if(kd<5.0)target=1.5;else target=1.75;difficultyMult+=(target-difficultyMult)*0.15;}
function applyDifficultyToBot(bot){var base=BOT_DIFF_MULT[bot.difficulty||settings.botDifficulty]||BOT_DIFF_MULT.normal;var m=settings.autoBalance?difficultyMult:1.0;bot.maxHp=Math.round(bot.def.hp*base.hp*(0.65+m*0.35));bot.hp=bot.maxHp;bot.diffDamage=base.dmg*m;bot.diffAccuracy=Math.min(1.4,base.acc*(0.55+m*0.45));bot.diffCooldown=1/(0.65+m*0.35);bot.diffTurn=base.turn;bot.diffVision=base.vision;bot.diffSpeed=base.speed;}
function alertBotsToNoise(radius,x,z){for(var i=0;i<bots.length;i++){var b=bots[i];if(!b.alive)continue;var dx=b.x-x,dz=b.z-z;var d=Math.sqrt(dx*dx+dz*dz);if(d>radius)continue;var alertDur=Math.max(2.5,5.0-d/radius*2.5);b.alerted=Math.max(b.alerted||0,alertDur);if(b.state!==BOT_STATE.ATTACK){b.state=BOT_STATE.INVESTIGATE;b.lastSeenX=x;b.lastSeenZ=z;b.lastSeenAge=0.4;b.path=[];b.pathTimer=0.2;}}}
function startWave(n){waveNumber=n;waveCooldown=2;waveTotal=3+n*2;waveEnemiesLeft=waveTotal;killsThisWave=0;if(n>1)player.grenades=Math.min(9,player.grenades+3);else player.grenades=3;playSound("wave");}

function createBotWeapon(kind){var g=new THREE.Group();var m1=new THREE.MeshLambertMaterial({color:0x1a1a1a});var m2=new THREE.MeshLambertMaterial({color:0x3a2a1a});
if(kind==="pistol"){g.add(box(0.045,0.035,0.22,m1,0,0,-0.11));var grip=box(0.04,0.11,0.05,m2,0,-0.07,0.02);grip.rotation.x=-0.2;g.add(grip);}
else if(kind==="rifle"){g.add(box(0.05,0.06,0.35,m1,0,0,-0.18));g.add(cyl(0.011,0.011,0.42,10,m1,0,0.012,-0.45,"z"));g.add(box(0.05,0.03,0.22,m2,0,0.005,0.20));var stk=box(0.05,0.075,0.16,m2,0,0,0.36);stk.rotation.x=0.06;g.add(stk);var gripR=box(0.04,0.13,0.05,m2,0,-0.075,0.05);gripR.rotation.x=-0.2;g.add(gripR);var mg=box(0.045,0.14,0.055,m1,0,-0.075,-0.10);mg.rotation.x=-0.1;g.add(mg);}
else if(kind==="sniper"){g.add(cyl(0.013,0.013,0.68,12,m1,0,0,-0.60,"z"));g.add(box(0.05,0.05,0.35,m1,0,0,-0.18));g.add(box(0.045,0.03,0.30,m2,0,0.05,0.16));var sc=cyl(0.02,0.02,0.34,16,new THREE.MeshLambertMaterial({color:0x0a0a0a}),0,0.06,-0.26,"z");g.add(sc);}
else if(kind==="smg"){g.add(box(0.06,0.075,0.28,m1,0,0.01,-0.14));g.add(cyl(0.011,0.011,0.18,10,m1,0,0.012,-0.34,"z"));var rg=box(0.04,0.13,0.05,m2,0,-0.075,0.02);rg.rotation.x=-0.15;g.add(rg);}
var flash=new THREE.PointLight(0xffdd66,0,4);flash.position.set(0,0,-0.60);g.add(flash);g.userData.flash=flash;return g;}
function createBotMesh(color,typeKey){var g=new THREE.Group();
var vestColor={scout:0xff8a2a,soldier:0x2a4a8a,heavy:0x4a2020,sniper:0x2a5a2a}[typeKey]||0x3a3a3a;
var helmetColor={scout:0x2a2a2a,soldier:0x1a3a6a,heavy:0x1a1a1a,sniper:0x2a4a2a}[typeKey]||0x222222;
var pantsColor={scout:0x5a5a4a,soldier:0x3a3a2a,heavy:0x2a2a1a,sniper:0x3a4a2a}[typeKey]||0x3a3a2a;
var skinMat=new THREE.MeshLambertMaterial({color:0xd0a880});var pantsMat=new THREE.MeshLambertMaterial({color:pantsColor});var bootMat=new THREE.MeshLambertMaterial({color:0x0e0e0e});var bodyMat=new THREE.MeshLambertMaterial({color:color});var vestMat=new THREE.MeshLambertMaterial({color:vestColor});var helmetMat=new THREE.MeshLambertMaterial({color:helmetColor});var darkMat=new THREE.MeshLambertMaterial({color:0x0a0a0a});
var legGeo=new THREE.CylinderGeometry(0.085,0.095,0.55,8);
var legL=new THREE.Group();legL.add(new THREE.Mesh(legGeo,pantsMat));legL.children[0].position.y=-0.275;legL.position.set(-0.13,0.62,0);g.add(legL);
var legR=new THREE.Group();legR.add(new THREE.Mesh(legGeo.clone(),pantsMat));legR.children[0].position.y=-0.275;legR.position.set(0.13,0.62,0);g.add(legR);
var bL=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.10,0.24),bootMat);bL.position.set(0,-0.55,0.04);legL.add(bL);
var bR=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.10,0.24),bootMat);bR.position.set(0,-0.55,0.04);legR.add(bR);
var torso=new THREE.Mesh(new THREE.BoxGeometry(0.48,0.58,0.30),bodyMat);torso.position.y=1.05;torso.userData.bodyPart="torso";g.add(torso);
var vest=new THREE.Mesh(new THREE.BoxGeometry(0.54,0.42,0.36),vestMat);vest.position.y=1.03;vest.userData.bodyPart="torso";g.add(vest);
var shL=new THREE.Mesh(new THREE.SphereGeometry(0.10,8,6),vestMat);shL.position.set(-0.26,1.24,0);shL.userData.bodyPart="arm";g.add(shL);
var shR=new THREE.Mesh(new THREE.SphereGeometry(0.10,8,6),vestMat);shR.position.set(0.26,1.24,0);shR.userData.bodyPart="arm";g.add(shR);
var armGeo=new THREE.CylinderGeometry(0.065,0.065,0.50,6);
var armL=new THREE.Group();armL.add(new THREE.Mesh(armGeo,bodyMat));armL.children[0].position.y=-0.25;armL.position.set(-0.26,1.20,0.02);armL.rotation.x=-0.55;armL.rotation.z=0.15;armL.userData.bodyPart="arm";g.add(armL);
var armR=new THREE.Group();armR.add(new THREE.Mesh(armGeo.clone(),bodyMat));armR.children[0].position.y=-0.25;armR.position.set(0.26,1.20,0.02);armR.rotation.x=-0.70;armR.rotation.z=-0.15;armR.userData.bodyPart="arm";g.add(armR);
var handL=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,6),skinMat);handL.position.set(0,-0.50,0);armL.add(handL);
var handR=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,6),skinMat);handR.position.set(0,-0.50,0);armR.add(handR);
var neck=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.08,8),skinMat);neck.position.y=1.38;g.add(neck);
var head=new THREE.Mesh(new THREE.SphereGeometry(0.155,10,8),skinMat);head.position.y=1.50;head.userData.isHead=true;head.userData.bodyPart="head";g.add(head);
var helmet=new THREE.Mesh(new THREE.SphereGeometry(0.19,12,8,0,Math.PI*2,0,Math.PI*0.62),helmetMat);helmet.position.y=1.53;helmet.userData.bodyPart="head";g.add(helmet);
var brim=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.03,0.10),helmetMat);brim.position.set(0,1.50,-0.14);brim.userData.bodyPart="head";g.add(brim);
var mask=new THREE.Mesh(new THREE.SphereGeometry(0.155,10,8,0,Math.PI*2,Math.PI*0.42,Math.PI*0.58),darkMat);mask.position.y=1.48;mask.userData.bodyPart="head";g.add(mask);
var goggles=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.05,0.05),new THREE.MeshLambertMaterial({color:0x203050}));goggles.position.set(0,1.53,-0.14);goggles.userData.bodyPart="head";g.add(goggles);
var gunKind=typeKey==="sniper"?"sniper":(typeKey==="scout"?"smg":"rifle");
var gunGroup=createBotWeapon(gunKind);gunGroup.position.set(0.14,0.86,-0.30);gunGroup.rotation.x=0.05;gunGroup.userData.bodyPart="arm";g.add(gunGroup);
g.userData.parts={legL:legL,legR:legR,torso:torso,gunGroup:gunGroup,armL:armL,armR:armR};g.userData.gunGroup=gunGroup;return g;}
function spawnWaveBot(){var pos=getBotSpawnOpposite();if(!pos)pos=findFreeSpotInZone(player.z>MAP_H*0.5?"north":"south",200);var tk;var r=Math.random();
if(waveNumber<2)tk="scout";else if(waveNumber<3)tk=r<0.6?"scout":"soldier";else if(waveNumber<5)tk=r<0.35?"scout":r<0.75?"soldier":r<0.9?"heavy":"sniper";else tk=r<0.2?"scout":r<0.55?"soldier":r<0.8?"heavy":"sniper";
var def=BOT_TYPES[tk];var mesh=createBotMesh(def.color,tk);mesh.position.set(pos.x,0,pos.z);scene.add(mesh);
var initFace=Math.atan2(pos.x-player.x,pos.z-player.z);
var bot={x:pos.x,z:pos.z,type:tk,def:def,mesh:mesh,hp:def.hp,maxHp:def.hp,state:BOT_STATE.PATROL,path:[],pathTimer:0,shootTimer:0,hasLOS:false,losTimer:0,lastSeenX:pos.x,lastSeenZ:pos.z,lastSeenAge:9999,facing:initFace,targetFacing:initFace,wanderX:pos.x,wanderZ:pos.z,wanderTimer:0,alive:true,animPhase:Math.random()*10,parts:mesh.userData.parts,strafeDir:Math.random()<0.5?-1:1,strafeTimer:1+Math.random()*2,alerted:0,retreatCooldown:0,lastPlayerVX:0,lastPlayerVZ:0,patrolAnchorX:pos.x,patrolAnchorZ:pos.z,difficulty:settings.botDifficulty};
bots.push(bot);applyDifficultyToBot(bot);}

var grenadeGeo=new THREE.SphereGeometry(0.12,8,6);var grenadeMat=new THREE.MeshLambertMaterial({color:0x3a5a2a});
function throwGrenade(){if(gameOver||editMode||settingsEl.classList.contains("open")||weaponMenuEl.classList.contains("open"))return;if(player.grenades<=0||player.grenadeCooldown>0)return;player.grenades--;player.grenadeCooldown=0.8;var dir=new THREE.Vector3();worldCam.getWorldDirection(dir);var m=new THREE.Mesh(grenadeGeo,grenadeMat);m.position.set(player.x,1.5+player.y,player.z);scene.add(m);grenades.push({mesh:m,vx:dir.x*12,vy:dir.y*12+2.5,vz:dir.z*12,timer:2.0});alertBotsToNoise(28,player.x,player.z);}
function explodeGrenade(g){var light=new THREE.PointLight(0xffaa44,10,14);light.position.copy(g.mesh.position);scene.add(light);var sph=new THREE.Mesh(new THREE.SphereGeometry(0.3,10,8),new THREE.MeshBasicMaterial({color:0xffdd66,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending}));sph.position.copy(g.mesh.position);scene.add(sph);explosions.push({light:light,sphere:sph,t:0,dur:0.5});playSound("explode");triggerShake(2.5,0.04);triggerFlash(255,200,100,0.7);alertBotsToNoise(65,g.mesh.position.x,g.mesh.position.z);var ex=g.mesh.position.x,ez=g.mesh.position.z,R=4;for(var i=0;i<bots.length;i++){var b=bots[i];if(!b.alive)continue;var dx=b.x-ex,dz=b.z-ez;var d=Math.sqrt(dx*dx+dz*dz);if(d<R){var dmg=Math.floor(120*(1-d/R));b.hp-=dmg;spawnBlood(b.x,1.0,b.z,false);if(b.hp<=0)killBot(b,false);}}var pdx=player.x-ex,pdz=player.z-ez;var pd=Math.sqrt(pdx*pdx+pdz*pdz);if(pd<R){var dm2=Math.floor(80*(1-pd/R));player.hp-=dm2;damageFlash=0.3;player.lastDamageTime=performance.now()/1000;playSound("damage");if(player.hp<=0){player.hp=0;killPlayer("гранатой");}}scene.remove(g.mesh);}
function createCorpse(bot){if(settings.boostFps)return;try{var g=bot.mesh.clone(true);g.traverse(function(o){if(o.isMesh)o.frustumCulled=false;if(o.isLight)o.visible=false;});g.rotation.set(Math.PI/2+(Math.random()-.5)*.25,(Math.random()-.5)*0.8,(Math.random()-.5)*.5);g.position.set(bot.x,0.22,bot.z);scene.add(g);corpses.push({mesh:g,t:0,dur:20});corpseColliders.push({x:bot.x,z:bot.z,r:0.38});}catch(e){}}
function killBot(bot,hs){if(!bot.alive)return;bot.alive=false;createCorpse(bot);scene.remove(bot.mesh);spawnBlood(bot.x,1.0,bot.z,hs);if(settings.effects4d&&!settings.boostFps)for(var i=0;i<3;i++)spawnSmoke(bot.x+(Math.random()-0.5)*0.5,0.8+Math.random()*0.4,bot.z+(Math.random()-0.5)*0.5,(Math.random()-0.5)*0.6,0.8+Math.random()*0.4,(Math.random()-0.5)*0.6,0.35,0.85,0xa8a8b0);pushKillFeed(bot.type,hs);var gain=hs?bot.def.score*2:bot.def.score;score+=gain;kills++;trackBalanceEvent("kill");spawnPopup(bot.x,2.0,bot.z,"+"+gain,hs?"#ff4444":"#ffcc44");spawnPickup(bot.x,bot.z);killsThisWave++;waveEnemiesLeft--;if(waveEnemiesLeft<=0){waveCooldown=3;triggerSlowmo(2.0);triggerFlash(255,240,180,0.4);}comboCount++;comboTimer=5.0;}
function killPlayer(reason){if(gameOver)return;gameOver=true;deaths++;trackBalanceEvent("death");if(score>playerStats.bestScore)playerStats.bestScore=score;playerStats.totalKills+=kills;playerStats.gamesPlayed+=1;saveStats();safeExitPointerLock();showDeathScreen();}
function showDeathScreen(){var elapsed=Math.floor((performance.now()-waveStartTime)/1000);var mins=Math.floor(elapsed/60);var secs=elapsed%60;var timeStr=mins+":"+(secs<10?"0":"")+secs;var acc=player.shotsFired>0?Math.round(player.shotsHit/player.shotsFired*100):0;document.getElementById("deathSub").textContent="Волна "+waveNumber+" · "+settings.botDifficulty;document.getElementById("dsKD").textContent=kills+"/"+deaths;document.getElementById("dsRatio").textContent=(deaths>0?kills/deaths:kills).toFixed(2);document.getElementById("dsScore").textContent=score;document.getElementById("dsTime").textContent=timeStr;document.getElementById("dsWave").textContent=waveNumber;document.getElementById("dsAcc").textContent=acc+"%";deathScreenEl.classList.add("open");}
function closeDeathScreen(){deathScreenEl.classList.remove("open");}
document.getElementById("btnDeathRestart").addEventListener("click",function(){closeDeathScreen();resetGame();});
document.getElementById("btnDeathLobby").addEventListener("click",function(){closeDeathScreen();exitToLobby();});
function resetGame(){for(var i=0;i<bots.length;i++)scene.remove(bots[i].mesh);for(var i=0;i<corpses.length;i++)scene.remove(corpses[i].mesh);for(var i=0;i<grenades.length;i++)scene.remove(grenades[i].mesh);for(var i=0;i<explosions.length;i++){scene.remove(explosions[i].light);scene.remove(explosions[i].sphere);}for(var i=0;i<shellActive.length;i++){scene.remove(shellActive[i].mesh);shellActive[i].inUse=false;}for(var i=0;i<tracersActive.length;i++){if(tracersActive[i].mesh)tracersActive[i].mesh.visible=false;tracersActive[i].inUse=false;}for(var i=0;i<popups.length;i++)scene.remove(popups[i].sprite);for(var i=0;i<pickups.length;i++){scene.remove(pickups[i].mesh);scene.remove(pickups[i].light);}clearBlood();clearBulletHoles();clearImpacts();clearSmoke();shellActive.length=0;tracersActive.length=0;pickups.length=0;bots=[];corpses=[];grenades=[];explosions=[];popups=[];damageIndicators=[];killFeed=[];hitDamageNumbers=[];corpseColliders.length=0;fx.shakeAmount=0;fx.shakeRot=0;fx.slowmo=0;fx.timeScale=1;fx.flash=0;fx.bloodVignette=0;fx.fovOffset=0;rebuildBotCells();var spot=null;var south=validBotCells.filter(function(c){return c.z>MAP_H*0.72;});if(south.length>0)spot=south[Math.floor(Math.random()*south.length)];if(!spot)spot=findFreeSpotInZone("south",200);player.x=spot.x;player.z=spot.z;player.y=getFloorHeight(player.x,player.z);player.vy=0;player.onGround=true;player.onLadder=false;player.yaw=Math.PI;player.pitch=0;player.hp=player.maxHp;player.weapon=settings.slot2||"rifle_vandal";player.prevWeapon=player.weapon;for(var wi=0;wi<WEAPON_ORDER.length;wi++){var wk=WEAPON_ORDER[wi];if(WEAPON_DEFS[wk].mag>0)player.ammo[wk]=WEAPON_DEFS[wk].mag;}player.reloading=false;player.reloadTimer=0;player.shootCooldown=0;player.grenades=3;player.grenadeCooldown=0;player.ads=false;player.adsProgress=0;player.recoilYaw=0;player.recoilPitch=0;player.spread=0;player.moving=false;player.reloadAnim=0;player.sprinting=false;player.sprintProgress=0;player.crouch=false;player.crouchProgress=0;player.lean=0;player.leanTarget=0;player.lastDamageTime=performance.now()/1000;player.regenSoundTimer=0;player.awpBoltTimer=0;player.shotsFired=0;player.shotsHit=0;player.inspectTimer=0;player.inspectActive=false;player.knifeSwingTimer=0;player.knifeCooldown=0;player.inspectCooldown=0;player.knifeAnimT=0;player.equipTimer=0.35;player.equipDur=0.35;setViewWeapon(player.weapon);weaponGroup.visible=true;updateWeaponBtnLabel();score=0;kills=0;gameOver=false;hitMark=0;hitMarkHeadshot=false;damageFlash=0;headshotBanner=0;difficultyMult=1.0;balanceEvents=[];closeDeathScreen();startWave(1);waveStartTime=performance.now();safeRequestPointerLock(canvas);updateSlotBtns();}

var weaponGridEl=document.getElementById("weaponGrid"),slotsBarEl=document.getElementById("slotsBar"),gunGridLobbyEl=document.getElementById("gunGridLobby"),slotsBarLobbyEl=document.getElementById("slotsBarLobby");
function weaponStats(def){return{damageNorm:Math.min(1,def.damage*(def.pellets||1)/120),rateNorm:Math.min(1,(1/(def.cooldown||1))/15),accuracyNorm:Math.min(1,1-def.maxSpread*12)};}
function categoryName(c){return c==="pistol"?"Пистолет":c==="smg"?"ПП":c==="rifle"?"Винтовка":c==="sniper"?"Снайперская":c==="shotgun"?"Дробовик":c==="knife"?"Нож":"";}
function slotKindForCategory(c){if(c==="pistol")return 1;if(c==="smg"||c==="rifle"||c==="sniper"||c==="shotgun")return 2;if(c==="knife")return 3;return 0;}
function buildSlotsBar(){var s1=WEAPON_DEFS[settings.slot1],s2=WEAPON_DEFS[settings.slot2],s3d=WEAPON_DEFS[settings.slot3||"knife_tanto"];slotsBarEl.innerHTML="";var b1=document.createElement("div");b1.className="slot-box slot1";b1.innerHTML='<div class="slot-num">Слот 1</div><div class="slot-name">'+(s1?s1.icon+" "+s1.shortName:"—")+'</div>';var b2=document.createElement("div");b2.className="slot-box slot2";b2.innerHTML='<div class="slot-num">Слот 2</div><div class="slot-name">'+(s2?s2.icon+" "+s2.shortName:"—")+'</div>';var b3=document.createElement("div");b3.className="slot-box slot3";b3.innerHTML='<div class="slot-num">Слот 3</div><div class="slot-name">'+(s3d?s3d.icon+" "+s3d.shortName:"—")+'</div>';slotsBarEl.appendChild(b1);slotsBarEl.appendChild(b2);slotsBarEl.appendChild(b3);}
function buildSlotsBarLobby(){var s1=WEAPON_DEFS[settings.slot1],s2=WEAPON_DEFS[settings.slot2],s3=WEAPON_DEFS[settings.slot3||"knife_tanto"];slotsBarLobbyEl.innerHTML="";var b1=document.createElement("div");b1.className="slot-box slot1";b1.innerHTML='<div class="slot-num">Слот 1</div><div class="slot-name">'+(s1?s1.icon+" "+s1.shortName:"—")+'</div>';var b2=document.createElement("div");b2.className="slot-box slot2";b2.innerHTML='<div class="slot-num">Слот 2</div><div class="slot-name">'+(s2?s2.icon+" "+s2.shortName:"—")+'</div>';var b3=document.createElement("div");b3.className="slot-box slot3";b3.innerHTML='<div class="slot-num">Слот 3</div><div class="slot-name">'+(s3?s3.icon+" "+s3.shortName:"—")+'</div>';slotsBarLobbyEl.appendChild(b1);slotsBarLobbyEl.appendChild(b2);slotsBarLobbyEl.appendChild(b3);}
function makeWeaponCard(key,isLobby){var def=WEAPON_DEFS[key];var s=weaponStats(def);var card=document.createElement("div");card.className="weapon-card"+(key===player.weapon?" active":"");var sK=slotKindForCategory(def.category);var slotBtnsHtml="";if(sK===1){var a=settings.slot1===key;slotBtnsHtml='<div class="slot-btns"><button class="slot-btn'+(a?" active":"")+'" data-slot="1">'+(a?"✓":"")+' 1</button></div>';}else if(sK===2){var a=settings.slot2===key;slotBtnsHtml='<div class="slot-btns"><button class="slot-btn'+(a?" active":"")+'" data-slot="2">'+(a?"✓":"")+' 2</button></div>';}else if(sK===3){var a=(settings.slot3||"knife_tanto")===key;slotBtnsHtml='<div class="slot-btns"><button class="slot-btn'+(a?" active":"")+'" data-slot="3">'+(a?"✓":"")+' 3</button></div>';}
var curSkin=(settings.skins&&settings.skins[key])||"default";var curSkinDef=SKINS[curSkin]||SKINS.default;
card.innerHTML=slotBtnsHtml+'<div class="row1"><div class="wicon-big">'+def.icon+'</div><div class="info"><div class="wname">'+def.name+'</div><div class="wdesc">'+categoryName(def.category)+' · <span style="color:'+curSkinDef.rarity+'">'+curSkinDef.icon+' '+curSkinDef.name+'</span></div></div></div><div class="stats"><div class="stat attack"><span class="label">Урон</span><div class="bar"><div style="width:'+(s.damageNorm*100).toFixed(0)+'%"></div></div></div><div class="stat rate"><span class="label">Скорость</span><div class="bar"><div style="width:'+(s.rateNorm*100).toFixed(0)+'%"></div></div></div><div class="stat accur"><span class="label">Точность</span><div class="bar"><div style="width:'+(s.accuracyNorm*100).toFixed(0)+'%"></div></div></div></div>';
card.addEventListener("click",function(e){var t=e.target;if(t&&t.classList&&t.classList.contains("slot-btn")){e.stopPropagation();var slot=t.dataset.slot;if(slot==="1")settings.slot1=key;else if(slot==="2")settings.slot2=key;else if(slot==="3")settings.slot3=key;saveSettings();if(isLobby){buildGunMenuLobby();buildSlotsBarLobby();}else{buildWeaponMenu();updateSlotBtns();}return;}if(!isLobby){switchWeapon(key);closeWeaponMenu();}else{if(def.category==="knife")settings.slot3=key;else if(def.category==="pistol")settings.slot1=key;else settings.slot2=key;saveSettings();buildGunMenuLobby();buildSlotsBarLobby();}});return card;}
function buildWeaponMenu(){buildSlotsBar();weaponGridEl.innerHTML="";for(var gi=0;gi<WEAPON_GROUPS.length;gi++){var grp=WEAPON_GROUPS[gi];var hd=document.createElement("div");hd.className="weapon-group-title";hd.textContent=grp.name;weaponGridEl.appendChild(hd);var grid=document.createElement("div");grid.className="weapon-grid-inner";for(var ki=0;ki<grp.keys.length;ki++){if(viewModels[grp.keys[ki]])grid.appendChild(makeWeaponCard(grp.keys[ki],false));}weaponGridEl.appendChild(grid);}}
function buildGunMenuLobby(){buildSlotsBarLobby();gunGridLobbyEl.innerHTML="";for(var gi=0;gi<WEAPON_GROUPS.length;gi++){var grp=WEAPON_GROUPS[gi];var hd=document.createElement("div");hd.className="weapon-group-title";hd.textContent=grp.name;gunGridLobbyEl.appendChild(hd);var grid=document.createElement("div");grid.className="weapon-grid-inner";for(var ki=0;ki<grp.keys.length;ki++){if(viewModels[grp.keys[ki]])grid.appendChild(makeWeaponCard(grp.keys[ki],true));}gunGridLobbyEl.appendChild(grid);}}
function openWeaponMenu(){safeExitPointerLock();buildWeaponMenu();weaponMenuEl.classList.add("open");setTimeout(function(){safeExitPointerLock();},50);clearActiveTouch();}
function closeWeaponMenu(){weaponMenuEl.classList.remove("open");clearKeys();}
document.getElementById("btnCloseWeaponMenu").addEventListener("click",closeWeaponMenu);
weaponMenuEl.addEventListener("click",function(e){if(e.target===weaponMenuEl)closeWeaponMenu();});
document.getElementById("btnCloseGunMenuLobby").addEventListener("click",function(){gunMenuLobbyEl.classList.remove("open");});
document.getElementById("btnLobbyGunMenu").addEventListener("click",function(){buildGunMenuLobby();gunMenuLobbyEl.classList.add("open");});
gunMenuLobbyEl.addEventListener("click",function(e){if(e.target===gunMenuLobbyEl)gunMenuLobbyEl.classList.remove("open");});
function updateWeaponBtnLabel(){var btn=document.getElementById("btnWeapon");if(!btn)return;var def=WEAPON_DEFS[player.weapon];var l=btn.querySelector(".wlabel");if(l)l.textContent=def.shortName;}
function updateSlotBtns(){var s1=document.getElementById("btnSlot1"),s2=document.getElementById("btnSlot2"),s3=document.getElementById("btnSlot3");if(s1)s1.classList.toggle("active",player.weapon===settings.slot1);if(s2)s2.classList.toggle("active",player.weapon===settings.slot2);if(s3)s3.classList.toggle("active",player.weapon.indexOf("knife")===0||player.weapon===(settings.slot3||"knife_tanto"));}

var keys={};
function clearKeys(){for(var k in keys)keys[k]=false;}
function anyModalOpen(){return editMode||settingsEl.classList.contains("open")||weaponMenuEl.classList.contains("open")||lobbyActive||mapSelectEl.classList.contains("open")||deathScreenEl.classList.contains("open")||gunMenuLobbyEl.classList.contains("open");}
window.addEventListener("blur",clearKeys);
var mouseLocked=false;var mouseSens=0.0022;var mouseDownLMB=false;
canvas.addEventListener("click",function(){if(anyModalOpen())return;if(isTouch)return;safeRequestPointerLock(canvas);hint.style.display="none";});
document.addEventListener("pointerlockchange",function(){mouseLocked=document.pointerLockElement===canvas;if(!mouseLocked)mouseDownLMB=false;});
document.addEventListener("mousemove",function(e){if(isTouch||!mouseLocked||anyModalOpen())return;var mvx=e.movementX||0,mvy=e.movementY||0;mvx=Math.max(-100,Math.min(100,mvx));mvy=Math.max(-100,Math.min(100,mvy));var sm=1;if(player.weapon==="sniper_longshot"&&player.adsProgress>0.7)sm=settings.sniperSensitivity;var am=1-player.adsProgress*0.6;var dx=mvx*mouseSens*settings.sensitivity*am*sm;var dy=mvy*mouseSens*settings.sensitivity*am*sm;player.yaw-=dx;player.pitch-=dy;player.pitch=Math.max(-Math.PI/2+.05,Math.min(Math.PI/2-.05,player.pitch));});
document.addEventListener("mousedown",function(e){if(isTouch)return;if(anyModalOpen())return;if(lobbyActive)return;var t=e.target;if(t&&t.closest&&(t.closest('#btnSettingsAlways')||t.closest('#editBar')||t.closest('#mobileUI')))return;if(e.button===0){mouseDownLMB=true;if(player.weapon.indexOf("knife")===0)knifeAttack(false);else shootPlayer();}if(e.button===2){if(player.weapon.indexOf("knife")===0)knifeAttack(true);else setADS(true);}});
document.addEventListener("mouseup",function(e){if(isTouch)return;if(e.button===0)mouseDownLMB=false;if(e.button===2&&player.weapon.indexOf("knife")!==0)setADS(false);});
document.addEventListener("contextmenu",function(e){e.preventDefault();});
function __gameKeyDown(e){if(listeningAction)return;var code=e.code||(e.key?("Key"+e.key.toUpperCase()):null);if(!code)return;keys[code]=true;if(e.key)keys[e.key]=true;var action=getActionByKey(code);if(!action)return;
if(action==="KeyR"){e.preventDefault();if(gameOver)resetGame();else startReload();}
else if(action==="KeyI"){e.preventDefault();if(!gameOver)startInspect();}
else if(action==="KeyF"){e.preventDefault();if(!gameOver){var t=player.weapon;switchWeapon(player.prevWeapon===t?"knife_tanto":player.prevWeapon);}}
else if(action==="Digit1"){e.preventDefault();if(!gameOver)switchWeapon(settings.slot1||"pistol_p250");}
else if(action==="Digit2"){e.preventDefault();if(!gameOver)switchWeapon(settings.slot2||"rifle_vandal");}
else if(action==="Digit3"){e.preventDefault();if(!gameOver)switchWeapon(settings.slot3||"knife_tanto");}
else if(action==="KeyB"){e.preventDefault();if(weaponMenuEl.classList.contains("open"))closeWeaponMenu();else if(!gameOver)openWeaponMenu();}
else if(action==="KeyG"){e.preventDefault();if(!gameOver)throwGrenade();}
else if(action==="Escape"){closeWeaponMenu();closeSettings();}
else if(action==="Space"&&player.onGround&&!gameOver&&!player.onLadder){e.preventDefault();player.vy=JUMP_VELOCITY;player.onGround=false;}
else if(action==="ControlLeft"||action==="KeyC")setCrouch(true);}
function __gameKeyUp(e){var code=e.code||(e.key?("Key"+e.key.toUpperCase()):null);if(!code)return;keys[code]=false;if(e.key)keys[e.key]=false;var action=getActionByKey(code);if(action==="ControlLeft"||action==="KeyC")setCrouch(false);}
document.addEventListener("keydown",__gameKeyDown,true);
document.addEventListener("keyup",__gameKeyUp,true);

function switchWeapon(key){if(gameOver)return;if(!WEAPON_DEFS[key])return;if(key===player.weapon)return;player.inspectActive=false;player.inspectTimer=0;player.prevWeapon=player.weapon;player.weapon=key;player.reloading=false;player.reloadTimer=0;player.shootCooldown=0.25;player.ads=false;player.adsProgress=0;player.spread=0;player.reloadAnim=0;player.awpBoltTimer=0;player.knifeSwingTimer=0;player.knifeCooldown=0;player.lean=0;player.leanTarget=0;player.knifeAnimT=0;player.equipTimer=player.equipDur;setViewWeapon(key);weaponGroup.visible=true;if(settings.skins&&settings.skins[key])applySkinToModel(viewModels[key],settings.skins[key]);if(key.indexOf("knife")===0)playSound("knife_equip");else playSound("reload");updateWeaponBtnLabel();updateSlotBtns();if(weaponMenuEl.classList.contains("open"))buildWeaponMenu();}
function setADS(on){if(gameOver||player.reloading)return;if(player.weapon.indexOf("knife")===0)return;if(on===player.ads)return;player.ads=on;playSound(on?"ads_in":"ads_out");}
function setCrouch(on){if(gameOver)return;if(on===player.crouch)return;player.crouch=on;playSound("crouch");if(isTouch){var b=document.getElementById("btnCrouch");if(b)b.classList.toggle("active",player.crouch);}}
function startReload(){var w=WEAPON_DEFS[player.weapon];if(gameOver||player.reloading)return;if(player.weapon.indexOf("knife")===0)return;if(player.ammo[player.weapon]===w.mag)return;player.reloading=true;player.reloadDuration=w.reloadTime;player.reloadTimer=w.reloadTime;player.ads=false;player.inspectActive=false;playSound("reload");}
function startInspect(){if(gameOver||player.reloading||player.inspectCooldown>0)return;player.inspectActive=true;player.inspectDuration=2.4;player.inspectTimer=player.inspectDuration;player.inspectCooldown=1.0;player.ads=false;player.inspectType=WEAPON_DEFS[player.weapon].inspectStyle;playSound("inspect");inspectHintEl.classList.add("show");}
function updateInspect(dt){if(player.inspectCooldown>0)player.inspectCooldown-=dt;if(!player.inspectActive)return;player.inspectTimer-=dt;if(player.inspectTimer<=0){player.inspectActive=false;inspectHintEl.classList.remove("show");}}
function knifeAttack(heavy){if(gameOver||editMode)return;if(player.weapon.indexOf("knife")!==0)return;if(player.knifeCooldown>0)return;var def=WEAPON_DEFS[player.weapon];player.knifeAnimDur=heavy?0.42:0.32;player.knifeAnimT=player.knifeAnimDur;player.knifeCooldown=heavy?def.meleeHeavyCooldown:def.cooldown;playSound("knife_swing");var hitDelay=heavy?0.14:0.10;var range=def.meleeRange;var dmgBase=heavy?def.meleeHeavyDamage:def.meleeDamage;setTimeout(function(){if(gameOver||player.weapon.indexOf("knife")!==0)return;var camDir=new THREE.Vector3();worldCam.getWorldDirection(camDir);var camPos=worldCam.getWorldPosition(new THREE.Vector3());var best=null,bestD=range;for(var bi=0;bi<bots.length;bi++){var b=bots[bi];if(!b.alive)continue;var dx=b.x-camPos.x,dy=1.0-camPos.y,dz=b.z-camPos.z;var d=Math.sqrt(dx*dx+dy*dy+dz*dz);if(d>range)continue;var dot=(dx*camDir.x+dy*camDir.y+dz*camDir.z)/(d||1);if(dot<0.5)continue;if(d<bestD){bestD=d;best=b;}}if(best){var dmg=dmgBase;best.hp-=dmg;spawnBlood(best.x,1.0,best.z,false);spawnImpact(best.x,1.0,best.z,0xaa0000);playSound("knife_hit");hitMark=0.18;spawnPopup(best.x,1.6,best.z,"-"+dmg,"#ffcc44");if(best.hp<=0)killBot(best,false);}},hitDelay*1000);}
function updateKnife(dt){if(player.knifeCooldown>0)player.knifeCooldown-=dt;if(player.knifeAnimT>0)player.knifeAnimT-=dt;}
var raycaster=new THREE.Raycaster();
function spawnMuzzleSmoke(){if(!settings.smoke||settings.boostFps)return;try{var vm=viewModels[player.weapon];if(!vm)return;viewCam.updateMatrixWorld(true);weaponGroup.updateMatrixWorld(true);var muzzleLocal=(vm.userData.muzzleOffset||new THREE.Vector3(0,0,-0.5)).clone();weaponGroup.localToWorld(muzzleLocal);var fwd=new THREE.Vector3();worldCam.getWorldDirection(fwd);spawnSmoke(muzzleLocal.x+fwd.x*0.10,muzzleLocal.y+fwd.y*0.10+0.02,muzzleLocal.z+fwd.z*0.10,fwd.x*0.7+(Math.random()-0.5)*0.4,0.5+Math.random()*0.3,fwd.z*0.7+(Math.random()-0.5)*0.4,0.35,0.55,0xf0f0f0);}catch(e){}}
function shootPlayer(){if(gameOver||editMode||settingsEl.classList.contains("open")||weaponMenuEl.classList.contains("open"))return;if(player.weapon.indexOf("knife")===0){knifeAttack(false);return;}if(player.reloading||player.shootCooldown>0)return;var w=WEAPON_DEFS[player.weapon];if(player.ammo[player.weapon]<=0){playSound("empty");startReload();return;}player.ammo[player.weapon]--;player.shotsFired++;player.shootCooldown=w.cooldown;if(player.weapon==="sniper_longshot"||player.weapon==="sniper_scout")player.awpBoltTimer=w.cooldown;
muzzleFlashLight.intensity=(w.category==="sniper")?14:9;
playSound(w.sound);alertBotsToNoise(w.noiseRadius||40,player.x,player.z);spawnShell();spawnMuzzleSmoke();triggerShake(w.shake*0.35,w.shake*0.008);if(player.inspectActive){player.inspectActive=false;inspectHintEl.classList.remove("show");}
viewCam.updateMatrixWorld(true);weaponGroup.updateMatrixWorld(true);
var numPellets=w.pellets||1;
var cameraDir=new THREE.Vector3();worldCam.getWorldDirection(cameraDir);var right=new THREE.Vector3().crossVectors(cameraDir,new THREE.Vector3(0,1,0)).normalize();var up=new THREE.Vector3().crossVectors(right,cameraDir).normalize();
var startPos=new THREE.Vector3();worldCam.getWorldPosition(startPos);
for(var p=0;p<numPellets;p++){
var totalSpread=w.baseSpread+player.spread;if(player.crouchProgress>0)totalSpread*=(1-player.crouchProgress*0.5);if(player.adsProgress>0)totalSpread*=(1-player.adsProgress*(1-w.adsSpreadMul));if(!player.moving)totalSpread*=0.7;if(player.sprinting)totalSpread*=2.5;
var sx=(Math.random()-.5)*2*totalSpread,sy=(Math.random()-.5)*2*totalSpread;
var shootDir=cameraDir.clone().add(right.clone().multiplyScalar(sx)).add(up.clone().multiplyScalar(sy)).normalize();
raycaster.set(startPos,shootDir);raycaster.far=100;var aliveBots=[];for(var bi=0;bi<bots.length;bi++)if(bots[bi].alive)aliveBots.push(bots[bi]);var botMeshes=aliveBots.map(function(b){return b.mesh;});var botHits=raycaster.intersectObjects(botMeshes,true);var worldTargets=[].concat(wallMeshes);if(floorMesh)worldTargets.push(floorMesh);var wallHits=raycaster.intersectObjects(worldTargets,false);
var hitPoint=null,hitBot=null,hitIsHead=false,hitNormal=null,hitPart="torso";
if(botHits.length>0){var d=botHits[0].distance;if(wallHits.length===0||wallHits[0].distance>d){hitPoint=botHits[0].point;hitNormal=botHits[0].face?botHits[0].face.normal.clone():new THREE.Vector3(0,0,1);var walkObj=botHits[0].object;while(walkObj){if(walkObj.userData&&walkObj.userData.bodyPart){hitPart=walkObj.userData.bodyPart;break;}walkObj=walkObj.parent;}hitIsHead=(hitPart==="head");var obj=botHits[0].object;while(obj){var found=null;for(var fi=0;fi<aliveBots.length;fi++)if(aliveBots[fi].mesh===obj){found=aliveBots[fi];break;}if(found){hitBot=found;break;}obj=obj.parent;}}}
if(!hitPoint&&wallHits.length>0){hitPoint=wallHits[0].point;hitNormal=wallHits[0].face?wallHits[0].face.normal.clone():new THREE.Vector3(0,0,1);if(p===0){spawnBulletHole(hitPoint,hitNormal);spawnImpact(hitPoint.x,hitPoint.y,hitPoint.z,0xffddaa);if(settings.smoke&&!settings.boostFps)spawnSmoke(hitPoint.x+hitNormal.x*0.05,hitPoint.y+hitNormal.y*0.05,hitPoint.z+hitNormal.z*0.05,hitNormal.x*0.5,hitNormal.y*0.5+0.3,hitNormal.z*0.5,0.20,0.4,0xc8c0a8);}}
if(!hitPoint)hitPoint=startPos.clone().add(shootDir.clone().multiplyScalar(80));
if(p===0){var ts=viewModels[player.weapon].userData.muzzleOffset.clone();weaponGroup.localToWorld(ts);spawnTracer(ts,hitPoint);}
if(hitBot){player.shotsHit++;var dxh=hitBot.x-player.x,dzh=hitBot.z-player.z;var dist=Math.sqrt(dxh*dxh+dzh*dzh);var dmg=w.damage;if(dist>w.range)dmg*=Math.pow(w.falloff,(dist-w.range)/5);var partMul=1.0;if(hitPart==="head")partMul=w.headMul;else if(hitPart==="arm")partMul=0.62;else if(hitPart==="leg")partMul=0.55;dmg*=partMul;dmg=Math.round(dmg);hitBot.hp-=dmg;spawnBlood(hitPoint.x,hitPoint.y,hitPoint.z,hitIsHead);
if(hitPart==="head"){hitMark=0.18;hitMarkHeadshot=true;if(p===0)playSound("headshot");headshotBanner=1.2;triggerShake(0.8,0.02);}else{hitMark=0.12;hitMarkHeadshot=false;if(p===0)playSound("hit");}if(settings.showDmgNum)hitDamageNumbers.push({x:hitPoint.x,y:hitPoint.y+0.3,z:hitPoint.z,val:dmg,t:0,dur:0.9,isHead:hitIsHead,part:hitPart});if(hitBot.hp<=0){killBot(hitBot,hitIsHead);}else{hitBot.alerted=5.0;if(hitBot.state===BOT_STATE.PATROL){hitBot.state=BOT_STATE.INVESTIGATE;hitBot.lastSeenX=player.x;hitBot.lastSeenZ=player.z;hitBot.lastSeenAge=0;hitBot.path=[];}}}
}
var am=1-player.adsProgress*(1-w.adsRecoilMul),cm=1-player.crouchProgress*0.5;player.recoilPitch+=w.recoilPitch*(0.8+Math.random()*0.4)*am*cm;player.recoilYaw+=(Math.random()-.5)*2*w.recoilYaw*am*cm;player.spread=Math.min(w.maxSpread,player.spread+w.spreadPerShot);
for(var bi2=0;bi2<bots.length;bi2++){var b=bots[bi2];if(!b.alive)continue;var dxp=b.x-player.x,dzp=b.z-player.z;var dd=Math.sqrt(dxp*dxp+dzp*dzp);if(dd<25&&b.state===BOT_STATE.PATROL){b.state=BOT_STATE.INVESTIGATE;b.lastSeenX=player.x;b.lastSeenZ=player.z;b.lastSeenAge=0;b.path=[];}}}

function findPath(sx,sz,tx,tz){var sxg=Math.floor(sx),szg=Math.floor(sz),txg=Math.floor(tx),tzg=Math.floor(tz);if(sxg===txg&&szg===tzg)return[];if(isTallWall(txg+.5,tzg+.5)||isTallWall(sxg+.5,szg+.5))return null;var start=szg*MAP_W+sxg,target=tzg*MAP_W+txg;var parent=new Int32Array(MAP_W*MAP_H).fill(-1);parent[start]=start;var queue=[start];var head=0;while(head<queue.length){var cur=queue[head++];if(cur===target){var p=[];var c=cur;while(c!==start){p.push([(c%MAP_W)+.5,Math.floor(c/MAP_W)+.5]);c=parent[c];}p.reverse();return p;}var cx=cur%MAP_W,cz=(cur/MAP_W)|0;var dirs=[[1,0],[-1,0],[0,1],[0,-1]];for(var di=0;di<4;di++){var nx=cx+dirs[di][0],nz=cz+dirs[di][1];if(nx<0||nz<0||nx>=MAP_W||nz>=MAP_H)continue;var ni=nz*MAP_W+nx;if(parent[ni]!==-1||MAP[nz][nx]!==0)continue;parent[ni]=cur;queue.push(ni);}}return null;}
function hasLOS(x1,z1,x2,z2){var dx=x2-x1,dz=z2-z1;var d=Math.sqrt(dx*dx+dz*dz);if(d<0.01)return true;var ux=dx/d,uz=dz/d;for(var dd=0.1;dd<d;dd+=0.2)if(isTallWall(x1+ux*dd,z1+uz*dd))return false;return true;}
function sweepMovePlayer(sx,sz,mx,mz,dt,y){var td=Math.sqrt(mx*mx+mz*mz);var ms=0.07;var steps=Math.max(1,Math.ceil(td/ms));var cx=sx,cz=sz;var stx=mx/steps,stz=mz/steps;for(var i=0;i<steps;i++){var nx=cx+stx,nz=cz+stz;if(canMoveAtHeight(nx,cz,y))cx=nx;if(canMoveAtHeight(cx,nz,y))cz=nz;}return{x:cx,z:cz};}

function updatePlayer(dt){tryUnstuck();var w=WEAPON_DEFS[player.weapon];var isKnife=player.weapon.indexOf("knife")===0;var adsSpeed=(w.category==="sniper")?8:(w.category==="pistol"?6:7);var at=(player.ads&&!isKnife)?1:0;player.adsProgress+=(at-player.adsProgress)*Math.min(1,dt*adsSpeed*5);if(Math.abs(player.adsProgress-at)<0.01)player.adsProgress=at;var ct=player.crouch?1:0;player.crouchProgress+=(ct-player.crouchProgress)*Math.min(1,dt*30);if(Math.abs(player.crouchProgress-ct)<0.01)player.crouchProgress=ct;var leanQ=!!keys[keybinds.KeyQ]||mobileLeanL,leanE=!!keys[keybinds.KeyE]||mobileLeanR;var lt=(leanE?1:0)-(leanQ?1:0);player.leanTarget=lt;player.lean+=(lt-player.lean)*Math.min(1,dt*7);var lD=0.55,lRX=Math.cos(player.yaw),lRZ=-Math.sin(player.yaw);
var rec=Math.min(1,w.recoilRecover*dt);player.recoilPitch+=(0-player.recoilPitch)*rec;player.recoilYaw+=(0-player.recoilYaw)*rec;player.spread=Math.max(0,player.spread-w.spreadRecover*dt);var bF=player.adsProgress>0.01?w.adsFov+(settings.fov-w.adsFov)*(1-player.adsProgress):settings.fov;var tF=bF+fx.fovOffset;if(Math.abs(worldCam.fov-tF)>0.1){worldCam.fov+=(tF-worldCam.fov)*Math.min(1,dt*12);worldCam.updateProjectionMatrix();}
if(player.equipTimer>0)player.equipTimer-=dt;
if(player.reloading){player.reloadTimer-=dt;player.reloadAnim=1-player.reloadTimer/player.reloadDuration;if(player.reloadTimer<=0){player.reloading=false;player.ammo[player.weapon]=w.mag;player.reloadAnim=0;}}else player.reloadAnim=0;
if(player.awpBoltTimer>0){player.awpBoltTimer-=dt;if(player.awpBoltTimer<=0.3&&player.awpBoltTimer+dt>0.3)playSound("bolt");}
if(player.shootCooldown>0)player.shootCooldown-=dt;if(player.grenadeCooldown>0)player.grenadeCooldown-=dt;if(muzzleFlashLight.intensity>0)muzzleFlashLight.intensity=Math.max(0,muzzleFlashLight.intensity-80*dt);
if(hitMark>0)hitMark-=dt;if(damageFlash>0)damageFlash-=dt;if(headshotBanner>0)headshotBanner-=dt;if(comboTimer>0){comboTimer-=dt;if(comboTimer<=0)comboCount=0;}
for(var i=damageIndicators.length-1;i>=0;i--){damageIndicators[i].t+=dt;if(damageIndicators[i].t>=damageIndicators[i].dur)damageIndicators.splice(i,1);}
for(var i=hitDamageNumbers.length-1;i>=0;i--){hitDamageNumbers[i].t+=dt;if(hitDamageNumbers[i].t>=hitDamageNumbers[i].dur)hitDamageNumbers.splice(i,1);}
updateInspect(dt);updateKnife(dt);
var now=performance.now()/1000;if(player.hp<player.maxHp&&now-player.lastDamageTime>5&&!gameOver){player.hp=Math.min(player.maxHp,player.hp+2*dt);player.regenSoundTimer-=dt;if(player.regenSoundTimer<=0){player.regenSoundTimer=1.5;playSound("regen");}}
player.onLadder=false;
if(isLadderAt(player.x,player.z)){player.onLadder=true;var ladderUp=keys[keybinds.KeyW]||(joyActive&&joyVec.y<-0.3);var ladderDown=keys[keybinds.KeyS]||(joyActive&&joyVec.y>0.3);if(ladderUp){player.vy=3.6;player.onGround=false;player.y+=3.6*dt;}else if(ladderDown){player.y-=3.6*dt;var fh=getFloorHeightY(player.x,player.z,player.y);if(player.y<=fh){player.y=fh;player.vy=0;player.onGround=true;}}else player.vy=0;var maxH=Math.max(topHeightAt(player.x,player.z),6.0);if(player.y>maxH+0.5)player.y=maxH+0.5;if(player.y<0)player.y=0;}
if(!player.onLadder){var floorH=getFloorHeightY(player.x,player.z,player.y);player.vy-=14*dt;player.y+=player.vy*dt;if(player.y<=floorH){player.y=floorH;player.vy=0;player.onGround=true;}else player.onGround=false;}
var sk=keybinds.ShiftLeft;
var sprinting=(keys[sk]||joySprintActive)&&!player.crouch&&!player.ads&&!player.reloading&&Math.abs(player.lean)<0.3;
player.sprinting=sprinting;if(sprinting)player.sprintProgress=Math.min(1,player.sprintProgress+dt*4);else player.sprintProgress=Math.max(0,player.sprintProgress-dt*4);
var sprintMul=1+player.sprintProgress*0.55,adsMul=1-player.adsProgress*0.55,crouchMul=1-player.crouchProgress*0.5,leanMul=1-Math.abs(player.lean)*0.35;var speed=3.6*adsMul*crouchMul*w.moveMul*sprintMul*leanMul;var mx=0,mz=0;
var aW=keybinds.KeyW,aS=keybinds.KeyS,aA=keybinds.KeyA,aD=keybinds.KeyD;
var kW=keys[aW]||keys["ArrowUp"],kS=keys[aS]||keys["ArrowDown"],kA=keys[aA]||keys["ArrowLeft"],kD=keys[aD]||keys["ArrowRight"];
if(kW){mx-=Math.sin(player.yaw);mz-=Math.cos(player.yaw);}if(kS){mx+=Math.sin(player.yaw);mz+=Math.cos(player.yaw);}if(kA){mx-=Math.cos(player.yaw);mz+=Math.sin(player.yaw);}if(kD){mx+=Math.cos(player.yaw);mz-=Math.sin(player.yaw);}
if(joyActive){var f=-joyVec.y,s=joyVec.x;mx+=-Math.sin(player.yaw)*f+Math.cos(player.yaw)*s;mz+=-Math.cos(player.yaw)*f-Math.sin(player.yaw)*s;}
var mag=Math.sqrt(mx*mx+mz*mz);var moving=false;
if(mag>0.001){moving=true;mx=mx/mag*speed*dt;mz=mz/mag*speed*dt;var r=sweepMovePlayer(player.x,player.z,mx,mz,dt,player.y);player.x=r.x;player.z=r.z;player.bobTimer+=dt*10*adsMul*crouchMul*sprintMul;player.stepTimer-=dt;if(player.stepTimer<=0&&player.onGround){player.stepTimer=(sprinting?0.28:0.4)/crouchMul;playSound(sprinting?"step_run":"step");}}else{player.bobTimer+=dt*2;player.stepTimer=0;}
player.moving=moving;if(moving)player.spread=Math.min(w.maxSpread,player.spread+dt*0.15);if(moving&&!player.ads&&settings.effects4d)triggerFovRush(sprinting?4.5:2.5);
var eyeY=EYE_STAND+(EYE_CROUCH-EYE_STAND)*player.crouchProgress;var bobY=Math.sin(player.bobTimer)*0.03*(moving?1:0.2)*(1-player.adsProgress*0.8)*(1-player.crouchProgress*0.5);var sh=fx.shakeAmount;var shX=(Math.random()-.5)*sh*.1,shY=(Math.random()-.5)*sh*.1,shZ=(Math.random()-.5)*sh*.1;var lOX=lRX*player.lean*lD,lOZ=lRZ*player.lean*lD;
worldCam.position.set(player.x+lOX+shX,eyeY+bobY+player.y+shY,player.z+lOZ+shZ);
worldCam.rotation.y=player.yaw+player.recoilYaw+(Math.random()-.5)*fx.shakeRot*.3;
worldCam.rotation.x=player.pitch+player.recoilPitch+(Math.random()-.5)*fx.shakeRot*.3;
worldCam.rotation.z=-player.lean*0.32;
viewCam.position.copy(worldCam.position);viewCam.quaternion.copy(worldCam.quaternion);viewCam.updateMatrixWorld(true);
var isAWP=(w.category==="sniper"&&player.adsProgress>0.7);var vm=viewModels[player.weapon];var sight=vm.userData.sight||new THREE.Vector3(0,0,-0.05);
var bobX=Math.sin(player.bobTimer)*0.012*(moving?1:0.2)*(1-player.adsProgress*0.95);var bobYW=Math.abs(Math.cos(player.bobTimer))*0.008*(moving?1:0.2)*(1-player.adsProgress*0.95);
var tX=-sight.x*WEAPON_SCALE,tY=-sight.y*WEAPON_SCALE-0.03,tZ=-0.50;
var bX=WEAPON_BASE_X,bY=WEAPON_BASE_Y,bZ=WEAPON_BASE_Z;if(isKnife){bX=0.28;bY=-0.24;bZ=-0.50;}
var adsK=player.adsProgress;
weaponGroup.position.x=bX*(1-adsK)+tX*adsK+bobX;
weaponGroup.position.y=bY*(1-adsK)+tY*adsK+bobYW;
weaponGroup.position.z=bZ*(1-adsK)+tZ*adsK;
var eqR=0,eqPX=0,eqPY=0;
if(player.equipTimer>0){var k=1-(player.equipTimer/player.equipDur);var ek=Math.sin(k*Math.PI);var ea=w.equipAnim;
if(ea==="pistol_draw"){eqR=ek*0.7;eqPY=-ek*0.10;}else if(ea==="smg_draw"){eqR=ek*0.8;eqPY=-ek*0.12;eqPX=ek*0.06;}else if(ea==="rifle_draw"){eqR=ek*1.0;eqPY=-ek*0.14;eqPX=ek*0.05;}else if(ea==="sniper_draw"){eqR=ek*1.2;eqPY=-ek*0.16;}else if(ea==="knife_draw"){eqR=ek*1.4;eqPX=ek*0.10;eqPY=-ek*0.08;}
weaponGroup.rotation.x+=eqR;weaponGroup.position.x+=eqPX;weaponGroup.position.y+=eqPY;}
if(isKnife&&!player.inspectActive&&player.knifeAnimT<=0&&player.equipTimer<=0){weaponGroup.rotation.x=0.22;weaponGroup.rotation.y=0.42;weaponGroup.rotation.z=-0.18;}
if(player.knifeAnimT>0){var k=1-player.knifeAnimT/player.knifeAnimDur;var rX,rY,rZ,pX,pY;if(k<0.30){var t=k/0.30,e=t*t;rX=0.22+e*0.75;rY=0.42-e*0.35;rZ=-0.18+e*0.55;pX=e*0.06;pY=e*0.06;}else if(k<0.55){var t=(k-0.30)/0.25,e=t<0.5?2*t*t:-1+(4-2*t)*t;rX=0.97-e*1.55;rY=0.07+e*0.30;rZ=0.37-e*0.75;pX=0.06-e*0.10;pY=0.06-e*0.03;}else{var t=(k-0.55)/0.45,e=1-Math.pow(1-t,3);rX=-0.58+e*0.80;rY=0.37-e*0.05;rZ=-0.38+e*0.20;pX=-0.04+e*0.04;pY=0.03;}
weaponGroup.rotation.x=rX;weaponGroup.rotation.y=rY;weaponGroup.rotation.z=rZ;weaponGroup.position.x+=pX;weaponGroup.position.y+=pY;}
else if(player.inspectActive){var k=1-player.inspectTimer/player.inspectDuration;var p=k*Math.PI*2;var style=player.inspectType;var rX=0,rY=0,rZ=0;
if(style==="pistol"){rY=Math.sin(p)*.9;rZ=Math.sin(k*Math.PI)*.6;rX=-.15+Math.sin(p*2)*.15;}
else if(style==="rifle"){rY=Math.sin(p)*.7;rZ=Math.sin(k*Math.PI)*.5;rX=-.25+Math.sin(p*1.5)*.2;}
else if(style==="smg"){rY=Math.sin(p)*1.0;rZ=Math.sin(k*Math.PI)*.8;rX=-.1+Math.cos(p*2)*.2;}
else if(style==="sniper"){rY=Math.sin(k*Math.PI*2)*.6;rZ=Math.sin(k*Math.PI)*.3;}
else if(style==="knife"){rY=Math.sin(p)*0.9;rZ=Math.sin(p*2)*0.7;rX=Math.cos(p)*0.35;}
weaponGroup.rotation.set(rX,rY,rZ);}
else if(player.reloading){var k=Math.sin(player.reloadAnim*Math.PI);weaponGroup.rotation.x=k*.7;weaponGroup.rotation.z=k*.3;weaponGroup.rotation.y=0;}
else if(!isKnife&&adsK<0.05){weaponGroup.rotation.x*=.85;weaponGroup.rotation.y*=.85;weaponGroup.rotation.z*=.85;}
else if(adsK>=0.05&&!isKnife){weaponGroup.rotation.x*=(1-adsK);weaponGroup.rotation.y*=(1-adsK);weaponGroup.rotation.z*=(1-adsK);}
weaponGroup.visible=!isAWP;if(player.hp<30&&settings.effects4d)triggerBloodVignette();}

var botAIFrame=0;
function updateBots(dt){botAIFrame++;var doAI=(botAIFrame%2===0||PERF_MODE);
for(var bi=0;bi<bots.length;bi++){var b=bots[bi];if(!b.alive)continue;
if(b.shootTimer>0)b.shootTimer-=dt;if(b.alerted>0)b.alerted-=dt;if(b.retreatCooldown>0)b.retreatCooldown-=dt;if(b.lastSeenAge<100)b.lastSeenAge+=dt*2;
b.animPhase+=dt*6*(b.def.speed/2.5);
if(typeof b.targetFacing==="number"){var diff=b.targetFacing-b.facing;while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;var ts=(b.def.turnSpeed||5)*(b.diffTurn||1);var maxTurn=ts*dt;if(Math.abs(diff)<=maxTurn)b.facing=b.targetFacing;else b.facing+=Math.sign(diff)*maxTurn;}
var parts=b.parts;if(parts){var isMoving=b.state!==BOT_STATE.PATROL||(b.path&&b.path.length>0);if(isMoving){var sw=Math.sin(b.animPhase)*0.35;if(parts.legL)parts.legL.rotation.x=sw;if(parts.legR)parts.legR.rotation.x=-sw;}}
if(!doAI)continue;
b.pathTimer-=dt*2;b.losTimer-=dt*2;b.wanderTimer-=dt*2;b.strafeTimer-=dt*2;
if(b.losTimer<=0){b.losTimer=0.15;var dxp=player.x-b.x,dzp=player.z-b.z;var d=Math.sqrt(dxp*dxp+dzp*dzp);var blindChance=b.def.blindChance||0.04;if(player.crouchProgress>0.5)blindChance+=0.10;blindChance=Math.max(0.005,Math.min(0.35,blindChance));var blindRoll=Math.random()<blindChance;
var angleToPlayer=Math.atan2(b.x-player.x,b.z-player.z);var angleDiff=angleToPlayer-b.facing;while(angleDiff>Math.PI)angleDiff-=Math.PI*2;while(angleDiff<-Math.PI)angleDiff+=Math.PI*2;
var inFov=Math.abs(angleDiff)<Math.PI*0.70;var losClear=hasLOS(b.x,b.z,player.x,player.z);var visionRange=b.def.vision*(b.diffVision||1);
b.hasLOS=!blindRoll&&inFov&&d<visionRange&&losClear;
if(b.hasLOS){b.lastSeenX=player.x;b.lastSeenZ=player.z;b.lastSeenAge=0;b.alerted=4.0;}}
var hpFrac=b.hp/b.maxHp;if(hpFrac<0.25&&b.lastSeenAge<2.5&&b.retreatCooldown<=0&&b.type!=="sniper"){b.state=BOT_STATE.RETREAT;b.retreatCooldown=6.0;}
var targetX=null,targetZ=null;var ddx=player.x-b.x,ddz=player.z-b.z;var distToPlayer=Math.sqrt(ddx*ddx+ddz*ddz);
if(b.state===BOT_STATE.RETREAT){var rdx=b.x-player.x,rdz=b.z-player.z;var rd=Math.sqrt(rdx*rdx+rdz*rdz)||1;targetX=b.x+rdx/rd*9;targetZ=b.z+rdz/rd*9;b.targetFacing=Math.atan2(b.x-player.x,b.z-player.z);if(b.retreatCooldown<=0||hpFrac>0.5){b.state=BOT_STATE.ATTACK;b.pathTimer=0;}}
else if(b.hasLOS){b.state=BOT_STATE.ATTACK;}
else if(b.lastSeenAge<7&&b.state!==BOT_STATE.INVESTIGATE){b.state=BOT_STATE.INVESTIGATE;}
else if(b.lastSeenAge>12&&b.state!==BOT_STATE.PATROL){b.state=BOT_STATE.PATROL;b.pathTimer=0;b.wanderTimer=0;}
if(b.state===BOT_STATE.ATTACK){var tLead=Math.min(0.35,distToPlayer/60);var predX=player.x+(b.lastPlayerVX||0)*tLead;var predZ=player.z+(b.lastPlayerVZ||0)*tLead;b.targetFacing=Math.atan2(b.x-predX,b.z-predZ);var preferred=b.type==="sniper"?14:(b.type==="heavy"?4:(b.type==="scout"?7:6));
if(distToPlayer<preferred+5&&distToPlayer>preferred-3){if(b.strafeTimer<=0){b.strafeDir*=-1;b.strafeTimer=1.2+Math.random()*1.6;}var rightX=-Math.sin(b.facing),rightZ=Math.cos(b.facing);var spd=b.def.speed*0.75*dt*2;var nx=b.x+rightX*b.strafeDir*spd,nz=b.z+rightZ*b.strafeDir*spd;if(canMoveBot(nx,b.z))b.x=nx;if(canMoveBot(b.x,nz))b.z=nz;}
if(distToPlayer>preferred+3){targetX=predX;targetZ=predZ;}else if(distToPlayer<preferred-2){targetX=b.x-(player.x-b.x);targetZ=b.z-(player.z-b.z);}
var aimDiff=b.targetFacing-b.facing;while(aimDiff>Math.PI)aimDiff-=Math.PI*2;while(aimDiff<-Math.PI)aimDiff+=Math.PI*2;
var aimed=Math.abs(aimDiff)<0.22;var clearShot=hasLOS(b.x,b.z,player.x,player.z);
if(aimed&&clearShot&&b.shootTimer<=0&&distToPlayer<b.def.vision*(b.diffVision||1)+8){
b.shootTimer=b.def.cooldown*(b.diffCooldown||1);
var baseAcc=b.def.accuracy*(b.diffAccuracy||1)*Math.max(0.15,1-distToPlayer/(b.def.vision+10));var acc=baseAcc*1.05;
playBotGunshot(b.x,b.z);
var gun=b.mesh.userData.gunGroup;if(gun&&gun.userData.flash){gun.userData.flash.intensity=5;var fl=gun.userData.flash;setTimeout(function(){if(fl)fl.intensity=0;},60);}
if(Math.random()<acc){var dmg=b.def.damage*(b.diffDamage||1)*(1-player.crouchProgress*0.15);player.hp-=dmg;damageFlash=0.2;player.lastDamageTime=performance.now()/1000;playSound("damage");triggerShake(1.2,0.025);triggerBloodVignette();var adx=b.x-player.x,adz=b.z-player.z;var dfwd=-Math.sin(player.yaw)*adx-Math.cos(player.yaw)*adz;var drgt=Math.cos(player.yaw)*adx-Math.sin(player.yaw)*adz;damageIndicators.push({angle:Math.atan2(drgt,dfwd),t:0,dur:0.9});if(player.hp<=0){player.hp=0;killPlayer(b.type);}}}}}
else if(b.state===BOT_STATE.INVESTIGATE){targetX=b.lastSeenX;targetZ=b.lastSeenZ;b.targetFacing=Math.atan2(b.x-targetX,b.z-targetZ);}
else{if(b.wanderTimer<=0){b.wanderTimer=4+Math.random()*5;for(var tries=0;tries<30;tries++){var ang=Math.random()*Math.PI*2;var rad=8+Math.random()*14;var wx=b.patrolAnchorX+Math.cos(ang)*rad;var wz=b.patrolAnchorZ+Math.sin(ang)*rad;if(wx>1.5&&wz>1.5&&wx<MAP_W-1.5&&wz<MAP_H-1.5&&canMoveBot(wx,wz)){b.wanderX=wx;b.wanderZ=wz;break;}}b.pathTimer=0;}targetX=b.wanderX;targetZ=b.wanderZ;b.targetFacing=Math.atan2(b.x-targetX,b.z-targetZ);}
if(targetX!==null){if(b.state!==BOT_STATE.ATTACK){if(b.pathTimer<=0||!b.path||b.path.length===0){b.pathTimer=0.9;var p=findPath(b.x,b.z,targetX,targetZ);if(p&&p.length>0)b.path=p;else b.path=[[targetX,targetZ]];}
if(b.path&&b.path.length>0){var wxy=b.path[0];var dxw=wxy[0]-b.x,dzw=wxy[1]-b.z;var dw=Math.sqrt(dxw*dxw+dzw*dzw);if(dw<0.25)b.path.shift();else{var step=Math.min(b.def.speed*(b.diffSpeed||1),dw)*dt*2;var ux=dxw/dw,uz=dzw/dw;var nnx=b.x+ux*step,nnz=b.z+uz*step;if(canMoveBot(nnx,b.z))b.x=nnx;if(canMoveBot(b.x,nnz))b.z=nnz;}}}}}
b.mesh.position.set(b.x,0,b.z);b.mesh.rotation.y=b.facing;var bobAmt=(b.state===BOT_STATE.ATTACK)?0.02:0.06;b.mesh.position.y=Math.abs(Math.sin(b.animPhase))*bobAmt;}
if(waveEnemiesLeft>0){var aliveCount=0;for(var bi2=0;bi2<bots.length;bi2++)if(bots[bi2].alive)aliveCount++;var shouldSpawn=waveTotal-killsThisWave-aliveCount;if(shouldSpawn>0&&Math.random()<dt*2)spawnWaveBot();}else if(waveCooldown>0){waveCooldown-=dt;if(waveCooldown<=0)startWave(waveNumber+1);}}
function updateGrenades(dt){for(var i=grenades.length-1;i>=0;i--){var g=grenades[i];g.vy-=14*dt;g.mesh.position.x+=g.vx*dt;g.mesh.position.y+=g.vy*dt;g.mesh.position.z+=g.vz*dt;if(g.mesh.position.y<=0.12){g.mesh.position.y=0.12;g.vy=-g.vy*0.4;g.vx*=0.7;g.vz*=0.7;}g.timer-=dt;if(g.timer<=0){explodeGrenade(g);grenades.splice(i,1);}}}
function updateExplosions(dt){for(var i=explosions.length-1;i>=0;i--){var e=explosions[i];e.t+=dt;var k=e.t/e.dur;e.light.intensity=10*(1-k);e.sphere.scale.setScalar(1+k*6);e.sphere.material.opacity=0.9*(1-k);if(e.t>=e.dur){scene.remove(e.light);scene.remove(e.sphere);explosions.splice(i,1);}}}
function updateCorpses(dt){for(var i=corpses.length-1;i>=0;i--){var c=corpses[i];c.t+=dt;if(c.t>=c.dur){scene.remove(c.mesh);corpses.splice(i,1);}}}

var fpsFrames=0,fpsTimer=0,fpsCurrent=0;
function updateFPS(dt){fpsFrames++;fpsTimer+=dt;if(fpsTimer>=0.5){fpsCurrent=Math.round(fpsFrames/fpsTimer);fpsFrames=0;fpsTimer=0;}}
function drawBloodVignette(W,H){if(fx.bloodVignette<=0.02)return;var g=octx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(.6,"rgba(120,0,0,"+(fx.bloodVignette*.3)+")");g.addColorStop(1,"rgba(180,0,0,"+(fx.bloodVignette*.7)+")");octx.fillStyle=g;octx.fillRect(0,0,W,H);}
function drawFlash(W,H){if(fx.flash<=0.02)return;var r=fx.flashColor[0],g=fx.flashColor[1],b=fx.flashColor[2];octx.fillStyle="rgba("+r+","+g+","+b+","+(fx.flash*.55)+")";octx.fillRect(0,0,W,H);}
function drawDamageIndicators(W,H){var cx=W/2,cy=H/2;var R=Math.min(W,H)*.32;for(var i=0;i<damageIndicators.length;i++){var ind=damageIndicators[i];var k=1-ind.t/ind.dur;var a=ind.angle;var x=cx+Math.sin(a)*R,y=cy-Math.cos(a)*R;octx.save();octx.translate(x,y);octx.rotate(a);octx.globalAlpha=k;octx.fillStyle="#ff2020";octx.beginPath();octx.moveTo(0,-18);octx.lineTo(-14,6);octx.lineTo(0,0);octx.lineTo(14,6);octx.closePath();octx.fill();octx.restore();}}
function getAWPScopeCache(W,H){if(awpScopeCache&&awpScopeCacheW===W&&awpScopeCacheH===H)return awpScopeCache;var c=document.createElement("canvas");c.width=W;c.height=H;var x=c.getContext("2d");var cx=W/2,cy=H/2,r=Math.min(W,H)*.42;x.fillStyle="rgba(0,0,0,.98)";x.beginPath();x.rect(0,0,W,H);x.arc(cx,cy,r,0,Math.PI*2,true);x.fill("evenodd");awpScopeCache=c;awpScopeCacheW=W;awpScopeCacheH=H;return c;}
function drawAWPScope(W,H){var cx=W/2,cy=H/2,r=Math.min(W,H)*.42;octx.drawImage(getAWPScopeCache(W,H),0,0);octx.strokeStyle="rgba(0,0,0,.95)";octx.lineWidth=4;octx.beginPath();octx.arc(cx,cy,r,0,Math.PI*2);octx.stroke();var gap=18;octx.strokeStyle="rgba(0,0,0,.95)";octx.lineWidth=2.5;octx.beginPath();octx.moveTo(cx-r+8,cy);octx.lineTo(cx-gap,cy);octx.moveTo(cx+gap,cy);octx.lineTo(cx+r-8,cy);octx.moveTo(cx,cy-r+8);octx.lineTo(cx,cy-gap);octx.moveTo(cx,cy+gap);octx.lineTo(cx,cy+r-8);octx.stroke();octx.fillStyle="rgba(0,255,60,1)";octx.beginPath();octx.arc(cx,cy,3,0,Math.PI*2);octx.fill();}
function drawCrosshairShape(cx,cy,style,size,thick,gap,color,showDot,outline){var baseLen=Math.min(overlay.width,overlay.height)*0.014*size;var S=Math.max(2,thick);if(style==="none"&&!showDot)return;var drawPass=function(sc,lw){octx.strokeStyle=sc;octx.lineWidth=lw;octx.beginPath();if(style==="cross"||style==="crossdot"){octx.moveTo(cx,cy-gap-baseLen);octx.lineTo(cx,cy-gap);octx.moveTo(cx,cy+gap);octx.lineTo(cx,cy+gap+baseLen);octx.moveTo(cx-gap-baseLen,cy);octx.lineTo(cx-gap,cy);octx.moveTo(cx+gap,cy);octx.lineTo(cx+gap+baseLen,cy);}else if(style==="circle"){octx.arc(cx,cy,gap+baseLen,0,Math.PI*2);}else if(style==="dot"){octx.arc(cx,cy,gap*0.1+2,0,Math.PI*2);}octx.stroke();};if(outline)drawPass("rgba(0,0,0,.85)",S+3);drawPass(color,S);if(showDot){if(outline){octx.fillStyle="rgba(0,0,0,.85)";octx.beginPath();octx.arc(cx,cy,S*0.85+1.2,0,Math.PI*2);octx.fill();}octx.fillStyle=color;octx.beginPath();octx.arc(cx,cy,S*0.85,0,Math.PI*2);octx.fill();}}
function drawCrosshair(){var W=overlay.width,H=overlay.height;var cx=W/2,cy=H/2;var w=WEAPON_DEFS[player.weapon];
if(player.weapon.indexOf("knife")===0){var color=settings.crosshairColor==="#00ff50"?"#ffffff":settings.crosshairColor;drawCrosshairShape(cx,cy,settings.crosshairStyle,settings.crosshairSize*0.85,settings.crosshairThickness,settings.crosshairGap,color,settings.crosshairDot,settings.crosshairOutline);return;}
if(player.adsProgress>0.7){if(w.sight==="scope")drawAWPScope(W,H);else{var dotR=Math.max(1.8,Math.min(W,H)*0.0022);octx.fillStyle="rgba(0,0,0,.9)";octx.beginPath();octx.arc(cx,cy,dotR+1.6,0,Math.PI*2);octx.fill();var dotColor=(w.sight==="aperture"||w.sight==="notch"||w.sight==="scope2x")?"#00ff50":"#ff3030";octx.fillStyle=dotColor;octx.beginPath();octx.arc(cx,cy,dotR,0,Math.PI*2);octx.fill();}return;}
var gap=settings.crosshairGap||6;if(settings.crosshairDynamic!==false){gap+=Math.min(15,player.spread*300+(player.moving?2:0)+(player.sprinting?4:0));}
var drawColor=settings.crosshairColor;if(hitMark>0)drawColor=hitMarkHeadshot?"#ffdc50":"#ff3c3c";
drawCrosshairShape(cx,cy,settings.crosshairStyle,settings.crosshairSize,settings.crosshairThickness,gap,drawColor,settings.crosshairDot,settings.crosshairOutline);}
function drawHUD(){var W=overlay.width,H=overlay.height;octx.clearRect(0,0,W,H);var bs=Math.min(W,H)*.03,pad=Math.min(W,H)*.02;
octx.fillStyle="rgba(0,0,0,.5)";octx.fillRect(W/2-95,8,190,50);octx.textAlign="center";octx.fillStyle="#fff";octx.font="bold "+Math.floor(bs*0.9)+"px Arial";octx.fillText("Счёт: "+score,W/2,30);octx.fillStyle="#ffcc44";octx.font="bold "+Math.floor(bs*.7)+"px Arial";if(waveEnemiesLeft>0)octx.fillText("Волна "+waveNumber+" — "+waveEnemiesLeft,W/2,48);else octx.fillText("Волна "+waveNumber+" ✓",W/2,48);octx.textAlign="left";
if(settings.showFps){octx.fillStyle="rgba(0,0,0,.6)";octx.fillRect(12,12,190,52);var color=fpsCurrent<30?"#ff3030":(fpsCurrent<50?"#ffcc00":"#22c922");octx.fillStyle=color;octx.font="bold 18px Consolas, monospace";octx.fillText(fpsCurrent+" FPS",20,34);octx.fillStyle="#a0e0ff";octx.font="bold 12px Consolas, monospace";var aliveC=0;for(var bi=0;bi<bots.length;bi++)if(bots[bi].alive)aliveC++;octx.fillText("Bots: "+aliveC+"/"+waveTotal+" · "+settings.botDifficulty,20,54);}
if(settings.ladderHint&&player.onLadder){octx.fillStyle="rgba(80,200,255,.85)";octx.font="bold "+Math.floor(bs*.85)+"px Arial";octx.textAlign="center";octx.fillText("🪜 W — вверх · S — вниз",W/2,H*0.42);octx.textAlign="left";}
if(!settings.boostFps&&!PERF_MODE)drawBloodVignette(W,H);
drawDamageIndicators(W,H);
if(settings.showDmgNum){for(var di=0;di<hitDamageNumbers.length;di++){var dmg=hitDamageNumbers[di];var p=new THREE.Vector3(dmg.x,dmg.y,dmg.z);p.project(worldCam);if(p.z>1)continue;var sx=(p.x*0.5+0.5)*W,sy=(-p.y*0.5+0.5)*H;var k=1-dmg.t/dmg.dur;octx.globalAlpha=k;octx.font="bold "+(dmg.isHead?22:16)+"px Arial";octx.fillStyle=dmg.isHead?"#ff4444":"#ffcc44";octx.strokeStyle="rgba(0,0,0,.9)";octx.lineWidth=3;octx.textAlign="center";octx.strokeText("-"+dmg.val,sx,sy);octx.fillText("-"+dmg.val,sx,sy);octx.globalAlpha=1;octx.textAlign="left";}}
drawCrosshair();
octx.fillStyle="rgba(0,0,0,.6)";octx.fillRect(pad,H-pad-70,260,66);octx.fillStyle="#ddd";octx.font="bold "+bs+"px Arial";octx.fillText("HP",pad+15,H-pad-42);octx.fillStyle="#111";octx.fillRect(pad+70,H-pad-58,175,20);var hg=octx.createLinearGradient(pad+70,0,pad+245,0);if(player.hp>30){hg.addColorStop(0,"#22c922");hg.addColorStop(1,"#66ff66");}else{hg.addColorStop(0,"#cc2222");hg.addColorStop(1,"#ff5555");}octx.fillStyle=hg;octx.fillRect(pad+70,H-pad-58,175*(player.hp/player.maxHp),20);octx.strokeStyle="rgba(255,255,255,.4)";octx.lineWidth=1;octx.strokeRect(pad+70,H-pad-58,175,20);octx.fillStyle="rgba(0,0,0,.5)";octx.fillRect(pad,H-pad-118,130,40);octx.fillStyle="#ff9944";octx.font="bold "+Math.floor(bs*.85)+"px Arial";octx.fillText("Убийств: "+kills,pad+10,H-pad-92);
var w=WEAPON_DEFS[player.weapon];octx.fillStyle="rgba(0,0,0,.6)";octx.fillRect(W-pad-220,H-pad-70,210,66);
if(player.weapon.indexOf("knife")===0){octx.fillStyle="#ddd";octx.font="bold "+bs+"px Arial";octx.fillText("🔪 "+w.name,W-pad-200,H-pad-42);octx.font="bold "+Math.floor(bs*.7)+"px Arial";octx.fillStyle="#ffcc44";octx.fillText("ЛКМ: быстрый · ПКМ: сильный",W-pad-200,H-pad-12);}
else if(player.reloading){var k=1-player.reloadTimer/player.reloadDuration;octx.fillStyle="#ffcc44";octx.font="bold "+bs+"px Arial";octx.fillText("ПЕРЕЗАРЯДКА",W-pad-200,H-pad-42);octx.fillStyle="#222";octx.fillRect(W-pad-200,H-pad-30,180,10);octx.fillStyle="#ffcc44";octx.fillRect(W-pad-200,H-pad-30,180*k,10);}
else{octx.fillStyle="#ddd";octx.font="bold "+bs+"px Arial";octx.fillText(w.name,W-pad-200,H-pad-42);octx.font="bold "+Math.floor(bs*1.4)+"px Arial";var ammo=player.ammo[player.weapon]||0;octx.fillStyle=ammo<=w.mag*.2?"#ff5555":"#fff";octx.fillText(ammo+" / "+w.mag,W-pad-130,H-pad-12);}
if(killFeed.length>0){var fx2=W-pad-10;var fy=H*0.42;octx.textAlign="right";for(var ki=killFeed.length-1;ki>=0;ki--){var kf=killFeed[ki];var alpha=kf.t<kf.dur-0.5?1:(kf.dur-kf.t)/0.5;octx.globalAlpha=alpha;octx.font="bold "+Math.floor(bs*.9)+"px Arial";octx.fillStyle=kf.color;octx.fillText(kf.text,fx2-4,fy);fy+=bs*1.6;}octx.globalAlpha=1;octx.textAlign="left";}
if(settings.showMinimap){var size=Math.min(W,H)*.24,mx=W-size-pad,my=H-pad-size-70,cell=size/MAP_W;octx.fillStyle="rgba(0,0,0,.7)";octx.fillRect(mx-3,my-3,size+6,size+6);for(var z=0;z<MAP_H;z++)for(var x=0;x<MAP_W;x++){var t=MAP[z][x];if(t===0)continue;octx.fillStyle=t===1?"#8898a8":t===2?"#6a7890":t===3?"#a8b0b8":t===5?"#a07040":t===6?"#6a4020":"#666";octx.fillRect(mx+x*cell,my+z*cell,cell,cell);}for(var bi=0;bi<bots.length;bi++){if(!bots[bi].alive)continue;octx.fillStyle="#ff2020";octx.beginPath();octx.arc(mx+bots[bi].x*cell,my+bots[bi].z*cell,Math.max(2,cell*.35),0,Math.PI*2);octx.fill();}octx.fillStyle="#33aaff";octx.beginPath();octx.arc(mx+player.x*cell,my+player.z*cell,Math.max(2.5,cell*.4),0,Math.PI*2);octx.fill();}
if(damageFlash>0){octx.fillStyle="rgba(255,0,0,"+(damageFlash*1.5)+")";octx.fillRect(0,0,W,H);}
drawFlash(W,H);}

var selectedMapKey="harbor",lobbyActive=true;
var selectedDifficulty={};
function buildMapSelect(){var grid=document.getElementById("msmGrid");grid.innerHTML="";var keys=Object.keys(MAPS);for(var mi=0;mi<keys.length;mi++){(function(key){var cfg=MAPS[key];var card=document.createElement("div");card.className="msm-card"+(key===selectedMapKey?" active":"");var tags=(cfg.tags||[]).map(function(t){return '<span class="msm-tag">'+t+'</span>';}).join("");var curDiff=selectedDifficulty[key]||cfg.defaultDifficulty||"normal";
var info=document.createElement("div");info.className="msm-info";info.innerHTML='<div class="msm-name">'+cfg.icon+' '+cfg.name+'</div><div class="msm-desc">'+cfg.desc+'</div><div class="msm-tags">'+tags+'<span class="msm-tag">'+cfg.tag+'</span><span class="msm-tag" style="color:'+cfg.diffColor+'">'+cfg.diff+'</span></div>';
card.appendChild(info);
var diffDiv=document.createElement("div");diffDiv.className="msm-difficulty";diffDiv.innerHTML='<label>Сложность ботов</label><div class="msm-diff-seg"><button data-diff="easy" class="'+(curDiff==='easy'?'active easy':'')+'">ЛЕГКО</button><button data-diff="normal" class="'+(curDiff==='normal'?'active normal':'')+'">НОРМА</button><button data-diff="hard" class="'+(curDiff==='hard'?'active hard':'')+'">СЛОЖНО</button><button data-diff="insane" class="'+(curDiff==='insane'?'active insane':'')+'">БЕЗУМИЕ</button></div>';
card.appendChild(diffDiv);
card.addEventListener("click",function(e){if(e.target&&e.target.dataset&&e.target.dataset.diff){e.stopPropagation();selectedDifficulty[key]=e.target.dataset.diff;buildMapSelect();return;}selectedMapKey=key;var cards=document.querySelectorAll(".msm-card");for(var ci=0;ci<cards.length;ci++)cards[ci].classList.remove("active");card.classList.add("active");});
grid.appendChild(card);})(keys[mi]);}}
document.getElementById("btnSelectMap").addEventListener("click",function(){buildMapSelect();mapSelectEl.classList.add("open");});
document.getElementById("btnCloseMapSelect").addEventListener("click",function(){mapSelectEl.classList.remove("open");});
mapSelectEl.addEventListener("click",function(e){if(e.target===mapSelectEl)mapSelectEl.classList.remove("open");});
document.getElementById("btnStartGame").addEventListener("click",function(){try{lobbyActive=false;lobbyEl.classList.remove("open");mapSelectEl.classList.remove("open");currentMapKey=selectedMapKey;settings.botDifficulty=selectedDifficulty[currentMapKey]||MAPS[currentMapKey].defaultDifficulty||"normal";saveSettings();buildWorld(currentMapKey);resetGame();if(!isTouch)safeRequestPointerLock(canvas);if(settings.autoFullscreen)setTimeout(function(){safeRequestFullscreen(document.documentElement);},80);setTimeout(onResize,300);}catch(err){window.__showErr&&window.__showErr("startGame: "+(err.stack||err.message));console.error(err);}});
function showLobby(){lobbyActive=true;lobbyEl.classList.add("open");safeExitPointerLock();syncLobbyToggles();updateLobbyStats();}
function exitToLobby(){for(var i=0;i<bots.length;i++)scene.remove(bots[i].mesh);for(var i=0;i<corpses.length;i++)scene.remove(corpses[i].mesh);for(var i=0;i<grenades.length;i++)scene.remove(grenades[i].mesh);for(var i=0;i<explosions.length;i++){scene.remove(explosions[i].light);scene.remove(explosions[i].sphere);}for(var i=0;i<pickups.length;i++){scene.remove(pickups[i].mesh);scene.remove(pickups[i].light);}clearSmoke();bots=[];corpses=[];grenades=[];explosions=[];pickups=[];gameOver=false;corpseColliders.length=0;closeDeathScreen();showLobby();}

var tabGeneral=document.getElementById("tabGeneral"),tabCrosshair=document.getElementById("tabCrosshair"),tabControls=document.getElementById("tabControls"),tabAudio=document.getElementById("tabAudio"),tabKeybinds=document.getElementById("tabKeybinds");
var tabGeneralContent=document.getElementById("tabGeneralContent"),tabCrosshairContent=document.getElementById("tabCrosshairContent"),tabControlsContent=document.getElementById("tabControlsContent"),tabAudioContent=document.getElementById("tabAudioContent"),tabKeybindsContent=document.getElementById("tabKeybindsContent");
function selectTab(w){var tabs=[tabGeneral,tabCrosshair,tabControls,tabAudio,tabKeybinds];var contents=[tabGeneralContent,tabCrosshairContent,tabControlsContent,tabAudioContent,tabKeybindsContent];for(var i=0;i<tabs.length;i++)tabs[i].classList.remove("active");for(var i=0;i<contents.length;i++)contents[i].classList.remove("active");if(w==="crosshair"){tabCrosshair.classList.add("active");tabCrosshairContent.classList.add("active");drawChPreview();}else if(w==="controls"){tabControls.classList.add("active");tabControlsContent.classList.add("active");}else if(w==="audio"){tabAudio.classList.add("active");tabAudioContent.classList.add("active");}else if(w==="keys"){tabKeybinds.classList.add("active");tabKeybindsContent.classList.add("active");}else{tabGeneral.classList.add("active");tabGeneralContent.classList.add("active");}}
tabGeneral.addEventListener("click",function(){selectTab("general");});tabCrosshair.addEventListener("click",function(){selectTab("crosshair");});tabControls.addEventListener("click",function(){selectTab("controls");});tabAudio.addEventListener("click",function(){selectTab("audio");});tabKeybinds.addEventListener("click",function(){selectTab("keys");});
var listeningAction=null;var kbHint=document.getElementById("kbHint");
function formatKeyLabel(c){if(c==="Space")return"Space";if(c==="ControlLeft")return"Ctrl";if(c==="ShiftLeft")return"Shift";if(c==="Escape")return"Escape";if(c.indexOf("Key")===0)return c.substring(3);if(c.indexOf("Digit")===0)return c.substring(5);return c;}
function updateAllKeybindButtons(){document.querySelectorAll(".kb-key").forEach(function(btn){var a=btn.dataset.action,b=keybinds[a]||a;btn.textContent=formatKeyLabel(b);btn.classList.remove("listening");});}
document.querySelectorAll(".kb-key").forEach(function(btn){btn.addEventListener("click",function(e){e.stopPropagation();if(listeningAction)document.querySelectorAll(".kb-key").forEach(function(b){b.classList.remove("listening");});listeningAction=btn.dataset.action;btn.textContent="…";btn.classList.add("listening");kbHint.classList.add("show");});});
window.addEventListener("keydown",function(e){if(!listeningAction)return;e.preventDefault();e.stopPropagation();var c=e.code,ex=getActionByKey(c);if(ex&&ex!==listeningAction)keybinds[ex]=keybinds[listeningAction];keybinds[listeningAction]=c;saveKeybinds();updateAllKeybindButtons();listeningAction=null;kbHint.classList.remove("show");},true);
document.getElementById("btnResetKeys").addEventListener("click",function(){if(!confirm("Сбросить?"))return;keybinds=Object.assign({},DEFAULT_KEYBINDS);saveKeybinds();updateAllKeybindButtons();});
var sensRange=document.getElementById("sensRange"),sensVal=document.getElementById("sensVal"),sniperSensRange=document.getElementById("sniperSensRange"),sniperSensVal=document.getElementById("sniperSensVal"),fovSeg=document.getElementById("fovSeg"),qualitySeg=document.getElementById("qualitySeg"),autoFireTgl=document.getElementById("autoFireTgl"),showFpsTgl=document.getElementById("showFpsTgl"),showMinimapTgl=document.getElementById("showMinimapTgl"),showBotHpTgl=document.getElementById("showBotHpTgl"),showDmgNumTgl=document.getElementById("showDmgNumTgl"),effects4dTgl=document.getElementById("effects4dTgl"),soundTgl=document.getElementById("soundTgl"),boostTgl=document.getElementById("boostTgl"),resScaleRange=document.getElementById("resScaleRange"),resScaleVal=document.getElementById("resScaleVal"),autoBalanceTgl=document.getElementById("autoBalanceTgl"),botDiffSeg=document.getElementById("botDiffSeg");
var masterVolRange=document.getElementById("masterVolRange"),masterVolVal=document.getElementById("masterVolVal");
var effectsVolRange=document.getElementById("effectsVolRange"),effectsVolVal=document.getElementById("effectsVolVal");
var footstepVolRange=document.getElementById("footstepVolRange"),footstepVolVal=document.getElementById("footstepVolVal");
var chStyleSeg=document.getElementById("chStyleSeg"),chSizeRange=document.getElementById("chSizeRange"),chSizeVal=document.getElementById("chSizeVal"),chThickRange=document.getElementById("chThickRange"),chThickVal=document.getElementById("chThickVal"),chGapRange=document.getElementById("chGapRange"),chGapVal=document.getElementById("chGapVal"),chColorSwatches=document.getElementById("chColorSwatches"),chColorPicker=document.getElementById("chColorPicker"),chDotTgl=document.getElementById("chDotTgl"),chOutlineTgl=document.getElementById("chOutlineTgl"),chDynamicTgl=document.getElementById("chDynamicTgl"),chPreview=document.getElementById("chPreview");
var smokeTgl=document.getElementById("smokeTgl"),ladderHintTgl=document.getElementById("ladderHintTgl");
var CH_COLORS=["#00ff50","#00ffff","#ffffff","#ff3080","#ffff00","#ff2020","#ff8000","#8000ff"];
function buildColorSwatches(){chColorSwatches.innerHTML="";for(var ci=0;ci<CH_COLORS.length;ci++){(function(c){var b=document.createElement("button");b.style.background=c;b.dataset.color=c;if(settings.crosshairColor===c)b.classList.add("active");b.addEventListener("click",function(){settings.crosshairColor=c;saveSettings();buildColorSwatches();drawChPreview();chColorPicker.value=c;});chColorSwatches.appendChild(b);})(CH_COLORS[ci]);}}
buildColorSwatches();
function drawChPreview(){var c=chPreview;if(!c)return;var x=c.getContext("2d");x.clearRect(0,0,c.width,c.height);x.fillStyle="#0d0d15";x.fillRect(0,0,c.width,c.height);var cx=c.width/2,cy=c.height/2;var style=settings.crosshairStyle,size=settings.crosshairSize,thick=settings.crosshairThickness,gap=settings.crosshairGap,color=settings.crosshairColor,showDot=settings.crosshairDot,outline=settings.crosshairOutline;var baseLen=10*size;var drawPass=function(sc,lw){x.strokeStyle=sc;x.lineWidth=lw;x.beginPath();if(style==="cross"||style==="crossdot"){x.moveTo(cx,cy-gap-baseLen);x.lineTo(cx,cy-gap);x.moveTo(cx,cy+gap);x.lineTo(cx,cy+gap+baseLen);x.moveTo(cx-gap-baseLen,cy);x.lineTo(cx-gap,cy);x.moveTo(cx+gap,cy);x.lineTo(cx+gap+baseLen,cy);}else if(style==="circle"){x.arc(cx,cy,gap+baseLen,0,Math.PI*2);}else if(style==="dot"){x.arc(cx,cy,gap*0.1+2,0,Math.PI*2);}x.stroke();};if(outline)drawPass("rgba(0,0,0,.85)",thick+3);drawPass(color,thick);if(showDot){if(outline){x.fillStyle="rgba(0,0,0,.85)";x.beginPath();x.arc(cx,cy,thick*0.85+1.2,0,Math.PI*2);x.fill();}x.fillStyle=color;x.beginPath();x.arc(cx,cy,thick*0.85,0,Math.PI*2);x.fill();}}
function syncSettingsUI(){sensRange.value=settings.sensitivity;sensVal.textContent=settings.sensitivity.toFixed(2)+"×";sniperSensRange.value=settings.sniperSensitivity;sniperSensVal.textContent=settings.sniperSensitivity.toFixed(2)+"×";for(var i=0;i<fovSeg.querySelectorAll("button").length;i++){var b=fovSeg.querySelectorAll("button")[i];b.classList.toggle("active",Number(b.dataset.val)===settings.fov);}for(var i=0;i<qualitySeg.querySelectorAll("button").length;i++){var b=qualitySeg.querySelectorAll("button")[i];b.classList.toggle("active",Number(b.dataset.val)===settings.quality);}autoFireTgl.classList.toggle("on",settings.autoFire);showFpsTgl.classList.toggle("on",settings.showFps);showMinimapTgl.classList.toggle("on",settings.showMinimap);showBotHpTgl.classList.toggle("on",settings.showBotHp);showDmgNumTgl.classList.toggle("on",settings.showDmgNum);effects4dTgl.classList.toggle("on",settings.effects4d);soundTgl.classList.toggle("on",settings.sound);autoBalanceTgl.classList.toggle("on",settings.autoBalance);boostTgl.classList.toggle("on",settings.boostFps);resScaleRange.value=settings.resolutionScale;resScaleVal.textContent=settings.resolutionScale+"%";masterVolRange.value=settings.masterVolume;masterVolVal.textContent=settings.masterVolume+"%";effectsVolRange.value=settings.effectsVolume;effectsVolVal.textContent=settings.effectsVolume+"%";footstepVolRange.value=settings.footstepVolume;footstepVolVal.textContent=settings.footstepVolume+"%";for(var i=0;i<chStyleSeg.querySelectorAll("button").length;i++){var b=chStyleSeg.querySelectorAll("button")[i];b.classList.toggle("active",b.dataset.val===settings.crosshairStyle);}chSizeRange.value=settings.crosshairSize;chSizeVal.textContent=Number(settings.crosshairSize).toFixed(1)+"×";chThickRange.value=settings.crosshairThickness;chThickVal.textContent=settings.crosshairThickness;chGapRange.value=settings.crosshairGap;chGapVal.textContent=settings.crosshairGap;chDotTgl.classList.toggle("on",settings.crosshairDot);chOutlineTgl.classList.toggle("on",settings.crosshairOutline);chDynamicTgl.classList.toggle("on",settings.crosshairDynamic);chColorPicker.value=settings.crosshairColor;for(var i=0;i<botDiffSeg.querySelectorAll("button").length;i++){var b=botDiffSeg.querySelectorAll("button")[i];b.classList.toggle("active",b.dataset.val===settings.botDifficulty);}smokeTgl.classList.toggle("on",settings.smoke);ladderHintTgl.classList.toggle("on",settings.ladderHint);buildColorSwatches();drawChPreview();updateAllKeybindButtons();syncLobbyToggles();}
function syncLobbyToggles(){var map={autoFire:"lbAutoFire",boostFps:"lbBoost",showMinimap:"lbMinimap",showBotHp:"lbBotHp",sound:"lbSound",autoBalance:"lbAutoBalance"};for(var key in map){var el=document.getElementById(map[key]);if(!el)continue;var on=!!settings[key];el.classList.toggle("active",on);var v=el.querySelector(".lt-val");if(v)v.textContent=on?"ВКЛ":"ВЫКЛ";}}
document.querySelectorAll(".lobby-toggle").forEach(function(el){el.addEventListener("click",function(){var key=el.dataset.toggle;if(key){settings[key]=!settings[key];saveSettings();syncLobbyToggles();syncSettingsUI();}});});
syncSettingsUI();
sensRange.addEventListener("input",function(){settings.sensitivity=Number(sensRange.value);sensVal.textContent=settings.sensitivity.toFixed(2)+"×";saveSettings();});
sniperSensRange.addEventListener("input",function(){settings.sniperSensitivity=Number(sniperSensRange.value);sniperSensVal.textContent=settings.sniperSensitivity.toFixed(2)+"×";saveSettings();});
fovSeg.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;settings.fov=Number(b.dataset.val);saveSettings();syncSettingsUI();applySettings();});
qualitySeg.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;settings.quality=Number(b.dataset.val);saveSettings();syncSettingsUI();applySettings();});
botDiffSeg.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;settings.botDifficulty=b.dataset.val;saveSettings();syncSettingsUI();});
autoFireTgl.addEventListener("click",function(){settings.autoFire=!settings.autoFire;autoFireTgl.classList.toggle("on",settings.autoFire);saveSettings();syncLobbyToggles();});
autoBalanceTgl.addEventListener("click",function(){settings.autoBalance=!settings.autoBalance;autoBalanceTgl.classList.toggle("on",settings.autoBalance);saveSettings();syncLobbyToggles();});
showFpsTgl.addEventListener("click",function(){settings.showFps=!settings.showFps;showFpsTgl.classList.toggle("on",settings.showFps);saveSettings();});
showMinimapTgl.addEventListener("click",function(){settings.showMinimap=!settings.showMinimap;showMinimapTgl.classList.toggle("on",settings.showMinimap);saveSettings();syncLobbyToggles();});
showBotHpTgl.addEventListener("click",function(){settings.showBotHp=!settings.showBotHp;showBotHpTgl.classList.toggle("on",settings.showBotHp);saveSettings();syncLobbyToggles();});
showDmgNumTgl.addEventListener("click",function(){settings.showDmgNum=!settings.showDmgNum;showDmgNumTgl.classList.toggle("on",settings.showDmgNum);saveSettings();});
effects4dTgl.addEventListener("click",function(){settings.effects4d=!settings.effects4d;effects4dTgl.classList.toggle("on",settings.effects4d);saveSettings();});
smokeTgl.addEventListener("click",function(){settings.smoke=!settings.smoke;smokeTgl.classList.toggle("on",settings.smoke);saveSettings();});
ladderHintTgl.addEventListener("click",function(){settings.ladderHint=!settings.ladderHint;ladderHintTgl.classList.toggle("on",settings.ladderHint);saveSettings();});
soundTgl.addEventListener("click",function(){settings.sound=!settings.sound;soundTgl.classList.toggle("on",settings.sound);saveSettings();syncLobbyToggles();if(settings.sound){initAudio();playSound("hit");}});
masterVolRange.addEventListener("input",function(){settings.masterVolume=Number(masterVolRange.value);masterVolVal.textContent=settings.masterVolume+"%";saveSettings();});
effectsVolRange.addEventListener("input",function(){settings.effectsVolume=Number(effectsVolRange.value);effectsVolVal.textContent=settings.effectsVolume+"%";saveSettings();});
footstepVolRange.addEventListener("input",function(){settings.footstepVolume=Number(footstepVolRange.value);footstepVolVal.textContent=settings.footstepVolume+"%";saveSettings();});
resScaleRange.addEventListener("input",function(){settings.resolutionScale=Number(resScaleRange.value);resScaleVal.textContent=settings.resolutionScale+"%";saveSettings();applySettings();});
boostTgl.addEventListener("click",function(){settings.boostFps=!settings.boostFps;boostTgl.classList.toggle("on",settings.boostFps);saveSettings();syncLobbyToggles();applySettings();});
chStyleSeg.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;settings.crosshairStyle=b.dataset.val;saveSettings();syncSettingsUI();});
chSizeRange.addEventListener("input",function(){settings.crosshairSize=Number(chSizeRange.value);chSizeVal.textContent=settings.crosshairSize.toFixed(1)+"×";saveSettings();drawChPreview();});
chThickRange.addEventListener("input",function(){settings.crosshairThickness=Number(chThickRange.value);chThickVal.textContent=settings.crosshairThickness;saveSettings();drawChPreview();});
chGapRange.addEventListener("input",function(){settings.crosshairGap=Number(chGapRange.value);chGapVal.textContent=settings.crosshairGap;saveSettings();drawChPreview();});
chColorPicker.addEventListener("input",function(){settings.crosshairColor=chColorPicker.value;saveSettings();buildColorSwatches();drawChPreview();});
chDotTgl.addEventListener("click",function(){settings.crosshairDot=!settings.crosshairDot;chDotTgl.classList.toggle("on",settings.crosshairDot);saveSettings();drawChPreview();});
chOutlineTgl.addEventListener("click",function(){settings.crosshairOutline=!settings.crosshairOutline;chOutlineTgl.classList.toggle("on",settings.crosshairOutline);saveSettings();drawChPreview();});
chDynamicTgl.addEventListener("click",function(){settings.crosshairDynamic=!settings.crosshairDynamic;chDynamicTgl.classList.toggle("on",settings.crosshairDynamic);saveSettings();});
function openSettings(){safeExitPointerLock();settingsEl.classList.add("open");setTimeout(function(){safeExitPointerLock();},50);clearActiveTouch();syncSettingsUI();}
function closeSettings(){settingsEl.classList.remove("open");clearKeys();}
document.getElementById("btnSettingsAlways").addEventListener("click",function(e){e.stopPropagation();openSettings();});
document.getElementById("btnCloseSettings").addEventListener("click",closeSettings);
document.getElementById("btnLobbySettings").addEventListener("click",function(e){e.stopPropagation();openSettings();});
document.getElementById("btnResetSettings").addEventListener("click",function(){if(!confirm("Сбросить всё?"))return;settings=Object.assign({},DEFAULTS);keybinds=Object.assign({},DEFAULT_KEYBINDS);saveSettings();saveKeybinds();syncSettingsUI();applySettings();updateAllKeybindButtons();});
document.getElementById("btnExitToLobby").addEventListener("click",function(){closeSettings();exitToLobby();});
settingsEl.addEventListener("click",function(e){if(e.target===settingsEl)closeSettings();});

var joyVec={x:0,y:0};var joyActive=false,joyId=null,lookId=null,lookLastX=0,lookLastY=0,joySprintActive=false;
var joystickEl=document.getElementById("joystick"),joyKnob=document.getElementById("joyKnob");
function getJoyCenter(){var r=joystickEl.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,r:r.width/2};}
function applyJoyMove(cx,cy){var c=getJoyCenter();var dx=cx-c.x,dy=cy-c.y;var mR=c.r*0.65;var l=Math.sqrt(dx*dx+dy*dy);if(l>mR){dx=dx/l*mR;dy=dy/l*mR;}joyKnob.style.transform="translate("+dx+"px, "+dy+"px)";joyVec.x=dx/mR;joyVec.y=dy/mR;joySprintActive=Math.sqrt(joyVec.x*joyVec.x+joyVec.y*joyVec.y)>0.88;}
function resetJoyKnob(){joyKnob.style.transform="translate(0,0)";joyVec.x=0;joyVec.y=0;joySprintActive=false;}
var mobileLeanL=false,mobileLeanR=false;
function clearActiveTouch(){joyActive=false;joyId=null;lookId=null;resetJoyKnob();}
if(isTouch){joystickEl.addEventListener("touchstart",function(e){if(editMode||anyModalOpen())return;e.preventDefault();e.stopPropagation();var t=e.changedTouches[0];joyId=t.identifier;joyActive=true;applyJoyMove(t.clientX,t.clientY);},{passive:false});
canvas.addEventListener("touchstart",function(e){if(anyModalOpen())return;for(var i=0;i<e.changedTouches.length;i++){var t=e.changedTouches[i];if(t.clientX>window.innerWidth*0.35&&lookId===null&&t.identifier!==joyId){lookId=t.identifier;lookLastX=t.clientX;lookLastY=t.clientY;}}},{passive:false});
document.addEventListener("touchmove",function(e){if(editMode)return;if(anyModalOpen())return;for(var i=0;i<e.changedTouches.length;i++){var t=e.changedTouches[i];if(t.identifier===joyId){e.preventDefault();applyJoyMove(t.clientX,t.clientY);}if(t.identifier===lookId){e.preventDefault();var dx=t.clientX-lookLastX,dy=t.clientY-lookLastY;dx=Math.max(-80,Math.min(80,dx));dy=Math.max(-80,Math.min(80,dy));var sm=1;if(player.weapon==="sniper_longshot"&&player.adsProgress>0.7)sm=settings.sniperSensitivity;var am=1-player.adsProgress*0.6;player.yaw-=dx*0.005*settings.sensitivity*am*sm;player.pitch-=dy*0.005*settings.sensitivity*am*sm;player.pitch=Math.max(-Math.PI/2+.05,Math.min(Math.PI/2-.05,player.pitch));lookLastX=t.clientX;lookLastY=t.clientY;}}},{passive:false});
var et=function(e){for(var i=0;i<e.changedTouches.length;i++){var t=e.changedTouches[i];if(t.identifier===joyId){joyActive=false;joyId=null;resetJoyKnob();}if(t.identifier===lookId)lookId=null;}};
document.addEventListener("touchend",et);document.addEventListener("touchcancel",et);
var mkBtn=function(id,dn,up){var el=document.getElementById(id);if(!el)return;el.addEventListener("touchstart",function(e){if(editMode||anyModalOpen())return;e.preventDefault();e.stopPropagation();el.classList.add("pressed");dn&&dn();},{passive:false});el.addEventListener("touchend",function(){el.classList.remove("pressed");up&&up();});el.addEventListener("touchcancel",function(){el.classList.remove("pressed");up&&up();});};
var btnShoot=document.getElementById("btnShoot");var shootId=null,shootTimer=null;
btnShoot.addEventListener("touchstart",function(e){if(editMode||anyModalOpen())return;e.preventDefault();e.stopPropagation();shootId=e.changedTouches[0].identifier;btnShoot.classList.add("pressed");if(player.weapon.indexOf("knife")===0)knifeAttack(false);else{shootPlayer();var w=WEAPON_DEFS[player.weapon];if(settings.autoFire&&w.auto)shootTimer=setInterval(function(){shootPlayer();},w.cooldown*1000);}},{passive:false});
var stopShoot=function(e){for(var i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===shootId){shootId=null;btnShoot.classList.remove("pressed");clearInterval(shootTimer);}}};
document.addEventListener("touchend",stopShoot);document.addEventListener("touchcancel",stopShoot);
mkBtn("btnInspect",function(){startInspect();});
mkBtn("btnLeanL",function(){mobileLeanL=true;},function(){mobileLeanL=false;});
mkBtn("btnLeanR",function(){mobileLeanR=true;},function(){mobileLeanR=false;});
mkBtn("btnReload",function(){if(gameOver)resetGame();else if(player.weapon.indexOf("knife")!==0)startReload();});
mkBtn("btnJump",function(){if(player.onGround&&!gameOver&&!player.onLadder){player.vy=JUMP_VELOCITY;player.onGround=false;}});
mkBtn("btnCrouch",function(){setCrouch(!player.crouch);});
mkBtn("btnGrenade",function(){throwGrenade();});
mkBtn("btnADS",function(){setADS(!player.ads);});
mkBtn("btnWeapon",function(){openWeaponMenu();});
mkBtn("btnSlot1",function(){if(!gameOver)switchWeapon(settings.slot1||"pistol_p250");});
mkBtn("btnSlot2",function(){if(!gameOver)switchWeapon(settings.slot2||"rifle_vandal");});
mkBtn("btnSlot3",function(){if(!gameOver)switchWeapon(settings.slot3||"knife_tanto");});
document.getElementById("btnFs").addEventListener("click",function(e){e.stopPropagation();toggleFullscreen();setTimeout(onResize,300);});
document.getElementById("btnFs").addEventListener("touchstart",function(e){if(editMode||anyModalOpen())return;e.preventDefault();e.stopPropagation();toggleFullscreen();setTimeout(onResize,300);},{passive:false});
window.addEventListener("touchstart",function(){hint.style.display="none";},{once:true});}

try{buildWorld("harbor");}catch(e){console.error(e);}
updateLobbyStats();showLobby();
resizeOverlay();
if(window.__forceHideLoading)window.__forceHideLoading();
var lastRenderTime=performance.now();
function loop(now){requestAnimationFrame(loop);try{
var dtMs=now-lastRenderTime;lastRenderTime=now;var dt=Math.min(0.05,dtMs/1000);
updateEffects(dt);var sDt=dt*fx.timeScale;var modalOpen=anyModalOpen();
if(!modalOpen&&!gameOver&&mouseDownLMB){var w=WEAPON_DEFS[player.weapon];if(w&&w.auto&&player.weapon.indexOf("knife")!==0&&!player.reloading&&player.shootCooldown<=0)shootPlayer();}
if(!gameOver&&!modalOpen){updateAutoBalance();updatePlayer(sDt);updateBots(sDt);updateGrenades(sDt);updateExplosions(sDt);updateCorpses(sDt);updatePickups(sDt);}
updateShells(sDt);updateTracers(sDt);updateSmoke(sDt);updateBlood(sDt);updateImpacts(sDt);updateBulletHoles(sDt);updatePopups(sDt);updateKillFeed(sDt);updateFPS(dt);
if(!lobbyActive&&!mapSelectEl.classList.contains("open"))drawHUD();
if(renderer){renderer.autoClear=true;renderer.render(scene,worldCam);if(!gameOver){renderer.autoClear=false;renderer.clearDepth();renderer.render(viewScene,viewCam);renderer.autoClear=true;}}
}catch(e){console.error("loop:",e);}}
requestAnimationFrame(loop);

})();