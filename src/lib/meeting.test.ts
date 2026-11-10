import { describe,it,expect } from 'vitest';
import { defaultAgenda,elapsed,similarQuestion,unresolvedQuestion } from './meeting';
describe('meeting rules',()=>{
 it('uses the requested 60-minute initial agenda',()=>{expect(defaultAgenda(60).map(s=>s.minutes)).toEqual([5,15,25,10,5]);});
 it('does not start the timer until explicitly running',()=>{expect(elapsed({status:'planned',elapsed_seconds:0,running_since:null},300000)).toBe(0);});
 it('preserves elapsed time while paused',()=>{expect(elapsed({status:'paused',elapsed_seconds:300,running_since:null},900000)).toBe(300);});
 it('resumes from persisted timing across refresh',()=>{expect(elapsed({status:'running',elapsed_seconds:120,running_since:'2026-11-10T00:00:00Z'},Date.parse('2026-11-10T00:03:00Z'))).toBe(300);});
 it('preserves deferred questions as unresolved',()=>{expect(unresolvedQuestion({status:'deferred'})).toBe(true); expect(unresolvedQuestion({status:'resolved'})).toBe(false);});
 it('recognizes rephrased questions without conflating different decisions',()=>{expect(similarQuestion('Which countries should we ship books to?','Which countries do we ship books to?')).toBe(true);expect(similarQuestion('Which countries ship books?','Which payment methods?')).toBe(false);});
});