import { useState } from 'react';
import type { Mode } from './types';
import { useStore } from './state/store';
import { isFinished } from './logic/runner';
import Home from './screens/Home';
import Quiz from './screens/Quiz';
import Result from './screens/Result';
import StageList from './screens/StageList';
import WeakList from './screens/WeakList';
import Settings from './screens/Settings';

export type Screen = 'home' | 'stages' | 'weak' | 'settings';

export default function App() {
  const { save } = useStore();
  const [mode, setMode] = useState<Mode>('jukugo');
  const [screen, setScreen] = useState<Screen>('home');
  const goHome = () => setScreen('home');

  let body;
  if (save.session) body = isFinished(save.session) ? <Result /> : <Quiz />;
  else if (screen === 'stages') body = <StageList mode={mode} onBack={goHome} />;
  else if (screen === 'weak') body = <WeakList mode={mode} onBack={goHome} />;
  else if (screen === 'settings') body = <Settings onBack={goHome} />;
  else body = <Home mode={mode} onModeChange={setMode} onNavigate={setScreen} />;

  return <div className="app">{body}</div>;
}
