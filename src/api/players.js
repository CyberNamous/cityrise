import {fail,json,body,bearer,hash,validID,validName} from '../http.js';
export async function authorize(request,env,id) {
 if(!validID(id)) throw fail(400,'Invalid player ID.');
 const token=bearer(request);
 const player=await env.DB.prepare('SELECT id,display_name,token_hash FROM players WHERE id=?').bind(id).first();
 if(!player || player.token_hash!==await hash(token)) throw fail(401,'Device identity not recognized. Keep your original browser profile.');
 return player;
}
export async function players(request,env,id) {
 if(!id) {
  if(request.method!=='POST') throw fail(405,'Use POST to initialize a player.');
  const data=await body(request); const name=validName(data.displayName);
  if(!validID(data.id)) throw fail(400,'Invalid player ID.');
  const tokenHash=await hash(bearer(request));
  const ipHash=await hash(request.headers.get('CF-Connecting-IP') || 'local-development');
  const existing=await env.DB.prepare('SELECT id,token_hash,display_name FROM players WHERE id=?').bind(data.id).first();
  if(existing) {
   if(existing.token_hash!==tokenHash) throw fail(401,'Device identity not recognized.');
   return json({player:{id:existing.id,displayName:existing.display_name}},200);
  }
  // Database-backed, per-IP registration cap. No per-isolate in-memory limiter.
  const result=await env.DB.prepare(`INSERT INTO players(id,display_name,token_hash,registration_ip_hash)
   SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM players WHERE registration_ip_hash=? AND created_at>unixepoch()-3600)<20 ON CONFLICT(id) DO NOTHING`)
   .bind(data.id,name,tokenHash,ipHash,ipHash).run();
  if(!result.meta.changes) {
   // A concurrent initializer may have created the same device profile.
   const concurrent=await env.DB.prepare('SELECT id,token_hash,display_name FROM players WHERE id=?').bind(data.id).first();
   if(concurrent){if(concurrent.token_hash!==tokenHash)throw fail(401,'Device identity not recognized.');return json({player:{id:concurrent.id,displayName:concurrent.display_name}});}
   throw fail(429,'Too many new profiles from this network. Try again in an hour.');
  }
  return json({player:{id:data.id,displayName:name}},201);
 }
 if(request.method!=='PATCH') throw fail(405,'Use PATCH to change a display name.');
 await authorize(request,env,id);
 const data=await body(request);const name=validName(data.displayName);
 await env.DB.prepare('UPDATE players SET display_name=?,updated_at=unixepoch() WHERE id=?').bind(name,id).run();
 return json({player:{id,displayName:name}});
}
