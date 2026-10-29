import {fail,json,body} from '../http.js';
import {authorize} from './players.js';
import {scoreCity} from '../../public/scripts/scoring.js';
const modes=['easy','medium','hard'];
export async function leaderboard(request,env) {
 if(request.method==='GET') {
  const url=new URL(request.url),mode=url.searchParams.get('mode')||'medium';
  if(!modes.includes(mode))throw fail(400,'Choose easy, medium, or hard. Sandbox is not competitive.');
  const limit=Number(url.searchParams.get('limit')||25),offset=Number(url.searchParams.get('offset')||0);
  if(!Number.isInteger(limit)||limit<1||limit>50||!Number.isInteger(offset)||offset<0||offset>10000)throw fail(400,'Invalid pagination.');
  const {results}=await env.DB.prepare(`SELECT p.display_name AS displayName,s.player_id AS playerId,s.score,s.population,s.happiness,s.mode,s.best_at AS submittedAt
   FROM scores s JOIN players p ON p.id=s.player_id WHERE s.mode=? ORDER BY s.score DESC,s.best_at ASC,s.player_id ASC LIMIT ? OFFSET ?`).bind(mode,limit,offset).all();
  return json({mode,offset,limit,results});
 }
 if(request.method!=='POST') throw fail(405,'Use GET or POST for leaderboard.');
 const d=await body(request);
 if(!modes.includes(d.mode))throw fail(400,'Sandbox and unknown modes are ineligible.');
 await authorize(request,env,d.playerId);
 for(const [key,min,max] of [['population',0,100000],['happiness',0,100],['treasury',-10000000,1000000000],['employment',0,100],['milestones',0,5]]) {
  if(!Number.isSafeInteger(d[key])||d[key]<min||d[key]>max) throw fail(400,`Invalid ${key}.`);
 }
 if(d.population>1600*8*3)throw fail(400,'Population exceeds map capacity.');
 const computed=scoreCity(d);
 if(d.score!==computed)throw fail(400,'Score does not match the documented formula.');
 // Each submission updates its durable cooldown, even if it does not improve the best.
 const r=await env.DB.prepare(`INSERT INTO scores(player_id,mode,score,population,happiness,treasury,employment,milestones) VALUES (?,?,?,?,?,?,?,?)
 ON CONFLICT(player_id,mode) DO UPDATE SET
 population=CASE WHEN excluded.score>scores.score THEN excluded.population ELSE scores.population END,
 happiness=CASE WHEN excluded.score>scores.score THEN excluded.happiness ELSE scores.happiness END,
 treasury=CASE WHEN excluded.score>scores.score THEN excluded.treasury ELSE scores.treasury END,
 employment=CASE WHEN excluded.score>scores.score THEN excluded.employment ELSE scores.employment END,
 milestones=CASE WHEN excluded.score>scores.score THEN excluded.milestones ELSE scores.milestones END,
 best_at=CASE WHEN excluded.score>scores.score THEN unixepoch() ELSE scores.best_at END,
 score=MAX(scores.score,excluded.score),submitted_at=unixepoch()
 WHERE scores.submitted_at<=unixepoch()-60`).bind(d.playerId,d.mode,computed,d.population,d.happiness,d.treasury,d.employment,d.milestones).run();
 if(!r.meta.changes)throw fail(429,'Wait 60 seconds between submissions in this mode.');
 return json({accepted:true,score:computed,note:'Best score retained. Client-reported achievement, not a verified city.'});
}
