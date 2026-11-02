type Props = { message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void };

export default function ConfirmDialog({ message, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="確認">
      <div className="dialog">
        <p>{message}</p>
        <div className="dialog-actions">
          <button className="secondary" onClick={onCancel}>
            やめる
          </button>
          <button className="primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
