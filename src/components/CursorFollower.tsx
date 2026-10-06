import { useEffect, useRef } from 'react';

const INTERACTIVE = 'a, button, select, input, label, summary, [role="button"], [draggable="true"]';

/**
 * A light ring that trails the mouse: it eases after the pointer, widens over
 * anything clickable and pulses on click, with a small burst of sparks. The real cursor stays as it is, so
 * text carets, drag feedback and precision are untouched. Mouse users only,
 * and nothing at all when the user asks for reduced motion.
 */
export function CursorFollower() {
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ring.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // The trailing ring is for mice; the click burst also plays for touch.
    const hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;
    let started = false;

    const step = () => {
      // Ease a fraction of the remaining distance each frame, then rest.
      x += (targetX - x) * 0.22;
      y += (targetY - y) * 0.22;
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      frame = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.1 ? requestAnimationFrame(step) : 0;
    };

    const onMove = (event: PointerEvent) => {
      if (!hasMouse || event.pointerType !== 'mouse') return;
      targetX = event.clientX;
      targetY = event.clientY;
      if (!started) {
        started = true;
        x = targetX;
        y = targetY;
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
