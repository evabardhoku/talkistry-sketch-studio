import { describe, expect, it } from 'vitest';
import { canReviseAiDraft } from './discovery-policy';
describe('discovery draft protection', () => {
  it('allows affected unreviewed AI drafts to evolve', () => {
    expect(canReviseAiDraft({ origin: 'ai', status: 'proposed', last_decision_id: null })).toBe(true);
  });
  it('never rewrites confirmed requirements', () => {
    expect(canReviseAiDraft({ origin: 'ai', status: 'confirmed', last_decision_id: null })).toBe(false);
  });
  it('never overwrites a human-reviewed draft', () => {
    expect(canReviseAiDraft({ origin: 'ai', status: 'proposed', last_decision_id: 'human-decision' })).toBe(false);
    expect(canReviseAiDraft({ origin: 'human', status: 'proposed', last_decision_id: null })).toBe(false);
  });
});