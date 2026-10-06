import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang } from '../types';
import { bn, en, type StringKey } from './strings';

type Vars = Record<string, string | number>;

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey, vars?: Vars) => string;
  /** "20 Oct 2026" style; Western digits in both languages so dates match the PDF. */
  formatDate: (iso: string) => string;
}

const STORAGE_KEY = 'dakhil.lang';
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

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dictionaries[lang]['app.title'];
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice just lasts for this visit.
    }
  }, []);

  const value = useMemo<I18n>(() => {
    const dateFormat = new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD-u-nu-latn' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
    return {
      lang,
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
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
