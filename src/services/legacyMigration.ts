import { runExecute, runQuery, runInTransaction } from '../storage/db';
import { serverRequest, type ApiEnvelope } from './serverApi';

/** Unresolved IDs are retained. No favorite, note, prediction or plan is dropped. */
export async function reconcileLegacyIds(): Promise<void> {
  const favorite = await runQuery<{entity_type:string;entity_id:string}>("SELECT entity_type,entity_id FROM favorites WHERE entity_type IN ('team','competition')");
  const records = await runQuery<{match_id:string}>('SELECT match_id FROM reminders UNION SELECT match_id FROM predictions UNION SELECT match_id FROM watch_plan_items');
  const items = [...favorite.map(r=>({kind:r.entity_type,id:r.entity_id})),...records.map(r=>({kind:'match',id:r.match_id}))];
  for(let i=0;i<items.length;i+=100){
    const result=await serverRequest<ApiEnvelope<Array<{kind:string;id:string;canonicalId:string}>>>('/aliases/resolve',{items:items.slice(i,i+100)});
    for(const row of result.data){
      if(row.id===row.canonicalId)continue;
      await runInTransaction(async execute=>{
        await execute('INSERT OR REPLACE INTO entity_aliases(kind,legacy_id,canonical_id) VALUES(?,?,?)',[row.kind,row.id,row.canonicalId]);
        if(row.kind==='match'){
          for(const table of ['reminders','predictions','watch_plan_items','reminder_rules']) await execute(`UPDATE OR IGNORE ${table} SET match_id=? WHERE match_id=?`,[row.canonicalId,row.id]);
        }else await execute('UPDATE OR IGNORE favorites SET entity_id=? WHERE entity_type=? AND entity_id=?',[row.canonicalId,row.kind,row.id]);
      });
    }
  }
}
