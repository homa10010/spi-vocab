import type { Dataset, Mode, SaveData, Session } from '../types';
import { answer, next } from '../logic/runner';
import { applyAnswer } from '../logic/srs';
import { recordStudy } from '../logic/streak';

export type Action =
  | { type: 'START'; session: Session }
  | { type: 'ANSWER'; choiceId: string; today: string }
  | { type: 'NEXT' }
  | { type: 'QUIT' }
  | { type: 'SET_NEW_PER_DAY'; value: 10 | 20 | 30 }
  | { type: 'DISMISS_IOS_GUIDE' }
  | { type: 'IMPORT'; save: SaveData }
  | { type: 'RESET_MODE'; mode: Mode }
  | { type: 'DROP_STALE'; today: string };

export function reducer(state: SaveData, action: Action): SaveData {
  switch (action.type) {
    case 'START':
      return { ...state, session: action.session };
    case 'ANSWER': {
      if (!state.session) return state;
      const { session, recorded } = answer(state.session, action.choiceId);
      if (session === state.session) return state;
      if (!recorded) return { ...state, session };
      const mode = session.mode;
      const progress = {
        ...state.progress,
        [mode]: {
          ...state.progress[mode],
          [recorded.id]: applyAnswer(state.progress[mode][recorded.id], recorded.correct, action.today),
        },
      };
      return { ...state, session, progress, stats: recordStudy(state.stats, action.today) };
    }
    case 'NEXT':
      return state.session && state.session.answeredChoice !== null ? { ...state, session: next(state.session) } : state;
    case 'QUIT':
      return { ...state, session: null };
    case 'SET_NEW_PER_DAY':
      return { ...state, settings: { ...state.settings, newPerDay: action.value } };
    case 'DISMISS_IOS_GUIDE':
      return { ...state, settings: { ...state.settings, iosGuideSeen: true } };
    case 'IMPORT':
      return action.save;
    case 'RESET_MODE':
      return {
        ...state,
        progress: { ...state.progress, [action.mode]: {} },
        session: state.session?.mode === action.mode ? null : state.session,
      };
    case 'DROP_STALE':
      return state.session && state.session.day !== action.today ? { ...state, session: null } : state;
  }
}

export function sanitizeOnLoad(save: SaveData, datasets: Record<Mode, Dataset>, today: string): SaveData {
  const s = save.session;
  if (!s) return save;
  if (s.day !== today) return { ...save, session: null };
  const ds = datasets[s.mode];
  let index = s.index;
  const queue = s.queue.filter((q, i) => {
    const ok = ds.byId.has(q.id) && q.choices.every((c) => ds.byId.has(c));
    if (!ok && i < s.index) index--;
    return ok;
  });
  if (s.answeredChoice !== null && s.queue[s.index] && queue.includes(s.queue[s.index])) index++;
  return { ...save, session: { ...s, queue, index, answeredChoice: null } };
}
