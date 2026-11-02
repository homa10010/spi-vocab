export type Mode = 'jukugo' | 'english';
export type Level = 1 | 2 | 3;
export type JukugoType = '二字熟語' | '和語' | '四字熟語' | 'ことわざ';
export type Pos = '名詞' | '動詞' | '形容詞' | '副詞' | 'その他';

export type JukugoEntry = {
  id: string;
  type: JukugoType;
  word: string;
  reading: string;
  meaning: string;
  level: Level;
  confusers: string[];
  synonyms: string[];
};

export type EnglishEntry = {
  id: string;
  word: string;
  pos: Pos;
  meaning: string;
  level: Level;
  confusers: string[];
  synonyms: string[];
};

export type Entry = JukugoEntry | EnglishEntry;
export type LoadedEntry = Entry & { stage: number };
export type Dataset = { entries: LoadedEntry[]; byId: Map<string, LoadedEntry>; stageCount: number };

export type WordProgress = {
  box: number;
  due: string;
  correct: number;
  wrong: number;
  lastCorrect: boolean;
  weak: boolean;
  /** 初めて出題された日（1日の新しい語の数を数えるため） */
  firstDay?: string;
};
export type ProgressMap = Record<string, WordProgress>;

export type Settings = { newPerDay: 10 | 20 | 30; iosGuideSeen: boolean };

export type QueueItem = { id: string; choices: string[]; requeue: boolean };
export type SessionKind = 'daily' | 'stage' | 'weak';
export type Session = {
  mode: Mode;
  kind: SessionKind;
  stage: number | null;
  day: string;
  queue: QueueItem[];
  index: number;
  answeredChoice: string | null;
  results: { id: string; correct: boolean }[];
};

export type Stats = { streak: number; lastStudyDay: string | null };

export type SaveData = {
  version: 1;
  settings: Settings;
  progress: Record<Mode, ProgressMap>;
  stats: Stats;
  session: Session | null;
};
