import { useEffect, useEffectEvent, useRef } from 'react';

export function useModalFocus(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useEffectEvent(onClose);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const siblings = Array.from(ref.current?.parentElement?.children ?? [])
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== ref.current)
      .map((element) => ({ element, inert: element.inert }));
    siblings.forEach(({ element }) => { element.inert = true; });
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => focusable()[0]?.focus());
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !ref.current?.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !ref.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = overflow;
      siblings.forEach(({ element, inert }) => { element.inert = inert; });
      previous?.focus();
    };
  }, [open]);
  return ref;
}
