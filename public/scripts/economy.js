import {MODES,BALANCE} from './modes.js';
// One authoritative, mode-independent construction and upgrade price catalog.
export const CATALOG=Object.freeze({
 road:{name:'Road',category:'Infrastructure',price:200,w:1,h:1,upkeep:4,color:'#a6b3bf',icon:'road',months:0},
 house:{name:'Small house',category:'Residential',price:8000,w:1,h:1,capacity:8,power:2,water:2,upkeep:35,color:'#e9b584',icon:'home',months:1},
 apartment:{name:'Apartment block',category:'Residential',price:22000,w:2,h:2,capacity:32,power:7,water:8,upkeep:120,color:'#adc8d8',icon:'home',months:2},
 shop:{name:'Local shop',category:'Commercial',price:6000,w:1,h:1,jobs:8,power:2,water:1,upkeep:50,color:'#f4bd6b',icon:'shop',months:1},
 office:{name:'Commercial building',category:'Commercial',price:18000,w:2,h:2,jobs:28,power:7,water:4,upkeep:160,color:'#7cbbce',icon:'shop',months:2},
 workshop:{name:'Small workshop',category:'Industrial',price:10000,w:2,h:1,jobs:16,power:5,water:3,upkeep:90,pollution:7,color:'#c69288',icon:'factory',months:1},
 power:{name:'Power station',category:'Infrastructure',price:12000,w:2,h:2,supplyPower:120,upkeep:220,pollution:6,color:'#acadb9',icon:'bolt',months:1},
 water:{name:'Water facility',category:'Infrastructure',price:10000,w:2,h:2,supplyWater:120,upkeep:180,color:'#79c4dd',icon:'drop',months:1},
 park:{name:'Pocket park',category:'Services',price:2500,w:1,h:1,radius:5,upkeep:25,color:'#77be8b',icon:'tree',months:1},
 clinic:{name:'Clinic',category:'Services',price:14000,w:2,h:2,radius:7,upkeep:170,power:4,water:4,color:'#ece9db',icon:'plus',months:1},
 fire:{name:'Fire station',category:'Services',price:14000,w:2,h:2,radius:8,upkeep:160,power:3,water:4,color:'#dd8e7e',icon:'fire',months:1}
});
export const money=n=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0}).format(n);
export const upgradePrice=b=>Math.round(CATALOG[b.type].price*BALANCE.upgradeMultiplier*b.level);
export function cells(b){const c=CATALOG[b.type];const a=[];for(let y=b.y;y<b.y+c.h;y++)for(let x=b.x;x<b.x+c.w;x++)a.push([x,y]);return a;}
export function network(s) {
 const roads=new Set(s.buildings.filter(b=>b.type==='road').map(b=>`${b.x},${b.y}`));
 const seen=new Set(),queue=roads.has('0,20')?[[0,20]]:[];
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i],k=`${x},${y}`;if(seen.has(k))continue;seen.add(k);for(const [a,b]of[[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(roads.has(`${a},${b}`)&&!seen.has(`${a},${b}`))queue.push([a,b]);}
 const connected=new Set();
 for(const b of s.buildings)if(b.type==='road'?seen.has(`${b.x},${b.y}`):cells(b).some(([x,y])=>[[x+1,y],[x-1,y],[x,y+1],[x,y-1]].some(([a,c])=>seen.has(`${a},${c}`))))connected.add(b.id);
 return connected;
}
export function evaluate(s) {
 const connected=network(s), active=s.buildings.filter(b=>b.remaining===0 && connected.has(b.id));
 let powerSupply=0,waterSupply=0,powerUse=0,waterUse=0,capacity=0,jobs=0,upkeep=0,pollution=0;
 for(const b of s.buildings){const c=CATALOG[b.type];upkeep+=c.upkeep*b.level;if(active.includes(b)){powerSupply+=(c.supplyPower||0)*b.level;waterSupply+=(c.supplyWater||0)*b.level;powerUse+=(c.power||0)*b.level;waterUse+=(c.water||0)*b.level;pollution+=(c.pollution||0)*b.level;}}
 const utility=Math.min(1,powerUse?powerSupply/powerUse:1,waterUse?waterSupply/waterUse:1);
 const residences=active.filter(b=>CATALOG[b.type].capacity);
 const coverage={park:0,clinic:0,fire:0};
 for(const type of Object.keys(coverage)) {
  let served=0,total=0;
  for(const b of residences){const c=CATALOG[b.type],n=c.capacity*b.level;total+=n;if(active.some(a=>a.type===type&&Math.hypot(a.x+CATALOG[a.type].w/2-b.x-c.w/2,a.y+CATALOG[a.type].h/2-b.y-c.h/2)<=CATALOG[type].radius))served+=n;}
  coverage[type]=total?served/total:0;
 }
 for(const b of active){const c=CATALOG[b.type];capacity+=(c.capacity||0)*b.level;jobs+=(c.jobs||0)*b.level;}
 const m=MODES[s.mode],workers=s.population*0.5,employment=workers?Math.min(100,jobs*utility/workers*100):100;
 const pressure=Math.min(30,pollution*0.5);
 const happiness=Math.round(Math.max(5,Math.min(100,78+coverage.park*12+coverage.clinic*8+coverage.fire*7 - (1-utility)*50*m.penalty -(1-coverage.clinic)*8*m.penalty -(1-coverage.fire)*6*m.penalty -(100-employment)*0.18*m.penalty-pressure)));
 return {connected:[...connected],powerSupply,waterSupply,powerUse,waterUse,utility,capacity,jobs,upkeep:Math.round(upkeep*m.expenses),pollution,coverage,happiness,employment,residentialDemand:Math.round(Math.max(0,Math.min(100,45+(jobs-workers)*2+(happiness-50)*0.6))),businessDemand:Math.round(Math.max(0,Math.min(100,50+(workers-jobs)*3))),employed:Math.min(workers,jobs*utility)};
}
export function tick(s) {
 const m=MODES[s.mode];
 for(const b of s.buildings)if(b.remaining>0)b.remaining--;
 let a=evaluate(s);
 const target=Math.floor(Math.min(a.capacity,a.jobs*2+8)*a.utility*(a.happiness/100));
 const delta=target-s.population;
 s.population=Math.max(0,Math.min(a.capacity,s.population+(delta>0?Math.min(delta,Math.max(1,Math.ceil(delta*0.22*m.growth))):Math.max(delta,-Math.max(1,Math.ceil(-delta*0.25))))));
 a=evaluate(s);
 const income=Math.round(s.population*BALANCE.taxResident+a.employed*BALANCE.taxJob);
 if(s.mode!=='sandbox')s.treasury=Math.max(-10000000,Math.min(1000000000,s.treasury+income-a.upkeep));
 s.month++;
 const unlocked=[];
 for(let i=0;i<BALANCE.milestones.length;i++)if(s.population>=BALANCE.milestones[i]&&!s.milestones.includes(i)){s.milestones.push(i);unlocked.push(i);if(s.mode!=='sandbox')s.treasury=Math.min(1000000000,s.treasury+5000*(i+1));}
 s.stats=a;s.report={income,expenses:a.upkeep,net:income-a.upkeep,populationChange:s.population-(s.report?.population||0),population:s.population,unlocked};
 return s.report;
}
