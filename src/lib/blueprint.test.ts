import { describe, expect, it } from 'vitest';
import { stageForQuestion, stageSummary } from './blueprint';
import { resolveLayout } from './canvas-layout';

const q = (over: Partial<Parameters<typeof stageForQuestion>[0]> & { status?: string } = {}) => ({ blueprint_stage: null, requirement_id: null, screen_id: null, topic: 'general', question: 'x', status: 'open', ...over }) as never;

describe('blueprint stages', () => {
  it('assigns an audiobook licensing question to business rules & data', () => {
    expect(stageForQuestion(q({ question: 'Should audiobooks be available offline under the licence?' }))).toBe('rules');
  });
  it('an explicit stage choice wins over keywords', () => {
    expect(stageForQuestion(q({ blueprint_stage: 'users', question: 'payment?' }))).toBe('rules' === 'x' ? 'rules' : 'users');
  });
  it('a stage is complete only when every active requirement is confirmed and no question is open', () => {
    const reqs = [{ category: 'goal', status: 'confirmed' }, { category: 'goal', status: 'proposed' }] as never[];
    expect(stageSummary('vision', reqs, []).state).toBe('in_progress');
    expect(stageSummary('vision', [reqs[0]!], []).state).toBe('complete');
    expect(stageSummary('vision', [reqs[0]!], [q({ question: 'What is the main goal?' })]).state).toBe('needs_decision');
  });
});

describe('canvas layout', () => {
  const s = (id: string, position: number, extra = {}) => ({ id, position, user_role: null, layout_x: null, layout_y: null, layout_w: null, layout_h: null, ...extra });
  it('keeps manual position and size, and places a new page without overlapping it', () => {
    const boxes = resolveLayout([s('a', 0, { layout_x: 40, layout_y: 40, layout_w: 400, layout_h: 300 }), s('b', 1)]);
    expect(boxes.get('a')).toEqual({ x: 40, y: 40, w: 400, h: 300 });
    const b = boxes.get('b')!;
    expect(b.x).toBeGreaterThanOrEqual(40 + 400);
  });
});
