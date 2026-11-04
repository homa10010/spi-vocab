import { useEffect } from 'react';
import type { Accent, ThemeMode } from './types';

export const ACCENT_LABEL: Record<Accent, string> = {
  ai: '藍',
  aomidori: '青緑',
  murasaki: '紫',
  daidai: '橙',
  momo: '桃',
  sumi: '墨',
};

/** ブラウザの上部バーの色（ライトはテーマ色、ダークは背景色） */
const BAR_COLOR: Record<ThemeMode, Record<Accent, string>> = {
  light: { ai: '#2b4a8c', aomidori: '#1d6b66', murasaki: '#5b3d8f', daidai: '#a6460f', momo: '#a3365f', sumi: '#3b4650' },
  dark: { ai: '#121614', aomidori: '#121614', murasaki: '#121614', daidai: '#121614', momo: '#121614', sumi: '#121614' },
};

/** <html> に data-theme / data-accent を付けて、CSS変数を切り替える */
export function useTheme(mode: ThemeMode, accent: Accent) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.dataset.accent = accent;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[mode][accent]);
  }, [mode, accent]);
}
