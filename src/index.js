import {players} from './api/players.js';
import {leaderboard} from './api/leaderboard.js';
import {fail,json} from './http.js';
export default {
 async fetch(request,env) {
  const url=new URL(request.url);
  if(url.pathname==='/api' || url.pathname.startsWith('/api/')) {
   try {
    const origin=request.headers.get('Origin');
    if(origin && origin!==url.origin)throw fail(403,'Cross-origin API requests are not allowed.');
    if(request.headers.get('Sec-Fetch-Site')==='cross-site')throw fail(403,'Same-origin requests only.');
    const match=url.pathname.match(/^\/api\/players(?:\/([^/]+))?$/);
    if(!match && url.pathname!=='/api/leaderboard')throw fail(404,'API route not found.');
    if(!env.DB)throw fail(503,'Online services unavailable. Your local city is safe.');
    return match ? await players(request,env,match[1]) : await leaderboard(request,env);
   }catch(e){return json({error:{code:e.status||503,message:e.status?e.message:'Online services unavailable. Play locally and retry later.'}},e.status||503);}
  }
  return env.ASSETS.fetch(request);
 }
};
