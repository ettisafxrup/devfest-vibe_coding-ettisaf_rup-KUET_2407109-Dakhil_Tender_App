/**
 * A soft-cornered document with a folded corner and a small "PDF" label.
 * Its colours come from CSS (see .pdf-icon), so a file that still needs a
 * home shows in the accent colour and a placed one sits back in grey.
 */
export function PdfIcon({ blank = false }: { blank?: boolean }) {
  return (
    <svg className="pdf-icon" viewBox="0 0 32 38" width="30" height="36" aria-hidden="true" focusable="false">
      <path
        className="pdf-icon__sheet"
        d="M9 1.5h10.2a3 3 0 0 1 2.1.9l6.3 6.3a3 3 0 0 1 .9 2.1V31a5.5 5.5 0 0 1-5.5 5.5H9A5.5 5.5 0 0 1 3.5 31V7A5.5 5.5 0 0 1 9 1.5Z"
      />
      <path className="pdf-icon__fold" d="M19.5 2.2v5.3a3 3 0 0 0 3 3h5.300" />
      <rect className="pdf-icon__label" x="7" y="20.5" width="18" height="10.500" rx="3.400" />
      {!blank && (
        <text className="pdf-icon__text" x="16" y="28.200" textAnchor="middle">
          PDF
        </text>
      )}
    </svg>
  );
}
