import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

/** Grow for wrapped text, restored values and container width changes. */
export function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const field = ref.current;
    if (!field) return;
    const resize = () => {
      if (!field.getClientRects().length) return;
      field.style.height = 'auto';
      const css = getComputedStyle(field);
      const border = parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth);
      field.style.height = `${field.scrollHeight + border}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(field);
    field.addEventListener('input', resize);
    return () => { observer.disconnect(); field.removeEventListener('input', resize); };
  }, [props.value, props.defaultValue]);
  return <textarea {...props} ref={ref} style={{...props.style, boxSizing:'border-box', maxHeight:'none', overflowY:'hidden', resize:'none'}} />;
}
