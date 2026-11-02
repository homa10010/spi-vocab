import type { ReactNode } from 'react';

type Props = {
  label: string;
  state: 'idle' | 'correct' | 'wrong' | 'other';
  detail: ReactNode | null;
  onClick: () => void;
};

export default function ChoiceButton({ label, state, detail, onClick }: Props) {
  return (
    <button className={`choice is-${state}`} onClick={onClick} disabled={state !== 'idle'}>
      <span className="choice-label">{label}</span>
      {detail && <span className="choice-detail">{detail}</span>}
    </button>
  );
}
