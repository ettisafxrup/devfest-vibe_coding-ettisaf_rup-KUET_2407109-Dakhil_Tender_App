import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { carriesDesktopFiles, cx } from '../lib/dnd';
import { Icon } from './Icon';

interface Props {
  title: string;
  hint?: string;
  buttonLabel: string;
  accept: string;
  onFiles: (files: File[]) => void;
  size?: 'large' | 'compact';
  busy?: boolean;
  children?: ReactNode;
}

/** Drop target with an equivalent "choose files" button, so dragging is never required. */
export function DropZone({ title, hint, buttonLabel, accept, onFiles, size = 'compact', busy, children }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const onDragOver = (event: DragEvent) => {
    if (!carriesDesktopFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setOver(true);
  };
  const onDragLeave = (event: DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
  };
  const onDrop = (event: DragEvent) => {
    if (!carriesDesktopFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setOver(false);
    onFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div
      className={cx('dropzone', `dropzone--${size}`, over && 'dropzone--over')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <p className="dropzone__title">{title}</p>
      {hint && <p className="dropzone__hint">{hint}</p>}
      <div className="dropzone__actions">
        <button
          type="button"
          className={cx('btn', size === 'large' ? 'btn--primary' : 'btn--secondary')}
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <Icon name="upload" />
          {buttonLabel}
        </button>
        {children}
      </div>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = ''; // allow picking the same file again
        }}
      />
    </div>
  );
}
