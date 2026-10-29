import {CATALOG,cells,evaluate} from './economy.js';
import {MODES} from './modes.js';
const KEY='cityrise.city.v1',BACKUP='cityrise.city.backup.v1';
export const MAX_SAVE_BYTES=1000000;
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
export function validateSave(raw) {
 if(!raw||raw.version!==1)throw Error('Unsupported save version; expected version 1.');
 if(!Object.hasOwn(MODES,raw.mode)||raw.width!==40||raw.height!==40)throw Error('Invalid mode or map size.');
 if(typeof raw.cityName!=='string'||raw.cityName.length<1||raw.cityName.length>32||/[\p{Cc}\p{Cf}<>]/u.test(raw.cityName))throw Error('Invalid city name.');
 if(!integer(raw.month,0,120000)||!Number.isFinite(raw.treasury)||raw.treasury< -10000000||raw.treasury>1000000000||!integer(raw.population,0,100000)||!integer(raw.lastGrant,-12,raw.month))throw Error('Invalid city numbers.');
 if(!Array.isArray(raw.buildings)||raw.buildings.length>1600)throw Error('Invalid building count.');
 const used=new Set(),ids=new Set(),buildings=[];
 for(const b of raw.buildings){
  if(!b||!Object.hasOwn(CATALOG,b.type)||typeof b.id!=='string'||b.id.length>64||!b.id||ids.has(b.id)||!integer(b.level,1,3)||!integer(b.remaining,0,2)||!integer(b.x,0,39)||!integer(b.y,0,39))throw Error('Invalid building record.');
  if((b.type==='road'||b.type==='park')&&b.level!==1)throw Error('Invalid upgrade level.');
  ids.add(b.id);
  for(const [x,y] of cells(b)){const key=`${x},${y}`;if(x>=40||y>=40||used.has(key))throw Error('Overlapping or out-of-bounds building.');used.add(key);}
  buildings.push({id:b.id,type:b.type,x:b.x,y:b.y,level:b.level,remaining:b.remaining});
 }
 if(!Array.isArray(raw.milestones)||raw.milestones.length>5||new Set(raw.milestones).size!==raw.milestones.length||raw.milestones.some(n=>!integer(n,0,4)))throw Error('Invalid milestones.');
 const s={version:1,playerId:typeof raw.playerId==='string'?raw.playerId.slice(0,36):'',displayName:typeof raw.displayName==='string'?raw.displayName.slice(0,20):'Mayor',cityName:raw.cityName,mode:raw.mode,width:40,height:40,month:raw.month,treasury:raw.treasury,population:raw.population,buildings,milestones:[...raw.milestones],lastGrant:raw.lastGrant,settings:{speed:[0,1,2,4].includes(raw.settings?.speed)?raw.settings.speed:1,grid:raw.settings?.grid!==false,reducedMotion:raw.settings?.reducedMotion===true},report:{income:0,expenses:0,net:0,population:safeNumber(raw.population),populationChange:0,unlocked:[]}};
 s.stats=evaluate(s);s.population=Math.min(s.population,s.stats.capacity);s.stats=evaluate(s);return s;
}
function safeNumber(n){return Number.isFinite(n)?n:0;}
// Reports and derived stats are recalculated rather than trusted on import.
export function serializable(s){const {stats,report,...rest}=s;return rest;}
export function parseSave(text){if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_SAVE_BYTES)throw Error('Save exceeds 1 MB.');let data;try{data=JSON.parse(text);}catch{throw Error('This is not a valid JSON save.');}return validateSave(data);}
export function loadCity(){
 let text;try{text=localStorage.getItem(KEY);}catch{return {state:null,message:'Browser storage unavailable. Export your city before leaving.'};}
 if(!text)return {state:null,message:''};
 try{return {state:parseSave(text),message:'City restored.'};}catch(e){
  try{const backup=localStorage.getItem(BACKUP);if(backup)return {state:parseSave(backup),message:'Recovered last valid backup. The corrupt main save was preserved.'};}catch{}
  return {state:null,blocked:true,message:'The local save is corrupt or unsupported. It has not been erased. Export the raw save in settings before replacing it.'};
 }
}
export function saveCity(s){const data=serializable(s);validateSave(data);const text=JSON.stringify(data);const old=localStorage.getItem(KEY);if(old){try{parseSave(old);localStorage.setItem(BACKUP,old);}catch{}}localStorage.setItem(KEY,text);}
export function exportCity(s){download(JSON.stringify(serializable(s),null,2),`cityrise-${s.mode}-${s.month}.json`);}
export function exportRaw(){const raw=localStorage.getItem(KEY);if(!raw)throw Error('No stored city to export.');download(raw,'cityrise-recovery.json');}
function download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function autosaver(getState,onStatus){let timer;const save=()=>{clearTimeout(timer);const s=getState();if(!s)return;try{saveCity(s);onStatus('Saved on this device');}catch{onStatus('Storage unavailable — export to keep your city');}};const schedule=()=>{clearTimeout(timer);onStatus('Saving…');timer=setTimeout(save,450);};return {save,schedule};}
