import {planReminders} from '../src/services/reminderPlanner';
import type {Match} from '../src/types/domain';
const now=Date.parse('2026-11-01T12:00:00Z');
const match=(id:string,patch:Partial<Match>={}):Match=>({id,status:'scheduled',kickoffUtc:'2026-11-01T15:00:00Z',kickoffUnknown:false,...patch} as Match);
test('deduplicates followed teams and keeps manual overrides',()=>{
 const result=planReminders([{match:match('1'),offsetMinutes:15,origin:'favorite'},{match:match('1'),offsetMinutes:30,origin:'manual'}],now);
 expect(result).toHaveLength(1);expect(result[0].offsetMinutes).toBe(30);
});
test('skips unknown, cancelled, finished and elapsed reminders',()=>{
 const records=[match('unknown',{kickoffUnknown:true}),match('cancelled',{status:'cancelled'}),match('finished',{status:'finished'}),match('past',{kickoffUtc:'2026-11-01T10:00:00Z'})];
 expect(planReminders(records.map(m=>({match:m,offsetMinutes:15,origin:'favorite'})),now)).toHaveLength(0);
});
test('schedules at most forty nearest reminders in UTC across a DST boundary',()=>{
 const intents=Array.from({length:60},(_,i)=>({match:match(String(i),{kickoffUtc:new Date(now+(i+1)*3600000).toISOString()}),offsetMinutes:15,origin:'favorite' as const})).reverse();
 const result=planReminders(intents,now);expect(result).toHaveLength(40);expect(result[0].match.id).toBe('0');expect(result[39].match.id).toBe('39');
});

test('keeps distant fixtures available without scheduling outside the rolling window',()=>{
 const intents=[{match:match('distant',{kickoffUtc:'2026-12-01T15:00:00Z'}),offsetMinutes:15,origin:'manual' as const}];
 expect(planReminders(intents,now)).toEqual([]);
});
