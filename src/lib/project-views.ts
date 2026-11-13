export type ProjectView = 'owner' | 'client' | 'developer';
export const PROJECT_VIEWS: ProjectView[] = ['owner', 'client', 'developer'];
export function canPreviewRoles(role: string | null) { return role === 'owner'; }
export function canDeleteProject(ownerId: string, userId: string | null) { return userId !== null && ownerId === userId; }
export function visibleInView(view: ProjectView, panel: string) {
  return panel !== 'development' || view !== 'client';
}