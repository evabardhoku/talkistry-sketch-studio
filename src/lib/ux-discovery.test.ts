import { describe, expect, it } from 'vitest';
import { filterBacklog } from './question-filters';
import { buildGuidedDiscovery } from './blueprint-guide';

describe('backlog default', () => {
  it('shows only Open questions by default while retaining other statuses', () => {
    const questions = ['open', 'deferred', 'answered', 'resolved'].map(status => ({status, topic: 'general', meeting_id: null, stage_key: null}));
    expect(filterBacklog(questions).map(q => q.status)).toEqual(['open']);
    expect(filterBacklog(questions, 'all')).toHaveLength(4);
  });
});
describe('guided blueprint input', () => {
  it('preserves all reviewed persona answers in one discovery submission', () => {
    const result = buildGuidedDiscovery('user_role', ['Parents', 'Book private tutors', 'View only their own bookings']);
    expect(result).toContain('requirement category: user_role');
    for (const answer of ['Parents', 'Book private tutors', 'View only their own bookings']) expect(result).toContain(answer);
  });
  it('rejects an incomplete guided submission', () => {
    expect(() => buildGuidedDiscovery('user_role', ['Parents', '', ''])).toThrow();
  });
});