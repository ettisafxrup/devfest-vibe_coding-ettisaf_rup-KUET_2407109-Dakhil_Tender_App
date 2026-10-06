const paths = {
  upload: 'M8 10.5V2.5M4.75 5.5 8 2.25l3.25 3.25M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2',
  download: 'M8 2.5v8M4.75 7.5 8 10.75l3.25-3.25M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2',
  close: 'M4 4l8 8M12 4l-8 8',
  check: 'M3.5 8.5l3 3 6-7',
  alert: 'M8 5v3.5M8 11h.01M7.1 2.6 1.9 11.5a1 1 0 0 0 .9 1.5h10.4a1 1 0 0 0 .9-1.5L8.9 2.6a1 1 0 0 0-1.8 0Z',
  external: 'M9.5 2.5h4v4M13.5 2.5 8 8M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3',
} as const;

export type IconName = keyof typeof paths;

/** Decorative 16px stroke icon; always pair it with visible or screen-reader text. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
