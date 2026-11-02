import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { Dataset, Mode, SaveData } from '../types';
import { DATASETS } from '../data';
import { dayKey } from '../logic/day';
import { loadSave, writeSave, type LoadWarning } from '../logic/storage';
import { reducer, sanitizeOnLoad, type Action } from './reducer';

type Store = {
  save: SaveData;
  dispatch: (a: Action) => void;
  warning: LoadWarning;
  saveFailed: boolean;
  today: string;
  datasets: Record<Mode, Dataset>;
};

const StoreContext = createContext<Store | null>(null);

function defaultStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

type Props = {
  children: ReactNode;
  datasets?: Record<Mode, Dataset>;
  storage?: Storage | null;
  now?: () => Date;
};

export function StoreProvider({ children, datasets = DATASETS, storage, now = () => new Date() }: Props) {
  const store = useMemo(() => (storage === undefined ? defaultStorage() : storage), [storage]);
  const [{ initial, warning }] = useState(() => {
    const loaded = loadSave(store);
    return { initial: sanitizeOnLoad(loaded.save, datasets, dayKey(now())), warning: loaded.warning };
  });
  const [save, dispatch] = useReducer(reducer, initial);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    if (store) setSaveFailed(!writeSave(store, save));
  }, [store, save]);

  // ホーム画面アプリはメモリから復帰することが多いので、戻ってきたときと1分ごとに日付を見直す。
  // 前日の途中セッションは、戻ってきたときだけ閉じる（学習中に4時をまたいでも中断しない）。
  const nowRef = useRef(now);
  nowRef.current = now;
  const [, setTick] = useState(0);
  useEffect(() => {
    const onResume = () => {
      if (document.visibilityState === 'hidden') return;
      dispatch({ type: 'DROP_STALE', today: dayKey(nowRef.current()) });
      setTick((t) => t + 1);
    };
    const timer = window.setInterval(() => setTick((t) => t + 1), 60_000);
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
    };
  }, []);

  useEffect(() => {
    try {
      void navigator.storage?.persist?.();
    } catch {
      // 対応していないブラウザでは何もしない
    }
  }, []);

  const value: Store = { save, dispatch, warning, saveFailed, today: dayKey(now()), datasets };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
