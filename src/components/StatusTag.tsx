import { useI18n } from '../i18n';
import type { Status } from '../types';

// Each status has its own shape as well as its own colour and label.
const glyphs: Record<Status, JSX.Element> = {
  ok: <path d="M3 7.2l2.6 2.6L11 4.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  missing: <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />,
  expired: (
    <>
      <circle cx="7" cy="7" r="5.3" fill="currentColor" />
      <path d="M4.6 4.6l4.8 4.8M9.4 4.6 4.6 9.4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  expiryNeeded: (
    <>
      <rect x="2" y="3" width="10" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.4 6h9.2M4.8 1.6v2.4M9.2 1.6v2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  notProvided: <path d="M3.5 7h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
};

export function StatusTag({ status }: { status: Status }) {
  const { t } = useI18n();
  return (
    <span className={`status status--${status}`}>
      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" focusable="false">
        {glyphs[status]}
      </svg>
      {t(`status.${status}`)}
    </span>
  );
}
