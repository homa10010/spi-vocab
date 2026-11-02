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

beforeEach(() => localStorage.clear());

test('今日の学習ボタンに件数が出る', () => {
  renderApp();
  expect(screen.getByRole('button', { name: /今日の学習/ })).toHaveTextContent('新しい語20問');
});

test('選択肢をタップすると正誤と全選択肢の意味が出る', async () => {
  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole('button', { name: /今日の学習/ }));
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
  await user.click(screen.getByRole('button', { name: /今日の学習/ }));
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
  await user.click(screen.getByRole('button', { name: /今日の学習/ }));
  for (let i = 0; i < 20; i++) {
    await user.click(choiceButton(correctWord()));
    await user.click(screen.getByRole('button', { name: '次へ' }));
  }
  expect(screen.getByRole('heading', { name: '結果' })).toBeInTheDocument();
  expect(screen.getByText('20 / 20問 正解')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'ホームへ' }));
  expect(screen.getByRole('button', { name: /今日の学習/ })).toBeInTheDocument();
});

test('途中でやめて再読み込みすると続きから', async () => {
  const user = userEvent.setup();
  const first = renderApp();
  await user.click(screen.getByRole('button', { name: /今日の学習/ }));
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
  await user.click(screen.getByRole('button', { name: /今日の学習/ }));
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
  await user.click(screen.getByRole('button', { name: /今日の学習/ }));
  expect(screen.getByTestId('question')).toBeInTheDocument();
  current = new Date(2026, 10, 3, 7, 0);
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(screen.getByRole('button', { name: /今日の学習/ })).toHaveTextContent('新しい語20問');
});
