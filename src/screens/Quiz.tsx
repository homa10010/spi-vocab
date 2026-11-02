import type { LoadedEntry } from '../types';
import { useStore } from '../state/store';
import { currentItem } from '../logic/runner';
import ProgressBar from '../components/ProgressBar';
import ChoiceButton from '../components/ChoiceButton';

export default function Quiz() {
  const { save, dispatch, datasets, today } = useStore();
  const session = save.session!;
  const item = currentItem(session)!;
  const ds = datasets[session.mode];
  const target = ds.byId.get(item.id)!;
  const answered = session.answeredChoice;
  const isJukugo = session.mode === 'jukugo';

  const label = (e: LoadedEntry) => (isJukugo ? e.word : e.meaning);
  const detail = (e: LoadedEntry) =>
    'reading' in e ? (
      <>
        <span className="choice-sub">{e.reading}</span>
        <span className="choice-meaning">{e.meaning}</span>
      </>
    ) : (
      <>
        <span className="choice-sub">{e.word}</span>
        <span className="choice-meaning">{e.pos}</span>
      </>
    );

  return (
    <main className={answered === null ? "quiz" : "quiz is-answered"}>
      <header className="quiz-top">
        <button className="link" onClick={() => dispatch({ type: 'QUIT' })}>
          やめる
        </button>
        <ProgressBar current={session.index + 1} total={session.queue.length} />
      </header>

      <section className="card" aria-live="polite">
        {item.requeue && <span className="again">もう一度</span>}
        <p className="prompt">{isJukugo ? 'この意味に合う言葉は？' : 'この単語の意味は？'}</p>
        <p className={isJukugo ? 'question is-meaning' : 'question is-word'} data-testid="question">
          {isJukugo ? target.meaning : target.word}
        </p>
        {'pos' in target && <p className="pos">{target.pos}</p>}
        {answered !== null && (
          <p className={answered === item.id ? 'verdict is-correct' : 'verdict is-wrong'}>
            {answered === item.id ? '正解' : '不正解'}
          </p>
        )}
      </section>

      <div className="choices" data-testid="choices">
        {item.choices.map((cid) => {
          const e = ds.byId.get(cid)!;
          const state =
            answered === null ? 'idle' : cid === item.id ? 'correct' : cid === answered ? 'wrong' : 'other';
          return (
            <ChoiceButton
              key={cid}
              label={label(e)}
              state={state}
              detail={answered === null ? null : detail(e)}
              onClick={() => dispatch({ type: 'ANSWER', choiceId: cid, today })}
            />
          );
        })}
        {answered !== null && (
          <button className="primary next" onClick={() => dispatch({ type: 'NEXT' })}>
            次へ
          </button>
        )}
      </div>
    </main>
  );
}
