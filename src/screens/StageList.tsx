import type { Mode } from '../types';
import { useStore } from '../state/store';
import { stageInfos } from '../logic/stages';
import { buildStagePractice } from '../logic/session';
import { MODE_LABEL, freshRng, stageLabel } from './shared';

type Props = { mode: Mode; onBack: () => void };

export default function StageList({ mode, onBack }: Props) {
  const { save, dispatch, datasets, today } = useStore();
  const ds = datasets[mode];
  const progress = save.progress[mode];
  const infos = stageInfos(ds, progress);

  const start = (stage: number) => {
    dispatch({ type: 'START', session: buildStagePractice(mode, stage, ds, progress, today, freshRng()) });
    onBack();
  };

  return (
    <main className="sub">
      <header className="sub-top">
        <button className="link" onClick={onBack}>
          戻る
        </button>
        <h1>{MODE_LABEL[mode]}のステージ</h1>
      </header>
      <p className="help">選んだステージから20問を練習します。</p>
      <ul className="stage-list">
        {infos.map((info) => {
          const words = ds.entries.filter((e) => e.stage === info.stage);
          const status = !info.unlocked
            ? '未開放'
            : info.cleared
              ? `クリア（正答率${Math.round(info.accuracy * 100)}%）`
              : `学習中（出題済み${info.seen}/${info.total}・正答率${Math.round(info.accuracy * 100)}%）`;
          return (
            <li key={info.stage}>
              <button className="stage" disabled={!info.unlocked} onClick={() => start(info.stage)}>
                <span className="stage-no">ステージ{info.stage}</span>
                <span className="stage-kind">{stageLabel(words)}</span>
                <span className={info.cleared ? 'stage-status is-cleared' : 'stage-status'}>{status}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
