import { useState, type ChangeEvent } from 'react';
import type { Mode, SaveData } from '../types';
import { useStore } from '../state/store';
import { exportBackup, parseBackup } from '../logic/storage';
import ConfirmDialog from '../components/ConfirmDialog';
import { MODE_LABEL } from './shared';

function readText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

type Pending = { kind: 'import'; save: SaveData } | { kind: 'reset'; mode: Mode } | null;

export default function Settings({ onBack }: { onBack: () => void }) {
  const { save, dispatch, today } = useStore();
  const [pending, setPending] = useState<Pending>(null);
  const [message, setMessage] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([exportBackup(save)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spi-vocab-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('バックアップを書き出しました');
  };

  const onFile = async (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    let text: string;
    try {
      text = await readText(file);
    } catch {
      setMessage('ファイルを読み込めませんでした');
      return;
    }
    const r = parseBackup(text);
    if (r.ok) setPending({ kind: 'import', save: r.save });
    else setMessage(r.reason);
  };

  const confirm = () => {
    if (!pending) return;
    if (pending.kind === 'import') {
      dispatch({ type: 'IMPORT', save: pending.save });
      setMessage('バックアップを読み込みました');
    } else {
      dispatch({ type: 'RESET_MODE', mode: pending.mode });
      setMessage(`${MODE_LABEL[pending.mode]}の進捗をリセットしました`);
    }
    setPending(null);
  };

  return (
    <main className="sub">
      <header className="sub-top">
        <button className="link" onClick={onBack}>
          戻る
        </button>
        <h1>設定</h1>
      </header>

      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}

      <section className="setting">
        <h2>1日に出す新しい語</h2>
        <div className="segmented">
          {([10, 20, 30] as const).map((v) => (
            <button
              key={v}
              aria-pressed={save.settings.newPerDay === v}
              className={save.settings.newPerDay === v ? 'seg is-active' : 'seg'}
              onClick={() => dispatch({ type: 'SET_NEW_PER_DAY', value: v })}
            >
              {v}語
            </button>
          ))}
        </div>
      </section>

      <section className="setting">
        <h2>バックアップ</h2>
        <p className="help">ブラウザのデータを消すと進捗も消えます。ときどき書き出しておくと安心です。</p>
        <button className="secondary" onClick={download}>
          バックアップを書き出す
        </button>
        <label className="secondary file">
          バックアップを読み込む
          <input type="file" accept="application/json,.json" onChange={onFile} />
        </label>
      </section>

      <section className="setting">
        <h2>進捗のリセット</h2>
        {(['jukugo', 'english'] as const).map((m) => (
          <button key={m} className="danger" onClick={() => setPending({ kind: 'reset', mode: m })}>
            {MODE_LABEL[m]}の進捗をリセット
          </button>
        ))}
      </section>

      {pending && (
        <ConfirmDialog
          message={
            pending.kind === 'import'
              ? '今の進捗を、読み込んだバックアップで上書きします。'
              : `${MODE_LABEL[pending.mode]}の進捗をすべて消します。元に戻せません。`
          }
          confirmLabel={pending.kind === 'import' ? '上書きする' : 'リセットする'}
          onConfirm={confirm}
          onCancel={() => setPending(null)}
        />
      )}
    </main>
  );
}
