export const fail=(status,message)=>Object.assign(new Error(message),{status});
export function json(data,status=200) {return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export const validID=id=>typeof id==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export function validName(value) {
 if(typeof value!=='string') throw fail(400,'Display name must be text.');
 const name=value.trim();
 if([...name].length<3 || name.length>20 || /[\p{Cc}\p{Cf}<>]/u.test(name)) throw fail(400,'Use 3–20 characters without control characters or angle brackets.');
 return name;
}
export function bearer(req) {
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(!/^[a-f0-9]{64}$/.test(token)) throw fail(401,'A valid device token is required.');return token;
}
export async function hash(text) {const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function body(req) {
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('Content-Type')||'')) throw fail(415,'Content-Type must be application/json.');
 if(Number(req.headers.get('Content-Length'))>4096) throw fail(413,'Request exceeds 4 KB.');
 const reader=req.body?.getReader(); if(!reader) throw fail(400,'JSON body required.');
 let length=0, chunks=[];
 while(true) {const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>4096){await reader.cancel();throw fail(413,'Request exceeds 4 KB.');}chunks.push(value);}
 const all=new Uint8Array(length);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}
 try {const d=JSON.parse(new TextDecoder().decode(all));if(!d || Array.isArray(d)||typeof d!=='object')throw Error();return d;}catch{throw fail(400,'Malformed JSON object.');}
}
