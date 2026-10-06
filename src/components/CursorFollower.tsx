import { useEffect, useRef } from 'react';

const INTERACTIVE = 'a, button, select, input, label, summary, [role="button"], [draggable="true"]';
const TRAIL_LENGTH = 7;

/**
 * Pointer decoration: a light ring that eases after the mouse (wider over
 * anything clickable, pulsing on click), a short wavy tail of dots behind it,
 * and a small burst where a click lands. The real cursor stays as it is, so
 * text carets, drag feedback and precision are untouched. The ring and tail
 * are for mice only, and none of it runs when the user asks for reduced motion.
 */
export function CursorFollower() {
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ring.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;
    let started = false;

    // The tail: each dot chases the one ahead of it and sways side to side as it goes.
    const trail = hasMouse
      ? Array.from({ length: TRAIL_LENGTH }, (_, i) => {
          const dot = document.createElement('span');
          dot.className = 'cursor-trail';
          document.body.append(dot);
          return { dot, x: 0, y: 0, scale: 1 - i * 0.11 };
        })
      : [];

    const step = () => {
      // Ease a fraction of the remaining distance each frame, then rest.
      x += (targetX - x) * 0.22;
      y += (targetY - y) * 0.22;
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;

      let leadX = targetX;
      let leadY = targetY;
      let moving = Math.abs(targetX - x) + Math.abs(targetY - y);
      const time = performance.now() / 140;
      trail.forEach((part, i) => {
        const dx = leadX - part.x;
        const dy = leadY - part.y;
        part.x += dx * 0.34;
        part.y += dy * 0.34;
        const speed = Math.hypot(dx, dy);
        moving += speed;
        // Sway at right angles to the direction of travel; it dies away as the pointer rests.
        const sway = Math.sin(time - i * 0.9) * Math.min(speed, 9) * 0.55;
        const nx = speed ? -dy / speed : 0;
        const ny = speed ? dx / speed : 0;
        part.dot.style.transform = `translate3d(${part.x + nx * sway}px, ${part.y + ny * sway}px, 0) scale(${part.scale})`;
        part.dot.style.opacity = String(Math.min(0.5, speed / 14) * part.scale);
        leadX = part.x;
        leadY = part.y;
      });
      frame = moving > 0.3 ? requestAnimationFrame(step) : 0;
    };

    const onMove = (event: PointerEvent) => {
      if (!hasMouse || event.pointerType !== 'mouse') return;
      targetX = event.clientX;
      targetY = event.clientY;
      if (!started) {
        started = true;
        x = targetX;
        y = targetY;
        for (const part of trail) {
          part.x = targetX;
          part.y = targetY;
        }
      }
      element.classList.add('cursor--visible');
      const over = event.target instanceof Element && event.target.closest(INTERACTIVE);
      element.classList.toggle('cursor--hover', Boolean(over));
      if (!frame) frame = requestAnimationFrame(step);
    };
    const onDown = (event: PointerEvent) => {
      element.classList.add('cursor--down');
      // A small burst where the click landed; it removes itself when it finishes.
      const burst = document.createElement('span');
      burst.className = 'click-burst';
      burst.style.left = `${event.clientX}px`;
      burst.style.top = `${event.clientY}px`;
      for (let i = 0; i < 6; i++) {
        const spark = document.createElement('i');
        spark.style.setProperty('--angle', `${i * 60 + 15}deg`);
        burst.append(spark);
      }
      burst.addEventListener('animationend', (done) => done.target === burst && burst.remove());
      document.body.append(burst);
    };
    const onUp = () => element.classList.remove('cursor--down');
    const onLeave = () => element.classList.remove('cursor--visible');

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('dragend', onUp);
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      for (const part of trail) part.dot.remove();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('dragend', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, []);

  return <div ref={ring} className="cursor" aria-hidden="true" />;
}
