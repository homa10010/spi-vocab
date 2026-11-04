import { useState } from 'react';
import type { History } from '../types';
import { series } from '../logic/history';
import { MODE_LABEL } from '../screens/shared';

const W = 340;
const H = 168;
const PAD = { top: 12, right: 40, bottom: 24, left: 34 };
const RANGES = { week: { days: 7, label: '週間' }, month: { days: 30, label: '月間' } } as const;
type Range = keyof typeof RANGES;
const SERIES = [
  { key: 'jukugo', label: MODE_LABEL.jukugo, cls: 'line-jukugo' },
  { key: 'english', label: MODE_LABEL.english, cls: 'line-english' },
] as const;

const md = (day: string) => `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;

/** 直近7日・30日の正答率（国語・英語の2本）。学習しなかった日は線を切って、点を打たない */
export default function AccuracyChart({ history, today }: { history: History; today: string }) {
  const [range, setRange] = useState<Range>('week');
  const [active, setActive] = useState<number | null>(null);
  const { days } = RANGES[range];
  const data = series(history, today, days);
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (days - 1)) * pw;
  const y = (v: number) => PAD.top + ph - (v / 100) * ph;
  const step = pw / (days - 1);
  const labelEvery = days <= 7 ? 1 : 7;
  const hasData = data.jukugo.some((v) => v !== null) || data.english.some((v) => v !== null);

  const segments = (vals: (number | null)[]) => {
    const out: string[] = [];
    let cur: string[] = [];
    vals.forEach((v, i) => {
      if (v === null) {
        if (cur.length) out.push(cur.join(' '));
        cur = [];
      } else cur.push(`${cur.length ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    });
    if (cur.length) out.push(cur.join(' '));
    return out;
  };
  const lastIndex = (vals: (number | null)[]) => {
    for (let i = vals.length - 1; i >= 0; i--) if (vals[i] !== null) return i;
    return -1;
  };
  // 線の終わりに付ける数値ラベル。2本の値が近いときは上下にずらして重ならないようにする
  const labelY: Record<string, number> = {};
  SERIES.forEach((s) => {
    const i = lastIndex(data[s.key]);
    if (i >= 0) labelY[s.key] = y(data[s.key][i]!) + 4;
  });
  if (labelY.jukugo !== undefined && labelY.english !== undefined && Math.abs(labelY.jukugo - labelY.english) < 13) {
    const mid = (labelY.jukugo + labelY.english) / 2;
    const upper = labelY.jukugo <= labelY.english ? 'jukugo' : 'english';
    labelY[upper] = mid - 6.5;
    labelY[upper === 'jukugo' ? 'english' : 'jukugo'] = mid + 6.5;
  }

  return (
    <section className="chart" aria-label="正答率の推移">
      <div className="chart-head">
        <h2>正答率</h2>
        <div className="chart-range">
          {(Object.keys(RANGES) as Range[]).map((r) => (
            <button
              key={r}
              className={r === range ? 'seg is-active' : 'seg'}
              aria-pressed={r === range}
              onClick={() => {
                setRange(r);
                setActive(null);
              }}
            >
              {RANGES[r].label}
            </button>
          ))}
        </div>
      </div>

      <ul className="legend">
        {SERIES.map((s) => (
          <li key={s.key}>
            <span className={`legend-swatch ${s.cls}`} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>

      <div className="chart-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`直近${days}日間の正答率（国語・英語）`}>
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
              <text className="axis" x={PAD.left - 6} y={y(v) + 4} textAnchor="end">
                {v}%
              </text>
            </g>
          ))}
          {data.days.map((d, i) =>
            i % labelEvery === (days - 1) % labelEvery ? (
              <text key={d} className="axis" x={x(i)} y={H - 6} textAnchor="middle">
                {md(d)}
              </text>
            ) : null,
          )}
          {active !== null && <line className="crosshair" x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + ph} />}
          {SERIES.map((s) => {
            const vals = data[s.key];
            const last = lastIndex(vals);
            return (
              <g key={s.key} className={s.cls}>
                {segments(vals).map((d, k) => (
                  <path key={k} d={d} className="line" />
                ))}
                {vals.map((v, i) => {
                  // 月間は点が多いので、線にならない日・最後の日・タップした日だけ点を打つ
                  const isolated = vals[i - 1] == null && vals[i + 1] == null;
                  const show = range === 'week' || isolated || i === last || i === active;
                  return v === null || !show ? null : (
                    <circle key={i} className="dot" cx={x(i)} cy={y(v)} r={active === i ? 5 : 4} />
                  );
                })}
                {last >= 0 && (
                  <text className="direct" x={x(last) + 8} y={labelY[s.key]}>
                    {vals[last]}%
                  </text>
                )}
              </g>
            );
          })}
          {data.days.map((d, i) => (
            <rect
              key={d}
              className="hit"
              x={x(i) - step / 2}
              y={PAD.top}
              width={step}
              height={ph}
              onPointerEnter={() => setActive(i)}
              onClick={() => setActive(i)}
            />
          ))}
        </svg>
        {!hasData && <p className="chart-empty">まだ記録がありません。学習すると、ここに正答率が表示されます</p>}
      </div>
      <p className="chart-readout" role="status">
        {active === null ? (
          'グラフをタップすると、その日の正答率が出ます'
        ) : (
          <>
            <strong>{md(data.days[active])}</strong>
            {SERIES.map((s) => (
              <span key={s.key}>
                <span className={`legend-swatch ${s.cls}`} aria-hidden="true" />
                {s.label} {data[s.key][active] === null ? '記録なし' : `${data[s.key][active]}%`}
              </span>
            ))}
          </>
        )}
      </p>

      <table className="sr-only">
        <caption>直近{days}日間の正答率</caption>
        <thead>
          <tr>
            <th>日付</th>
            {SERIES.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.days.map((d, i) => (
            <tr key={d}>
              <td>{md(d)}</td>
              {SERIES.map((s) => (
                <td key={s.key}>{data[s.key][i] === null ? '記録なし' : `${data[s.key][i]}%`}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
