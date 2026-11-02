import type { Mode } from '../types';
import { useStore } from '../state/store';
import { buildWeakSession, PRACTICE_SIZE } from '../logic/session';
import { MODE_LABEL, freshRng } from './shared';

type Props = { mode: Mode; onBack: () => void };

export default function WeakList({ mode, onBack }: Props) {
  const { save, dispatch, datasets, today } = useStore();
  const ds = datasets[mode];
  const progress = save.progress[mode];
  const weak = ds.entries.filter((e) => progress[e.id]?.weak);

  const start = () => {
    dispatch({ type: 'START', session: buildWeakSession(mode, ds, progress, today, freshRng()) });
    onBack();
  };

  return (
    <main className="sub">
      <header className="sub-top">
        <button className="link" onClick={onBack}>
          戻る
        </button>
        <h1>{MODE_LABEL[mode]}の苦手リスト</h1>
      </header>
      {weak.length === 0 ? (
        <p className="help">苦手な語はありません。間違えた語がここに入ります。</p>
      ) : (
        <>
          <button className="primary" onClick={start}>
            まとめて解く（最大{PRACTICE_SIZE}問）
          </button>
          <ul className="word-list">
            {weak.map((e) => (
              <li key={e.id}>
                <span className="wl-word">{e.word}</span>
                <span className="wl-sub">{'reading' in e ? e.reading : e.pos}</span>
                <span className="wl-meaning">{e.meaning}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
