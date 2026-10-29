import {CATALOG} from './economy.js';
import {placement} from './game.js';
const TW=64,TH=32;
const iso=(x,y)=>({x:(x-y)*TW/2,y:(x+y)*TH/2});
const tint=(color,n)=>{const v=color.startsWith('#')?parseInt(color.slice(1),16):null;const rgb=v===null?color.match(/\d+/g).slice(0,3).map(Number):[v>>16,(v>>8)&255,v&255];return `rgb(${rgb.map(c=>Math.max(0,Math.min(255,c+n))).join(',')})`;};
export class Renderer {
 constructor(canvas,getState,onTap,onPreview){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.getState=getState;this.onTap=onTap;this.onPreview=onPreview;this.camera={x:0,y:0,zoom:1};this.pointers=new Map();this.cache=new Map();this.dirty=true;this.last=0;this.tool=null;this.selected=null;this.hover=null;this.raf=0;this.destroyed=false;
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
  canvas.addEventListener('pointerdown',e=>this.down(e));canvas.addEventListener('pointermove',e=>this.move(e));
  canvas.addEventListener('pointerup',e=>this.up(e));canvas.addEventListener('pointercancel',e=>{this.pointers.delete(e.pointerId);this.gesture=true;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();const p=this.point(e);this.zoomAt(Math.exp(-e.deltaY*0.001),p.x,p.y);},{passive:false});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(this.raf);this.raf=0;}else this.start();});this.start();
 }
 resize(){const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;const dpr=Math.min(2,window.devicePixelRatio||1);this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);this.dpr=dpr;this.dirty=true;}
 start(){if(this.raf||this.destroyed||document.hidden)return;const frame=t=>{this.raf=0;if(document.hidden)return;const s=this.getState();if(s&&this.canvas.offsetParent!==null&&((this.dirty)||(!s.settings.reducedMotion&&t-this.last>40))){this.draw(t);this.last=t;this.dirty=false;}this.raf=requestAnimationFrame(frame);};this.raf=requestAnimationFrame(frame);}
 center(){const p=iso(20,20);this.camera.x=-p.x;this.camera.y=-p.y+40;this.camera.zoom=this.w<600?0.8:1.05;this.dirty=true;}
 point(e){const r=this.canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
 project(x,y){const p=iso(x,y),c=this.camera;return {x:this.w/2+(p.x+c.x)*c.zoom,y:this.h/2+(p.y+c.y)*c.zoom};}
 grid(x,y){const c=this.camera,a=(x-this.w/2)/c.zoom-c.x,b=(y-this.h/2)/c.zoom-c.y;return {x:Math.floor(a/TW+b/TH),y:Math.floor(b/TH-a/TW)};}
 zoomAt(factor,x=this.w/2,y=this.h/2){const c=this.camera,old=c.zoom;c.zoom=Math.max(0.35,Math.min(2.4,old*factor));c.x+=(x-this.w/2)*(1/c.zoom-1/old);c.y+=(y-this.h/2)*(1/c.zoom-1/old);this.clampCamera();this.dirty=true;}
 clampCamera(){this.camera.x=Math.max(-1400,Math.min(1400,this.camera.x));this.camera.y=Math.max(-1350,Math.min(300,this.camera.y));}
 down(e){this.canvas.focus({preventScroll:true});this.canvas.setPointerCapture(e.pointerId);const p=this.point(e);this.pointers.set(e.pointerId,p);if(this.pointers.size===1){this.origin=p;this.drag=false;this.gesture=false;}else {this.gesture=true;this.drag=true;}this.preview(p);}
 move(e){const p=this.point(e),old=this.pointers.get(e.pointerId);if(!old){this.preview(p);return;}
  if(this.pointers.size===2){const other=[...this.pointers.entries()].find(([id])=>id!==e.pointerId)[1];const before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(p.x-other.x,p.y-other.y);if(before>0)this.zoomAt(after/before,(p.x+other.x)/2,(p.y+other.y)/2);this.camera.x+=(p.x-old.x)/2/this.camera.zoom;this.camera.y+=(p.y-old.y)/2/this.camera.zoom;}
  else if(Math.hypot(p.x-this.origin.x,p.y-this.origin.y)>7||this.drag){this.drag=true;this.camera.x+=(p.x-old.x)/this.camera.zoom;this.camera.y+=(p.y-old.y)/this.camera.zoom;this.clampCamera();}
  this.pointers.set(e.pointerId,p);this.dirty=true;if(!this.drag)this.preview(p);
 }
 up(e){if(!this.pointers.has(e.pointerId))return;const p=this.point(e);this.pointers.delete(e.pointerId);if(!this.drag&&!this.gesture){const g=this.grid(p.x,p.y);this.onTap(g.x,g.y);}if(!this.pointers.size){this.drag=false;this.gesture=false;}this.dirty=true;}
 preview(p){const g=this.grid(p.x,p.y);if(!this.hover||g.x!==this.hover.x||g.y!==this.hover.y){this.hover=g;this.onPreview?.(g);this.dirty=true;}}
 polygon(points,color,stroke){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=0.65;c.stroke();}}
 tile(x,y,color,stroke,w=1,h=1){this.polygon([this.project(x,y),this.project(x+w,y),this.project(x+w,y+h),this.project(x,y+h)],color,stroke);}
 sprite(type,level){const key=`${type}:${level}`;if(this.cache.has(key))return this.cache.get(key);const c=CATALOG[type],art=document.createElement('canvas');art.width=300;art.height=360;const g=art.getContext('2d');
  const baseX=150,baseY=245,coord=(x,y,z=0)=>({x:baseX+(x-y)*32,y:baseY+(x+y)*16-z});
  const poly=(pts,fill)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();g.fillStyle=fill;g.fill();};
  const box=(x,y,w,h,z,color)=>{poly([coord(x,y),coord(x+w,y),coord(x+w,y,z),coord(x,y,z)],tint(color,-28));poly([coord(x+w,y),coord(x+w,y+h),coord(x+w,y+h,z),coord(x+w,y,z)],tint(color,-52));poly([coord(x,y,z),coord(x+w,y,z),coord(x+w,y+h,z),coord(x,y+h,z)],color);};
  const tree=(x,y,size=1)=>{const p=coord(x,y);g.fillStyle='#705d46';g.fillRect(p.x-2,p.y-15*size,4,17*size);for(const [dx,dy,r]of[[0,-25,13],[-6,-21,10],[7,-22,10]]){g.fillStyle=dx<0?'#57986e':'#367d58';g.beginPath();g.arc(p.x+dx*size,p.y+dy*size,r*size,0,Math.PI*2);g.fill();}};
  poly([coord(0.12,0.15),coord(c.w+0.3,0.15),coord(c.w+0.3,c.h+0.2),coord(0.12,c.h+0.2)],'#153b4226');
  if(type==='road'){poly([coord(0,0),coord(1,0),coord(1,1),coord(0,1)],'#87999b');poly([coord(0.1,0.47),coord(0.9,0.47),coord(0.9,0.53),coord(0.1,0.53)],'#dbe3c6');}
  else if(type==='road'){box(0.03,0.03,0.94,0.94,2,'#87999b');}
  else if(type==='park'){box(0.05,0.05,0.9,0.9,3,'#8dbb72');tree(0.35,0.6,0.9);tree(0.8,0.3,0.65);box(0.6,0.7,0.3,0.12,6,'#c6a777');}
  else if(type==='water'){box(0.15,0.15,1.65,1.65,9,c.color);g.fillStyle='#d5f1ec';const p=coord(1,1,28);g.beginPath();g.ellipse(p.x,p.y,27,14,0,0,Math.PI*2);g.fill();g.fillStyle='#5aa9c8';g.beginPath();g.ellipse(p.x,p.y-9,27,14,0,0,Math.PI*2);g.fill();box(0.2,0.2,0.4,0.4,37,'#d6e9de');}
  else {
   const height={house:26,apartment:72,shop:26,office:90,workshop:27,power:30,clinic:39,fire:34}[type]+(level-1)*13;
   box(0.08,0.08,c.w-0.16,c.h-0.16,5,'#d0c6ad');box(0.18,0.18,c.w-0.36,c.h-0.36,height,c.color);
   if(type==='house') {poly([coord(0.08,0.08,height),coord(0.92,0.08,height),coord(0.92,0.5,height+16),coord(0.08,0.5,height+16)],'#a86553');poly([coord(0.08,0.5,height+16),coord(0.92,0.5,height+16),coord(0.92,0.95,height),coord(0.08,0.95,height)],'#ce8062');}
   else box(0.13,0.13,c.w-0.26,c.h-0.26,height+3,tint(c.color,25));
   for(let z=13;z<height-4;z+=16)for(let x=0.36;x<c.w-0.2;x+=0.4){poly([coord(x,c.h-0.17,z),coord(x+0.17,c.h-0.17,z),coord(x+0.17,c.h-0.17,z+7),coord(x,c.h-0.17,z+7)],'#427783');poly([coord(c.w-0.17,x,z),coord(c.w-0.17,x+0.17,z),coord(c.w-0.17,x+0.17,z+7),coord(c.w-0.17,x,z+7)],'#e5e5bb');}
   if(type==='workshop'||type==='power'){box(0.25,0.25,0.27,0.27,height+25,'#747d86');box(0.7,0.25,0.27,0.27,height+36,'#939799');}
   if(type==='shop'){const p=coord(0.1,c.h-0.05,19);g.fillStyle='#e78363';g.fillRect(p.x,p.y,25,6);g.fillStyle='#fff5df';for(let i=0;i<25;i+=8)g.fillRect(p.x+i,p.y,4,6);}
   if(type==='clinic'){const p=coord(1,1,height+5);g.fillStyle='#d76f64';g.fillRect(p.x-9,p.y-3,18,6);g.fillRect(p.x-3,p.y-9,6,18);}
   if(type==='fire'){box(0.45,c.h-0.24,0.8,0.09,14,'#af4f49');}
  }
  this.cache.set(key,art);return art;
 }
 draw(time){
  const s=this.getState(),c=this.ctx;if(!s)return;
  // Repaint the static scene only on edits, camera moves, previews, or monthly ticks.
  // Animation frames restore one viewport-sized cache and draw only tiny vehicles.
  if(this.dirty||!this.scene){
   this.drawMap();
   if(!this.scene)this.scene=document.createElement('canvas');
   this.scene.width=this.canvas.width;this.scene.height=this.canvas.height;
   this.scene.getContext('2d',{alpha:false}).drawImage(this.canvas,0,0);
   this.roadKeys=new Set(s.buildings.filter(b=>b.type==='road').map(b=>`${b.x},${b.y}`));
   this.dirty=false;
  }else{c.setTransform(1,0,0,1,0,0);c.drawImage(this.scene,0,0);}
  c.setTransform(this.dpr,0,0,this.dpr,0,0);
  if(!s.settings.reducedMotion){const t=time/1400;for(let n=0;n<4;n++){const x=14+(t+n*2)%9;if(this.roadKeys.has(`${Math.floor(x)},20`)){const p=this.project(x+0.2,20.55);c.fillStyle=['#f0d78c','#e6eded','#c57659','#d7e0e0'][n];c.fillRect(p.x-4*this.camera.zoom,p.y-3*this.camera.zoom,8*this.camera.zoom,4*this.camera.zoom);}}}
 }
 drawMap(){const s=this.getState(),c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#d7e6df';c.fillRect(0,0,this.w,this.h);
  // Cull tiles and cached sprites against viewport, with margin for building height.
  const visible=(p,margin=160)=>p.x>-margin&&p.x<this.w+margin&&p.y>-margin&&p.y<this.h+margin;
  const connected=new Set(s.stats.connected),roads=new Set(s.buildings.filter(b=>b.type==='road').map(b=>`${b.x},${b.y}`));
  const selectedBuilding=s.buildings.find(b=>b.id===this.selected),occupied=new Set();
  for(const b of s.buildings){const a=CATALOG[b.type];for(let y=b.y;y<b.y+a.h;y++)for(let x=b.x;x<b.x+a.w;x++)occupied.add(`${x},${y}`);}
  for(let sum=0;sum<79;sum++)for(let x=Math.max(0,sum-39);x<=Math.min(39,sum);x++){const y=sum-x,p=this.project(x,y);if(!visible(p,80))continue;
   this.tile(x,y,(x*17+y*11)%9<3?'#a9c69a':'#b3cda2',s.settings.grid?'#9bbb90':null);
   if(roads.has(`${x},${y}`)){this.tile(x,y,selectedBuilding?.x===x&&selectedBuilding?.y===y?'#d1bc7a':'#87999b','#b7c7bc');const a=this.project(x+0.5,y+0.5);c.strokeStyle='#dbe3c6';c.lineWidth=2*this.camera.zoom;c.setLineDash([4*this.camera.zoom,4*this.camera.zoom]);for(const [dx,dy]of[[1,0],[0,1]])if(roads.has(`${x+dx},${y+dy}`)){const b=this.project(x+0.5+dx,y+0.5+dy);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}c.setLineDash([]);}
   else if((x*13+y*7)%37===0&&!occupied.has(`${x},${y}`)){const a=this.project(x+0.5,y+0.5),z=this.camera.zoom;c.fillStyle='#6c855b';c.fillRect(a.x-1*z,a.y-12*z,2*z,12*z);c.fillStyle='#629567';c.beginPath();c.ellipse(a.x,a.y-15*z,9*z,12*z,0,0,Math.PI*2);c.fill();}
  }
  const bounds=[this.project(0,0),this.project(40,0),this.project(40,40),this.project(0,40)];c.beginPath();bounds.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.strokeStyle='#6a977c';c.lineWidth=2;c.stroke();
  const buildings=s.buildings.filter(b=>b.type!=='road').sort((a,b)=>(a.x+a.y+CATALOG[a.type].w+CATALOG[a.type].h)-(b.x+b.y+CATALOG[b.type].w+CATALOG[b.type].h)||a.x-b.x);
  for(const b of buildings){const a=CATALOG[b.type],p=this.project(b.x,b.y);if(!visible(p,220))continue;const z=this.camera.zoom;if(b.id===this.selected)this.tile(b.x,b.y,'#ffe8a4','#fff3c7',a.w,a.h);
   c.globalAlpha=b.remaining?0.55:1;const art=this.sprite(b.type,b.level);c.drawImage(art,p.x-150*z,p.y-245*z,300*z,360*z);c.globalAlpha=1;
   if(b.remaining){const q=this.project(b.x+a.w/2,b.y+a.h/2);c.fillStyle='#243f46';c.fillRect(q.x-17*z,q.y-15*z,34*z,6*z);c.fillStyle='#f0c06c';c.fillRect(q.x-16*z,q.y-14*z,(b.remaining===1?21:8)*z,4*z);}
   else if(!connected.has(b.id)){c.fillStyle='#a95248';c.font=`bold ${Math.max(10,12*z)}px system-ui`;c.fillText('!',p.x,p.y-30*z);}
  }
  if(this.tool&&this.hover){const {x,y}=this.hover,a=CATALOG[this.tool],error=placement(s,this.tool,x,y);this.tile(x,y,error?'#d86e6680':'#4caa9980',error?'#9e3c3c':'#237c6a',a.w,a.h);const p=this.project(x,y);c.globalAlpha=0.5;c.drawImage(this.sprite(this.tool,1),p.x-150*this.camera.zoom,p.y-245*this.camera.zoom,300*this.camera.zoom,360*this.camera.zoom);c.globalAlpha=1;}
  const gateway=this.project(0,20);if(visible(gateway)){c.fillStyle='#2e5252';c.font='11px system-ui';c.fillText('REGIONAL GATEWAY',gateway.x-65,gateway.y-8);}
 }
}
