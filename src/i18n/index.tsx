import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Lang } from '../types';
import { bn, en, type StringKey } from './strings';

type Vars = Record<string, string | number>;

interface I18n {
  /** The language the page is showing right now. */
  lang: Lang;
  /** The language the user picked; leads `lang` by the length of the cross-fade. */
  choice: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey, vars?: Vars) => string;
  /** "20 Oct 2026" style; Western digits in both languages so dates match the PDF. */
  formatDate: (iso: string) => string;
}

const STORAGE_KEY = 'dakhil.lang';
/** How long the page takes to fade out before the words change (matches the CSS). */
const FADE_MS = 150;
const dictionaries: Record<Lang, Record<StringKey, string>> = { en, bn };
const I18nContext = createContext<I18n | null>(null);

function storedLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'bn' ? 'bn' : 'en';
  } catch {
    return 'en';
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(storedLang);
  const [choice, setChoice] = useState<Lang>(lang);
  const fade = useRef(0);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dictionaries[lang]['app.title'];
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setChoice(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice just lasts for this visit.
    }

    // Fade the page out, swap the words while nothing is visible, fade back in.
    const root = document.documentElement;
    window.clearTimeout(fade.current);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLangState(next);
      return;
    }
    root.classList.add('lang-fading');
    fade.current = window.setTimeout(() => {
      setLangState(next);
      // Two frames: one for the new text to be laid out, one to start the fade-in from it.
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('lang-fading')));
    }, FADE_MS);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(fade.current);
      document.documentElement.classList.remove('lang-fading');
    },
    [],
  );

  const value = useMemo<I18n>(() => {
    const dateFormat = new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD-u-nu-latn' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
    return {
      lang,
      choice,
      setLang,
      t: (key, vars) =>
        dictionaries[lang][key].replace(/\{(\w+)\}/g, (match, name) =>
          vars && name in vars ? String(vars[name]) : match,
        ),
      formatDate: (iso) => {
        const [y, m, d] = iso.split('-').map(Number);
        const date = new Date(Date.UTC(y, m - 1, d));
        return Number.isNaN(date.getTime()) ? iso : dateFormat.format(date);
      },
    };
  }, [lang, choice, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
