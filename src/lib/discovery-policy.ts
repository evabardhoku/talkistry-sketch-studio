/** A human review protects the draft even if it is not confirmed yet. */
export function canReviseAiDraft(requirement: { origin: string; status: string; last_decision_id: string | null }) {
  return requirement.origin === 'ai' && requirement.last_decision_id === null && ['proposed', 'unresolved'].includes(requirement.status);
}