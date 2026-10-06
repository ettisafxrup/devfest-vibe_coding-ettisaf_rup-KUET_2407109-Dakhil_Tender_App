/** The Dakhil mark: a document that has been checked. Same drawing as public/favicon.svg. */
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg className="brand__logo" viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="7.5" fill="var(--seal-solid)" />
      <path
        d="M10.2 6.2h8.1l5.5 5.5v12.1a1.8 1.8 0 0 1-1.8 1.8H10.2a1.8 1.8 0 0 1-1.8-1.8V8a1.8 1.8 0 0 1 1.8-1.8Z"
        fill="#fff"
      />
      <path d="M18.3 6.2v3.7a1.8 1.8 0 0 0 1.8 1.8h3.7Z" fill="#C7D2F2" />
      <path
        className="brand__check"
        d="m12 17.6 2.9 2.9 5.3-6.1"
        fill="none"
        stroke="#1D3F8F"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
