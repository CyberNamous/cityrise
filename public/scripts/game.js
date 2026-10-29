import {CATALOG,cells,evaluate,upgradePrice} from './economy.js';
import {MODES,BALANCE} from './modes.js';
export function newCity(profile,mode,cityName='New Horizon') {
 const s={version:1,playerId:profile.id,displayName:profile.displayName,mode,cityName:cityName.trim().slice(0,32)||'New Horizon',width:40,height:40,month:0,treasury:MODES[mode].funds,population:0,buildings:[],milestones:[],lastGrant:-12,settings:{speed:1,grid:true,reducedMotion:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches},report:{income:0,expenses:0,net:0,population:0,populationChange:0,unlocked:[]}};
 const add=(type,x,y)=>s.buildings.push({id:crypto.randomUUID(),type,x,y,level:1,remaining:0});
 for(let x=0;x<=23;x++)add('road',x,20);
 for(let y=15;y<=25;y++)if(y!==20)add('road',20,y);
 // Starter infrastructure is a documented, identical grant in every mode.
 add('power',14,18);add('water',17,18);add('house',21,19);add('house',22,19);add('shop',21,21);add('workshop',17,21);add('park',19,19);
 s.stats=evaluate(s);return s;
}
export function at(s,x,y){return s.buildings.find(b=>cells(b).some(([a,c])=>a===x&&c===y));}
export function placement(s,type,x,y) {
 const c=CATALOG[type];if(!c)return 'Choose a building.';
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x+c.w>s.width||y+c.h>s.height)return 'Outside city boundaries.';
 if(cells({type,x,y}).some(([a,b])=>at(s,a,b)))return 'This land is already occupied.';
 if(s.mode!=='sandbox'&&s.treasury<c.price)return 'Insufficient funds. Grow your tax base or request recovery aid.';
 return '';
}
export function build(s,type,x,y) {const error=placement(s,type,x,y);if(error)throw Error(error);const c=CATALOG[type];if(s.mode!=='sandbox')s.treasury-=c.price;const b={id:crypto.randomUUID(),type,x,y,level:1,remaining:c.months};s.buildings.push(b);s.stats=evaluate(s);return b;}
export function demolish(s,id) {const i=s.buildings.findIndex(b=>b.id===id);if(i<0)return;const b=s.buildings[i];if(b.x===0&&b.y===20&&b.type==='road')throw Error('Keep the gateway road connected to the region.');if(s.mode!=='sandbox')s.treasury+=Math.round(CATALOG[b.type].price*BALANCE.refund);s.buildings.splice(i,1);s.stats=evaluate(s);}
export function upgrade(s,id){const b=s.buildings.find(b=>b.id===id);if(!b||b.type==='road'||b.type==='park'||b.level>=BALANCE.maxLevel||b.remaining)throw Error('This building cannot be upgraded now.');const cost=upgradePrice(b);if(s.mode!=='sandbox'&&s.treasury<cost)throw Error('Insufficient funds for this upgrade.');if(s.mode!=='sandbox')s.treasury-=cost;b.level++;b.remaining=1;s.stats=evaluate(s);}
export function recovery(s){if(s.mode==='sandbox')throw Error('Sandbox already has unlimited funds.');if(s.treasury>=15000)throw Error('Recovery aid is available below ₱15,000.');if(s.month-s.lastGrant<BALANCE.grantCooldown)throw Error('Recovery aid is available once every 12 months.');const grant=MODES[s.mode].grant;s.treasury=Math.max(0,s.treasury)+grant;s.lastGrant=s.month;return grant;}
