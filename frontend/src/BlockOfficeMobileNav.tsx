import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function BlockOfficeMobileNav() {
  const [route, setRoute] = useState(window.location.hash);
  useEffect(() => {
    const sync = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const active = (name: string) => route.startsWith('#' + name) ? 'page' as const : undefined;
  function goSearch() {
    // PART_V064_K_CONTEXT_SEARCH
    const onTasks =
      window.location.hash.startsWith(
        '#tasks'
      );

    const targetId =
      onTasks
        ? 'bo-task-search'
        : 'bo-deal-search';

    if (
      !onTasks &&
      !window.location.hash.startsWith(
        '#home'
      )
    ) {
      window.location.hash =
        '#home';
    }

    window.setTimeout(
      () => {
        const input =
          document.getElementById(
            targetId,
          ) as HTMLInputElement | null;

        if (input) {
          input.focus();

          input.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      },
      80,
    );
  }

  return createPortal(
    <nav
      className="boMobileNav msmViewportNav"
      aria-label="Основная навигация"
    >
      <a href="#files" aria-current={active('files')}><b aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6" /></svg></b><span>Файлы</span></a>

      <a href="#tasks" aria-current={active('tasks')}>
        <b aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 6" /></svg></b>
        <span>Задачи</span>
      </a>

      <a href="#home" aria-current={route === '#home' || route.startsWith('#deal/') || route === '#new' ? 'page' : undefined}>
        <b aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="15" rx="3"/><path d="M8 6V3h8v3 M3 12h18 M10 12v3h4v-3" /></svg></b>
        <span>Сделки</span>
      </a>

      <button
        type="button"
        onClick={goSearch}
      >
        <b aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6" /></svg></b>
        <span>Поиск</span>
      </button>
    </nav>, document.body
  );
}
