import type { Question } from './types';
export const DEFAULT_BACKLOG_STATUS = 'open';
export function filterBacklog<T extends Pick<Question, 'status' | 'topic' | 'meeting_id' | 'stage_key'>>(questions: T[], status = DEFAULT_BACKLOG_STATUS, topic = 'all', meeting = 'all', stageKey?: string) {
  return questions.filter(q => (status === 'all' || q.status === status) && (topic === 'all' || q.topic === topic) && (meeting === 'all' || q.meeting_id === meeting) && (!stageKey || q.stage_key === stageKey));
}