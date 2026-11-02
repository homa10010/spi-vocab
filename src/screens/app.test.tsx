import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mode } from '../types';
import App from '../App';
import { StoreProvider } from '../state/store';
import { STORAGE_KEY } from '../logic/storage';
import { buildDataset } from '../logic/validate';
import { en, jk, range } from '../test/fixtures';

const datasets: Record<Mode, ReturnType<typeof buildDataset>> = {
  jukugo: buildDataset([range(30, (n) => jk(n))]),
  english: buildDataset([range(30, (n) => en(n))]),
};
const now = () => new Date(2026, 10, 2, 12, 0);

function renderApp() {
  return render(
    <StoreProvider datasets={datasets} storage={localStorage} now={now}>
      <App />
    </StoreProvider>,
  );
}

/** 問題文（意味N）から正解の語（語N）を求める */
function correctWord(): string {
  const q = screen.getByTestId('question').textContent ?? '';
  return q.replace('意味', '語');
}

function choiceButton(label: string): HTMLElement {
  return within(screen.getByTestId('choices')).getByRole('button', { name: new RegExp(`^${label}(\\D|$)`) });
}

let clock = 0;
beforeEach(() => {
  localStorage.clear();
  // 選択肢の誤タップ防止（表示直後のタップを無視）に引っかからないよう、呼ばれるたびに1秒進む時計にする
  clock = 1_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
});
afterEach(() => vi.restoreAllMocks());

test('学習を始めるボタンに件数が出る', () => {
  renderApp();
  expect(screen.getByRole('button', { name: /学習を始める/ })).toHaveTextContent('新しい語20問');
});

test('選択肢をタップすると正誤と全選択肢の意味が出る', async () => {
  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole('button', { name: /学習を始める/ }));
  const word = correctWord();
  await user.click(choiceButton(word));
  expect(screen.getByText('正解')).toBeInTheDocument();
  const meanings = within(screen.getByTestId('choices')).getAllByText(/^意味\d+$/);
  expect(meanings).toHaveLength(5);
  expect(screen.getByRole('button', { name: '次へ' })).toBeInTheDocument();
});

test('回答後に別の選択肢をタップしても結果は変わらない', async () => {
  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole('button', { name: /学習を始める/ }));
  const word = correctWord();
  const buttons = within(screen.getByTestId('choices')).getAllByRole('button');
  const wrong = buttons.find((b) => b.textContent !== word)!;
  await user.click(wrong);
  await user.click(choiceButton(word));
  expect(screen.getByText('不正解')).toBeInTheDocument();
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
  const id = `jk-${word.replace('語', '').padStart(4, '0')}`;
  expect(saved.progress.jukugo[id]).toMatchObject({ correct: 0, wrong: 1 });
});

test('全問終えると結果画面になる', async () => {
  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole('button', { name: /学習を始める/ }));
  for (let i = 0; i < 20; i++) {
    await user.click(choiceButton(correctWord()));
    await user.click(screen.getByRole('button', { name: '次へ' }));
  }
  expect(screen.getByRole('heading', { name: '結果' })).toBeInTheDocument();
  expect(screen.getByText('20 / 20問 正解')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'ホームへ' }));
  expect(screen.getByRole('button', { name: /学習を始める/ })).toBeInTheDocument();
});

test('途中でやめて再読み込みすると続きから', async () => {
  const user = userEvent.setup();
  const first = renderApp();
  await user.click(screen.getByRole('button', { name: /学習を始める/ }));
  await user.click(choiceButton(correctWord()));
  await user.click(screen.getByRole('button', { name: '次へ' }));
  const question = screen.getByTestId('question').textContent;
  expect(screen.getByText('2 / 20')).toBeInTheDocument();
  first.unmount();
  renderApp();
  expect(screen.getByTestId('question').textContent).toBe(question);
  expect(screen.getByText('2 / 20')).toBeInTheDocument();
});

test('壊れたバックアップを読み込むと理由が出る', async () => {
  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole('button', { name: '設定' }));
  const input = screen.getByLabelText('バックアップを読み込む');
  await user.upload(input, new File(['hello'], 'backup.json', { type: 'application/json' }));
  expect(await screen.findByText('ファイルの形式が正しくありません')).toBeInTheDocument();
});

test('英単語タブでは英単語が問題になり、日本語の意味を選ぶ', async () => {
  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole('tab', { name: '英単語' }));
  await user.click(screen.getByRole('button', { name: /学習を始める/ }));
  expect(screen.getByTestId('question').textContent).toMatch(/^word\d+$/);
  expect(within(screen.getByTestId('choices')).getAllByRole('button')).toHaveLength(4);
});

test('アプリを開いたまま翌朝に戻ってくると、前日の途中セッションは閉じてホームの件数も更新される', async () => {
  const user = userEvent.setup();
  let current = new Date(2026, 10, 2, 22, 0);
  render(
    <StoreProvider datasets={datasets} storage={localStorage} now={() => current}>
      <App />
    </StoreProvider>,
  );
  await user.click(screen.getByRole('button', { name: /学習を始める/ }));
  expect(screen.getByTestId('question')).toBeInTheDocument();
  current = new Date(2026, 10, 3, 7, 0);
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(screen.getByRole('button', { name: /学習を始める/ })).toHaveTextContent('新しい語20問');
});

test('次へを素早く2回タップしても、次の問題に回答してしまわない', async () => {
  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole('button', { name: /学習を始める/ }));
  await user.click(choiceButton(correctWord()));
  let manual = clock;
  vi.spyOn(Date, 'now').mockImplementation(() => manual);
  await user.click(screen.getByRole('button', { name: '次へ' }));
  await user.click(within(screen.getByTestId('choices')).getAllByRole('button')[4]);
  expect(screen.queryByText('正解')).toBeNull();
  expect(screen.queryByText('不正解')).toBeNull();
  manual += 400;
  await user.click(choiceButton(correctWord()));
  expect(screen.getByText('正解')).toBeInTheDocument();
});

test('1回終えても、続けて新しい語で学習を始められる', async () => {
  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole('button', { name: /学習を始める/ }));
  for (let i = 0; i < 20; i++) {
    await user.click(choiceButton(correctWord()));
    await user.click(screen.getByRole('button', { name: '次へ' }));
  }
  await user.click(screen.getByRole('button', { name: 'ホームへ' }));
  expect(screen.getByRole('button', { name: /学習を始める/ })).toHaveTextContent('新しい語10問');
  expect(screen.getByRole('button', { name: /学習を始める/ })).toBeEnabled();
});

test('ランダム20問を始めると、20問のセッションになる', async () => {
  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole('button', { name: 'ランダム20問' }));
  expect(screen.getByText('1 / 20')).toBeInTheDocument();
});

test('設定は「1回に出す新しい語」', async () => {
  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole('button', { name: '設定' }));
  expect(screen.getByRole('heading', { name: '1回に出す新しい語' })).toBeInTheDocument();
});
