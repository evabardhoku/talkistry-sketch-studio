import type { ReqStatus, SketchComponent } from './types';

/** Fictional, read-only demo content. Never written to the database. */
export type DemoRole = 'owner' | 'client' | 'developer';
export const DEMO_ROLES: { id: DemoRole; label: string; who: string; can: string }[] = [
  { id: 'owner', label: 'Owner', who: 'Mara · product lead', can: 'Runs meetings, confirms requirements and approves versions.' },
  { id: 'client', label: 'Client', who: 'Daniel · founder of TutorNest', can: 'Answers questions, comments and proposes changes. Cannot see internal notes.' },
  { id: 'developer', label: 'Developer', who: 'Lin · engineer', can: 'Adds estimates and private technical notes in the Development Room.' },
];
export type DemoSection = 'discovery' | 'requirements' | 'backlog' | 'meetings' | 'devroom' | 'blueprint' | 'versions';
export const DEMO_SECTIONS: { id: DemoSection; label: string; roles: DemoRole[] }[] = [
  { id: 'discovery', label: 'Discovery & sketch', roles: ['owner', 'client', 'developer'] },
  { id: 'requirements', label: 'Requirements', roles: ['owner', 'client', 'developer'] },
  { id: 'backlog', label: 'Question Backlog', roles: ['owner', 'client', 'developer'] },
  { id: 'meetings', label: 'Meetings', roles: ['owner', 'client', 'developer'] },
  { id: 'devroom', label: 'Development Room', roles: ['owner', 'developer'] },
  { id: 'blueprint', label: 'Product Blueprint', roles: ['owner', 'client', 'developer'] },
  { id: 'versions', label: 'Versions & approval', roles: ['owner', 'client', 'developer'] },
];
export function sectionsFor(role: DemoRole) { return DEMO_SECTIONS.filter(s => s.roles.includes(role)); }

export const DEMO_PROJECT = { name: 'TutorNest — private tutoring bookings', summary: 'A platform where parents find approved private tutors, book lessons and manage schedules.' };
export const DEMO_MESSAGES: { from: 'ai' | 'person'; who: string; text: string }[] = [
  { from: 'person', who: 'Daniel (client)', text: 'We want an app where parents can find and book private tutors.' },
  { from: 'ai', who: 'Talkistry', text: 'Got it. Do tutors join on their own, or does your team approve them first?' },
  { from: 'person', who: 'Daniel (client)', text: 'They apply and we approve them first.' },
  { from: 'ai', who: 'Talkistry', text: 'I added a review queue to the sketch. How should parents pick a lesson time?' },
  { from: 'person', who: 'Daniel (client)', text: 'From the tutor’s weekly calendar.' },
  { from: 'ai', who: 'Talkistry', text: 'Added availability to the tutor profile. Payment can wait — I moved it to the backlog.' },
];
export const DEMO_SCREENS: { name: string; recent?: boolean; c: SketchComponent[] }[] = [
  { name: 'Find a tutor', c: [{ type: 'header', label: 'Find a tutor' }, { type: 'search', label: 'Subject or name' }, { type: 'list', label: 'Approved tutors', items: ['Maths · Year 9', 'Spanish · Beginner'] }] },
  { name: 'Tutor profile', recent: true, c: [{ type: 'header', label: 'Tutor profile' }, { type: 'card', label: 'About the tutor' }, { type: 'calendar', label: 'Weekly availability' }, { type: 'button', label: 'Book lesson' }] },
  { name: 'Application review', c: [{ type: 'header', label: 'Applications' }, { type: 'table', label: 'Pending', items: ['Name', 'Subject', 'Status'] }, { type: 'button', label: 'Approve' }] },
];
export const DEMO_REQUIREMENTS: { title: string; category: string; status: ReqStatus; source: string }[] = [
  { title: 'Parents can search tutors by subject', category: 'Feature', status: 'confirmed', source: 'Message 1 · confirmed by Mara' },
  { title: 'Only approved tutors appear in search', category: 'Business rule', status: 'confirmed', source: 'Message 3 · confirmed by Mara' },
  { title: 'Parents book from the tutor’s weekly calendar', category: 'Workflow', status: 'proposed', source: 'Message 5 · AI suggestion, awaiting review' },
  { title: 'Cancellation policy for lessons', category: 'Business rule', status: 'unresolved', source: 'Raised by AI · needs a decision' },
  { title: 'Online payment at booking', category: 'Payment', status: 'deferred', source: 'Deferred in meeting 1' },
];
export const DEMO_QUESTIONS: { q: string; priority: 'critical' | 'important' | 'secondary'; status: string; owner: string }[] = [
  { q: 'Can parents cancel a lesson, and until when?', priority: 'critical', status: 'open', owner: 'Daniel' },
  { q: 'Should tutors set their own prices?', priority: 'important', status: 'open', owner: 'Daniel' },
  { q: 'How do parents pay for lessons?', priority: 'important', status: 'deferred', owner: 'Mara' },
  { q: 'Do we need reminders before each lesson?', priority: 'secondary', status: 'open', owner: 'Unassigned' },
];
export const DEMO_AGENDA: { name: string; minutes: number; state: 'done' | 'active' | 'next' }[] = [
  { name: 'Product vision', minutes: 5, state: 'done' },
  { name: 'Core functionality', minutes: 15, state: 'done' },
  { name: 'User journeys & live sketch', minutes: 25, state: 'active' },
  { name: 'Critical clarifications', minutes: 10, state: 'next' },
  { name: 'Summary', minutes: 5, state: 'next' },
];
export const DEMO_NOTES: { title: string; type: string; priority: string; promoted?: boolean }[] = [
  { title: 'Calendar sync with Google may need extra consent screens', type: 'Technical question', priority: 'important' },
  { title: 'What happens to bookings when a tutor is suspended?', type: 'Requirement ambiguity', priority: 'critical', promoted: true },
];
export const DEMO_VERSIONS: { v: number; when: string; by: string; note: string }[] = [
  { v: 2, when: '2 days ago', by: 'Mara', note: 'Added tutor approval and weekly calendar booking.' },
  { v: 1, when: '1 week ago', by: 'Mara', note: 'Initial search and tutor profiles.' },
];

