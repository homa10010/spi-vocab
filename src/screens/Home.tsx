import type { Mode } from '../types';
import type { Screen } from '../App';
import { useStore } from '../state/store';
import { buildDailySession, buildRandomSession, dailyCounts, PRACTICE_SIZE } from '../logic/session';
import { clearedCount, stageInfos } from '../logic/stages';
import { displayStreak } from '../logic/streak';
import IosGuide from '../components/IosGuide';
import { MODE_LABEL, freshRng } from './shared';

type Props = { mode: Mode; onModeChange: (m: Mode) => void; onNavigate: (s: Screen) => void };

export default function Home({ mode, onModeChange, onNavigate }: Props) {
  const { save, dispatch, datasets, today, warning, saveFailed } = useStore();
  const ds = datasets[mode];
  const progress = save.progress[mode];
  const infos = stageInfos(ds, progress);
  const counts = dailyCounts(mode, ds, progress, save.settings, today);
  const total = counts.review + counts.fresh;
  const weakCount = ds.entries.filter((e) => progress[e.id]?.weak).length;

  const start = () =>
    dispatch({ type: 'START', session: buildDailySession(mode, ds, progress, save.settings, today, freshRng()) });
  const startRandom = () =>
    dispatch({ type: 'START', session: buildRandomSession(mode, ds, progress, today, freshRng()) });

  return (
    <main className="home">
      <h1 className="title">SPI言語対策</h1>

      {warning === 'corrupt' && <p className="notice">保存データが壊れていたため、初期状態で起動しました</p>}
      {(warning === 'unavailable' || saveFailed) && <p className="notice">この環境では進捗を保存できません</p>}
      <IosGuide />

      <div className="tabs" role="tablist">
        {(['jukugo', 'english'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={m === mode}
            className={m === mode ? 'tab is-active' : 'tab'}
            onClick={() => onModeChange(m)}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      <button className="daily" onClick={start} disabled={total === 0}>
        <span className="daily-title">学習を始める</span>
        <span className="daily-detail">
          復習{counts.review}問＋新しい語{counts.fresh}問
        </span>
      </button>
      {total === 0 && <p className="hint">すべての語を出題済みです。ランダムで復習できます</p>}
      <button className="secondary random" onClick={startRandom}>
        ランダム{PRACTICE_SIZE}問
      </button>

      <dl className="stats">
        <div>
          <dt>ステージ</dt>
          <dd>
            {clearedCount(infos)}
            <small> / {infos.length}</small>
          </dd>
        </div>
        <div>
          <dt>苦手な語</dt>
          <dd>
            {weakCount}
            <small>語</small>
          </dd>
        </div>
        <div>
          <dt>連続学習</dt>
          <dd>
            {displayStreak(save.stats, today)}
            <small>日</small>
          </dd>
        </div>
      </dl>

      <nav className="menu">
        <button onClick={() => onNavigate('stages')}>ステージ一覧</button>
        <button onClick={() => onNavigate('weak')}>苦手リスト</button>
        <button onClick={() => onNavigate('settings')}>設定</button>
      </nav>
    </main>
  );
}
