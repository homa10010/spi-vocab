export default function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total ? Math.min(100, (current / total) * 100) : 0;
  return (
    <div className="progress">
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-text">
        {current} / {total}
      </span>
    </div>
  );
}
