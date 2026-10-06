import { useEffect, useMemo, useState } from 'react';

/** Splits into what a reader sees as one character, so Bangla conjuncts are never typed in halves. */
function graphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Types the text out once. The full text is always in the layout (invisible)
 * so nothing shifts while it types, and screen readers get it in one piece.
 */
export function TypedText({ text, speed = 38 }: { text: string; speed?: number }) {
  const parts = useMemo(() => graphemes(text), [text]);
  const [count, setCount] = useState(() => (prefersReducedMotion() ? parts.length : 0));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setCount(parts.length);
      return;
    }
    setCount(0);
    let shown = 0;
    const timer = window.setInterval(() => {
      shown += 1;
      setCount(shown);
      if (shown >= parts.length) window.clearInterval(timer);
    }, speed);
    return () => window.clearInterval(timer);
  }, [parts, speed]);

  const done = count >= parts.length;
  return (
    <span className="typed">
      <span className="sr-only">{text}</span>
      <span className="typed__ghost" aria-hidden="true">
        {text}
      </span>
      <span className="typed__live" aria-hidden="true">
        {parts.slice(0, count).join('')}
        <span className={done ? 'typed__caret typed__caret--idle' : 'typed__caret'} />
      </span>
    </span>
  );
}
