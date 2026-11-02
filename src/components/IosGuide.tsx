import { useStore } from '../state/store';

function needsGuide(): boolean {
  const ios = /iPhone|iPad/.test(navigator.userAgent);
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

export default function IosGuide() {
  const { save, dispatch } = useStore();
  if (save.settings.iosGuideSeen || !needsGuide()) return null;
  return (
    <div className="guide">
      <p>
        共有ボタン → 「ホーム画面に追加」をしてから、ホーム画面のアイコンで学習してください。Safariとホーム画面のアプリでは、進捗の保存場所が別になります。
      </p>
      <button className="secondary" onClick={() => dispatch({ type: 'DISMISS_IOS_GUIDE' })}>
        わかった
      </button>
    </div>
  );
}
