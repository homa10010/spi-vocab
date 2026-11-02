import { en, id, jk, range } from '../test/fixtures';
import { buildChoices, choiceCount } from './distractors';
import { makeRng } from './random';
import { buildDataset } from './validate';

const jukugoDs = buildDataset([range(30, (n) => jk(n))]);
const englishDs = buildDataset([range(30, (n) => en(n))]);

test('熟語は5択・英単語は4択で正解を1つ含む', () => {
  expect(choiceCount('jukugo')).toBe(5);
  expect(choiceCount('english')).toBe(4);
  const j = buildChoices('jukugo', 'jk-0001', jukugoDs, makeRng(1));
  expect(j).toHaveLength(5);
  expect(j.filter((x) => x === 'jk-0001')).toHaveLength(1);
  const e = buildChoices('english', 'en-0001', englishDs, makeRng(1));
  expect(e).toHaveLength(4);
  expect(e.filter((x) => x === 'en-0001')).toHaveLength(1);
});

test('選択肢に重複がない', () => {
  for (let seed = 0; seed < 200; seed++) {
    const c = buildChoices('jukugo', 'jk-0003', jukugoDs, makeRng(seed));
    expect(new Set(c).size).toBe(c.length);
  }
});

test('同義語は選ばれない', () => {
  const ds = buildDataset([[
    jk(1, { synonyms: ['jk-0002', 'jk-0003'] }),
    jk(2, { synonyms: ['jk-0001'] }),
    jk(3, { synonyms: ['jk-0001'] }),
    ...range(6, (n) => jk(n + 3)),
  ]]);
  for (let seed = 0; seed < 1000; seed++) {
    const c = buildChoices('jukugo', 'jk-0001', ds, makeRng(seed));
    expect(c).not.toContain('jk-0002');
    expect(c).not.toContain('jk-0003');
  }
});

test('confusers が優先される', () => {
  const confusers = [id('jk', 10), id('jk', 20), id('jk', 25), id('jk', 30)];
  const ds = buildDataset([range(30, (n) => (n === 1 ? jk(1, { confusers }) : jk(n)))]);
  for (let seed = 0; seed < 50; seed++) {
    const c = buildChoices('jukugo', 'jk-0001', ds, makeRng(seed));
    expect([...c].sort()).toEqual(['jk-0001', ...confusers].sort());
  }
});

test('熟語は同じ種類を優先する', () => {
  const ds = buildDataset([[
    ...range(10, (n) => jk(n, { type: '四字熟語' })),
    ...range(20, (n) => jk(n + 10, { type: '二字熟語' })),
  ]]);
  for (let seed = 0; seed < 100; seed++) {
    const c = buildChoices('jukugo', 'jk-0001', ds, makeRng(seed));
    c.forEach((x) => expect((ds.byId.get(x) as { type?: string }).type).toBe('四字熟語'));
  }
});

test('英単語は同じ品詞を優先する（レベルが違っても他品詞より優先）', () => {
  const ds = buildDataset([[
    en(1, { pos: '形容詞', level: 1 }),
    ...range(5, (n) => en(n + 1, { pos: '形容詞', level: 3 })),
    ...range(20, (n) => en(n + 6, { pos: '動詞', level: 1 })),
  ]]);
  for (let seed = 0; seed < 100; seed++) {
    const c = buildChoices('english', 'en-0001', ds, makeRng(seed));
    c.forEach((x) => expect((ds.byId.get(x) as { pos?: string }).pos).toBe('形容詞'));
  }
});

test('同じ品詞・同じレベルが最優先', () => {
  const ds = buildDataset([[
    en(1, { pos: '名詞', level: 2 }),
    ...range(3, (n) => en(n + 1, { pos: '名詞', level: 2 })),
    ...range(10, (n) => en(n + 4, { pos: '名詞', level: 1 })),
  ]]);
  for (let seed = 0; seed < 100; seed++) {
    const c = buildChoices('english', 'en-0001', ds, makeRng(seed));
    expect([...c].sort()).toEqual(['en-0001', 'en-0002', 'en-0003', 'en-0004']);
  }
});

test('意味が同じ語は選ばれない', () => {
  const ds = buildDataset([[jk(1, { meaning: '同じ' }), jk(2, { meaning: '同じ' }), ...range(5, (n) => jk(n + 2))]]);
  for (let seed = 0; seed < 300; seed++) {
    expect(buildChoices('jukugo', 'jk-0001', ds, makeRng(seed))).not.toContain('jk-0002');
  }
});

test('候補不足で例外', () => {
  const ds = buildDataset([range(3, (n) => jk(n))]);
  expect(() => buildChoices('jukugo', 'jk-0001', ds, makeRng(1))).toThrow('not enough candidates: jk-0001');
});

test('種類内で足りなければ全語から補う', () => {
  const ds = buildDataset([[jk(1, { type: 'ことわざ' }), jk(2, { type: 'ことわざ' }), ...range(5, (n) => jk(n + 2))]]);
  const c = buildChoices('jukugo', 'jk-0001', ds, makeRng(3));
  expect(c).toHaveLength(5);
  expect(c).toContain('jk-0002');
});
