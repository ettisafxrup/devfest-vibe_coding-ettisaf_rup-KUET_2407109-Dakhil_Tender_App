// Each path repeats exactly twice across its width, so sliding it left by half loops without a seam.
const WAVES: [string, string][] = [
  ['c', 'M0 130 C200 80 400 80 600 130 S1000 180 1200 130 S1600 80 1800 130 S2200 180 2400 130 V220 H0 Z'],
  ['b', 'M0 100 C150 150 450 150 600 100 S1050 50 1200 100 S1650 150 1800 100 S2250 50 2400 100'],
  ['a', 'M0 110 C200 50 400 50 600 110 S1000 170 1200 110 S1600 50 1800 110 S2200 170 2400 110'],
];

/** The page background: quiet wave lines drifting behind everything. Purely decorative. */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      {WAVES.map(([name, d]) => (
        <svg
          key={name}
          className={`backdrop__wave backdrop__wave--${name}`}
          viewBox="0 0 2400 220"
          preserveAspectRatio="none"
        >
          <path d={d} vectorEffect="non-scaling-stroke" />
        </svg>
      ))}
    </div>
  );
}
