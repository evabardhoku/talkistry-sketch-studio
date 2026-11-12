import { describe, expect, it } from 'vitest';
import { sectionsFor, TOUR } from './demo-data';
describe('demo roles', () => {
  it('hides the Development Room from the client view', () => {
    expect(sectionsFor('client').map(s => s.id)).not.toContain('devroom');
    expect(sectionsFor('developer').map(s => s.id)).toContain('devroom');
  });
  it('tour never sends the client into internal notes', () => {
    expect(TOUR.filter(s => s.section === 'devroom').every(s => s.role && s.role !== 'client')).toBe(true);
  });
});
