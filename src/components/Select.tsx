import type { SelectHTMLAttributes } from 'react';
import { cx } from '../lib/dnd';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Styles the control as an unfilled slot. */
  empty?: boolean;
}

/** Native select, so it works with keyboard, touch and screen readers out of the box. */
export function Select({ options, onChange, empty, className, ...rest }: Props) {
  return (
    <select
      className={cx('select', empty && 'select--empty', className)}
      onChange={(event) => onChange(event.target.value)}
      {...rest}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
