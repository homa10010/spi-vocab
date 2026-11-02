import type { QueueItem, Session } from '../types';

export const REQUEUE_GAP = 3;

export function currentItem(s: Session): QueueItem | null {
  return s.queue[s.index] ?? null;
}

export function isFinished(s: Session): boolean {
  return s.index >= s.queue.length;
}

export function answer(
  s: Session,
  choiceId: string,
): { session: Session; recorded: { id: string; correct: boolean } | null } {
  const item = currentItem(s);
  if (!item || s.answeredChoice !== null) return { session: s, recorded: null };

  const correct = choiceId === item.id;
  if (item.requeue) return { session: { ...s, answeredChoice: choiceId }, recorded: null };

  const recorded = { id: item.id, correct };
  const queue = [...s.queue];
  if (!correct) {
    const at = Math.min(s.index + 1 + REQUEUE_GAP, queue.length);
    queue.splice(at, 0, { id: item.id, choices: item.choices, requeue: true });
  }
  return {
    session: { ...s, queue, answeredChoice: choiceId, results: [...s.results, recorded] },
    recorded,
  };
}

export function next(s: Session): Session {
  return { ...s, index: s.index + 1, answeredChoice: null };
}
