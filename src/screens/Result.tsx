import { useStore } from '../state/store';

export default function Result() {
  const { save, dispatch, datasets } = useStore();
  const session = save.session!;
  const ds = datasets[session.mode];
  const total = session.results.length;
  const correct = session.results.filter((r) => r.correct).length;
  const wrongIds = [...new Set(session.results.filter((r) => !r.correct).map((r) => r.id))];

  return (
    <main className="result">
      <h1>結果</h1>
      <p className="score">
        {correct} / {total}問 正解
      </p>
      <p className="rate">正答率 {total ? Math.round((correct / total) * 100) : 0}%</p>

      {wrongIds.length > 0 && (
        <section>
          <h2>間違えた語</h2>
          <ul className="word-list">
            {wrongIds.map((id) => {
              const e = ds.byId.get(id);
              if (!e) return null;
              return (
                <li key={id}>
                  <span className="wl-word">{e.word}</span>
                  <span className="wl-sub">{'reading' in e ? e.reading : e.pos}</span>
                  <span className="wl-meaning">{e.meaning}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <button className="primary" onClick={() => dispatch({ type: 'QUIT' })}>
        ホームへ
      </button>
    </main>
  );
}
