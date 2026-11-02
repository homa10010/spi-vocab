import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
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