export type TourStep = { section: DemoSection; target: string; title: string; body: string; role?: DemoRole };
export const TOUR: TourStep[] = [
  { section: 'discovery', target: 'roles', title: 'Welcome to the demo', body: 'This is a fictional sample project. Switch roles here to see what an owner, client or developer can do.' },
  { section: 'discovery', target: 'nav', title: 'The project areas', body: 'Each tab is a part of the workspace. The tour will open them for you one by one.' },
  { section: 'discovery', target: 'chat', title: 'Discovery conversation', body: 'You describe your idea and the AI asks one useful question at a time. Less urgent questions go to the backlog instead of stopping the meeting.' },
  { section: 'discovery', target: 'sketch', title: 'Live Product Sketch', body: 'Screens appear and change as decisions are made. The highlighted screen is the latest change.' },
  { section: 'requirements', target: 'section', title: 'Requirements', body: 'The AI only suggests. Nothing counts as confirmed until a person confirms it, and every item links back to where it came from.' },
  { section: 'backlog', target: 'section', title: 'Question Backlog', body: 'Open questions are kept with a priority, an owner and a status, so nothing gets lost between meetings.' },
  { section: 'meetings', target: 'section', title: 'Timed meetings', body: 'Meetings follow an agenda with a timer. When a stage runs out, Talkistry suggests what to do next, but you stay in control.' },
  { section: 'devroom', target: 'section', title: 'Development Room', body: 'Private notes for the team. Clients never see them unless one question is explicitly shared.', role: 'developer' },
  { section: 'blueprint', target: 'section', title: 'Product Blueprint', body: 'Confirmed decisions become a structured blueprint you can download as Markdown, JSON or PDF.' },
  { section: 'versions', target: 'section', title: 'Versions & approval', body: 'The owner approves a version. Approved versions never change, and later requests are compared against them.' },
  { section: 'versions', target: 'cta', title: 'Ready to try it?', body: 'Create a free account to start your own project with the real AI.' },
];
