import { useI18n } from '../i18n';
import type { Lang } from '../types';

const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'bn', label: 'বাংলা' },
];

function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="segmented" role="group" aria-label={t('lang.label')}>
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          lang={code}
          className="segmented__option"
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function TopBar({ tenderId }: { tenderId?: string }) {
  const { t } = useI18n();
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__name">{t('app.name')}</span>
          <span className="brand__tagline">{t('app.tagline')}</span>
        </div>
        {tenderId && <span className="topbar__tender mono">{tenderId}</span>}
        <LanguageToggle />
      </div>
    </header>
  );
}
