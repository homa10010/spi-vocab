import { useState } from 'react';
import type { JukugoType, Level, Mode } from '../types';
import { JUKUGO_TYPES, LEVELS } from '../logic/storage';

type Props = {
  mode: Mode;
  types: JukugoType[];
  levels: Level[];
  onSave: (v: { types?: JukugoType[]; levels?: Level[] }) => void;
  onCancel: () => void;
};

/** ランダム出題の範囲を選ぶ。国語は種類、英語はレベル。1つも選ばない状態では保存できない */
export default function RandomFilterDialog({ mode, types, levels, onSave, onCancel }: Props) {
  const [selTypes, setSelTypes] = useState<JukugoType[]>(types);
  const [selLevels, setSelLevels] = useState<Level[]>(levels);
  const options =
    mode === 'jukugo'
      ? JUKUGO_TYPES.map((t) => ({ key: t, label: t, on: selTypes.includes(t) }))
      : LEVELS.map((l) => ({ key: String(l), label: `レベル${l}`, on: selLevels.includes(l) }));
  const count = mode === 'jukugo' ? selTypes.length : selLevels.length;

  const toggle = (key: string) => {
    if (mode === 'jukugo') {
      const t = key as JukugoType;
      setSelTypes((s) => (s.includes(t) ? s.filter((x) => x !== t) : JUKUGO_TYPES.filter((x) => x === t || s.includes(x))));
    } else {
      const l = Number(key) as Level;
      setSelLevels((s) => (s.includes(l) ? s.filter((x) => x !== l) : LEVELS.filter((x) => x === l || s.includes(x))));
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="ランダムの範囲">
      <div className="dialog">
        <h2 className="dialog-title">ランダムの範囲</h2>
        <div className="checks">
          {options.map((o) => (
            <label key={o.key} className={o.on ? 'check is-on' : 'check'}>
              <input type="checkbox" checked={o.on} onChange={() => toggle(o.key)} />
              {o.label}
            </label>
          ))}
        </div>
        {count === 0 && <p className="help">1つ以上選んでください</p>}
        <div className="dialog-actions">
          <button className="secondary" onClick={onCancel}>
            やめる
          </button>
          <button
            className="primary"
            disabled={count === 0}
            onClick={() => onSave(mode === 'jukugo' ? { types: selTypes } : { levels: selLevels })}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
