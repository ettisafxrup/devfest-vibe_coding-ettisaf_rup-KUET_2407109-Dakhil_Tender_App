import { useI18n } from '../i18n';
import type { StringKey } from '../i18n/strings';
import { hrefOf, type Route } from '../lib/router';
import type { Lang } from '../types';

const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'bn', label: 'বাংলা' },
];

const NAV_LABELS: Record<Route, StringKey> = {
  home: 'nav.home',
  tender: 'nav.tender',
  sample: 'nav.sample',
};

function LanguageToggle() {
  const { choice, setLang, t } = useI18n();
  return (
    <div className="segmented" role="group" aria-label={t('lang.label')}>
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          lang={code}
          className="segmented__option"
          aria-pressed={choice === code}
          onClick={() => setLang(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

interface Props {
  route: Route;
  /** Tender shown on the current page, if any. */
  tenderId?: string;
  /** "Your tender" only appears once the user has opened one. */
  hasOwnTender: boolean;
}

export function TopBar({ route, tenderId, hasOwnTender }: Props) {
  const { t } = useI18n();
  const links: Route[] = hasOwnTender ? ['home', 'tender', 'sample'] : ['home', 'sample'];

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <a className="brand" href={hrefOf('home')} aria-label={`${t('app.name')}, ${t('nav.home')}`}>
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__name">{t('app.name')}</span>
        </a>

        <nav className="nav" aria-label={t('nav.label')}>
          <ul className="nav__list">
            {links.map((link) => (
              <li key={link}>
                <a className="nav__link" href={hrefOf(link)} aria-current={route === link ? 'page' : undefined}>
                  {t(NAV_LABELS[link])}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="topbar__end">
          {tenderId && <span className="topbar__tender mono">{tenderId}</span>}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
