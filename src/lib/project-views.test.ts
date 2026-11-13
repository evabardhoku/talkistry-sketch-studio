import { describe, expect, it } from 'vitest';
import { canDeleteProject, canPreviewRoles, visibleInView, PROJECT_VIEWS } from './project-views';
describe('project roles and ownership', () => {
  it('offers all three role previews to owners without an invitation', () => {
    expect(PROJECT_VIEWS).toEqual(['owner', 'client', 'developer']);
    expect(canPreviewRoles('owner')).toBe(true);
    expect(canPreviewRoles('client')).toBe(false);
    expect(canPreviewRoles('developer')).toBe(false);
  });
  it('only offers deletion to the project owner', () => {
    expect(canDeleteProject('eva', 'eva')).toBe(true);
    expect(canDeleteProject('eva', 'other')).toBe(false);
    expect(canDeleteProject('eva', null)).toBe(false);
  });
  it('keeps internal notes out of the client preview', () => {
    expect(visibleInView('client', 'development')).toBe(false);
    expect(visibleInView('developer', 'development')).toBe(true);
  });
});