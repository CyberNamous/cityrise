const KEY='cityrise.profile.v1';
export function validateName(value){const n=value.trim();if([...n].length<3||n.length>20||/[\p{Cc}\p{Cf}<>]/u.test(n))throw Error('Use 3–20 characters; no control characters or angle brackets.');return n;}
export function loadProfile(){try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id)&&/^[a-f0-9]{64}$/.test(p.token)){validateName(p.displayName);return p;}}catch{}return null;}
export function persistProfile(p){try{localStorage.setItem(KEY,JSON.stringify(p));return true;}catch{return false;}}
export function createProfile(name){return {id:crypto.randomUUID(),displayName:validateName(name),token:[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join(''),synced:false};}
export async function api(path,options={}) {
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7000);
 try {const r=await fetch(path,{...options,signal:controller.signal,headers:{'Content-Type':'application/json',...options.headers}});let data;try{data=await r.json();}catch{throw Error('Online services are unavailable. Play locally and retry.');}if(!r.ok)throw Error(data.error?.message||'Online request failed.');return data;}catch(e){if(e.name==='AbortError'||e instanceof TypeError)throw Error('Network unavailable. Your city still works locally.');throw e;}finally{clearTimeout(timer);}
}
export async function syncProfile(p){const d=await api('/api/players',{method:'POST',headers:{Authorization:`Bearer ${p.token}`},body:JSON.stringify({id:p.id,displayName:p.displayName})});if(d.player.displayName!==p.displayName)await api(`/api/players/${p.id}`,{method:'PATCH',headers:{Authorization:`Bearer ${p.token}`},body:JSON.stringify({displayName:p.displayName})});p.synced=true;persistProfile(p);return p;}
export async function renameProfile(p,name){p.displayName=validateName(name);p.synced=false;persistProfile(p);return syncProfile(p);}
