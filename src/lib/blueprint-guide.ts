export const BLUEPRINT_GUIDES = {
  user_role: { title: 'User Personas', questions: ['Who will use this product?', 'What are they trying to achieve?', 'What needs, constraints, or permissions should we consider?'] },
  goal: { title: 'Product goals', questions: ['What problem should this product solve?', 'What outcome matters most?', 'How would you recognize a successful outcome?'] },
  feature: { title: 'Feature requirements', questions: ['What should users be able to do?', 'What information or actions do they need?', 'What belongs in the first version, and what can wait?'] },
  business_rule: { title: 'Business rules', questions: ['Which policy or rule should the product follow?', 'When does this rule apply, and to whom?', 'Are there exceptions or limits?'] },
  acceptance: { title: 'Acceptance criteria', questions: ['Which behavior are we evaluating?', 'What should happen when the user performs the action?', 'What failure or edge case must be handled?'] },
} as const;
export type BlueprintGuideKind = keyof typeof BLUEPRINT_GUIDES;
export function buildGuidedDiscovery(kind: BlueprintGuideKind, answers: string[]) {
  const guide = BLUEPRINT_GUIDES[kind];
  if (answers.length !== guide.questions.length || answers.some(answer => !answer.trim())) throw new Error('Answer each question before submitting.');
  return `Guided discovery: ${guide.title} (requirement category: ${kind}).\n${guide.questions.map((question, index) => `${question}\n${answers[index]?.trim()}`).join('\n\n')}\n\nUse only these answers to propose requirements for this section. Do not treat these answers as human approval or replace confirmed decisions. Keep any missing information unresolved.`;
}